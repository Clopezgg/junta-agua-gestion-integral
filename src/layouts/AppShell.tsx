import {useEffect,useRef,useState} from 'react';
import {NavLink,Outlet,useNavigate} from 'react-router-dom';
import {Droplets,LogOut,Menu,PanelLeftClose,PanelLeftOpen,Search,Settings,X} from 'lucide-react';
import {useAuth} from '../contexts/AuthContext';
import {CommandPaletteProvider,useCommandPalette} from '../app/commands/CommandPalette';
import {institutionName,loadInstitutionName} from './org';
import {mobileNav,primaryNav,visibleNav} from './navigation';
import {QuickCreate} from './QuickCreate';
import {NotificationsMenu} from './NotificationsMenu';
import {UserMenu} from './UserMenu';
import {initials} from '../design-system/utils';

export function AppShell(){
  return <CommandPaletteProvider><AppShellInner/></CommandPaletteProvider>;
}

function AppShellInner(){
  const auth=useAuth();
  const navigate=useNavigate();
  const command=useCommandPalette();
  const sidebarRef=useRef<HTMLDivElement>(null);
  const[collapsed,setCollapsed]=useState(()=>localStorage.getItem('ja-shell-collapsed')==='1');
  const[mobileOpen,setMobileOpen]=useState(false);
  const[inst,setInst]=useState<string|undefined>(()=>institutionName());
  const items=visibleNav(primaryNav,auth.has);
  useEffect(()=>{void loadInstitutionName().then(setInst);},[]);
  const toggleCollapsed=()=>{setCollapsed(value=>{localStorage.setItem('ja-shell-collapsed',value?'1':'0');return!value})};
  const closeMobile=()=>setMobileOpen(false);

  return <div className={`ja-shell${collapsed?' ja-shell-collapsed':''}`}>
    <a className="ja-skip-link" href="#ja-main">Saltar al contenido principal</a>
    {mobileOpen&&<button className="ja-sidebar-backdrop" aria-label="Cerrar navegación" onClick={closeMobile}/>}
    <div className={`ja-sidebar${mobileOpen?' ja-mobile-open':''}`} ref={sidebarRef}>
      <div className="ja-brand">
        <span className="ja-brand-mark"><Droplets size={18}/></span>
        <span className="ja-org-name"><strong>Junta de Agua</strong><small>{inst||'Gestión integral'}</small></span>
        <button type="button" className="ja-icon-btn ja-mobile-close" aria-label="Cerrar navegación" onClick={closeMobile}><X size={18}/></button>
      </div>
      <nav className="ja-sidebar-nav" aria-label="Navegación principal">
        {items.map(item=>(
          <NavLink key={item.to} to={item.to} end={item.to==='/inicio'} className={({isActive})=>`ja-nav-section${isActive?' ja-nav-active':''}`} onClick={closeMobile} title={item.label}>
            {item.icon}<span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="ja-sidebar-foot">
        <button type="button" className="ja-cfg-link" onClick={()=>void navigate('/configuracion')}><Settings size={16}/><span>Configuración</span></button>
        <button type="button" className="ja-cfg-link" onClick={()=>void auth.signOut()}><LogOut size={16}/><span>Cerrar sesión</span></button>
      </div>
    </div>
    <div className="ja-main">
      <header className="ja-topbar">
        <button type="button" className="ja-icon-btn ja-nav-toggle" aria-label={collapsed?'Expandir navegación':'Colapsar navegación'} title={collapsed?'Expandir':'Colapsar'} onClick={toggleCollapsed}>
          {collapsed?<PanelLeftOpen size={18}/>:<PanelLeftClose size={18}/>}
        </button>
        <button type="button" className="ja-icon-btn ja-mobile-menu-btn" aria-label="Abrir navegación" onClick={()=>setMobileOpen(true)}><Menu size={20}/></button>
        <div className="ja-topbar-search">
          <button type="button" className="ja-search-trigger" onClick={command.open} aria-haspopup="dialog" aria-label="Búsqueda global">
            <Search size={15}/><span>Buscar abonado, recibo, orden…</span><kbd>Ctrl K</kbd>
          </button>
        </div>
        <div className="ja-topbar-actions">
          <QuickCreate/>
          <NotificationsMenu/>
          <UserMenu name={auth.profile?.full_name??'Usuario'} initials={initials(auth.profile?.full_name??'U')}/>
        </div>
      </header>
      <div className="ja-content" id="ja-main">
        <Outlet/>
      </div>
      <nav className="ja-mobile-nav" aria-label="Navegación móvil principal">
        {mobileNav.map(item=>item.action==='search'
          ?<button key={item.key} type="button" className="ja-nav-mobile-link" onClick={command.open} aria-label="Buscar">{item.icon}<span>{item.label}</span></button>
          :<NavLink key={item.key} to={item.to!} className={({isActive})=>`ja-nav-mobile-link${isActive?' ja-nav-active':''}`}>{item.icon}<span>{item.label}</span></NavLink>
        )}
        <button type="button" className="ja-nav-mobile-link" onClick={()=>setMobileOpen(true)}><Menu size={20}/><span>Más</span></button>
      </nav>
    </div>
  </div>;
}

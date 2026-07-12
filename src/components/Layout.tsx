import {useState} from 'react';
import {Activity,BadgeDollarSign,Banknote,BarChart3,DatabaseBackup,Droplets,FileClock,FileSpreadsheet,Files,Home,Landmark,LogOut,Map,Menu,PlugZap,ReceiptText,Settings as SettingsIcon,ShieldCheck,UserCog,Users,WalletCards,Wrench,X,Gauge} from 'lucide-react';
import {NavLink,Outlet} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {GlobalSearch} from './GlobalSearch';
import {appVersion,releaseHighlights} from '../lib/version';

export function Layout(){
 const auth=useAuth();
 const[navOpen,setNavOpen]=useState(false);
 const[releaseOpen,setReleaseOpen]=useState(false);
 return <div className="shell">
  <aside className={navOpen?'open':''}>
   <div className="brand-row"><div className="brand"><span className="brand-mark"><Droplets/></span><span><strong>Junta de Agua</strong><small>El Achiotal</small></span></div><button className="mobile-nav-toggle outline" onClick={()=>setNavOpen(false)} aria-label="Cerrar navegación"><X size={18}/></button></div>
   <nav onClick={()=>setNavOpen(false)}>
    <NavGroup title="Trabajo"><NavLink to="/"><Home size={18}/>Inicio</NavLink><NavLink to="/avance"><Activity size={18}/>Diagnóstico</NavLink></NavGroup>
    {(auth.has('subscribers.read')||auth.has('map.read')||auth.has('metering.read'))&&<NavGroup title="Abonados y servicio">
      {auth.has('subscribers.read')&&<NavLink to="/abonados"><Users size={18}/>Abonados</NavLink>}
      {auth.has('imports.read')&&<NavLink to="/importaciones"><FileSpreadsheet size={18}/>Importaciones</NavLink>}
      {auth.has('map.read')&&<NavLink to="/mapa"><Map size={18}/>Mapa de pegues</NavLink>}
      {auth.has('metering.read')&&<NavLink to="/medicion"><Gauge size={18}/>Medición y consumo</NavLink>}
      {auth.has('tariffs.read')&&<NavLink to="/tarifas"><BadgeDollarSign size={18}/>Tarifas y servicios</NavLink>}
      {auth.has('obligations.read')&&<NavLink to="/estados-cuenta"><WalletCards size={18}/>Estados de cuenta</NavLink>}
    </NavGroup>}
    {(auth.has('payments.read')||auth.has('expenses.read')||auth.has('budget.read')||auth.has('reports.read'))&&<NavGroup title="Finanzas">
      {auth.has('payments.read')&&<NavLink to="/pagos"><Banknote size={18}/>Pagos y caja</NavLink>}
      {auth.has('expenses.read')&&<NavLink to="/gastos"><ReceiptText size={18}/>Gastos</NavLink>}
      {auth.has('budget.read')&&<NavLink to="/presupuesto"><Landmark size={18}/>Presupuesto</NavLink>}
      {auth.has('reports.read')&&<NavLink to="/informes"><BarChart3 size={18}/>Informes</NavLink>}
    </NavGroup>}
    {auth.has('operations.read')&&<NavGroup title="Operación"><NavLink to="/operaciones"><Wrench size={18}/>Activos y órdenes</NavLink></NavGroup>}
    <NavGroup title="Administración">
      {auth.has('users.manage')&&<NavLink to="/usuarios"><UserCog size={18}/>Usuarios</NavLink>}
      {auth.has('document_templates.read')&&<NavLink to="/configuracion-documental"><Files size={18}/>Documentos y recibos</NavLink>}
      {auth.has('integrations.read')&&<NavLink to="/integraciones"><PlugZap size={18}/>Integraciones</NavLink>}
      {auth.has('backups.read')&&<NavLink to="/respaldos"><DatabaseBackup size={18}/>Respaldos</NavLink>}
      {auth.has('audit.read')&&<NavLink to="/auditoria"><FileClock size={18}/>Auditoría</NavLink>}
      {auth.has('settings.manage')&&<NavLink to="/configuracion"><SettingsIcon size={18}/>Configuración</NavLink>}
      <NavLink to="/seguridad"><ShieldCheck size={18}/>Seguridad</NavLink>
    </NavGroup>
   </nav>
   <button className="version-card" onClick={()=>setReleaseOpen(true)}><span>Versión {appVersion.version}</span><small>build {appVersion.commit}</small></button>
   <button className="outline signout" onClick={()=>void auth.signOut()}><LogOut size={18}/>Cerrar sesión</button>
  </aside>
  {navOpen&&<button className="nav-backdrop" aria-label="Cerrar navegación" onClick={()=>setNavOpen(false)}/>} 
  <div className="main">
   <header>
    <button className="mobile-nav-toggle outline" onClick={()=>setNavOpen(true)} aria-label="Abrir navegación"><Menu size={19}/></button>
    <GlobalSearch/>
    <div className="header-user"><div><strong>{auth.profile?.full_name}</strong><small>{auth.profile?.username}</small></div><span className="pill">MFA verificado</span></div>
   </header>
   <Outlet/>
  </div>
  {releaseOpen&&<div className="modal"><div className="modal-card release-modal"><div className="titlebar"><div><h2>Novedades de la versión {appVersion.version}</h2><p>Compilación {appVersion.commit} · {new Date(appVersion.buildDate).toLocaleString('es-HN')}</p></div><button className="outline" onClick={()=>setReleaseOpen(false)}><X size={18}/>Cerrar</button></div><div className="release-list">{releaseHighlights.map(item=><div key={item}><span>✓</span><p>{item}</p></div>)}</div><a className="button-link" href={appVersion.releaseUrl} target="_blank" rel="noreferrer">Abrir GitHub Release</a></div></div>}
 </div>;
}

function NavGroup({title,children}:{title:string;children:React.ReactNode}){return <div className="nav-group"><small>{title}</small>{children}</div>}

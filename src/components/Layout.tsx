import {useState} from 'react';
import {Activity,BadgeDollarSign,Banknote,BarChart3,Check,DatabaseBackup,Droplets,FileClock,FileSpreadsheet,Files,Home,IdCard,Landmark,LogOut,Map,Menu,Palette,PanelLeftClose,PanelLeftOpen,PlugZap,ReceiptText,Search,Settings as SettingsIcon,ShieldCheck,UserCog,Users,WalletCards,Wrench,X} from 'lucide-react';
import {NavLink,Outlet,useLocation} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {GlobalSearch} from './GlobalSearch';
import {appVersion,releaseHighlights} from '../lib/version';
import {ToastProvider} from '../ui/Toast';

type Item={to:string;label:string;icon:React.ReactNode;show:boolean};
const initials=(name:string)=>name.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase();

export function Layout(){
 const auth=useAuth();
 const location=useLocation();
 const [navOpen,setNavOpen]=useState(false);
 const [releaseOpen,setReleaseOpen]=useState(false);
 const [collapsed,setCollapsed]=useState(()=>localStorage.getItem('junta-shell-collapsed')==='1');
 const toggleCollapsed=()=>{setCollapsed(value=>{localStorage.setItem('junta-shell-collapsed',value?'0':'1');return!value})};
 const topLabel=titleFor(location.pathname);
 const groups:Item[][]=[
  [
   {to:'/',label:'Inicio',icon:<Home size={18}/>,show:true},
   {to:'/avance',label:'Diagnóstico',icon:<Activity size={18}/>,show:true}
  ],
  [
   {to:'/abonados',label:'Abonados',icon:<Users size={18}/>,show:auth.has('subscribers.read')},
   {to:'/fichas-abonados',label:'Fichas digitales',icon:<IdCard size={18}/>,show:auth.has('subscribers.read')},
   {to:'/importaciones',label:'Importaciones',icon:<FileSpreadsheet size={18}/>,show:auth.has('imports.read')},
   {to:'/mapa',label:'Mapa de pegues',icon:<Map size={18}/>,show:auth.has('map.read')},
   {to:'/tarifas',label:'Tarifas y servicios',icon:<BadgeDollarSign size={18}/>,show:auth.has('tariffs.read')},
   {to:'/estados-cuenta',label:'Estados de cuenta',icon:<WalletCards size={18}/>,show:auth.has('obligations.read')}
  ],
  [
   {to:'/pagos',label:'Pagos y caja',icon:<Banknote size={18}/>,show:auth.has('payments.read')},
   {to:'/documentos-financieros',label:'Documentos financieros',icon:<Files size={18}/>,show:auth.has('payments.read')},
   {to:'/gastos',label:'Gastos',icon:<ReceiptText size={18}/>,show:auth.has('expenses.read')},
   {to:'/presupuesto',label:'Presupuesto',icon:<Landmark size={18}/>,show:auth.has('budget.read')},
   {to:'/informes',label:'Informes',icon:<BarChart3 size={18}/>,show:auth.has('reports.read')}
  ],
  [
   {to:'/operaciones',label:'Activos y órdenes',icon:<Wrench size={18}/>,show:auth.has('operations.read')}
  ],
  [
   {to:'/usuarios',label:'Usuarios',icon:<UserCog size={18}/>,show:auth.has('users.manage')},
   {to:'/estudio-recibo',label:'Vista visual del recibo',icon:<Palette size={18}/>,show:auth.has('document_templates.read')},
   {to:'/configuracion-documental',label:'Documentos y recibos',icon:<Files size={18}/>,show:auth.has('document_templates.read')},
   {to:'/integraciones',label:'Integraciones',icon:<PlugZap size={18}/>,show:auth.has('integrations.read')},
   {to:'/respaldos',label:'Respaldos',icon:<DatabaseBackup size={18}/>,show:auth.has('backups.read')},
   {to:'/auditoria',label:'Auditoría',icon:<FileClock size={18}/>,show:auth.has('audit.read')},
   {to:'/configuracion',label:'Configuración',icon:<SettingsIcon size={18}/>,show:auth.has('settings.manage')},
   {to:'/seguridad',label:'Seguridad',icon:<ShieldCheck size={18}/>,show:true}
  ]
 ];
 const groupTitles=['Trabajo','Abonados y servicio','Finanzas','Operación','Administración'];
 const groupsData=groups.map((items,index)=>({title:groupTitles[index],items:items.filter(item=>item.show)}));
 const mobileLinks=groups.flat().filter(item=>item.show&&['/','/abonados','/pagos','/informes'].includes(item.to));
 return <ToastProvider>
  <div className={`shell device-shell${collapsed?' nav-collapsed':''}`}>
   <aside className={navOpen?'open sidebar':''}>
    <div className="brand-row"><div className="brand"><span className="brand-mark"><Droplets size={22}/></span><span><strong>Junta de Agua</strong><small>El Achiotal</small></span></div><button className="mobile-nav-toggle outline" onClick={()=>setNavOpen(false)} aria-label="Cerrar navegación"><X size={18}/></button></div>
    <nav onClick={()=>setNavOpen(false)}>
     {groupsData.map(group=><div className="nav-group" key={group.title}><small>{group.title}</small>{group.items.map(item=>(
      <NavLink key={item.to} to={item.to} end={item.to==='/'} title={item.label}>{item.icon}<span>{item.label}</span></NavLink>
     ))}</div>)}
    </nav>
    <button className="version-card" onClick={()=>setReleaseOpen(true)} title="Novedades de la versión"><span>Versión {appVersion.version}</span><small>build {appVersion.commit}</small></button>
    <button className="outline signout" onClick={()=>void auth.signOut()}><LogOut size={18}/><span>Cerrar sesión</span></button>
   </aside>
   {navOpen&&<button className="nav-backdrop" aria-label="Cerrar navegación" onClick={()=>setNavOpen(false)}/>}
   <div className="main">
    <header>
     <button className="sidebar-toggle desktop-only" onClick={toggleCollapsed} aria-label={collapsed?'Expandir navegación':'Colapsar navegación'} title={collapsed?'Expandir':'Colapsar'}>{collapsed?<PanelLeftOpen size={18}/>:<PanelLeftClose size={18}/>}</button>
     <button className="mobile-nav-toggle" onClick={()=>setNavOpen(true)} aria-label="Abrir navegación"><Menu size={19}/></button>
     <GlobalSearch/>
     <div className="mobile-context-bar"><span><small>Sistema completo</small><strong>{topLabel}</strong></span><button onClick={()=>setNavOpen(true)}><Search size={15}/>Módulos</button></div>
     <div className="header-user"><div><strong>{auth.profile?.full_name}</strong><small>{auth.profile?.username}</small></div><span className="avatar avatar-xs">{initials(auth.profile?.full_name||'U')}</span></div>
    </header>
    <Outlet/>
   </div>
   <nav className="mobile-quick-nav" aria-label="Navegación móvil principal">{mobileLinks.map(item=><NavLink key={item.to} to={item.to} end={item.to==='/'}>{item.icon}<span>{item.label}</span></NavLink>)}<button type="button" onClick={()=>setNavOpen(true)}><Menu size={20}/><span>Más</span></button></nav>
   {releaseOpen&&<div className="modal"><div className="modal-card release-modal"><div className="titlebar"><div><h2>Novedades de la versión {appVersion.version}</h2><p>Compilación {appVersion.commit} · {new Date(appVersion.buildDate).toLocaleString('es-HN')}</p></div><button className="outline" onClick={()=>setReleaseOpen(false)}><X size={18}/>Cerrar</button></div><div className="release-list">{releaseHighlights.map(item=><div key={item}><Check size={14}/><p>{item}</p></div>)}</div><a className="button-link" href={appVersion.releaseUrl} target="_blank" rel="noreferrer">Abrir GitHub Release</a></div></div>}
  </div>
 </ToastProvider>;
}

function titleFor(path:string):string{
 const map:Record<string,string>={'/':'Centro de control','/abonados':'Abonados','/fichas-abonados':'Fichas digitales','/importaciones':'Importaciones','/mapa':'Mapa de pegues','/tarifas':'Tarifas','/medicion':'Medición','/estados-cuenta':'Estados de cuenta','/pagos':'Pagos y caja','/documentos-financieros':'Documentos','/gastos':'Gastos','/presupuesto':'Presupuesto','/informes':'Informes','/integraciones':'Integraciones','/respaldos':'Respaldos','/operaciones':'Operación','/avance':'Diagnóstico','/auditoria':'Auditoría','/estudio-recibo':'Vista del recibo','/configuracion-documental':'Documentos','/configuracion':'Configuración','/seguridad':'Seguridad','/usuarios':'Usuarios'};
 return map[path]??'Sistema';
}
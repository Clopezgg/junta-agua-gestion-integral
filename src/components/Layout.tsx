import {useState} from 'react';
import {Activity,BadgeDollarSign,Banknote,BarChart3,Boxes,Building2,CalendarDays,Check,ClipboardList,DatabaseBackup,Droplets,FileClock,FileSpreadsheet,Files,FlaskConical,HandCoins,Home,IdCard,Landmark,LayoutDashboard,LogOut,Map,Menu,MessagesSquare,PanelLeftClose,PanelLeftOpen,PlugZap,ReceiptText,Scale,Search,Settings as SettingsIcon,ShieldCheck,Sparkles,UserCog,Users,WalletCards,Wrench,X} from 'lucide-react';
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
    {to:'/centro-operativo',label:'Centro operativo',icon:<LayoutDashboard size={18}/>,show:true}
   ],
   [
    {to:'/abonados',label:'Abonados',icon:<Users size={18}/>,show:auth.has('subscribers.read')},
    {to:'/pegues-contratos',label:'Pegues y contratos',icon:<IdCard size={18}/>,show:auth.has('subscribers.read')},
    {to:'/solicitudes',label:'Solicitudes y reclamos',icon:<MessagesSquare size={18}/>,show:auth.has('subscribers.read')},
    {to:'/morosidad',label:'Morosidad y convenios',icon:<HandCoins size={18}/>,show:auth.has('obligations.read')},
    {to:'/comunicaciones',label:'Comunicaciones',icon:<MessagesSquare size={18}/>,show:auth.has('communications.read')}
   ],
   [
    {to:'/pagos',label:'Cobrar',icon:<HandCoins size={18}/>,show:auth.has('payments.read')},
    {to:'/caja',label:'Caja',icon:<Banknote size={18}/>,show:auth.has('payments.read')},
    {to:'/estados-cuenta',label:'Facturación / obligaciones',icon:<WalletCards size={18}/>,show:auth.has('obligations.read')},
    {to:'/bancos',label:'Bancos',icon:<Landmark size={18}/>,show:auth.has('finance.read')},
    {to:'/gastos',label:'Gastos',icon:<ReceiptText size={18}/>,show:auth.has('expenses.read')},
    {to:'/presupuesto',label:'Presupuesto',icon:<BarChart3 size={18}/>,show:auth.has('budget.read')},
    {to:'/compras',label:'Compras y proveedores',icon:<Building2 size={18}/>,show:auth.has('expenses.read')}
   ],
   [
    {to:'/operaciones',label:'Centro operativo',icon:<Wrench size={18}/>,show:auth.has('operations.read')},
    {to:'/incidencias',label:'Incidencias',icon:<ClipboardList size={18}/>,show:auth.has('operations.read')},
    {to:'/ordenes-trabajo',label:'Órdenes de trabajo',icon:<Wrench size={18}/>,show:auth.has('operations.read')},
    {to:'/activos',label:'Red y activos',icon:<Boxes size={18}/>,show:auth.has('assets.read')},
    {to:'/mantenimiento',label:'Mantenimiento',icon:<Wrench size={18}/>,show:auth.has('maintenance.manage')},
    {to:'/bodega',label:'Bodega',icon:<Boxes size={18}/>,show:auth.has('inventory.read')},
    {to:'/mapa',label:'Mapa de la red',icon:<Map size={18}/>,show:auth.has('map.read')}
   ],
   [
    {to:'/fuentes',label:'Fuentes',icon:<Droplets size={18}/>,show:auth.has('water.read')},
    {to:'/calidad',label:'Calidad del agua',icon:<FlaskConical size={18}/>,show:auth.has('water.read')},
    {to:'/cloracion',label:'Cloración',icon:<FlaskConical size={18}/>,show:auth.has('water.read')},
    {to:'/continuidad',label:'Continuidad / racionamientos',icon:<CalendarDays size={18}/>,show:auth.has('water.read')},
    {to:'/microcuenca',label:'Microcuenca',icon:<Sparkles size={18}/>,show:auth.has('water.read')}
   ],
   [
    {to:'/asamblea',label:'Asamblea',icon:<Users size={18}/>,show:auth.has('governance.read')},
    {to:'/junta-directiva',label:'Junta Directiva',icon:<Landmark size={18}/>,show:auth.has('governance.read')},
    {to:'/comites',label:'Comités',icon:<Users size={18}/>,show:auth.has('governance.read')},
    {to:'/reuniones',label:'Reuniones y actas',icon:<Files size={18}/>,show:auth.has('governance.read')},
    {to:'/resoluciones',label:'Resoluciones',icon:<Scale size={18}/>,show:auth.has('governance.read')},
    {to:'/proyectos',label:'Proyectos',icon:<Building2 size={18}/>,show:auth.has('governance.read')}
   ],
   [
    {to:'/ersaps',label:'ERSAPS',icon:<ShieldCheck size={18}/>,show:auth.has('compliance.read')},
    {to:'/calendario',label:'Calendario',icon:<CalendarDays size={18}/>,show:true},
    {to:'/informes',label:'Informe anual',icon:<BarChart3 size={18}/>,show:auth.has('reports.read')},
    {to:'/documentos-financieros',label:'Estados financieros',icon:<Files size={18}/>,show:auth.has('payments.read')},
    {to:'/transparencia',label:'Transparencia',icon:<Scale size={18}/>,show:auth.has('reports.read')},
    {to:'/auditoria',label:'Auditoría',icon:<FileClock size={18}/>,show:auth.has('audit.read')}
   ],
   [
    {to:'/admin',label:'Centro administrativo',icon:<Landmark size={18}/>,show:auth.has('settings.read')},
    {to:'/usuarios',label:'Usuarios y roles',icon:<UserCog size={18}/>,show:auth.has('users.manage')},
    {to:'/documentos',label:'Centro de documentos',icon:<Files size={18}/>,show:auth.has('document_templates.read')},
    {to:'/importaciones',label:'Datos · Importar',icon:<FileSpreadsheet size={18}/>,show:auth.has('imports.read')},
    {to:'/avance',label:'Sistema · Diagnóstico',icon:<Activity size={18}/>,show:true},
    {to:'/tarifas',label:'Tarifas y servicios',icon:<BadgeDollarSign size={18}/>,show:auth.has('tariffs.read')},
    {to:'/integraciones',label:'Integraciones',icon:<PlugZap size={18}/>,show:auth.has('integrations.read')},
    {to:'/respaldos',label:'Respaldos',icon:<DatabaseBackup size={18}/>,show:auth.has('backups.read')},
    {to:'/configuracion',label:'Configuración',icon:<SettingsIcon size={18}/>,show:auth.has('settings.manage')},
    {to:'/seguridad',label:'Seguridad',icon:<ShieldCheck size={18}/>,show:true}
   ]
  ];
  const groupTitles=['INICIO','Usuarios y servicio','Tesorería','Operación','Agua y ambiente','Gobierno','Cumplimiento','Administración'];
 const groupsData=groups.map((items,index)=>({title:groupTitles[index],items:items.filter(item=>item.show)}));
 const mobileLinks=groups.flat().filter(item=>item.show&&['/','/abonados','/pagos','/informes'].includes(item.to));
 return <ToastProvider><a className="skip-link" href="#main-content">Saltar al contenido</a>
  <div className={`shell device-shell${collapsed?' nav-collapsed':''}`}>
   <aside className={navOpen?'open sidebar':''}>
    <div className="brand-row"><div className="brand"><span className="brand-mark"><Droplets size={22}/></span><span><strong>Junta de Agua</strong><small>Gestión integral</small></span></div><button className="mobile-nav-toggle outline" onClick={()=>setNavOpen(false)} aria-label="Cerrar navegación"><X size={18}/></button></div>
    <nav onClick={()=>setNavOpen(false)}>
     {groupsData.map(group=><div className="nav-group" key={group.title}><small>{group.title}</small>{group.items.map(item=>(
      <NavLink key={item.to} to={item.to} end={item.to==='/'} title={item.label}>{item.icon}<span>{item.label}</span></NavLink>
     ))}</div>)}
    </nav>
    <button className="version-card" onClick={()=>setReleaseOpen(true)} title="Novedades de la versión"><span>Versión {appVersion.version}</span><small>build {appVersion.commit}</small></button>
    <button className="outline signout" onClick={()=>void auth.signOut()}><LogOut size={18}/><span>Cerrar sesión</span></button>
   </aside>
   {navOpen&&<button className="nav-backdrop" aria-label="Cerrar navegación" onClick={()=>setNavOpen(false)}/>}
   <div className="main" id="main-content">
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
 const map:Record<string,string>={'/':'Centro de control','/centro-operativo':'Centro operativo','/abonados':'Abonados','/fichas-abonados':'Fichas digitales','/pegues-contratos':'Pegues y contratos','/solicitudes':'Solicitudes y reclamos','/morosidad':'Morosidad y convenios','/comunicaciones':'Comunicaciones','/importaciones':'Datos · Importar','/mapa':'Mapa de la red','/tarifas':'Tarifas y servicios','/medicion':'Medición','/estados-cuenta':'Facturación / obligaciones','/pagos':'Cobrar','/caja':'Caja','/bancos':'Bancos','/compras':'Compras y proveedores','/documentos-financieros':'Estados financieros','/gastos':'Gastos','/presupuesto':'Presupuesto','/informes':'Informe anual','/integraciones':'Integraciones','/respaldos':'Respaldos','/operaciones':'Centro operativo','/incidencias':'Incidencias','/ordenes-trabajo':'Órdenes de trabajo','/activos':'Red y activos','/mantenimiento':'Mantenimiento','/bodega':'Bodega','/avance':'Sistema · Diagnóstico','/auditoria':'Auditoría','/estudio-recibo':'Vista del recibo','/documentos':'Centro de documentos','/configuracion-documental':'Documentos','/configuracion':'Configuración','/seguridad':'Seguridad','/usuarios':'Usuarios y roles','/admin':'Centro administrativo','/admin/usuarios':'Usuarios y roles','/admin/junta':'Junta Directiva','/admin/auditoria':'Auditoría','/admin/respaldos':'Respaldos','/admin/integraciones':'Integraciones','/admin/configuracion':'Configuración','/admin/configuracion-documental':'Documentos','/admin/estudio-recibo':'Vista del recibo','/admin/seguridad':'Seguridad','/admin/readiness':'Estado de la plataforma','/admin/progreso':'Diagnóstico','/fuentes':'Fuentes','/calidad':'Calidad del agua','/cloracion':'Cloración','/continuidad':'Continuidad / racionamientos','/microcuenca':'Microcuenca','/asamblea':'Asamblea','/junta-directiva':'Junta Directiva','/comites':'Comités','/reuniones':'Reuniones y actas','/resoluciones':'Resoluciones','/proyectos':'Proyectos','/ersaps':'ERSAPS','/calendario':'Calendario','/transparencia':'Transparencia'};
 return map[path]??(path.startsWith('/admin/')?'Centro administrativo':'Sistema');
}
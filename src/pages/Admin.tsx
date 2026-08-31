import {useEffect,useState} from 'react';
import {ArrowRight,DatabaseBackup,FileClock,Files,Landmark,Palette,PlugZap,ScrollText,ShieldCheck,Siren,UserCog,UsersRound} from 'lucide-react';
import {Link} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {getRoleDashboard} from '../features/finance/service';

type Item={to:string;icon:React.ReactNode;title:string;text:string;show:boolean};
export function Admin(){
 const auth=useAuth();
 const[tasks,setTasks]=useState<any>({});
 useEffect(()=>{void getRoleDashboard().then(setTasks).catch(()=>{})},[]);
 const groups:{title:string;items:Item[]}[]=[
  {title:'Junta y personas',items:[
   {to:'/admin/usuarios',icon:<UserCog size={20}/>,title:'Usuarios y roles',text:'Administrar cuentas, permisos y MFA del personal.',show:auth.has('users.manage')},
   {to:'/admin/junta',icon:<UsersRound size={20}/>,title:'Junta Directiva',text:'Roles de presidente, secretario, tesorero y vocalías.',show:auth.has('users.manage')}
  ]},
  {title:'Seguridad y control',items:[
   {to:'/admin/seguridad',icon:<ShieldCheck size={20}/>,title:'Seguridad',text:'Claves de documento, MFA y política de acceso.',show:true},
   {to:'/admin/auditoria',icon:<FileClock size={20}/>,title:'Auditoría',text:'Línea de tiempo de acciones registradas.',show:auth.has('audit.read')}
  ]},
  {title:'Datos y respaldos',items:[
   {to:'/admin/respaldos',icon:<DatabaseBackup size={20}/>,title:'Respaldos',text:'Crear, descargar, restaurar y retención automática.',show:auth.has('backups.read')},
   {to:'/admin/readiness',icon:<Siren size={20}/>,title:'Estado de la plataforma',text:'Comprobaciones de seguridad y datos de su sistema.',show:true}
  ]},
  {title:'Plataforma y documentos',items:[
   {to:'/admin/integraciones',icon:<PlugZap size={20}/>,title:'Integraciones',text:'Correo, WhatsApp, OCR y mapas opcionales.',show:auth.has('integrations.read')},
   {to:'/admin/configuracion',icon:<Landmark size={20}/>,title:'Configuración institucional',text:'Identidad, tarifa, información legal y finanzas.',show:auth.has('settings.manage')},
   {to:'/admin/configuracion-documental',icon:<Files size={20}/>,title:'Documentos y recibos',text:'Encabezados, pie de página y sellos del recibo.',show:auth.has('document_templates.read')},
   {to:'/admin/estudio-recibo',icon:<Palette size={20}/>,title:'Vista visual del recibo',text:'Simule y ajuste el formato oficial del recibo.',show:auth.has('document_templates.read')},
   {to:'/admin/progreso',icon:<ScrollText size={20}/>,title:'Diagnóstico de módulos',text:'Avance de implementación de los módulos.',show:auth.has('updates.read')}
  ]}
 ].map(group=>({title:group.title,items:group.items.filter(item=>item.show)}));
 const hasAny=groups.some(group=>group.items.length>0);
 return <main className="content">
  <div className="titlebar module-hero">
   <div><span className="eyebrow">Centro administrativo</span><h1>Administración</h1><p>Controle el personal, la seguridad, los datos y la configuración institucional del sistema.</p></div>
   <span className={`status-badge ${tasks.active_cash_session?'approved':'draft'}`}>{tasks.active_cash_session?'Caja abierta':'Caja cerrada'}</span>
  </div>
  {!hasAny&&<section className="panel"><div className="empty empty-state"><ShieldCheck size={22}/><p>No tiene permisos de administración en esta cuenta.</p></div></section>}
  {groups.filter(group=>group.items.length>0).map(group=><section className="panel" style={{marginTop:'1rem'}} key={group.title}>
   <div className="panel-heading"><div><h2>{group.title}</h2></div></div>
   <div className="admin-grid">{group.items.map(item=><Link to={item.to} className="admin-tile" key={item.to}><span className="admin-tile-icon">{item.icon}</span><span className="admin-tile-body"><strong>{item.title}</strong><small>{item.text}</small></span><ArrowRight size={17}/></Link>)}</div>
  </section>)}
 </main>;
}
import {useEffect,useState} from 'react';
import {ArrowRight,DatabaseBackup,FileClock,Files,Landmark,Palette,PlugZap,ScrollText,ShieldCheck,Siren,UserCog,UsersRound} from 'lucide-react';
import {Link} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {getRoleDashboard} from '../features/finance/service';
import {Badge,EmptyState} from '../design-system/primitives';

type Item={to:string;icon:React.ReactNode;title:string;text:string;show:boolean};

export function Admin(){
  const auth=useAuth();
  const [tasks,setTasks]=useState<Record<string,any>>({});
  useEffect(()=>{void getRoleDashboard().then(d=>setTasks(d??{})).catch(()=>{});},[]);

  const groups:{title:string;items:Item[]}[]=[
    {title:'Junta y personas',items:[
      {to:'/admin/usuarios',icon:<UserCog size={18}/>,title:'Usuarios y roles',text:'Administrar cuentas, permisos y MFA del personal.',show:auth.has('users.manage')},
      {to:'/junta-directiva',icon:<UsersRound size={18}/>,title:'Junta Directiva',text:'Cargos institucionales de presidente, secretario, tesorero y vocalías.',show:auth.has('governance.read')},
    ]},
    {title:'Seguridad y control',items:[
      {to:'/admin/seguridad',icon:<ShieldCheck size={18}/>,title:'Seguridad',text:'Estado de la sesión, MFA y permisos efectivos.',show:true},
      {to:'/admin/auditoria',icon:<FileClock size={18}/>,title:'Auditoría',text:'Línea de tiempo de acciones registradas.',show:auth.has('audit.read')},
    ]},
    {title:'Datos y respaldos',items:[
      {to:'/admin/respaldos',icon:<DatabaseBackup size={18}/>,title:'Respaldos',text:'Crear, descargar, restaurar y retención automática.',show:auth.has('backups.read')},
      {to:'/admin/readiness',icon:<Siren size={18}/>,title:'Estado de la plataforma',text:'Comprobaciones de seguridad y datos de su sistema.',show:true},
    ]},
    {title:'Plataforma y documentos',items:[
      {to:'/admin/integraciones',icon:<PlugZap size={18}/>,title:'Integraciones',text:'Correo, WhatsApp, OCR y mapas opcionales.',show:auth.has('integrations.read')},
      {to:'/admin/configuracion',icon:<Landmark size={18}/>,title:'Configuración institucional',text:'Identidad, tarifa, información legal y finanzas.',show:auth.has('settings.manage')},
      {to:'/admin/configuracion-documental',icon:<Files size={18}/>,title:'Documentos y recibos',text:'Encabezados, pie de página y sellos del recibo.',show:auth.has('document_templates.read')},
      {to:'/admin/estudio-recibo',icon:<Palette size={18}/>,title:'Vista visual del recibo',text:'Simule y ajuste el formato oficial del recibo.',show:auth.has('document_templates.read')},
      {to:'/admin/progreso',icon:<ScrollText size={18}/>,title:'Diagnóstico de módulos',text:'Avance de implementación de los módulos.',show:auth.has('updates.read')},
    ]},
  ].map(g=>({title:g.title,items:g.items.filter(i=>i.show)}));

  const hasAny=groups.some(g=>g.items.length>0);

  return <main className="ja-page">
    <header className="ja-page-head">
      <div><h1>Administración</h1><p>Controle el personal, la seguridad, los datos y la configuración institucional del sistema.</p></div>
      <Badge tone={tasks.active_cash_session?'success':'neutral'}>{tasks.active_cash_session?'Caja abierta':'Caja cerrada'}</Badge>
    </header>

    {!hasAny&&<EmptyState icon={<ShieldCheck size={22}/>} title="Sin permisos de administración" description="No tiene permisos de administración en esta cuenta."/>}

    {groups.filter(g=>g.items.length>0).map(group=><section className="ja-list" key={group.title}>
      <h3 className="ja-list-heading">{group.title}</h3>
      {group.items.map(item=><Link to={item.to} key={item.to} className="ja-list-row ja-row-click" style={{textDecoration:'none',color:'inherit'}}>
        <div style={{display:'flex',gap:'.7rem',alignItems:'center'}}>
          <span style={{color:'var(--ja-text-muted)'}}>{item.icon}</span>
          <span><strong>{item.title}</strong><span className="ja-cell-sub">{item.text}</span></span>
        </div>
        <ArrowRight size={16}/>
      </Link>)}
    </section>)}
  </main>;
}

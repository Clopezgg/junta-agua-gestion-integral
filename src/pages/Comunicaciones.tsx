import {useCallback,useEffect,useMemo,useState} from 'react';
import {Mail,MessageCircle,Printer,RefreshCw,Send} from 'lucide-react';
import {listMessages,sendEmail} from '../features/communications/service';
import {shareWhatsApp} from '../features/integrations/service';
import {useAuth} from '../contexts/AuthContext';
import {Badge,Button,EmptyState,ErrorState,Skeleton} from '../design-system/primitives';
import {formatDateTime} from '../design-system/utils';

type Msg={id:string;channel:string;status:string;created_at:string;recipient?:string;to?:string};

// Plantillas contextuales §62. Texto plano con marcadores {abonado} {monto} {fecha} {detalle}.
const TEMPLATES=[
  {key:'recibo',label:'Recibo',body:'Estimado/a {abonado}, su recibo por L {monto} está disponible. Gracias por su pago puntual.'},
  {key:'saldo',label:'Saldo',body:'Estimado/a {abonado}, su saldo pendiente con la Junta de Agua es de L {monto} al {fecha}.'},
  {key:'mora',label:'Mora',body:'Estimado/a {abonado}, registramos un saldo vencido de L {monto}. Le invitamos a regularizar o solicitar un convenio de pago.'},
  {key:'convenio',label:'Convenio',body:'Estimado/a {abonado}, su convenio de pago quedó registrado. Próxima cuota: {detalle}.'},
  {key:'interrupcion',label:'Interrupción',body:'Aviso: habrá interrupción del servicio de agua el {fecha}. Zonas afectadas: {detalle}. Recomendamos almacenar agua.'},
  {key:'emergencia',label:'Emergencia',body:'Emergencia en el sistema de agua: {detalle}. El equipo técnico ya está atendiendo. Actualizaremos por este medio.'},
  {key:'calidad',label:'Calidad del agua',body:'Informe de calidad del agua ({fecha}): {detalle}. Ante cualquier duda comuníquese con la Junta.'},
  {key:'reunion',label:'Reunión',body:'Convocatoria: reunión de la Junta Administradora de Agua el {fecha}. Lugar y agenda: {detalle}.'},
] as const;

export function Comunicaciones(){
  const auth=useAuth();
  const canSend=auth.has('communications.send');
  const [items,setItems]=useState<Msg[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [tplKey,setTplKey]=useState<typeof TEMPLATES[number]['key']>('recibo');
  const [vars,setVars]=useState({abonado:'',monto:'',fecha:'',detalle:''});
  const [recipient,setRecipient]=useState({phone:'',email:''});

  const load=useCallback(()=>{
    if(!auth.has('communications.read')){setLoading(false);return;}
    setLoading(true);
    void listMessages()
      .then(i=>{setItems((i as Msg[])??[]);setError('');})
      .catch(e=>setError((e as Error).message))
      .finally(()=>setLoading(false));
  },[auth]);
  useEffect(load,[load]);

  const template=TEMPLATES.find(t=>t.key===tplKey)!;
  const rendered=useMemo(()=>template.body
    .replace('{abonado}',vars.abonado||'{abonado}')
    .replace('{monto}',vars.monto||'{monto}')
    .replace('{fecha}',vars.fecha||'{fecha}')
    .replace('{detalle}',vars.detalle||'{detalle}'),[template,vars]);

  function viaWhatsApp(){
    if(!recipient.phone){setError('Indique el teléfono para WhatsApp.');return;}
    shareWhatsApp(recipient.phone,rendered);
    setNotice('WhatsApp abierto con el mensaje. Envíelo manualmente desde la app.');
  }
  async function viaEmail(){
    if(!recipient.email){setError('Indique el correo del destinatario.');return;}
    try{
      await sendEmail({to:recipient.email,subject:`Junta de Agua — ${template.label}`,html:`<p>${rendered.replace(/\n/g,'<br>')}</p>`});
      setNotice('Correo enviado.');load();
    }catch(e){setError((e as Error).message);}
  }
  function viaPrint(){
    const w=window.open('','_blank','noopener');
    if(!w)return;
    w.document.write(`<pre style="font:14px/1.6 system-ui;white-space:pre-wrap;padding:2rem">${rendered.replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]!))}</pre>`);
    w.document.close();w.print();
    setNotice('Vista de impresión abierta.');
  }

  return <main className="ja-page">
    <header className="ja-page-head">
      <div><h1>Comunicaciones</h1><p>Mensajes contextuales por plantilla. WhatsApp manual, correo o impreso.</p></div>
      <button type="button" className="ja-tab" onClick={load}><RefreshCw size={14}/> Actualizar</button>
    </header>

    {notice&&<div className="ja-banner ja-banner-info">{notice}</div>}
    {error&&<ErrorState error={error} onRetry={load}/>}

    {canSend&&<section className="ja-list">
      <h3 className="ja-list-heading">Redactar</h3>
      <div className="ja-tabs" role="tablist">
        {TEMPLATES.map(t=><button key={t.key} type="button" role="tab" aria-selected={t.key===tplKey} className={t.key===tplKey?'ja-tab-active':''} onClick={()=>setTplKey(t.key)}>{t.label}</button>)}
      </div>
      <div className="ja-pos-grid">
        <label className="ja-field"><span className="ja-field-label">Abonado</span><input className="ja-control" value={vars.abonado} onChange={e=>setVars({...vars,abonado:e.target.value})}/></label>
        <label className="ja-field"><span className="ja-field-label">Monto (L)</span><input className="ja-control" value={vars.monto} onChange={e=>setVars({...vars,monto:e.target.value})}/></label>
        <label className="ja-field"><span className="ja-field-label">Fecha</span><input className="ja-control" value={vars.fecha} onChange={e=>setVars({...vars,fecha:e.target.value})}/></label>
        <label className="ja-field"><span className="ja-field-label">Detalle</span><input className="ja-control" value={vars.detalle} onChange={e=>setVars({...vars,detalle:e.target.value})}/></label>
      </div>
      <label className="ja-field"><span className="ja-field-label">Mensaje</span><textarea className="ja-control" rows={4} readOnly value={rendered}/></label>
      <div className="ja-pos-grid">
        <label className="ja-field"><span className="ja-field-label">Teléfono (WhatsApp)</span><input className="ja-control" value={recipient.phone} onChange={e=>setRecipient({...recipient,phone:e.target.value})} placeholder="+504…"/></label>
        <label className="ja-field"><span className="ja-field-label">Correo</span><input className="ja-control" type="email" value={recipient.email} onChange={e=>setRecipient({...recipient,email:e.target.value})}/></label>
      </div>
      <div className="ja-row-actions">
        <Button variant="secondary" icon={<MessageCircle size={15}/>} onClick={viaWhatsApp}>WhatsApp (manual)</Button>
        <Button variant="secondary" icon={<Mail size={15}/>} onClick={()=>void viaEmail()}>Enviar correo</Button>
        <Button variant="secondary" icon={<Printer size={15}/>} onClick={viaPrint}>Imprimir</Button>
      </div>
    </section>}

    <section className="ja-list">
      <h3 className="ja-list-heading">Historial</h3>
      {loading&&items.length===0&&<Skeleton className="ja-360-skel"/>}
      {!loading&&(items.length===0
        ?<EmptyState icon={<Send size={22}/>} title="Sin comunicaciones" description="Los mensajes enviados aparecerán aquí."/>
        :items.map(m=><article key={m.id} className="ja-list-row">
          <div><strong>{m.recipient??m.to??'—'}</strong><span className="ja-cell-sub">{formatDateTime(m.created_at)}</span></div>
          <Badge tone="neutral">{m.channel}</Badge>
          <Badge tone={m.status==='sent'||m.status==='delivered'?'success':m.status==='failed'?'danger':'neutral'}>{m.status}</Badge>
        </article>))}
    </section>
  </main>;
}

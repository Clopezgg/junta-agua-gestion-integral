import {useEffect,useState} from 'react';
import {BadgeCheck,CircleX,Loader,ScanSearch} from 'lucide-react';
import {useParams} from 'react-router-dom';
import {supabase} from '../lib/supabase';

export function VerifyReceipt(){
 const{token}=useParams();
 const[data,setData]=useState<any>(null);
 const[error,setError]=useState('');
 const[loading,setLoading]=useState(true);
 useEffect(()=>{
  let alive=true;
  if(!supabase||!token){setError('No se puede verificar el recibo.');setLoading(false);return;}
  void(async()=>{
   try{
    const{data,error}=await supabase.rpc('verify_receipt_public',{p_token:token});
    if(!alive)return;
    if(error||!data)setError('Recibo no encontrado o código inválido.');
    else setData(data);
   }catch{ if(alive)setError('No se pudo comprobar el recibo. Intente de nuevo.'); }
   finally{ if(alive)setLoading(false); }
  })();
  return ()=>{alive=false};
 },[token]);
 const rows=data?[
  ['Junta',data.organization],
  ['Recibo',data.receipt_number],
  ['Fecha',new Date(data.created_at).toLocaleString('es-HN')],
  ['Abonado',data.subscriber],
  ['Método',data.method]
 ]:[];
 return <main className="public-verify">
  <section className="panel verify-card">
   <header className="verify-head">
    <span className="verify-mark"><ScanSearch size={26}/></span>
    <span className="eyebrow">Validación documental</span>
    <h1>Verificación de recibo</h1>
    <p>Compruebe la autenticidad de un recibo emitido por la Junta de Agua mediante su código de verificación.</p>
   </header>
   {loading&&<div className="verify-loading"><Loader size={18}/>Comprobando el recibo…</div>}
   {!loading&&error&&<div className="empty empty-state"><CircleX size={26}/><p>{error}</p></div>}
   {!loading&&data&&<>
    <div className={`verify-result ${data.status==='confirmed'?'success':'error'}`}>
     {data.status==='confirmed'?<><BadgeCheck size={22}/><span><strong>Recibo válido</strong>Documento confirmado en el registro oficial.</span></>:<><CircleX size={22}/><span><strong>Recibo con estado {data.status}</strong>Este documento no aparece como confirmado.</span></>}
    </div>
    <dl className="verify-grid">{rows.map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}<div><dt>Total</dt><dd className="verify-total">L {Number(data.total).toFixed(2)}</dd></div></dl>
   </>}
  </section>
 </main>;
}
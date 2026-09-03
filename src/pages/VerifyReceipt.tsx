import {useEffect,useState} from 'react';
import {BadgeCheck,CircleX,Loader,ScanSearch} from 'lucide-react';
import {useParams} from 'react-router-dom';
import {supabase} from '../lib/supabase';
import {formatDateTime,formatMoney} from '../design-system/utils';

type Verified={organization:string;receipt_number:string;created_at:string;subscriber:string;method:string;status:string;total:number};

export function VerifyReceipt(){
  const {token}=useParams();
  const [data,setData]=useState<Verified|null>(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    let alive=true;
    if(!supabase||!token){setError('No se puede verificar el recibo.');setLoading(false);return;}
    void(async()=>{
      try{
        const{data,error}=await supabase.rpc('verify_receipt_public',{p_token:token});
        if(!alive)return;
        if(error||!data)setError('Recibo no encontrado o código inválido.');
        else setData(data as Verified);
      }catch{ if(alive)setError('No se pudo comprobar el recibo. Intente de nuevo.'); }
      finally{ if(alive)setLoading(false); }
    })();
    return ()=>{alive=false;};
  },[token]);

  const rows=data?[
    ['Junta',data.organization],
    ['Recibo',data.receipt_number],
    ['Fecha',formatDateTime(data.created_at)],
    ['Abonado',data.subscriber],
    ['Método',data.method],
  ]:[];

  return <main className="ja-auth ja-auth-wide">
    <div className="ja-auth-brand">
      <span className="ja-auth-brand-mark" aria-hidden><ScanSearch size={22}/></span>
      <span className="ja-auth-brand-name">Verificación de recibo</span>
      <span className="ja-auth-brand-sub">Validación documental</span>
    </div>
    <section className="ja-auth-card">
      <h1 className="ja-auth-title">Compruebe la autenticidad de un recibo</h1>
      <p className="ja-auth-subtitle">Recibo emitido por la Junta de Agua, verificado con su código.</p>

      {loading&&<p className="ja-auth-alert ja-auth-alert-info"><Loader size={14}/> Comprobando el recibo…</p>}
      {!loading&&error&&<p className="ja-auth-alert ja-auth-alert-error"><CircleX size={14}/> {error}</p>}

      {!loading&&data&&<>
        <p className={`ja-auth-alert ${data.status==='confirmed'?'ja-auth-alert-success':'ja-auth-alert-error'}`}>
          {data.status==='confirmed'
            ?<><BadgeCheck size={14}/> Recibo válido. Documento confirmado en el registro oficial.</>
            :<><CircleX size={14}/> Recibo con estado {data.status}. Este documento no aparece como confirmado.</>}
        </p>
        <dl className="ja-pos-fields" style={{margin:0}}>
          {rows.map(([k,v])=><div key={k} className="ja-auth-row"><dt style={{color:'var(--ja-text-muted)'}}>{k}</dt><dd style={{margin:0,fontWeight:600}}>{v}</dd></div>)}
          <div className="ja-auth-row"><dt style={{color:'var(--ja-text-muted)'}}>Total</dt><dd style={{margin:0,fontWeight:700}}>{formatMoney(data.total)}</dd></div>
        </dl>
      </>}
    </section>
  </main>;
}

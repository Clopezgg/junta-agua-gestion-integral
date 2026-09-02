import {useCallback,useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {
  Ban,CheckCircle2,FileDown,Mail,MessageCircle,Receipt,RotateCcw,Search,ShieldCheck,WalletMinimal,X,
} from 'lucide-react';
import {
  draftPaymentKey,getActiveCashSession,getPaymentReceiptData,listPayments,
  recordPaymentReprint,refundPayment,registerPayment,searchPayableAccounts,uploadPaymentReceipt,voidPayment,
} from '../features/finance/service';
import {createReceiptPdfBlob,downloadReceiptPdf,toReceiptBrandSnapshot,type ReceiptBrand,type ReceiptInput} from '../features/finance/documents';
import {sendEmail} from '../features/communications/service';
import {getOrganizationAssetUrl,getOrganizationSettings} from '../features/settings/service';
import {useAuth} from '../contexts/AuthContext';
import {Badge,Button,EmptyState,Skeleton} from '../design-system/primitives';
import {cn,formatMoney,formatDateTime} from '../design-system/utils';

type Row=Record<string,unknown>;
type Method='cash'|'transfer'|'deposit'|'check'|'mixed';
type PaymentComponent={method:'cash'|'transfer'|'deposit'|'check';amount:number;reference?:string};
const N=(v:unknown)=>Number(v??0);
const M=(v:unknown)=>formatMoney(N(v));
const METHOD:Record<string,string>={cash:'Efectivo',transfer:'Transferencia',deposit:'Depósito',check:'Cheque',mixed:'Mixto'};

async function assetDataUrl(path?:string|null){
  if(!path)return'';
  const url=await getOrganizationAssetUrl(path);if(!url)return'';
  const blob=await fetch(url).then(r=>r.blob());
  return await new Promise<string>((res,rej)=>{const rd=new FileReader();rd.onload=()=>res(String(rd.result));rd.onerror=rej;rd.readAsDataURL(blob);});
}

export function Payments(){
  const auth=useAuth();
  const [q,setQ]=useState('');
  const [results,setResults]=useState<Row[]>([]);
  const [selected,setSelected]=useState<Row|null>(null);
  const [chosen,setChosen]=useState<Record<string,boolean>>({});
  const [session,setSession]=useState<Row|null>(null);
  const [payments,setPayments]=useState<Row[]>([]);
  const [loading,setLoading]=useState(true);

  const [received,setReceived]=useState(0);
  const [method,setMethod]=useState<Method>('cash');
  const [reference,setReference]=useState('');
  const [cashAmount,setCashAmount]=useState(0);
  const [secondaryMethod,setSecondaryMethod]=useState<'transfer'|'deposit'|'check'>('transfer');
  const [secondaryReference,setSecondaryReference]=useState('');

  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [brand,setBrand]=useState<ReceiptBrand>({templateVersion:'2.0'});
  const [action,setAction]=useState<{type:'void'|'refund';payment:Row}|null>(null);
  const [actionReason,setActionReason]=useState('');
  const [refundAmount,setRefundAmount]=useState(0);
  const [paying,setPaying]=useState(false);

  const resolveBrand=useCallback(async(snapshot?:ReceiptBrand|null):Promise<ReceiptBrand>=>{
    const source=snapshot&&Object.keys(snapshot).length?{...brand,...snapshot}:brand;
    const [logoDataUrl,signatureDataUrl,stampDataUrl]=await Promise.all([assetDataUrl(source.logoPath),assetDataUrl(source.signaturePath),assetDataUrl(source.stampPath)]);
    return {...source,logoDataUrl,signatureDataUrl,stampDataUrl};
  },[brand]);

  const load=useCallback(async()=>{
    try{
      setSession(await getActiveCashSession() as Row|null);
      setPayments(await listPayments() as Row[]);
      const s=await getOrganizationSettings() as Row;
      const next:ReceiptBrand={
        name:s.name as string,address:s.address as string,phone:s.phone as string,email:s.email as string,rtn:s.rtn as string,
        footer:s.receipt_footer as string,logoPath:s.logo_path as string,signaturePath:s.signature_path as string,stampPath:s.stamp_path as string,
        signatoryName:s.receipt_signatory_name as string,signatoryTitle:s.receipt_signatory_title as string,
        templateVersion:(s.receipt_template_version as string)??'2.0',
      };
      const [logoDataUrl,signatureDataUrl,stampDataUrl]=await Promise.all([assetDataUrl(next.logoPath),assetDataUrl(next.signaturePath),assetDataUrl(next.stampPath)]);
      setBrand({...next,logoDataUrl,signatureDataUrl,stampDataUrl});
      setError('');
    }catch(e){setError((e as Error).message);}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);

  const obligations=useMemo(()=>(selected?.obligations as Row[])??[],[selected]);
  const allocations=useMemo(()=>obligations.filter(o=>chosen[String(o.id)]).map(o=>({obligation_id:String(o.id),amount:N(o.balance)})),[obligations,chosen]);
  const total=allocations.reduce((s,i)=>s+i.amount,0);
  const secondaryAmount=Math.max(0,total-cashAmount);
  const components=useMemo<PaymentComponent[]>(()=>{
    if(method==='mixed')return [{method:'cash',amount:cashAmount},{method:secondaryMethod,amount:secondaryAmount,reference:secondaryReference}].filter(i=>i.amount>0) as PaymentComponent[];
    return [{method,amount:total,reference:method==='cash'?undefined:reference}] as PaymentComponent[];
  },[method,cashAmount,secondaryMethod,secondaryAmount,secondaryReference,total,reference]);
  const requiresCash=method==='cash'||method==='mixed';
  const effectiveReceived=requiresCash?received:total;
  const invalidMixed=method==='mixed'&&(cashAmount<=0||cashAmount>=total||!secondaryReference.trim());
  const canConfirm=allocations.length>0&&(!requiresCash||Boolean(session))&&effectiveReceived>=total&&(method==='cash'||method==='mixed'||reference.trim().length>0)&&!invalidMixed;

  async function search(){
    try{setResults(await searchPayableAccounts(q) as Row[]);setError('');}catch(e){setError((e as Error).message);}
  }

  function resetEntry(){setSelected(null);setChosen({});setReceived(0);setReference('');setCashAmount(0);setSecondaryReference('');}

  async function pay(){
    if(!selected||paying)return;
    setPaying(true);setError('');
    try{
      const idempotencyKey=draftPaymentKey({subscriber_id:String(selected.id),method,received_amount:effectiveReceived,allocations});
      const result=await registerPayment({subscriber_id:String(selected.id),cash_session_id:session?.id as string|undefined,method,received_amount:effectiveReceived,reference,idempotency_key:idempotencyKey,components,allocations});
      const data=await getPaymentReceiptData(result.id) as Row;
      const verification=`${window.location.origin}${result.verification_url}`;
      const base=N(data.base_amount??total),discount=N(data.discount_amount),late=N(data.late_fee_amount);
      const receipt:ReceiptInput={
        number:result.receipt_number,subscriber:(data.subscriber_name as string)??String(selected.full_name),subscriberCode:(data.subscriber_code as string)??String(selected.code),
        maskedIdentity:data.masked_identity as string,date:new Date((data.created_at as string)??Date.now()).toLocaleString('es-HN'),
        annualYear:data.annual_year as number|undefined,
        connectionCount:N(data.connection_count),connectionCodes:(data.connection_codes as string[])??[],
        address:data.subscriber_address as string,sector:data.subscriber_sector as string,serviceStatus:'ACTIVO',
        baseAmount:base,discountPercentage:base>0?Math.round((discount/base)*100):0,discountAmount:discount,lateFeeAmount:late,
        otherCharges:Math.max(0,total-base+discount-late),total:N(data.total??total),received:N(data.received_amount??effectiveReceived),
        change:N(data.change_amount??Math.max(0,effectiveReceived-total)),method:(data.method as string)??method,
        items:((data.items as Row[])??[]).map(i=>({code:i.code as string,description:i.description as string,quantity:N(i.quantity??1),unitPrice:N(i.unitPrice??i.amount),amount:N(i.amount)})),
        verification,brand,status:(data.status as string)??'confirmed',cashier:auth.profile?.full_name,
      };
      const blob=await createReceiptPdfBlob(receipt);
      try{
        await uploadPaymentReceipt(result.id,result.receipt_number,blob,toReceiptBrandSnapshot(brand) as Record<string,unknown>);
        setMessage(`Pago contabilizado y recibo protegido: ${result.receipt_number}`);
      }catch{
        setError(`Pago contabilizado (${result.receipt_number}), pero el PDF no pudo adjuntarse. Podrá reimprimirlo.`);
      }
      await downloadReceiptPdf(receipt);
      resetEntry();
      await load();
    }catch(e){setError((e as Error).message);}
    finally{setPaying(false);}
  }

  async function reprintReceipt(payment:Row){
    try{
      const data=await getPaymentReceiptData(String(payment.id)) as Row;
      const historicalBrand=await resolveBrand((data.brand_snapshot??null) as ReceiptBrand|null);
      const verification=`${window.location.origin}/verificar-recibo/${data.verification_token}`;
      const receipt:ReceiptInput={
        number:data.receipt_number as string,subscriber:data.subscriber_name as string,subscriberCode:data.subscriber_code as string,
        date:new Date(data.created_at as string).toLocaleString('es-HN'),total:N(data.total),received:N(data.received_amount),change:N(data.change_amount),
        method:data.method as string,items:((data.items as Row[])??[]).map(i=>({description:i.description as string,amount:N(i.amount)})),
        verification,brand:historicalBrand,copy:true,status:data.status as string,cashier:auth.profile?.full_name,
      };
      await recordPaymentReprint(String(payment.id));
      await downloadReceiptPdf(receipt);
      setMessage('Reimpresión institucional generada y registrada en auditoría.');
    }catch(e){setError((e as Error).message);}
  }

  async function emailReceipt(payment:Row){
    if(!payment.subscriber_email){setError('El abonado no tiene correo registrado.');return;}
    try{
      await sendEmail({
        to:String(payment.subscriber_email),subject:`Recibo ${payment.receipt_number}`,
        html:`<p>Adjuntamos su recibo institucional <strong>${payment.receipt_number}</strong> por ${M(payment.total)}.</p><p>Verificación: ${window.location.origin}/verificar-recibo/${payment.verification_token}</p>`,
        payment_id:String(payment.id),receipt_path:payment.receipt_path as string,filename:`${payment.receipt_number}.pdf`,
      });
      setMessage('Recibo enviado por correo.');
    }catch(e){setError((e as Error).message);}
  }

  function whatsappReceipt(payment:Row){
    const phone=String(payment.subscriber_whatsapp??'').replace(/\D/g,'');
    if(!phone){setError('El abonado no tiene teléfono registrado.');return;}
    const number=phone.startsWith('504')?phone:`504${phone}`;
    const text=encodeURIComponent(`Recibo ${payment.receipt_number} por ${M(payment.total)}. Verifíquelo en ${window.location.origin}/verificar-recibo/${payment.verification_token}`);
    window.open(`https://wa.me/${number}?text=${text}`,'_blank','noopener');
    setMessage('Se abrió WhatsApp con el mensaje del recibo listo para enviar.');
  }

  async function confirmAction(){
    if(!action)return;
    try{
      if(action.type==='void')await voidPayment({payment_id:String(action.payment.id),reason:actionReason});
      else await refundPayment({payment_id:String(action.payment.id),amount:refundAmount,reason:actionReason});
      setMessage(action.type==='void'?'Pago anulado mediante documento de reverso.':'Devolución registrada y saldo reabierto.');
      setAction(null);setActionReason('');setRefundAmount(0);
      await load();
    }catch(e){setError((e as Error).message);}
  }

  return <main className="ja-page ja-pos">
    <header className="ja-page-head">
      <div><h1>Cobrar</h1><p>Del saldo pendiente al recibo, con contabilización y auditoría.</p></div>
      <div className="ja-pos-status">
        <Badge tone="neutral"><ShieldCheck size={12}/> Recibo v{brand.templateVersion??'2.0'}</Badge>
        <Link to="/caja" className={cn('ja-pos-cash',session&&'ja-pos-cash-open')}>
          <WalletMinimal size={14}/>{session?`Caja abierta · ${M(session.opening_amount)}`:'Caja cerrada'}
        </Link>
      </div>
    </header>

    <ol className="ja-pos-steps" aria-label="Progreso del cobro">
      {['Buscar','Seleccionar','Pago','Confirmar'].map((label,i)=>{
        const done=(i===0&&Boolean(selected))||(i===1&&allocations.length>0)||(i===2&&canConfirm);
        const current=(i===0&&!selected)||(i===1&&selected&&allocations.length===0)||(i===2&&allocations.length>0&&!canConfirm)||(i===3&&canConfirm);
        return <li key={label} className={cn('ja-pos-step',done&&'ja-pos-step-done',current&&'ja-pos-step-current')}>
          <span>{i+1}</span>{label}
        </li>;
      })}
    </ol>

    {error&&<div className="ja-banner ja-banner-warning" role="alert">{error}</div>}
    {message&&<div className="ja-banner ja-banner-info" role="status">{message}</div>}

    {!session&&<div className="ja-pos-hint">
      Para recibir pagos en efectivo primero <Link className="ja-link" to="/caja">abra una caja</Link>. Transferencias, depósitos y cheques no requieren caja.
    </div>}

    <div className="ja-pos-grid">
      <section className="ja-pos-col">
        <div className="ja-search-field">
          <Search size={15}/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Código, identidad o nombre del abonado" aria-label="Buscar abonado" onKeyDown={e=>{if(e.key==='Enter')void search();}}/>
          <Button size="sm" onClick={()=>void search()}>Buscar</Button>
        </div>
        <div className="ja-list">
          {results.map(r=>(
            <button key={String(r.id)} className={cn('ja-pos-account',selected?.id===r.id&&'ja-pos-account-on')} onClick={()=>{setSelected(r);setChosen({});setReceived(0);setCashAmount(0);}}>
              <span><strong>{String(r.full_name)}</strong><small className="ja-cell-sub">{String(r.code)}</small></span>
              <b>{M(r.total_balance)}</b>
            </button>
          ))}
          {results.length===0&&<EmptyState icon={<Search size={24}/>} title="Busque un abonado" description="Escriba y presione Buscar para ver saldos pendientes."/>}
        </div>
      </section>

      <section className="ja-pos-col ja-pos-entry">
        <div className="ja-pos-entry-head">
          <div><h2>Documento de cobro</h2><p>{selected?`${String(selected.code)} · ${String(selected.full_name)}`:'Seleccione un abonado'}</p></div>
          {selected&&<Badge tone="warning">Borrador</Badge>}
        </div>
        {!selected
          ?<EmptyState icon={<Receipt size={26}/>} title="Sin documento en proceso" description="Seleccione un abonado y las obligaciones a pagar."/>
          :<>
            <div className="ja-table-scroll">
              <table className="ja-table">
                <thead><tr><th>Aplicar</th><th>Concepto</th><th>Vence</th><th className="ja-td-num">Saldo</th></tr></thead>
                <tbody>
                  {obligations.map(o=>(
                    <tr key={String(o.id)}>
                      <td><input type="checkbox" checked={Boolean(chosen[String(o.id)])} onChange={e=>setChosen({...chosen,[String(o.id)]:e.target.checked})}/></td>
                      <td><strong>{String(o.description)}</strong><div className="ja-cell-sub">{String(o.connection_code??'Obligación general')}</div></td>
                      <td className="ja-cell-sub">{String(o.due_date)}</td>
                      <td className="ja-td-num">{M(o.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ja-pos-calc">
              <div className="ja-pos-fields">
                <label className="ja-field"><span className="ja-field-label">Método</span>
                  <select className="ja-control" value={method} onChange={e=>{const v=e.target.value as Method;setMethod(v);setReceived(v==='cash'?0:total);setCashAmount(0);}}>
                    <option value="cash">Efectivo</option><option value="transfer">Transferencia</option><option value="deposit">Depósito</option><option value="check">Cheque</option><option value="mixed">Mixto</option>
                  </select></label>
                {method!=='cash'&&method!=='mixed'&&<label className="ja-field"><span className="ja-field-label">Referencia</span>
                  <input className="ja-control" value={reference} onChange={e=>setReference(e.target.value)} placeholder="Número de operación"/></label>}
                {method==='mixed'&&<>
                  <label className="ja-field"><span className="ja-field-label">Parte en efectivo</span>
                    <input className="ja-control" type="number" min="0.01" max={Math.max(0,total-0.01)} step="0.01" value={cashAmount||''} onChange={e=>setCashAmount(Number(e.target.value))}/></label>
                  <label className="ja-field"><span className="ja-field-label">Segundo método</span>
                    <select className="ja-control" value={secondaryMethod} onChange={e=>setSecondaryMethod(e.target.value as typeof secondaryMethod)}>
                      <option value="transfer">Transferencia</option><option value="deposit">Depósito</option><option value="check">Cheque</option>
                    </select></label>
                  <label className="ja-field"><span className="ja-field-label">Parte no efectiva</span><input className="ja-control" readOnly value={secondaryAmount.toFixed(2)}/></label>
                  <label className="ja-field"><span className="ja-field-label">Referencia no efectiva</span><input className="ja-control" value={secondaryReference} onChange={e=>setSecondaryReference(e.target.value)}/></label>
                </>}
                {requiresCash&&<label className="ja-field"><span className="ja-field-label">Efectivo entregado</span>
                  <input className="ja-control" type="number" min={method==='mixed'?cashAmount:total} step="0.01" value={received||''} onChange={e=>setReceived(Number(e.target.value))}/></label>}
              </div>
              <aside className="ja-pos-summary">
                <div><span>Total</span><strong>{M(total)}</strong></div>
                <div><span>Recibido</span><b>{M(effectiveReceived)}</b></div>
                <div><span>Cambio</span><b>{M(Math.max(0,effectiveReceived-total))}</b></div>
                <div><span>Método</span><b>{METHOD[method]}</b></div>
                <Button full disabled={!canConfirm||paying} onClick={()=>void pay()}>
                  {paying?'Contabilizando…':<><CheckCircle2 size={16}/>Contabilizar y emitir recibo</>}
                </Button>
              </aside>
            </div>
          </>}
      </section>
    </div>

    <section className="ja-pos-recent">
      <div className="ja-pos-recent-head">
        <h2>Pagos recientes</h2>
        {session&&<Link className="ja-link" to="/caja">Ir a Caja para el arqueo y cierre</Link>}
      </div>
      <div className="ja-table-scroll">
        <table className="ja-table">
          <thead><tr><th>Recibo</th><th>Abonado</th><th>Fecha</th><th>Método</th><th className="ja-td-num">Total</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {loading&&payments.length===0
              ?Array.from({length:4}).map((_,i)=><tr key={i}><td colSpan={7}><Skeleton className="ja-row-skel"/></td></tr>)
              :payments.map(p=>(
                <tr key={String(p.id)}>
                  <td className="ja-mono">{String(p.receipt_number)}</td>
                  <td>{String(p.subscriber_name)}</td>
                  <td className="ja-cell-sub">{formatDateTime(p.created_at as string)}</td>
                  <td>{METHOD[String(p.method)]??String(p.method)}</td>
                  <td className="ja-td-num">{M(p.total)}</td>
                  <td><Badge tone={p.status==='confirmed'?'success':p.status==='voided'?'neutral':'warning'}>{p.status==='confirmed'?'Pagado':String(p.status)}</Badge></td>
                  <td>
                    <div className="ja-row-actions">
                      {Boolean(p.receipt_path)&&<button className="ja-icon-btn" title="Reimprimir" onClick={()=>void reprintReceipt(p)}><FileDown size={15}/></button>}
                      {Boolean(p.receipt_path)&&auth.has('communications.send')&&<button className="ja-icon-btn" title="Enviar por correo" onClick={()=>void emailReceipt(p)}><Mail size={15}/></button>}
                      {auth.has('communications.send')&&<button className="ja-icon-btn" title="Enviar por WhatsApp" onClick={()=>whatsappReceipt(p)}><MessageCircle size={15}/></button>}
                      {auth.has('payments.void')&&p.status==='confirmed'&&<>
                        <button className="ja-icon-btn" title="Devolución" onClick={()=>setAction({type:'refund',payment:p})}><RotateCcw size={15}/></button>
                        <button className="ja-icon-btn" title="Anular" onClick={()=>setAction({type:'void',payment:p})}><Ban size={15}/></button>
                      </>}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>

    {action&&<div className="ja-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setAction(null);}}>
      <div className="ja-dialog" role="dialog" aria-modal="true" aria-label={action.type==='void'?'Anular pago':'Registrar devolución'}>
        <div className="ja-dialog-head">
          <div><h3>{action.type==='void'?'Anular pago':'Registrar devolución'}</h3><p>Documento original: {String(action.payment.receipt_number)}</p></div>
          <button className="ja-icon-btn" onClick={()=>setAction(null)} aria-label="Cerrar"><X size={16}/></button>
        </div>
        <div className="ja-dialog-body">
          <div className="ja-banner ja-banner-info"><ShieldCheck size={15}/> El documento original no se elimina. El sistema genera el movimiento de reverso.</div>
          {action.type==='refund'&&<label className="ja-field"><span className="ja-field-label">Monto a devolver</span>
            <input className="ja-control" type="number" min="0.01" max={N(action.payment.total)} step="0.01" value={refundAmount||''} onChange={e=>setRefundAmount(Number(e.target.value))}/></label>}
          <label className="ja-field"><span className="ja-field-label">Motivo (mínimo 15 caracteres)</span>
            <textarea className="ja-control" value={actionReason} onChange={e=>setActionReason(e.target.value)}/></label>
        </div>
        <div className="ja-dialog-foot">
          <Button variant="secondary" onClick={()=>setAction(null)}>Cancelar</Button>
          <Button variant="danger" disabled={actionReason.trim().length<15||(action.type==='refund'&&(refundAmount<=0||refundAmount>N(action.payment.total)))} onClick={()=>void confirmAction()}>
            {action.type==='void'?'Contabilizar anulación':'Contabilizar devolución'}
          </Button>
        </div>
      </div>
    </div>}
  </main>;
}

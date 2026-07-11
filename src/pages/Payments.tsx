import {useCallback,useEffect,useMemo,useState} from 'react';
import {FileDown,Mail,MessageCircle,Search,X} from 'lucide-react';
import {closeCashSession,getActiveCashSession,listPayments,openCashSession,refundPayment,registerPayment,searchPayableAccounts,uploadPaymentReceipt,voidPayment,getPaymentReceiptData,recordPaymentReprint} from '../features/finance/service';
import {createReceiptPdfBlob,downloadReceiptPdf,toReceiptBrandSnapshot,type ReceiptBrand,type ReceiptInput} from '../features/finance/documents';
import {sendEmail,sendWhatsApp} from '../features/communications/service';
import {getOrganizationAssetUrl,getOrganizationSettings} from '../features/settings/service';
import {useAuth} from '../contexts/AuthContext';

type Row=Record<string,any>;
type PaymentComponent={method:'cash'|'transfer'|'deposit'|'check';amount:number;reference?:string};

async function assetDataUrl(path?:string|null){
  if(!path)return'';
  const url=await getOrganizationAssetUrl(path);
  if(!url)return'';
  const blob=await fetch(url).then(response=>response.blob());
  return await new Promise<string>((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result));
    reader.onerror=reject;
    reader.readAsDataURL(blob);
  });
}

export function Payments(){
 const auth=useAuth();
 const[q,setQ]=useState('');
 const[results,setResults]=useState<Row[]>([]);
 const[selected,setSelected]=useState<Row|null>(null);
 const[chosen,setChosen]=useState<Record<string,boolean>>({});
 const[session,setSession]=useState<Row|null>(null);
 const[payments,setPayments]=useState<Row[]>([]);
 const[received,setReceived]=useState(0);
 const[method,setMethod]=useState<'cash'|'transfer'|'deposit'|'check'|'mixed'>('cash');
 const[reference,setReference]=useState('');
 const[cashAmount,setCashAmount]=useState(0);
 const[secondaryMethod,setSecondaryMethod]=useState<'transfer'|'deposit'|'check'>('transfer');
 const[secondaryReference,setSecondaryReference]=useState('');
 const[error,setError]=useState('');
 const[message,setMessage]=useState('');
 const[brand,setBrand]=useState<ReceiptBrand>({templateVersion:'2.0'});
 const[action,setAction]=useState<{type:'void'|'refund';payment:Row}|null>(null);
 const[actionReason,setActionReason]=useState('');
 const[refundAmount,setRefundAmount]=useState(0);

 const resolveBrand=useCallback(async(snapshot?:ReceiptBrand|null):Promise<ReceiptBrand>=>{
   const source=snapshot&&Object.keys(snapshot).length?{...brand,...snapshot}:brand;
   const[logoDataUrl,signatureDataUrl,stampDataUrl]=await Promise.all([
     assetDataUrl(source.logoPath),assetDataUrl(source.signaturePath),assetDataUrl(source.stampPath)
   ]);
   return{...source,logoDataUrl,signatureDataUrl,stampDataUrl};
 },[brand]);

 const load=useCallback(async()=>{
   try{
     setSession(await getActiveCashSession());
     setPayments(await listPayments());
     const settings=await getOrganizationSettings();
     const next:ReceiptBrand={
       name:settings?.name,address:settings?.address,phone:settings?.phone,email:settings?.email,rtn:settings?.rtn,
       footer:settings?.receipt_footer,logoPath:settings?.logo_path,signaturePath:settings?.signature_path,
       stampPath:settings?.stamp_path,signatoryName:settings?.receipt_signatory_name,
       signatoryTitle:settings?.receipt_signatory_title,templateVersion:settings?.receipt_template_version??'2.0'
     };
     const[logoDataUrl,signatureDataUrl,stampDataUrl]=await Promise.all([
       assetDataUrl(next.logoPath),assetDataUrl(next.signaturePath),assetDataUrl(next.stampPath)
     ]);
     setBrand({...next,logoDataUrl,signatureDataUrl,stampDataUrl});
     setError('');
   }catch(e){setError((e as Error).message)}
 },[]);
 useEffect(()=>{void load()},[load]);

 const allocations=useMemo(()=>(selected?.obligations??[]).filter((obligation:Row)=>chosen[obligation.id]).map((obligation:Row)=>({obligation_id:obligation.id,amount:Number(obligation.balance)})),[selected,chosen]);
 const total=allocations.reduce((sum:number,item:{amount:number})=>sum+item.amount,0);
 const secondaryAmount=Math.max(0,total-cashAmount);
 const components=useMemo<PaymentComponent[]>(()=>{
   if(method==='mixed')return[
     {method:'cash',amount:cashAmount},
     {method:secondaryMethod,amount:secondaryAmount,reference:secondaryReference}
   ].filter(item=>item.amount>0) as PaymentComponent[];
   return[{method,amount:total,reference:method==='cash'?undefined:reference}] as PaymentComponent[];
 },[method,cashAmount,secondaryMethod,secondaryAmount,secondaryReference,total,reference]);

 async function search(){try{setResults(await searchPayableAccounts(q));setError('')}catch(e){setError((e as Error).message)}}

 async function pay(){
   if(!selected)return;
   try{
     const effectiveReceived=method==='cash'||method==='mixed'?received:total;
     const result=await registerPayment({subscriber_id:selected.id,cash_session_id:session?.id,method,received_amount:effectiveReceived,reference,components,allocations});
     const verification=`${window.location.origin}${result.verification_url}`;
     const receipt:ReceiptInput={
       number:result.receipt_number,subscriber:selected.full_name,subscriberCode:selected.code,
       date:new Date().toLocaleString('es-HN'),total,received:effectiveReceived,
       change:Math.max(0,effectiveReceived-total),method,
       items:(selected.obligations??[]).filter((obligation:Row)=>chosen[obligation.id]).map((obligation:Row)=>({description:obligation.description,amount:Number(obligation.balance)})),
       verification,brand,status:'confirmed',cashier:auth.profile?.full_name
     };
     const blob=await createReceiptPdfBlob(receipt);
     await uploadPaymentReceipt(result.id,result.receipt_number,blob,toReceiptBrandSnapshot(brand) as Record<string,unknown>);
     await downloadReceiptPdf(receipt);
     setMessage(`Pago confirmado y recibo institucional protegido: ${result.receipt_number}`);
     setSelected(null);setChosen({});setReceived(0);setReference('');setCashAmount(0);setSecondaryReference('');
     await load();
   }catch(e){setError((e as Error).message)}
 }

 async function open(){
   const amount=Number((document.getElementById('opening') as HTMLInputElement)?.value??0);
   const location=(document.getElementById('cash-location') as HTMLInputElement)?.value??'';
   try{await openCashSession({opening_amount:amount,location});await load()}catch(e){setError((e as Error).message)}
 }
 async function close(){
   if(!session)return;
   const amount=Number((document.getElementById('counted') as HTMLInputElement)?.value);
   if(!Number.isFinite(amount))return;
   try{await closeCashSession({session_id:session.id,counted_amount:amount});await load()}catch(e){setError((e as Error).message)}
 }

 async function emailReceipt(payment:Row){
   if(!payment.subscriber_email){setError('El abonado no tiene correo registrado.');return;}
   try{
     await sendEmail({to:payment.subscriber_email,subject:`Recibo ${payment.receipt_number}`,html:`<p>Adjuntamos su recibo institucional <strong>${payment.receipt_number}</strong> por L ${Number(payment.total).toFixed(2)}.</p><p>Puede verificarlo en ${window.location.origin}/verificar-recibo/${payment.verification_token}</p>`,payment_id:payment.id,receipt_path:payment.receipt_path,filename:`${payment.receipt_number}.pdf`});
     setMessage('Recibo enviado por correo.');
   }catch(e){setError((e as Error).message)}
 }

 async function reprintReceipt(payment:Row){
   try{
     const data=await getPaymentReceiptData(payment.id);
     const historicalBrand=await resolveBrand((data.brand_snapshot??null) as ReceiptBrand|null);
     const verification=`${window.location.origin}/verificar-recibo/${data.verification_token}`;
     const receipt:ReceiptInput={
       number:data.receipt_number,subscriber:data.subscriber_name,subscriberCode:data.subscriber_code,
       date:new Date(data.created_at).toLocaleString('es-HN'),total:Number(data.total),
       received:Number(data.received_amount),change:Number(data.change_amount),method:data.method,
       items:(data.items??[]).map((item:Row)=>({description:item.description,amount:Number(item.amount)})),
       verification,brand:historicalBrand,copy:true,status:data.status,cashier:auth.profile?.full_name
     };
     await recordPaymentReprint(payment.id);
     await downloadReceiptPdf(receipt);
     setMessage('Reimpresión institucional generada y registrada en auditoría.');
   }catch(e){setError((e as Error).message)}
 }

 async function whatsappReceipt(payment:Row){
   if(!payment.subscriber_whatsapp){setError('El abonado no tiene WhatsApp registrado.');return;}
   try{
     await sendWhatsApp({to:payment.subscriber_whatsapp,text:`Recibo ${payment.receipt_number} por L ${Number(payment.total).toFixed(2)}. Verificación: ${window.location.origin}/verificar-recibo/${payment.verification_token}`,payment_id:payment.id,receipt_path:payment.receipt_path,filename:`${payment.receipt_number}.pdf`});
     setMessage('Recibo enviado por WhatsApp.');
   }catch(e){setError((e as Error).message)}
 }

 async function confirmAction(){
   if(!action)return;
   try{
     if(action.type==='void')await voidPayment({payment_id:action.payment.id,reason:actionReason});
     else await refundPayment({payment_id:action.payment.id,amount:refundAmount,reason:actionReason});
     setMessage(action.type==='void'?'Pago anulado y deuda restaurada.':'Devolución registrada y deuda reabierta por el mismo valor.');
     setAction(null);setActionReason('');setRefundAmount(0);await load();
   }catch(e){setError((e as Error).message)}
 }

 const invalidMixed=method==='mixed'&&(cashAmount<=0||cashAmount>=total||!secondaryReference.trim());
 const requiresCash=method==='cash'||method==='mixed';
 const effectiveReceived=requiresCash?received:total;

 return <main className="content">
  <div className="titlebar"><div><h1>Pagos, recibos y caja</h1><p>Cobros aplicados a obligaciones, PDF institucional media carta y envío registrado.</p></div><span className="status-badge approved">Recibo v{brand.templateVersion??'2.0'}</span></div>
  {error&&<div className="error">{error}</div>}{message&&<div className="notice">{message}</div>}
  <section className="panel"><h2>{session?'Caja abierta':'Abrir caja'}</h2>{session?<div className="inline-form"><span>Apertura: L {Number(session.opening_amount).toFixed(2)}</span><input id="counted" type="number" min="0" step="0.01" placeholder="Efectivo contado"/><button onClick={()=>void close()}>Cerrar caja</button></div>:<div className="inline-form"><input id="opening" type="number" min="0" step="0.01" defaultValue="0" placeholder="Fondo inicial"/><input id="cash-location" placeholder="Punto de cobro"/><button onClick={()=>void open()}>Abrir caja</button></div>}</section>
  <div className="search"><Search/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Código, identidad o nombre" onKeyDown={e=>{if(e.key==='Enter')void search()}}/><button onClick={()=>void search()}>Buscar</button></div>
  <div className="subscriber-layout">
   <section className="panel"><h2>Abonados con saldo</h2>{results.map(result=><button className="list-button" key={result.id} onClick={()=>{setSelected(result);setChosen({});setReceived(0);setCashAmount(0)}}><strong>{result.code} — {result.full_name}</strong><small>Saldo: L {Number(result.total_balance).toFixed(2)}</small></button>)}</section>
   <section className="panel detail"><h2>Cobro</h2>{selected?<><p><strong>{selected.full_name}</strong></p><div className="table-scroll"><table><thead><tr><th></th><th>Concepto</th><th>Vence</th><th>Saldo</th></tr></thead><tbody>{(selected.obligations??[]).map((obligation:Row)=><tr key={obligation.id}><td><input type="checkbox" checked={Boolean(chosen[obligation.id])} onChange={e=>setChosen({...chosen,[obligation.id]:e.target.checked})}/></td><td>{obligation.description}</td><td>{obligation.due_date}</td><td>L {Number(obligation.balance).toFixed(2)}</td></tr>)}</tbody></table></div><div className="form-grid"><label>Método<select value={method} onChange={e=>{const value=e.target.value as typeof method;setMethod(value);setReceived(value==='cash'?0:total);setCashAmount(0)}}><option value="cash">Efectivo</option><option value="transfer">Transferencia</option><option value="deposit">Depósito</option><option value="check">Cheque</option><option value="mixed">Mixto</option></select></label>{method!=='cash'&&method!=='mixed'&&<label>Referencia<input value={reference} onChange={e=>setReference(e.target.value)}/></label>}<label>Total<input readOnly value={total.toFixed(2)}/></label>{method==='mixed'&&<><label>Parte en efectivo<input type="number" min="0.01" max={Math.max(0,total-0.01)} step="0.01" value={cashAmount||''} onChange={e=>setCashAmount(Number(e.target.value))}/></label><label>Segundo método<select value={secondaryMethod} onChange={e=>setSecondaryMethod(e.target.value as typeof secondaryMethod)}><option value="transfer">Transferencia</option><option value="deposit">Depósito</option><option value="check">Cheque</option></select></label><label>Parte no efectiva<input readOnly value={secondaryAmount.toFixed(2)}/></label><label>Referencia no efectiva<input value={secondaryReference} onChange={e=>setSecondaryReference(e.target.value)}/></label></>}{requiresCash&&<label>Efectivo entregado<input type="number" min={method==='mixed'?cashAmount:total} step="0.01" value={received||''} onChange={e=>setReceived(Number(e.target.value))}/></label>}<label>Cambio<input readOnly value={Math.max(0,effectiveReceived-total).toFixed(2)}/></label></div><button disabled={allocations.length===0||(requiresCash&&!session)||effectiveReceived<total||(method!=='cash'&&method!=='mixed'&&!reference.trim())||invalidMixed} onClick={()=>void pay()}><FileDown/>Confirmar y generar recibo</button></>:<div className="empty">Seleccione un abonado.</div>}</section>
  </div>
  <section className="panel" style={{marginTop:'1rem'}}><h2>Pagos recientes</h2><div className="table-scroll"><table><thead><tr><th>Recibo</th><th>Abonado</th><th>Fecha</th><th>Total</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{payments.map(payment=><tr key={payment.id}><td>{payment.receipt_number}</td><td>{payment.subscriber_name}</td><td>{new Date(payment.created_at).toLocaleString('es-HN')}</td><td>L {Number(payment.total).toFixed(2)}</td><td>{payment.status}</td><td><div className="actions">{payment.receipt_path&&<button className="compact outline" onClick={()=>void reprintReceipt(payment)}><FileDown size={15}/>Reimprimir</button>}{payment.receipt_path&&auth.has('communications.send')&&<><button className="compact outline" onClick={()=>void emailReceipt(payment)}><Mail size={15}/>Correo</button><button className="compact outline" onClick={()=>void whatsappReceipt(payment)}><MessageCircle size={15}/>WhatsApp</button></>}{auth.has('payments.void')&&payment.status==='confirmed'&&<><button className="compact outline" onClick={()=>setAction({type:'void',payment})}>Anular</button><button className="compact outline" onClick={()=>setAction({type:'refund',payment})}>Devolver</button></>}</div></td></tr>)}</tbody></table></div></section>
  {action&&<div className="modal"><div className="modal-card"><div className="titlebar"><h2>{action.type==='void'?'Anular pago':'Registrar devolución'}</h2><button className="outline" onClick={()=>setAction(null)}><X/>Cerrar</button></div><p>Recibo <strong>{action.payment.receipt_number}</strong> · L {Number(action.payment.total).toFixed(2)}</p>{action.type==='refund'&&<label>Monto a devolver<input type="number" min="0.01" max={Number(action.payment.total)} step="0.01" value={refundAmount||''} onChange={e=>setRefundAmount(Number(e.target.value))}/></label>}<label>Motivo obligatorio<textarea value={actionReason} onChange={e=>setActionReason(e.target.value)} placeholder="Explique el motivo con al menos 15 caracteres."/></label><button disabled={actionReason.trim().length<15||(action.type==='refund'&&(refundAmount<=0||refundAmount>Number(action.payment.total)))} onClick={()=>void confirmAction()}>{action.type==='void'?'Confirmar anulación':'Confirmar devolución'}</button></div></div>}
 </main>;
}

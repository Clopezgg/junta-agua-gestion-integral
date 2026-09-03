import {useCallback,useEffect,useMemo,useState} from 'react';
import {Ban,FileCheck2,RefreshCw,RotateCcw,Search,ShieldAlert} from 'lucide-react';
import {listFinancialDocuments,reverseFinancialDocument} from '../features/finance/documentsService';
import {useAuth} from '../contexts/AuthContext';
import {Badge,Button,Dialog,ErrorState} from '../design-system/primitives';
import {formatDateTime,formatMoney} from '../design-system/utils';

type Row=Record<string,any>;
const M=(v:unknown)=>formatMoney(typeof v==='number'||typeof v==='string'?v:0);
const typeLabels:Record<string,string>={annual_invoice:'Factura anual',payment_receipt:'Recibo de pago',credit_note:'Nota de crédito',void_document:'Documento de anulación',refund_document:'Documento de devolución',adjustment_document:'Documento de ajuste'};
const statusLabels:Record<string,string>={draft:'Borrador',posted:'Contabilizado',paid:'Pagado',partially_paid:'Pago parcial',voided:'Anulado',refunded:'Devuelto',partially_refunded:'Devolución parcial'};
const statusTone=(s:string):'success'|'danger'|'warning'|'neutral'=>['paid','posted'].includes(s)?'success':['voided','refunded'].includes(s)?'danger':['partially_paid','partially_refunded'].includes(s)?'warning':'neutral';

export function FinancialDocuments(){
  const auth=useAuth();
  const [query,setQuery]=useState('');
  const [type,setType]=useState('');
  const [status,setStatus]=useState('');
  const [rows,setRows]=useState<Row[]>([]);
  const [loading,setLoading]=useState(true);
  const [selected,setSelected]=useState<Row|null>(null);
  const [reversal,setReversal]=useState<{document:Row;type:'void_document'|'refund_document'|'credit_note'}|null>(null);
  const [reason,setReason]=useState('');
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');

  const load=useCallback(()=>{
    setLoading(true);
    void listFinancialDocuments(query,type,status,250)
      .then(r=>{setRows((r as Row[])??[]);setError('');})
      .catch(e=>setError((e as Error).message))
      .finally(()=>setLoading(false));
  },[query,type,status]);
  useEffect(()=>{void load();},[load]);

  const stats=useMemo(()=>({
    posted:rows.filter(r=>['posted','paid','partially_paid'].includes(r.status)).length,
    reversed:rows.filter(r=>['voided','refunded','partially_refunded'].includes(r.status)).length,
    total:rows.reduce((s,r)=>s+Number(r.total_amount??0),0),
  }),[rows]);

  async function confirmReversal(){
    if(!reversal||reason.trim().length<15)return;
    try{
      await reverseFinancialDocument(reversal.document.id,reason,reversal.type);
      setNotice('Documento de reverso creado y relacionado con el original.');
      setReversal(null);setReason('');setSelected(null);load();
    }catch(e){setError((e as Error).message);}
  }

  return <main className="ja-page">
    <header className="ja-page-head">
      <div><h1>Monitor de documentos financieros</h1><p>Vista operativa de contabilización, estados, relaciones y reversos documentales.</p></div>
      <button type="button" className="ja-tab" onClick={load}><RefreshCw size={14}/> Actualizar</button>
    </header>

    {notice&&<div className="ja-banner ja-banner-info">{notice}</div>}
    {error&&<ErrorState error={error} onRetry={load}/>}

    <div className="ja-home-metrics">
      <article className="ja-metric"><small>Contabilizados</small><strong>{stats.posted}</strong></article>
      <article className="ja-metric"><small>Reversados</small><strong>{stats.reversed}</strong></article>
      <article className="ja-metric"><small>Documentos visibles</small><strong>{rows.length}</strong></article>
      <article className="ja-metric"><small>Valor neto listado</small><strong>{M(stats.total)}</strong></article>
    </div>

    <div className="ja-toolbar">
      <span className="ja-search-field"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Número, abonado o código"/></span>
      <select className="ja-control" style={{maxWidth:'14rem'}} value={type} onChange={e=>setType(e.target.value)}>
        <option value="">Todos los tipos</option>{Object.entries(typeLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}
      </select>
      <select className="ja-control" style={{maxWidth:'14rem'}} value={status} onChange={e=>setStatus(e.target.value)}>
        <option value="">Todos los estados</option>{Object.entries(statusLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}
      </select>
    </div>

    <section className="ja-table-scroll">
      <table className="ja-table">
        <thead><tr><th>Documento</th><th>Tipo</th><th>Abonado</th><th>Pegue</th><th>Fecha</th><th className="ja-td-num">Base</th><th className="ja-td-num">Descuento</th><th className="ja-td-num">Total</th><th>Estado</th></tr></thead>
        <tbody>
          {rows.length===0
            ?<tr><td colSpan={9} className="ja-table-empty">{loading?'Cargando…':'No existen documentos con estos filtros.'}</td></tr>
            :rows.map(r=><tr key={r.id} className="ja-row-click" onClick={()=>setSelected(r)}>
              <td><strong>{r.document_number}</strong><span className="ja-cell-sub">{r.reversal_of_document_id?'Documento de reverso':'Documento original'}</span></td>
              <td>{typeLabels[r.document_type]??r.document_type}</td>
              <td>{r.subscriber_code} · {r.subscriber_name}</td>
              <td>{r.connection_code||'General'}</td>
              <td>{r.posting_date}</td>
              <td className="ja-td-num">{M(r.base_amount)}</td>
              <td className="ja-td-num">{M(r.discount_amount)}</td>
              <td className="ja-td-num">{M(r.total_amount)}</td>
              <td><Badge tone={statusTone(r.status)}>{statusLabels[r.status]??r.status}</Badge></td>
            </tr>)}
        </tbody>
      </table>
    </section>

    <Dialog open={!!selected} onClose={()=>setSelected(null)} title={selected?selected.document_number:''}
      description={selected?(typeLabels[selected.document_type]??selected.document_type):''}>
      {selected&&<div className="ja-pos-fields">
        <div className="ja-home-metrics">
          <article className="ja-metric"><small>Abonado</small><strong>{selected.subscriber_name}</strong><span>{selected.subscriber_code}</span></article>
          <article className="ja-metric"><small>Pegue</small><strong>{selected.connection_code||'General'}</strong></article>
          <article className="ja-metric"><small>Base</small><strong>{M(selected.base_amount)}</strong></article>
          <article className="ja-metric"><small>Descuento</small><strong>{M(selected.discount_amount)}</strong></article>
          <article className="ja-metric"><small>Mora</small><strong>{M(selected.late_fee_amount)}</strong></article>
          <article className="ja-metric"><small>Total</small><strong>{M(selected.total_amount)}</strong></article>
        </div>
        <div className="ja-banner ja-banner-info">
          <FileCheck2 size={14}/> Contabilización: {selected.created_at?formatDateTime(selected.created_at):'fecha no disponible'}.
          {selected.reversal_of_document_id&&' Reverso de un documento anterior: la relación se conserva y el original no se elimina.'}
        </div>
        {auth.has('payments.void')&&!['voided','refunded'].includes(selected.status)&&!selected.reversal_of_document_id&&
          <div className="ja-row-actions">
            <Button variant="secondary" onClick={()=>setReversal({document:selected,type:'credit_note'})}>Nota de crédito</Button>
            <Button variant="secondary" icon={<RotateCcw size={14}/>} onClick={()=>setReversal({document:selected,type:'refund_document'})}>Devolución</Button>
            <Button variant="danger" icon={<Ban size={14}/>} onClick={()=>setReversal({document:selected,type:'void_document'})}>Anular</Button>
          </div>}
      </div>}
    </Dialog>

    <Dialog open={!!reversal} onClose={()=>setReversal(null)} title={reversal?`Crear ${typeLabels[reversal.type]}`:''}
      description={reversal?`Documento original: ${reversal.document.document_number}`:''}>
      <form className="ja-pos-fields" onSubmit={e=>{e.preventDefault();void confirmReversal();}}>
        <div className="ja-banner ja-banner-info">
          <ShieldAlert size={14}/> El documento original no se eliminará. Se creará un documento relacionado con importes inversos y registro de auditoría.
        </div>
        <label className="ja-field"><span className="ja-field-label">Justificación obligatoria</span>
          <textarea className="ja-control" rows={3} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Explique el motivo con al menos 15 caracteres."/>
        </label>
        <Button type="submit" icon={<RotateCcw size={15}/>} disabled={reason.trim().length<15}>Contabilizar reverso</Button>
      </form>
    </Dialog>
  </main>;
}

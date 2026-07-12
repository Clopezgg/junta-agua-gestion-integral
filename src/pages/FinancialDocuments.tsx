import {useCallback,useEffect,useMemo,useState} from 'react';
import {Ban,FileCheck2,FileClock,FileDown,RefreshCw,RotateCcw,Search,ShieldAlert,X} from 'lucide-react';
import {listFinancialDocuments,reverseFinancialDocument} from '../features/finance/documentsService';
import {useAuth} from '../contexts/AuthContext';

type Row=Record<string,any>;
const money=(value:unknown)=>new Intl.NumberFormat('es-HN',{style:'currency',currency:'HNL'}).format(Number(value??0));
const typeLabels:Record<string,string>={annual_invoice:'Factura anual',payment_receipt:'Recibo de pago',credit_note:'Nota de crédito',void_document:'Documento de anulación',refund_document:'Documento de devolución',adjustment_document:'Documento de ajuste'};
const statusLabels:Record<string,string>={draft:'Borrador',posted:'Contabilizado',paid:'Pagado',partially_paid:'Pago parcial',voided:'Anulado',refunded:'Devuelto',partially_refunded:'Devolución parcial'};

export function FinancialDocuments(){
  const auth=useAuth();
  const[query,setQuery]=useState('');
  const[type,setType]=useState('');
  const[status,setStatus]=useState('');
  const[rows,setRows]=useState<Row[]>([]);
  const[selected,setSelected]=useState<Row|null>(null);
  const[reversal,setReversal]=useState<{document:Row;type:'void_document'|'refund_document'|'credit_note'}|null>(null);
  const[reason,setReason]=useState('');
  const[message,setMessage]=useState('');
  const[error,setError]=useState('');

  const load=useCallback(async()=>{try{setRows(await listFinancialDocuments(query,type,status,250));setError('')}catch(e){setError((e as Error).message)}},[query,type,status]);
  useEffect(()=>{void load()},[load]);
  const stats=useMemo(()=>({posted:rows.filter(row=>['posted','paid','partially_paid'].includes(row.status)).length,reversed:rows.filter(row=>['voided','refunded','partially_refunded'].includes(row.status)).length,total:rows.reduce((sum,row)=>sum+Number(row.total_amount??0),0)}),[rows]);

  async function confirmReversal(){if(!reversal)return;try{await reverseFinancialDocument(reversal.document.id,reason,reversal.type);setMessage('Documento de reverso creado y relacionado con el original.');setReversal(null);setReason('');setSelected(null);await load()}catch(e){setError((e as Error).message)}}

  return <main className="content">
    <div className="titlebar"><div><h1>Monitor de documentos financieros</h1><p>Vista operativa de contabilización, estados, relaciones y reversos documentales.</p></div><button className="outline" onClick={()=>void load()}><RefreshCw size={17}/>Actualizar</button></div>
    {error&&<div className="error">{error}</div>}{message&&<div className="notice">{message}</div>}
    <div className="cards document-stats"><article><FileCheck2 size={20}/><small>Contabilizados</small><h3>{stats.posted}</h3></article><article><RotateCcw size={20}/><small>Reversados</small><h3>{stats.reversed}</h3></article><article><FileClock size={20}/><small>Documentos visibles</small><h3>{rows.length}</h3></article><article><FileDown size={20}/><small>Valor neto listado</small><h3>{money(stats.total)}</h3></article></div>
    <section className="panel"><div className="document-filters"><div className="search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void load()}} placeholder="Número, abonado o código"/><button onClick={()=>void load()}><Search size={16}/>Buscar</button></div><select value={type} onChange={e=>setType(e.target.value)}><option value="">Todos los tipos</option>{Object.entries(typeLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select><select value={status} onChange={e=>setStatus(e.target.value)}><option value="">Todos los estados</option>{Object.entries(statusLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></div>
      <div className="table-scroll"><table><thead><tr><th>Documento</th><th>Tipo</th><th>Abonado</th><th>Pegue</th><th>Fecha</th><th>Base</th><th>Descuento</th><th>Total</th><th>Estado</th></tr></thead><tbody>{rows.map(row=><tr key={row.id} onClick={()=>setSelected(row)}><td><strong>{row.document_number}</strong><small>{row.reversal_of_document_id?'Documento de reverso':'Documento original'}</small></td><td>{typeLabels[row.document_type]??row.document_type}</td><td>{row.subscriber_code} · {row.subscriber_name}</td><td>{row.connection_code||'General'}</td><td>{row.posting_date}</td><td>{money(row.base_amount)}</td><td>{money(row.discount_amount)}</td><td>{money(row.total_amount)}</td><td><span className={`status-badge ${row.status==='paid'||row.status==='posted'?'approved':row.status==='voided'||row.status==='refunded'?'critical':'draft'}`}>{statusLabels[row.status]??row.status}</span></td></tr>)}</tbody></table></div>{rows.length===0&&<div className="empty">No existen documentos con estos filtros.</div>}
    </section>

    {selected&&<div className="modal"><div className="modal-card document-detail"><div className="titlebar"><div><h2>{selected.document_number}</h2><p>{typeLabels[selected.document_type]??selected.document_type}</p></div><button className="outline" onClick={()=>setSelected(null)}><X size={17}/>Cerrar</button></div><div className="document-detail-grid"><div><small>Abonado</small><strong>{selected.subscriber_name}</strong></div><div><small>Código</small><strong>{selected.subscriber_code}</strong></div><div><small>Pegue</small><strong>{selected.connection_code||'General'}</strong></div><div><small>Periodo</small><strong>{selected.fiscal_year??'-'}</strong></div><div><small>Base</small><strong>{money(selected.base_amount)}</strong></div><div><small>Descuento</small><strong>{money(selected.discount_amount)}</strong></div><div><small>Mora</small><strong>{money(selected.late_fee_amount)}</strong></div><div><small>Total</small><strong>{money(selected.total_amount)}</strong></div></div><section className="document-timeline"><h3>Trazabilidad</h3><div><FileCheck2 size={18}/><span><strong>Contabilización</strong><small>{selected.created_at?new Date(selected.created_at).toLocaleString('es-HN'):'Fecha no disponible'}</small></span></div>{selected.reversal_of_document_id&&<div><RotateCcw size={18}/><span><strong>Reverso de documento anterior</strong><small>La relación se conserva y el original no se elimina.</small></span></div>}</section>{auth.has('payments.void')&&!['voided','refunded'].includes(selected.status)&&!selected.reversal_of_document_id&&<div className="document-actions"><button className="outline" onClick={()=>setReversal({document:selected,type:'credit_note'})}><FileClock size={16}/>Nota de crédito</button><button className="outline" onClick={()=>setReversal({document:selected,type:'refund_document'})}><RotateCcw size={16}/>Devolución</button><button className="danger-button" onClick={()=>setReversal({document:selected,type:'void_document'})}><Ban size={16}/>Anular</button></div>}</div></div>}

    {reversal&&<div className="modal"><div className="modal-card"><div className="titlebar"><div><h2>Crear {typeLabels[reversal.type]}</h2><p>Documento original: {reversal.document.document_number}</p></div><button className="outline" onClick={()=>setReversal(null)}><X size={17}/>Cerrar</button></div><div className="warning-box"><ShieldAlert size={20}/><p>El documento original no se eliminará. Se creará un documento relacionado con importes inversos y registro de auditoría.</p></div><label>Justificación obligatoria<textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="Explique el motivo con al menos 15 caracteres."/></label><button disabled={reason.trim().length<15} onClick={()=>void confirmReversal()}><RotateCcw size={17}/>Contabilizar reverso</button></div></div>}
  </main>;
}

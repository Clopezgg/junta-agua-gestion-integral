import {useEffect,useRef,useState} from 'react';
import {Search,X} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {globalSearch,type GlobalSearchResult} from '../features/search/service';

export function GlobalSearch(){
  const navigate=useNavigate();
  const inputRef=useRef<HTMLInputElement>(null);
  const[q,setQ]=useState('');
  const[open,setOpen]=useState(false);
  const[loading,setLoading]=useState(false);
  const[results,setResults]=useState<GlobalSearchResult[]>([]);
  const[error,setError]=useState('');

  useEffect(()=>{
    const handler=(event:KeyboardEvent)=>{
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){
        event.preventDefault();
        setOpen(true);
        setTimeout(()=>inputRef.current?.focus(),0);
      }
      if(event.key==='Escape')setOpen(false);
    };
    window.addEventListener('keydown',handler);
    return()=>window.removeEventListener('keydown',handler);
  },[]);

  useEffect(()=>{
    const value=q.trim();
    if(value.length<2){setResults([]);setError('');return;}
    const timer=window.setTimeout(()=>{
      setLoading(true);
      void globalSearch(value)
        .then(setResults)
        .catch(e=>setError((e as Error).message))
        .finally(()=>setLoading(false));
    },250);
    return()=>window.clearTimeout(timer);
  },[q]);

  function choose(result:GlobalSearchResult){
    const recent=JSON.parse(localStorage.getItem('junta-recent-searches')||'[]') as GlobalSearchResult[];
    localStorage.setItem('junta-recent-searches',JSON.stringify([result,...recent.filter(x=>x.id!==result.id)].slice(0,8)));
    setOpen(false);
    setQ('');
    navigate(result.route,{state:{selectedId:result.id,searchLabel:result.label}});
  }

  return <>
    <button className="global-search-trigger outline" onClick={()=>{setOpen(true);setTimeout(()=>inputRef.current?.focus(),0)}}>
      <Search size={17}/><span>Buscar en todo el sistema</span><kbd>Ctrl K</kbd>
    </button>
    {open&&<div className="modal search-modal" role="dialog" aria-modal="true" aria-label="Búsqueda universal">
      <div className="search-command">
        <div className="search-command-input">
          <Search size={20}/>
          <input ref={inputRef} value={q} onChange={e=>setQ(e.target.value)} placeholder="Abonado, identidad, recibo, orden o activo…"/>
          <button className="icon-button outline" onClick={()=>setOpen(false)} aria-label="Cerrar"><X size={18}/></button>
        </div>
        {error&&<div className="error">{error}</div>}
        <div className="search-results">
          {loading&&<div className="empty">Buscando…</div>}
          {!loading&&q.trim().length<2&&<div className="empty">Escriba al menos dos caracteres.</div>}
          {!loading&&q.trim().length>=2&&results.length===0&&<div className="empty">No se encontraron coincidencias.</div>}
          {results.map(result=><button key={`${result.type}-${result.id}`} className="search-result" onClick={()=>choose(result)}>
            <span className={`result-type ${result.type}`}>{labelFor(result.type)}</span>
            <span><strong>{result.label}</strong><small>{result.subtitle}</small></span>
          </button>)}
        </div>
      </div>
    </div>}
  </>;
}

function labelFor(type:GlobalSearchResult['type']){
  return type==='subscriber'?'Abonado':type==='payment'?'Recibo':type==='work_order'?'Orden':'Activo';
}

import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import {useNavigate} from 'react-router-dom';
import {ArrowRight,CornerDownLeft,Search} from 'lucide-react';
import {useEscapeAndLock} from '../../design-system/primitives';
import {useAuth} from '../../contexts/AuthContext';
import {globalSearch,type GlobalSearchResult} from '../../features/search/service';
import {filterCommands,visibleCommands,type NavCommand} from './navCommands';

type CommandContextValue={open:()=>void;close:()=>void;isOpen:boolean};
const CommandContext=createContext<CommandContextValue|null>(null);

export function useCommandPalette():CommandContextValue{
  const ctx=useContext(CommandContext);
  if(!ctx)throw new Error('useCommandPalette debe usarse dentro de <CommandPaletteProvider>');
  return ctx;
}

const RECENT_KEY='ja-command-recent';
type Row=
  |{kind:'nav';item:NavCommand}
  |{kind:'entity';item:GlobalSearchResult};

function readRecent():GlobalSearchResult[]{
  try{return JSON.parse(localStorage.getItem(RECENT_KEY)||'[]') as GlobalSearchResult[];}catch{return [];}
}
function pushRecent(result:GlobalSearchResult){
  try{
    const next=[result,...readRecent().filter(x=>x.id!==result.id)].slice(0,6);
    localStorage.setItem(RECENT_KEY,JSON.stringify(next));
  }catch{/* almacenamiento no disponible */}
}

export function CommandPaletteProvider({children}:{children:ReactNode}){
  const [isOpen,setIsOpen]=useState(false);
  const open=useCallback(()=>setIsOpen(true),[]);
  const close=useCallback(()=>setIsOpen(false),[]);

  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setIsOpen(v=>!v);}
    };
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[]);

  const value=useMemo(()=>({open,close,isOpen}),[open,close,isOpen]);
  return <CommandContext.Provider value={value}>
    {children}
    {isOpen&&<CommandPalette onClose={close}/>}
  </CommandContext.Provider>;
}

function CommandPalette({onClose}:{onClose:()=>void}){
  const auth=useAuth();
  const navigate=useNavigate();
  const inputRef=useRef<HTMLInputElement>(null);
  const listRef=useRef<HTMLDivElement>(null);
  const [query,setQuery]=useState('');
  const [active,setActive]=useState(0);
  const [entities,setEntities]=useState<GlobalSearchResult[]>([]);
  const [searching,setSearching]=useState(false);
  const [searchError,setSearchError]=useState('');

  useEscapeAndLock(true,onClose);
  useEffect(()=>{inputRef.current?.focus();},[]);

  const commands=useMemo(()=>visibleCommands(auth.has),[auth.has]);
  const navMatches=useMemo(()=>filterCommands(commands,query).slice(0,8),[commands,query]);
  const recent=useMemo(()=>query.trim()?[]:readRecent(),[query]);

  useEffect(()=>{
    const q=query.trim();
    if(q.length<2){setEntities([]);setSearchError('');setSearching(false);return;}
    setSearching(true);
    const timer=window.setTimeout(()=>{
      void globalSearch(q)
        .then(r=>{setEntities(r);setSearchError('');})
        .catch(e=>{setEntities([]);setSearchError((e as Error).message);})
        .finally(()=>setSearching(false));
    },220);
    return()=>window.clearTimeout(timer);
  },[query]);

  const sections=useMemo(()=>{
    const s:{title:string;rows:Row[]}[]=[];
    if(navMatches.length)s.push({title:'Ir a',rows:navMatches.map(item=>({kind:'nav',item}))});
    if(entities.length)s.push({title:'Resultados',rows:entities.map(item=>({kind:'entity',item}))});
    if(recent.length)s.push({title:'Recientes',rows:recent.map(item=>({kind:'entity',item}))});
    return s;
  },[navMatches,entities,recent]);
  const rows:Row[]=useMemo(()=>sections.flatMap(s=>s.rows),[sections]);

  useEffect(()=>{setActive(0);},[query,entities.length]);
  useEffect(()=>{
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({block:'nearest'});
  },[active]);

  function activate(row:Row|undefined){
    if(!row)return;
    if(row.kind==='nav'){onClose();navigate(row.item.to);return;}
    pushRecent(row.item);
    onClose();
    navigate(row.item.route,{state:{selectedId:row.item.id,searchLabel:row.item.label}});
  }

  function onKeyDown(e:React.KeyboardEvent){
    if(e.key==='ArrowDown'){e.preventDefault();setActive(a=>Math.min(a+1,rows.length-1));}
    else if(e.key==='ArrowUp'){e.preventDefault();setActive(a=>Math.max(a-1,0));}
    else if(e.key==='Enter'){e.preventDefault();activate(rows[active]);}
  }

  const showEmpty=!searching&&query.trim().length>=2&&rows.length===0&&!searchError;

  return <div className="ja-cmdk-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div className="ja-cmdk" role="dialog" aria-modal="true" aria-label="Búsqueda y navegación">
      <div className="ja-cmdk-input">
        <Search size={18} aria-hidden/>
        <input
          ref={inputRef}
          value={query}
          onChange={e=>setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Buscar abonado, recibo, orden… o ir a una sección"
          aria-label="Buscar"
          aria-activedescendant={rows.length?`ja-cmdk-row-${active}`:undefined}
          role="combobox"
          aria-expanded={rows.length>0}
          aria-controls="ja-cmdk-list"
        />
        <kbd>Esc</kbd>
      </div>

      <div className="ja-cmdk-list" id="ja-cmdk-list" role="listbox" ref={listRef}>
        {sections.map(section=>{
          let base=0;
          for(const s of sections){if(s===section)break;base+=s.rows.length;}
          return <div key={section.title}>
            <div className="ja-cmdk-group">{section.title}</div>
            {section.rows.map((row,i)=>{
              const idx=base+i;
              const selected=idx===active;
              return <button
                key={row.kind==='nav'?`nav-${row.item.id}`:`ent-${row.item.type}-${row.item.id}`}
                id={`ja-cmdk-row-${idx}`}
                data-idx={idx}
                role="option"
                aria-selected={selected}
                className={`ja-cmdk-row${selected?' ja-cmdk-row-active':''}`}
                onMouseEnter={()=>setActive(idx)}
                onClick={()=>activate(row)}
              >
                {row.kind==='nav'
                  ?<><ArrowRight size={15}/><span className="ja-cmdk-row-label">{row.item.label}</span><span className="ja-cmdk-row-hint">{row.item.group}</span></>
                  :<><span className={`ja-cmdk-tag ja-cmdk-tag-${row.item.type}`}>{tagLabel(row.item.type)}</span><span className="ja-cmdk-row-label">{row.item.label}</span><span className="ja-cmdk-row-hint">{row.item.subtitle}</span></>}
              </button>;
            })}
          </div>;
        })}
        {searching&&<div className="ja-cmdk-status">Buscando…</div>}
        {searchError&&<div className="ja-cmdk-status ja-cmdk-status-error">{searchError}</div>}
        {showEmpty&&<div className="ja-cmdk-status">Sin coincidencias para “{query.trim()}”.</div>}
        {!query.trim()&&rows.length===0&&<div className="ja-cmdk-status">Escriba para buscar o navegar.</div>}
      </div>

      <div className="ja-cmdk-foot">
        <span><CornerDownLeft size={13}/> abrir</span>
        <span>↑ ↓ moverse</span>
      </div>
    </div>
  </div>;
}

function tagLabel(type:GlobalSearchResult['type']){
  return type==='subscriber'?'Abonado':type==='payment'?'Recibo':type==='work_order'?'Orden':'Activo';
}

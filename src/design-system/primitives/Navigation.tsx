import {ChevronLeft,ChevronRight} from 'lucide-react';
import type {ReactNode} from 'react';
import {cn} from '../utils';

type Tab= {value:string;label:ReactNode};
export function Tabs({tabs,value,onChange,className}:{tabs:ReadonlyArray<Tab>;value:string;onChange:(value:string)=>void;className?:string}){
  return <div className={cn('ja-tabs',className)} role="tablist" aria-label="Secciones">
    {tabs.map(tab=><button key={tab.value} role="tab" type="button" aria-selected={tab.value===value}
      className={tab.value===value?'ja-tab-active':''} onClick={()=>onChange(tab.value)}>{tab.label}</button>)}
  </div>;
}

type Crumb= {label:string;href?:string};
export function Breadcrumb({items}:{items:ReadonlyArray<Crumb>}){
  return <nav className="ja-breadcrumb" aria-label="Ruta actual">
    {items.map((crumb,i)=>(
      <span key={`${crumb.label}-${i}`} className="ja-crumb">
        {i>0&&<ChevronRight size={13} aria-hidden/>}
        {crumb.href?<a href={crumb.href}>{crumb.label}</a>:<span aria-current="page">{crumb.label}</span>}
      </span>
    ))}
  </nav>;
}

export function Pagination({page,totalPages,onPage,count,label='elementos'}:{page:number;totalPages:number;onPage:(page:number)=>void;count?:number;label?:string}){
  if(totalPages<=1)return <span className="ja-pagination-meta">{count!=null?`${count} ${label}`:''}</span>;
  return <div className="ja-pagination">
    <button type="button" className="ja-pagination-btn" disabled={page<=1} onClick={()=>onPage(page-1)} aria-label="Página anterior"><ChevronLeft size={16}/></button>
    <span>Página <strong>{page}</strong> de {totalPages}</span>
    <button type="button" className="ja-pagination-btn" disabled={page>=totalPages} onClick={()=>onPage(page+1)} aria-label="Página siguiente"><ChevronRight size={16}/></button>
  </div>;
}
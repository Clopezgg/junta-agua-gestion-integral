import type {ReactNode} from 'react';
import {AlertTriangle,Inbox,Loader2,RefreshCw,SearchX} from 'lucide-react';
import {cn} from '../utils';

export type BadgeTone='neutral'|'success'|'warning'|'danger'|'info'|'brand';
const toneClass:Record<BadgeTone,string>={
  neutral:'ja-badge-neutral',
  success:'ja-badge-success',
  warning:'ja-badge-warning',
  danger:'ja-badge-danger',
  info:'ja-badge-info',
  brand:'ja-badge-brand',
};
export function Badge({tone='neutral',children,className}:{tone?:BadgeTone;children:ReactNode;className?:string}){
  return <span className={cn('ja-badge',toneClass[tone],className)}>{children}</span>;
}

const statusMap:Record<string,BadgeTone>={
  active:'success',approved:'success',accepted:'success',completed:'success',synced:'success',verified:'success',
  pending:'warning',in_progress:'warning',observada:'warning',fair:'warning',captured:'info',
  inactive:'neutral',draft:'neutral',suspended:'neutral',cancelled:'neutral',rejected:'danger',critical:'danger',
};
export function StatusBadge({status,children}:{status:string;children?:ReactNode}){
  const key=status.toLowerCase().replace(/\s+/g,'_');
  return <Badge tone={statusMap[key]??'neutral'}>{children??status}</Badge>;
}

export function Spinner({size=18,label}:{size?:number;label?:string}){
  return <span className="ja-inline-flex ja-gap-2"><Loader2 className="ja-spin" size={size} aria-hidden/>{label&&<span>{label}</span>}</span>;
}

export function Skeleton({className}:{className?:string}){
  return <div className={cn('ja-skeleton',className)} aria-hidden/>;
}

export function EmptyState({icon,title,description,action,className}:{icon?:ReactNode;title:string;description?:string;action?:ReactNode;className?:string}){
  return <div className={cn('ja-empty',className)}>
    <div className="ja-empty-icon">{icon??<Inbox size={26}/>}</div>
    <strong>{title}</strong>
    {description&&<p>{description}</p>}
    {action&&<div className="ja-empty-action">{action}</div>}
  </div>;
}

export function ErrorState({title='No se pudo completar la operación',description,error,onRetry,className}:{title?:string;description?:string;error?:string;onRetry?:()=>void;className?:string}){
  return <div className={cn('ja-error-state',className)} role="alert">
    <div className="ja-empty-icon"><AlertTriangle size={26}/></div>
    <strong>{title}</strong>
    {description&&<p>{description}</p>}
    {error&&<code className="ja-error-code">{error}</code>}
    {onRetry&&<div className="ja-empty-action"><button className="ja-btn ja-btn-outline" type="button" onClick={onRetry}><RefreshCw size={15}/>Reintentar</button></div>}
  </div>;
}

export function NoSearchResults({query,onClear}:{query?:string;onClear?:()=>void}){
  return <EmptyState icon={<SearchX size={26}/>} title="Sin coincidencias"
    description={query?`Nada coincide con “${query}”. Revise la ortografía o pruebe otro término.`:'No hay resultados para esta búsqueda.'}
    action={onClear?<button className="ja-btn ja-btn-ghost" type="button" onClick={onClear}>Limpiar filtros</button>:undefined}/>;
}

export function Metric({label,value,detail,tone}:{label:string;value:ReactNode;detail?:ReactNode;tone?:'success'|'warning'|'danger'|'info'}){
  return <div className={cn('ja-metric',tone&&`ja-metric-${tone}`)}>
    <small>{label}</small>
    <strong>{value}</strong>
    {detail&&<span>{detail}</span>}
  </div>;
}
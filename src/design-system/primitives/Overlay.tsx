import {useEffect,useRef,type ReactNode} from 'react';
import {X} from 'lucide-react';
import {cn} from '../utils';
import {IconButton} from './Button';

type OverlayProps={
  open:boolean;
  onClose:()=>void;
  title?:ReactNode;
  description?:ReactNode;
  children:ReactNode;
  footer?:ReactNode;
  className?:string;
};

export function useEscapeAndLock(open:boolean,onClose:()=>void){
  const onCloseRef=useRef(onClose);
  onCloseRef.current=onClose;
  useEffect(()=>{
    if(!open)return;
    const handler=(event:KeyboardEvent)=>{if(event.key==='Escape')onCloseRef.current()};
    document.addEventListener('keydown',handler);
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    return()=>{document.removeEventListener('keydown',handler);document.body.style.overflow=previousOverflow};
  },[open]);
}

export function Dialog({open,onClose,title,description,children,footer,className}:OverlayProps){
  useEscapeAndLock(open,onClose);
  if(!open)return null;
  return <div className="ja-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <div className="ja-dialog" role="dialog" aria-modal="true" aria-label={typeof title==='string'?title:undefined}>
      <div className="ja-dialog-head">
        <div>{title&&<h3>{title}</h3>}{description&&<p>{description}</p>}</div>
        <IconButton label="Cerrar" variant="ghost" onClick={onClose}><X size={18}/></IconButton>
      </div>
      <div className={cn('ja-dialog-body',className)}>{children}</div>
      {footer&&<div className="ja-dialog-foot">{footer}</div>}
    </div>
  </div>;
}

export function Drawer({open,onClose,title,description,children,footer,width=480}:OverlayProps&{width?:number}){
  useEscapeAndLock(open,onClose);
  if(!open)return null;
  return <div className="ja-drawer-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <div className="ja-drawer" role="dialog" aria-modal="true" aria-label={typeof title==='string'?title:undefined} style={{width:`min(${width}px,100vw)`}}>
      <div className="ja-dialog-head">
        <div>{title&&<h3>{title}</h3>}{description&&<p>{description}</p>}</div>
        <IconButton label="Cerrar" variant="ghost" onClick={onClose}><X size={18}/></IconButton>
      </div>
      <div className="ja-dialog-body">{children}</div>
      {footer&&<div className="ja-dialog-foot">{footer}</div>}
    </div>
  </div>;
}
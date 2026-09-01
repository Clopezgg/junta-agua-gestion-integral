import {createContext,useCallback,useContext,useMemo,useState,type ReactNode} from 'react';
import {CheckCircle2,Info,XCircle} from 'lucide-react';
import {cn} from '../utils';

type ToastTone='success'|'danger'|'info';
type Toast={id:number;tone:ToastTone;title:string;description?:string};

const ToastC=createContext<(tone:ToastTone,title:string,description?:string)=>void>(()=>{});
export const useToast=()=>useContext(ToastC);

export function ToastProvider({children}:{children:ReactNode}){
  const[toasts,setToasts]=useState<Toast[]>([]);
  const push=useCallback((tone:ToastTone,title:string,description?:string)=>{
    const id=Date.now()+Math.random();
    setToasts(list=>[...list,{id,tone,title,description}]);
    window.setTimeout(()=>setToasts(list=>list.filter(t=>t.id!==id)),4200);
  },[]);
  const value=useMemo(()=>push,[push]);
  return <ToastC.Provider value={value}>
    {children}
    <div className="ja-toast-region" role="region" aria-label="Notificaciones">
      {toasts.map(t=>{
        const Icon=t.tone==='success'?CheckCircle2:t.tone==='danger'?XCircle:Info;
        return <div key={t.id} className={cn('ja-toast',`ja-toast-${t.tone}`)} role="status">
          <Icon size={18} aria-hidden/><div><strong>{t.title}</strong>{t.description&&<p>{t.description}</p>}</div>
        </div>;
      })}
    </div>
  </ToastC.Provider>;
}
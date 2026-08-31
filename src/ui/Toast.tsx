import {createContext,useCallback,useContext,useState,type ReactNode} from 'react';
import {CheckCircle2,Info,TriangleAlert,XCircle,X} from 'lucide-react';

export type ToastTone='success'|'error'|'warning'|'info';
export type ToastItem={id:number;tone:ToastTone;title:string;message?:string};
type ToastApi={push:(tone:ToastTone,title:string,message?:string)=>void};
const Ctx=createContext<ToastApi|null>(null);

export function ToastProvider({children}:{children:ReactNode}){
 const[items,setItems]=useState<ToastItem[]>([]);
 const push=useCallback((tone:ToastTone,title:string,message?:string)=>{
  const id=Date.now()+Math.random();
  setItems(list=>[...list,{id,tone,title,message}]);
  window.setTimeout(()=>setItems(list=>list.filter(x=>x.id!==id)),5200);
 },[]);
 const dismiss=(id:number)=>setItems(list=>list.filter(x=>x.id!==id));
 const icons:Record<ToastTone,ReactNode>={
  success:<CheckCircle2 size={18} color="var(--success-600)"/>,
  error:<XCircle size={18} color="var(--danger-600)"/>,
  warning:<TriangleAlert size={18} color="var(--warning-600)"/>,
  info:<Info size={18} color="var(--brand-600)"/>
 };
 return <Ctx.Provider value={{push}}>
  {children}
  <div className="toast-region" aria-live="polite">{items.map(item=>(
   <div className={`toast ${item.tone}`} key={item.id} role="status">
    {icons[item.tone]}
    <div><strong>{item.title}</strong>{item.message&&<p>{item.message}</p>}</div>
    <button className="icon-close" onClick={()=>dismiss(item.id)} aria-label="Cerrar notificación"><X size={14}/></button>
   </div>
  ))}</div>
 </Ctx.Provider>;
}

export function useToast():ToastApi{
 const api=useContext(Ctx);
 if(!api)throw new Error('useToast requiere ToastProvider');
 return api;
}
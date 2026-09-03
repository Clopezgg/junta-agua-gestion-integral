import {useEffect,useRef,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {AlertTriangle,Bell,BellRing,ChevronRight,Info} from 'lucide-react';
import {useOnClickOutside} from '../design-system/hooks';
import {EmptyState,Spinner} from '../design-system/primitives';
import {loadNotifications,type AppNotification} from '../features/notifications/service';

const icon=(s:AppNotification['severity'])=>s==='info'
  ?<Info size={15}/>
  :<AlertTriangle size={15}/>;

export function NotificationsMenu(){
  const navigate=useNavigate();
  const[open,setOpen]=useState(false);
  const[items,setItems]=useState<AppNotification[]|null>(null);
  const ref=useRef<HTMLDivElement>(null);
  useOnClickOutside(ref,()=>setOpen(false));

  useEffect(()=>{
    let live=true;
    void loadNotifications().then(n=>{if(live)setItems(n)}).catch(()=>{if(live)setItems([])});
    return()=>{live=false};
  },[]);

  const count=items?.length??0;
  const hasUrgent=items?.some(i=>i.severity==='danger')??false;

  return <div className="ja-popover" ref={ref}>
    <button type="button" className="ja-icon-btn" aria-label={count?`Notificaciones (${count})`:'Notificaciones'} aria-haspopup="menu" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>
      {open||count?<BellRing size={18}/>:<Bell size={18}/>}
      {count>0&&<span className={`ja-notif-dot${hasUrgent?' ja-notif-dot-urgent':''}`} aria-hidden>{count>9?'9+':count}</span>}
    </button>
    {open&&<div className="ja-menu ja-menu-notifications" role="menu">
      <div className="ja-menu-title">Requieren atención</div>
      {items===null&&<div className="ja-menu-loading"><Spinner label="Cargando…"/></div>}
      {items!==null&&count===0&&<EmptyState title="Todo al día" description="No hay avisos pendientes para su rol."/>}
      {items?.map(item=>(
        <button key={item.id} type="button" role="menuitem" className={`ja-notif-item ja-notif-${item.severity}`}
          onClick={()=>{setOpen(false);void navigate(item.to)}}>
          <span className="ja-notif-icon">{icon(item.severity)}</span>
          <span className="ja-notif-body"><strong>{item.title}</strong><small>{item.detail}</small></span>
          <ChevronRight size={15}/>
        </button>
      ))}
    </div>}
  </div>;
}

import {useRef,useState} from 'react';
import {Bell,BellRing} from 'lucide-react';
import {useAuth} from '../contexts/AuthContext';
import {useOnClickOutside} from '../design-system/hooks';
import {EmptyState} from '../design-system/primitives';

export function NotificationsMenu(){
  const auth=useAuth();
  const[open,setOpen]=useState(false);
  const ref=useRef<HTMLDivElement>(null);
  useOnClickOutside(ref,()=>setOpen(false));
  return <div className="ja-popover" ref={ref}>
    <button type="button" className="ja-icon-btn" aria-label="Notificaciones" aria-haspopup="menu" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>
      {open?<BellRing size={18}/>:<Bell size={18}/>}
    </button>
    {open&&<div className="ja-menu ja-menu-notifications" role="menu">
      <div className="ja-menu-title">Notificaciones</div>
      <EmptyState title="Sin notificaciones pendientes" description={`Cuando haya avisos para ${auth.profile?.username??'su cuenta'} aparecerán aquí.`}/>
    </div>}
  </div>;
}
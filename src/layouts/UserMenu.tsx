import {useRef,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {LogOut,Settings,ShieldCheck,UserCircle2} from 'lucide-react';
import {useAuth} from '../contexts/AuthContext';
import {useOnClickOutside} from '../design-system/hooks';

export function UserMenu({name,initials}:{name:string;initials:string}){
  const auth=useAuth();
  const navigate=useNavigate();
  const[open,setOpen]=useState(false);
  const ref=useRef<HTMLDivElement>(null);
  useOnClickOutside(ref,()=>setOpen(false));
  return <div className="ja-popover" ref={ref}>
    <button type="button" className="ja-user-chip" aria-haspopup="menu" aria-expanded={open} aria-label={`Menú de ${name}`} onClick={()=>setOpen(v=>!v)}>
      <span className="ja-avatar" aria-hidden>{initials}</span>
      <span><strong>{name}</strong><small>{auth.profile?.username??''}</small></span>
    </button>
    {open&&<div className="ja-menu" role="menu">
      <div className="ja-menu-item" role="menuitem"><UserCircle2 size={16}/>{name}</div>
      <div className="ja-menu-sep"/>
      <button type="button" className="ja-menu-item" role="menuitem" onClick={()=>{setOpen(false);void navigate('/configuracion')}}><Settings size={16}/>Configuración</button>
      <button type="button" className="ja-menu-item" role="menuitem" onClick={()=>{setOpen(false);void navigate('/seguridad')}}><ShieldCheck size={16}/>Seguridad</button>
      <div className="ja-menu-sep"/>
      <button type="button" className="ja-menu-item ja-menu-danger" role="menuitem" onClick={()=>void auth.signOut()}><LogOut size={16}/>Cerrar sesión</button>
    </div>}
  </div>;
}
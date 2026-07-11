import {useCallback,useEffect,useState} from 'react';
import {UserPlus} from 'lucide-react';
import {inviteUser,listRoles,listUsers,setUserStatus} from '../features/users/service';
type Row=Record<string,any>;
export function Users(){
 const [users,setUsers]=useState<Row[]>([]);const [roles,setRoles]=useState<Row[]>([]);const [error,setError]=useState('');const [message,setMessage]=useState('');
 const [form,setForm]=useState({email:'',full_name:'',username:'',role_id:''});
 const load=useCallback(async()=>{try{setUsers(await listUsers());setRoles(await listRoles());setError('')}catch(e){setError((e as Error).message)}},[]);
 useEffect(()=>{void load()},[load]);
 async function submit(e:React.FormEvent){e.preventDefault();try{await inviteUser(form);setMessage('Invitación enviada. El usuario deberá definir su contraseña y activar TOTP.');setForm({email:'',full_name:'',username:'',role_id:''});await load()}catch(err){setError((err as Error).message)}}
 return <main className="content"><div className="titlebar"><div><h1>Usuarios y accesos</h1><p>Solo el administrador crea cuentas. Cada usuario activa su propia contraseña y autenticador.</p></div></div>{error&&<div className="error">{error}</div>}{message&&<div className="notice">{message}</div>}
 <div className="subscriber-layout"><section className="panel"><h2>Usuarios registrados</h2><div className="table-scroll"><table><thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{users.map(u=><tr key={u.id}><td>{u.full_name}</td><td>{u.username}</td><td>{(u.roles??[]).map((r:Row)=>r.name).join(', ')}</td><td>{u.status}</td><td><select value={u.status} onChange={async e=>{await setUserStatus(u.id,e.target.value as any);await load()}}><option value="active">Activo</option><option value="inactive">Inactivo</option><option value="blocked">Bloqueado</option></select></td></tr>)}</tbody></table></div></section>
 <section className="panel"><h2><UserPlus/> Crear usuario</h2><form className="subform" onSubmit={submit}><label>Nombre completo<input required minLength={3} value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/></label><label>Correo<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>Usuario<input required minLength={3} value={form.username} onChange={e=>setForm({...form,username:e.target.value})}/></label><label>Rol<select required value={form.role_id} onChange={e=>setForm({...form,role_id:e.target.value})}><option value="">Seleccione</option>{roles.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label><button>Enviar invitación segura</button></form></section></div></main>;
}

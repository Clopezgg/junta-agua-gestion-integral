import {useCallback,useEffect,useMemo,useState} from 'react';
import {LockKeyhole,RefreshCw,Shield,UserPlus} from 'lucide-react';
import {inviteUser,listRoles,listUsers,setUserStatus} from '../features/users/service';
import {Badge,Button,Dialog,ErrorState,Skeleton} from '../design-system/primitives';

type Row=Record<string,any>;
const STATUS_LABEL:Record<string,string>={active:'Activo',blocked:'Bloqueado',inactive:'Inactivo'};

export function Users(){
  const [users,setUsers]=useState<Row[]>([]);
  const [roles,setRoles]=useState<Row[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [open,setOpen]=useState(false);
  const [form,setForm]=useState({email:'',full_name:'',username:'',role_id:''});

  const load=useCallback(()=>{
    setLoading(true);
    void Promise.all([listUsers(),listRoles()])
      .then(([u,r])=>{setUsers((u as Row[])??[]);setRoles((r as Row[])??[]);setError('');})
      .catch(e=>setError((e as Error).message))
      .finally(()=>setLoading(false));
  },[]);
  useEffect(()=>{void load();},[load]);

  const stats=useMemo(()=>({
    active:users.filter(u=>u.status==='active').length,
    blocked:users.filter(u=>u.status==='blocked').length,
    total:users.length,
  }),[users]);

  async function submit(e:React.FormEvent){
    e.preventDefault();
    try{
      await inviteUser(form);
      setForm({email:'',full_name:'',username:'',role_id:''});
      setOpen(false);setNotice('Invitación enviada. La persona deberá definir su contraseña y activar TOTP.');load();
    }catch(err){setError((err as Error).message);}
  }
  async function changeStatus(user:Row,status:'active'|'inactive'|'blocked'){
    try{await setUserStatus(user.id,status);setNotice(`Estado de ${user.full_name} actualizado.`);load();}
    catch(e){setError((e as Error).message);}
  }

  return <main className="ja-page">
    <header className="ja-page-head">
      <div><h1>Usuarios y control de acceso</h1><p>Cuentas individuales, roles, MFA y protección especial del administrador principal.</p></div>
      <Button icon={<UserPlus size={15}/>} onClick={()=>setOpen(true)}>Crear usuario</Button>
      <button type="button" className="ja-tab" onClick={load}><RefreshCw size={14}/> Actualizar</button>
    </header>

    {notice&&<div className="ja-banner ja-banner-info">{notice}</div>}
    {error&&<ErrorState error={error} onRetry={load}/>}
    {loading&&users.length===0&&<Skeleton className="ja-360-skel"/>}

    {!loading&&<>
      <div className="ja-home-metrics">
        <article className="ja-metric"><small>Usuarios</small><strong>{stats.total}</strong></article>
        <article className="ja-metric"><small>Activos</small><strong>{stats.active}</strong></article>
        <article className="ja-metric"><small>Bloqueados</small><strong>{stats.blocked}</strong></article>
      </div>

      <section className="ja-table-scroll">
        <div className="ja-list-heading">Usuarios registrados</div>
        <table className="ja-table">
          <thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Estado</th><th>Control</th></tr></thead>
          <tbody>
            {users.map(user=>{
              const superadmin=(user.roles??[]).some((role:Row)=>role.code==='superadmin');
              return <tr key={user.id}>
                <td><strong>{user.full_name}</strong><span className="ja-cell-sub">{superadmin?'Cuenta maestra protegida':'Cuenta interna'}</span></td>
                <td>{user.username}</td>
                <td>{(user.roles??[]).map((role:Row)=><Badge key={role.id} tone="neutral"><Shield size={11}/> {role.name}</Badge>)}</td>
                <td><Badge tone={user.status==='active'?'success':user.status==='blocked'?'danger':'warning'}>{STATUS_LABEL[user.status]??user.status}</Badge></td>
                <td>{superadmin
                  ?<span className="ja-cell-sub protected-admin"><LockKeyhole size={13}/> Siempre activo</span>
                  :<div className="ja-row-actions">
                    <Button variant="secondary" onClick={()=>void changeStatus(user,'active')}>Activar</Button>
                    <Button variant="secondary" onClick={()=>void changeStatus(user,'inactive')}>Inactivar</Button>
                    <Button variant="secondary" onClick={()=>void changeStatus(user,'blocked')}>Bloquear</Button>
                  </div>}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </section>
    </>}

    <Dialog open={open} onClose={()=>setOpen(false)} title="Crear usuario interno"
      description="El sistema enviará una invitación. No comparta contraseñas ni cree cuentas colectivas.">
      <form className="ja-pos-fields" onSubmit={submit}>
        <label className="ja-field"><span className="ja-field-label">Nombre completo</span>
          <input className="ja-control" required minLength={3} value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/>
        </label>
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Correo</span>
            <input className="ja-control" required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
          </label>
          <label className="ja-field"><span className="ja-field-label">Nombre de usuario</span>
            <input className="ja-control" required minLength={3} value={form.username} onChange={e=>setForm({...form,username:e.target.value})}/>
          </label>
        </div>
        <label className="ja-field"><span className="ja-field-label">Rol</span>
          <select className="ja-control" required value={form.role_id} onChange={e=>setForm({...form,role_id:e.target.value})}>
            <option value="">Seleccione un rol</option>
            {roles.map(role=><option key={role.id} value={role.id}>{role.name}</option>)}
          </select>
        </label>
        <Button type="submit" icon={<UserPlus size={15}/>}>Enviar invitación segura</Button>
      </form>
    </Dialog>
  </main>;
}

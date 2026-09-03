import {useCallback,useEffect,useState} from 'react';
import {RefreshCw,UserPlus,Users} from 'lucide-react';
import {createCommittee,listCommittees} from '../features/governance/service';
import {useAuth} from '../contexts/AuthContext';
import {Badge,Button,Dialog,EmptyState,ErrorState,Skeleton} from '../design-system/primitives';

type Committee={id:string;name:string;committee_type:string;purpose:string|null;active:boolean};
const TYPES=['agua','saneamiento','ambiente','control_fiscal','compras','protocolo','otro'];
const TYPE_LABEL:Record<string,string>={agua:'Agua',saneamiento:'Saneamiento',ambiente:'Ambiente',control_fiscal:'Control fiscal',compras:'Compras',protocolo:'Protocolo',otro:'Otro'};

export function Comites(){
  const auth=useAuth();
  const manage=auth.has('governance.manage');
  const [items,setItems]=useState<Committee[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [open,setOpen]=useState(false);
  const [form,setForm]=useState({name:'',committee_type:'otro',purpose:''});

  const load=useCallback(()=>{
    if(!auth.has('governance.read')){setLoading(false);return;}
    setLoading(true);
    void listCommittees()
      .then(d=>{setItems((d as Committee[])??[]);setError('');})
      .catch(e=>setError((e as Error).message))
      .finally(()=>setLoading(false));
  },[auth]);
  useEffect(load,[load]);

  async function submit(e:React.FormEvent){
    e.preventDefault();
    try{
      await createCommittee(form.name.trim(),form.committee_type,form.purpose.trim()||null);
      setForm({name:'',committee_type:'otro',purpose:''});
      setOpen(false);setNotice('Comité registrado.');load();
    }catch(err){setError((err as Error).message);}
  }

  return <main className="ja-page">
    <header className="ja-page-head">
      <div><h1>Comités</h1><p>Comités de la Junta Administradora de Agua (agua, saneamiento, ambiente, control fiscal, entre otros).</p></div>
      {manage&&<Button icon={<UserPlus size={15}/>} onClick={()=>setOpen(true)}>Nuevo comité</Button>}
      <button type="button" className="ja-tab" onClick={load}><RefreshCw size={14}/> Actualizar</button>
    </header>

    {notice&&<div className="ja-banner ja-banner-info">{notice}</div>}
    {error&&<ErrorState error={error} onRetry={load}/>}
    {loading&&items.length===0&&<Skeleton className="ja-360-skel"/>}

    {!loading&&<section className="ja-list">
      {items.length===0
        ?<EmptyState icon={<Users size={22}/>} title="Sin comités registrados" description="Registre los comités de trabajo de la JAA."/>
        :items.map(c=><article key={c.id} className="ja-list-row">
          <div>
            <strong>{c.name}</strong>
            <span className="ja-cell-sub">{c.purpose||'Sin propósito registrado'}</span>
          </div>
          <Badge tone={c.active?'success':'neutral'}>{TYPE_LABEL[c.committee_type]??c.committee_type}</Badge>
        </article>)}
    </section>}

    <Dialog open={open} onClose={()=>setOpen(false)} title="Nuevo comité"
      description="Registre un comité de trabajo de la Junta.">
      <form className="ja-pos-fields" onSubmit={submit}>
        <label className="ja-field"><span className="ja-field-label">Nombre</span>
          <input className="ja-control" required minLength={3} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
        </label>
        <label className="ja-field"><span className="ja-field-label">Tipo</span>
          <select className="ja-control" value={form.committee_type} onChange={e=>setForm({...form,committee_type:e.target.value})}>
            {TYPES.map(t=><option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </select>
        </label>
        <label className="ja-field"><span className="ja-field-label">Propósito</span>
          <textarea className="ja-control" rows={3} value={form.purpose} onChange={e=>setForm({...form,purpose:e.target.value})}/>
        </label>
        <Button type="submit">Registrar comité</Button>
      </form>
    </Dialog>
  </main>;
}

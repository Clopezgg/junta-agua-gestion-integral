import {useCallback,useEffect,useMemo,useState} from 'react';
import {CalendarPlus,History,Plus,RefreshCw} from 'lucide-react';
import {useAuth} from '../contexts/AuthContext';
import {createTariff,createTariffVersion,generateAnnualObligations,listTariffs} from '../features/billing/service';
import {annualGenerationSchema,tariffSchema,type TariffInput} from '../features/billing/validation';
import {Badge,Button,Dialog,ErrorState} from '../design-system/primitives';
import {formatMoney} from '../design-system/utils';

type Row=Record<string,any>;
const M=(v:unknown)=>formatMoney(typeof v==='number'||typeof v==='string'?v:0);
const initial:TariffInput={code:'AUTO',name:'',category:'annual_fee',description:'',applies_to_service:'',is_annual:true,amount:400,valid_from:new Date().toISOString().slice(0,10),valid_to:'',notes:''};

function makeCode(category:string,name:string){
  const prefix=({annual_fee:'ANUAL',new_connection:'PEGUE',reconnection:'RECON',late_fee:'MORA',repair:'REPAR',ownership_change:'CAMBIO',inspection:'INSP',fine:'MULTA',other:'SERV'} as Record<string,string>)[category]??'SERV';
  const suffix=name.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_|_$/g,'').toUpperCase().slice(0,18);
  return `${prefix}_${suffix||Date.now().toString().slice(-6)}`;
}

export function Tariffs(){
  const auth=useAuth();
  const manage=auth.has('tariffs.manage');
  const [rows,setRows]=useState<Row[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [newOpen,setNewOpen]=useState(false);
  const [form,setForm]=useState<TariffInput>(initial);
  const [versionFor,setVersionFor]=useState<Row|null>(null);
  const [version,setVersion]=useState({amount:0,valid_from:'',valid_to:'',notes:''});
  const [annual,setAnnual]=useState({tariff_definition_id:'',year:new Date().getFullYear(),due_date:`${new Date().getFullYear()}-11-30`});

  const generatedCode=useMemo(()=>makeCode(form.category,form.name),[form.category,form.name]);

  const load=useCallback(()=>{
    setLoading(true);
    void listTariffs()
      .then(r=>{setRows((r as Row[])??[]);setError('');})
      .catch(e=>setError((e as Error).message))
      .finally(()=>setLoading(false));
  },[]);
  useEffect(()=>{void load();},[load]);

  async function save(){
    const parsed=tariffSchema.safeParse({...form,code:generatedCode});
    if(!parsed.success){setError(parsed.error.issues[0]?.message??'Revise los datos.');return;}
    try{await createTariff(parsed.data);setNewOpen(false);setForm(initial);setNotice(`Tarifa creada con código automático ${generatedCode}.`);load();}
    catch(e){setError((e as Error).message);}
  }
  async function saveVersion(){
    if(!versionFor||version.amount<0||!version.valid_from){setError('Ingrese valor y fecha de vigencia.');return;}
    try{await createTariffVersion(versionFor.definition_id,version);setVersionFor(null);setVersion({amount:0,valid_from:'',valid_to:'',notes:''});setNotice('Nueva versión creada sin alterar el historial anterior.');load();}
    catch(e){setError((e as Error).message);}
  }
  async function generate(){
    const parsed=annualGenerationSchema.safeParse(annual);
    if(!parsed.success){setError(parsed.error.issues[0]?.message??'Revise la anualidad.');return;}
    try{const result=await generateAnnualObligations(parsed.data) as Row;setNotice(`Anualidad generada: ${result.created} obligaciones nuevas para ${result.year}.`);}
    catch(e){setError((e as Error).message);}
  }

  return <main className="ja-page">
    <header className="ja-page-head">
      <div><h1>Tarifas, anualidades y servicios</h1><p>El sistema genera los códigos automáticamente y conserva todas las versiones históricas.</p></div>
      {manage&&<Button icon={<Plus size={15}/>} onClick={()=>setNewOpen(true)}>Nueva tarifa</Button>}
      <button type="button" className="ja-tab" onClick={load}><RefreshCw size={14}/> Actualizar</button>
    </header>

    {notice&&<div className="ja-banner ja-banner-info">{notice}</div>}
    {error&&<ErrorState error={error} onRetry={()=>setError('')}/>}

    {auth.has('obligations.manage')&&<section className="ja-list">
      <h3 className="ja-list-heading"><CalendarPlus size={16}/> Generar cuota anual</h3>
      <p style={{color:'var(--ja-text-muted)',margin:'0 0 .6rem'}}>La cuota ordinaria se genera por cada pegue activo. La fecha límite predeterminada es el 30 de noviembre.</p>
      <div className="ja-toolbar">
        <select className="ja-control" style={{maxWidth:'18rem'}} value={annual.tariff_definition_id} onChange={e=>setAnnual({...annual,tariff_definition_id:e.target.value})}>
          <option value="">Seleccione tarifa anual</option>
          {rows.filter(r=>r.is_annual&&r.status==='active').map(r=><option key={r.definition_id} value={r.definition_id}>{r.name} · {M(r.amount)}</option>)}
        </select>
        <input className="ja-control" style={{maxWidth:'7rem'}} type="number" min="2000" max="2100" value={annual.year} onChange={e=>setAnnual({...annual,year:Number(e.target.value)})}/>
        <input className="ja-control" style={{maxWidth:'10rem'}} type="date" value={annual.due_date} onChange={e=>setAnnual({...annual,due_date:e.target.value})}/>
        <Button variant="secondary" icon={<CalendarPlus size={15}/>} onClick={()=>void generate()}>Generar sin duplicar</Button>
      </div>
    </section>}

    <section className="ja-table-scroll">
      <table className="ja-table">
        <thead><tr><th>Código</th><th>Tarifa</th><th>Categoría</th><th>Servicio</th><th>Versión</th><th className="ja-td-num">Valor</th><th>Vigente desde</th><th>Acción</th></tr></thead>
        <tbody>
          {rows.length===0
            ?<tr><td colSpan={8} className="ja-table-empty">{loading?'Cargando…':'No hay tarifas registradas.'}</td></tr>
            :rows.map(r=><tr key={r.definition_id}>
              <td><code style={{fontSize:'.75rem'}}>{r.code}</code></td>
              <td><strong>{r.name}</strong>{r.is_annual&&<> <Badge tone="neutral">Anual</Badge></>}</td>
              <td>{r.category}</td>
              <td>{r.applies_to_service||'Todos'}</td>
              <td>v{r.version_number??'-'}</td>
              <td className="ja-td-num">{M(r.amount)}</td>
              <td>{r.valid_from??'-'}</td>
              <td>{manage&&<Button variant="secondary" icon={<History size={13}/>} onClick={()=>{setVersionFor(r);setVersion({amount:Number(r.amount),valid_from:'',valid_to:'',notes:''});}}>Versionar</Button>}</td>
            </tr>)}
        </tbody>
      </table>
    </section>

    <Dialog open={newOpen} onClose={()=>setNewOpen(false)} title="Nueva tarifa o servicio" description="El código será generado por el sistema.">
      <form className="ja-pos-fields" onSubmit={e=>{e.preventDefault();void save();}}>
        <div className="ja-banner ja-banner-info">Código automático: <strong>{generatedCode}</strong></div>
        <label className="ja-field"><span className="ja-field-label">Nombre profesional</span>
          <input className="ja-control" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ej.: Cambio de tubería domiciliaria"/>
        </label>
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Categoría</span>
            <select className="ja-control" value={form.category} onChange={e=>setForm({...form,category:e.target.value as TariffInput['category']})}>
              <option value="annual_fee">Cuota anual</option><option value="new_connection">Nuevo pegue</option><option value="reconnection">Reconexión</option>
              <option value="late_fee">Mora</option><option value="repair">Reparación o cambio de tubería</option><option value="ownership_change">Cambio de propietario</option>
              <option value="inspection">Inspección</option><option value="fine">Multa</option><option value="other">Otro servicio</option>
            </select>
          </label>
          <label className="ja-field"><span className="ja-field-label">Tipo de servicio</span>
            <select className="ja-control" value={form.applies_to_service} onChange={e=>setForm({...form,applies_to_service:e.target.value as TariffInput['applies_to_service']})}>
              <option value="">Todos</option><option value="residential">Residencial</option><option value="commercial">Comercial</option>
              <option value="community">Comunitario</option><option value="institutional">Institucional</option>
            </select>
          </label>
          <label className="ja-field"><span className="ja-field-label">Valor</span>
            <input className="ja-control" type="number" step="0.01" min="0" value={form.amount} onChange={e=>setForm({...form,amount:Number(e.target.value)})}/>
          </label>
          <label className="ja-field"><span className="ja-field-label">Vigente desde</span>
            <input className="ja-control" type="date" value={form.valid_from} onChange={e=>setForm({...form,valid_from:e.target.value})}/>
          </label>
        </div>
        <label className="ja-field" style={{flexDirection:'row',alignItems:'center',gap:'.5rem'}}>
          <input type="checkbox" checked={form.is_annual} onChange={e=>setForm({...form,is_annual:e.target.checked})}/>
          <span className="ja-field-label" style={{margin:0}}>Genera obligación anual por pegue</span>
        </label>
        <label className="ja-field"><span className="ja-field-label">Descripción</span>
          <textarea className="ja-control" rows={2} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
        </label>
        <Button type="submit" disabled={!form.name.trim()}>Guardar tarifa</Button>
      </form>
    </Dialog>

    <Dialog open={!!versionFor} onClose={()=>setVersionFor(null)} title={versionFor?`Nueva versión · ${versionFor.name}`:'Nueva versión'}>
      <form className="ja-pos-fields" onSubmit={e=>{e.preventDefault();void saveVersion();}}>
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Nuevo valor</span>
            <input className="ja-control" type="number" step="0.01" min="0" value={version.amount} onChange={e=>setVersion({...version,amount:Number(e.target.value)})}/>
          </label>
          <label className="ja-field"><span className="ja-field-label">Vigente desde</span>
            <input className="ja-control" type="date" value={version.valid_from} onChange={e=>setVersion({...version,valid_from:e.target.value})}/>
          </label>
          <label className="ja-field"><span className="ja-field-label">Vigente hasta (opcional)</span>
            <input className="ja-control" type="date" value={version.valid_to} onChange={e=>setVersion({...version,valid_to:e.target.value})}/>
          </label>
        </div>
        <label className="ja-field"><span className="ja-field-label">Justificación</span>
          <textarea className="ja-control" rows={2} value={version.notes} onChange={e=>setVersion({...version,notes:e.target.value})}/>
        </label>
        <Button type="submit" icon={<History size={15}/>}>Crear nueva versión</Button>
      </form>
    </Dialog>
  </main>;
}

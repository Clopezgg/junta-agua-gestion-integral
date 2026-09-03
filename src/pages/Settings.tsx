import {useEffect,useState} from 'react';
import {BadgeCheck,Building2,PenTool,Upload} from 'lucide-react';
import {getOrganizationAssetUrl,getOrganizationSettings,updateOrganizationSettings,uploadOrganizationAsset} from '../features/settings/service';
import {Badge,Button,ErrorState} from '../design-system/primitives';

type AssetKind='logo'|'signature'|'stamp';
type FormState={
  name:string;address:string;phone:string;email:string;rtn:string;receipt_footer:string;currency:string;
  logo_path:string;signature_path:string;stamp_path:string;receipt_signatory_name:string;receipt_signatory_title:string;receipt_template_version:string;
};
const empty:FormState={name:'',address:'',phone:'',email:'',rtn:'',receipt_footer:'',currency:'HNL',logo_path:'',signature_path:'',stamp_path:'',receipt_signatory_name:'',receipt_signatory_title:'',receipt_template_version:'2.0'};

export function Settings(){
  const [form,setForm]=useState<FormState>(empty);
  const [previews,setPreviews]=useState<Record<AssetKind,string>>({logo:'',signature:'',stamp:''});
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');

  useEffect(()=>{void(async()=>{
    try{
      const settings=await getOrganizationSettings();
      const next:FormState={...empty,...settings};
      setForm(next);
      const [logo,signature,stamp]=await Promise.all([
        getOrganizationAssetUrl(next.logo_path),getOrganizationAssetUrl(next.signature_path),getOrganizationAssetUrl(next.stamp_path),
      ]);
      setPreviews({logo,signature,stamp});
    }catch(e){setError((e as Error).message);}
  })();},[]);

  async function upload(kind:AssetKind,file?:File){
    if(!file)return;
    try{
      const path=await uploadOrganizationAsset(file,kind);
      setForm(cur=>({...cur,[`${kind}_path` as keyof FormState]:path}));
      const url=await getOrganizationAssetUrl(path);
      setPreviews(cur=>({...cur,[kind]:url}));
      setNotice(`${kind==='logo'?'Logo':kind==='signature'?'Firma':'Sello'} cargado. Guarde la configuración para confirmarlo.`);
      setError('');
    }catch(e){setError((e as Error).message);}
  }
  async function save(){
    try{await updateOrganizationSettings(form);setNotice('Identidad institucional y plantilla de recibo guardadas con auditoría.');setError('');}
    catch(e){setError((e as Error).message);}
  }

  return <main className="ja-page">
    <header className="ja-page-head">
      <div><h1>Configuración institucional</h1><p>Datos oficiales, identidad visual y firma documental.</p></div>
      <Badge tone="success"><BadgeCheck size={12}/> Plantilla v{form.receipt_template_version}</Badge>
    </header>

    {notice&&<div className="ja-banner ja-banner-info">{notice}</div>}
    {error&&<ErrorState error={error} onRetry={()=>setError('')}/>}

    <section className="ja-list">
      <h3 className="ja-list-heading">Identidad del recibo</h3>
      <p style={{color:'var(--ja-text-muted)',margin:'0 0 .75rem'}}>Use imágenes limpias. Para firma y sello se recomienda PNG con fondo transparente.</p>
      <div className="ja-pos-grid">
        <AssetUploader title="Logo institucional" icon={<Building2 size={30}/>} preview={previews.logo} onFile={f=>void upload('logo',f)}/>
        <AssetUploader title="Firma autorizada" icon={<PenTool size={30}/>} preview={previews.signature} onFile={f=>void upload('signature',f)}/>
        <AssetUploader title="Sello institucional" icon={<BadgeCheck size={30}/>} preview={previews.stamp} onFile={f=>void upload('stamp',f)}/>
      </div>
    </section>

    <section className="ja-list">
      <h3 className="ja-list-heading">Datos oficiales</h3>
      <div className="ja-pos-fields">
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Nombre oficial</span><input className="ja-control" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">RTN</span><input className="ja-control" value={form.rtn} onChange={e=>setForm({...form,rtn:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Dirección</span><input className="ja-control" value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Teléfono</span><input className="ja-control" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Correo</span><input className="ja-control" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Moneda</span><input className="ja-control" value={form.currency} onChange={e=>setForm({...form,currency:e.target.value.toUpperCase()})}/></label>
          <label className="ja-field"><span className="ja-field-label">Nombre del firmante</span><input className="ja-control" value={form.receipt_signatory_name} onChange={e=>setForm({...form,receipt_signatory_name:e.target.value})} placeholder="Nombre completo autorizado"/></label>
          <label className="ja-field"><span className="ja-field-label">Cargo del firmante</span><input className="ja-control" value={form.receipt_signatory_title} onChange={e=>setForm({...form,receipt_signatory_title:e.target.value})} placeholder="Tesorero, Presidente…"/></label>
          <label className="ja-field"><span className="ja-field-label">Versión de plantilla</span><input className="ja-control" value={form.receipt_template_version} onChange={e=>setForm({...form,receipt_template_version:e.target.value})}/></label>
        </div>
        <label className="ja-field"><span className="ja-field-label">Pie del recibo</span>
          <textarea className="ja-control" rows={2} value={form.receipt_footer} onChange={e=>setForm({...form,receipt_footer:e.target.value})} placeholder="Mensaje institucional, teléfonos de reclamo o nota legal."/>
        </label>
        <Button onClick={()=>void save()}>Guardar configuración institucional</Button>
      </div>
    </section>
  </main>;
}

function AssetUploader({title,icon,preview,onFile}:{title:string;icon:React.ReactNode;preview:string;onFile:(file?:File)=>void}){
  return <div className="ja-field" style={{alignItems:'center',textAlign:'center',border:'1px solid var(--ja-border)',borderRadius:'var(--ja-radius-md)',padding:'.9rem'}}>
    <div style={{width:80,height:80,display:'grid',placeItems:'center',color:'var(--ja-text-muted)'}}>{preview?<img src={preview} alt={title} style={{maxWidth:'100%',maxHeight:'100%'}}/>:icon}</div>
    <strong style={{fontSize:'.85rem'}}>{title}</strong>
    <label className="ja-auth-link" style={{cursor:'pointer',display:'inline-flex',gap:'.35rem',alignItems:'center'}}>
      <Upload size={14}/> Seleccionar imagen
      <input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>onFile(e.target.files?.[0])}/>
    </label>
  </div>;
}

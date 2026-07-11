import {useEffect,useState} from 'react';
import {BadgeCheck,Building2,PenTool,Upload} from 'lucide-react';
import {getOrganizationAssetUrl,getOrganizationSettings,updateOrganizationSettings,uploadOrganizationAsset} from '../features/settings/service';

type AssetKind='logo'|'signature'|'stamp';
type FormState={
  name:string;address:string;phone:string;email:string;rtn:string;receipt_footer:string;currency:string;
  logo_path:string;signature_path:string;stamp_path:string;receipt_signatory_name:string;receipt_signatory_title:string;receipt_template_version:string;
};

const empty:FormState={name:'',address:'',phone:'',email:'',rtn:'',receipt_footer:'',currency:'HNL',logo_path:'',signature_path:'',stamp_path:'',receipt_signatory_name:'',receipt_signatory_title:'',receipt_template_version:'2.0'};

export function Settings(){
  const[form,setForm]=useState<FormState>(empty);
  const[previews,setPreviews]=useState<Record<AssetKind,string>>({logo:'',signature:'',stamp:''});
  const[message,setMessage]=useState('');
  const[error,setError]=useState('');

  useEffect(()=>{void(async()=>{
    try{
      const settings=await getOrganizationSettings();
      const next:FormState={...empty,...settings};
      setForm(next);
      const[logo,signature,stamp]=await Promise.all([
        getOrganizationAssetUrl(next.logo_path),
        getOrganizationAssetUrl(next.signature_path),
        getOrganizationAssetUrl(next.stamp_path)
      ]);
      setPreviews({logo,signature,stamp});
    }catch(e){setError((e as Error).message)}
  })()},[]);

  async function upload(kind:AssetKind,file?:File){
    if(!file)return;
    try{
      const path=await uploadOrganizationAsset(file,kind);
      const field=`${kind}_path` as keyof FormState;
      setForm(current=>({...current,[field]:path}));
      const url=await getOrganizationAssetUrl(path);
      setPreviews(current=>({...current,[kind]:url}));
      setMessage(`${kind==='logo'?'Logo':kind==='signature'?'Firma':'Sello'} cargado. Guarde la configuración para confirmarlo.`);
      setError('');
    }catch(e){setError((e as Error).message)}
  }

  async function save(){
    try{
      await updateOrganizationSettings(form);
      setMessage('Identidad institucional y plantilla de recibo guardadas con auditoría.');
      setError('');
    }catch(e){setError((e as Error).message)}
  }

  return <main className="content">
    <div className="titlebar"><div><h1>Configuración institucional</h1><p>Datos oficiales, identidad visual y firma documental.</p></div><span className="status-badge approved"><BadgeCheck size={15}/>Plantilla v{form.receipt_template_version}</span></div>
    {message&&<div className="notice">{message}</div>}
    {error&&<div className="error">{error}</div>}

    <section className="panel">
      <h2>Identidad del recibo</h2>
      <p className="help">Use imágenes limpias. Para firma y sello se recomienda PNG con fondo transparente.</p>
      <div className="asset-upload-grid">
        <AssetUploader title="Logo institucional" icon={<Building2 size={34}/>} preview={previews.logo} accept="image/jpeg,image/png,image/webp" onFile={file=>void upload('logo',file)}/>
        <AssetUploader title="Firma autorizada" icon={<PenTool size={34}/>} preview={previews.signature} accept="image/jpeg,image/png,image/webp" onFile={file=>void upload('signature',file)}/>
        <AssetUploader title="Sello institucional" icon={<BadgeCheck size={34}/>} preview={previews.stamp} accept="image/jpeg,image/png,image/webp" onFile={file=>void upload('stamp',file)}/>
      </div>

      <div className="form-grid">
        <label>Nombre oficial<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
        <label>RTN<input value={form.rtn} onChange={e=>setForm({...form,rtn:e.target.value})}/></label>
        <label>Dirección<input value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></label>
        <label>Teléfono<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label>
        <label>Correo<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
        <label>Moneda<input value={form.currency} onChange={e=>setForm({...form,currency:e.target.value.toUpperCase()})}/></label>
        <label>Nombre del firmante<input value={form.receipt_signatory_name} onChange={e=>setForm({...form,receipt_signatory_name:e.target.value})} placeholder="Nombre completo autorizado"/></label>
        <label>Cargo del firmante<input value={form.receipt_signatory_title} onChange={e=>setForm({...form,receipt_signatory_title:e.target.value})} placeholder="Tesorero, Presidente…"/></label>
        <label>Versión de plantilla<input value={form.receipt_template_version} onChange={e=>setForm({...form,receipt_template_version:e.target.value})}/><small className="help">Permite identificar históricamente el diseño utilizado.</small></label>
        <label className="span-2">Pie del recibo<textarea value={form.receipt_footer} onChange={e=>setForm({...form,receipt_footer:e.target.value})} placeholder="Mensaje institucional, teléfonos de reclamo o nota legal."/></label>
      </div>
      <button onClick={()=>void save()}>Guardar configuración institucional</button>
    </section>
  </main>;
}

function AssetUploader({title,icon,preview,accept,onFile}:{title:string;icon:React.ReactNode;preview:string;accept:string;onFile:(file?:File)=>void}){
  return <div className="institutional-asset">
    <div className="institutional-preview">{preview?<img src={preview} alt={title}/>:icon}</div>
    <strong>{title}</strong>
    <label className="upload"><Upload size={17}/>Seleccionar imagen<input type="file" accept={accept} onChange={e=>onFile(e.target.files?.[0])}/></label>
  </div>;
}

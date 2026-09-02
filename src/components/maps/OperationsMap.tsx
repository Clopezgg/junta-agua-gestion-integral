import {useEffect,useRef,useState} from 'react';

declare global { interface Window { google?: any; __googleMapsPromise?: Promise<void> } }

export type MapLayer='pegues'|'incidentes'|'ordenes'|'activos'|'tanques'|'fuentes';
export type OpsPoint={
  id:string;
  layer:MapLayer;
  lat:number;
  lng:number;
  title:string;
  subtitle?:string;
  tone:'ok'|'warn'|'crit'|'info';
};
type Props={
  points:OpsPoint[];
  onSelect:(point:OpsPoint)=>void;
  className?:string;
};

const TONE:Record<OpsPoint['tone'],string>={ok:'#22c55e',warn:'#f59e0b',crit:'#ef4444',info:'#38bdf8'};
// Estilo oscuro para el Command Center (§49). No añade geometría, sólo paleta.
const DARK_STYLE=[
  {elementType:'geometry',stylers:[{color:'#0a1725'}]},
  {elementType:'labels.text.fill',stylers:[{color:'#5b6b82'}]},
  {elementType:'labels.text.stroke',stylers:[{color:'#0a1725'}]},
  {featureType:'road',elementType:'geometry',stylers:[{color:'#16273b'}]},
  {featureType:'road',elementType:'labels',stylers:[{visibility:'off'}]},
  {featureType:'water',elementType:'geometry',stylers:[{color:'#07111d'}]},
  {featureType:'poi',stylers:[{visibility:'off'}]},
  {featureType:'transit',stylers:[{visibility:'off'}]},
  {featureType:'administrative',elementType:'geometry',stylers:[{color:'#233246'}]},
];
const DEFAULT={lat:14.7692,lng:-87.9900};

function loadGoogleMaps(){
  const key=import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string|undefined;
  if(!key)return Promise.reject(new Error('Falta VITE_GOOGLE_MAPS_API_KEY.'));
  if(window.google?.maps)return Promise.resolve();
  if(window.__googleMapsPromise)return window.__googleMapsPromise;
  window.__googleMapsPromise=new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&libraries=marker`;
    s.async=true;s.defer=true;s.onload=()=>resolve();s.onerror=()=>reject(new Error('No se pudo cargar Google Maps.'));
    document.head.appendChild(s);
  });
  return window.__googleMapsPromise;
}

export function OperationsMap({points,onSelect,className}:Props){
  const ref=useRef<HTMLDivElement>(null);
  const selectRef=useRef(onSelect);
  selectRef.current=onSelect;
  const [error,setError]=useState('');

  useEffect(()=>{
    let disposed=false;
    void loadGoogleMaps().then(async()=>{
      if(disposed||!ref.current||!window.google)return;
      const withGeo=points.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));
      const center=withGeo[0]?{lat:withGeo[0].lat,lng:withGeo[0].lng}:DEFAULT;
      const map=new window.google.maps.Map(ref.current,{
        center,zoom:withGeo.length?13:15,disableDefaultUI:true,zoomControl:true,
        styles:DARK_STYLE,backgroundColor:'#07111d',
      });
      const {AdvancedMarkerElement}=await window.google.maps.importLibrary('marker');
      for(const p of withGeo){
        const dot=document.createElement('div');
        dot.style.cssText=`width:14px;height:14px;border-radius:50%;background:${TONE[p.tone]};border:2px solid rgba(255,255,255,.85);box-shadow:0 0 0 4px ${TONE[p.tone]}33`;
        const marker=new AdvancedMarkerElement({map,position:{lat:p.lat,lng:p.lng},title:p.title,content:dot,gmpClickable:true});
        marker.addListener('click',()=>selectRef.current(p));
      }
    }).catch(e=>setError((e as Error).message));
    return()=>{disposed=true};
  },[points]);

  if(error)return <div className={`ja-cc-map-fallback ${className??''}`}><p>{error}</p><p>El mapa requiere configurar Google Maps en Integraciones.</p></div>;
  return <div ref={ref} className={`ja-cc-map ${className??''}`} aria-label="Mapa operativo"/>;
}

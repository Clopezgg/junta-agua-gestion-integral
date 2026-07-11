import {useEffect,useRef,useState} from 'react';

declare global { interface Window { google?: any; __googleMapsPromise?: Promise<void> } }

type Props={latitude?:number;longitude?:number;onChange:(lat:number,lng:number)=>void;readonly?:boolean;markers?:Array<{lat:number;lng:number;title:string;status?:string}>};
const DEFAULT={lat:14.7692,lng:-87.9900};

function loadGoogleMaps(){
 const key=import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string|undefined;
 if(!key)return Promise.reject(new Error('Falta VITE_GOOGLE_MAPS_API_KEY.'));
 if(window.google?.maps)return Promise.resolve();
 if(window.__googleMapsPromise)return window.__googleMapsPromise;
 window.__googleMapsPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&libraries=marker`;
  script.async=true;script.defer=true;script.onload=()=>resolve();script.onerror=()=>reject(new Error('No se pudo cargar Google Maps.'));
  document.head.appendChild(script);
 });
 return window.__googleMapsPromise;
}

export function GoogleMapPicker({latitude,longitude,onChange,readonly=false,markers=[]}:Props){
 const ref=useRef<HTMLDivElement>(null);const [error,setError]=useState('');
 useEffect(()=>{let disposed=false;void loadGoogleMaps().then(async()=>{
  if(disposed||!ref.current||!window.google)return;
  const center={lat:latitude??markers[0]?.lat??DEFAULT.lat,lng:longitude??markers[0]?.lng??DEFAULT.lng};
  const map=new window.google.maps.Map(ref.current,{center,zoom:markers.length?13:17,mapId:(import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string)||'DEMO_MAP_ID',streetViewControl:false,mapTypeControl:false});
  const {AdvancedMarkerElement}=await window.google.maps.importLibrary('marker');
  if(markers.length){markers.forEach(m=>new AdvancedMarkerElement({map,position:{lat:m.lat,lng:m.lng},title:m.title}));}
  else {
   const marker=new AdvancedMarkerElement({map,position:center,title:'Punto del pegue',gmpDraggable:!readonly});
   marker.addListener('dragend',()=>{const p=marker.position;if(p)onChange(Number(p.lat),Number(p.lng));});
   if(!readonly)map.addListener('click',(e:any)=>{const p={lat:e.latLng.lat(),lng:e.latLng.lng()};marker.position=p;onChange(p.lat,p.lng);});
  }
 }).catch(e=>setError((e as Error).message));return()=>{disposed=true}},[latitude,longitude,onChange,readonly,markers]);
 if(error)return <div className="map-fallback"><p>{error}</p><button type="button" className="outline" onClick={()=>navigator.geolocation?.getCurrentPosition(p=>onChange(p.coords.latitude,p.coords.longitude),()=>setError('No se pudo obtener la ubicación del dispositivo.'))}>Usar ubicación actual</button></div>;
 return <div ref={ref} className="google-map" aria-label="Mapa de ubicación"/>;
}

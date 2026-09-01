import {useEffect,type RefObject} from 'react';

export function useOnClickOutside(ref:RefObject<HTMLElement|null>,handler:()=>void){
  useEffect(()=>{
    function listener(event:MouseEvent|TouchEvent){
      const element=ref.current;
      if(!element||element.contains(event.target as Node))return;
      handler();
    }
    document.addEventListener('mousedown',listener);
    document.addEventListener('touchstart',listener);
    return()=>{document.removeEventListener('mousedown',listener);document.removeEventListener('touchstart',listener)};
  },[ref,handler]);
}

export function useEsc(handler:()=>void,active=true){
  useEffect(()=>{
    if(!active)return;
    const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')handler()};
    document.addEventListener('keydown',onKey);
    return()=>document.removeEventListener('keydown',onKey);
  },[handler,active]);
}
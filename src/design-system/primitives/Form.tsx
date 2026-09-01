import {forwardRef,useId,useState,type InputHTMLAttributes,type ReactNode,type SelectHTMLAttributes,type TextareaHTMLAttributes} from 'react';
import {Eye,EyeOff,Search} from 'lucide-react';
import {cn} from '../utils';

const controlBase='ja-control';
const labelBase='ja-field-label';

function FieldLabel({id,label,required,error,children}:{id:string;label?:ReactNode;required?:boolean;error?:string;children?:ReactNode}){
  if(!label&&!error)return <>{children}</>;
  return <div className="ja-field">
    {label&&<label className={labelBase} htmlFor={id}>{label}{required&&<span className="ja-required"> *</span>}</label>}
    {children}
    {error&&<span className="ja-field-error" role="alert">{error}</span>}
  </div>;
}

type InputProps=InputHTMLAttributes<HTMLInputElement>&{label?:ReactNode;error?:string;leading?:ReactNode;trailing?:ReactNode};
export const Input=forwardRef<HTMLInputElement,InputProps>(function Input({label,error,required,leading,trailing,className,id,type='text',...rest},ref){
  const auto=useId();
  const inputId=id??auto;
  return <FieldLabel id={inputId} label={label} required={required} error={error}>
    <div className={cn('ja-control-wrap',!!leading&&'ja-control-leading',!!trailing&&'ja-control-trailing')}>
      {leading&&<span className="ja-control-icon">{leading}</span>}
      <input ref={ref} id={inputId} className={cn(controlBase,'ja-input',!!error&&'ja-control-error',className)} required={required} type={type} aria-invalid={error?true:undefined} {...rest}/>
      {trailing&&<span className="ja-control-icon">{trailing}</span>}
    </div>
  </FieldLabel>;
});

type SearchInputProps=Omit<InputProps,'type'|'leading'|'trailing'>&{onSearch?:()=>void};
export function SearchInput({className,placeholder='Buscar…',onKeyDown,onSearch,label,...rest}:SearchInputProps){
  return <div className={cn('ja-search-input',className)}>
    <Search size={16} className="ja-search-icon" aria-hidden/>
    <input className={controlBase} type="search" placeholder={placeholder} onKeyDown={e=>{if(e.key==='Enter')onSearch?.();onKeyDown?.(e)}} {...rest}/>
    {label&&<label className="ja-visually-hidden">{label}</label>}
  </div>;
}

type PasswordProps=Omit<InputHTMLAttributes<HTMLInputElement>,'type'>&{label?:ReactNode;error?:string;leading?:ReactNode};
export function PasswordField({label,error,required,id,className,leading,...rest}:PasswordProps){
  const auto=useId();
  const inputId=id??auto;
  const[show,setShow]=useState(false);
  return <FieldLabel id={inputId} label={label} required={required} error={error}>
    <div className={cn('ja-control-wrap',!!leading&&'ja-control-leading','ja-control-trailing')}>
      {leading&&<span className="ja-control-icon">{leading}</span>}
      <input id={inputId} className={cn(controlBase,'ja-input',!!error&&'ja-control-error',className)} type={show?'text':'password'} autoComplete="current-password" required={required} aria-invalid={error?true:undefined} {...rest}/>
      <button type="button" className="ja-control-toggle" onClick={()=>setShow(value=>!value)} aria-label={show?'Ocultar contraseña':'Mostrar contraseña'} aria-pressed={show} tabIndex={-1}>
        {show?<EyeOff size={16}/>:<Eye size={16}/>}
      </button>
    </div>
  </FieldLabel>;
}

type TextareaProps=TextareaHTMLAttributes<HTMLTextAreaElement>&{label?:ReactNode;error?:string};
export const Textarea=forwardRef<HTMLTextAreaElement,TextareaProps>(function Textarea({label,error,required,className,id,...rest},ref){
  const auto=useId();
  const textareaId=id??auto;
  return <FieldLabel id={textareaId} label={label} required={required} error={error}>
    <textarea ref={ref} id={textareaId} className={cn(controlBase,'ja-textarea',!!error&&'ja-control-error',className)} required={required} aria-invalid={error?true:undefined} {...rest}/>
  </FieldLabel>;
});

type SelectProps=SelectHTMLAttributes<HTMLSelectElement>&{label?:ReactNode;error?:string;options:Array<{value:string;label:string}>|ReadonlyArray<{value:string;label:string}>;placeholder?:string};
export function Select({label,error,required,className,options,placeholder,id,...rest}:SelectProps){
  const auto=useId();
  const selectId=id??auto;
  return <FieldLabel id={selectId} label={label} required={required} error={error}>
    <select id={selectId} className={cn(controlBase,'ja-select',!!error&&'ja-control-error',className)} required={required} aria-invalid={error?true:undefined} {...rest}>
      {placeholder&&<option value="">{placeholder}</option>}
      {options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </FieldLabel>;
}

type CheckboxProps=InputHTMLAttributes<HTMLInputElement>&{label?:ReactNode;error?:string};
export function Checkbox({label,error,className,id,...rest}:CheckboxProps){
  const auto=useId();
  const inputId=id??auto;
  return <div className={cn('ja-checkbox',className)}>
    <input id={inputId} type="checkbox" {...rest}/>
    {label&&<label htmlFor={inputId}>{label}</label>}
    {error&&<span className="ja-field-error" role="alert">{error}</span>}
  </div>;
}

type SwitchProps=Omit<InputHTMLAttributes<HTMLInputElement>,'type'>&{label?:ReactNode;description?:ReactNode};
export function Switch({label,description,className,id,checked,...rest}:SwitchProps){
  const auto=useId();
  const inputId=id??auto;
  return <div className={cn('ja-switch',className)}>
    <input id={inputId} type="checkbox" className="ja-switch-input" checked={checked} {...rest}/>
    <label htmlFor={inputId} className="ja-switch-control">
      <span className="ja-switch-track" aria-hidden><span className="ja-switch-thumb"/></span>
      <span className="ja-switch-text">{label}{description&&<small>{description}</small>}</span>
    </label>
  </div>;
}
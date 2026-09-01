import type {ButtonHTMLAttributes,ReactNode} from 'react';
import {Loader2} from 'lucide-react';
import {cn} from '../utils';

export type ButtonVariant='primary'|'secondary'|'outline'|'ghost'|'danger';
export type ButtonSize='sm'|'md'|'lg';

const variants:Record<ButtonVariant,string>={
  primary:'ja-btn-primary',
  secondary:'ja-btn-secondary',
  outline:'ja-btn-outline',
  ghost:'ja-btn-ghost',
  danger:'ja-btn-danger',
};

type BaseProps={
  variant?:ButtonVariant;
  size?:ButtonSize;
  loading?:boolean;
  full?:boolean;
};
export type ButtonProps=BaseProps&ButtonHTMLAttributes<HTMLButtonElement>&{icon?:ReactNode};

export function Button({variant='primary',size='md',loading=false,full=false,icon,className,children,disabled,type='button',...rest}:ButtonProps){
  return <button
    type={type}
    className={cn('ja-btn',variants[variant],`ja-btn-${size}`,full&&'ja-btn-full',className)}
    disabled={disabled||loading}
    {...rest}
  >
    {loading?<Loader2 className="ja-spin" size={16} aria-hidden/>:icon}
    {children}
  </button>;
}

export function IconButton({variant='outline',size='md',className,children,loading=false,disabled,label,type='button',...rest}:ButtonProps&{label:string}){
  return <button
    type={type}
    aria-label={label}
    title={label}
    className={cn('ja-btn ja-btn-icon',variants[variant],`ja-btn-${size}`,className)}
    disabled={disabled||loading}
    {...rest}
  >
    {loading?<Loader2 className="ja-spin" size={16} aria-hidden/>:children}
  </button>;
}
export function cn(...parts:Array<string|false|null|undefined>):string{
  return parts.filter(Boolean).join(' ');
}

export function formatMoney(value:number|string|null|undefined,currency='L'):string{
  const amount=typeof value==='string'?Number(value):(value??0);
  if(Number.isNaN(amount))return `${currency} 0.00`;
  return `${currency} ${amount.toLocaleString('es-HN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
}

export function formatDate(value:string|Date|null|undefined,opts?:Intl.DateTimeFormatOptions):string{
  if(!value)return '—';
  const date=typeof value==='string'?new Date(value):value;
  if(Number.isNaN(date.getTime()))return '—';
  return date.toLocaleDateString('es-HN',opts??{day:'2-digit',month:'short',year:'numeric'});
}

export function formatDateTime(value:string|Date|null|undefined):string{
  if(!value)return '—';
  const date=typeof value==='string'?new Date(value):value;
  if(Number.isNaN(date.getTime()))return '—';
  return date.toLocaleString('es-HN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
}

export function initials(name:string):string{
  return name.trim().split(/\s+/).slice(0,2).map(part=>part[0]??'').join('').toUpperCase();
}

export function maskIdentity(identity:string):string{
  const cleaned=identity.replace(/\D/g,'');
  if(cleaned.length<=5)return '•••'+cleaned.slice(-3);
  return cleaned.slice(0,3)+' ••••• '+cleaned.slice(-2);
}
import {describe,expect,it} from 'vitest';

type Subscriber={id:string;name:string;birthDate:string;dni?:string;organizationId:string;status:'active'|'inactive'};
type Connection={id:string;subscriberId:string;organizationId:string;code:string;status:'active'|'inactive'};
type Obligation={id:string;subscriberId:string;connectionId:string;organizationId:string;base:number;discount:number;total:number;paid:number;snapshot:Record<string,unknown>};
type Payment={id:string;organizationId:string;total:number;status:'confirmed'|'voided'|'partially_refunded'|'refunded';cash:number;nonCash:number;allocations:{obligationId:string;amount:number;refunded:number}[];verificationToken:string};
const ageOn=(birthDate:string,year:number)=>year-new Date(birthDate).getUTCFullYear();

function generateAnnual(subscribers:Subscriber[],connections:Connection[],year:number,organizationId:string){
  return connections.filter(connection=>connection.organizationId===organizationId&&connection.status==='active').map((connection,index)=>{
    const subscriber=subscribers.find(item=>item.id===connection.subscriberId&&item.organizationId===organizationId&&item.status==='active');
    if(!subscriber)throw new Error('SUBSCRIBER_NOT_FOUND');
    const senior=ageOn(subscriber.birthDate,year)>=60&&Boolean(subscriber.dni);
    const discount=senior?100:0;
    return {id:`obl-${index}`,subscriberId:subscriber.id,connectionId:connection.id,organizationId,base:400,discount,total:400-discount,paid:0,snapshot:{year,period_from:`${year}-01-01`,due_date:`${year}-11-30`,late_from:`${year}-12-01`,senior_discount_applied:senior,senior_percentage:senior?25:0,connection_code:connection.code}} satisfies Obligation;
  });
}

function registerPayment(obligations:Obligation[],selectedIds:string[],cash:number,nonCash:number){
  const selected=obligations.filter(item=>selectedIds.includes(item.id));
  const total=selected.reduce((sum,item)=>sum+item.total-item.paid,0);
  if(cash+nonCash!==total)throw new Error('COMPONENT_TOTAL_MISMATCH');
  selected.forEach(item=>{item.paid=item.total;});
  return {id:'pay-1',organizationId:selected[0]?.organizationId??'',total,status:'confirmed',cash,nonCash,verificationToken:'token-1',allocations:selected.map(item=>({obligationId:item.id,amount:item.total,refunded:0}))} satisfies Payment;
}

function refund(payment:Payment,obligations:Obligation[],amount:number){
  let remaining=amount;
  for(const allocation of payment.allocations){
    const obligation=obligations.find(item=>item.id===allocation.obligationId)!;
    const reverse=Math.min(remaining,allocation.amount-allocation.refunded);
    allocation.refunded+=reverse;
    obligation.paid=Math.max(0,obligation.paid-reverse);
    remaining-=reverse;
    if(remaining===0)break;
  }
  if(remaining>0)throw new Error('REFUND_EXCEEDS_PAYMENT');
  payment.status=payment.allocations.every(item=>item.refunded===item.amount)?'refunded':'partially_refunded';
}

function canPortalUpdate(field:string){return ['whatsapp','email','address','photo_path'].includes(field);}
function canReadOrg(userOrg:string,rowOrg:string){return userOrg===rowOrg;}
function backupRestore<T>(rows:T[]){return JSON.parse(JSON.stringify(rows)) as T[];}

describe('commercial minimum end-to-end flow simulation',()=>{
  it('generates annual obligations for 1, 2, 4 and 20 connections with senior discount snapshots',()=>{
    const subscribers=[{id:'s1',name:'Adulto Mayor',birthDate:'1960-05-01',dni:'0801196000001',organizationId:'org-a',status:'active'}] satisfies Subscriber[];
    for(const count of [1,2,4,20]){
      const connections=Array.from({length:count},(_,index)=>({id:`c${index}`,subscriberId:'s1',organizationId:'org-a',code:`P-${index+1}`,status:'active' as const}));
      const obligations=generateAnnual(subscribers,connections,2026,'org-a');
      expect(obligations).toHaveLength(count);
      expect(obligations.reduce((sum,item)=>sum+item.base,0)).toBe(count*400);
      expect(obligations.reduce((sum,item)=>sum+item.discount,0)).toBe(count*100);
      expect(obligations.reduce((sum,item)=>sum+item.total,0)).toBe(count*300);
      expect(obligations.every(item=>item.snapshot.senior_discount_applied===true)).toBe(true);
    }
  });

  it('registers a cash payment, emits a verifiable receipt payload, and supports reprint semantics',()=>{
    const subscribers=[{id:'s1',name:'Sin Descuento',birthDate:'1990-01-01',dni:'0801199000001',organizationId:'org-a',status:'active'}] satisfies Subscriber[];
    const obligations=generateAnnual(subscribers,[{id:'c1',subscriberId:'s1',organizationId:'org-a',code:'P-1',status:'active'}],2026,'org-a');
    const payment=registerPayment(obligations,[obligations[0].id],400,0);
    expect(payment.cash).toBe(400);
    expect(obligations[0].paid).toBe(400);
    const receipt={number:'REC-2026-000001',token:payment.verificationToken,total:payment.total,copy:false,qr:`/verificar-recibo/${payment.verificationToken}`};
    const reprint={...receipt,copy:true};
    expect(receipt.qr).toContain('token-1');
    expect(reprint.copy).toBe(true);
  });

  it('void/refund reopens paid debt and marks payment state',()=>{
    const subscriber={id:'s1',name:'Pago Mixto',birthDate:'1990-01-01',dni:'0801199000001',organizationId:'org-a',status:'active'} satisfies Subscriber;
    const obligations=generateAnnual([subscriber],[{id:'c1',subscriberId:'s1',organizationId:'org-a',code:'P-1',status:'active'}],2026,'org-a');
    const payment=registerPayment(obligations,[obligations[0].id],100,300);
    refund(payment,obligations,150);
    expect(payment.status).toBe('partially_refunded');
    expect(obligations[0].paid).toBe(250);
    refund(payment,obligations,250);
    expect(payment.status).toBe('refunded');
    expect(obligations[0].paid).toBe(0);
  });

  it('enforces portal editable fields and RLS organization isolation',()=>{
    expect(canPortalUpdate('whatsapp')).toBe(true);
    expect(canPortalUpdate('email')).toBe(true);
    expect(canPortalUpdate('address')).toBe(true);
    expect(canPortalUpdate('photo_path')).toBe(true);
    for(const forbidden of ['full_name','dni','birth_date','tariff','payments','discounts','status'])expect(canPortalUpdate(forbidden)).toBe(false);
    expect(canReadOrg('org-a','org-a')).toBe(true);
    expect(canReadOrg('org-a','org-b')).toBe(false);
  });

  it('round-trips backup and restore payloads without mutating financial snapshots',()=>{
    const subscriber={id:'s1',name:'Backup',birthDate:'1960-01-01',dni:'0801196000001',organizationId:'org-a',status:'active'} satisfies Subscriber;
    const obligations=generateAnnual([subscriber],[{id:'c1',subscriberId:'s1',organizationId:'org-a',code:'P-1',status:'active'}],2026,'org-a');
    const restored=backupRestore(obligations);
    expect(restored).toEqual(obligations);
    expect(restored[0].snapshot).toEqual(obligations[0].snapshot);
  });
});

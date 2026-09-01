import type {ReactNode,ThHTMLAttributes,TdHTMLAttributes} from 'react';
import {Table2} from 'lucide-react';
import {cn} from '../utils';

export function Table({columns,children,className,empty,loading}:{columns:ReadonlyArray<string>;children:ReactNode;className?:string;empty?:ReactNode;loading?:boolean}){
  return <div className={cn('ja-table-scroll',className)}>
    <table className="ja-table">
      <thead><tr>{columns.map(column=><th key={column} scope="col">{column}</th>)}</tr></thead>
      <tbody>{children}</tbody>
    </table>
    {!loading&&!empty&&<div className="ja-table-empty"><Table2 size={20}/><span>Sin registros.</span></div>}
    {loading&&<div className="ja-table-empty">Cargando…</div>}
  </div>;
}

export function TableRow({children,onClick,className,selected}:{children:ReactNode;onClick?:()=>void;className?:string;selected?:boolean}){
  return <tr className={cn(onClick&&'ja-row-click',selected&&'ja-row-selected',className)} onClick={onClick}>{children}</tr>;
}
export function Th(props:ThHTMLAttributes<HTMLTableCellElement>){return <th {...props}/>; }
export function Td(props:TdHTMLAttributes<HTMLTableCellElement>){return <td {...props}/>; }
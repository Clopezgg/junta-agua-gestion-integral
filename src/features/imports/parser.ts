import readXlsxFile from 'read-excel-file/browser';

export type CellValue=string|number|boolean|Date|null;
export type ParsedDataFile={
  headers:string[];
  rows:Record<string,CellValue>[];
  rawRows:CellValue[][];
  sourceType:'xlsx'|'csv'|'tsv';
};

const normalizeHeader=(value:unknown,index:number)=>{
  const text=String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
  return text||`columna_${index+1}`;
};

function uniqueHeaders(values:unknown[]){
  const counts=new Map<string,number>();
  return values.map((value,index)=>{
    const base=normalizeHeader(value,index);
    const count=(counts.get(base)??0)+1;
    counts.set(base,count);
    return count===1?base:`${base}_${count}`;
  });
}

function parseDelimited(text:string,delimiter:string){
  const rows:string[][]=[];
  let row:string[]=[];let value='';let quoted=false;
  for(let index=0;index<text.length;index++){
    const char=text[index];
    if(char==='"'){
      if(quoted&&text[index+1]==='"'){value+='"';index++}else quoted=!quoted;
    }else if(char===delimiter&&!quoted){row.push(value);value=''}
    else if((char==='\n'||char==='\r')&&!quoted){
      if(char==='\r'&&text[index+1]==='\n')index++;
      row.push(value);value='';
      if(row.some(cell=>cell.trim()!==''))rows.push(row);
      row=[];
    }else value+=char;
  }
  row.push(value);
  if(row.some(cell=>cell.trim()!==''))rows.push(row);
  return rows;
}

export async function sha256File(file:File){
  const hash=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
  return[...new Uint8Array(hash)].map(value=>value.toString(16).padStart(2,'0')).join('');
}

export async function parseDataFile(file:File):Promise<ParsedDataFile>{
  if(file.size>15*1024*1024)throw new Error('El archivo supera el límite de 15 MB.');
  const extension=file.name.split('.').pop()?.toLowerCase();
  let matrix:CellValue[][];
  let sourceType:ParsedDataFile['sourceType'];
  if(extension==='xlsx'){
    matrix=(await readXlsxFile(file)) as CellValue[][];
    sourceType='xlsx';
  }else if(extension==='csv'||extension==='tsv'){
    const text=await file.text();
    const delimiter=extension==='tsv'?'\t':detectDelimiter(text);
    matrix=parseDelimited(text,delimiter);
    sourceType=delimiter==='\t'?'tsv':'csv';
  }else throw new Error('Formato no admitido. Use XLSX, CSV o TSV.');

  if(matrix.length<2)throw new Error('El archivo debe contener encabezados y al menos una fila.');
  if(matrix.length>5001)throw new Error('El archivo supera 5,000 filas por lote.');
  const headers=uniqueHeaders(matrix[0]);
  const rawRows=matrix.slice(1).filter(row=>row.some(value=>String(value??'').trim()!==''));
  const rows=rawRows.map(row=>Object.fromEntries(headers.map((header,index)=>[header,row[index]??null])));
  return{headers,rows,rawRows,sourceType};
}

function detectDelimiter(text:string){
  const first=(text.split(/\r?\n/,1)[0]??'');
  const candidates=[',',';','\t'];
  return candidates.sort((a,b)=>first.split(b).length-first.split(a).length)[0];
}

const aliases:Record<string,string[]>={
  full_name:['nombre','nombre_completo','abonado','socio','usuario'],
  document_type:['tipo_documento','documento_tipo'],
  document_number:['dni','identidad','numero_documento','documento','cedula','pasaporte'],
  issuing_country:['pais_emisor','pais'],
  whatsapp:['telefono','celular','movil','whatsapp'],
  email:['correo','correo_electronico'],
  address:['direccion','domicilio'],
  sector:['sector','barrio','aldea','comunidad'],
  service_type:['tipo_servicio','servicio','categoria'],
  meter_number:['medidor','numero_medidor','codigo_medidor'],
  connection_address:['direccion_pegue','direccion_servicio','direccion_conexion'],
  connection_sector:['sector_pegue','sector_conexion'],
  connection_code:['codigo_pegue','codigo_conexion','conexion'],
  previous_reading:['lectura_anterior','anterior'],
  current_reading:['lectura_actual','actual','lectura'],
  notes:['notas','observacion','observaciones']
};

export function guessColumnMapping(headers:string[],fields:string[]){
  const mapping:Record<string,string>={};
  for(const field of fields){
    const options=[field,...(aliases[field]??[])];
    const match=headers.find(header=>options.includes(header));
    if(match)mapping[field]=match;
  }
  return mapping;
}

export function cellText(value:CellValue){
  if(value instanceof Date)return value.toISOString().slice(0,10);
  return String(value??'').trim();
}

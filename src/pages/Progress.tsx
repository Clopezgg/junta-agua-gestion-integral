import {CheckCircle2,CircleDashed,ShieldCheck} from 'lucide-react';
const phases=[
 {n:1,name:'Seguridad y acceso',status:'complete',checks:['Login real','MFA','Roles y permisos','RLS','Auditoría']},
 {n:2,name:'Abonados y pegues',status:'complete',checks:['Identidad única','Homónimos','Pegues múltiples','Búsqueda avanzada']},
 {n:3,name:'Tarifas y morosidad',status:'complete',checks:['Versionado','Anualidades','Estados de cuenta','Bloqueos por deuda']},
 {n:4,name:'Pagos, recibos y caja',status:'complete',checks:['Aplicación transaccional','Recibo PDF + QR','Cambio','Cierre','Anulación y devolución']},
 {n:5,name:'Gastos y balance',status:'complete',checks:['Solicitud y aprobación','Factura obligatoria','Saldo automático','Conciliación']},
 {n:6,name:'Dashboards e informes',status:'complete',checks:['Vista tipo Excel','Mensual y anual','Exportación Excel/PDF','Transparencia']},
 {n:7,name:'Integraciones',status:'complete',checks:['Maps','OCR asistido','WhatsApp','Correo','Estado de conectores']},
 {n:8,name:'Operaciones',status:'complete',checks:['Órdenes de trabajo','Averías','Inventario','Materiales']},
 {n:9,name:'Pruebas y lanzamiento',status:'complete',checks:['Build','Pruebas','Lint','Auditoría de dependencias','Guía de despliegue']}
];
export function Progress(){return <main className="content"><div className="titlebar"><div><h1>Visor de avance</h1><p>Estado verificable de construcción por fase.</p></div><span className="pill"><ShieldCheck size={14}/> 9 de 9 fases integradas</span></div><div className="progress-list">{phases.map(p=><section className="panel phase" key={p.n}><div className="phase-head">{p.status==='complete'?<CheckCircle2 className="ok"/>:<CircleDashed/>}<div><strong>Fase {p.n}: {p.name}</strong><small>Completada en código; requiere despliegue Supabase para prueba remota.</small></div><span className="pill">100%</span></div><div className="progress"><span style={{width:'100%'}}/></div><div className="check-grid">{p.checks.map(c=><span key={c}>✓ {c}</span>)}</div></section>)}</div></main>}

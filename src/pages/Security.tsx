import {ShieldCheck} from 'lucide-react';
import {useAuth} from '../contexts/AuthContext';

export function Security(){
  const a=useAuth();
  return <main className="ja-page">
    <header className="ja-page-head">
      <div><h1>Seguridad de la sesión</h1><p>Estado de la cuenta, segundo factor y permisos efectivos.</p></div>
    </header>

    <div className="ja-home-metrics">
      <article className="ja-metric"><small>Usuario</small><strong>{a.profile?.username??'—'}</strong></article>
      <article className="ja-metric"><small>Segundo factor</small><strong>Verificado</strong><span>MFA TOTP activo</span></article>
      <article className="ja-metric"><small>Estado de la cuenta</small><strong>{a.profile?.status??'—'}</strong></article>
    </div>

    <section className="ja-list">
      <h3 className="ja-list-heading"><ShieldCheck size={16}/> Permisos efectivos ({a.permissions.length})</h3>
      {a.permissions.length===0
        ?<p style={{color:'var(--ja-text-muted)',margin:0}}>Sin permisos asignados.</p>
        :a.permissions.map(p=><article key={p} className="ja-list-row"><div><strong>{p}</strong></div></article>)}
    </section>
  </main>;
}

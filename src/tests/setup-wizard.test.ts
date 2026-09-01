import {describe,expect,it} from 'vitest';
import {
  draftFromSettings,emptyDraft,setupSteps,stepStatus,toSettingsPayload,validateStep,deferredConfig,
} from '../features/settings/setupWizard';
import {hasRoute} from '../app/router/routeManifest';

describe('setup wizard (§25)',()=>{
  it('tiene los pasos de inicialización institucional',()=>{
    expect(setupSteps.map(s=>s.id)).toEqual(['identidad','ubicacion','legal','servicio','revision']);
  });

  it('solo el nombre es obligatorio — no inventa RTN/personería/etc (§129)',()=>{
    expect(validateStep(emptyDraft,'identidad')).toContain(
      'El nombre oficial de la Junta es obligatorio (mínimo 3 caracteres).');
    expect(validateStep({...emptyDraft,name:'Junta El Achiotal'},'identidad')).toEqual([]);
    expect(validateStep({...emptyDraft,name:'Junta El Achiotal'},'ubicacion')).toEqual([]);
    expect(validateStep({...emptyDraft,name:'Junta El Achiotal'},'legal')).toEqual([]);
  });

  it('valida el formato de correo y fecha solo si se proporcionan',()=>{
    expect(validateStep({...emptyDraft,name:'Junta X',email:'no-es-correo'},'identidad')).toHaveLength(1);
    expect(validateStep({...emptyDraft,name:'Junta X',email:'a@b.co'},'identidad')).toEqual([]);
    expect(validateStep({...emptyDraft,founding_date:'14/03/2005'},'legal')).toHaveLength(1);
    expect(validateStep({...emptyDraft,founding_date:'2005-03-14'},'legal')).toEqual([]);
  });

  it('el payload de merge sólo incluye claves con valor + metering_enabled',()=>{
    const payload=toSettingsPayload({...emptyDraft,name:'  Junta X  ',rtn:'',department:'Copán',metering_enabled:false});
    expect(payload).toEqual({name:'Junta X',department:'Copán',metering_enabled:false});
    expect(payload).not.toHaveProperty('rtn');
  });

  it('reconstruye el borrador desde settings del backend',()=>{
    const d=draftFromSettings({name:'Junta X',municipality:'Santa Rosa',service_type:'agua',metering_enabled:true,rtn:null});
    expect(d.name).toBe('Junta X');
    expect(d.municipality).toBe('Santa Rosa');
    expect(d.service_type).toBe('agua');
    expect(d.metering_enabled).toBe(true);
    expect(d.rtn).toBe('');
  });

  it('el estado por paso refleja el llenado',()=>{
    expect(stepStatus(emptyDraft,'ubicacion')).toBe('pending');
    expect(stepStatus({...emptyDraft,department:'Copán'},'ubicacion')).toBe('partial');
    expect(stepStatus({...emptyDraft,department:'Copán',municipality:'Corquín',community:'El Achiotal'},'ubicacion')).toBe('complete');
  });

  it('la configuración diferida apunta a pantallas reales',()=>{
    const missing=deferredConfig.filter(c=>!hasRoute(c.to)).map(c=>c.to);
    expect(missing).toEqual([]);
  });
});

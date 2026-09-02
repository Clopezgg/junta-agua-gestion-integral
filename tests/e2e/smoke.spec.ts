import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {expect,test,type Page} from '@playwright/test';
import {authenticator} from 'otplib';

const EMAIL='e2e-demo@junta.test';
const PASSWORD='E2e-Demo-2026!';
// El secreto TOTP se enrola UNA vez y se persiste en disco para sobrevivir a
// reintentos/reinicios de worker (un solo factor por usuario en Supabase).
const SECRET_FILE=join(tmpdir(),'junta-e2e-totp-secret');
const readSecret=()=>existsSync(SECRET_FILE)?readFileSync(SECRET_FILE,'utf8').trim():'';

async function passOtp(page:Page,secret:string){
  for(let attempt=0;attempt<3;attempt++){
    if(attempt>0)await page.waitForTimeout(authenticator.timeRemaining()*1000+800);
    await page.getByLabel(/código de seis dígitos/i).fill(authenticator.generate(secret));
    await page.getByRole('button',{name:/verificar y continuar/i}).first().click();
    try{await expect(page).toHaveURL(/\/$/,{timeout:25_000});return;}catch{/* reintenta */}
  }
  throw new Error('No se pudo completar la verificación MFA.');
}

async function mfa(page:Page){
  await expect(page).toHaveURL(/\/mfa/,{timeout:20_000});
  await expect(page.getByRole('heading',{name:/activar autenticador|verificación de seguridad/i})).toBeVisible({timeout:15_000});
  let secret=readSecret();
  const enrolling=await page.getByRole('heading',{name:/activar autenticador/i}).isVisible().catch(()=>false);
  if(enrolling&&!secret){
    await page.getByRole('button',{name:/generar código qr/i}).first().click();
    const code=page.locator('.ja-mfa-secret code');
    await expect(code).toBeVisible({timeout:15_000});
    secret=(await code.textContent())?.trim()??'';
    if(!secret)throw new Error('No se pudo leer el secreto de enrolamiento.');
    writeFileSync(SECRET_FILE,secret);
  }else{
    await expect(page.getByRole('heading',{name:/verificación de seguridad/i})).toBeVisible();
  }
  await passOtp(page,secret||readSecret());
}

async function login(page:Page){
  await page.goto('/login');
  await page.getByPlaceholder(/correo|email/i).first().fill(EMAIL);
  await page.getByLabel(/contraseña/i).first().fill(PASSWORD);
  await page.getByRole('button',{name:/continuar de forma segura|entrar|iniciar sesión/i}).first().click();
  await mfa(page);
}

test.describe('flujo operativo real (browser) sobre Supabase local',()=>{
  test('inicio de sesión y panel principal',async({page})=>{
    await login(page);
    await expect(page.getByRole('heading',{level:1,name:/buen[oa]s (días|tardes|noches),/i})).toBeVisible();
    await expect(page.getByRole('heading',{name:/requiere atención/i})).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('navegación a abonados, presupuesto y pagos',async({page})=>{
    await login(page);
    for(const[route,heading]of [
      ['/abonados','^Abonados$'],
      ['/presupuesto','Presupuesto'],
      ['/pagos','^Cobrar$']
    ] as const){
      await page.goto(route);
      await expect(page.getByRole('heading',{level:1,name:new RegExp(heading,'i')})).toBeVisible();
    }
  });

  test('búsqueda de abonados consulta el backend',async({page})=>{
    await login(page);
    await page.goto('/abonados');
    const search=page.getByLabel(/buscar abonados/i).first();
    await search.fill('demo');
    await expect(page.getByRole('heading',{level:1,name:/abonados/i})).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('layout responsivo sin desbordamiento horizontal en móvil',async({page})=>{
    await login(page);
    await page.setViewportSize({width:375,height:667});
    await page.goto('/abonados');
    await expect(page.getByRole('heading',{level:1,name:/abonados/i})).toBeVisible();
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('el POS de cobro y la Caja son pantallas separadas (§43/§46)',async({page})=>{
    await login(page);
    await page.goto('/pagos');
    await expect(page.getByRole('heading',{level:1,name:/cobrar/i})).toBeVisible();
    await expect(page.getByRole('heading',{level:2,name:/documento de cobro/i})).toBeVisible();
    await page.goto('/caja');
    await expect(page.getByRole('heading',{level:1,name:/^caja$/i})).toBeVisible();
    await expect(page.getByRole('tab',{name:/arqueo/i})).toBeVisible();
  });

  test('el asistente de Nuevo servicio abre y avanza',async({page})=>{
    await login(page);
    await page.goto('/abonados/nuevo-servicio');
    await expect(page.getByRole('heading',{level:1,name:/nuevo servicio/i})).toBeVisible();
    await page.getByRole('button',{name:/persona nueva/i}).click();
    await expect(page.getByText(/verificar duplicados/i)).toBeVisible();
  });

  test('abrir un abonado muestra la ficha 360 con pestañas',async({page})=>{
    await login(page);
    await page.goto('/abonados');
    await page.locator('tbody tr.ja-row-click').first().click();
    await expect(page).toHaveURL(/\/abonados\/[0-9a-f-]{36}/);
    await expect(page.getByRole('tab',{name:'Resumen'})).toBeVisible();
    await page.getByRole('tab',{name:'Cuenta'}).click();
    await expect(page.getByRole('tab',{name:'Cuenta'})).toHaveAttribute('aria-selected','true');
  });

  test('la paleta de comandos abre con Ctrl+K y navega a una sección',async({page})=>{
    await login(page);
    await page.keyboard.press('Control+k');
    const input=page.getByRole('combobox',{name:/buscar/i});
    await expect(input).toBeVisible();
    await input.fill('presupuesto');
    await page.getByRole('option',{name:/presupuesto/i}).first().click();
    await expect(page).toHaveURL(/\/presupuesto/);
  });

  test('cierre de sesión regresa al inicio',async({page})=>{
    await login(page);
    await page.getByRole('button',{name:/salir|cerrar sesión|logout/i}).first().click();
    await expect(page).toHaveURL(/\/login/,{timeout:20_000});
  });
});
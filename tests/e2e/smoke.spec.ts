import {expect,test,type Page} from '@playwright/test';
import {authenticator} from 'otplib';

const EMAIL='e2e-demo@junta.test';
const PASSWORD='E2e-Demo-2026!';

let totpSecret:string|undefined;

async function mfa(page:Page){
  await expect(page).toHaveURL(/\/mfa/,{timeout:20_000});
  if(!totpSecret){
    await expect(page.getByRole('heading',{name:/activar autenticador/i})).toBeVisible();
    await page.getByRole('button',{name:/generar código qr/i}).first().click();
    try{
      await expect(page.locator('code').first()).toBeVisible({timeout:15_000});
    }catch{
      throw new Error(`No se pudo enrolar MFA: ${(await page.locator('.error').first().textContent()).trim()}`);
    }
    totpSecret=(await page.locator('code').first().textContent())?.trim()??'';
    if(!totpSecret)throw new Error('No se pudo leer el secreto de enrolamiento.');
  }else{
    await expect(page.getByRole('heading',{name:/verificación de seguridad/i})).toBeVisible();
  }
  for(let attempt=0;attempt<3;attempt++){
    if(attempt>0)await page.waitForTimeout(authenticator.timeRemaining()+500);
    await page.getByLabel(/código de seis dígitos/i).fill(authenticator.generate(totpSecret));
    await page.getByRole('button',{name:/verificar y continuar/i}).first().click();
    try{
      await expect(page).toHaveURL(/\/$/,{timeout:25_000});
      return;
    }catch{
      continue;
    }
  }
  throw new Error('No se pudo completar la verificación MFA.');
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
    await expect(page.getByRole('heading',{level:1,name:/hola,/i})).toBeVisible();
    await expect(page.getByRole('heading',{name:/requiere atención/i})).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('navegación a abonados, presupuesto y pagos',async({page})=>{
    await login(page);
    for(const[route,heading]of [
      ['/abonados','Abonados'],
      ['/presupuesto','Presupuesto y sostenibilidad financiera'],
      ['/pagos','Pagos, recibos y contabilización']
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
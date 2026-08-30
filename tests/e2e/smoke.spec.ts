import {expect,test,type Page} from '@playwright/test';

const EMAIL='e2e-demo@junta.test';
const PASSWORD='E2e-Demo-2026!';

async function login(page:Page){
  await page.goto('/login');
  await page.getByPlaceholder(/correo|email/i).first().fill(EMAIL);
  await page.getByPlaceholder(/contraseña|password/i).first().fill(PASSWORD);
  await page.getByRole('button',{name:/entrar|iniciar sesión/i}).first().click();
  await expect(page).toHaveURL(/\/$/,{timeout:20_000});
}

test.describe('flujo operativo real (browser) sobre Supabase local',()=>{
  test('inicio de sesión y panel principal',async({page})=>{
    await login(page);
    await expect(page.getByRole('heading',{level:1,name:/gestión comunitaria del agua/i})).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('navegación a abonados, presupuesto y pagos',async({page})=>{
    await login(page);
    for(const[route,heading]of [
      ['/abonados','Abonados y pegues'],
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
    const search=page.getByPlaceholder(/buscar por código/i).first();
    await search.fill('demo');
    await search.press('Enter');
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

  test('cierre de sesión regresa al inicio',async({page})=>{
    await login(page);
    await page.getByRole('button',{name:/salir|cerrar sesión|logout/i}).first().click();
    await expect(page).toHaveURL(/\/login/,{timeout:20_000});
  });
});
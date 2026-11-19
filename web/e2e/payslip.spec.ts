import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const net = (page: Page) => page.getByTestId('net');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(net(page)).toHaveText(/6\.814,89/);
});

test('explains INSS slice by slice and follows references', async ({ page }) => {
  await page.getByRole('button', { name: 'INSS', exact: true }).click();

  const trace = page.getByRole('list', { name: 'Memória de cálculo' });
  await expect(trace).toContainText('Faixa 4');
  await expect(trace).toContainText('teto de');

  await trace.getByRole('button', { name: 'BASE_INSS' }).first().click();
  await expect(page.getByRole('heading', { name: /Memória de cálculo · BASE_INSS/ })).toBeVisible();
});

test('recomputes when an input changes', async ({ page }) => {
  const salary = page.getByRole('spinbutton', { name: 'SALARIO_BASE' });
  await salary.fill('3000');
  await page.getByRole('spinbutton', { name: 'TEM_PERICULOSIDADE' }).fill('0');
  await page.getByRole('spinbutton', { name: 'HORAS_EXTRAS' }).fill('0');

  await expect(net(page)).toHaveText(/2\.746,59/);
});

test('points at formula errors and recovers once fixed', async ({ page }) => {
  const formula = page.getByLabel('Fórmula de IRRF');
  await formula.fill('arred(faixa(BASE_IRF, IRRF_2025), 2)');

  await expect(page.getByRole('alert')).toContainText("Você quis dizer 'BASE_IRRF'?");
  await expect(page.locator('mark')).toHaveText('BASE_IRF');
  await expect(page.getByText('Mostrando o último cálculo válido.')).toBeVisible();

  await formula.fill('0');
  await expect(net(page)).toHaveText(/8\.074,52/);
});

test('detects circular dependencies', async ({ page }) => {
  await page.getByLabel('Fórmula de SALARIO').fill('SALARIO_BASE + INSS');

  await expect(page.getByRole('alert').first()).toContainText('Dependência circular: SALARIO → INSS');
});

test('plots the net curve with a hover tooltip', async ({ page }) => {
  const chart = page.getByRole('img', { name: 'Bruto e líquido' });
  await expect(chart).toBeVisible();

  await chart.hover();

  await expect(page.getByRole('status').first()).toContainText('Líquido');
});

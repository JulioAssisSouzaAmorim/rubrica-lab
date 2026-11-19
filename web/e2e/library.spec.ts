import { expect, test } from './fixtures';

const unique = () => `E2E_${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1000)}`;

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('net')).toHaveText(/6\.814,89/);
});

test('saves a new rubric, reuses it and deletes it', async ({ page }) => {
  const code = unique();
  await page.getByRole('button', { name: '+ Rubrica' }).click();
  const codeField = page.getByLabel('Código da rubrica 10');
  await codeField.fill(code);
  await page.getByLabel(`Fórmula de ${code}`).fill('SALARIO_BASE * 5%');
  await expect(page.getByTestId('net')).toHaveText(/7\.139,89/);

  await page.getByRole('button', { name: `Salvar ${code} na biblioteca` }).click();
  await expect(page.getByRole('status').filter({ hasText: `${code} salva na biblioteca.` })).toBeVisible();

  const saved = page
    .getByRole('list', { name: 'Rubricas salvas' })
    .getByRole('listitem')
    .filter({ hasText: code });
  await expect(saved).toContainText('SALARIO_BASE * 5%');

  await page.getByRole('button', { name: `Remover ${code}` }).click();
  await expect(page.getByTestId('net')).toHaveText(/6\.814,89/);
  await page.getByRole('button', { name: `Usar rubrica ${code}` }).click();
  await expect(page.getByLabel(`Fórmula de ${code}`)).toHaveValue('SALARIO_BASE * 5%');

  await page.getByRole('button', { name: `Excluir rubrica ${code}` }).click();
  await expect(saved).toHaveCount(0);
});

test('creates, saves and deletes a table', async ({ page }) => {
  const code = unique();
  await page.getByRole('button', { name: '+ Tabela' }).click();
  await page.getByLabel('Código da tabela 3').fill(code);
  await page.getByLabel(`${code} faixa 2: alíquota`).fill('12.5');

  await page.getByRole('button', { name: `Salvar tabela ${code} na biblioteca` }).click();
  const saved = page
    .getByRole('list', { name: 'Tabelas salvas' })
    .getByRole('listitem')
    .filter({ hasText: code });
  await expect(saved).toContainText('2 faixa(s)');

  await page.getByRole('button', { name: `Excluir tabela ${code}` }).click();
  await expect(saved).toHaveCount(0);
});

test('default items cannot be deleted', async ({ page }) => {
  const defaults = page
    .getByRole('list', { name: 'Rubricas salvas' })
    .getByRole('listitem')
    .filter({ hasText: 'Padrão' });
  await expect(defaults).toHaveCount(9);
  await expect(page.getByRole('button', { name: /^Excluir rubrica (INSS|IRRF|SALARIO)$/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Excluir tabela INSS_2025' })).toHaveCount(0);
});

test.describe('overwriting a default', () => {
  test.use({ allowedApiStatuses: [409] });

  test('explains why it is not allowed', async ({ page }) => {
    await page.getByRole('button', { name: 'Salvar INSS na biblioteca' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'é uma rubrica padrão' })).toBeVisible();
  });
});

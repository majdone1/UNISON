import { test, expect } from '@playwright/test';

test.describe('UNISON demo happy path', () => {
  test('login context → board → comment with mention', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /work in concert/i })).toBeVisible();

    await page.getByTestId('cta-open-demo').click();
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole('heading', { name: /acme collective/i })).toBeVisible();

    await page.getByRole('link', { name: /boards/i }).first().click();
    await expect(page.getByRole('heading', { name: /^boards$/i })).toBeVisible();

    await page.getByRole('link', { name: /launch orchestration/i }).click();
    await expect(page.getByRole('heading', { name: /launch orchestration/i })).toBeVisible();

    const itemButton = page.getByRole('button', { name: /finalize board templates/i }).first();
    await itemButton.click();

    await page.getByRole('button', { name: /^updates$/i }).click();
    await page.getByPlaceholder(/write an update/i).fill('E2E note for @Jordan Lee');
    await page.getByRole('button', { name: /post update/i }).click();
    await expect(page.getByText(/E2E note for @Jordan Lee/i)).toBeVisible();
  });

  test('board grid spreadsheet + comment reply thread', async ({ page }) => {
    await page.goto('/app/boards');
    await page.getByRole('link', { name: /launch orchestration/i }).click();
    await expect(page.getByRole('grid', { name: /board spreadsheet/i })).toBeVisible();

    await page.getByRole('button', { name: /wire rls/i }).first().click();
    await page.getByRole('button', { name: /^updates$/i }).click();
    await page.getByRole('button', { name: /^reply$/i }).first().click();
    const replyText = `E2E reply ${Date.now()}`;
    await page.getByPlaceholder(/write a reply/i).fill(replyText);
    await page.getByRole('button', { name: /post reply/i }).click();
    await expect(page.getByText(replyText)).toBeVisible();
  });

  test('board → add subitem', async ({ page }) => {
    await page.goto('/app/boards');
    await page.getByRole('link', { name: /launch orchestration/i }).click();
    await expect(page.getByRole('heading', { name: /launch orchestration/i })).toBeVisible();

    await page.getByRole('button', { name: /finalize board templates/i }).first().click();
    await expect(page.getByRole('heading', { name: /subitems/i })).toBeVisible();

    const subName = `E2E subitem ${Date.now()}`;
    await page.getByPlaceholder(/add subitem/i).fill(subName);
    await page.getByRole('button', { name: /add subitem/i }).click();
    await expect(page.getByRole('button', { name: subName, exact: true })).toBeVisible();
  });
});

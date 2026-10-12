import { test, expect } from '@playwright/test';

test.describe('Dual-Source Ingestion & Account Versions E2E UX', () => {
  test('Upload modal opens with Dual-Source tab and dropzone', async ({ page }) => {
    await page.goto('/');

    // Click Topbar Upload button
    await page.click('button:has-text("Upload")');

    // Verify modal header has Dual-Source and Vision Only tabs
    const dualSourceTab = page.locator('[data-testid="tab-dual-source"]');
    await expect(dualSourceTab).toBeVisible();

    const visionTab = page.locator('[data-testid="tab-vision-only"]');
    await expect(visionTab).toBeVisible();

    // Verify Dual-Source dropzone is rendered
    const dropzone = page.locator('[data-testid="dual-source-dropzone"]');
    await expect(dropzone).toBeVisible();
    await expect(dropzone).toContainText('Drag & Drop Brokerage Files Here');

    // Toggle to Vision Only
    await visionTab.click();
    await expect(page.locator('text=Upload First Screenshot')).toBeVisible();

    // Toggle back to Dual-Source
    await dualSourceTab.click();
    await expect(dropzone).toBeVisible();
  });

  test('History view displays Account Versions & Rollback tab', async ({ page }) => {
    await page.goto('/');

    // Navigate to History view
    await page.click('button:has-text("History")');

    // Verify sub-tabs
    const versionsTab = page.locator('[data-testid="history-tab-versions"]');
    await expect(versionsTab).toBeVisible();

    // Click Versions tab
    await versionsTab.click();

    // Verify Versions Rollback container
    await expect(page.locator('text=Account Ingestion Versions & 1-Click Rollback')).toBeVisible();
  });

  test('Calendar view preserves Options Expirations and Fixed Income toggle', async ({ page }) => {
    await page.goto('/');

    // Navigate to Calendar
    await page.click('button:has-text("Calendar")');

    // Verify calendar options toggle exists
    const optionsToggle = page.locator('text=Options Expirations');
    await expect(optionsToggle).toBeVisible();

    const fixedIncomeToggle = page.locator('text=Fixed Income');
    await expect(fixedIncomeToggle).toBeVisible();
  });
});

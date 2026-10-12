import { test, expect } from '@playwright/test';

test.describe('Upload Validation Modal UX', () => {

  test('Zoom controls are pinned and do not overlap image', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Upload")');
    
    // Assert the menu is in the fixed header, NOT the scrollable container
    const scrollContainer = page.locator('.overflow-auto').first();
    const zoomMenu = page.locator('button[title="Zoom In"]').locator('..');
    
    // Scroll the image down
    await scrollContainer.evaluate(node => node.scrollTop = 500);
    
    // The zoom menu must remain fully visible and structurally above the image
    await expect(zoomMenu).toBeInViewport();
    const menuBox = await zoomMenu.boundingBox();
    const imageBox = await page.locator('img[alt="Screenshot 1"]').boundingBox();
    
    if (menuBox && imageBox) {
      expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(imageBox.y);
    }
  });

  test('Chatbot is a floating popover that does not crush table height', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Upload")');
    
    // Table should have full height initially
    const tableContainer = page.locator('table').locator('..');
    const initialBox = await tableContainer.boundingBox();
    const initialHeight = initialBox ? initialBox.height : 0;
    
    // Open the Chatbot
    await page.click('button:has-text("Ask AI")');
    const chatbotPopover = page.locator('text=BunBau AI Agent').locator('..').locator('..');
    
    // Assert Chatbot is floating (absolute/fixed) and table height is untouched
    await expect(chatbotPopover).toHaveCSS('position', 'absolute');
    const newBox = await tableContainer.boundingBox();
    const newHeight = newBox ? newBox.height : 0;
    expect(newHeight).toBeCloseTo(initialHeight, 1);
  });
});

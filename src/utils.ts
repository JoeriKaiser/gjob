import { Page } from 'playwright';

export const refuseConsentPopup = async (page: Page) => {
  const refuseButton = page.locator('span', { hasText: /Tout refuser/i }).first();
  
  if (await refuseButton.isVisible()) {
    await refuseButton.click();
    
    await page.waitForNavigation();
  }
}

export const scrollAndLoadMore = async (page: Page, scrollAttempts: number = 5) => {
  const infinityScrolling = await page.$('infinity-scrolling');
  if (!infinityScrolling) return;

  for (let i = 0; i < scrollAttempts; i++) {
      
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight)
      });

      await page.waitForTimeout(2000);
  }
};
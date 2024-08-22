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
      // await page.evaluate((element) => {
      //     element.scrollTo(0, element.scrollHeight);
      // }, infinityScrolling);
      
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight)
      });

      // Wait for potential new content to load
      await page.waitForTimeout(2000); // Adjust timeout as needed

      // Check if new content was loaded
      const newContentLoaded = await page.evaluate(() => {
          const previousHeight = document.body.scrollHeight;
          document.body.scrollTo(0, document.body.scrollHeight);
          console.log(document.body.scrollHeight > previousHeight)
          return document.body.scrollHeight > previousHeight;
      }, infinityScrolling);

      console.log(newContentLoaded);

      // if (!newContentLoaded) break; // Stop if no new content was loaded
  }
};
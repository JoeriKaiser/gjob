import { PlaywrightCrawler, Dataset } from 'crawlee';

import { refuseConsentPopup, scrollAndLoadMore } from './utils.js';
import { Job } from './types.js';

const crawler = new PlaywrightCrawler({
  async requestHandler({ page }) {

    await refuseConsentPopup(page);

    const pageAmount = process.argv.slice(3)[0];
    await scrollAndLoadMore(page, Number(pageAmount) ?? 1);

    await page.screenshot({ path: 'screenshot.png', fullPage: true });

    const getJobListings = `
    (listings) => {
      const jobs = [];
      const seenJobs = new Set();
    
      const extractJobInfo = (listing) => {
        const title = listing.querySelector('div > div > div > div > a > span:nth-child(2) > div > div > div:nth-child(1)')?.textContent?.trim() || '';
        const company = listing.querySelector('div > div > div > div > a > span:nth-child(2) > div > div > div:nth-child(2)')?.textContent?.trim() || '';
        const location = listing.querySelector('div > div > div > div > a > span:nth-child(2) > div > div > div:nth-child(3)')?.textContent?.trim() || '';
    
        const details = Array.from(listing.querySelectorAll('div > div > div > div > a > span:nth-child(2) > div:nth-child(2) > div')).map(detail => detail?.textContent?.trim());
        const posted = details[0] || '';
        const jobType = details[1] || '';
    
        return { title, company, location, posted, jobType };
      };
    
      const processListings = (currentListings) => {
        currentListings.forEach(listing => {
          const job = extractJobInfo(listing);
          const jobKey = JSON.stringify(job);
          if (!seenJobs.has(jobKey)) {
            jobs.push(job);
            seenJobs.add(jobKey);
          }
        });
    
        const lastJobElement = currentListings[currentListings.length - 1];
        const nestedListings = lastJobElement?.querySelectorAll('div > div > div');
        if (nestedListings?.length > 0) {
          processListings(Array.from(nestedListings));
        }
      };
    
      processListings(listings);
      return jobs;
    }`;

    await page.evaluate(`window.getJobListings = ${getJobListings}`);

    const jobListings = await page.$$eval('infinity-scrolling > div > div > div', (listings) => {
      const allJobs: Array<Job> = window.getJobListings(listings);

      return allJobs.filter(job => job.title && job.company);
    });

    await Dataset.pushData(jobListings);

    await Dataset.exportToCSV('OUTPUT');

  },
  async failedRequestHandler({ request }) {
    await Dataset.pushData({
      url: request.url,
      succeeded: false,
      data: null,
      errors: request.errorMessages,
      created_time: new Date(),
    })
  },
});

const keyword = process.argv.slice(2)[0];

if (keyword) {
  await crawler.addRequests([`https://www.google.com/search?q=${keyword}&ibp=htl;jobs`]);
  await crawler.run();
} else {
  console.log('No keyword provided');
}

console.log('Scraping completed. Data saved to key_value_stores/default/OUTPUT.csv');
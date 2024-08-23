import { PlaywrightCrawler, Dataset } from 'crawlee';
import { refuseConsentPopup, scrollAndLoadMore } from './utils.js';
import { Job } from './types.js';

const searchTerm = 'software engineer';

const crawler = new PlaywrightCrawler({
  async requestHandler({ page, request }) {

    await refuseConsentPopup(page);

    await scrollAndLoadMore(page, 1);

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

  await Dataset.pushData({
      title: await page.title(),
      url: request.url,
      data: jobListings,
      succeeded: true,
      created_time: new Date(),
  })

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

await crawler.addRequests(['https://www.google.com/search?q=aide soignant paris&ibp=htl;jobs']);

await crawler.run();

console.log('Scraping completed. Data saved to google_jobs.csv');
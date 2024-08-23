export {};

declare global {
  interface Window {
    getJobListings: (listings: any) => [];
  }
}
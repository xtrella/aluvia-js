// Mock node-fetch for Jest testing
module.exports = {
  default: globalThis.fetch || function mockFetch() {
    throw new Error('Fetch not available in test environment');
  }
};
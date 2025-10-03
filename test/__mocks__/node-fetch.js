// Mock node-fetch for Jest testing
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockFetch = function mockFetch(url, options) {
  // Simple mock that returns a resolved promise
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(""),
    headers: new Map(),
  });
};

module.exports = {
  default: globalThis.fetch || mockFetch,
};

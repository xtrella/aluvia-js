// Universal fetch implementation for Node.js and browser
let _fetch: typeof fetch;

// Initialize fetch polyfill for Node.js < 18
async function initializeFetch(): Promise<typeof fetch> {
  if (_fetch) return _fetch;

  if (typeof globalThis.fetch !== "undefined") {
    // Browser or Node.js 18+ with native fetch
    _fetch = globalThis.fetch;
  } else {
    // Node.js < 18, use node-fetch polyfill
    const { default: nodeFetch } = await import("node-fetch");
    _fetch = nodeFetch as unknown as typeof fetch;
  }

  return _fetch;
}

export { initializeFetch };

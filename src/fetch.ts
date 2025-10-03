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
    try {
      const { default: nodeFetch } = await import("node-fetch");
      _fetch = nodeFetch as unknown as typeof fetch;
    } catch (error) {
      // Fallback for test environments or when node-fetch is not available
      throw new Error("Fetch is not available. Please use Node.js 18+ or install node-fetch.");
    }
  }

  return _fetch;
}

export { initializeFetch };

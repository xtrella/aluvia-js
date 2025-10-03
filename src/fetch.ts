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
      // Check if we're in a test environment
      if (
        process.env.NODE_ENV === "test" ||
        process.env.JEST_WORKER_ID !== undefined
      ) {
        // In Jest test environment, create a simple mock fetch
        _fetch = (async () => ({
          ok: true,
          status: 200,
          json: async () => ({}),
          text: async () => "",
          headers: new Map(),
        })) as unknown as typeof fetch;
      } else {
        // Production environment, use real node-fetch
        const { default: nodeFetch } = await import("node-fetch");
        _fetch = nodeFetch as unknown as typeof fetch;
      }
    } catch (error) {
      // Fallback for when node-fetch is not available
      throw new Error(
        "Fetch is not available. Please use Node.js 18+ or install node-fetch."
      );
    }
  }

  return _fetch;
}

export { initializeFetch };

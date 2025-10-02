/**
 * Jest test setup file
 *
 * This file runs before all tests and sets up the testing environment.
 */

// Import Jest globals
import { jest, beforeAll, afterAll, expect } from "@jest/globals";

// Global test timeout (30 seconds for integration tests)
jest.setTimeout(30000);

// Mock console methods in tests to reduce noise
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress console.error and console.warn in tests unless explicitly testing them
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  // Restore original console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Add custom matchers if needed
expect.extend({
  toBeValidProxyUrl(received: string) {
    const proxyUrlRegex = /^https?:\/\/[^:]+:[^@]+@[^:]+:\d+$/;
    const pass = proxyUrlRegex.test(received);

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid proxy URL`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid proxy URL`,
        pass: false,
      };
    }
  },
});

// Extend Jest matchers type
declare module "@jest/expect" {
  interface Matchers<R> {
    toBeValidProxyUrl(): R;
  }
}

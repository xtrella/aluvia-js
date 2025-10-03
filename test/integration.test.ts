/**
 * Basic integration tests for the Aluvia SDK
 */

import { describe, it, expect } from "@jest/globals";
import Aluvia, { Proxy } from "../src/index";
import { api } from "../src/api-client";
import { initializeFetch } from "../src/fetch";

describe("Aluvia SDK Integration", () => {
  it("should be able to import the SDK", () => {
    expect(Aluvia).toBeDefined();
    expect(typeof Aluvia).toBe("function");
  });

  it("should create SDK instance with valid token", () => {
    const sdk = new Aluvia("test-token-123");
    expect(sdk).toBeDefined();
    expect(sdk).toBeInstanceOf(Aluvia);
  });

  it("should throw error with invalid token", () => {
    expect(() => new Aluvia("")).toThrow("API token cannot be empty");
    expect(() => new Aluvia("   ")).toThrow("API token cannot be empty");
  });

  it("should be able to import Proxy class", () => {
    expect(Proxy).toBeDefined();
    expect(typeof Proxy).toBe("function");
  });

  it("should be able to import API client", () => {
    expect(api).toBeDefined();
  });

  it("should be able to initialize fetch polyfill", async () => {
    // This test should work whether we have native fetch or need to polyfill
    if (typeof globalThis.fetch !== "undefined") {
      // Node.js 18+ with native fetch - should return native fetch
      const fetch = await initializeFetch();
      expect(typeof fetch).toBe("function");
      expect(fetch).toBe(globalThis.fetch);
    } else {
      // Node.js < 18 - should return polyfilled fetch
      const fetch = await initializeFetch();
      expect(typeof fetch).toBe("function");
    }
  });
});

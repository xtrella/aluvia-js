/**
 * Unit tests for the Proxy class
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { Proxy, Aluvia, ProxyCredential, ProxyConfig } from "../src/index.js";

describe("Proxy", () => {
  let mockSdk: jest.Mocked<Aluvia>;
  let mockCredential: ProxyCredential;
  let mockConfig: ProxyConfig;
  let proxy: Proxy;

  beforeEach(() => {
    // Create mock SDK
    mockSdk = {
      delete: jest.fn(),
    } as any;

    // Create test credential
    mockCredential = {
      username: "testuser123",
      password: "testpass456",
      stickyEnabled: false,
      smartRoutingEnabled: false,
    };

    // Create test config
    mockConfig = {
      host: "proxy.aluvia.io",
      httpPort: 8080,
    };

    // Create proxy instance
    proxy = new Proxy(mockCredential, mockConfig, mockSdk);
  });

  describe("constructor", () => {
    it("should create a proxy instance with correct properties", () => {
      expect(proxy).toBeInstanceOf(Proxy);
      expect(proxy.info.username).toBe("testuser123");
      expect(proxy.info.password).toBe("testpass456");
      expect(proxy.info.host).toBe("proxy.aluvia.io");
      expect(proxy.info.httpPort).toBe(8080);
    });
  });

  describe("enableSticky", () => {
    it("should enable sticky sessions and generate session salt", () => {
      const result = proxy.enableSticky();

      expect(result).toBe(proxy); // Should return this for chaining
      expect(proxy.info.stickyEnabled).toBe(true);
      expect(proxy.info.username).toMatch(/testuser123-session-[a-zA-Z0-9]{8}/);
    });

    it("should generate different session salts on multiple calls", () => {
      proxy.enableSticky();
      const firstUsername = proxy.info.username;

      proxy.enableSticky();
      const secondUsername = proxy.info.username;

      expect(firstUsername).not.toBe(secondUsername);
    });
  });

  describe("enableSmartRouting", () => {
    it("should enable smart routing and add routing suffix", () => {
      const result = proxy.enableSmartRouting();

      expect(result).toBe(proxy); // Should return this for chaining
      expect(proxy.info.smartRoutingEnabled).toBe(true);
      expect(proxy.info.username).toBe("testuser123-routing-smart");
    });
  });

  describe("disableSticky", () => {
    it("should disable sticky sessions and remove session suffix", () => {
      proxy.enableSticky();
      expect(proxy.info.stickyEnabled).toBe(true);

      const result = proxy.disableSticky();

      expect(result).toBe(proxy); // Should return this for chaining
      expect(proxy.info.stickyEnabled).toBe(false);
      expect(proxy.info.username).toBe("testuser123");
    });
  });

  describe("disableSmartRouting", () => {
    it("should disable smart routing and remove routing suffix", () => {
      proxy.enableSmartRouting();
      expect(proxy.info.smartRoutingEnabled).toBe(true);

      const result = proxy.disableSmartRouting();

      expect(result).toBe(proxy); // Should return this for chaining
      expect(proxy.info.smartRoutingEnabled).toBe(false);
      expect(proxy.info.username).toBe("testuser123");
    });
  });

  describe("method chaining", () => {
    it("should support method chaining with multiple features", () => {
      proxy.enableSticky().enableSmartRouting();

      expect(proxy.info.stickyEnabled).toBe(true);
      expect(proxy.info.smartRoutingEnabled).toBe(true);
      expect(proxy.info.username).toMatch(
        /testuser123-session-[a-zA-Z0-9]{8}-routing-smart/
      );
    });

    it("should handle enabling and disabling features in sequence", () => {
      proxy.enableSticky().enableSmartRouting().disableSticky();

      expect(proxy.info.stickyEnabled).toBe(false);
      expect(proxy.info.smartRoutingEnabled).toBe(true);
      expect(proxy.info.username).toBe("testuser123-routing-smart");
    });
  });

  describe("url", () => {
    it("should generate correct HTTP proxy URL", () => {
      const url = proxy.url("http");
      expect(url).toBe("http://testuser123:testpass456@proxy.aluvia.io:8080");
    });

    it("should generate correct HTTPS proxy URL", () => {
      const url = proxy.url("https" as any);
      expect(url).toBe("https://testuser123:testpass456@proxy.aluvia.io:8080");
    });

    it("should default to HTTP protocol", () => {
      const url = proxy.url();
      expect(url).toBe("http://testuser123:testpass456@proxy.aluvia.io:8080");
    });

    it("should include session salt in URL when sticky is enabled", () => {
      proxy.enableSticky();
      const url = proxy.url();
      expect(url).toMatch(
        /^http:\/\/testuser123-session-[a-zA-Z0-9]{8}:testpass456@proxy\.aluvia\.io:8080$/
      );
    });

    it("should include smart routing suffix in URL when enabled", () => {
      proxy.enableSmartRouting();
      const url = proxy.url();
      expect(url).toBe(
        "http://testuser123-routing-smart:testpass456@proxy.aluvia.io:8080"
      );
    });

    it("should be a valid proxy URL format", () => {
      const url = proxy.url();
      expect(url).toMatch(/^http:\/\/[^:]+:[^@]+@[^:]+:\d+$/);
    });
  });

  describe("delete", () => {
    it("should call SDK delete method with correct username", async () => {
      mockSdk.delete.mockResolvedValue(true);

      const result = await proxy.delete();

      expect(mockSdk.delete).toHaveBeenCalledWith("testuser123");
      expect(result).toBe(true);
    });

    it("should propagate deletion failures", async () => {
      mockSdk.delete.mockRejectedValue(new Error("Deletion failed"));

      await expect(proxy.delete()).rejects.toThrow("Deletion failed");
    });
  });

  describe("info getter", () => {
    it("should return comprehensive proxy information", () => {
      const info = proxy.info;

      expect(info).toEqual({
        username: "testuser123",
        password: "testpass456",
        host: "proxy.aluvia.io",
        httpPort: 8080,
        stickyEnabled: false,
        smartRoutingEnabled: false,
      });
    });

    it("should reflect current feature states", () => {
      proxy.enableSticky().enableSmartRouting();

      const info = proxy.info;

      expect(info.stickyEnabled).toBe(true);
      expect(info.smartRoutingEnabled).toBe(true);
      expect(info.username).toMatch(
        /testuser123-session-[a-zA-Z0-9]{8}-routing-smart/
      );
    });
  });

  describe("username formatting", () => {
    it("should handle usernames with existing suffixes", () => {
      const credentialWithSuffixes = {
        ...mockCredential,
        username: "testuser123-session-old123-routing-smart",
      };

      const proxyWithSuffixes = new Proxy(
        credentialWithSuffixes,
        mockConfig,
        mockSdk
      );
      proxyWithSuffixes.enableSticky();

      // Should strip old suffixes and add new ones
      expect(proxyWithSuffixes.info.username).toMatch(
        /^testuser123-session-[a-zA-Z0-9]{8}$/
      );
    });

    it("should preserve base username when toggling features", () => {
      proxy
        .enableSticky()
        .disableSticky()
        .enableSmartRouting()
        .disableSmartRouting();

      expect(proxy.info.username).toBe("testuser123");
    });
  });
});

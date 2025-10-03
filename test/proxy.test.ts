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
      update: jest.fn(),
      usage: jest.fn(),
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
      httpsPort: 8443,
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
      expect(proxy.info.httpsPort).toBe(8443);
    });
  });

  describe("enableSticky", () => {
    beforeEach(() => {
      mockSdk.update.mockResolvedValue(proxy);
    });

    it("should enable sticky sessions and generate session salt", async () => {
      const result = await proxy.enableSticky();

      expect(result).toBe(proxy); // Should return this for chaining
      expect(proxy.info.stickyEnabled).toBe(true);
      expect(proxy.info.username).toMatch(/testuser123-session-[a-zA-Z0-9]{8}/);
      expect(mockSdk.update).toHaveBeenCalled();
    });

    it("should generate different session salts on multiple calls", async () => {
      await proxy.enableSticky();
      const firstUsername = proxy.info.username;

      await proxy.enableSticky();
      const secondUsername = proxy.info.username;

      expect(firstUsername).not.toBe(secondUsername);
      expect(mockSdk.update).toHaveBeenCalledTimes(2);
    });

    it("should propagate update failures", async () => {
      mockSdk.update.mockRejectedValue(new Error("Network error"));

      await expect(proxy.enableSticky()).rejects.toThrow("Network error");
    });
  });

  describe("enableSmartRouting", () => {
    beforeEach(() => {
      mockSdk.update.mockResolvedValue(proxy);
    });

    it("should enable smart routing and add routing suffix", async () => {
      const result = await proxy.enableSmartRouting();

      expect(result).toBe(proxy); // Should return this for chaining
      expect(proxy.info.smartRoutingEnabled).toBe(true);
      expect(proxy.info.username).toBe("testuser123-routing-smart");
      expect(mockSdk.update).toHaveBeenCalled();
    });

    it("should propagate update failures", async () => {
      mockSdk.update.mockRejectedValue(new Error("API error"));

      await expect(proxy.enableSmartRouting()).rejects.toThrow("API error");
    });
  });

  describe("disableSticky", () => {
    beforeEach(() => {
      mockSdk.update.mockResolvedValue(proxy);
    });

    it("should disable sticky sessions and remove session suffix", async () => {
      // Enable first
      await proxy.enableSticky();
      expect(proxy.info.stickyEnabled).toBe(true);

      const result = await proxy.disableSticky();

      expect(result).toBe(proxy); // Should return this for chaining
      expect(proxy.info.stickyEnabled).toBe(false);
      expect(proxy.info.username).toBe("testuser123");
      expect(mockSdk.update).toHaveBeenCalledTimes(2); // Once for enable, once for disable
    });

    it("should propagate update failures", async () => {
      mockSdk.update.mockRejectedValue(new Error("Disable failed"));

      await expect(proxy.disableSticky()).rejects.toThrow("Disable failed");
    });
  });

  describe("disableSmartRouting", () => {
    beforeEach(() => {
      mockSdk.update.mockResolvedValue(proxy);
    });

    it("should disable smart routing and remove routing suffix", async () => {
      // Enable first
      await proxy.enableSmartRouting();
      expect(proxy.info.smartRoutingEnabled).toBe(true);

      const result = await proxy.disableSmartRouting();

      expect(result).toBe(proxy); // Should return this for chaining
      expect(proxy.info.smartRoutingEnabled).toBe(false);
      expect(proxy.info.username).toBe("testuser123");
      expect(mockSdk.update).toHaveBeenCalledTimes(2);
    });

    it("should propagate update failures", async () => {
      mockSdk.update.mockRejectedValue(new Error("Routing disable failed"));

      await expect(proxy.disableSmartRouting()).rejects.toThrow(
        "Routing disable failed"
      );
    });
  });

  describe("method chaining", () => {
    beforeEach(() => {
      mockSdk.update.mockResolvedValue(proxy);
    });

    it("should support method chaining with multiple features", async () => {
      const result = await proxy.enableSticky();
      await result.enableSmartRouting();

      expect(proxy.info.stickyEnabled).toBe(true);
      expect(proxy.info.smartRoutingEnabled).toBe(true);
      expect(proxy.info.username).toMatch(
        /testuser123-session-[a-zA-Z0-9]{8}-routing-smart/
      );
      expect(mockSdk.update).toHaveBeenCalledTimes(2);
    });

    it("should handle enabling and disabling features in sequence", async () => {
      await proxy.enableSticky();
      await proxy.enableSmartRouting();
      await proxy.disableSticky();

      expect(proxy.info.stickyEnabled).toBe(false);
      expect(proxy.info.smartRoutingEnabled).toBe(true);
      expect(proxy.info.username).toBe("testuser123-routing-smart");
      expect(mockSdk.update).toHaveBeenCalledTimes(3);
    });
  });

  describe("url", () => {
    it("should generate correct HTTP proxy URL", () => {
      const url = proxy.url("http");
      expect(url).toBe("http://testuser123:testpass456@proxy.aluvia.io:8080");
    });

    it("should generate correct HTTPS proxy URL", () => {
      const url = proxy.url("https" as any);
      expect(url).toBe("https://testuser123:testpass456@proxy.aluvia.io:8443");
    });

    it("should default to HTTP protocol", () => {
      const url = proxy.url();
      expect(url).toBe("http://testuser123:testpass456@proxy.aluvia.io:8080");
    });

    it("should include session salt in URL when sticky is enabled", async () => {
      mockSdk.update.mockResolvedValue(proxy);
      await proxy.enableSticky();

      const url = proxy.url();
      expect(url).toMatch(
        /^http:\/\/testuser123-session-[a-zA-Z0-9]{8}:testpass456@proxy\.aluvia\.io:8080$/
      );
    });

    it("should include smart routing suffix in URL when enabled", async () => {
      mockSdk.update.mockResolvedValue(proxy);
      await proxy.enableSmartRouting();

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
      mockSdk.delete.mockResolvedValue(undefined);

      const result = await proxy.delete();

      expect(mockSdk.delete).toHaveBeenCalledWith("testuser123");
      expect(result).toBe(undefined);
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
        httpsPort: 8443,
        stickyEnabled: false,
        smartRoutingEnabled: false,
      });
    });

    it("should reflect current feature states", async () => {
      mockSdk.update.mockResolvedValue(proxy);
      await proxy.enableSticky();
      await proxy.enableSmartRouting();

      const info = proxy.info;

      expect(info.stickyEnabled).toBe(true);
      expect(info.smartRoutingEnabled).toBe(true);
      expect(info.username).toMatch(
        /testuser123-session-[a-zA-Z0-9]{8}-routing-smart/
      );
    });
  });

  describe("username formatting", () => {
    beforeEach(() => {
      mockSdk.update.mockResolvedValue(proxy);
    });

    it("should handle usernames with existing suffixes", async () => {
      const credentialWithSuffixes = {
        ...mockCredential,
        username: "testuser123-session-old123-routing-smart",
      };

      const proxyWithSuffixes = new Proxy(
        credentialWithSuffixes,
        mockConfig,
        mockSdk
      );
      await proxyWithSuffixes.enableSticky();

      // Should strip old suffixes and add new ones
      expect(proxyWithSuffixes.info.username).toMatch(
        /^testuser123-session-[a-zA-Z0-9]{8}$/
      );
    });

    it("should preserve base username when toggling features", async () => {
      await proxy.enableSticky();
      await proxy.disableSticky();
      await proxy.enableSmartRouting();
      await proxy.disableSmartRouting();

      expect(proxy.info.username).toBe("testuser123");
      expect(mockSdk.update).toHaveBeenCalledTimes(4);
    });
  });

  describe("feature state management", () => {
    beforeEach(() => {
      mockSdk.update.mockResolvedValue(proxy);
    });

    it("should maintain independent feature states", async () => {
      // Enable both features
      await proxy.enableSticky();
      await proxy.enableSmartRouting();

      expect(proxy.info.stickyEnabled).toBe(true);
      expect(proxy.info.smartRoutingEnabled).toBe(true);

      // Disable only sticky
      await proxy.disableSticky();

      expect(proxy.info.stickyEnabled).toBe(false);
      expect(proxy.info.smartRoutingEnabled).toBe(true);
      expect(proxy.info.username).toBe("testuser123-routing-smart");
    });

    it("should generate new session salt on re-enable", async () => {
      await proxy.enableSticky();
      const firstUsername = proxy.info.username;

      await proxy.disableSticky();
      await proxy.enableSticky();
      const secondUsername = proxy.info.username;

      expect(firstUsername).not.toBe(secondUsername);
      expect(mockSdk.update).toHaveBeenCalledTimes(3);
    });
  });

  describe("error handling", () => {
    it("should handle concurrent feature operations", async () => {
      mockSdk.update.mockResolvedValue(proxy);

      // Simulate concurrent operations
      const promises = [proxy.enableSticky(), proxy.enableSmartRouting()];

      await Promise.all(promises);

      expect(proxy.info.stickyEnabled).toBe(true);
      expect(proxy.info.smartRoutingEnabled).toBe(true);
      expect(mockSdk.update).toHaveBeenCalledTimes(2);
    });

    it("should maintain state consistency on update failure", async () => {
      mockSdk.update.mockRejectedValue(new Error("Network failure"));

      await expect(proxy.enableSticky()).rejects.toThrow("Network failure");

      // State should still be updated locally even if sync fails
      expect(proxy.info.stickyEnabled).toBe(true);
      expect(proxy.info.username).toMatch(/testuser123-session-[a-zA-Z0-9]{8}/);
    });
  });

  describe("usage", () => {
    const mockUsageData = {
      usageStart: 1705478400,
      usageEnd: 1706083200,
      dataUsed: 1.8,
    };

    it("should call SDK usage method without options", async () => {
      mockSdk.usage.mockResolvedValue(mockUsageData);

      const usage = await proxy.usage();

      expect(mockSdk.usage).toHaveBeenCalledWith("testuser123", undefined);
      expect(usage.dataUsed).toBe(1.8);
    });

    it("should call SDK usage method with date range options", async () => {
      mockSdk.usage.mockResolvedValue(mockUsageData);

      const options = {
        usageStart: 1705478400,
        usageEnd: 1706083200,
      };

      const usage = await proxy.usage(options);

      expect(mockSdk.usage).toHaveBeenCalledWith("testuser123", options);
      expect(usage.dataUsed).toBe(1.8);
    });

    it("should propagate usage request failures", async () => {
      mockSdk.usage.mockRejectedValue(new Error("Usage request failed"));

      await expect(proxy.usage()).rejects.toThrow("Usage request failed");
    });

    it("should handle partial date options", async () => {
      mockSdk.usage.mockResolvedValue(mockUsageData);

      await proxy.usage({ usageStart: 1705478400 });
      expect(mockSdk.usage).toHaveBeenCalledWith("testuser123", {
        usageStart: 1705478400,
      });
    });
  });
});

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
      getUsage: jest.fn(),
    } as any;

    // Create test credential
    mockCredential = {
      username: "testuser123",
      password: "testpass456",
      useSticky: false,
      useSmartRouting: false,
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
      expect(proxy.toJSON()).toMatchObject({
        username: "testuser123",
        password: "testpass456",
        host: "proxy.aluvia.io",
        httpPort: 8080,
        httpsPort: 8443,
        useSticky: false,
        useSmartRouting: false,
      });
    });
  });

  describe("useSticky property", () => {
    it("should get and set useSticky property", () => {
      expect(proxy.useSticky).toBe(false);

      proxy.useSticky = true;
      expect(proxy.useSticky).toBe(true);

      proxy.useSticky = false;
      expect(proxy.useSticky).toBe(false);
    });
  });

  describe("save", () => {
    beforeEach(() => {
      mockSdk.update.mockResolvedValue(proxy);
    });

    it("should save sticky sessions and generate session salt", async () => {
      proxy.useSticky = true;
      await proxy.save();

      expect(proxy.useSticky).toBe(true);
      expect(proxy.username).toMatch(/testuser123-session-[a-zA-Z0-9]{8}/);
      expect(mockSdk.update).toHaveBeenCalled();
    });

    it("should generate different session salts on multiple saves", async () => {
      proxy.useSticky = true;
      await proxy.save();
      const firstUsername = proxy.username;

      proxy.useSticky = false;
      proxy.useSticky = true;
      await proxy.save();
      const secondUsername = proxy.username;

      expect(firstUsername).not.toBe(secondUsername);
      expect(mockSdk.update).toHaveBeenCalledTimes(2);
    });

    it("should propagate update failures", async () => {
      mockSdk.update.mockRejectedValue(new Error("Network error"));
      proxy.useSticky = true;

      await expect(proxy.save()).rejects.toThrow("Network error");
    });
  });

  describe("useSmartRouting property", () => {
    it("should get and set useSmartRouting property", () => {
      expect(proxy.useSmartRouting).toBe(false);

      proxy.useSmartRouting = true;
      expect(proxy.useSmartRouting).toBe(true);

      proxy.useSmartRouting = false;
      expect(proxy.useSmartRouting).toBe(false);
    });

    it("should save smart routing and add routing suffix", async () => {
      mockSdk.update.mockResolvedValue(proxy);
      proxy.useSmartRouting = true;
      await proxy.save();

      expect(proxy.useSmartRouting).toBe(true);
      expect(proxy.username).toBe("testuser123-routing-smart");
      expect(mockSdk.update).toHaveBeenCalled();
    });
  });

  describe("disable functionality", () => {
    beforeEach(() => {
      mockSdk.update.mockResolvedValue(proxy);
    });

    it("should disable sticky sessions and remove session suffix", async () => {
      // First enable it
      proxy.useSticky = true;
      await proxy.save();

      // Then disable it
      proxy.useSticky = false;
      await proxy.save();

      expect(proxy.useSticky).toBe(false);
      expect(proxy.username).toBe("testuser123");
      expect(mockSdk.update).toHaveBeenCalledTimes(2); // Once for enable, once for disable
    });
  });

  describe("smartRoutingEnabled property", () => {
    beforeEach(() => {
      mockSdk.update.mockResolvedValue(proxy);
    });

    it("should disable smart routing and remove routing suffix", async () => {
      // Enable first
      proxy.useSmartRouting = true;
      await proxy.save();
      expect(proxy.useSmartRouting).toBe(true);

      proxy.useSmartRouting = false;
      await proxy.save();

      expect(proxy.useSmartRouting).toBe(false);
      expect(proxy.username).toBe("testuser123");
      expect(mockSdk.update).toHaveBeenCalledTimes(2);
    });

    it("should propagate update failures", async () => {
      mockSdk.update.mockRejectedValue(new Error("Routing disable failed"));

      proxy.useSmartRouting = false;
      await expect(proxy.save()).rejects.toThrow("Routing disable failed");
    });
  });

  describe("property setters", () => {
    beforeEach(() => {
      mockSdk.update.mockResolvedValue(proxy);
    });

    it("should support setting multiple properties before saving", async () => {
      proxy.useSticky = true;
      proxy.useSmartRouting = true;
      await proxy.save();

      expect(proxy.useSticky).toBe(true);
      expect(proxy.useSmartRouting).toBe(true);
      expect(proxy.username).toMatch(
        /testuser123-session-[a-zA-Z0-9]{8}-routing-smart/
      );
      expect(mockSdk.update).toHaveBeenCalledTimes(1); // Only one save call
    });

    it("should handle enabling and disabling features in sequence", async () => {
      proxy.useSticky = true;
      await proxy.save();

      proxy.useSmartRouting = true;
      await proxy.save();

      proxy.useSticky = false;
      await proxy.save();

      expect(proxy.useSticky).toBe(false);
      expect(proxy.useSmartRouting).toBe(true);
      expect(proxy.username).toBe("testuser123-routing-smart");
      expect(mockSdk.update).toHaveBeenCalledTimes(3);
    });
  });

  describe("url", () => {
    it("should generate correct HTTP proxy URL", () => {
      const url = proxy.toUrl("http");
      expect(url).toBe("http://testuser123:testpass456@proxy.aluvia.io:8080");
    });

    it("should generate correct HTTPS proxy URL", () => {
      const url = proxy.toUrl("https");
      expect(url).toBe("https://testuser123:testpass456@proxy.aluvia.io:8443");
    });

    it("should default to HTTP protocol", () => {
      const url = proxy.toUrl();
      expect(url).toBe("http://testuser123:testpass456@proxy.aluvia.io:8080");
    });

    it("should include session salt in URL when sticky is enabled", async () => {
      mockSdk.update.mockResolvedValue(proxy);
      proxy.useSticky = true;
      await proxy.save();

      const url = proxy.toUrl();
      expect(url).toMatch(
        /http:\/\/testuser123-session-[a-zA-Z0-9]{8}:testpass456@proxy\.aluvia\.io:8080/
      );
    });

    it("should include smart routing suffix in URL when enabled", async () => {
      mockSdk.update.mockResolvedValue(proxy);
      proxy.useSmartRouting = true;
      await proxy.save();

      const url = proxy.toUrl();
      expect(url).toBe(
        "http://testuser123-routing-smart:testpass456@proxy.aluvia.io:8080"
      );
    });

    it("should be a valid proxy URL format", () => {
      const url = proxy.toUrl();
      const urlObj = new URL(url);

      expect(urlObj.protocol).toBe("http:");
      expect(urlObj.hostname).toBe("proxy.aluvia.io");
      expect(urlObj.port).toBe("8080");
      expect(urlObj.username).toBe("testuser123");
      expect(urlObj.password).toBe("testpass456");
    });
  });

  describe("delete", () => {
    it("should call SDK delete method with correct username", async () => {
      mockSdk.delete.mockResolvedValue(undefined);

      await proxy.delete();

      expect(mockSdk.delete).toHaveBeenCalledWith("testuser123");
    });

    it("should propagate deletion failures", async () => {
      mockSdk.delete.mockRejectedValue(new Error("Delete failed"));

      await expect(proxy.delete()).rejects.toThrow("Delete failed");
    });
  });

  describe("toJSON method", () => {
    it("should return comprehensive proxy information", () => {
      const json = proxy.toJSON();

      expect(json).toEqual({
        username: "testuser123",
        password: "testpass456",
        host: "proxy.aluvia.io",
        httpPort: 8080,
        httpsPort: 8443,
        useSticky: false,
        useSmartRouting: false,
      });
    });

    it("should reflect current feature states", async () => {
      mockSdk.update.mockResolvedValue(proxy);
      proxy.useSticky = true;
      proxy.useSmartRouting = true;
      await proxy.save();

      const json = proxy.toJSON();

      expect(json.useSticky).toBe(true);
      expect(json.useSmartRouting).toBe(true);
      expect(json.username).toMatch(
        /testuser123-session-[a-zA-Z0-9]{8}-routing-smart/
      );
    });
  });

  describe("username formatting", () => {
    beforeEach(() => {
      mockSdk.update.mockResolvedValue(proxy);
    });

    it("should handle usernames with existing suffixes", async () => {
      const credentialWithSuffixes: ProxyCredential = {
        username: "testuser123-session-oldSalt-routing-smart",
        password: "testpass456",
        useSticky: false,
        useSmartRouting: false,
      };

      const proxyWithSuffixes = new Proxy(
        credentialWithSuffixes,
        mockConfig,
        mockSdk
      );
      proxyWithSuffixes.useSticky = true;
      await proxyWithSuffixes.save();

      // Should strip old suffixes and add new ones
      expect(proxyWithSuffixes.username).toMatch(
        /testuser123-session-[a-zA-Z0-9]{8}$/
      );
    });

    it("should preserve base username when toggling features", async () => {
      proxy.useSticky = true;
      await proxy.save();

      proxy.useSticky = false;
      await proxy.save();

      proxy.useSmartRouting = true;
      await proxy.save();

      proxy.useSmartRouting = false;
      await proxy.save();

      expect(proxy.username).toBe("testuser123");
      expect(mockSdk.update).toHaveBeenCalledTimes(4);
    });
  });

  describe("feature state management", () => {
    beforeEach(() => {
      mockSdk.update.mockResolvedValue(proxy);
    });

    it("should maintain independent feature states", async () => {
      proxy.useSticky = true;
      proxy.useSmartRouting = true;
      await proxy.save();

      expect(proxy.useSticky).toBe(true);
      expect(proxy.useSmartRouting).toBe(true);

      proxy.useSticky = false;
      await proxy.save();

      expect(proxy.useSticky).toBe(false);
      expect(proxy.useSmartRouting).toBe(true); // Should remain enabled
    });

    it("should generate new session salt on re-enable", async () => {
      proxy.useSticky = true;
      await proxy.save();
      const firstUsername = proxy.username;

      proxy.useSticky = false;
      await proxy.save();

      proxy.useSticky = true;
      await proxy.save();
      const secondUsername = proxy.username;

      expect(firstUsername).not.toBe(secondUsername);
    });
  });

  describe("error handling", () => {
    it("should handle concurrent feature operations", async () => {
      mockSdk.update.mockResolvedValue(proxy);

      // Set both properties and save
      proxy.useSticky = true;
      proxy.useSmartRouting = true;
      await proxy.save();

      expect(proxy.useSticky).toBe(true);
      expect(proxy.useSmartRouting).toBe(true);
      expect(mockSdk.update).toHaveBeenCalledTimes(1); // Only one save call
    });

    it("should maintain state consistency on update failure", async () => {
      mockSdk.update.mockRejectedValue(new Error("Network failure"));

      proxy.useSticky = true;
      await expect(proxy.save()).rejects.toThrow("Network failure");

      // State should still be updated locally even if sync fails
      expect(proxy.useSticky).toBe(true);
    });
  });

  describe("getUsage", () => {
    it("should call SDK usage method without options", async () => {
      const mockUsage = {
        usageStart: 1234567890,
        usageEnd: 1234567900,
        dataUsed: 100,
      };
      mockSdk.getUsage.mockResolvedValue(mockUsage);

      const usage = await proxy.getUsage();

      expect(mockSdk.getUsage).toHaveBeenCalledWith("testuser123", undefined);
      expect(usage).toEqual(mockUsage);
    });

    it("should call SDK usage method with date range options", async () => {
      const mockUsage = {
        usageStart: 1234567890,
        usageEnd: 1234567900,
        dataUsed: 50,
      };
      mockSdk.getUsage.mockResolvedValue(mockUsage);

      const options = { usageStart: 1234567890, usageEnd: 1234567900 };
      const usage = await proxy.getUsage(options);

      expect(mockSdk.getUsage).toHaveBeenCalledWith("testuser123", options);
      expect(usage).toEqual(mockUsage);
    });

    it("should propagate usage request failures", async () => {
      mockSdk.getUsage.mockRejectedValue(new Error("Usage failed"));

      await expect(proxy.getUsage()).rejects.toThrow("Usage failed");
    });

    it("should handle partial date options", async () => {
      const mockUsage = {
        usageStart: 1234567890,
        usageEnd: 1234567900,
        dataUsed: 75,
      };
      mockSdk.getUsage.mockResolvedValue(mockUsage);

      const options = { usageStart: 1234567890 };
      const usage = await proxy.getUsage(options);

      expect(mockSdk.getUsage).toHaveBeenCalledWith("testuser123", options);
      expect(usage).toEqual(mockUsage);
    });
  });
});

/**
 * Unit tests for the Aluvia SDK class
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { Aluvia, Proxy } from "../src/index.js";
import { api } from "../src/api-client.js";

// Mock the API client
jest.mock("../src/api-client.js", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
  },
}));

const mockApi = api as jest.Mocked<typeof api>;

describe("Aluvia SDK", () => {
  const validToken = "alv_test_token_12345";
  let sdk: Aluvia;

  beforeEach(() => {
    jest.clearAllMocks();
    sdk = new Aluvia(validToken);
  });

  describe("constructor", () => {
    it("should create SDK instance with valid token", () => {
      const sdk = new Aluvia(validToken);
      expect(sdk).toBeInstanceOf(Aluvia);
    });

    it("should throw error with empty token", () => {
      expect(() => new Aluvia("")).toThrow("API token cannot be empty");
    });

    it("should throw error with whitespace-only token", () => {
      expect(() => new Aluvia("   ")).toThrow("API token cannot be empty");
    });

    it("should throw error with null token", () => {
      expect(() => new Aluvia(null as any)).toThrow(
        "API token must be a string"
      );
    });

    it("should throw error with undefined token", () => {
      expect(() => new Aluvia(undefined as any)).toThrow(
        "API token must be a string"
      );
    });

    it("should trim whitespace from token", () => {
      const sdk = new Aluvia("  " + validToken + "  ");
      expect(sdk).toBeInstanceOf(Aluvia);
    });
  });

  describe("first", () => {
    const mockCredentialResponse = {
      success: true,
      data: [
        {
          username: "user123",
          password: "pass456",
          total_data_used: 1.5,
          created_at: 1705478400,
          updated_at: 1705564800,
          options: {
            use_sticky: false,
          },
        },
      ],
    };

    it("should return first proxy when available", async () => {
      mockApi.get.mockResolvedValue(mockCredentialResponse);

      const proxy = await sdk.first();

      expect(proxy).toBeInstanceOf(Proxy);
      expect(proxy?.info.username).toBe("user123");
      expect(proxy?.info.password).toBe("pass456");
      expect(mockApi.get).toHaveBeenCalledWith("/credentials", {
        Authorization: `Bearer ${validToken}`,
      });
    });

    it("should handle proxy with empty options", async () => {
      const mockResponseWithEmptyOptions = {
        success: true,
        data: [
          {
            username: "user123",
            password: "pass456",
            total_data_used: 1.5,
            created_at: 1705478400,
            updated_at: 1705564800,
            options: {},
          },
        ],
      };

      mockApi.get.mockResolvedValue(mockResponseWithEmptyOptions);

      const proxy = await sdk.first();

      expect(proxy).toBeInstanceOf(Proxy);
      expect(proxy?.info.stickyEnabled).toBe(false); // Should default to false
    });

    it("should throw error when API returns failure", async () => {
      mockApi.get.mockResolvedValue({ success: false });

      await expect(sdk.first()).rejects.toThrow("Failed to load credentials");
    });

    it("should throw error when API request fails", async () => {
      mockApi.get.mockRejectedValue(new Error("Network error"));

      try {
        await sdk.first();
        fail("Expected error to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Network error");
      }
    });

    it("should cache credentials after successful call", async () => {
      mockApi.get.mockResolvedValue(mockCredentialResponse);

      await sdk.first();
      const allProxies = await sdk.all();

      expect(allProxies).toHaveLength(1);
      expect(allProxies[0].info.username).toBe("user123");
    });
  });

  describe("find", () => {
    const mockFindResponse = {
      success: true,
      data: {
        username: "targetuser",
        password: "targetpass",
      },
    };

    it("should find proxy by exact username", async () => {
      mockApi.get.mockResolvedValue(mockFindResponse);

      const proxy = await sdk.find("targetuser");

      expect(proxy).toBeInstanceOf(Proxy);
      expect(proxy?.info.username).toBe("targetuser");
      expect(mockApi.get).toHaveBeenCalledWith("/credentials/targetuser", {
        Authorization: `Bearer ${validToken}`,
      });
    });

    it("should find proxy by username with session suffix", async () => {
      mockApi.get.mockResolvedValue(mockFindResponse);

      const proxy = await sdk.find("targetuser-session-abc123");

      expect(proxy).toBeInstanceOf(Proxy);
      expect(mockApi.get).toHaveBeenCalledWith("/credentials/targetuser", {
        Authorization: `Bearer ${validToken}`,
      });
    });

    it("should find proxy by username with routing suffix", async () => {
      mockApi.get.mockResolvedValue(mockFindResponse);

      const proxy = await sdk.find("targetuser-routing-smart");

      expect(proxy).toBeInstanceOf(Proxy);
      expect(mockApi.get).toHaveBeenCalledWith("/credentials/targetuser", {
        Authorization: `Bearer ${validToken}`,
      });
    });

    it("should find proxy by username with both suffixes", async () => {
      mockApi.get.mockResolvedValue(mockFindResponse);

      const proxy = await sdk.find("targetuser-session-xyz789-routing-smart");

      expect(proxy).toBeInstanceOf(Proxy);
      expect(mockApi.get).toHaveBeenCalledWith("/credentials/targetuser", {
        Authorization: `Bearer ${validToken}`,
      });
    });

    it("should return null when proxy not found", async () => {
      mockApi.get.mockResolvedValue({ success: false });

      const proxy = await sdk.find("nonexistent");

      expect(proxy).toBeNull();
    });

    it("should throw error when API request fails", async () => {
      mockApi.get.mockRejectedValue(new Error("Network error"));

      try {
        await sdk.find("targetuser");
        fail("Expected error to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Network error");
      }
    });
  });

  describe("create", () => {
    const mockCreateResponse = {
      success: true,
      data: [
        { username: "new1", password: "pass1" },
        { username: "new2", password: "pass2" },
      ],
    };

    it("should create single proxy by default", async () => {
      const singleResponse = {
        success: true,
        data: [{ username: "new1", password: "pass1" }],
      };
      mockApi.post.mockResolvedValue(singleResponse);

      const proxies = await sdk.create();

      expect(proxies).toHaveLength(1);
      expect(proxies[0]).toBeInstanceOf(Proxy);
      expect(proxies[0].info.username).toBe("new1");
      expect(mockApi.post).toHaveBeenCalledWith(
        "/credentials",
        { count: 1 },
        { Authorization: `Bearer ${validToken}` }
      );
    });

    it("should create multiple proxies when count specified", async () => {
      mockApi.post.mockResolvedValue(mockCreateResponse);

      const proxies = await sdk.create(2);

      expect(proxies).toHaveLength(2);
      expect(proxies[0].info.username).toBe("new1");
      expect(proxies[1].info.username).toBe("new2");
      expect(mockApi.post).toHaveBeenCalledWith(
        "/credentials",
        { count: 2 },
        { Authorization: `Bearer ${validToken}` }
      );
    });

    it("should add created proxies to local cache", async () => {
      mockApi.post.mockResolvedValue(mockCreateResponse);

      await sdk.create(2);
      const allProxies = await sdk.all();

      expect(allProxies).toHaveLength(2);
    });

    it("should throw error when creation fails", async () => {
      mockApi.post.mockResolvedValue({
        success: false,
        message: "Quota exceeded",
      });

      await expect(sdk.create(5)).rejects.toThrow("Quota exceeded");
    });

    it("should throw error when API request fails", async () => {
      mockApi.post.mockRejectedValue(new Error("Server error"));

      try {
        await sdk.create();
        fail("Expected error to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Server error");
      }
    });
  });

  describe("update", () => {
    const mockUpdateResponse = {
      success: true,
      data: {
        username: "user1",
        password: "pass1",
        options: {
          use_sticky: true,
          use_smart_routing: false,
        },
      },
    };

    beforeEach(async () => {
      // Add some proxies to cache first
      mockApi.post.mockResolvedValue({
        success: true,
        data: [
          { username: "user1", password: "pass1" },
          { username: "user2", password: "pass2" },
        ],
      });
      await sdk.create(2);
      jest.clearAllMocks();
    });

    it("should update proxy by username", async () => {
      mockApi.patch.mockResolvedValue(mockUpdateResponse);

      const result = await sdk.update("user1", {
        stickyEnabled: true,
        smartRoutingEnabled: true,
      });

      expect(result).toBeInstanceOf(Proxy);
      expect(mockApi.patch).toHaveBeenCalledWith(
        "/credentials/user1",
        {
          options: {
            use_sticky: true,
            use_smart_routing: true,
          },
        },
        {
          Authorization: `Bearer ${validToken}`,
        }
      );
    });

    it("should update proxy by username with suffixes", async () => {
      mockApi.patch.mockResolvedValue(mockUpdateResponse);

      const result = await sdk.update("user1-session-old123-routing-smart", {
        stickyEnabled: true,
      });

      expect(result).toBeInstanceOf(Proxy);
      expect(mockApi.patch).toHaveBeenCalledWith(
        "/credentials/user1",
        {
          options: {
            use_sticky: true,
          },
        },
        {
          Authorization: `Bearer ${validToken}`,
        }
      );
    });

    it("should update local cache when proxy exists", async () => {
      mockApi.patch.mockResolvedValue(mockUpdateResponse);

      await sdk.update("user1", {
        stickyEnabled: true,
        smartRoutingEnabled: false,
      });

      const allProxies = await sdk.all();
      const updatedProxy = allProxies.find((p) =>
        p.info.username.includes("user1")
      );

      expect(updatedProxy?.info.stickyEnabled).toBe(true);
      expect(updatedProxy?.info.smartRoutingEnabled).toBe(false);
    });

    it("should handle partial updates", async () => {
      mockApi.patch.mockResolvedValue(mockUpdateResponse);

      const result = await sdk.update("user1", {
        stickyEnabled: true,
      });

      expect(result).toBeInstanceOf(Proxy);
      expect(mockApi.patch).toHaveBeenCalledWith(
        "/credentials/user1",
        {
          options: { use_sticky: true },
        },
        {
          Authorization: `Bearer ${validToken}`,
        }
      );
    });

    it("should throw error when update fails", async () => {
      mockApi.patch.mockResolvedValue({
        success: false,
        message: "Proxy not found",
      });

      await expect(
        sdk.update("user1", { stickyEnabled: true })
      ).rejects.toThrow("Proxy not found");
    });

    it("should throw error when API request fails", async () => {
      mockApi.patch.mockRejectedValue(new Error("Network error"));

      try {
        await sdk.update("user1", { stickyEnabled: true });
        fail("Expected error to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Network error");
      }
    });
  });

  describe("delete", () => {
    const mockDeleteResponse = {
      success: true,
    };

    beforeEach(async () => {
      // Add some proxies to cache first
      mockApi.post.mockResolvedValue({
        success: true,
        data: [
          { username: "user1", password: "pass1" },
          { username: "user2", password: "pass2" },
        ],
      });
      await sdk.create(2);
      jest.clearAllMocks();
    });

    it("should delete proxy by username", async () => {
      mockApi.delete.mockResolvedValue(mockDeleteResponse);

      const result = await sdk.delete("user1");

      expect(result).toBeUndefined();
      expect(mockApi.delete).toHaveBeenCalledWith("/credentials/user1", {
        Authorization: `Bearer ${validToken}`,
      });
    });

    it("should delete proxy by username with suffixes", async () => {
      mockApi.delete.mockResolvedValue(mockDeleteResponse);

      const result = await sdk.delete("user1-session-abc-routing-smart");

      expect(result).toBeUndefined();
      expect(mockApi.delete).toHaveBeenCalledWith("/credentials/user1", {
        Authorization: `Bearer ${validToken}`,
      });
    });

    it("should remove deleted proxy from cache", async () => {
      mockApi.delete.mockResolvedValue(mockDeleteResponse);

      await sdk.delete("user1");
      const remaining = await sdk.all();

      expect(remaining).toHaveLength(1);
      expect(remaining[0].info.username).toBe("user2");
    });

    it("should throw error when deletion fails", async () => {
      mockApi.delete.mockResolvedValue({
        success: false,
        message: "Not found",
      });

      await expect(sdk.delete("user1")).rejects.toThrow("Not found");
    });

    it("should throw error when API request fails", async () => {
      mockApi.delete.mockRejectedValue(new Error("Network error"));

      try {
        await sdk.delete("user1");
        fail("Expected error to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Network error");
      }
    });
  });

  describe("all", () => {
    it("should return empty array when no proxies loaded", async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        data: [],
      });
      const proxies = await sdk.all();
      expect(proxies).toEqual([]);
    });

    it("should return all loaded proxies", async () => {
      // Load some proxies
      mockApi.post.mockResolvedValue({
        success: true,
        data: [
          { username: "user1", password: "pass1" },
          { username: "user2", password: "pass2" },
        ],
      });
      await sdk.create(2);

      const allProxies = await sdk.all();

      expect(allProxies).toHaveLength(2);
      expect(allProxies[0]).toBeInstanceOf(Proxy);
      expect(allProxies[1]).toBeInstanceOf(Proxy);
    });

    it("should return proxy instances with correct configuration", async () => {
      mockApi.post.mockResolvedValue({
        success: true,
        data: [{ username: "user1", password: "pass1" }],
      });
      await sdk.create(1);

      const [proxy] = await sdk.all();

      expect(proxy.info.host).toBe("proxy.aluvia.io");
      expect(proxy.info.httpPort).toBe(8080);
    });
  });

  describe("usage", () => {
    const mockUsageResponse = {
      success: true,
      data: {
        usage_start: 1705478400,
        usage_end: 1706083200,
        data_used: 2.5,
      },
    };

    it("should get usage information for proxy without date range", async () => {
      mockApi.get.mockResolvedValue(mockUsageResponse);

      const usage = await sdk.usage("user123");

      expect(usage.dataUsed).toBe(2.5);
      expect(mockApi.get).toHaveBeenCalledWith("/credentials/user123", {
        Authorization: `Bearer ${validToken}`,
      });
    });

    it("should get usage information with date range", async () => {
      mockApi.get.mockResolvedValue(mockUsageResponse);

      const usage = await sdk.usage("user123", {
        usageStart: 1705478400,
        usageEnd: 1706083200,
      });

      expect(usage.dataUsed).toBe(2.5);
      expect(mockApi.get).toHaveBeenCalledWith(
        "/credentials/user123?usage_start=1705478400&usage_end=1706083200",
        {
          Authorization: `Bearer ${validToken}`,
        }
      );
    });

    it("should handle username with suffixes in usage call", async () => {
      mockApi.get.mockResolvedValue(mockUsageResponse);

      await sdk.usage("user123-session-abc-routing-smart", {
        usageStart: 1705478400,
      });

      expect(mockApi.get).toHaveBeenCalledWith(
        "/credentials/user123?usage_start=1705478400",
        {
          Authorization: `Bearer ${validToken}`,
        }
      );
    });

    it("should handle partial date range options", async () => {
      mockApi.get.mockResolvedValue(mockUsageResponse);

      // Only usageStart
      await sdk.usage("user123", { usageStart: 1705478400 });
      expect(mockApi.get).toHaveBeenCalledWith(
        "/credentials/user123?usage_start=1705478400",
        {
          Authorization: `Bearer ${validToken}`,
        }
      );

      mockApi.get.mockClear();

      // Only usageEnd
      await sdk.usage("user123", { usageEnd: 1706083200 });
      expect(mockApi.get).toHaveBeenCalledWith(
        "/credentials/user123?usage_end=1706083200",
        {
          Authorization: `Bearer ${validToken}`,
        }
      );
    });

    it("should throw error when usage request fails", async () => {
      mockApi.get.mockResolvedValue({
        success: false,
        message: "Proxy not found",
      });

      await expect(sdk.usage("user123")).rejects.toThrow("Proxy not found");
    });

    it("should throw error when API request fails", async () => {
      mockApi.get.mockRejectedValue(new Error("Network error"));

      try {
        await sdk.usage("user123");
        fail("Expected error to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Network error");
      }
    });

    it("should validate username parameter", async () => {
      await expect(sdk.usage("")).rejects.toThrow("username cannot be empty");
      await expect(sdk.usage("   ")).rejects.toThrow(
        "username cannot be empty"
      );
    });
  });
});

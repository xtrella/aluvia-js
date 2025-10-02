/**
 * Unit tests for the ApiClient class
 */

import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { ApiClient } from "../src/api-client.js";

// Mock the fetch polyfill
jest.mock("../src/fetch.js", () => ({
  initializeFetch: jest.fn(),
}));

import { initializeFetch } from "../src/fetch.js";
const mockInitializeFetch = initializeFetch as jest.MockedFunction<
  typeof initializeFetch
>;

describe("ApiClient", () => {
  let apiClient: ApiClient;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    // Create a mock fetch function
    mockFetch = jest.fn();
    mockInitializeFetch.mockResolvedValue(mockFetch);

    apiClient = new ApiClient("https://api.test.com");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create ApiClient with custom base URL", () => {
      const client = new ApiClient("https://custom.api.com");
      expect(client).toBeInstanceOf(ApiClient);
    });

    it("should create ApiClient with default base URL", () => {
      const client = new ApiClient();
      expect(client).toBeInstanceOf(ApiClient);
    });
  });

  describe("request method", () => {
    it("should make successful GET request", async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn<() => Promise<any>>().mockResolvedValue({ data: "test" }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await apiClient.request("/test");

      expect(mockFetch).toHaveBeenCalledWith("https://api.test.com/test", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        body: undefined,
      });
      expect(result).toEqual({ data: "test" });
    });

    it("should make POST request with body", async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const requestData = { name: "test" };
      await apiClient.request("/create", {
        method: "POST",
        body: JSON.stringify(requestData),
      });

      expect(mockFetch).toHaveBeenCalledWith("https://api.test.com/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });
    });

    it("should include custom headers", async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await apiClient.request("/test", {
        headers: {
          Authorization: "Bearer token123",
          "X-Custom": "value",
        },
      });

      expect(mockFetch).toHaveBeenCalledWith("https://api.test.com/test", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token123",
          "X-Custom": "value",
        },
        body: undefined,
      });
    });

    it("should throw error for non-ok response", async () => {
      const mockResponse = {
        ok: false,
        status: 404,
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(apiClient.request("/notfound")).rejects.toThrow(
        "HTTP error! status: 404"
      );
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValue(new Error("Network failure"));

      await expect(apiClient.request("/test")).rejects.toThrow(
        "Network failure"
      );
    });

    it("should cache fetch instance", async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      // Make multiple requests
      await apiClient.request("/test1");
      await apiClient.request("/test2");

      // initializeFetch should only be called once
      expect(mockInitializeFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("get method", () => {
    it("should make GET request", async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ id: 1 }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await apiClient.get<{ id: number }>("/users/1");

      expect(mockFetch).toHaveBeenCalledWith("https://api.test.com/users/1", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        body: undefined,
      });
      expect(result).toEqual({ id: 1 });
    });

    it("should include custom headers in GET request", async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await apiClient.get("/test", { Authorization: "Bearer token" });

      expect(mockFetch).toHaveBeenCalledWith("https://api.test.com/test", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token",
        },
        body: undefined,
      });
    });
  });

  describe("post method", () => {
    it("should make POST request with data", async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ created: true }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const postData = { name: "John", email: "john@example.com" };
      const result = await apiClient.post("/users", postData);

      expect(mockFetch).toHaveBeenCalledWith("https://api.test.com/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(postData),
      });
      expect(result).toEqual({ created: true });
    });

    it("should make POST request without data", async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await apiClient.post("/action");

      expect(mockFetch).toHaveBeenCalledWith("https://api.test.com/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: undefined,
      });
    });
  });

  describe("patch method", () => {
    it("should make PATCH request with data", async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ updated: true }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const patchData = { id: 1, name: "Patched Name" };
      const result = await apiClient.patch("/users/1", patchData);

      expect(mockFetch).toHaveBeenCalledWith("https://api.test.com/users/1", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patchData),
      });
      expect(result).toEqual({ updated: true });
    });

    it("should make PATCH request without data", async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await apiClient.patch("/action");

      expect(mockFetch).toHaveBeenCalledWith("https://api.test.com/action", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: undefined,
      });
    });

    it("should include headers in PATCH request", async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await apiClient.patch("/users/1", { name: "test" }, { Authorization: "Bearer token" });

      expect(mockFetch).toHaveBeenCalledWith("https://api.test.com/users/1", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token",
        },
        body: JSON.stringify({ name: "test" }),
      });
    });
  });

  describe("delete method", () => {
    it("should make DELETE request", async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ deleted: true }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await apiClient.delete("/users/1");

      expect(mockFetch).toHaveBeenCalledWith("https://api.test.com/users/1", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: undefined,
      });
      expect(result).toEqual({ deleted: true });
    });

    it("should include headers in DELETE request", async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await apiClient.delete("/users/1", { Authorization: "Bearer token" });

      expect(mockFetch).toHaveBeenCalledWith("https://api.test.com/users/1", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token",
        },
        body: undefined,
      });
    });
  });

  describe("TypeScript generics", () => {
    it("should properly type response data", async () => {
      interface UserResponse {
        id: number;
        name: string;
        email: string;
      }

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          id: 1,
          name: "John",
          email: "john@example.com",
        }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const user = await apiClient.get<UserResponse>("/users/1");

      // TypeScript should infer the correct type
      expect(user.id).toBe(1);
      expect(user.name).toBe("John");
      expect(user.email).toBe("john@example.com");
    });
  });
});

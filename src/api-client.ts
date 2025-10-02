import { initializeFetch } from "./fetch.js";
import {
  ApiError,
  NetworkError,
  AuthenticationError,
  RateLimitError,
} from "./errors.js";

/** The default Aluvia API endpoint */
export const API_ORIGIN: string = "https://api.aluvia.io";

/**
 * Configuration options for API requests
 * @internal
 */
interface ApiRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

/**
 * Universal HTTP client that works in both Node.js and browser environments.
 *
 * Uses native fetch where available, with automatic fallback to node-fetch
 * for older Node.js versions. Provides a consistent interface for all HTTP operations.
 *
 * @internal
 */
export class ApiClient {
  private baseURL: string;
  private fetchInstance: typeof fetch | null = null;

  constructor(baseURL: string = API_ORIGIN || "") {
    this.baseURL = baseURL;
  }

  private async getFetch(): Promise<typeof fetch> {
    if (!this.fetchInstance) {
      this.fetchInstance = await initializeFetch();
    }
    return this.fetchInstance;
  }

  async request<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    try {
      const fetch = await this.getFetch();
      const url = `${this.baseURL}${endpoint}`;

      const response = await fetch(url, {
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        body: options.body,
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error && !error.name.includes("Error")) {
        // Network or other fetch errors
        throw new NetworkError(`Request failed: ${error.message}`, {
          endpoint,
          method: options.method || "GET",
          originalError: error.message,
        });
      }
      throw error; // Re-throw our custom errors
    }
  }

  /**
   * Handles HTTP error responses and throws appropriate error types
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    const status = response.status;
    let errorMessage = `HTTP ${status}`;
    let errorDetails: Record<string, any> = {
      status,
      statusText: response.statusText,
      url: response.url,
    };

    // Try to parse error details from response body
    try {
      const errorBody = await response.text();
      if (errorBody) {
        try {
          const parsed = JSON.parse(errorBody);
          errorMessage = parsed.message || parsed.error || errorMessage;
          errorDetails = { ...errorDetails, ...parsed };
        } catch {
          errorDetails.responseBody = errorBody;
        }
      }
    } catch {
      // Ignore errors when parsing response body
    }

    // Throw appropriate error type based on status code
    switch (status) {
      case 401:
        throw new AuthenticationError(
          errorMessage.includes("HTTP")
            ? "Authentication failed"
            : errorMessage,
          errorDetails
        );
      case 403:
        throw new AuthenticationError(
          errorMessage.includes("HTTP") ? "Access forbidden" : errorMessage,
          errorDetails
        );
      case 404:
        throw new ApiError(
          errorMessage.includes("HTTP") ? "Resource not found" : errorMessage,
          status,
          errorDetails
        );
      case 429: {
        const retryAfter = response.headers.get("Retry-After");
        throw new RateLimitError(
          errorMessage.includes("HTTP") ? "Rate limit exceeded" : errorMessage,
          retryAfter ? parseInt(retryAfter, 10) : undefined,
          errorDetails
        );
      }
      case 500:
      case 502:
      case 503:
      case 504:
        throw new ApiError(
          errorMessage.includes("HTTP") ? "Server error" : errorMessage,
          status,
          errorDetails
        );
      default:
        throw new ApiError(errorMessage, status, errorDetails);
    }
  }

  async get<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: "GET", headers });
  }

  async post<T>(
    endpoint: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(
    endpoint: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(
    endpoint: string,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE", headers });
  }

  async patch<T>(
    endpoint: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

export const api = new ApiClient();

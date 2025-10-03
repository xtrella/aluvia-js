import { api } from "./api-client.js";
import {
  validateApiToken,
  validateUsername,
  validateProxyCount,
} from "./validation.js";
import { ApiError } from "./errors.js";

/**
 * Represents the authentication credentials for a proxy connection.
 * @public
 */
export interface ProxyCredential {
  /** The username for proxy authentication */
  username: string;
  /** The password for proxy authentication */
  password: string;
  /** Whether sticky sessions are enabled for this proxy */
  useSticky?: boolean;
  /** Whether smart routing is enabled for this proxy */
  useSmartRouting?: boolean;
  /** The session salt used for sticky sessions */
  sessionSalt?: string;
}

/**
 * Configuration settings for proxy server connection.
 * @public
 */
export interface ProxyConfig {
  /** The hostname or IP address of the proxy server */
  host: string;
  /** The HTTP port number for the proxy server */
  httpPort: number;
  /** The HTTPS port number for the proxy server */
  httpsPort: number;
}

/**
 * Base API response structure.
 * @internal
 */
interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
}

/**
 * Raw credential data from API responses.
 * @internal
 */
interface RawCredential {
  username: string;
  password: string;
  options: {
    use_sticky?: boolean;
    use_smart_routing?: boolean;
  };
}

/**
 * Usage data from API responses.
 * @internal
 */
interface RawUsageData {
  usage_start: number;
  usage_end: number;
  data_used: number;
}

/**
 * Simple API response with no data.
 * @internal
 */
type SimpleApiResponse = Omit<ApiResponse, "data">;

/**
 * Represents a single proxy instance with methods for configuration and connection management.
 *
 * @example
 * ```typescript
 * const sdk = new Aluvia('your-api-token');
 * const proxy = await sdk.first();
 *
 * // Laravel-style property setting
 * proxy.useSticky = true;
 * proxy.useSmartRouting = true;
 * await proxy.save(); // Apply changes to server
 *
 * // Get the proxy URLs
 * const httpUrl = proxy.toUrl('http');   // http://username:password@proxy.aluvia.io:8080
 * const httpsUrl = proxy.toUrl('https'); // https://username:password@proxy.aluvia.io:8443
 * ```
 *
 * @public
 */
export class Proxy {
  private credential: ProxyCredential;
  private config: ProxyConfig;
  private sdk: Aluvia;

  /**
   * Creates a new Proxy instance.
   *
   * @param credential - The proxy authentication credentials
   * @param config - The proxy server configuration
   * @param sdk - Reference to the parent Aluvia SDK instance
   * @internal
   */
  constructor(credential: ProxyCredential, config: ProxyConfig, sdk: Aluvia) {
    this.credential = credential;
    this.config = config;
    this.sdk = sdk;
  }

  /**
   * Retrieves detailed usage information for this proxy.
   *
   * @param options - Optional date range filtering
   * @returns A promise that resolves to detailed usage information
   * @throws {Error} When the API request fails
   *
   * @example
   * ```typescript
   * const proxy = await sdk.first();
   * const usage = await proxy.getUsage();
   * console.log(`This proxy has used ${usage.dataUsed} GB`);
   *
   * // Get usage for last week
   * const lastWeek = await proxy.getUsage({
   *   usageStart: Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60),
   *   usageEnd: Math.floor(Date.now() / 1000)
   * });
   * ```
   */
  async getUsage(options?: {
    usageStart?: number;
    usageEnd?: number;
  }): Promise<{
    usageStart: number;
    usageEnd: number;
    dataUsed: number;
  }> {
    return this.sdk.getUsage(this.credential.username, options);
  }

  /**
   * Saves any changes made to the proxy configuration to the server.
   *
   * This method syncs the current proxy state (sticky sessions, smart routing)
   * with the Aluvia API server. Call this after modifying any properties.
   *
   * @returns A promise that resolves to the updated Proxy instance
   * @throws {ApiError} When the update fails or the proxy doesn't exist
   * @throws {NetworkError} When network connectivity issues occur
   *
   * @example
   * ```typescript
   * const proxy = await sdk.first();
   * proxy.useSticky = true;
   * proxy.useSmartRouting = true;
   * await proxy.save(); // Sync with server
   * ```
   */
  async save(): Promise<this> {
    // Generate new session salt every time sticky is enabled
    if (this.credential.useSticky) {
      this.credential.sessionSalt = this.generateSessionSalt();
    }

    // Clear session salt when disabling sticky sessions
    if (!this.credential.useSticky) {
      this.credential.sessionSalt = undefined;
    }

    await this.sdk.update(this.credential.username, {
      useSticky: this.credential.useSticky,
      useSmartRouting: this.credential.useSmartRouting,
    });

    return this;
  }

  /**
   * Gets or sets whether sticky sessions are enabled for this proxy.
   *
   * Sticky sessions ensure that subsequent requests from the same client
   * are routed through the same exit IP address for session consistency.
   *
   * @example
   * ```typescript
   * const proxy = await sdk.first();
   * proxy.useSticky = true;
   * await proxy.save(); // Apply changes
   * ```
   */
  get useSticky(): boolean {
    return this.credential.useSticky || false;
  }

  set useSticky(enabled: boolean) {
    this.credential.useSticky = enabled;
  }

  /**
   * Gets or sets whether smart routing is enabled for this proxy.
   *
   * Smart routing automatically selects the optimal path based on
   * network conditions and target destination for improved performance.
   *
   * @example
   * ```typescript
   * const proxy = await sdk.first();
   * proxy.useSmartRouting = true;
   * await proxy.save(); // Apply changes
   * ```
   */
  get useSmartRouting(): boolean {
    return this.credential.useSmartRouting || false;
  }

  set useSmartRouting(enabled: boolean) {
    this.credential.useSmartRouting = enabled;
  }

  /**
   * Gets the current username with all enabled features encoded.
   *
   * @returns The formatted username including session salts and routing suffixes
   *
   * @example
   * ```typescript
   * const proxy = await sdk.first();
   * console.log(proxy.username); // 'user123-session-abc123-routing-smart'
   * ```
   */
  get username(): string {
    return this.buildCredential().username;
  }

  /**
   * Gets the proxy password for authentication.
   *
   * @returns The proxy authentication password
   */
  get password(): string {
    return this.credential.password;
  }

  /**
   * Gets the proxy server hostname.
   *
   * @returns The hostname or IP address of the proxy server
   */
  get host(): string {
    return this.config.host;
  }

  /**
   * Gets the HTTP port number for the proxy server.
   *
   * @returns The HTTP port number (typically 8080)
   */
  get httpPort(): number {
    return this.config.httpPort;
  }

  /**
   * Gets the HTTPS port number for the proxy server.
   *
   * @returns The HTTPS port number (typically 8443)
   */
  get httpsPort(): number {
    return this.config.httpsPort;
  }

  /**
   * Generates a formatted proxy URL for connecting through this proxy.
   *
   * The URL includes all enabled features (sticky sessions, smart routing)
   * encoded in the username format.
   *
   * @param protocol - The protocol to use in the URL (default: 'http')
   * @returns A fully formatted proxy URL ready for use
   *
   * @example
   * ```typescript
   * const proxy = await sdk.first();
   * const httpUrl = proxy.toUrl('http');
   * const httpsUrl = proxy.toUrl('https');
   *
   * // Default is http
   * const defaultUrl = proxy.toUrl();
   * ```
   */
  toUrl(protocol: "http" | "https" = "http"): string {
    const builtCredential = this.buildCredential();
    const port =
      protocol === "https" ? this.config.httpsPort : this.config.httpPort;

    return `${protocol}://${builtCredential.username}:${builtCredential.password}@${this.config.host}:${port}`;
  }

  /**
   * Permanently deletes this proxy from your Aluvia account.
   *
   * @returns A promise that resolves when deletion is complete
   * @throws {Error} When the deletion fails or the proxy doesn't exist
   *
   * @example
   * ```typescript
   * const proxy = await sdk.first();
   * await proxy.delete();
   * console.log('Proxy deleted successfully');
   * ```
   */
  async delete(): Promise<void> {
    return this.sdk.delete(this.credential.username);
  }

  /**
   * Converts the proxy instance to a JSON-serializable object.
   *
   * This method is automatically called by JSON.stringify() and provides
   * a clean representation of the proxy for serialization, logging, and debugging.
   *
   * @returns A plain object containing all proxy properties
   *
   * @example
   * ```typescript
   * const proxy = await sdk.first();
   *
   * // Automatic JSON serialization
   * const jsonString = JSON.stringify(proxy);
   * console.log(jsonString);
   *
   * // Manual conversion
   * const obj = proxy.toJSON();
   * console.log(obj);
   *
   * // Spreading into other objects
   * const config = { ...proxy.toJSON(), timeout: 5000 };
   * ```
   */
  toJSON(): Record<string, any> {
    return {
      username: this.username,
      password: this.password,
      host: this.host,
      httpPort: this.httpPort,
      httpsPort: this.httpsPort,
      useSticky: this.useSticky,
      useSmartRouting: this.useSmartRouting,
    };
  }

  /**
   * Build credential with proper username formatting
   */
  private buildCredential(): ProxyCredential {
    let username = stripUsernameSuffixes(this.credential.username);

    // Add sticky session suffix
    if (this.credential.useSticky && this.credential.sessionSalt) {
      username += `-session-${this.credential.sessionSalt}`;
    }

    // Add smart routing suffix
    if (this.credential.useSmartRouting) {
      username += "-routing-smart";
    }

    return {
      ...this.credential,
      username,
    };
  }

  /**
   * Generate random session salt
   */
  private generateSessionSalt(length: number = 8): string {
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }
    return result;
  }
}

/**
 * The main Aluvia SDK client for managing proxy connections.
 *
 * This class provides methods to create, retrieve, and manage proxy instances
 * through the Aluvia API. All operations require a valid API token.
 *
 * @example
 * ```typescript
 * import Aluvia from 'aluvia-ts-sdk';
 *
 * const sdk = new Aluvia('your-api-token');
 *
 * // Get your first available proxy
 * const proxy = await sdk.first();
 *
 * // Create new proxies
 * const newProxies = await sdk.create(3);
 *
 * // Find a specific proxy
 * const foundProxy = await sdk.find('username123');
 *
 * // Update proxy settings
 * await sdk.update('username123', { useSticky: true });
 *
 * // Get usage information
 * const usage = await sdk.getUsage('username123');
 * ```
 *
 * @public
 */
export class Aluvia {
  /** SDK version for tracking and debugging */
  public static readonly VERSION = "1.0.0";

  private config: ProxyConfig = {
    host: "proxy.aluvia.io",
    httpPort: 8080,
    httpsPort: 8443,
  };

  private credentials: ProxyCredential[] = [];
  private token: string;

  /**
   * Creates a new Aluvia SDK instance.
   *
   * @param token - Your Aluvia API authentication token
   * @throws {ValidationError} When token is not provided, invalid, or empty
   *
   * @example
   * ```typescript
   * const sdk = new Aluvia('alv_abc123...');
   * ```
   */
  constructor(token: string) {
    this.token = validateApiToken(token);
  }

  private parseOptions(options?: Record<string, any>) {
    return {
      useSticky:
        options && "use_sticky" in options
          ? options.use_sticky || false
          : false,
      useSmartRouting:
        options && "use_smart_routing" in options
          ? options.use_smart_routing || false
          : false,
    };
  }

  /**
   * Retrieves the most recently created proxy from your account.
   *
   * This is typically the fastest way to get a working proxy connection
   * when you don't need a specific proxy instance.
   *
   * @returns A promise that resolves to a Proxy instance, or null if no proxies exist
   * @throws {ApiError} When the API request fails or returns an error response
   * @throws {ValidationError} When the API token is invalid
   * @throws {NetworkError} When network connectivity issues occur
   *
   * @example
   * ```typescript
   * const sdk = new Aluvia('your-token');
   * const proxy = await sdk.first();
   *
   * if (proxy) {
   *   console.log('Proxy URL:', proxy.toUrl());
   * } else {
   *   console.log('No proxies available, create one first');
   * }
   * ```
   */
  async first(): Promise<Proxy | null> {
    await this.initCredentials();

    if (this.credentials.at(0)) {
      return new Proxy(this.credentials[0], this.config, this);
    } else {
      return null;
    }
  }

  private async initCredentials() {
    if (this.credentials.length) {
      return this.credentials;
    }

    const headers = { Authorization: `Bearer ${this.token}` };
    const response = await api.get<ApiResponse<RawCredential[]>>(
      "/credentials",
      headers
    );

    if (!response.success) {
      throw new ApiError(response.message || "Failed to load credentials");
    }

    this.credentials = response.data?.map((cred) => ({
      username: cred.username,
      password: cred.password,
      ...this.parseOptions(cred.options),
    }));
  }

  /**
   * Finds and returns a specific proxy by its username.
   *
   * The method automatically handles username variations by stripping
   * session and routing suffixes before performing the lookup.
   *
   * @param username - The base username of the proxy to find
   * @returns A promise that resolves to a Proxy instance, or null if not found
   * @throws {ApiError} When the API request fails (excluding 404 not found)
   * @throws {ValidationError} When the username format is invalid
   * @throws {NetworkError} When network connectivity issues occur
   *
   * @example
   * ```typescript
   * const sdk = new Aluvia('your-token');
   *
   * // These all find the same proxy:
   * const proxy1 = await sdk.find('user123');
   * const proxy2 = await sdk.find('user123-session-abc');
   * const proxy3 = await sdk.find('user123-routing-smart');
   * ```
   */
  async find(username: string): Promise<Proxy | null> {
    try {
      const baseUsername = stripUsernameSuffixes(username);
      const match = this.credentials.find(
        (cred) => stripUsernameSuffixes(cred.username) === baseUsername
      );

      if (match) {
        return new Proxy(match, this.config, this);
      }

      const headers = { Authorization: `Bearer ${this.token}` };
      const response = await api.get<ApiResponse<RawCredential>>(
        "/credentials/" + baseUsername,
        headers
      );

      if (!response.success) {
        return null;
      }

      const credential: ProxyCredential = {
        username: response.data.username,
        password: response.data.password,
        ...this.parseOptions(response.data.options),
      };

      this.credentials.push(credential);
      return new Proxy(credential, this.config, this);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) {
        return null; // Proxy not found is not an error condition
      }
      throw error;
    }
  }

  /**
   * Creates new proxy instances in your Aluvia account.
   *
   * @param count - The number of proxies to create (default: 1, max varies by plan)
   * @returns A promise that resolves to an array of newly created Proxy instances
   * @throws {ApiError} When creation fails or quota is exceeded
   * @throws {ValidationError} When the count parameter is invalid (< 1 or > limit)
   * @throws {NetworkError} When network connectivity issues occur
   *
   * @example
   * ```typescript
   * const sdk = new Aluvia('your-token');
   *
   * // Create a single proxy
   * const [proxy] = await sdk.create(1);
   *
   * // Create multiple proxies
   * const proxies = await sdk.create(5);
   * console.log(`Created ${proxies.length} new proxies`);
   * ```
   */
  async create(count: number = 1): Promise<Proxy[]> {
    const validCount = validateProxyCount(count);

    const headers = { Authorization: `Bearer ${this.token}` };
    const response = await api.post<ApiResponse<RawCredential[]>>(
      "/credentials",
      { count: validCount },
      headers
    );

    if (!response.success) {
      const errorMsg = response.message || "Failed to create proxies";
      throw new ApiError(`${errorMsg}. Requested count: ${validCount}`);
    }

    const newCredentials = response.data.map((cred) => ({
      username: cred.username,
      password: cred.password,
      ...this.parseOptions(cred.options),
    }));

    this.credentials.push(...newCredentials);
    return newCredentials.map((cred) => new Proxy(cred, this.config, this));
  }

  /**
   * Updates a specific proxy's configuration on the server.
   *
   * This method allows you to update proxy settings (sticky sessions, smart routing)
   * for a specific proxy by username, similar to how find() and delete() work.
   *
   * @param username - The username of the proxy to update
   * @param options - The settings to update
   * @returns A promise that resolves to the updated Proxy instance, or null if not found
   * @throws {ApiError} When the update fails or the proxy doesn't exist
   * @throws {ValidationError} When the username or options are invalid
   * @throws {NetworkError} When network connectivity issues occur
   *
   * @example
   * ```typescript
   * const sdk = new Aluvia('your-token');
   *
   * // Update specific proxy settings
   * const updatedProxy = await sdk.update('user123', {
   *   useSticky: true,
   *   useSmartRouting: true
   * });
   * ```
   */
  async update(
    username: string,
    options: {
      useSticky?: boolean;
      useSmartRouting?: boolean;
    }
  ): Promise<Proxy | null> {
    const baseUsername = stripUsernameSuffixes(username);
    const headers = { Authorization: `Bearer ${this.token}` };

    const updateData = {
      options: {
        use_sticky: options.useSticky,
        use_smart_routing: options.useSmartRouting,
      },
    };

    const response = await api.patch<ApiResponse<RawCredential>>(
      `/credentials/${baseUsername}`,
      updateData,
      headers
    );

    if (!response.success) {
      const errorMsg = response.message || "Failed to update proxy";
      throw new ApiError(`${errorMsg}. Username: ${baseUsername}`);
    }

    this.credentials = this.credentials.map((cred) => {
      if (stripUsernameSuffixes(cred.username) !== baseUsername) {
        return cred;
      }

      return {
        ...cred,
        ...this.parseOptions(response.data.options),
      };
    });

    return this.find(baseUsername)!;
  }

  /**
   * Permanently deletes a proxy from your account by username.
   *
   * This action cannot be undone. The proxy will be immediately unavailable
   * for new connections and removed from your account.
   *
   * @param username - The username of the proxy to delete
   * @returns A promise that resolves when deletion is complete
   * @throws {ApiError} When deletion fails or the proxy doesn't exist
   * @throws {ValidationError} When the username format is invalid
   * @throws {NetworkError} When network connectivity issues occur
   *
   * @example
   * ```typescript
   * const sdk = new Aluvia('your-token');
   * await sdk.delete('user123');
   * console.log('Proxy deleted successfully');
   * ```
   */
  async delete(username: string): Promise<void> {
    const validUsername = validateUsername(username);
    const baseUsername = stripUsernameSuffixes(validUsername);

    const headers = { Authorization: `Bearer ${this.token}` };
    const response = await api.delete<SimpleApiResponse>(
      "/credentials/" + baseUsername,
      headers
    );

    if (!response.success) {
      throw new ApiError(response.message || "Failed to delete proxy");
    }

    this.credentials = this.credentials.filter((cred) => {
      return stripUsernameSuffixes(cred.username) !== baseUsername;
    });
  }

  /**
   * Returns all currently loaded proxy instances.
   *
   * Note: This returns proxies from the local cache that have been loaded
   * through other method calls (first, find, create). To get all proxies
   * from your account, you'll need to implement pagination through the API.
   *
   * @returns An array of all currently loaded Proxy instances
   *
   * @example
   * ```typescript
   * const sdk = new Aluvia('your-token');
   *
   * await sdk.create(3);
   * const allProxies = sdk.all();
   * console.log(`Local cache contains ${allProxies.length} proxies`);
   * ```
   */
  async all(): Promise<Proxy[]> {
    await this.initCredentials();
    return this.credentials.map((cred) => new Proxy(cred, this.config, this));
  }

  /**
   * Retrieves detailed usage information for a specific proxy.
   *
   * This method provides comprehensive usage statistics including data consumption
   * over a specified time period or the default period if no dates are provided.
   *
   * @param username - The username of the proxy to get usage for
   * @param options - Optional date range filtering
   * @returns A promise that resolves to detailed usage information
   * @throws {ApiError} When the API request fails or the proxy doesn't exist
   * @throws {ValidationError} When the username or date range is invalid
   * @throws {NetworkError} When network connectivity issues occur
   *
   * @example
   * ```typescript
   * const sdk = new Aluvia('your-token');
   *
   * // Get usage for current period
   * const usage = await sdk.getUsage('user123');
   * console.log(`Data used: ${usage.dataUsed} GB`);
   *
   * // Get usage for specific date range
   * const customUsage = await sdk.getUsage('user123', {
   *   usageStart: 1705478400,
   *   usageEnd: 1706083200
   * });
   * ```
   */
  async getUsage(
    username: string,
    options?: {
      usageStart?: number;
      usageEnd?: number;
    }
  ): Promise<{
    usageStart: number;
    usageEnd: number;
    dataUsed: number;
  }> {
    const validUsername = validateUsername(username);
    const baseUsername = stripUsernameSuffixes(validUsername);
    const headers = { Authorization: `Bearer ${this.token}` };

    const queryParams = new URLSearchParams();
    if (options?.usageStart) {
      queryParams.append("usage_start", options.usageStart.toString());
    }
    if (options?.usageEnd) {
      queryParams.append("usage_end", options.usageEnd.toString());
    }

    const endpoint = `/credentials/${baseUsername}${
      queryParams.toString() ? "?" + queryParams.toString() : ""
    }`;

    const response = await api.get<ApiResponse<RawUsageData>>(
      endpoint,
      headers
    );

    if (response.success) {
      return {
        usageStart: response.data.usage_start,
        usageEnd: response.data.usage_end,
        dataUsed: response.data.data_used,
      };
    }

    throw new ApiError(response.message || "Failed to get proxy usage");
  }
}

/**
 * Strip session and routing suffixes from username
 */
function stripUsernameSuffixes(username: string): string {
  return username
    .replace(/-session-[a-zA-Z0-9]+/, "")
    .replace(/-routing-smart/, "");
}

// Export error types for users
export {
  AluviaError,
  AuthenticationError,
  NetworkError,
  ApiError,
  ValidationError,
  NotFoundError,
  RateLimitError,
} from "./errors.js";

export default Aluvia;

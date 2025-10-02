import { api } from "./api-client.js";
import {
  validateApiToken,
  validateUsername,
  validateProxyCount,
} from "./validation.js";
import { NotFoundError, ApiError } from "./errors.js";

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
  sticky_enabled?: boolean;
  /** Whether smart routing is enabled for this proxy */
  smart_routing_enabled?: boolean;
  /** The session salt used for sticky sessions */
  session_salt?: string;
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
}

/**
 * Represents a single proxy instance with methods for configuration and connection management.
 *
 * @example
 * ```typescript
 * const sdk = new Aluvia('your-api-token');
 * const proxy = await sdk.first();
 *
 * // Enable sticky sessions
 * proxy.enableSticky();
 *
 * // Get the proxy URL
 * const proxyUrl = proxy.url('http');
 * console.log(proxyUrl); // http://username:password@proxy.aluvia.io:8080
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
   * Enables sticky sessions for this proxy connection.
   *
   * Sticky sessions ensure that subsequent requests from the same client
   * are routed through the same exit IP address for session consistency.
   *
   * @returns The current Proxy instance for method chaining
   *
   * @example
   * ```typescript
   * const proxy = await sdk.first();
   * proxy.enableSticky().url(); // Returns URL with session token
   * ```
   */
  enableSticky(): this {
    this.credential.sticky_enabled = true;
    this.credential.session_salt = this.generateSessionSalt();
    return this;
  }

  /**
   * Enables smart routing for this proxy connection.
   *
   * Smart routing automatically selects the optimal path based on
   * network conditions and target destination for improved performance.
   *
   * @returns The current Proxy instance for method chaining
   *
   * @example
   * ```typescript
   * const proxy = await sdk.first();
   * proxy.enableSmartRouting().url();
   * ```
   */
  enableSmartRouting(): this {
    this.credential.smart_routing_enabled = true;
    return this;
  }

  /**
   * Disables sticky sessions for this proxy connection.
   *
   * @returns The current Proxy instance for method chaining
   */
  disableSticky(): this {
    this.credential.sticky_enabled = false;
    this.credential.session_salt = undefined;
    return this;
  }

  /**
   * Disables smart routing for this proxy connection.
   *
   * @returns The current Proxy instance for method chaining
   */
  disableSmartRouting(): this {
    this.credential.smart_routing_enabled = false;
    return this;
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
   * const httpUrl = proxy.url('http');
   * const httpsUrl = proxy.url('https');
   * ```
   */
  url(protocol: "http" = "http"): string {
    const builtCredential = this.buildCredential();
    const port = this.config.httpPort;

    return `${protocol}://${builtCredential.username}:${builtCredential.password}@${this.config.host}:${port}`;
  }

  /**
   * Permanently deletes this proxy from your Aluvia account.
   *
   * @returns A promise that resolves to true if deletion was successful
   * @throws {Error} When the deletion fails or the proxy doesn't exist
   *
   * @example
   * ```typescript
   * const proxy = await sdk.first();
   * const deleted = await proxy.delete();
   * console.log('Proxy deleted:', deleted);
   * ```
   */
  async delete(): Promise<boolean> {
    return this.sdk.delete(this.credential.username);
  }

  /**
   * Retrieves comprehensive information about this proxy instance.
   *
   * @returns An object containing all proxy configuration and feature states
   *
   * @example
   * ```typescript
   * const proxy = await sdk.first();
   * const info = proxy.info;
   * console.log(info.username, info.host, info.sticky_enabled);
   * ```
   */
  get info() {
    const builtCredential = this.buildCredential();
    return {
      username: builtCredential.username,
      password: builtCredential.password,
      host: this.config.host,
      httpPort: this.config.httpPort,
      sticky_enabled: this.credential.sticky_enabled,
      smart_routing_enabled: this.credential.smart_routing_enabled,
    };
  }

  /**
   * Build credential with proper username formatting
   */
  private buildCredential(): ProxyCredential {
    let username = this.credential.username;

    // Remove existing suffixes to avoid duplication
    username = username
      .replace(/-session-[a-zA-Z0-9]+/, "")
      .replace(/-routing-smart/, "");

    // Add sticky session suffix
    if (this.credential.sticky_enabled && this.credential.session_salt) {
      username += `-session-${this.credential.session_salt}`;
    }

    // Add smart routing suffix
    if (this.credential.smart_routing_enabled) {
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
 * import Aluvia from 'aluvia';
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
 * ```
 *
 * @public
 */
export class Aluvia {
  private config: ProxyConfig = {
    host: "proxy.aluvia.io",
    httpPort: 8080,
  };

  private credentials: ProxyCredential[] = [];
  private token: string;

  /**
   * Creates a new Aluvia SDK instance.
   *
   * @param token - Your Aluvia API authentication token
   * @throws {ValidationError} When token is not provided or invalid
   *
   * @example
   * ```typescript
   * const sdk = new Aluvia('alv_abc123...');
   * ```
   */
  constructor(token: string) {
    this.token = validateApiToken(token);
  }

  /**
   * Retrieves the most recently created proxy from your account.
   *
   * This is typically the fastest way to get a working proxy connection
   * when you don't need a specific proxy instance.
   *
   * @returns A promise that resolves to a Proxy instance, or null if no proxies exist
   * @throws {Error} When the API request fails or authentication is invalid
   *
   * @example
   * ```typescript
   * const sdk = new Aluvia('your-token');
   * const proxy = await sdk.first();
   *
   * if (proxy) {
   *   console.log('Proxy URL:', proxy.url());
   * } else {
   *   console.log('No proxies available, create one first');
   * }
   * ```
   */
  async first(): Promise<Proxy | null> {
    try {
      const headers = { Authorization: `Bearer ${this.token}` };
      const authResponse = await api.get<{
        success: boolean;
        data: { username: string; password: string };
      }>("/credentials/latest", headers);

      if (authResponse.success) {
        this.credentials = [
          {
            username: authResponse.data.username,
            password: authResponse.data.password,
            sticky_enabled: false,
            smart_routing_enabled: false,
          },
        ];
        return new Proxy(this.credentials[0], this.config, this);
      }

      throw new ApiError("Failed to load credentials");
    } catch (error) {
      throw error; // Re-throw errors (they're already properly typed)
    }
  }

  /**
   * Finds and returns a specific proxy by its username.
   *
   * The method automatically handles username variations by stripping
   * session and routing suffixes before performing the lookup.
   *
   * @param username - The base username of the proxy to find
   * @returns A promise that resolves to a Proxy instance, or null if not found
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
      const baseUsername = username
        .replace(/-session-[a-zA-Z0-9]+/, "")
        .replace(/-routing-smart/, "");

      const headers = { Authorization: `Bearer ${this.token}` };
      const response = await api.get<{
        success: boolean;
        data: { username: string; password: string };
      }>("/credentials/" + baseUsername, headers);

      if (response.success) {
        const apiCredential: ProxyCredential = {
          username: response.data.username,
          password: response.data.password,
          sticky_enabled: false,
          smart_routing_enabled: false,
        };

        return new Proxy(apiCredential, this.config, this);
      }

      return null;
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) {
        return null; // Proxy not found is not an error condition
      }
      throw error; // Re-throw other errors
    }
  }

  /**
   * Creates new proxy instances in your Aluvia account.
   *
   * @param count - The number of proxies to create (default: 1, max varies by plan)
   * @returns A promise that resolves to an array of newly created Proxy instances
   * @throws {Error} When creation fails, quota is exceeded, or API request fails
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
    const response = await api.post<{
      success: boolean;
      data: { username: string; password: string }[];
      message?: string;
    }>("/credentials", { count: validCount }, headers);

    if (response.success) {
      const newCredentials = response.data.map((cred: any) => ({
        username: cred.username,
        password: cred.password,
        sticky_enabled: false,
        smart_routing_enabled: false,
      }));

      // Add to in-memory credentials
      this.credentials.push(...newCredentials);

      return newCredentials.map(
        (cred: any) => new Proxy(cred, this.config, this)
      );
    }

    throw new ApiError(response.message || "Failed to create proxies");
  }

  /**
   * Permanently deletes a proxy from your account by username.
   *
   * This action cannot be undone. The proxy will be immediately unavailable
   * for new connections and removed from your account.
   *
   * @param username - The username of the proxy to delete
   * @returns A promise that resolves to true if deletion was successful
   * @throws {Error} When deletion fails or the proxy doesn't exist
   *
   * @example
   * ```typescript
   * const sdk = new Aluvia('your-token');
   * const success = await sdk.delete('user123');
   *
   * if (success) {
   *   console.log('Proxy deleted successfully');
   * }
   * ```
   */
  async delete(username: string): Promise<boolean> {
    const validUsername = validateUsername(username);
    const baseUsername = validUsername
      .replace(/-session-[a-zA-Z0-9]+/, "")
      .replace(/-routing-smart/, "");

    const headers = { Authorization: `Bearer ${this.token}` };
    const response = await api.delete<{ success: boolean; message?: string }>(
      "/credentials/" + baseUsername,
      headers
    );

    if (response.success) {
      // Remove from in-memory credentials
      this.credentials = this.credentials.filter((cred) => {
        const credBaseUsername = cred.username
          .replace(/-session-[a-zA-Z0-9]+/, "")
          .replace(/-routing-smart/, "");
        return credBaseUsername !== baseUsername;
      });
      return true;
    }

    throw new ApiError(response.message || "Failed to delete proxy");
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
  all(): Proxy[] {
    return this.credentials.map((cred) => new Proxy(cred, this.config, this));
  }
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

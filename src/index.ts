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
  stickyEnabled?: boolean;
  /** Whether smart routing is enabled for this proxy */
  smartRoutingEnabled?: boolean;
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
  /** The HTTPS port number for the proxy server */
  httpsPort: number;
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
 * // Get the proxy URLs
 * const httpUrl = proxy.url('http');   // http://username:password@proxy.aluvia.io:8080
 * const httpsUrl = proxy.url('https'); // https://username:password@proxy.aluvia.io:8443
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
   * const usage = await proxy.usage();
   * console.log(`This proxy has used ${usage.data_used} GB`);
   * 
   * // Get usage for last week
   * const lastWeek = await proxy.usage({
   *   usage_start: Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60),
   *   usage_end: Math.floor(Date.now() / 1000)
   * });
   * ```
   */
  async usage(options?: {
    usage_start?: number;
    usage_end?: number;
  }): Promise<{
    username: string;
    usage_start: number;
    usage_end: number;
    data_used: number;
    created_at: number;
    updated_at: number;
    options: {
      use_sticky?: boolean;
    };
  }> {
    return this.sdk.usage(this.credential.username, options);
  }

  /**
   * Updates the proxy configuration on the server.
   * 
   * This method syncs the current proxy state (sticky sessions, smart routing)
   * with the Aluvia API server.
   *
   * @returns A promise that resolves to true if the update was successful
   * @throws {Error} When the update fails or the proxy doesn't exist
   *
   * @example
   * ```typescript
   * const proxy = await sdk.first();
   * proxy.enableSticky();
   * await proxy.update(); // Sync with server
   * ```
   */
  async update(): Promise<boolean> {
    return this.sdk.update(this.credential.username, {
      stickyEnabled: this.credential.stickyEnabled,
    });
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
  async enableSticky(): Promise<this> {
    this.credential.stickyEnabled = true;
    this.credential.session_salt = this.generateSessionSalt();
    
    await this.update();
    
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
   * await proxy.enableSmartRouting();
   * ```
   */
  async enableSmartRouting(): Promise<this> {
    this.credential.smartRoutingEnabled = true;
    
    await this.update();
    
    return this;
  }

  /**
   * Disables sticky sessions for this proxy connection.
   *
   * @returns The current Proxy instance for method chaining
   */
  async disableSticky(): Promise<this> {
    this.credential.stickyEnabled = false;
    this.credential.session_salt = undefined;
    
    await this.update();
    
    return this;
  }

  /**
   * Disables smart routing for this proxy connection.
   *
   * @returns The current Proxy instance for method chaining
   */
  async disableSmartRouting(): Promise<this> {
    this.credential.smartRoutingEnabled = false;
    
    await this.update();
    
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
  url(protocol: "http" | "https" = "http"): string {
    const builtCredential = this.buildCredential();
    const port =
      protocol === "https" ? this.config.httpsPort : this.config.httpPort;

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
   * console.log(info.username, info.host, info.stickyEnabled);
   * ```
   */
  get info() {
    const builtCredential = this.buildCredential();
    return {
      username: builtCredential.username,
      password: builtCredential.password,
      host: this.config.host,
      httpPort: this.config.httpPort,
      httpsPort: this.config.httpsPort,
      stickyEnabled: this.credential.stickyEnabled,
      smartRoutingEnabled: this.credential.smartRoutingEnabled,
    };
  }

  /**
   * Build credential with proper username formatting
   */
  private buildCredential(): ProxyCredential {
    let username = this.stripUsernameSuffixes(this.credential.username);

    // Add sticky session suffix
    if (this.credential.stickyEnabled && this.credential.session_salt) {
      username += `-session-${this.credential.session_salt}`;
    }

    // Add smart routing suffix
    if (this.credential.smartRoutingEnabled) {
      username += "-routing-smart";
    }

    return {
      ...this.credential,
      username,
    };
  }

  /**
   * Strip session and routing suffixes from username
   */
  private stripUsernameSuffixes(username: string): string {
    return username
      .replace(/-session-[a-zA-Z0-9]+/, "")
      .replace(/-routing-smart/, "");
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
    httpsPort: 8443,
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
   * Strip session and routing suffixes from username
   */
  private stripUsernameSuffixes(username: string): string {
    return username
      .replace(/-session-[a-zA-Z0-9]+/, "")
      .replace(/-routing-smart/, "");
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
      const response = await api.get<{
        success: boolean;
        data: Array<{
          username: string;
          password: string;
          total_data_used: number;
          created_at: number;
          updated_at: number;
          options: {
            use_sticky?: boolean;
          } | {};
        }>;
      }>("/credentials", headers);

      if (response.success && response.data.length > 0) {
        // Find the proxy with the latest created_at timestamp
        const latestProxy = response.data.reduce((latest, current) => 
          current.created_at > latest.created_at ? current : latest
        );

        const options = latestProxy.options || {};
        const credential: ProxyCredential = {
          username: latestProxy.username,
          password: latestProxy.password,
          stickyEnabled: 'use_sticky' in options ? (options as any).use_sticky || false : false
        };

        this.credentials = [credential];
        return new Proxy(credential, this.config, this);
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
      const baseUsername = this.stripUsernameSuffixes(username);

      const headers = { Authorization: `Bearer ${this.token}` };
      const response = await api.get<{
        success: boolean;
        data: { username: string; password: string };
      }>("/credentials/" + baseUsername, headers);

      if (response.success) {
        const apiCredential: ProxyCredential = {
          username: response.data.username,
          password: response.data.password,
          stickyEnabled: false,
          smartRoutingEnabled: false,
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
        stickyEnabled: false,
        smartRoutingEnabled: false,
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
   * Updates a specific proxy's configuration on the server.
   *
   * This method allows you to update proxy settings (sticky sessions, smart routing)
   * for a specific proxy by username, similar to how find() and delete() work.
   *
   * @param username - The username of the proxy to update
   * @param options - The settings to update
   * @returns A promise that resolves to true if the update was successful
   * @throws {Error} When the update fails or the proxy doesn't exist
   *
   * @example
   * ```typescript
   * const sdk = new Aluvia('your-token');
   * 
   * // Update specific proxy settings
   * await sdk.update('user123', {
   *   stickyEnabled: true,
   *   smartRoutingEnabled: true,
   *   session_salt: 'abc12345'
   * });
   * ```
   */
  async update(
    username: string, 
    options: {
      stickyEnabled?: boolean;
    }
  ): Promise<boolean> {
    const baseUsername = this.stripUsernameSuffixes(username);
    const headers = { Authorization: `Bearer ${this.token}` };
    
    const updateData = {
      options: {
        use_sticky: options.stickyEnabled,
      }
    };

    const response = await api.patch<{ 
      success: boolean; 
      data?: {
        username: string;
        created_at: number;
        updated_at: number;
        options: {
          use_sticky?: boolean;
        };
      };
      message?: string;
    }>(
      `/credentials/${baseUsername}`,
      updateData,
      headers
    );

    if (response.success) {
      // Update local cache if the proxy exists
      const existingCred = this.credentials.find(cred => 
        this.stripUsernameSuffixes(cred.username) === baseUsername
      );
      
      if (existingCred) {
        existingCred.stickyEnabled = options.stickyEnabled ?? existingCred.stickyEnabled;
      }
      
      return true;
    }

    throw new ApiError(response.message || "Failed to update proxy");
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
    const baseUsername = this.stripUsernameSuffixes(validUsername);

    const headers = { Authorization: `Bearer ${this.token}` };
    const response = await api.delete<{ success: boolean; message?: string }>(
      "/credentials/" + baseUsername,
      headers
    );

    if (response.success) {
      // Remove from in-memory credentials
      this.credentials = this.credentials.filter((cred) => {
        const credBaseUsername = this.stripUsernameSuffixes(cred.username);
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

  /**
   * Retrieves detailed usage information for a specific proxy.
   *
   * This method provides comprehensive usage statistics including data consumption
   * over a specified time period or the default period if no dates are provided.
   *
   * @param username - The username of the proxy to get usage for
   * @param options - Optional date range filtering
   * @returns A promise that resolves to detailed usage information
   * @throws {Error} When the API request fails or the proxy doesn't exist
   *
   * @example
   * ```typescript
   * const sdk = new Aluvia('your-token');
   * 
   * // Get usage for current period
   * const usage = await sdk.usage('user123');
   * console.log(`Data used: ${usage.data_used} GB`);
   * 
   * // Get usage for specific date range
   * const customUsage = await sdk.usage('user123', {
   *   usage_start: 1705478400,
   *   usage_end: 1706083200
   * });
   * ```
   */
  async usage(
    username: string,
    options?: {
      usage_start?: number;
      usage_end?: number;
    }
  ): Promise<{
    username: string;
    usage_start: number;
    usage_end: number;
    data_used: number;
    created_at: number;
    updated_at: number;
    options: {
      use_sticky?: boolean;
    };
  }> {
    const validUsername = validateUsername(username);
    const baseUsername = this.stripUsernameSuffixes(validUsername);
    const headers = { Authorization: `Bearer ${this.token}` };

    // Build query parameters
    const queryParams = new URLSearchParams();
    if (options?.usage_start) {
      queryParams.append('usage_start', options.usage_start.toString());
    }
    if (options?.usage_end) {
      queryParams.append('usage_end', options.usage_end.toString());
    }

    const endpoint = `/credentials/${baseUsername}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

    const response = await api.get<{
      success: boolean;
      data: {
        username: string;
        usage_start: number;
        usage_end: number;
        data_used: number;
        created_at: number;
        updated_at: number;
        options: {
          use_sticky?: boolean;
        };
      };
      message?: string;
    }>(endpoint, headers);

    if (response.success) {
      return response.data;
    }

    throw new ApiError(response.message || "Failed to get proxy usage");
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

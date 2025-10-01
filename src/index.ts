import { api } from './apiClient.js';

export interface ProxyCredential {
  username: string;
  password: string;
  sticky_enabled?: boolean;
  smart_routing_enabled?: boolean;
  session_salt?: string;
}

export interface ProxyConfig {
  host: string;
  httpPort: number;
}

export class Proxy {
  private credential: ProxyCredential;
  private config: ProxyConfig;
  private sdk: Aluvia;

  constructor(credential: ProxyCredential, config: ProxyConfig, sdk: Aluvia) {
    this.credential = credential;
    this.config = config;
    this.sdk = sdk;
  }

  /**
   * Enable sticky sessions for this proxy
   */
  enable_sticky(): this {
    this.credential.sticky_enabled = true;
    this.credential.session_salt = this.generateSessionSalt();
    return this;
  }

  /**
   * Enable smart routing for this proxy
   */
  enable_smart_routing(): this {
    this.credential.smart_routing_enabled = true;
    return this;
  }

  /**
   * Disable sticky sessions
   */
  disable_sticky(): this {
    this.credential.sticky_enabled = false;
    this.credential.session_salt = undefined;
    return this;
  }

  /**
   * Disable smart routing
   */
  disable_smart_routing(): this {
    this.credential.smart_routing_enabled = false;
    return this;
  }

  /**
   * Get the formatted proxy URL
   */
  url(protocol: 'http' = 'http'): string {
    const builtCredential = this.buildCredential();
    const port = this.config.httpPort;

    return `${protocol}://${builtCredential.username}:${builtCredential.password}@${this.config.host}:${port}`;
  }

  /**
   * Delete this proxy
   */
  async delete(): Promise<boolean> {
    return this.sdk.delete(this.credential.username);
  }

  /**
   * Get proxy info
   */
  get info() {
    const builtCredential = this.buildCredential();
    return {
      username: builtCredential.username,
      password: builtCredential.password,
      host: this.config.host,
      httpPort: this.config.httpPort,
      sticky_enabled: this.credential.sticky_enabled,
      smart_routing_enabled: this.credential.smart_routing_enabled
    };
  }

  /**
   * Build credential with proper username formatting
   */
  private buildCredential(): ProxyCredential {
    let username = this.credential.username;
    
    // Remove existing suffixes to avoid duplication
    username = username
      .replace(/-session-[a-zA-Z0-9]+/, '')
      .replace(/-routing-smart/, '');
    
    // Add sticky session suffix
    if (this.credential.sticky_enabled && this.credential.session_salt) {
      username += `-session-${this.credential.session_salt}`;
    }
    
    // Add smart routing suffix
    if (this.credential.smart_routing_enabled) {
      username += '-routing-smart';
    }
    
    return {
      ...this.credential,
      username
    };
  }

  /**
   * Generate random session salt
   */
  private generateSessionSalt(length: number = 8): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }
}

export class Aluvia {
  private config: ProxyConfig = {
    host: 'proxy.aluvia.io',
    httpPort: 8080,
  };

  private credentials: ProxyCredential[] = [];
  private token?: string;

  constructor(token?: string) {
    this.token = token;
  }

  /**
   * Returns the first proxy credential as Proxy instance
   */
  async first(): Promise<Proxy | null> {
    try {
      console.log(this.token);
      const headers = { Authorization: `Bearer ${this.token}` };
      const authResponse = await api.get('/credentials/latest', { headers });
      
      if (authResponse.data.success) {
        this.credentials = [{
          username: authResponse.data.data.username,
          password: authResponse.data.data.password,
          sticky_enabled: false,
          smart_routing_enabled: false
        }];
        return new Proxy(this.credentials[0], this.config, this);
      }
      
      throw new Error('Failed to load credentials');
    } catch (error) {
      console.error('Failed to load credentials:', error);
      throw error;
    }
  }

  /**
   * Returns the proxy matching username as Proxy instance
   */
  async find(username: string): Promise<Proxy | null> {
    try {
      const baseUsername = username
        .replace(/-session-[a-zA-Z0-9]+/, '')
        .replace(/-routing-smart/, '');

      const headers = this.token ? { Authorization: `Bearer ${this.token}` } : {};
      const response = await api.get('/credentials/' + baseUsername, { headers });

      if (response.data.success) {
        const apiCredential: ProxyCredential = {
          username: response.data.data.username,
          password: response.data.data.password,
          sticky_enabled: false,
          smart_routing_enabled: false
        };

        return new Proxy(apiCredential, this.config, this);
      }

      return null;
    } catch (error) {
      console.error('Failed to find credential:', error);
      return null; 
    }
  }

  /**
   * Creates [count] proxies and returns them as Proxy instances
   */
  async create(count: number = 1): Promise<Proxy[]> {
    try {
      const headers = this.token ? { Authorization: `Bearer ${this.token}` } : {};
      const response = await api.post('/credentials', { count }, { headers });
      
      if (response.data.success) {
        const newCredentials = response.data.data.map((cred: any) => ({
          username: cred.username,
          password: cred.password,
          sticky_enabled: false,
          smart_routing_enabled: false
        }));

        // Add to in-memory credentials
        this.credentials.push(...newCredentials);

        return newCredentials.map((cred: any) => new Proxy(cred, this.config, this));
      }
      
      throw new Error(response.data.message || 'Failed to create proxies');
    } catch (error) {
      console.error('Failed to create proxies:', error);
      throw error;
    }
  }

  /**
   * Delete proxy by username
   */
  async delete(username: string): Promise<boolean> {
    try {
      const baseUsername = username
        .replace(/-session-[a-zA-Z0-9]+/, '')
        .replace(/-routing-smart/, '');

      const headers = this.token ? { Authorization: `Bearer ${this.token}` } : {};
      const response = await api.delete('/credentials/' + baseUsername, { headers });

      if (response.data.success) {
        // Remove from in-memory credentials
        this.credentials = this.credentials.filter(cred => {
          const credBaseUsername = cred.username
            .replace(/-session-[a-zA-Z0-9]+/, '')
            .replace(/-routing-smart/, '');
          return credBaseUsername !== baseUsername;
        });
        return true;
      }

      throw new Error(response.data.message || 'Failed to delete proxy');
    } catch (error) {
      console.error('Failed to delete proxy:', error);
      throw error;
    }
  }

  /**
   * Get all proxies as Proxy instances
   */
  all(): Proxy[] {
    return this.credentials.map(cred => new Proxy(cred, this.config, this));
  }
}

export default Aluvia;

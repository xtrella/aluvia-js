# Aluvia SDK for Node.js

[![npm version](https://badge.fury.io/js/aluvia-ts-sdk.svg)](https://www.npmjs.com/package/aluvia-ts-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org)
[![Node.js](https://img.shields.io/node/v/aluvia-ts-sdk.svg)](https://nodejs.org)

The **official Aluvia proxy management SDK** for Node.js and modern JavaScript environments. This lightweight, TypeScript-first SDK provides a simple and powerful interface to manage your Aluvia proxies programmatically.

## ✨ Features

- 🌍 **Universal**: Works in Node.js (≥16) and modern browsers
- 🏷️ **TypeScript**: Full TypeScript support with comprehensive type definitions
- ⚡ **Lightweight**: Minimal dependencies, uses native `fetch` API
- 🔒 **Secure**: Built-in authentication and comprehensive error handling
- 🧪 **Well Tested**: Comprehensive test suite with high coverage
- 📖 **Documented**: Extensive JSDoc comments and usage examples
- 🚀 **Production Ready**: Battle-tested in production environments

## 📦 Installation

```bash
npm install aluvia-ts-sdk
```

```bash
yarn add aluvia-ts-sdk
```

```bash
pnpm add aluvia-ts-sdk
```

## 🚀 Quick Start

### Basic Setup

```typescript
import Aluvia from "aluvia-ts-sdk";

// Initialize with your API token
const aluvia = new Aluvia("your-api-token");
```

### Get Your First Proxy

```typescript
try {
  const proxy = await aluvia.first();

  if (proxy) {
    console.log("Proxy URL:", proxy.toUrl());
    console.log("HTTPS URL:", proxy.toUrl("https"));
    console.log("Username:", proxy.username);
    console.log("Password:", proxy.password);
    console.log("Host:", proxy.host);
  } else {
    console.log("No proxies available. Create one first!");
  }
} catch (error) {
  console.error("Error fetching proxy:", error.message);
}
```

## 📚 Usage Examples

### Creating Proxies

```typescript
import Aluvia from "aluvia-ts-sdk";

const aluvia = new Aluvia("your-api-token");

try {
  // Create a single proxy
  const [proxy] = await aluvia.create(1);
  console.log("Created proxy:", proxy.toUrl());

  // Create multiple proxies
  const proxies = await aluvia.create(5);
  console.log(`Created ${proxies.length} proxies`);

  proxies.forEach((proxy, index) => {
    console.log(`Proxy ${index + 1}: ${proxy.toUrl()}`);
  });
} catch (error) {
  if (error.name === "ApiError") {
    console.error("API Error:", error.message);
  } else if (error.name === "ValidationError") {
    console.error("Validation Error:", error.message);
  } else {
    console.error("Unexpected error:", error.message);
  }
}
```

### Finding and Managing Proxies

```typescript
// Find a specific proxy by username
const proxy = await aluvia.find("username123");

if (proxy) {
  console.log("Found proxy:", proxy.toJSON());

  // Update proxy settings
  await aluvia.update("username123", {
    useSticky: true,
    useSmartRouting: true,
  });

  // Get usage information
  const usage = await aluvia.getUsage("username123");
  console.log(`Data used: ${usage.dataUsed} GB`);
} else {
  console.log("Proxy not found");
}
```

### Advanced Proxy Features

```typescript
const proxy = await aluvia.first();

if (proxy) {
  // Laravel-style property setting
  proxy.useSticky = true;
  proxy.useSmartRouting = true;
  await proxy.save(); // Apply changes to server

  // Get enhanced proxy URL with all features
  const enhancedUrl = proxy.toUrl();
  console.log("Enhanced proxy URL:", enhancedUrl);

  // Get detailed proxy information
  console.log("Username:", proxy.username);
  console.log("Password:", proxy.password);
  console.log("Host:", proxy.host);
  console.log("HTTP Port:", proxy.httpPort);
  console.log("HTTPS Port:", proxy.httpsPort);
  console.log("Sticky enabled:", proxy.useSticky);
  console.log("Smart routing enabled:", proxy.useSmartRouting);

  // Get usage information
  const usage = await proxy.getUsage();
  console.log(`Data used: ${usage.dataUsed} GB`);
}
```

### Usage Analytics

```typescript
// Get usage for current period
const currentUsage = await aluvia.getUsage("username123");
console.log("Current usage:", currentUsage);

// Get usage for specific date range (Unix timestamps)
const weekAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
const now = Math.floor(Date.now() / 1000);

const weeklyUsage = await aluvia.getUsage("username123", {
  usageStart: weekAgo,
  usageEnd: now,
});

console.log(`Weekly data usage: ${weeklyUsage.dataUsed} GB`);
```

### Error Handling

```typescript
import Aluvia, {
  ApiError,
  ValidationError,
  NetworkError,
  NotFoundError,
} from "aluvia-ts-sdk";

const aluvia = new Aluvia("your-api-token");

try {
  const proxy = await aluvia.first();
  // ... use proxy
} catch (error) {
  if (error instanceof ValidationError) {
    console.error("Validation failed:", error.message);
  } else if (error instanceof ApiError) {
    console.error("API error:", error.message, "Status:", error.statusCode);
  } else if (error instanceof NetworkError) {
    console.error("Network error:", error.message);
  } else if (error instanceof NotFoundError) {
    console.error("Resource not found:", error.message);
  } else {
    console.error("Unexpected error:", error);
  }
}
```

## 🔧 API Reference

### `Aluvia` Class

#### Constructor

```typescript
new Aluvia(token: string)
```

Creates a new Aluvia SDK instance.

**Parameters:**

- `token`: Your Aluvia API authentication token

**Throws:**

- `ValidationError`: When token is invalid or empty

#### Methods

##### `first(): Promise<Proxy | null>`

Retrieves the most recently created proxy from your account.

**Returns:** A promise that resolves to a Proxy instance, or null if no proxies exist

**Throws:** `ApiError`, `ValidationError`, `NetworkError`

##### `find(username: string): Promise<Proxy | null>`

Finds and returns a specific proxy by its username.

**Parameters:**

- `username`: The base username of the proxy to find

**Returns:** A promise that resolves to a Proxy instance, or null if not found

**Throws:** `ApiError`, `ValidationError`, `NetworkError`

##### `create(count?: number): Promise<Proxy[]>`

Creates new proxy instances in your Aluvia account.

**Parameters:**

- `count`: The number of proxies to create (default: 1)

**Returns:** A promise that resolves to an array of newly created Proxy instances

**Throws:** `ApiError`, `ValidationError`, `NetworkError`

##### `update(username: string, options: UpdateOptions): Promise<Proxy | null>`

Updates a specific proxy's configuration on the server.

**Parameters:**

- `username`: The username of the proxy to update
- `options`: Object with `useSticky?: boolean` and `useSmartRouting?: boolean`

**Returns:** A promise that resolves to the updated Proxy instance

**Throws:** `ApiError`, `ValidationError`, `NetworkError`

##### `delete(username: string): Promise<void>`

Permanently deletes a proxy from your account by username.

**Parameters:**

- `username`: The username of the proxy to delete

**Throws:** `ApiError`, `ValidationError`, `NetworkError`

##### `getUsage(username: string, options?: UsageOptions): Promise<UsageInfo>`

Retrieves detailed usage information for a specific proxy.

**Parameters:**

- `username`: The username of the proxy to get usage for
- `options`: Optional object with `usageStart?: number` and `usageEnd?: number` (Unix timestamps)

**Returns:** A promise that resolves to usage information with `usageStart`, `usageEnd`, and `dataUsed` properties

**Throws:** `ApiError`, `ValidationError`, `NetworkError`

##### `all(): Promise<Proxy[]>`

Returns all currently loaded proxy instances.

**Returns:** A promise that resolves to an array of all loaded Proxy instances

### `Proxy` Class

#### Properties (Getters)

##### `username: string`

Gets the current username with all enabled features encoded.

##### `password: string`

Gets the proxy password for authentication.

##### `host: string`

Gets the proxy server hostname.

##### `httpPort: number`

Gets the HTTP port number for the proxy server (typically 8080).

##### `httpsPort: number`

Gets the HTTPS port number for the proxy server (typically 8443).

##### `useSticky: boolean` (Getter/Setter)

Gets or sets whether sticky sessions are enabled for this proxy.

##### `useSmartRouting: boolean` (Getter/Setter)

Gets or sets whether smart routing is enabled for this proxy.

#### Methods

##### `toUrl(protocol?: 'http' | 'https'): string`

Generates a formatted proxy URL for connecting through this proxy.

**Parameters:**

- `protocol`: The protocol to use in the URL (default: 'http')

**Returns:** A fully formatted proxy URL ready for use

##### `save(): Promise<this>`

Saves any changes made to the proxy configuration to the server.

**Returns:** A promise that resolves to the updated Proxy instance

**Throws:** `ApiError`, `NetworkError`

##### `delete(): Promise<void>`

Permanently deletes this proxy from your Aluvia account.

**Throws:** `ApiError`

##### `getUsage(options?: UsageOptions): Promise<UsageInfo>`

Retrieves detailed usage information for this proxy.

**Parameters:**

- `options`: Optional object with `usageStart?: number` and `usageEnd?: number` (Unix timestamps)

**Returns:** A promise that resolves to usage information

**Throws:** `ApiError`, `ValidationError`, `NetworkError`

##### `toJSON(): Record<string, any>`

Converts the proxy instance to a JSON-serializable object.

**Returns:** A plain object containing all proxy properties

### Type Definitions

```typescript
interface ProxyCredential {
  username: string;
  password: string;
  useSticky?: boolean;
  useSmartRouting?: boolean;
  sessionSalt?: string;
}

interface ProxyConfig {
  host: string;
  httpPort: number;
  httpsPort: number;
}

interface UsageOptions {
  usageStart?: number;
  usageEnd?: number;
}

interface UsageInfo {
  usageStart: number;
  usageEnd: number;
  dataUsed: number;
}
```

## ⚙️ TypeScript Configuration

For optimal TypeScript experience, ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true
  }
}
```

## 🧪 Testing

```bash
npm test                 # Run tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report
```

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

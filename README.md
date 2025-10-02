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
import Aluvia from 'aluvia-ts-sdk';

// Initialize with your API token
const aluvia = new Aluvia("your-api-token");
```

### Get Your First Proxy

```typescript
try {
  const proxy = await aluvia.first();

  if (proxy) {
    console.log("Proxy URL:", proxy.url());
    console.log("HTTPS URL:", proxy.url("https"));
    console.log("Proxy Info:", proxy.info);
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
import Aluvia from 'aluvia-ts-sdk';

const aluvia = new Aluvia("your-api-token");

try {
  // Create a single proxy
  const [proxy] = await aluvia.create(1);
  console.log("Created proxy:", proxy.url());

  // Create multiple proxies
  const proxies = await aluvia.create(5);
  console.log(`Created ${proxies.length} proxies`);

  proxies.forEach((proxy, index) => {
    console.log(`Proxy ${index + 1}: ${proxy.url()}`);
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
  console.log("Found proxy:", proxy.info);

  // Update proxy settings
  await aluvia.update("username123", {
    stickyEnabled: true,
    smartRoutingEnabled: true,
  });

  // Get usage information
  const usage = await aluvia.usage("username123");
  console.log(`Data used: ${usage.dataUsed} GB`);
} else {
  console.log("Proxy not found");
}
```

### Advanced Proxy Features

```typescript
const proxy = await aluvia.first();

if (proxy) {
  // Enable sticky sessions for consistent IP routing
  await proxy.enableSticky();

  // Enable smart routing for optimal performance
  await proxy.enableSmartRouting();

  // Method chaining is supported
  await proxy.enableSticky().then((p) => p.enableSmartRouting());

  // Get enhanced proxy URL with all features
  const enhancedUrl = proxy.url();
  console.log("Enhanced proxy URL:", enhancedUrl);

  // Get detailed proxy information
  const info = proxy.info;
  console.log("Sticky enabled:", info.stickyEnabled);
  console.log("Smart routing enabled:", info.smartRoutingEnabled);
}
```

### Usage Analytics

```typescript
// Get usage for current period
const currentUsage = await aluvia.usage("username123");
console.log("Current usage:", currentUsage);

// Get usage for specific date range (Unix timestamps)
const weekAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
const now = Math.floor(Date.now() / 1000);

const weeklyUsage = await aluvia.usage("username123", {
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

Retrieves the most recently created proxy.

##### `find(username: string): Promise<Proxy | null>`

Finds a proxy by username.

##### `create(count?: number): Promise<Proxy[]>`

Creates new proxy instances.

##### `update(username: string, options: UpdateOptions): Promise<boolean>`

Updates proxy configuration.

##### `delete(username: string): Promise<boolean>`

Deletes a proxy permanently.

##### `usage(username: string, options?: UsageOptions): Promise<UsageInfo>`

Retrieves usage information for a proxy.

##### `all(): Proxy[]`

Returns all currently loaded proxy instances.

### `Proxy` Class

#### Methods

##### `url(protocol?: 'http' | 'https'): string`

Generates a formatted proxy URL.

##### `enableSticky(): Promise<this>`

Enables sticky sessions for consistent IP routing.

##### `enableSmartRouting(): Promise<this>`

Enables smart routing for optimal performance.

##### `disableSticky(): Promise<this>`

Disables sticky sessions.

##### `disableSmartRouting(): Promise<this>`

Disables smart routing.

##### `update(): Promise<boolean>`

Syncs proxy configuration with the server.

##### `delete(): Promise<boolean>`

Deletes this proxy from your account.

##### `usage(options?: UsageOptions): Promise<UsageInfo>`

Gets usage information for this proxy.

#### Properties

##### `info: ProxyInfo`

Gets comprehensive proxy information.

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

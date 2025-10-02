# Aluvia SDK for Node.js

The official Aluvia proxy management SDK for Node.js and browser environments. This lightweight, TypeScript-first SDK provides a simple interface to manage your Aluvia proxies programmatically.

## Features

- 🌍 **Universal**: Works in both Node.js (≥16) and browser environments
- 🏷️ **TypeScript**: Full TypeScript support with comprehensive type definitions
- ⚡ **Lightweight**: Zero dependencies in modern environments (uses native `fetch`)
- 🔒 **Secure**: Built-in authentication and error handling
- 🧪 **Tested**: Comprehensive test suite with high coverage
- 📖 **Well-documented**: Extensive JSDoc comments and examples

## Installation

```bash
npm install aluvia
```

## Usage

### Basic Setup

```javascript
import Aluvia from "aluvia";

const aluvia = new Aluvia("your-api-token");
```

### Get First Available Proxy

```javascript
const proxy = await aluvia.first();
if (proxy) {
  console.log("Proxy URL:", proxy.url());
  console.log("Proxy Info:", proxy.info);
}
```

### Find Specific Proxy

```javascript
const proxy = await aluvia.find("username");
if (proxy) {
  console.log("Found proxy:", proxy.url());
}
```

### Create New Proxies

```javascript
// Create 5 new proxies
const proxies = await aluvia.create(5);
console.log(`Created ${proxies.length} proxies`);

proxies.forEach((proxy) => {
  console.log("Proxy URL:", proxy.url());
});
```

### Enable Proxy Features

```javascript
const proxy = await aluvia.first();
if (proxy) {
  // Enable sticky sessions
  proxy.enableSticky();

  // Enable smart routing
  proxy.enableSmartRouting();

  console.log("Enhanced proxy URL:", proxy.url());
}
```

### Delete Proxy

```javascript
const proxy = await aluvia.first();
if (proxy) {
  const deleted = await proxy.delete();
  console.log("Proxy deleted:", deleted);
}
```

## API Reference

### Aluvia Class

#### Constructor

- `new Aluvia(token?: string)` - Create a new Aluvia instance with optional API token

#### Methods

- `first(): Promise<Proxy | null>` - Get the first available proxy
- `find(username: string): Promise<Proxy | null>` - Find proxy by username
- `create(count?: number): Promise<Proxy[]>` - Create new proxies (default: 1)
- `delete(username: string): Promise<boolean>` - Delete proxy by username
- `all(): Proxy[]` - Get all loaded proxies

### Proxy Class

#### Methods

- `enableSticky(): this` - Enable sticky sessions
- `enableSmartRouting(): this` - Enable smart routing
- `disableSticky(): this` - Disable sticky sessions
- `disableSmartRouting(): this` - Disable smart routing
- `url(protocol?: 'http'): string` - Get formatted proxy URL
- `delete(): Promise<boolean>` - Delete this proxy

#### Properties

- `info` - Get proxy information object

## Advanced Configuration

### Custom API Origin

```javascript
import { setApiOrigin } from "aluvia";

setApiOrigin("https://custom-api.example.com");
```

### Token Provider

```javascript
import { setAppTokenProvider } from "aluvia";

setAppTokenProvider(() => {
  return localStorage.getItem("auth-token");
});
```

## Environment Variables

- `ALUVIA_API_ORIGIN` - Override the default API origin URL

## License

MIT

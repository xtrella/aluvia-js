# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-02

### Added

- 🎉 Initial release of the Aluvia SDK for Node.js
- Complete TypeScript support with full type definitions
- Comprehensive proxy management functionality:
  - Create, find, update, and delete proxies
  - Enable/disable sticky sessions and smart routing
  - Get detailed usage analytics
  - URL generation for HTTP/HTTPS protocols
- Production-ready error handling with specific error types:
  - `ApiError` for API-related errors
  - `ValidationError` for input validation failures
  - `NetworkError` for connectivity issues
  - `NotFoundError` for missing resources
- Extensive test suite with 84 test cases
- Comprehensive documentation and JSDoc comments
- Support for Node.js ≥16 and modern browsers
- Zero runtime dependencies (uses native `fetch`)

### Features

- **Proxy Management**: Full CRUD operations for proxy instances
- **Feature Control**: Toggle sticky sessions and smart routing
- **Usage Analytics**: Detailed data consumption tracking with date ranges
- **Type Safety**: Complete TypeScript definitions for all APIs
- **Error Handling**: Comprehensive error types and messages
- **Caching**: Intelligent local caching for improved performance
- **Method Chaining**: Fluent API design for better developer experience

### Technical Details

- Written in TypeScript with ES2020 target
- Uses ESM (ES Modules) format
- Comprehensive JSDoc documentation
- Jest-based testing with high coverage
- Supports both CommonJS and ESM imports
- Production-ready error messages and logging
- Follows semantic versioning

### Documentation

- Complete README with usage examples
- TypeScript configuration guide
- Error handling best practices
- Production deployment guidelines
- API reference documentation

[1.0.0]: https://github.com/xtrella/aluvia-js/releases/tag/v1.0.0

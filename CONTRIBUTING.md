# Contributing to Aluvia SDK

We love your input! We want to make contributing to the Aluvia SDK as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

### Pull Requests

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

### Development Setup

```bash
# Clone the repository
git clone https://github.com/xtrella/aluvia-js.git
cd aluvia-js

# Install dependencies
npm install

# Start development mode
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build the project
npm run build

# Lint the code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Code Style

- We use TypeScript for all source code
- We follow ESLint rules for code style
- We use Prettier for code formatting
- All code should include JSDoc comments
- All public APIs should be properly typed

### Testing

- Write tests for all new functionality
- Maintain or improve test coverage
- Use descriptive test names
- Follow the existing test patterns

### Commit Messages

We follow conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

Examples:

- `feat(proxy): add sticky session support`
- `fix(auth): handle invalid token errors`
- `docs(readme): update installation instructions`

## Bug Reports

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/xtrella/aluvia-js/issues).

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## Feature Requests

We welcome feature requests! Please provide:

- A clear and detailed explanation of the feature
- Use case and motivation
- Expected behavior
- Code examples if applicable

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Don't hesitate to reach out:

- 💬 Discord: [Join our community](https://discord.gg/aluvia)
- 📧 Email: support@aluvia.io
- 🐛 Issues: [GitHub Issues](https://github.com/xtrella/aluvia-js/issues)

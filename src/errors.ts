/**
 * Custom error types for the Aluvia SDK
 */

/**
 * Base class for all Aluvia SDK errors
 */
export abstract class AluviaError extends Error {
  abstract readonly code: string;

  constructor(message: string, public readonly details?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;

    // Maintain proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Thrown when API authentication fails
 */
export class AuthenticationError extends AluviaError {
  readonly code = "AUTHENTICATION_ERROR";

  constructor(
    message: string = "Authentication failed",
    details?: Record<string, any>
  ) {
    super(message, details);
  }
}

/**
 * Thrown when API requests fail due to network issues
 */
export class NetworkError extends AluviaError {
  readonly code = "NETWORK_ERROR";

  constructor(
    message: string = "Network request failed",
    details?: Record<string, any>
  ) {
    super(message, details);
  }
}

/**
 * Thrown when API returns an error response
 */
export class ApiError extends AluviaError {
  readonly code = "API_ERROR";

  constructor(
    message: string = "API request failed",
    public readonly statusCode?: number,
    details?: Record<string, any>
  ) {
    super(message, details);
  }
}

/**
 * Thrown when input validation fails
 */
export class ValidationError extends AluviaError {
  readonly code = "VALIDATION_ERROR";

  constructor(
    message: string = "Validation failed",
    details?: Record<string, any>
  ) {
    super(message, details);
  }
}

/**
 * Thrown when a requested resource is not found
 */
export class NotFoundError extends AluviaError {
  readonly code = "NOT_FOUND_ERROR";

  constructor(
    message: string = "Resource not found",
    details?: Record<string, any>
  ) {
    super(message, details);
  }
}

/**
 * Thrown when rate limits are exceeded
 */
export class RateLimitError extends AluviaError {
  readonly code = "RATE_LIMIT_ERROR";

  constructor(
    message: string = "Rate limit exceeded",
    public readonly retryAfter?: number,
    details?: Record<string, any>
  ) {
    super(message, details);
  }
}

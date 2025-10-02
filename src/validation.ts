/**
 * Input validation utilities for the Aluvia SDK
 */

import { ValidationError } from "./errors.js";

/**
 * Validates that a string is not empty or whitespace-only
 */
export function validateRequiredString(value: any, fieldName: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be a string`, {
      field: fieldName,
      received: typeof value,
    });
  }

  if (value.trim().length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`, {
      field: fieldName,
      value: value,
    });
  }

  return value.trim();
}

/**
 * Validates that a number is positive and within optional bounds
 */
export function validatePositiveNumber(
  value: any,
  fieldName: string,
  min: number = 1,
  max?: number
): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new ValidationError(`${fieldName} must be a positive integer`, {
      field: fieldName,
      received: typeof value,
      value: value,
    });
  }

  if (value < min) {
    throw new ValidationError(`${fieldName} must be at least ${min}`, {
      field: fieldName,
      value: value,
      minimum: min,
    });
  }

  if (max !== undefined && value > max) {
    throw new ValidationError(`${fieldName} cannot exceed ${max}`, {
      field: fieldName,
      value: value,
      maximum: max,
    });
  }

  return value;
}

/**
 * Validates API token format
 */
export function validateApiToken(token: any): string {
  const validToken = validateRequiredString(token, "API token");

  // Basic token format validation (adjust based on your token format)
  if (validToken.length < 10) {
    throw new ValidationError("API token appears to be too short", {
      field: "token",
      minLength: 10,
      actualLength: validToken.length,
    });
  }

  return validToken;
}

/**
 * Validates username format
 */
export function validateUsername(username: any): string {
  const validUsername = validateRequiredString(username, "username");

  // Check for reasonable username constraints
  if (validUsername.length > 100) {
    throw new ValidationError("Username is too long", {
      field: "username",
      maxLength: 100,
      actualLength: validUsername.length,
    });
  }

  return validUsername;
}

/**
 * Validates proxy count for creation
 */
export function validateProxyCount(count: any): number {
  return validatePositiveNumber(count, "proxy count", 1, 100);
}

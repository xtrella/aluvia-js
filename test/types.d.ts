/**
 * Type definitions for custom Jest matchers
 */

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidProxyUrl(): R;
    }
  }
}

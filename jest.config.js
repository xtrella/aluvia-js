/** @type {import('jest').Config} */
export default {
  preset: "ts-jest",
  testEnvironment: "node",

  // Test file patterns
  testMatch: ["**/test/integration.test.ts"],

  // Verbose output
  verbose: true,
};

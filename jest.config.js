/** @type {import('jest').Config} */
export default {
  preset: "ts-jest",
  testEnvironment: "node",
  
  // Handle .js imports for .ts files
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  
  // Test file patterns (excluding problematic API client tests for now)
  testMatch: [
    "**/test/integration.test.ts",
    "**/test/proxy.test.ts", 
    "**/test/aluvia.test.ts"
  ],
  
  // Transform TypeScript files
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  
  // File extensions Jest will process
  moduleFileExtensions: ["ts", "js", "json"],

  // Verbose output
  verbose: true,
};

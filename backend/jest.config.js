/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  // Set JWT env vars before any test module is loaded
  setupFiles: ['<rootDir>/jest.setup-env.js'],
  // Extend timeout for integration tests that hit the database
  testTimeout: 30000,
};

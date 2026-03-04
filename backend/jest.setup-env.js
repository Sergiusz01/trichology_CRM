/**
 * Jest environment setup — runs before each test file in the worker process.
 * Sets the minimum required env vars so that the app modules can be loaded.
 * DATABASE_URL must still be provided externally (e.g. via npm test env or CI).
 */

// Use stable test secrets (not production values)
process.env.JWT_SECRET = process.env.JWT_SECRET || 'jest-test-jwt-secret-not-for-production';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'jest-test-jwt-refresh-secret-not-for-production';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
process.env.NODE_ENV = 'test';

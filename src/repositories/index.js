const JsonDbUserRepository = require('../repositories/JsonDbUserRepository');

/**
 * Shared singleton instance of the persistent user repository.
 * Centralizes initialization so all controllers and services use the same
 * database connection without duplicating setup logic.
 *
 * The DB file path is read from the DB_PATH environment variable,
 * defaulting to './data/users' (creates data/users.json in the project root).
 */
const dbPath = process.env.DB_PATH || './data/users';
const userRepository = new JsonDbUserRepository(dbPath);

// Self-invoking async initialization
// The promise is exported so consumers can await it if needed during startup
const initPromise = userRepository.initialize().then(() => {
  console.log('[DB] JsonDbUserRepository initialized successfully.');
}).catch((err) => {
  console.error('[DB] Failed to initialize user repository:', err.message);
  process.exit(1); // Fail fast if DB cannot start
});

module.exports = { userRepository, initPromise };

const { JsonDB, Config } = require('node-json-db');
const UserRepository = require('./UserRepository');
const CryptoUtils = require('../utils/CryptoUtils');

/**
 * Concrete implementation of UserRepository that persists data to a local JSON file
 * using node-json-db. Data survives server restarts.
 *
 * Adheres to the Liskov Substitution Principle — this class fulfills the exact
 * contract of the abstract UserRepository and can replace InMemoryUserRepository
 * anywhere without modifying consuming code.
 */
class JsonDbUserRepository extends UserRepository {
  /**
   * @param {string} dbFilePath - Path (without extension) where the JSON file is stored.
   */
  constructor(dbFilePath = './data/users') {
    super();

    // Config params: (filename, saveOnPush, humanReadable, separator)
    // saveOnPush=true  → auto-writes to disk after every push()
    // humanReadable=true → pretty-prints the JSON for easy inspection
    this.db = new JsonDB(new Config(dbFilePath, true, true, '/'));
  }

  /**
   * One-time initialization: ensures the base data structure exists
   * and seeds the default admin user if the database is empty.
   * Must be called once before the repository is used.
   */
  async initialize() {
    // Ensure the /users and /meta paths exist
    const usersExist = await this.db.exists('/users');
    if (!usersExist) {
      await this.db.push('/users', {});
    }

    const metaExists = await this.db.exists('/meta/currentId');
    if (!metaExists) {
      await this.db.push('/meta/currentId', 1);
    }

    // Seed default admin user if the store is empty
    const users = await this.db.getData('/users');
    if (Object.keys(users).length === 0) {
      await this._seedDefaultUser();
    }
  }

  /**
   * Seeds a default user (admin / password123) for easy first-time testing.
   */
  async _seedDefaultUser() {
    const hashedPassword = CryptoUtils.hashPassword('password123');
    const id = await this._nextId();

    const adminUser = {
      id,
      username: 'admin',
      password: hashedPassword,
      mfaEnabled: false,
      mfaSecret: null,
      mfaBackupCodes: []
    };

    await this.db.push(`/users/${id}`, adminUser);
    console.log('[JsonDbUserRepository] Seeded default user: admin / password123');
  }

  /**
   * Atomically reads and increments the auto-incrementing user ID counter.
   * @returns {Promise<number>}
   */
  async _nextId() {
    const currentId = await this.db.getData('/meta/currentId');
    await this.db.push('/meta/currentId', currentId + 1);
    return currentId;
  }

  /**
   * Find a user by their unique numeric ID.
   * @param {number|string} id
   * @returns {Promise<Object|null>} Copy of user object or null
   */
  async findById(id) {
    const numId = Number(id);
    const exists = await this.db.exists(`/users/${numId}`);
    if (!exists) return null;

    const user = await this.db.getData(`/users/${numId}`);
    return { ...user };
  }

  /**
   * Find a user by their unique username (case-insensitive).
   * @param {string} username
   * @returns {Promise<Object|null>} Copy of user object or null
   */
  async findByUsername(username) {
    const lowerUsername = username.toLowerCase();
    const users = await this.db.getData('/users');

    for (const key of Object.keys(users)) {
      const user = users[key];
      if (user.username && user.username.toLowerCase() === lowerUsername) {
        return { ...user };
      }
    }
    return null;
  }

  /**
   * Create a new user record.
   * @param {Object} userData - Must include `username` and `password` (pre-hashed).
   * @returns {Promise<Object>} The created user object
   */
  async create(userData) {
    const existing = await this.findByUsername(userData.username);
    if (existing) {
      throw new Error(`Username '${userData.username}' is already taken.`);
    }

    const id = await this._nextId();

    const newUser = {
      id,
      username: userData.username,
      password: userData.password, // assumed pre-hashed
      mfaEnabled: false,
      mfaSecret: null,
      mfaBackupCodes: []
    };

    await this.db.push(`/users/${id}`, newUser);
    return { ...newUser };
  }

  /**
   * Update an existing user record (merges fields).
   * @param {number|string} id
   * @param {Object} updateData
   * @returns {Promise<Object>} The updated user object
   */
  async update(id, updateData) {
    const numId = Number(id);
    const exists = await this.db.exists(`/users/${numId}`);
    if (!exists) {
      throw new Error(`User with ID ${id} not found.`);
    }

    const user = await this.db.getData(`/users/${numId}`);

    const updatedUser = {
      ...user,
      ...updateData,
      id: numId // ensure ID is never changed
    };

    await this.db.push(`/users/${numId}`, updatedUser);
    return { ...updatedUser };
  }
}

module.exports = JsonDbUserRepository;

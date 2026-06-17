const UserRepository = require('./UserRepository');
const CryptoUtils = require('../utils/CryptoUtils');

/**
 * Concrete implementation of UserRepository that stores data in memory.
 * Adheres to the Liskov Substitution Principle by fulfilling the exact interface 
 * defined by the abstract UserRepository class.
 */
class InMemoryUserRepository extends UserRepository {
  constructor() {
    super();
    // In-memory user "database" map: id -> user
    this.users = new Map();
    this.currentId = 1;

    // Seed a default admin user for convenience
    this.seedDefaultUser();
  }

  /**
   * Seeds a default user (admin / password123) for easy testing.
   */
  seedDefaultUser() {
    const defaultPasswordHash = CryptoUtils.hashPassword('password123');
    const adminUser = {
      id: this.currentId++,
      username: 'admin',
      password: defaultPasswordHash,
      mfaEnabled: false,
      mfaSecret: null
    };
    this.users.set(adminUser.id, adminUser);
  }

  /**
   * Find a user by their unique ID.
   * @param {number} id 
   * @returns {Promise<Object|null>} Deep copy of user object or null
   */
  async findById(id) {
    const user = this.users.get(Number(id));
    if (!user) return null;
    // Return a copy to prevent direct mutation outside the repository
    return { ...user };
  }

  /**
   * Find a user by their unique username.
   * @param {string} username 
   * @returns {Promise<Object|null>} Deep copy of user object or null
   */
  async findByUsername(username) {
    const lowerUsername = username.toLowerCase();
    for (const user of this.users.values()) {
      if (user.username.toLowerCase() === lowerUsername) {
        return { ...user };
      }
    }
    return null;
  }

  /**
   * Create a new user record.
   * @param {Object} userData 
   * @returns {Promise<Object>} The created user object
   */
  async create(userData) {
    const existing = await this.findByUsername(userData.username);
    if (existing) {
      throw new Error(`Username '${userData.username}' is already taken.`);
    }

    const newUser = {
      id: this.currentId++,
      username: userData.username,
      password: userData.password, // assumed pre-hashed
      mfaEnabled: false,
      mfaSecret: null
    };

    this.users.set(newUser.id, newUser);
    return { ...newUser };
  }

  /**
   * Update an existing user record.
   * @param {number} id 
   * @param {Object} updateData 
   * @returns {Promise<Object>} The updated user object
   */
  async update(id, updateData) {
    const userId = Number(id);
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User with ID ${id} not found.`);
    }

    // Merge modifications
    const updatedUser = {
      ...user,
      ...updateData,
      id: userId // ensure ID is never changed
    };

    this.users.set(userId, updatedUser);
    return { ...updatedUser };
  }
}

// Export a singleton instance of the repository to maintain state in memory
module.exports = new InMemoryUserRepository();

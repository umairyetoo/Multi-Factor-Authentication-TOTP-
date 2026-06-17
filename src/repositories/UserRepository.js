/**
 * Abstract UserRepository class representing the data access contract.
 * Follows the Dependency Inversion Principle; high-level services depend on this abstraction,
 * and concrete implementations (like InMemory or database repositories) implement it.
 */
class UserRepository {
  /**
   * Find a user by their unique ID.
   * @param {string|number} id 
   * @returns {Promise<Object|null>} User object or null
   */
  async findById(id) {
    throw new Error('Method not implemented: findById');
  }

  /**
   * Find a user by their unique username.
   * @param {string} username 
   * @returns {Promise<Object|null>} User object or null
   */
  async findByUsername(username) {
    throw new Error('Method not implemented: findByUsername');
  }

  /**
   * Create a new user record.
   * @param {Object} userData 
   * @returns {Promise<Object>} The created user object
   */
  async create(userData) {
    throw new Error('Method not implemented: create');
  }

  /**
   * Update an existing user record.
   * @param {string|number} id 
   * @param {Object} updateData 
   * @returns {Promise<Object>} The updated user object
   */
  async update(id, updateData) {
    throw new Error('Method not implemented: update');
  }
}

module.exports = UserRepository;

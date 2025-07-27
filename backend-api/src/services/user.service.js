// backend-api/src/services/user.service.js
const knex = require('../config/db');
const bcrypt = require('bcrypt');

class UserService {
  constructor(knexInstance) {
    this.knex = knexInstance;
  }

  async hashPassword(password) {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  // CREATE
  async createUser(userData) {
    const hashedPassword = await this.hashPassword(userData.password);
    const [newUser] = await this.knex('users').insert({
      name: userData.name, 
      email: userData.email,
      password: hashedPassword,
      address: userData.address,
      phone: userData.phone, 
      role: userData.role || 'user',
      avatar_url: userData.avatar_url, 
    }).returning('*');
    // Remove password from the returned object for security
    delete newUser.password;
    return newUser;
  }

  // READ (Get all with filters)
  async getAllUsers(filters) {
    let query = this.knex('users');
      
    if (filters.name) { 
      query = query.where('name', 'ilike', `%${filters.name}%`);
    }
    if (filters.email) {
      query = query.where('email', 'ilike', `%${filters.email}%`);
    }
    if (filters.role) { 
      query = query.where('role', filters.role);
    }

    const totalItems = await query.clone().count('* as count').first();
    const totalRecords = parseInt(totalItems.count, 10);

    const page = parseInt(filters.page, 10) || 1;
    const limit = parseInt(filters.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const users = await query.offset(offset).limit(limit);

    // Remove passwords from results
    users.forEach(user => delete user.password);

    const totalPages = Math.ceil(totalRecords / limit);

    return {
      users,
      totalItems: totalRecords,
      currentPage: page,
      totalPages,
      limit: limit,
    };
  }

  // READ (Get by ID)
  async getUserById(id) {
    const user = await this.knex('users')
      .where('id', id)
      .first();
    if (user) {
      delete user.password; // Remove password
    }
    return user;
  }

  // READ (Get by Email)
  async getUserByEmail(email) {
    const user = await this.knex('users').where({ email: email }).first();
    // Do NOT delete password here, as this function might be used for authentication
    return user;
  }

  // UPDATE
  async updateUser(id, updateData) {
    if (updateData.password) {
      updateData.password = await this.hashPassword(updateData.password);
    }
    // updated_at is handled by DB trigger (update_timestamp)
    const [updatedUser] = await this.knex('users')
      .where({ id: id })
      .update(updateData)
      .returning('*');
    if (updatedUser) {
      delete updatedUser.password; // Remove password
    }
    return updatedUser;
  }

  // DELETE
  async deleteUser(id) {
    const deletedCount = await this.knex('users').where({ id: id }).del();
    return deletedCount > 0;
  }

  // DELETE ALL
  async deleteAllUsers() {
    // This will delete all users, use with caution
    await this.knex('users').del();
  }
}

module.exports = new UserService(knex);
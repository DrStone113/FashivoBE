// ct313hm02-project-DrStone113/backend-api/src/services/category.service.js
const knex = require('../config/db');

class CategoryService {
  constructor(knexInstance) {
    this.knex = knexInstance;
  }

  // CREATE
  async createCategory(categoryData) {
    const [newCategory] = await this.knex('categories').insert({
      name: categoryData.name,
      url_path: categoryData.url_path,
      description: categoryData.description,
    }).returning('*');
    return newCategory;
  }

  // READ (Get all with filters)
  async getAllCategories(filters) {
    let query = this.knex('categories');

    if (filters.name) {
      query = query.where('name', 'ilike', `%${filters.name}%`);
    }

    const totalItems = await query.clone().count('* as count').first();
    const totalRecords = parseInt(totalItems.count, 10);

    const page = parseInt(filters.page, 10) || 1;
    const limit = parseInt(filters.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const categories = await query.offset(offset).limit(limit);

    const totalPages = Math.ceil(totalRecords / limit);

    return {
      categories,
      totalItems: totalRecords,
      currentPage: page,
      totalPages,
      limit: limit,
    };
  }

  // READ (Get by ID)
  async getCategoryById(id) {
    return await this.knex('categories').where({ id: id }).first();
  }

  // UPDATE
  async updateCategory(id, updateData) {
    // `updated_at` is handled by DB trigger, no need to set here
    const [updatedCategory] = await this.knex('categories')
      .where({ id: id })
      .update(updateData)
      .returning('*');
    return updatedCategory;
  }

  // DELETE
  async deleteCategory(id) {
    const deletedCount = await this.knex('categories').where({ id: id }).del();
    return deletedCount > 0;
  }

  // DELETE ALL
  async deleteAllCategories() {
    await this.knex('categories').del();
  }
}

module.exports = new CategoryService(knex);
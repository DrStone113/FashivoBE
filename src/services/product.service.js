// ct313hm02-project-DrStone113/backend-api/src/services/product.service.js
const knex = require("../config/db");

class ProductService {
  constructor(knexInstance) {
    this.knex = knexInstance;
  }

  // CREATE (Không thay đổi)
  async createProduct(productData) {
    const [newProduct] = await this.knex("products")
      .insert(productData)
      .returning("*");
    return newProduct;
  }

  // READ (Get all with filters and pagination)
  async getAllProducts(filters) {
    let baseQuery = this.knex("products").leftJoin(
      "categories",
      "products.category_id",
      "categories.id"
    );

    // --- ÁP DỤNG CÁC BỘ LỌC ---
    if (filters.type) {
      baseQuery.where("type", "ilike", `%${filters.type}%`);
    }
    if (filters.name || filters.search) {
      const searchTerm = filters.name || filters.search;
      baseQuery.where("products.name", "ilike", `%${searchTerm}%`);
    }
    if (filters.minPrice) {
      baseQuery.where("price", ">=", filters.minPrice);
    }
    if (filters.maxPrice) {
      baseQuery.where("price", "<=", filters.maxPrice);
    }
    if (filters.available !== undefined && filters.available !== null) {
      baseQuery.where("available", filters.available);
    }
    if (filters.inStock === "true") {
      baseQuery.where("stock", ">", 0);
    }
    if (filters.category_id) {
      const categoryIds = Array.isArray(filters.category_id)
        ? filters.category_id
        : [filters.category_id];
      if (categoryIds.length > 0) {
        baseQuery.whereIn("products.category_id", categoryIds);
      }
    }

    // --- BƯỚC 1: ĐẾM TỔNG SỐ KẾT QUẢ (KHÔNG CÓ SẮP XẾP) ---
    const totalItemsResult = await baseQuery
      .clone()
      .count("* as count")
      .first();
    const totalRecords = parseInt(totalItemsResult.count, 10);

    // --- BƯỚC 2: ÁP DỤNG SẮP XẾP CHỈ CHO TRUY VẤN LẤY DỮ LIỆU ---
    // SẮP XẾP MẶC ĐỊNH: Theo ID giảm dần để sản phẩm mới nhất hiện lên đầu
    // Nếu có yêu cầu sắp xếp từ frontend, thì áp dụng sắp xếp đó
    if (filters.sortBy && filters.sortOrder) {
      const validSortColumns = ["name", "price", "createdAt", "updatedAt", "id"]; // Thêm 'id'
      const sortColumn = validSortColumns.includes(filters.sortBy)
        ? `products.${filters.sortBy}`
        : "products.id"; // Mặc định sắp xếp theo ID
      const sortOrder = filters.sortOrder.toLowerCase() === "desc" ? "desc" : "asc";
      baseQuery.orderBy(sortColumn, sortOrder);
    } else {
      // Mặc định sắp xếp theo ID giảm dần nếu không có yêu cầu sắp xếp cụ thể
      baseQuery.orderBy("products.id", "desc"); 
    }

    const page = parseInt(filters.page, 10) || 1;
    const limit = parseInt(filters.limit, 10) || 10;
    const offset = (page - 1) * limit;

    // --- BƯỚC 3: LẤY DỮ LIỆU SẢN PHẨM VỚI PHÂN TRANG VÀ SẮP XẾP ---
    const products = await baseQuery
      .select("products.*", "categories.name as category_name")
      .offset(offset)
      .limit(limit);

    const totalPages = Math.ceil(totalRecords / limit);

    return {
      products,
      totalItems: totalRecords,
      currentPage: page,
      totalPages,
      limit: limit,
    };
  }

  // Các hàm còn lại không thay đổi
  async getProductById(id) {
    return await this.knex("products")
      .select("products.*", "categories.name as category_name")
      .leftJoin("categories", "products.category_id", "categories.id")
      .where("products.id", id)
      .first();
  }

  async updateProduct(id, updateData) {
    const [updatedProduct] = await this.knex("products")
      .where({ id: id })
      .update(updateData)
      .returning("*");
    return updatedProduct;
  }

  async deleteProduct(id) {
    const deletedCount = await this.knex("products").where({ id: id }).del();
    return deletedCount > 0;
  }

  async deleteAllProducts() {
    await this.knex("products").del();
  }
}

module.exports = new ProductService(knex);

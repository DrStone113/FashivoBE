// backend-api/src/services/cart.service.js
const knex = require('../config/db'); // Đảm bảo đường dẫn đúng đến file cấu hình Knex của bạn
const ApiError = require('../api-error'); // Import ApiError để ném lỗi nghiệp vụ

class CartService {
  constructor(knexInstance) {
    this.knex = knexInstance;
  }

  /**
   * Tạo giỏ hàng mới cho người dùng hoặc thêm/cập nhật các mục vào giỏ hàng hiện có.
   * Đồng thời kiểm tra sự tồn tại của sản phẩm và số lượng tồn kho.
   * @param {number} userId - ID của người dùng.
   * @param {Array<Object>} items - Mảng các đối tượng { product_id, quantity }.
   * @returns {Object} Giỏ hàng và các mục đã được thêm/cập nhật.
   */
  async createOrUpdateCart(userId, items) {
    console.log('CartService: createOrUpdateCart called for user:', userId, 'with items:', items);
    return await this.knex.transaction(async trx => {
      let cart = await trx('carts').where({ user_id: userId }).first();
      console.log('CartService: createOrUpdateCart - Existing cart:', cart);

      if (!cart) {
        console.log('CartService: createOrUpdateCart - Creating new cart for user:', userId);
        [cart] = await trx('carts').insert({ user_id: userId }).returning('*');
      }

      const cartId = cart.id;
      const results = [];

      for (const item of items) {
        const { product_id, quantity } = item;
        console.log(`CartService: createOrUpdateCart - Processing item product_id: ${product_id}, quantity: ${quantity}`);

        // 1. Kiểm tra sự tồn tại của sản phẩm và tồn kho
        const product = await trx('products').where({ id: product_id }).first();
        if (!product) {
          console.error(`CartService: Product with ID ${product_id} not found.`);
          throw new ApiError(404, `Product with ID ${product_id} not found.`);
        }
        if (!product.available) {
          console.warn(`CartService: Product '${product.name}' is not available.`);
          throw new ApiError(400, `Product '${product.name}' is not available.`);
        }
        console.log('CartService: Product found:', product);

        const existingCartItem = await trx('cart_items')
          .where({ cart_id: cartId, product_id: product_id })
          .first();
        console.log('CartService: Existing cart item:', existingCartItem);

        let finalQuantity = quantity;
        if (existingCartItem) {
          finalQuantity += existingCartItem.quantity;
          console.log('CartService: Existing item, new final quantity:', finalQuantity);
        }

        // 2. Kiểm tra số lượng yêu cầu so với tồn kho
        if (finalQuantity > product.stock) {
          console.warn(`CartService: Not enough stock for product '${product.name}'. Available: ${product.stock}, Requested: ${finalQuantity}`);
          throw new ApiError(400, `Not enough stock for product '${product.name}'. Available: ${product.stock}, Requested: ${finalQuantity}`);
        }

        if (existingCartItem) {
          console.log(`CartService: Updating existing cart item ${existingCartItem.id} for product ${product_id} to quantity ${finalQuantity}`);
          const [updatedItem] = await trx('cart_items')
            .where({ cart_id: cartId, product_id: product_id })
            .update({
              quantity: finalQuantity,
              price: product.price,
              updated_at: knex.fn.now() // Sử dụng knex.fn.now() cho timestamp
            })
            .returning('*');
          results.push(updatedItem);
        } else {
          console.log(`CartService: Adding new cart item for product ${product_id} with quantity ${finalQuantity}`);
          const [newItem] = await trx('cart_items').insert({
            cart_id: cartId,
            product_id,
            quantity: finalQuantity,
            price: product.price,
            created_at: knex.fn.now(), // Thêm created_at cho item mới
            updated_at: knex.fn.now()
          }).returning('*');
          results.push(newItem);
        }
      }
      // Cập nhật updated_at của giỏ hàng chính
      await trx('carts').where({ id: cartId }).update({ updated_at: knex.fn.now() });
      console.log('CartService: createOrUpdateCart - Transaction complete.');
      return { cart, items: results };
    });
  }

  /**
   * Lấy tất cả các giỏ hàng với thông tin chi tiết sản phẩm.
   * Hỗ trợ phân trang và lọc theo user_id.
   * @param {Object} filters - Các bộ lọc (user_id, page, limit).
   * @returns {Object} Danh sách các giỏ hàng và thông tin phân trang.
   */
  async getAllCarts(filters) {
    console.log('CartService: getAllCarts called with filters:', filters);
    let query = this.knex('carts')
      .select(
        'carts.id as cart_id',
        'carts.user_id',
        'carts.created_at as cart_created_at',
        'carts.updated_at as cart_updated_at',
        'cart_items.id as cart_item_id',
        'cart_items.product_id',
        'cart_items.quantity',
        'cart_items.price as item_price',
        'products.name as product_name',
        'products.description as product_description',
        'products.price as current_product_price',
        'products.image_url as product_image_url',
        'products.available as product_available'
      )
      .join('cart_items', 'carts.id', 'cart_items.cart_id')
      .join('products', 'cart_items.product_id', 'products.id')
      .orderBy('carts.id')
      .orderBy('cart_items.id');

    if (filters.user_id) {
      query = query.where('carts.user_id', filters.user_id);
    }

    const totalItemsQuery = this.knex('carts');
    if (filters.user_id) {
      totalItemsQuery.where('carts.user_id', filters.user_id);
    }
    const totalRecordsResult = await totalItemsQuery.clone().count('* as count').first();
    const totalRecords = parseInt(totalRecordsResult.count, 10);

    const page = parseInt(filters.page, 10) || 1;
    const limit = parseInt(filters.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const rawCarts = await query.offset(offset).limit(limit);

    const groupedCarts = rawCarts.reduce((acc, row) => {
      let cart = acc.find(c => c.id === row.cart_id);
      if (!cart) {
        cart = {
          id: row.cart_id,
          user_id: row.user_id,
          created_at: row.cart_created_at,
          updated_at: row.cart_updated_at,
          items: [],
        };
        acc.push(cart);
      }
      cart.items.push({
        id: row.cart_item_id,
        product_id: row.product_id,
        quantity: row.quantity,
        item_price: row.item_price,
        product: { // Group product details under a 'product' object
            id: row.product_id,
            name: row.product_name,
            description: row.product_description,
            price: row.current_product_price,
            image_url: row.product_image_url,
            available: row.product_available
        }
      });
      return acc;
    }, []);

    const totalPages = Math.ceil(totalRecords / limit);
    console.log('CartService: getAllCarts - Grouped carts:', groupedCarts);
    return {
      carts: groupedCarts,
      totalItems: totalRecords,
      currentPage: page,
      totalPages,
      limit: limit,
    };
  }

  /**
   * Lấy giỏ hàng của một người dùng cụ thể.
   * @param {number} userId - ID của người dùng.
   * @returns {Object|null} Giỏ hàng của người dùng hoặc null nếu không tìm thấy.
   */
  async getCartByUserId(userId) {
    console.log('CartService: getCartByUserId called for user ID:', userId);
    const cart = await this.knex('carts').where({ user_id: userId }).first();
    if (!cart) {
      console.log('CartService: getCartByUserId - No cart found for user ID:', userId);
      return null;
    }
    console.log('CartService: getCartByUserId - Found cart:', cart);

    const items = await this.knex('cart_items')
      .select(
        'cart_items.id as cart_item_id',
        'cart_items.product_id',
        'cart_items.quantity',
        'cart_items.price as item_price',
        'products.name as product_name',
        'products.description as product_description',
        'products.price as current_product_price',
        'products.image_url as product_image_url',
        'products.available as product_available',
        'products.stock as product_stock' // Thêm stock vào đây
      )
      .where({ cart_id: cart.id })
      .join('products', 'cart_items.product_id', 'products.id');

    // Transform items to match frontend's expected structure
    const transformedItems = items.map(item => ({
        id: item.cart_item_id, // ID của cart_item
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.item_price, // Giá của sản phẩm tại thời điểm thêm vào giỏ
        product: { // Đối tượng product chi tiết
            id: item.product_id,
            name: item.product_name,
            description: item.product_description,
            price: item.current_product_price, // Giá hiện tại của sản phẩm
            image_url: item.product_image_url,
            available: item.product_available,
            stock: item.product_stock // Thêm stock vào đối tượng product
        }
    }));
    console.log('CartService: getCartByUserId - Transformed items:', transformedItems);

    return { ...cart, items: transformedItems };
  }

  /**
   * Lấy giỏ hàng theo ID giỏ hàng.
   * @param {number} cartId - ID của giỏ hàng.
   * @returns {Object|null} Giỏ hàng hoặc null nếu không tìm thấy.
   */
  async getCartById(cartId) {
    console.log('CartService: getCartById called for cart ID:', cartId);
    const cart = await this.knex('carts').where({ id: cartId }).first();
    if (!cart) {
      console.log('CartService: getCartById - No cart found for ID:', cartId);
      return null;
    }
    console.log('CartService: getCartById - Found cart:', cart);

    const items = await this.knex('cart_items')
      .select(
        'cart_items.id as cart_item_id',
        'cart_items.product_id',
        'cart_items.quantity',
        'cart_items.price as item_price',
        'products.name as product_name',
        'products.description as product_description',
        'products.price as current_product_price',
        'products.image_url as product_image_url',
        'products.available as product_available',
        'products.stock as product_stock' // Thêm stock vào đây
      )
      .where({ cart_id: cart.id })
      .join('products', 'cart_items.product_id', 'products.id');

    const transformedItems = items.map(item => ({
        id: item.cart_item_id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.item_price,
        product: {
            id: item.product_id,
            name: item.product_name,
            description: item.product_description,
            price: item.current_product_price,
            image_url: item.product_image_url,
            available: item.product_available,
            stock: item.product_stock
        }
    }));
    console.log('CartService: getCartById - Transformed items:', transformedItems);

    return { ...cart, items: transformedItems };
  }

  /**
   * Cập nhật số lượng của một mục cụ thể trong giỏ hàng.
   * @param {number} cartId - ID của giỏ hàng.
   * @param {number} productId - ID của sản phẩm.
   * @param {number} quantity - Số lượng mới.
   * @returns {Object|null} Mục giỏ hàng đã cập nhật hoặc null nếu không tìm thấy.
   */
  async updateCartItem(cartId, productId, quantity) {
    console.log(`CartService: updateCartItem called for cart ${cartId}, product ${productId}, quantity ${quantity}`);
    return await this.knex.transaction(async trx => {
      // 1. Lấy thông tin sản phẩm để kiểm tra tồn kho
      const product = await trx('products').where({ id: productId }).first();
      if (!product) {
        console.error(`CartService: updateCartItem - Product with ID ${productId} not found.`);
        throw new ApiError(404, `Product with ID ${productId} not found.`);
      }
      if (!product.available) {
        console.warn(`CartService: updateCartItem - Product '${product.name}' is not available.`);
        throw new ApiError(400, `Product '${product.name}' is not available.`);
      }
      if (quantity > product.stock) {
        console.warn(`CartService: updateCartItem - Not enough stock for product '${product.name}'. Available: ${product.stock}, Requested: ${quantity}`);
        throw new ApiError(400, `Not enough stock for product '${product.name}'. Available: ${product.stock}, Requested: ${quantity}`);
      }
      console.log('CartService: updateCartItem - Product found and available/stock checked.');

      // 2. Cập nhật mục trong giỏ hàng
      const [updatedItem] = await trx('cart_items')
        .where({ cart_id: cartId, product_id: productId })
        .update({
          quantity,
          price: product.price, // Cập nhật giá sản phẩm hiện tại khi số lượng thay đổi
          updated_at: knex.fn.now()
        })
        .returning('*');
      console.log('CartService: updateCartItem - Updated cart item:', updatedItem);

      // 3. Cập nhật timestamp của giỏ hàng cha
      if (updatedItem) {
        await trx('carts').where({ id: cartId }).update({ updated_at: knex.fn.now() });
        console.log('CartService: updateCartItem - Parent cart updated_at updated.');
      } else {
          console.warn('CartService: updateCartItem - No item was updated by Knex query.'); // <-- THÊM DÒNG NÀY
      }

      return updatedItem;
    });
  }

  /**
   * Xóa một mục khỏi giỏ hàng.
   * @param {number} cartId - ID của giỏ hàng.
   * @param {number} productId - ID của sản phẩm cần xóa.
   * @returns {boolean} True nếu xóa thành công, false nếu không tìm thấy.
   */
  async deleteCartItem(cartId, productId) {
    console.log(`CartService: deleteCartItem called for cart ${cartId}, product ${productId}`);
    const deletedCount = await this.knex('cart_items')
      .where({ cart_id: cartId, product_id: productId })
      .del();
    if (deletedCount > 0) {
      await this.knex('carts').where({ id: cartId }).update({ updated_at: knex.fn.now() });
      console.log(`CartService: deleted ${deletedCount} item(s) from cart ${cartId}. Parent cart updated.`);
    } else {
      console.log(`CartService: No item ${productId} found in cart ${cartId} to delete.`);
    }
    return deletedCount > 0;
  }

  /**
   * Xóa toàn bộ giỏ hàng và các mục của nó.
   * @param {number} cartId - ID của giỏ hàng cần xóa.
   * @returns {boolean} True nếu xóa thành công, false nếu không tìm thấy.
   */
  async deleteCart(cartId) {
    console.log(`CartService: deleteCart called for cart ${cartId}`);
    return await this.knex.transaction(async trx => {
      await trx('cart_items').where({ cart_id: cartId }).del();
      const deletedCount = await trx('carts').where({ id: cartId }).del();
      console.log(`CartService: deleted ${deletedCount} cart(s) with ID ${cartId}.`);
      return deletedCount > 0;
    });
  }

  /**
   * Xóa tất cả các giỏ hàng và các mục của chúng (thường chỉ dành cho mục đích phát triển/quản trị).
   * @returns {number} Số lượng giỏ hàng đã xóa.
   */
  async deleteAllCarts() {
    console.log('CartService: deleteAllCarts called.');
    await this.knex('cart_items').del();
    const deletedCount = await this.knex('carts').del();
    console.log(`CartService: Deleted all ${deletedCount} carts.`);
    return deletedCount;
  }
}

module.exports = new CartService(knex);

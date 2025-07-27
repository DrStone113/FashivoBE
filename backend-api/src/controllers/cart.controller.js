// backend-api/src/controllers/cart.controller.js

const JSend = require("../jsend");
const ApiError = require("../api-error");
const catchAsync = require("../catchAsync");
const cartService = require("../services/cart.service");
const productService = require("../services/product.service");

const parseCartItems = (reqBody) => {
    if (!reqBody.items) {
        return [];
    }
    try {
        const parsedItems = JSON.parse(reqBody.items);
        if (!Array.isArray(parsedItems)) {
            throw new Error('Items must be a JSON string representing an array.');
        }
        return parsedItems.map(item => ({
            product_id: parseInt(item.product_id, 10),
            quantity: parseInt(item.quantity, 10),
        }));
    } catch (e) {
        throw new ApiError(400, `Invalid items format: ${e.message}. Must be a JSON array string.`);
    }
};

/**
 * Lấy giỏ hàng của người dùng hiện tại.
 * @param {Object} req - Đối tượng request.
 * @param {Object} res - Đối tượng response.
 * @param {Function} next - Hàm next middleware.
 */
const getMyCart = catchAsync(async (req, res, next) => {
  console.log('--- Entering getMyCart controller ---');
  if (!req.user || !req.user.id) {
    console.log('getMyCart: User not authenticated.');
    return next(new ApiError(401, 'Vui lòng đăng nhập để xem giỏ hàng của bạn.'));
  }

  console.log('getMyCart: Fetching cart for user ID:', req.user.id);
  const cart = await cartService.getCartByUserId(req.user.id);
  console.log('getMyCart: Raw cart from service:', cart);

  if (!cart || !cart.items || cart.items.length === 0) {
    console.log('getMyCart: Cart not found or empty for user ID:', req.user.id);
    return res.status(200).json(JSend.success({
      cart: { id: cart ? cart.id : null, items: [] }, // Đảm bảo trả về ID nếu giỏ hàng tồn tại nhưng không có item
      message: 'Giỏ hàng của bạn đang trống.'
    }));
  }

  // Lấy chi tiết sản phẩm cho từng mục trong giỏ hàng
  console.log('getMyCart: Fetching product details for items...');
  const detailedItems = await Promise.all(cart.items.map(async (item) => {
    const product = await productService.getProductById(item.product_id);
    if (!product) {
        console.warn(`Product with ID ${item.product_id} not found for cart item.`);
        return { ...item, product: null }; // Trả về item với product là null nếu không tìm thấy
    }
    return {
      ...item,
      product: product // Gắn toàn bộ đối tượng sản phẩm vào
    };
  }));
  console.log('getMyCart: Detailed items:', detailedItems);

  res.status(200).json(JSend.success({ cart: { ...cart, items: detailedItems } }));
  console.log('--- Exiting getMyCart controller ---');
});

/**
 * Thêm sản phẩm vào giỏ hàng của người dùng hiện tại.
 * @param {Object} req - Đối tượng request.
 * @param {Object} res - Đối tượng response.
 * @param {Function} next - Hàm next middleware.
 */
const addItemToMyCart = catchAsync(async (req, res, next) => {
  console.log('--- Entering addItemToMyCart controller ---');
  if (!req.user || !req.user.id) {
    return next(new ApiError(401, 'Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.'));
  }
  const { product_id, quantity } = req.body;
  console.log(`addItemToMyCart: Adding product ${product_id} with quantity ${quantity} for user ${req.user.id}`);

  const productExists = await productService.getProductById(product_id);
  if (!productExists) {
    console.warn(`addItemToMyCart: Product with ID ${product_id} not found.`);
    return next(new ApiError(404, 'Sản phẩm không tồn tại.'));
  }

  const { cart, items } = await cartService.createOrUpdateCart(req.user.id, [{ product_id, quantity }]);
  console.log('addItemToMyCart: Cart after createOrUpdate:', cart);
  console.log('addItemToMyCart: Items after createOrUpdate:', items);

  res.status(200).json(JSend.success({
    message: 'Sản phẩm đã được thêm vào giỏ hàng.',
    cart: { ...cart, items }
  }));
  console.log('--- Exiting addItemToMyCart controller ---');
});

/**
 * Cập nhật số lượng của một mục trong giỏ hàng của người dùng hiện tại.
 * @param {Object} req - Đối tượng request.
 * @param {Object} res - Đối tượng response.
 * @param {Function} next - Hàm next middleware.
 */
const updateMyCartItem = catchAsync(async (req, res, next) => {
  console.log('--- Entering updateMyCartItem controller ---');
  console.log('req.body in updateMyCartItem:', req.body); 

  if (!req.user || !req.user.id) {
    console.log('updateMyCartItem: User not authenticated.');
    return next(new ApiError(401, 'Vui lòng đăng nhập để cập nhật giỏ hàng.'));
  }
  const { product_id, quantity } = req.body;

  if (product_id === undefined || quantity === undefined) {
      console.error('updateMyCartItem: Missing product_id or quantity in req.body:', req.body);
      return next(new ApiError(400, 'Thiếu thông tin sản phẩm hoặc số lượng để cập nhật.'));
  }
  console.log(`updateMyCartItem: Updating product ${product_id} to quantity ${quantity} for user ${req.user.id}`);

  const userCart = await cartService.getCartByUserId(req.user.id);
  if (!userCart) {
    console.warn('updateMyCartItem: Cart not found for user:', req.user.id);
    return next(new ApiError(404, 'Không tìm thấy giỏ hàng của bạn.'));
  }
  console.log('updateMyCartItem: User cart found:', userCart);

  if (quantity <= 0) {
    console.log(`updateMyCartItem: Quantity is ${quantity}, attempting to delete item ${product_id}.`);
    const deleted = await cartService.deleteCartItem(userCart.id, product_id);
    if (!deleted) {
      console.warn(`updateMyCartItem: Item ${product_id} not found in cart ${userCart.id} for deletion.`);
      return next(new ApiError(404, 'Không tìm thấy sản phẩm trong giỏ hàng để xóa.'));
    }
    res.status(200).json(JSend.success({ message: 'Sản phẩm đã được xóa khỏi giỏ hàng.' }));
  } else {
    console.log(`updateMyCartItem: Attempting to update item ${product_id} to quantity ${quantity}.`);
    const updatedItem = await cartService.updateCartItem(userCart.id, product_id, quantity);
    if (!updatedItem) {
      console.warn(`updateMyCartItem: Item ${product_id} not found in cart ${userCart.id} for update.`);
      return next(new ApiError(404, 'Không tìm thấy sản phẩm trong giỏ hàng để cập nhật.'));
    }
    res.status(200).json(JSend.success({
      message: 'Số lượng sản phẩm đã được cập nhật.',
      item: updatedItem
    }));
  }
  console.log('--- Exiting updateMyCartItem controller ---');
});

/**
 * Xóa một mục cụ thể khỏi giỏ hàng của người dùng hiện tại.
 * @param {Object} req - Đối tượng request.
 * @param {Object} res - Đối tượng response.
 * @param {Function} next - Hàm next middleware.
 */
const removeItemFromMyCart = catchAsync(async (req, res, next) => {
  console.log('--- Entering removeItemFromMyCart controller ---');
  if (!req.user || !req.user.id) {
    return next(new ApiError(401, 'Vui lòng đăng nhập để xóa sản phẩm khỏi giỏ hàng.'));
  }
  const { product_id } = req.body;
  console.log(`removeItemFromMyCart: Removing product ${product_id} for user ${req.user.id}`);

  const userCart = await cartService.getCartByUserId(req.user.id);
  if (!userCart) {
    console.warn('removeItemFromMyCart: Cart not found for user:', req.user.id);
    return next(new ApiError(404, 'Không tìm thấy giỏ hàng của bạn.'));
  }

  const deleted = await cartService.deleteCartItem(userCart.id, product_id);
  if (!deleted) {
    console.warn(`removeItemFromMyCart: Item ${product_id} not found in cart ${userCart.id} for deletion.`);
    return next(new ApiError(404, 'Không tìm thấy sản phẩm trong giỏ hàng để xóa.'));
  }

  res.status(200).json(JSend.success({ message: 'Sản phẩm đã được xóa khỏi giỏ hàng.' }));
  console.log('--- Exiting removeItemFromMyCart controller ---');
});

/**
 * Xóa toàn bộ giỏ hàng của người dùng hiện tại.
 * @param {Object} req - Đối tượng request.
 * @param {Object} res - Đối tượng response.
 * @param {Function} next - Hàm next middleware.
 */
const clearMyCart = catchAsync(async (req, res, next) => {
  console.log('--- Entering clearMyCart controller ---');
  if (!req.user || !req.user.id) {
    return next(new ApiError(401, 'Vui lòng đăng nhập để xóa giỏ hàng.'));
  }
  console.log('clearMyCart: Clearing cart for user ID:', req.user.id);

  const userCart = await cartService.getCartByUserId(req.user.id);
  if (!userCart) {
    console.warn('clearMyCart: Cart not found for user:', req.user.id);
    return next(new ApiError(404, 'Không tìm thấy giỏ hàng của bạn để xóa.'));
  }

  const deleted = await cartService.deleteCart(userCart.id);
  if (!deleted) {
    console.error('clearMyCart: Failed to delete cart for user:', req.user.id);
    return next(new ApiError(500, 'Không thể xóa giỏ hàng của bạn.'));
  }

  res.status(200).json(JSend.success({ message: 'Giỏ hàng của bạn đã được xóa.' }));
  console.log('--- Exiting clearMyCart controller ---');
});


// --- Admin/General Cart Operations ---

const createCart = catchAsync(async (req, res, next) => {
  console.log('--- Entering createCart controller (Admin) ---');
  const { user_id: requestedUserId } = req.body;
  const currentUserId = req.user ? req.user.id : null;

  let targetUserId = requestedUserId || currentUserId;

  if (!targetUserId) {
    return next(new ApiError(400, 'User ID là bắt buộc để tạo giỏ hàng.'));
  }

  const items = parseCartItems(req.body);
  if (items.length === 0) {
    return next(new ApiError(400, "Ít nhất một sản phẩm là bắt buộc cho giỏ hàng."));
  }
  console.log(`createCart: Creating/Updating cart for user ${targetUserId} with items:`, items);

  const { cart, items: cartItems } = await cartService.createOrUpdateCart(targetUserId, items);

  res.status(201).json(JSend.success({
    message: "Giỏ hàng đã được tạo/cập nhật thành công.",
    cart: { ...cart, items: cartItems },
  }));
  console.log('--- Exiting createCart controller (Admin) ---');
});

const getAllCarts = catchAsync(async (req, res, next) => {
  console.log('--- Entering getAllCarts controller (Admin) ---');
  const filters = req.query;
  console.log('getAllCarts: Filters:', filters);
  const cartsData = await cartService.getAllCarts(filters);
  console.log('getAllCarts: Carts data from service:', cartsData);
  res.status(200).json(JSend.success({
    carts: cartsData.carts,
    metadata: {
      totalItems: cartsData.totalItems,
      currentPage: cartsData.currentPage,
      totalPages: cartsData.totalPages,
      limit: cartsData.limit
    }
  }));
  console.log('--- Exiting getAllCarts controller (Admin) ---');
});

const getCartByUserId = catchAsync(async (req, res, next) => {
  console.log('--- Entering getCartByUserId controller (Admin) ---');
  const { userId } = req.params;
  console.log('getCartByUserId: Fetching cart for user ID (admin):', userId);
  const cart = await cartService.getCartByUserId(userId);
  if (!cart) {
    console.warn('getCartByUserId: Cart not found for user ID (admin):', userId);
    return next(new ApiError(404, "Không tìm thấy giỏ hàng cho người dùng này."));
  }
  console.log('getCartByUserId: Cart found (admin):', cart);
  res.status(200).json(JSend.success({ cart }));
  console.log('--- Exiting getCartByUserId controller (Admin) ---');
});

const getCartById = catchAsync(async (req, res, next) => {
  console.log('--- Entering getCartById controller (Admin) ---');
  const { id } = req.params;
  console.log('getCartById: Fetching cart for cart ID (admin):', id);
  const cart = await cartService.getCartById(id);
  if (!cart) {
    console.warn('getCartById: Cart not found for cart ID (admin):', id);
    return next(new ApiError(404, "Không tìm thấy giỏ hàng với ID này."));
  }
  console.log('getCartById: Cart found (admin):', cart);
  res.status(200).json(JSend.success({ cart }));
  console.log('--- Exiting getCartById controller (Admin) ---');
});

const updateCartItem = catchAsync(async (req, res, next) => {
  console.log('--- Entering updateCartItem controller (Admin) ---');
  console.log('req.body in updateCartItem (Admin):', req.body); 

  const { id, productId } = req.params;
  const { quantity } = req.body;

  if (quantity === undefined) {
    console.error('updateCartItem (Admin): Missing quantity in req.body:', req.body);
    return next(new ApiError(400, 'Thiếu số lượng để cập nhật.'));
  }
  console.log(`updateCartItem (Admin): Updating cart ${id}, product ${productId} to quantity ${quantity}.`);

  const updatedItem = await cartService.updateCartItem(id, productId, quantity);
  if (!updatedItem) {
    console.warn(`updateCartItem (Admin): Item ${productId} not found in cart ${id} for update.`);
    return next(new ApiError(404, "Không tìm thấy mục giỏ hàng để cập nhật."));
  }
  res.status(200).json(JSend.success({ message: "Mục giỏ hàng đã được cập nhật.", item: updatedItem }));
  console.log('--- Exiting updateCartItem controller (Admin) ---');
});

const deleteCartItem = catchAsync(async (req, res, next) => {
  console.log('--- Entering deleteCartItem controller (Admin) ---');
  const { id, productId } = req.params;
  console.log(`deleteCartItem (Admin): Deleting item ${productId} from cart ${id}.`);
  const deleted = await cartService.deleteCartItem(id, productId);
  if (!deleted) {
    console.warn(`deleteCartItem (Admin): Item ${productId} not found in cart ${id} for deletion.`);
    return next(new ApiError(404, "Không tìm thấy mục giỏ hàng để xóa."));
  }
  res.status(200).json(JSend.success({ message: "Mục giỏ hàng đã được xóa." }));
  console.log('--- Exiting deleteCartItem controller (Admin) ---');
});

const deleteCart = catchAsync(async (req, res, next) => {
  console.log('--- Entering deleteCart controller (Admin) ---');
  const { id } = req.params;
  console.log(`deleteCart (Admin): Deleting cart ${id}.`);
  const deleted = await cartService.deleteCart(id);
  if (!deleted) {
    console.warn(`deleteCart (Admin): Cart ${id} not found for deletion.`);
    return next(new ApiError(404, "Không tìm thấy giỏ hàng để xóa."));
  }
  res.status(200).json(JSend.success({ message: "Giỏ hàng đã được xóa." }));
  console.log('--- Exiting deleteCart controller (Admin) ---');
});

const deleteAllCarts = catchAsync(async (_req, res, _next) => {
  console.log('--- Entering deleteAllCarts controller (Admin) ---');
  console.log('deleteAllCarts: Deleting all carts.');
  await cartService.deleteAllCarts();
  res.status(200).json(JSend.success({ message: "Tất cả giỏ hàng đã được xóa." }));
  console.log('--- Exiting deleteAllCarts controller (Admin) ---');
});

// Export all functions
module.exports = {
    getMyCart,
    addItemToMyCart,
    updateMyCartItem,
    removeItemFromMyCart,
    clearMyCart,
    createCart,
    getAllCarts,
    getCartByUserId,
    getCartById,
    updateCartItem,
    deleteCartItem,
    deleteCart,
    deleteAllCarts,
};

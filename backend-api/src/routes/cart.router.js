// backend-api/src/routes/cart.router.js

const express = require("express");
const cartController = require("../controllers/cart.controller");
const cartSchemas = require("../schema/cart.schemas");
const { validate } = require("../middlewares/validator.middleware"); 
const { methodNotAllowed } = require("../controllers/errors.controller"); 
const multer = require('multer'); 
const { authenticate, restrictTo } = require("../middlewares/auth.middleware");

const router = express.Router();
// Khởi tạo multer instance.
// Chúng ta sẽ không dùng .none() cho các route nhận JSON,
// mà sẽ để express.json() đã cấu hình trong app.js xử lý.
// Multer vẫn cần được khai báo nếu có các route khác xử lý multipart/form-data.
const upload = multer(); 

module.exports.setup = (app) => {
  // Gán router này cho đường dẫn /api/v1/carts
  app.use("/api/v1/carts", router);

  // Định nghĩa các route cho /api/v1/carts
  router.route("/")
    .get(
      authenticate, // Yêu cầu xác thực
      restrictTo('admin'), // Chỉ admin mới được xem tất cả giỏ hàng
      validate(cartSchemas.getCartQuerySchema), // Validate các tham số truy vấn
      cartController.getAllCarts // Controller để lấy tất cả giỏ hàng
    )
    .post(
      authenticate, // Yêu cầu xác thực (admin hoặc user có thể tạo/cập nhật giỏ hàng)
      // Dựa trên cart.schemas.js và cart.controller.js (createCart sử dụng parseCartItems), 
      // thì route này ĐANG mong đợi multipart/form-data với 'items' là chuỗi JSON.
      // Nên upload.none() là cần thiết cho route /api/v1/carts (POST)
      upload.none(), 
      validate(cartSchemas.createCartSchema), // Validate body theo schema tạo giỏ hàng
      cartController.createCart // Controller để tạo giỏ hàng
    )
    .delete(
      authenticate, // Yêu cầu xác thực
      restrictTo('admin'), // Chỉ admin mới được xóa tất cả giỏ hàng
      cartController.deleteAllCarts // Controller để xóa tất cả giỏ hàng
    );

  // Định nghĩa các route cho giỏ hàng của người dùng hiện tại /api/v1/carts/myCart
  router.route("/myCart") 
    .get(
      authenticate, // Yêu cầu xác thực người dùng
      cartController.getMyCart // Controller để lấy giỏ hàng của người dùng hiện tại
    )
    .post( // Thêm sản phẩm vào giỏ hàng của tôi
      authenticate, // Yêu cầu xác thực người dùng
      // Frontend gửi `Content-Type: application/json` cho hành động này,
      // `express.json()` (đã cấu hình trong `app.js`) sẽ xử lý body.
      // `multer.none()` chỉ cần thiết khi nhận `multipart/form-data` không có file.
      validate(cartSchemas.addItemToCartSchema), // Validate body theo schema thêm mục vào giỏ
      cartController.addItemToMyCart // Controller để thêm sản phẩm vào giỏ hàng
    )
    .patch( // Cập nhật số lượng sản phẩm trong giỏ hàng của tôi
      authenticate, // Yêu cầu xác thực người dùng
      // ĐÃ SỬA: Dùng updateMyCartItemSchema cho route của người dùng
      validate(cartSchemas.updateMyCartItemSchema), 
      cartController.updateMyCartItem // Controller để cập nhật mục giỏ hàng
    )
    .delete( // Xóa toàn bộ giỏ hàng của tôi
      authenticate, // Yêu cầu xác thực người dùng
      cartController.clearMyCart // Controller để xóa toàn bộ giỏ hàng
    );

  // Định nghĩa route để xóa một mục cụ thể khỏi giỏ hàng của tôi
  router.route("/removeItem") 
    .delete(
      authenticate, // Yêu cầu xác thực người dùng
      // Frontend gửi `Content-Type: application/json` cho hành động này,
      // `express.json()` (đã cấu hình trong `app.js`) sẽ xử lý body.
      validate(cartSchemas.removeItemFromCartSchema), // Validate body theo schema xóa mục
      cartController.removeItemFromMyCart // Controller để xóa một mục cụ thể
    );

  // Định nghĩa route để lấy giỏ hàng theo User ID (chỉ admin)
  router.route("/user/:userId")
    .get(
      authenticate, 
      restrictTo('admin'), 
      validate({ params: cartSchemas.userIdParamSchema }), // Validate tham số userId
      cartController.getCartByUserId
    );

  // Định nghĩa route để lấy hoặc xóa giỏ hàng theo Cart ID (chỉ admin)
  router.route("/:id")
    .get(
      authenticate,
      restrictTo('admin'),
      validate({ params: cartSchemas.cartIdParamSchema }), // Validate tham số cartId
      cartController.getCartById
    )
    .delete(
      authenticate,
      restrictTo('admin'),
      validate({ params: cartSchemas.cartIdParamSchema }), // Validate tham số cartId
      cartController.deleteCart
    );

  // Định nghĩa route để cập nhật hoặc xóa một mục trong giỏ hàng theo Cart ID và Product ID (chỉ admin)
  router.route("/:id/item/:productId") 
    .put(
      authenticate,
      validate({
        params: cartSchemas.cartIdParamSchema.extend({
          productId: cartSchemas.cartItemSchema.shape.product_id,
        }),
        // ĐÃ SỬA: Dùng updateCartItemAdminSchema cho route admin
        body: cartSchemas.updateCartItemAdminSchema, 
      }),
      cartController.updateCartItem
    )
    .delete(
      authenticate,
      validate({
        params: cartSchemas.cartIdParamSchema.extend({
          productId: cartSchemas.cartItemSchema.shape.product_id,
        }),
      }),
      cartController.deleteCartItem
    );

  // Xử lý các phương thức HTTP không được phép cho các route này
  router.all("/", methodNotAllowed);
  router.all("/myCart", methodNotAllowed); 
  router.all("/removeItem", methodNotAllowed);
  router.all("/user/:userId", methodNotAllowed);
  router.all("/:id", methodNotAllowed);
  router.all("/:id/item/:productId", methodNotAllowed);
};

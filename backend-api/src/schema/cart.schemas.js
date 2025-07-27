// backend-api/src/schema/cart.schemas.js
const { z } = require('zod');

// Schema cho một mục trong giỏ hàng (đối tượng cơ bản)
const cartItemSchema = z.object({
  product_id: z.coerce.number().int().positive('Product ID must be a positive integer'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
});

// Schema cho việc thêm một mục vào giỏ hàng của người dùng hiện tại (POST /myCart)
// Frontend gửi { product_id, quantity } trực tiếp trong body JSON
const addItemToCartSchema = z.object({
  body: z.object({ // <-- Đây là req.body, không phải req.body.body
    product_id: z.coerce.number().int().positive('Product ID must be a positive integer'),
    quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  }),
});

// SỬA LỖI Ở ĐÂY: Schema cho việc cập nhật số lượng của một mục cụ thể trong giỏ hàng (PATCH /myCart)
// Frontend gửi { product_id, quantity } trực tiếp trong body JSON
const updateMyCartItemSchema = z.object({
  body: z.object({ // <-- Đã sửa để khớp với req.body
    product_id: z.coerce.number().int().positive('Product ID must be a positive integer'),
    quantity: z.coerce.number().int().min(0, 'Quantity must be non-negative. Use 0 to remove item.').optional(), // Có thể là 0 để xóa
  }),
});

// SỬA LỖI Ở ĐÂY: Schema cho việc xóa một mục khỏi giỏ hàng của người dùng hiện tại (DELETE /removeItem)
// Frontend gửi { product_id } trực tiếp trong body JSON
const removeItemFromCartSchema = z.object({
  body: z.object({ // <-- Đã sửa để khớp với req.body
    product_id: z.coerce.number().int().positive('Product ID must be a positive integer'),
  }),
});


// Schema cho việc tạo giỏ hàng hoặc thêm/cập nhật các mục (sử dụng trong POST /api/v1/carts)
// Lưu ý: route này trong router.js đang dùng `upload.none()`,
// nên `req.body.items` sẽ là một chuỗi.
// Nếu bạn chỉ muốn route này nhận JSON, hãy bỏ `upload.none()` khỏi router.js
// và thay đổi schema này để `items` là `z.array(cartItemSchema)` trực tiếp.
const createCartSchema = z.object({
  body: z.object({
    user_id: z.coerce.number().int().positive('User ID must be a positive integer'),
    // items được mong đợi là một chuỗi JSON của mảng cartItemSchema
    items: z.string().transform((str, ctx) => {
      try {
        const parsed = JSON.parse(str);
        // Validate each item in the parsed array against cartItemSchema
        if (!Array.isArray(parsed)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Items must be a JSON string representing an array.',
          });
          return z.NEVER;
        }
        for (const item of parsed) {
          cartItemSchema.parse(item); // Validate each item
        }
        return parsed;
      } catch (e) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid JSON string for items or invalid item structure.',
        });
        return z.NEVER;
      }
    }).pipe(z.array(cartItemSchema).min(1, 'At least one item is required for the cart')),
  }),
});


// Schema cho việc cập nhật số lượng của một mục cụ thể trong giỏ hàng (PUT /:id/item/:productId)
// Lưu ý: route này trong router.js đang dùng `validate({ body: cartSchemas.updateCartItemSchema })`
// và `updateCartItemSchema` ở đây có `body: z.object(...)`
// Điều này có nghĩa là nó mong đợi `req.body.body.quantity`.
// Nếu bạn muốn nó nhận `req.body.quantity` thì cần sửa lại validate middleware hoặc schema này.
// Tạm thời, tôi sẽ giữ nguyên cấu trúc này để phù hợp với cách validate middleware hoạt động.
const updateCartItemAdminSchema = z.object({ // Đổi tên để phân biệt với updateMyCartItemSchema
  body: z.object({
    quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  }),
});


// Schema cho tham số ID giỏ hàng (GET/PUT/DELETE /api/v1/carts/:id)
const cartIdParamSchema = z.object({
  id: z.coerce.number().int().positive('Cart ID must be a positive integer'),
});

// Schema cho tham số User ID (GET /api/v1/carts/user/:userId)
const userIdParamSchema = z.object({
  userId: z.coerce.number().int().positive('User ID must be a positive integer'),
});

// Schema cho truy vấn giỏ hàng (GET /api/v1/carts)
const getCartQuerySchema = z.object({
  query: z.object({
    user_id: z.coerce.number().int().positive('User ID must be a positive integer').optional(),
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
  }),
});

module.exports = {
  cartItemSchema,
  createCartSchema,
  addItemToCartSchema,
  updateMyCartItemSchema, // ĐÃ SỬA LỖI Ở ĐÂY
  removeItemFromCartSchema, // ĐÃ SỬA LỖI Ở ĐÂY
  updateCartItemAdminSchema,
  cartIdParamSchema,
  userIdParamSchema,
  getCartQuerySchema,
};

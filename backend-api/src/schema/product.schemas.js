// ct313hm02-project-DrStone113/backend-api/src/schemas/product.schemas.js
const { z } = require('zod');

// Schema cho việc tạo sản phẩm
const createProductSchema = z.object({
  body: z.object({
    type: z.string().min(1, 'Product type is required'),
    name: z.string().min(1, 'Product name is required'),
    description: z.string().max(1000, 'Description cannot be more than 1000 characters').optional().nullable(),
    price: z.coerce.number().positive('Price must be a positive number'),
    stock: z.coerce.number().int().min(0, 'Stock must be a non-negative integer'),
    category_id: z.coerce.number().int().positive('Category ID must be a positive integer').optional().nullable(),
    // imageFile handled by multer, its presence checked in controller
  }),
});

// Schema cho việc cập nhật sản phẩm (PATCH/PUT)
const updateProductSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive('Product ID must be a positive integer'),
  }),
  body: z.object({
    type: z.string().min(1, 'Product type cannot be empty').optional(),
    name: z.string().min(1, 'Product name cannot be empty').optional(),
    description: z.string().max(1000, 'Description cannot be more than 1000 characters').optional().nullable(),
    price: z.coerce.number().positive('Price must be a positive number').optional(),
    stock: z.coerce.number().int().min(0, 'Stock must be a non-negative integer').optional(),
    available: z.coerce.boolean().optional(),
    category_id: z.coerce.number().int().positive('Category ID must be a positive integer').optional().nullable(),
    // imageFile handled by multer, its presence checked in controller
  })
});

// Schema cho truy vấn sản phẩm (GET /api/v1/product)
const getProductQuerySchema = z.object({
  query: z.object({
    type: z.string().optional(),
    name: z.string().optional(),
    minPrice: z.coerce.number().positive('Min price must be a positive number').optional(),
    maxPrice: z.coerce.number().positive('Max price must be a positive number').optional(),
    available: z.coerce.boolean().optional(), // Filter by availability
    category_id: z.coerce.number().int().positive('Category ID must be a positive integer').optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
});

// Schema cho tham số ID (GET/PUT/DELETE /api/v1/product/:id)
const productIdParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive('Product ID must be a positive integer'),
  }),
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  getProductQuerySchema,
  productIdParamSchema,
};
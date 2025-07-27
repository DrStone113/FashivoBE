//src\schema\category.schemas.js
const { z } = require('zod');

// Schema cho việc tạo danh mục mới
const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Category name is required').max(100, 'Category name cannot be more than 100 characters'),
    url_path: z.string().max(100, 'URL path cannot be more than 100 characters').toLowerCase().trim().optional().nullable(),
    description: z.string().max(500, 'Category description cannot be more than 500 characters').optional().nullable(),
  }),
});

// Schema cho việc cập nhật danh mục (PATCH)
const updateCategorySchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive('Category ID must be a positive integer'),
  }),
  body: z.object({
    name: z.string().min(1, 'Category name cannot be empty').max(100, 'Category name cannot be more than 100 characters').optional(),
    url_path: z.string().max(100, 'URL path cannot be more than 100 characters').toLowerCase().trim().optional().nullable(),
    description: z.string().max(500, 'Category description cannot be more than 500 characters').optional().nullable(),
  }).refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update.",
    path: ["body"],
  }),
});

// Schema cho truy vấn danh mục (GET /api/v1/categories)
const getCategoryQuerySchema = z.object({
  query: z.object({
    name: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
});

// Schema cho tham số ID (GET/PUT/DELETE /api/v1/categories/:id)
const categoryIdParamSchema = z.object({
  id: z.coerce.number().int().positive('Category ID must be a positive integer'),
});

module.exports = {
  createCategorySchema, // Renamed categorySchema to createCategorySchema
  updateCategorySchema,
  getCategoryQuerySchema,
  categoryIdParamSchema,
};
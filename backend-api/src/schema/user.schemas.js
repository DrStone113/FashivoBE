// backend-api/src/schemas/user.schemas.js
const { z } = require('zod');

// Schema cho việc tạo người dùng mới
const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(3, 'Name must be at least 3 characters long').max(255, 'Name cannot be more than 255 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    address: z.string().max(255, 'Address cannot be more than 255 characters').optional().nullable(),
    phone: z.string().regex(/^\+?\d{9,15}$/, 'Invalid phone number format').optional().nullable(),
    role: z.enum(['admin', 'user']).default('user').optional(), 
  }),
});

// Schema cho việc cập nhật thông tin người dùng (PATCH)
const updateUserSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive('User ID must be a positive integer'),
  }),
  body: z.object({
    
    name: z.string().min(3, 'Name must be at least 3 characters long').max(255, 'Name cannot be more than 255 characters').optional(),
    email: z.string().email('Invalid email address').optional(),
    password: z.string().min(8, 'Password must be at least 8 characters long').optional(),
    address: z.string().max(255, 'Address cannot be more than 255 characters').optional().nullable(),
    phone: z.string().regex(/^\+?\d{9,15}$/, 'Invalid phone number format').optional().nullable(),
    role: z.enum(['admin', 'user']).optional(),
    avatarFile: z.any().optional(), 
  }).refine((data) => Object.keys(data).length > 0 || data.avatarFile !== undefined, {
    message: "At least one field must be provided for update.",
    path: ["body"],
  }),
});

// Schema cho truy vấn người dùng (GET /api/v1/users)
const getUserQuerySchema = z.object({
  query: z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    role: z.enum(['admin', 'user']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
});

// Schema cho tham số ID (GET/PUT/DELETE /api/v1/users/:id)
const userIdParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive('User ID must be a positive integer'),
  }),
})

module.exports = {
  createUserSchema,
  updateUserSchema,
  getUserQuerySchema,
  userIdParamSchema
};
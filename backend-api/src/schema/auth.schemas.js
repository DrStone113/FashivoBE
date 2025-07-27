// src/schema/auth.schemas.js
const { z } = require('zod');

// Schema cho việc đăng ký người dùng mới
const signupSchema = z.object({
  body: z.object({
    name: z.string().min(3, 'Tên người dùng phải có ít nhất 3 ký tự').max(255, 'Tên người dùng không được vượt quá 255 ký tự'), 
    email: z.string().email('Địa chỉ email không hợp lệ'),
    password: z.string()
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
      .regex(/[a-z]/, 'Mật khẩu phải chứa ít nhất một chữ cái thường')
      .regex(/[A-Z]/, 'Mật khẩu phải chứa ít nhất một chữ cái in hoa')
      .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất một số')
      .regex(/[^a-zA-Z0-9]/, 'Mật khẩu phải chứa ít nhất một ký tự đặc biệt'),
    confirmPassword: z.string(),
    address: z.string().max(200, 'Địa chỉ không được vượt quá 200 ký tự').optional().nullable(),
    phone: z.string().regex(/^\+?[0-9]{7,15}$/, 'Định dạng số điện thoại không hợp lệ').optional().nullable(),
    // avatar_url KHÔNG CẦN Ở ĐÂY NỮA VÌ NÓ ĐƯỢC XỬ LÝ BỞI MULTER VÀ GÁN TRONG CONTROLLER
    // Tuy nhiên, nếu bạn muốn validate URL nếu nó được gửi như một trường văn bản (không phải file)
    // thì có thể để lại, nhưng cách hiện tại là Multer xử lý file và controller gán đường dẫn
    // avatar_url: z.string().url('URL ảnh đại diện không hợp lệ').optional().nullable(), 
    role: z.enum(['user', 'admin']).default('user').optional(), 
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu không khớp",
    path: ["confirmPassword"],
  }),
});

// Schema cho việc đăng nhập người dùng
const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Địa chỉ email không hợp lệ'),
    password: z.string().min(1, 'Mật khẩu không được để trống'),
  }),
});

// Schema cho việc cập nhật profile (của chính user)
const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(3, 'Tên người dùng phải có ít nhất 3 ký tự').max(255, 'Tên người dùng không được vượt quá 255 ký tự').optional(), 
    email: z.string().email('Địa chỉ email không hợp lệ').optional(), // Cho phép email thay đổi
    address: z.string().max(200, 'Địa chỉ không được vượt quá 200 ký tự').optional().nullable(),
    phone: z.string().regex(/^\+?[0-9]{7,15}$/, 'Định dạng số điện thoại không hợp lệ').optional().nullable(),
    avatar_url: z.string().url('URL ảnh đại diện không hợp lệ').optional().nullable(), // Cho phép avatar_url thay đổi (khi xóa hoặc giữ nguyên)
  }).refine((data) => Object.keys(data).length > 0, {
    message: "Phải cung cấp ít nhất một trường để cập nhật.",
    path: ["body"],
  }),
});

// Schema cho việc cập nhật mật khẩu
const updatePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Mật khẩu hiện tại không được để trống'),
    newPassword: z.string()
      .min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự')
      .regex(/[a-z]/, 'Mật khẩu mới phải chứa ít nhất một chữ cái thường')
      .regex(/[A-Z]/, 'Mật khẩu mới phải chứa ít nhất một chữ cái in hoa')
      .regex(/[0-9]/, 'Mật khẩu mới phải chứa ít nhất một số')
      .regex(/[^a-zA-Z0-9]/, 'Mật khẩu mới phải chứa ít nhất một ký tự đặc biệt'),
    confirmNewPassword: z.string(),
  }).refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Mật khẩu mới không khớp",
    path: ["confirmNewPassword"],
  }),
});

// Schema cho Quên mật khẩu
const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Địa chỉ email không hợp lệ'),
  }),
});

// Schema cho Đặt lại mật khẩu
const resetPasswordSchema = z.object({
  params: z.object({
    token: z.string().min(1, 'Reset token không được để trống'),
  }),
  body: z.object({
    newPassword: z.string()
      .min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự')
      .regex(/[a-z]/, 'Mật khẩu mới phải chứa ít nhất một chữ cái thường')
      .regex(/[A-Z]/, 'Mật khẩu mới phải chứa ít nhất một chữ cái in hoa')
      .regex(/[0-9]/, 'Mật khẩu mới phải chứa ít nhất một số')
      .regex(/[^a-zA-Z0-9]/, 'Mật khẩu mới phải chứa ít nhất một ký tự đặc biệt'),
    confirmNewPassword: z.string(),
  }).refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Mật khẩu mới không khớp",
    path: ["confirmNewPassword"],
  }),
});

module.exports = {
  signupSchema,
  loginSchema,
  updateProfileSchema,
  updatePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
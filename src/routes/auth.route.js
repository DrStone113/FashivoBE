// src/routes/auth.route.js

const express = require('express');
const authController = require('../controllers/auth.controller');
const authSchemas = require('../schema/auth.schemas');
const { validate } = require('../middlewares/validator.middleware');
const { authenticate, restrictTo } = require('../middlewares/auth.middleware');
const { methodNotAllowed } = require("../controllers/errors.controller");
const multer = require('multer'); 
const { authLimiter } = require('../middlewares/rateLimit.middleware');

const router = express.Router();

// Cấu hình Multer cho việc upload file avatar
// Đảm bảo thư mục public/avatars tồn tại
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/avatars'); 
  },
  filename: (req, file, cb) => {
    // Dùng ID user nếu có (khi update profile), nếu không thì dùng timestamp (khi đăng ký)
    const identifier = req.user ? `user-${req.user.id}` : `temp-${Date.now()}`;
    const ext = file.mimetype.split('/')[1];
    cb(null, `${identifier}-${Date.now()}.${ext}`);
  }
});

// Filter để chỉ cho phép upload ảnh
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file ảnh!'), false);
  }
};

const upload = multer({ 
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Giới hạn kích thước file 5MB
});


module.exports.setup = (app) => {
  app.use('/api/v1/auth', router);

  // Routes không cần bảo vệ (public routes)
  router.route('/signup')
    .post(
      authLimiter,
      upload.single('avatar'), // CHO PHÉP UPLOAD MỘT FILE AVATAR KHI ĐĂNG KÝ
      validate(authSchemas.signupSchema), 
      authController.signup
    )
    .all(methodNotAllowed);

  router.route('/login')
    .post(
      authLimiter,
      upload.none(),
      validate(authSchemas.loginSchema),
      authController.login
    )
    .all(methodNotAllowed);

  router.route('/forgot-password')
    .post(
      upload.none(),
      validate(authSchemas.forgotPasswordSchema), 
      authController.forgotPassword
    )
    .all(methodNotAllowed);

  router.route('/reset-password/:token')
    .patch( 
      upload.none(),
      validate(authSchemas.resetPasswordSchema), 
      authController.resetPassword
    )
    .all(methodNotAllowed);

  // Route logout không cần xác thực (thường là vậy)
  router.route('/logout')
    .post(authController.logout) 
    .all(methodNotAllowed);

  // Routes cần bảo vệ (authenticate middleware sẽ được áp dụng cho tất cả các route bên dưới)
  router.use(authenticate); 

  // Route để lấy thông tin của chính mình và CẬP NHẬT (PATCH)
  router.route('/me')
    .get(authController.getMe)
    .patch( 
      upload.single('avatar'), 
      validate(authSchemas.updateProfileSchema), 
      authController.updateMe
    )
    .all(methodNotAllowed);

  // Route cập nhật mật khẩu (cần xác thực)
  router.route('/update-password') 
    .patch( 
      upload.none(),
      validate(authSchemas.updatePasswordSchema),
      authController.updateMyPassword
    )
    .all(methodNotAllowed);
};
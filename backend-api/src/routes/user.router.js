const express = require("express");
const userController = require("../controllers/user.controller");
const userSchemas = require("../schema/user.schemas"); 
const { validate } = require("../middlewares/validator.middleware");
const { methodNotAllowed } = require("../controllers/errors.controller");
const multer = require("multer");
const ApiError = require("../api-error");
const { authenticate, restrictTo } = require("../middlewares/auth.middleware");

const router = express.Router();

// Multer setup for avatar uploads
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Corrected path for consistency. Ensure 'public/avatars' exists.
    cb(null, 'public/avatars');
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split("/")[1];
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `avatar-${uniqueSuffix}.${ext}`);
  }
});

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new ApiError(400, "Not an image! Please upload only images."), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit for avatars
});

// ROUTES
module.exports.setup = (app) => {
  app.use("/api/v1/users", router);

  router.route("/")
    .get(
      authenticate, // <--- THÊM: Yêu cầu xác thực
      restrictTo('admin'), // <--- THÊM: Chỉ admin mới được xem tất cả user
      validate(userSchemas.getUserQuerySchema), userController.getAllUsers
    )
    .post(
      authenticate, // <--- THÊM: Yêu cầu xác thực
      restrictTo('admin'), // <--- THÊM: Chỉ admin mới được tạo user (nếu đây là endpoint tạo user bởi admin)
      upload.single("avatarFile"), // Expects field name 'avatar' for file upload
      validate(userSchemas.createUserSchema),
      userController.createUser
    )
    .delete(
      authenticate, // <--- THÊM: Yêu cầu xác thực
      restrictTo('admin'), // <--- THÊM: Chỉ admin mới được xóa tất cả user
      userController.deleteAllUsers
    );

  router.route("/:id")
    .get(
      authenticate, // <--- THÊM: Yêu cầu xác thực
      restrictTo('admin'), // <--- THÊM: Chỉ admin mới được xem user theo ID
      validate(userSchemas.userIdParamSchema), userController.getUserById
    )
    .put( // Changed from PUT to PATCH for partial updates with updateUserSchema
      authenticate, // <--- THÊM: Yêu cầu xác thực
      restrictTo('admin'), // <--- THÊM: Chỉ admin mới được cập nhật user
      upload.single("avatarFile"), // Allow avatar update
      validate(userSchemas.updateUserSchema), // Validate both params (from schema) and body
      userController.updateUser
    )
    .delete(
      authenticate, // <--- THÊM: Yêu cầu xác thực
      restrictTo('admin'), // <--- THÊM: Chỉ admin mới được xóa user
      validate(userSchemas.userIdParamSchema), userController.deleteUser
    );

  router.all("/", methodNotAllowed);
  router.all("/:id", methodNotAllowed);
  router.all("/*", methodNotAllowed);
};
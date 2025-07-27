// src/controllers/auth.controller.js
const JSend = require("../jsend");
const ApiError = require("../api-error");
const catchAsync = require("../catchAsync");
const authService = require("../services/auth.service");

// Đăng ký người dùng mới
const signup = catchAsync(async (req, res, _next) => {
  const { name, email, password, address, phone, role } = req.body;
  const userData = { name, email, password, address, phone, role };

  // Xử lý file avatar nếu có khi đăng ký
  if (req.file) {
      userData.avatar_url = `/public/avatars/${req.file.filename}`; 
  }

  const newUserWithoutPassword = await authService.registerUser(userData);

  const token = authService.signToken(newUserWithoutPassword.id);

  res.status(201).json(JSend.success({
    user: newUserWithoutPassword,
    token,
    message: "Đăng ký thành công!"
  }));
});

// Đăng nhập người dùng
const login = catchAsync(async (req, res, _next) => {
  const { email, password } = req.body;

  const { user, token } = await authService.loginUser(email, password);
  console.log('Generated Token:', token);

  res.status(200).json(JSend.success({
    user,
    token,
    message: "Đăng nhập thành công!"
  }));
});

// Lấy thông tin profile của người dùng hiện tại
const getMe = catchAsync(async (req, res, _next) => {
  const user = req.user;
  if (!user) {
    return _next(new ApiError(404, "Không tìm thấy thông tin người dùng."));
  }
  res.status(200).json(JSend.success({ user }));
});

// Cập nhật thông tin profile của người dùng hiện tại
const updateMe = catchAsync(async (req, res, _next) => {
    const userId = req.user.id;
    const updateData = { ...req.body }; 

    // Xóa trường avatarFile khỏi updateData nếu nó tồn tại trong req.body
    if (updateData.avatarFile) {
        delete updateData.avatarFile;
    }

    // Xử lý file avatar nếu có
    if (req.file) {
        updateData.avatar_url = `/public/avatars/${req.file.filename}`; 
    } else if (updateData.avatar_url === '/public/image/products/BLANK.jpg.png') {
        // Nếu frontend gửi avatar_url là BLANK.jpg.png (người dùng đã xóa ảnh hoặc không chọn)
        // và avatar hiện tại của user không phải là BLANK, thì set avatar_url thành null
        // để xóa avatar cũ trong DB.
        if (req.user.avatar_url && req.user.avatar_url !== '/public/image/products/BLANK.jpg.png') {
            updateData.avatar_url = null;
        }
    }

    const updatedUser = await authService.updateProfile(userId, updateData);

    res.status(200).json(JSend.success({
        user: updatedUser,
        message: "Cập nhật thông tin thành công!"
    }));
});

// Cập nhật mật khẩu của người dùng hiện tại
const updateMyPassword = catchAsync(async (req, res, _next) => {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    const updatedUser = await authService.updatePasswordForUser(userId, currentPassword, newPassword);

    res.status(200).json(JSend.success({
        user: updatedUser,
        message: "Cập nhật mật khẩu thành công!"
    }));
});

// Quên mật khẩu
const forgotPassword = catchAsync(async (req, res, _next) => {
  const { email } = req.body;

  const resetToken = await authService.generatePasswordResetToken(email);

  res.status(200).json(JSend.success({
    message: 'Token đặt lại mật khẩu đã được gửi đến email của bạn!',
    resetToken 
  }));
});

// Đặt lại mật khẩu
const resetPassword = catchAsync(async (req, res, _next) => {
  const { token } = req.params;
  const { newPassword, confirmNewPassword } = req.body;

  if (newPassword !== confirmNewPassword) {
    return _next(new ApiError(400, 'Mật khẩu mới và xác nhận mật khẩu không khớp.'));
  }

  const { user, token: newToken } = await authService.resetPassword(token, newPassword);

  res.status(200).json(JSend.success({
    user,
    token: newToken,
    message: 'Đặt lại mật khẩu thành công!'
  }));
});

// Đăng xuất người dùng
const logout = catchAsync(async (req, res, _next) => {
  res.status(200).json(JSend.success({ message: 'Đăng xuất thành công!' }));
});

module.exports = {
  signup,
  login,
  getMe,
  updateMe,
  updateMyPassword,
  forgotPassword,
  resetPassword,
  logout,
};
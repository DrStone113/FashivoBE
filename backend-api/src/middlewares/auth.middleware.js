// backend-api/src/middlewares/auth.middleware.js

const jwt = require('jsonwebtoken');
const ApiError = require('../api-error');
const catchAsync = require('../catchAsync');
const authService = require('../services/auth.service'); // Thay đổi để sử dụng authService

// Middleware xác thực người dùng (Authentication)
const authenticate = catchAsync(async (req, res, next) => {
    // 1. Lấy token từ header
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    console.log('--- Auth Middleware Debug ---');
    console.log('Request URL:', req.originalUrl); // URL của yêu cầu
    console.log('Authorization Header:', req.headers.authorization); // Header Authorization nhận được
    console.log('Token extracted:', token); // Token đã được trích xuất

    if (!token) {
        return next(new ApiError(401, 'Bạn không có quyền truy cập. Vui lòng đăng nhập.'));
    }

    // 2. Xác minh token
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Đảm bảo JWT_SECRET có trong .env

    // 3. Tìm người dùng từ ID trong token
    const currentUser = await authService.findUserById(decoded.id);

    // THÊM LOG NÀY: Kiểm tra chính xác đối tượng currentUser nhận được từ service
    console.log('--- Auth Middleware Debug ---');
    console.log('Decoded Token ID:', decoded.id);
    console.log('User found by ID (currentUser object from DB):', currentUser); // <--- LOG QUAN TRỌNG
    console.log('-----------------------------');


    if (!currentUser) {
        return next(new ApiError(401, 'Người dùng sở hữu token này không còn tồn tại.'));
    }

    // 4. Gắn người dùng vào request để các middleware/controller tiếp theo sử dụng
    // Đảm bảo không gán mật khẩu vào req.user
    const { password, ...userWithoutPassword } = currentUser;
    req.user = userWithoutPassword; // req.user sẽ không chứa mật khẩu
    next();
});

// Middleware kiểm tra quyền (Authorization - RBAC)
const restrictTo = (...roles) => { // roles là một mảng các vai trò được phép (ví dụ: 'admin', 'user')
    return (req, res, next) => {
        // req.user đã có từ middleware authenticate
        if (!req.user || !req.user.role || !roles.includes(req.user.role)) {
            return next(new ApiError(403, 'Bạn không có quyền thực hiện hành động này.'));
        }
        next();
    };
};

module.exports = {
    authenticate,
    restrictTo,
};

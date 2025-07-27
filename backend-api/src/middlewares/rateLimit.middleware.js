// backend-api/src/middlewares/rateLimit.middleware.js

const rateLimit = require('express-rate-limit');
const JSend = require('../jsend');

// 1. Giới hạn chung cho tất cả các API (trừ những API có giới hạn riêng)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 100, // Tối đa 100 request mỗi windowMs từ mỗi IP
    standardHeaders: true, // Thêm các header RateLimit-* vào response
    legacyHeaders: false, // Bỏ qua X-RateLimit-* headers
    message: (req, res) => {
        res.status(429).json(JSend.error('Too many requests, please try again after 15 minutes', 429));
    }

});

// 2. Giới hạn nghiêm ngặt hơn cho các route xác thực (login, signup, reset password)
const authLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 15 phút
    max: 5, // Tối đa 5 lần thử đăng nhập thất bại mỗi windowMs từ mỗi IP
    standardHeaders: true,
    legacyHeaders: false,
    message: (req, res) => {
        res.status(429).json(JSend.error('Too many login attempts from this IP, please try again after 60 minutes', 429));
    }
});

module.exports = {
    apiLimiter,
    authLimiter,
};
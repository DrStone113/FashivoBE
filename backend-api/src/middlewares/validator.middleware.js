const ApiError = require("../api-error");
const { z } = require('zod');

const validate = (schema) => (req, res, next) => {
    try {
        if (schema.body) {
            // Parse và gán lại req.body đã được validate
            // req.body chứa các trường text từ multipart/form-data do multer.none() xử lý
            req.body = schema.body.parse(req.body);
        }
        if (schema.query) {
            req.query = schema.query.parse(req.query);
        }
        if (schema.params) {
            req.params = schema.params.parse(req.params);
        }
        next();
    } catch (error) {
        if (error instanceof z.ZodError) { // Kiểm tra nếu là ZodError
            const errors = error.issues.map(err => ({
                path: err.path.join('.'),
                message: err.message,
            }));
            return next(new ApiError(400, "Validation failed", { validationErrors: errors }));
        }
        next(error); // Chuyển các lỗi khác không phải ZodError
    }
};

module.exports = { validate };
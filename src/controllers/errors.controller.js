const ApiError = require("../api-error");
const JSend = require("../jsend");

function methodNotAllowed(req, res, next) {
  if (req.route) {
    const httpMethods = Object.keys(req.route.methods)
      .filter((method) => method !== "_all")
      .map((method) => method.toUpperCase());
    return next(
      new ApiError(405, "Method Not Allowed", {
        Allow: httpMethods.join(", "),
      })
    );
  }
  return next();
}

function resourceNotFound(req, res, next) {
  return next(new ApiError(404, "Resource not found"));
}

function handleError(error, req, res, next) {
  // THÊM DÒNG LOG NÀY ĐỂ XEM CHI TIẾT LỖI TRONG CONSOLE BACKEND
  console.error("BACKEND ERROR:", error); 
  // Bạn có thể log thêm stack trace nếu muốn: console.error("Error Stack:", error.stack);

  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal Server Error";

  let responseData = null;

  if (error instanceof ApiError && error.headers && error.headers.validationErrors) {
    responseData = error.headers.validationErrors;
  }

  if (error.headers) {
    for (const headerKey in error.headers) {
      if (headerKey !== 'validationErrors') {
        res.set(headerKey, error.headers[headerKey]);
      }
    }
  }

  if (statusCode >= 400 && statusCode < 500) {
    // Đối với lỗi client (4xx), sử dụng JSend.fail
    return res.status(statusCode).json(JSend.fail(message, responseData));
  } else {
    // Đối với lỗi server (5xx), sử dụng JSend.error
    // Trong môi trường phát triển, có thể gửi stack trace về frontend để debug dễ hơn
    if (process.env.NODE_ENV === 'development') {
        return res.status(statusCode).json(JSend.error(message, { 
            details: responseData, 
            stack: error.stack // Thêm stack trace vào response data
        }));
    } else {
        return res.status(statusCode).json(JSend.error(message, responseData));
    }
  }
}

module.exports = {
  methodNotAllowed,
  resourceNotFound,
  handleError,
};

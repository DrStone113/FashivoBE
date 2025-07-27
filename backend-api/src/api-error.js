// ct313hm02-project-DrStone113/backend-api/src/api-error.js
class ApiError extends Error {
  constructor(statusCode, message, headers = {}) {
    super();
    this.statusCode = statusCode;
    this.message = message;
    this.headers = headers;
  }
}

module.exports = ApiError;

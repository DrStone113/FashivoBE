// ct313hm02-project-DrStone113/backend-api/src/catchAsync.js
const catchAsync = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = catchAsync;
/**
 * errorHandler
 * Centralized error handling middleware. Any error passed via next(err),
 * or thrown inside an async route wrapped with a try/catch, ends up here.
 */
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    message: err.message || "Internal Server Error",
  });
};

/**
 * notFound
 * Catches requests to routes that don't exist and forwards a 404 error.
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

module.exports = { errorHandler, notFound };

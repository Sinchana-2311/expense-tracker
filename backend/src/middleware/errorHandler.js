// Central error handling and 404 middleware

function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.originalUrl} - Route not found`,
  });
}

function errorHandler(err, req, res, next) {
  console.error('API Error:', err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'An unexpected server error occurred',
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};

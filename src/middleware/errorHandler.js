const { AppError } = require('../core/AppError');

/**
 * Production centralized error handling middleware.
 * Follows SRP by managing error formatting and logging in one central place.
 */
function errorHandler(err, req, res, next) {
  // Set default values if error is not an AppError
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // In production, we log the error stack trace to the console for tracking
  console.error(`[Error Log] Path: ${req.path} | Error: ${err.message}`, err.stack);

  // If it's an operational error (anticipated/user mistake), we send the detailed message
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  }

  // If it's a programmatic bug, we don't leak implementation details to the client
  const response = {
    status: 'error',
    message: 'Something went wrong on our end. Please try again later.'
  };

  // Include stack trace only in development
  if (req.app.get('env') === 'development') {
    response.stack = err.stack;
    response.debugMessage = err.message;
  }

  return res.status(500).json(response);
}

module.exports = errorHandler;

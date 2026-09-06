const { validationResult } = require('express-validator');

/**
 * Validation runner middleware
 * Checks express-validator results and returns 400 with structured errors
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
      value: err.value
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errorCode: 'VALIDATION_ERROR',
      errors: formattedErrors
    });
  }

  next();
};

module.exports = { validate };

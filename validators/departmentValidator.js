const { body, param } = require('express-validator');

const createDepartmentValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Department name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),

  body('description')
    .optional()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters')
];

const updateDepartmentValidator = [
  param('id')
    .isMongoId().withMessage('Invalid department ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),

  body('description')
    .optional()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters')
];

module.exports = { createDepartmentValidator, updateDepartmentValidator };

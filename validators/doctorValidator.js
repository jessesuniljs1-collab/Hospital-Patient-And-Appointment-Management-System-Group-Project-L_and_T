const { body, param, query } = require('express-validator');

const createDoctorValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[\d\s-]{7,15}$/).withMessage('Please provide a valid phone number'),

  body('specialization')
    .trim()
    .notEmpty().withMessage('Specialization is required'),

  body('departmentId')
    .notEmpty().withMessage('Department ID is required')
    .isMongoId().withMessage('Invalid department ID'),

  body('qualification')
    .optional()
    .trim(),

  body('experience')
    .optional()
    .isInt({ min: 0 }).withMessage('Experience must be a non-negative number'),

  body('consultationFee')
    .optional()
    .isFloat({ min: 0 }).withMessage('Consultation fee must be a non-negative number')
];

const updateDoctorValidator = [
  param('id')
    .isMongoId().withMessage('Invalid doctor ID'),

  body('specialization')
    .optional()
    .trim()
    .notEmpty().withMessage('Specialization cannot be empty'),

  body('departmentId')
    .optional()
    .isMongoId().withMessage('Invalid department ID'),

  body('qualification')
    .optional()
    .trim(),

  body('experience')
    .optional()
    .isInt({ min: 0 }).withMessage('Experience must be a non-negative number'),

  body('consultationFee')
    .optional()
    .isFloat({ min: 0 }).withMessage('Consultation fee must be a non-negative number'),

  body('isAvailable')
    .optional()
    .isBoolean().withMessage('isAvailable must be a boolean')
];

const updateAvailabilityValidator = [
  param('id')
    .isMongoId().withMessage('Invalid doctor ID'),

  body('availabilitySlots')
    .isArray({ min: 1 }).withMessage('At least one availability slot is required'),

  body('availabilitySlots.*.day')
    .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
    .withMessage('Day must be a valid day of the week'),

  body('availabilitySlots.*.startTime')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Start time must be in HH:MM format'),

  body('availabilitySlots.*.endTime')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('End time must be in HH:MM format')
];

const doctorSearchValidator = [
  query('specialization')
    .optional()
    .trim(),

  query('department')
    .optional()
    .trim(),

  query('available')
    .optional()
    .isBoolean().withMessage('available must be true or false'),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
];

module.exports = { createDoctorValidator, updateDoctorValidator, updateAvailabilityValidator, doctorSearchValidator };

const { body } = require('express-validator');

const registerValidator = [
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
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),

  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[\d\s-]{7,15}$/).withMessage('Please provide a valid phone number'),

  body('role')
    .optional()
    .isIn(['Patient', 'Doctor', 'Admin']).withMessage('Role must be Patient, Doctor, or Admin'),

  // Patient-specific fields (required when role is Patient or default)
  body('dob')
    .if(body('role').not().equals('Doctor').not().equals('Admin'))
    .notEmpty().withMessage('Date of birth is required for patients')
    .isISO8601().withMessage('Date of birth must be a valid date (YYYY-MM-DD)')
    .toDate(),

  body('gender')
    .if(body('role').not().equals('Doctor').not().equals('Admin'))
    .notEmpty().withMessage('Gender is required for patients')
    .isIn(['Male', 'Female', 'Other']).withMessage('Gender must be Male, Female, or Other'),

  body('bloodGroup')
    .optional()
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).withMessage('Invalid blood group'),

  body('medicalNotes')
    .optional()
    .isLength({ max: 2000 }).withMessage('Medical notes cannot exceed 2000 characters'),

  // Doctor-specific fields
  body('specialization')
    .if(body('role').equals('Doctor'))
    .notEmpty().withMessage('Specialization is required for doctors')
    .trim(),

  body('departmentId')
    .if(body('role').equals('Doctor'))
    .notEmpty().withMessage('Department is required for doctors')
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

const loginValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
];

module.exports = { registerValidator, loginValidator };

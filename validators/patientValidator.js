const { body, param } = require('express-validator');

const updatePatientValidator = [
  body('dob')
    .optional()
    .isISO8601().withMessage('Date of birth must be a valid date')
    .toDate(),

  body('gender')
    .optional()
    .isIn(['Male', 'Female', 'Other']).withMessage('Gender must be Male, Female, or Other'),

  body('bloodGroup')
    .optional()
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).withMessage('Invalid blood group'),

  body('medicalNotes')
    .optional()
    .isLength({ max: 2000 }).withMessage('Medical notes cannot exceed 2000 characters'),

  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[\d\s-]{7,15}$/).withMessage('Please provide a valid phone number'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),

  body('address')
    .optional()
    .isLength({ max: 500 }).withMessage('Address cannot exceed 500 characters'),

  body('emergencyContact.name')
    .optional()
    .trim(),

  body('emergencyContact.phone')
    .optional()
    .trim(),

  body('emergencyContact.relationship')
    .optional()
    .trim()
];

module.exports = { updatePatientValidator };

const { body, param } = require('express-validator');

const createPrescriptionValidator = [
  body('appointmentId')
    .notEmpty().withMessage('Appointment ID is required')
    .isMongoId().withMessage('Invalid appointment ID'),

  body('medicines')
    .isArray({ min: 1 }).withMessage('At least one medicine is required'),

  body('medicines.*.name')
    .trim()
    .notEmpty().withMessage('Medicine name is required'),

  body('medicines.*.dosage')
    .trim()
    .notEmpty().withMessage('Dosage is required'),

  body('medicines.*.frequency')
    .trim()
    .notEmpty().withMessage('Frequency is required'),

  body('medicines.*.duration')
    .trim()
    .notEmpty().withMessage('Duration is required'),

  body('medicines.*.instructions')
    .optional()
    .trim(),

  body('diagnosis')
    .optional()
    .trim(),

  body('notes')
    .optional()
    .isLength({ max: 2000 }).withMessage('Notes cannot exceed 2000 characters')
];

module.exports = { createPrescriptionValidator };

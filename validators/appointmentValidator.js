const { body, param, query } = require('express-validator');

const createAppointmentValidator = [
  body('doctorId')
    .notEmpty().withMessage('Doctor ID is required')
    .isMongoId().withMessage('Invalid doctor ID'),

  body('date')
    .notEmpty().withMessage('Appointment date is required')
    .isISO8601().withMessage('Date must be a valid ISO 8601 date (YYYY-MM-DD)')
    .toDate(),

  body('slot.startTime')
    .notEmpty().withMessage('Slot start time is required')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Start time must be in HH:MM format'),

  body('slot.endTime')
    .notEmpty().withMessage('Slot end time is required')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('End time must be in HH:MM format'),

  body('reason')
    .optional()
    .isLength({ max: 500 }).withMessage('Reason cannot exceed 500 characters'),

  body('patientId')
    .optional()
    .isMongoId().withMessage('Invalid patient ID')
];

const updateStatusValidator = [
  param('id')
    .isMongoId().withMessage('Invalid appointment ID'),

  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['Booked', 'Confirmed', 'Completed', 'Cancelled', 'No-show'])
    .withMessage('Status must be Booked, Confirmed, Completed, Cancelled, or No-show'),

  body('notes')
    .optional()
    .isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters'),

  body('cancellationReason')
    .optional()
    .isLength({ max: 500 }).withMessage('Cancellation reason cannot exceed 500 characters')
];

const appointmentQueryValidator = [
  query('status')
    .optional()
    .isIn(['Booked', 'Confirmed', 'Completed', 'Cancelled', 'No-show'])
    .withMessage('Invalid status filter'),

  query('date')
    .optional()
    .isISO8601().withMessage('Date must be a valid date'),

  query('doctorId')
    .optional()
    .isMongoId().withMessage('Invalid doctor ID'),

  query('patientId')
    .optional()
    .isMongoId().withMessage('Invalid patient ID'),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
];

module.exports = { createAppointmentValidator, updateStatusValidator, appointmentQueryValidator };

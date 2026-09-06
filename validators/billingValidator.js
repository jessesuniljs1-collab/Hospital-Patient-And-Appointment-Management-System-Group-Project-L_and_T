const { body, param } = require('express-validator');

const createBillingValidator = [
  body('appointmentId')
    .notEmpty().withMessage('Appointment ID is required')
    .isMongoId().withMessage('Invalid appointment ID'),

  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 0 }).withMessage('Amount must be a non-negative number'),

  body('description')
    .optional()
    .trim()
];

const updateBillingValidator = [
  param('id')
    .isMongoId().withMessage('Invalid billing ID'),

  body('paymentStatus')
    .notEmpty().withMessage('Payment status is required')
    .isIn(['Pending', 'Paid', 'Cancelled']).withMessage('Payment status must be Pending, Paid, or Cancelled'),

  body('paymentMethod')
    .optional()
    .isIn(['Cash', 'Card', 'UPI', 'Insurance', 'Other']).withMessage('Invalid payment method')
];

module.exports = { createBillingValidator, updateBillingValidator };

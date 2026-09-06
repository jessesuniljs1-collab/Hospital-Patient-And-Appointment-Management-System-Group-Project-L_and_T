const mongoose = require('mongoose');

const billingSchema = new mongoose.Schema({
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: [true, 'Appointment reference is required']
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'Patient reference is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  paymentStatus: {
    type: String,
    enum: {
      values: ['Pending', 'Paid', 'Cancelled'],
      message: 'Payment status must be Pending, Paid, or Cancelled'
    },
    default: 'Pending'
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Card', 'UPI', 'Insurance', 'Other'],
    default: 'Cash'
  },
  description: {
    type: String,
    default: 'Consultation Fee'
  },
  paidAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes
billingSchema.index({ appointmentId: 1 });
billingSchema.index({ patientId: 1 });
billingSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model('Billing', billingSchema);

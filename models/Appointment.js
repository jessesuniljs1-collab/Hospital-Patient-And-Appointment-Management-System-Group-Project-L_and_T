const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'Patient is required']
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: [true, 'Doctor is required']
  },
  date: {
    type: Date,
    required: [true, 'Appointment date is required']
  },
  slot: {
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be in HH:MM format']
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'End time must be in HH:MM format']
    }
  },
  status: {
    type: String,
    enum: {
      values: ['Booked', 'Confirmed', 'Completed', 'Cancelled', 'No-show'],
      message: 'Status must be Booked, Confirmed, Completed, Cancelled, or No-show'
    },
    default: 'Booked'
  },
  reason: {
    type: String,
    maxlength: [500, 'Reason cannot exceed 500 characters'],
    default: ''
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    default: ''
  },
  cancelledBy: {
    type: String,
    enum: ['Patient', 'Doctor', 'Admin', null],
    default: null
  },
  cancellationReason: {
    type: String,
    maxlength: [500, 'Cancellation reason cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Indexes for common queries
appointmentSchema.index({ patientId: 1 });
appointmentSchema.index({ doctorId: 1 });
appointmentSchema.index({ date: 1, doctorId: 1 });
appointmentSchema.index({ status: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);

const mongoose = require('mongoose');

const availabilitySlotSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: {
      values: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      message: 'Invalid day of week'
    },
    required: [true, 'Day is required']
  },
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
}, { _id: true });

const doctorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
    unique: true
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: [true, 'Department is required']
  },
  specialization: {
    type: String,
    required: [true, 'Specialization is required'],
    trim: true
  },
  qualification: {
    type: String,
    trim: true
  },
  experience: {
    type: Number,
    min: [0, 'Experience cannot be negative']
  },
  consultationFee: {
    type: Number,
    min: [0, 'Fee cannot be negative'],
    default: 500
  },
  availabilitySlots: [availabilitySlotSchema],
  isAvailable: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
doctorSchema.index({ departmentId: 1 });
doctorSchema.index({ specialization: 1 });

module.exports = mongoose.model('Doctor', doctorSchema);

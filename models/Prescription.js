const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Medicine name is required'],
    trim: true
  },
  dosage: {
    type: String,
    required: [true, 'Dosage is required'],
    trim: true
  },
  frequency: {
    type: String,
    required: [true, 'Frequency is required'],
    trim: true
  },
  duration: {
    type: String,
    required: [true, 'Duration is required'],
    trim: true
  },
  instructions: {
    type: String,
    trim: true,
    default: ''
  }
}, { _id: false });

const prescriptionSchema = new mongoose.Schema({
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: [true, 'Appointment reference is required']
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: [true, 'Doctor reference is required']
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'Patient reference is required']
  },
  medicines: {
    type: [medicineSchema],
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'At least one medicine is required'
    }
  },
  diagnosis: {
    type: String,
    trim: true,
    default: ''
  },
  notes: {
    type: String,
    maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    default: ''
  },
  issuedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
prescriptionSchema.index({ appointmentId: 1 });
prescriptionSchema.index({ patientId: 1 });
prescriptionSchema.index({ doctorId: 1 });

module.exports = mongoose.model('Prescription', prescriptionSchema);

const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
    unique: true
  },
  dob: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  gender: {
    type: String,
    enum: {
      values: ['Male', 'Female', 'Other'],
      message: 'Gender must be Male, Female, or Other'
    },
    required: [true, 'Gender is required']
  },
  bloodGroup: {
    type: String,
    enum: {
      values: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      message: 'Invalid blood group'
    }
  },
  medicalNotes: {
    type: String,
    maxlength: [2000, 'Medical notes cannot exceed 2000 characters'],
    default: ''
  },
  address: {
    type: String,
    maxlength: [500, 'Address cannot exceed 500 characters']
  },
  emergencyContact: {
    name: { type: String },
    phone: { type: String },
    relationship: { type: String }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Patient', patientSchema);

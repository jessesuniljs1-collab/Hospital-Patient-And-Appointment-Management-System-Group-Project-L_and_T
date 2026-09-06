const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required']
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  type: {
    type: String,
    enum: {
      values: ['appointment_booked', 'appointment_confirmed', 'appointment_cancelled',
               'appointment_completed', 'appointment_reminder', 'prescription_issued',
               'billing_generated', 'general'],
      message: 'Invalid notification type'
    },
    required: [true, 'Notification type is required']
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  scheduledTime: {
    type: Date,
    default: Date.now
  },
  isRead: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['Pending', 'Sent', 'Read'],
    default: 'Pending'
  }
}, {
  timestamps: true
});

// Indexes
notificationSchema.index({ userId: 1 });
notificationSchema.index({ isRead: 1 });
notificationSchema.index({ scheduledTime: 1 });

module.exports = mongoose.model('Notification', notificationSchema);

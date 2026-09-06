const Notification = require('../models/Notification');

/**
 * Notification service — creates notification records for appointment events.
 * In-app notification records for appointments, status updates, and reminders.
 */
const notificationService = {
  /**
   * Create a notification record
   */
  async create({ userId, appointmentId, type, title, message, scheduledTime }) {
    try {
      const notification = await Notification.create({
        userId,
        appointmentId,
        type,
        title,
        message,
        scheduledTime: scheduledTime || new Date(),
        status: 'Pending'
      });
      return notification;
    } catch (error) {
      // Log but don't throw — notifications should not break main flows
      console.error('Failed to create notification:', error.message);
      return null;
    }
  },

  /**
   * Generate notification when appointment is booked
   */
  async onAppointmentBooked(appointment, patientUserId, doctorUserId) {
    const dateStr = new Date(appointment.date).toLocaleDateString();
    const timeStr = `${appointment.slot.startTime} - ${appointment.slot.endTime}`;

    // Notify patient
    await this.create({
      userId: patientUserId,
      appointmentId: appointment._id,
      type: 'appointment_booked',
      title: 'Appointment Booked',
      message: `Your appointment has been booked for ${dateStr} at ${timeStr}.`
    });

    // Notify doctor
    await this.create({
      userId: doctorUserId,
      appointmentId: appointment._id,
      type: 'appointment_booked',
      title: 'New Appointment',
      message: `A new appointment has been scheduled for ${dateStr} at ${timeStr}.`
    });
  },

  /**
   * Generate notification when appointment status changes
   */
  async onStatusChange(appointment, newStatus, patientUserId, doctorUserId) {
    const dateStr = new Date(appointment.date).toLocaleDateString();
    const messages = {
      'Confirmed': `Your appointment on ${dateStr} has been confirmed.`,
      'Completed': `Your appointment on ${dateStr} has been completed.`,
      'Cancelled': `Your appointment on ${dateStr} has been cancelled.`,
      'No-show': `You were marked as no-show for your appointment on ${dateStr}.`
    };

    const titles = {
      'Confirmed': 'Appointment Confirmed',
      'Completed': 'Appointment Completed',
      'Cancelled': 'Appointment Cancelled',
      'No-show': 'Appointment No-show'
    };

    const typeMap = {
      'Confirmed': 'appointment_confirmed',
      'Completed': 'appointment_completed',
      'Cancelled': 'appointment_cancelled',
      'No-show': 'appointment_cancelled'
    };

    // Notify patient
    await this.create({
      userId: patientUserId,
      appointmentId: appointment._id,
      type: typeMap[newStatus],
      title: titles[newStatus],
      message: messages[newStatus]
    });

    // Notify doctor for cancellations
    if (newStatus === 'Cancelled' || newStatus === 'No-show') {
      await this.create({
        userId: doctorUserId,
        appointmentId: appointment._id,
        type: typeMap[newStatus],
        title: titles[newStatus],
        message: `An appointment on ${dateStr} has been ${newStatus.toLowerCase()}.`
      });
    }
  },

  /**
   * Generate appointment reminder (scheduled for a future time)
   */
  async createReminder(appointment, patientUserId, reminderTime) {
    const dateStr = new Date(appointment.date).toLocaleDateString();
    const timeStr = `${appointment.slot.startTime} - ${appointment.slot.endTime}`;

    await this.create({
      userId: patientUserId,
      appointmentId: appointment._id,
      type: 'appointment_reminder',
      title: 'Appointment Reminder',
      message: `Reminder: You have an appointment on ${dateStr} at ${timeStr}.`,
      scheduledTime: reminderTime
    });
  },

  /**
   * Generate notification when prescription is issued
   */
  async onPrescriptionIssued(prescription, patientUserId) {
    await this.create({
      userId: patientUserId,
      appointmentId: prescription.appointmentId,
      type: 'prescription_issued',
      title: 'Prescription Issued',
      message: `A prescription has been issued for your recent appointment. Please check your prescriptions.`
    });
  },

  /**
   * Generate notification when billing is created
   */
  async onBillingGenerated(billing, patientUserId) {
    await this.create({
      userId: patientUserId,
      appointmentId: billing.appointmentId,
      type: 'billing_generated',
      title: 'Bill Generated',
      message: `A bill of ₹${billing.amount} has been generated for your appointment. Payment status: ${billing.paymentStatus}.`
    });
  }
};

module.exports = notificationService;

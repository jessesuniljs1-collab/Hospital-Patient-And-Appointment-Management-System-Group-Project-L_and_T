const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Billing = require('../models/Billing');
const User = require('../models/User');
const notificationService = require('../services/notificationService');
const { AppError } = require('../middleware/errorHandler');

/**
 * Helper: convert "HH:MM" to minutes for comparison
 */
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Valid appointment status transitions
 * Maps: currentStatus -> { newStatus: [allowed roles] }
 */
const VALID_TRANSITIONS = {
  'Booked': {
    'Confirmed': ['Doctor', 'Admin'],
    'Cancelled': ['Patient', 'Doctor', 'Admin']
  },
  'Confirmed': {
    'Completed': ['Doctor', 'Admin'],
    'Cancelled': ['Patient', 'Doctor', 'Admin'],
    'No-show': ['Doctor', 'Admin']
  }
  // Completed, Cancelled, No-show are terminal states — no transitions allowed
};

/**
 * Get the day name from a Date object
 */
const getDayName = (date) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date(date).getDay()];
};

/**
 * POST /api/appointments
 * Book an appointment with conflict detection
 */
const createAppointment = async (req, res, next) => {
  try {
    const { doctorId, date, slot, reason, patientId: bodyPatientId } = req.body;

    // Determine which patient is booking
    let patient;
    if (req.user.role === 'Admin' && bodyPatientId) {
      // Admin booking on behalf of a patient
      patient = await Patient.findById(bodyPatientId);
      if (!patient) {
        throw new AppError('Patient not found.', 404, 'PATIENT_NOT_FOUND');
      }
    } else if (req.user.role === 'Patient') {
      patient = await Patient.findOne({ userId: req.user._id });
      if (!patient) {
        throw new AppError('Patient profile not found. Please complete registration.', 404, 'PATIENT_NOT_FOUND');
      }
    } else if (req.user.role === 'Admin' && !bodyPatientId) {
      throw new AppError('Patient ID is required when admin books on behalf of a patient.', 400, 'VALIDATION_ERROR');
    } else {
      throw new AppError('Only patients and administrators can book appointments.', 403, 'FORBIDDEN');
    }

    // Verify doctor exists and is available
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      throw new AppError('Doctor not found.', 404, 'DOCTOR_NOT_FOUND');
    }
    if (!doctor.isAvailable) {
      throw new AppError('This doctor is currently not available for appointments.', 400, 'DOCTOR_UNAVAILABLE');
    }

    // Validate appointment date is not in the past
    const appointmentDate = new Date(date);
    appointmentDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (appointmentDate < today) {
      throw new AppError('Cannot book an appointment in the past.', 400, 'INVALID_DATE');
    }

    // Validate slot times
    const startMins = timeToMinutes(slot.startTime);
    const endMins = timeToMinutes(slot.endTime);
    if (startMins >= endMins) {
      throw new AppError('Slot start time must be before end time.', 400, 'INVALID_SLOT_TIME');
    }

    // Verify slot falls within doctor's availability for that day of the week
    const dayName = getDayName(appointmentDate);
    const matchingAvailability = doctor.availabilitySlots.find(avail => {
      if (avail.day !== dayName) return false;
      const availStart = timeToMinutes(avail.startTime);
      const availEnd = timeToMinutes(avail.endTime);
      return startMins >= availStart && endMins <= availEnd;
    });

    if (!matchingAvailability) {
      throw new AppError(
        `The selected slot (${slot.startTime}-${slot.endTime}) is not within the doctor's availability on ${dayName}.`,
        400,
        'SLOT_NOT_AVAILABLE'
      );
    }

    // Check for conflicting appointments (double booking detection)
    // Find existing appointments for same doctor on same date that overlap in time
    // and are not in a terminal state
    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const conflictingAppointments = await Appointment.find({
      doctorId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['Booked', 'Confirmed'] }
    });

    const hasConflict = conflictingAppointments.some(existing => {
      const existingStart = timeToMinutes(existing.slot.startTime);
      const existingEnd = timeToMinutes(existing.slot.endTime);
      return startMins < existingEnd && existingStart < endMins;
    });

    if (hasConflict) {
      throw new AppError(
        'This time slot is already booked. Please select a different slot.',
        409,
        'APPOINTMENT_CONFLICT'
      );
    }

    // Also check if this patient already has an active appointment at overlapping time
    const patientConflict = await Appointment.find({
      patientId: patient._id,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['Booked', 'Confirmed'] }
    });

    const hasPatientConflict = patientConflict.some(existing => {
      const existingStart = timeToMinutes(existing.slot.startTime);
      const existingEnd = timeToMinutes(existing.slot.endTime);
      return startMins < existingEnd && existingStart < endMins;
    });

    if (hasPatientConflict) {
      throw new AppError(
        'You already have an appointment at an overlapping time.',
        409,
        'PATIENT_APPOINTMENT_CONFLICT'
      );
    }

    // Create the appointment
    const appointment = await Appointment.create({
      patientId: patient._id,
      doctorId,
      date: appointmentDate,
      slot,
      status: 'Booked',
      reason: reason || ''
    });

    // Get user IDs for notifications
    const patientUser = await User.findById(patient.userId);
    const doctorUser = await User.findById(doctor.userId);

    // Create notifications
    await notificationService.onAppointmentBooked(appointment, patientUser._id, doctorUser._id);

    // Create a reminder for the day before (if appointment is more than 1 day away)
    const reminderTime = new Date(appointmentDate);
    reminderTime.setDate(reminderTime.getDate() - 1);
    reminderTime.setHours(9, 0, 0, 0);
    if (reminderTime > new Date()) {
      await notificationService.createReminder(appointment, patientUser._id, reminderTime);
    }

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate({
        path: 'doctorId',
        populate: [
          { path: 'userId', select: 'name email phone' },
          { path: 'departmentId', select: 'name' }
        ]
      })
      .populate({
        path: 'patientId',
        populate: { path: 'userId', select: 'name email phone' }
      });

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully.',
      data: populatedAppointment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/appointments
 * List appointments with role-based filtering
 */
const getAppointments = async (req, res, next) => {
  try {
    const { status, date, doctorId, patientId, page = 1, limit = 20 } = req.query;
    const filter = {};

    // Role-based filtering
    if (req.user.role === 'Patient') {
      const patient = await Patient.findOne({ userId: req.user._id });
      if (!patient) {
        throw new AppError('Patient profile not found.', 404, 'PATIENT_NOT_FOUND');
      }
      filter.patientId = patient._id;
    } else if (req.user.role === 'Doctor') {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (!doctor) {
        throw new AppError('Doctor profile not found.', 404, 'DOCTOR_NOT_FOUND');
      }
      filter.doctorId = doctor._id;
    }
    // Admin sees all — no patientId/doctorId filter applied unless specified

    // Apply additional filters
    if (status) filter.status = status;
    if (doctorId && req.user.role === 'Admin') filter.doctorId = doctorId;
    if (patientId && req.user.role === 'Admin') filter.patientId = patientId;

    if (date) {
      const d = new Date(date);
      const startOfDay = new Date(d);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(d);
      endOfDay.setHours(23, 59, 59, 999);
      filter.date = { $gte: startOfDay, $lte: endOfDay };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const appointments = await Appointment.find(filter)
      .populate({
        path: 'doctorId',
        populate: [
          { path: 'userId', select: 'name email phone' },
          { path: 'departmentId', select: 'name' }
        ]
      })
      .populate({
        path: 'patientId',
        populate: { path: 'userId', select: 'name email phone' }
      })
      .sort({ date: -1, 'slot.startTime': -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Appointment.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: 'Appointments retrieved successfully.',
      data: {
        appointments,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/appointments/:id
 * Get single appointment details
 */
const getAppointmentById = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate({
        path: 'doctorId',
        populate: [
          { path: 'userId', select: 'name email phone' },
          { path: 'departmentId', select: 'name' }
        ]
      })
      .populate({
        path: 'patientId',
        populate: { path: 'userId', select: 'name email phone' }
      });

    if (!appointment) {
      throw new AppError('Appointment not found.', 404, 'APPOINTMENT_NOT_FOUND');
    }

    // Ownership check
    if (req.user.role === 'Patient') {
      const patient = await Patient.findOne({ userId: req.user._id });
      if (!patient || appointment.patientId._id.toString() !== patient._id.toString()) {
        throw new AppError('Access denied. You can only view your own appointments.', 403, 'OWNERSHIP_VIOLATION');
      }
    } else if (req.user.role === 'Doctor') {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (!doctor || appointment.doctorId._id.toString() !== doctor._id.toString()) {
        throw new AppError('Access denied. You can only view your own appointments.', 403, 'OWNERSHIP_VIOLATION');
      }
    }

    res.status(200).json({
      success: true,
      message: 'Appointment retrieved successfully.',
      data: appointment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/appointments/:id/status
 * Update appointment status with transition validation
 * This is the STATUS TRANSITION ENGINE — the most critical business-rule module
 */
const updateAppointmentStatus = async (req, res, next) => {
  try {
    const { status: newStatus, notes, cancellationReason } = req.body;

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      throw new AppError('Appointment not found.', 404, 'APPOINTMENT_NOT_FOUND');
    }

    const currentStatus = appointment.status;

    // 1. Check if current status has any valid transitions
    const allowedTransitions = VALID_TRANSITIONS[currentStatus];
    if (!allowedTransitions) {
      throw new AppError(
        `Cannot transition from '${currentStatus}'. It is a terminal state.`,
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }

    // 2. Check if the requested transition is valid
    const allowedRoles = allowedTransitions[newStatus];
    if (!allowedRoles) {
      throw new AppError(
        `Invalid status transition: '${currentStatus}' → '${newStatus}'. ` +
        `Allowed transitions from '${currentStatus}': ${Object.keys(allowedTransitions).join(', ')}.`,
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }

    // 3. Check if the user's role is authorized for this transition
    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(
        `Your role (${req.user.role}) is not authorized for the transition '${currentStatus}' → '${newStatus}'.`,
        403,
        'FORBIDDEN'
      );
    }

    // 4. Additional ownership checks
    if (req.user.role === 'Patient') {
      const patient = await Patient.findOne({ userId: req.user._id });
      if (!patient || appointment.patientId.toString() !== patient._id.toString()) {
        throw new AppError('Access denied. You can only modify your own appointments.', 403, 'OWNERSHIP_VIOLATION');
      }
    } else if (req.user.role === 'Doctor') {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (!doctor || appointment.doctorId.toString() !== doctor._id.toString()) {
        throw new AppError('Access denied. You can only modify your own appointments.', 403, 'OWNERSHIP_VIOLATION');
      }
    }

    // 5. Update the appointment
    appointment.status = newStatus;
    if (notes) appointment.notes = notes;

    if (newStatus === 'Cancelled') {
      appointment.cancelledBy = req.user.role;
      appointment.cancellationReason = cancellationReason || '';
    }

    await appointment.save();

    // 6. Side effects based on new status
    // Get user IDs for notifications
    const patient = await Patient.findById(appointment.patientId);
    const doctor = await Doctor.findById(appointment.doctorId);
    const patientUser = await User.findById(patient.userId);
    const doctorUser = await User.findById(doctor.userId);

    // Send notifications
    await notificationService.onStatusChange(appointment, newStatus, patientUser._id, doctorUser._id);

    // Auto-create billing when appointment is completed
    if (newStatus === 'Completed') {
      const existingBilling = await Billing.findOne({ appointmentId: appointment._id });
      if (!existingBilling) {
        const billing = await Billing.create({
          appointmentId: appointment._id,
          patientId: appointment.patientId,
          amount: doctor.consultationFee || 500,
          paymentStatus: 'Pending',
          description: `Consultation fee — Dr. ${patientUser.name ? '' : ''}${(await User.findById(doctor.userId)).name}`
        });
        await notificationService.onBillingGenerated(billing, patientUser._id);
      }
    }

    // Cancel billing if appointment is cancelled
    if (newStatus === 'Cancelled') {
      await Billing.findOneAndUpdate(
        { appointmentId: appointment._id, paymentStatus: 'Pending' },
        { paymentStatus: 'Cancelled' }
      );
    }

    const updatedAppointment = await Appointment.findById(appointment._id)
      .populate({
        path: 'doctorId',
        populate: [
          { path: 'userId', select: 'name email phone' },
          { path: 'departmentId', select: 'name' }
        ]
      })
      .populate({
        path: 'patientId',
        populate: { path: 'userId', select: 'name email phone' }
      });

    res.status(200).json({
      success: true,
      message: `Appointment status updated to '${newStatus}' successfully.`,
      data: updatedAppointment
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createAppointment, getAppointments, getAppointmentById, updateAppointmentStatus };

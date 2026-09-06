const Prescription = require('../models/Prescription');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const User = require('../models/User');
const notificationService = require('../services/notificationService');
const { AppError } = require('../middleware/errorHandler');

/**
 * POST /api/prescriptions
 * Create a prescription (Doctor only, appointment must be Completed)
 */
const createPrescription = async (req, res, next) => {
  try {
    const { appointmentId, medicines, diagnosis, notes } = req.body;

    // Verify appointment exists
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      throw new AppError('Appointment not found.', 404, 'APPOINTMENT_NOT_FOUND');
    }

    // Verify appointment is Completed
    if (appointment.status !== 'Completed') {
      throw new AppError(
        `Cannot issue prescription. Appointment status is '${appointment.status}'. Must be 'Completed'.`,
        400,
        'INVALID_APPOINTMENT_STATUS'
      );
    }

    // Verify the requesting doctor owns this appointment
    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) {
      throw new AppError('Doctor profile not found.', 404, 'DOCTOR_NOT_FOUND');
    }

    if (appointment.doctorId.toString() !== doctor._id.toString()) {
      throw new AppError(
        'Access denied. You can only issue prescriptions for your own appointments.',
        403,
        'OWNERSHIP_VIOLATION'
      );
    }

    // Check if a prescription already exists for this appointment
    const existingPrescription = await Prescription.findOne({ appointmentId });
    if (existingPrescription) {
      throw new AppError(
        'A prescription has already been issued for this appointment.',
        409,
        'DUPLICATE_PRESCRIPTION'
      );
    }

    // Create the prescription
    const prescription = await Prescription.create({
      appointmentId,
      doctorId: doctor._id,
      patientId: appointment.patientId,
      medicines,
      diagnosis,
      notes
    });

    // Notify patient
    const patient = await Patient.findById(appointment.patientId);
    if (patient) {
      await notificationService.onPrescriptionIssued(prescription, patient.userId);
    }

    const populatedPrescription = await Prescription.findById(prescription._id)
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email' }
      })
      .populate({
        path: 'patientId',
        populate: { path: 'userId', select: 'name email' }
      })
      .populate('appointmentId', 'date slot status');

    res.status(201).json({
      success: true,
      message: 'Prescription issued successfully.',
      data: populatedPrescription
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/prescriptions/:id
 * Get a single prescription (Doctor/Patient ownership, Admin)
 */
const getPrescriptionById = async (req, res, next) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email phone' }
      })
      .populate({
        path: 'patientId',
        populate: { path: 'userId', select: 'name email phone' }
      })
      .populate('appointmentId', 'date slot status reason');

    if (!prescription) {
      throw new AppError('Prescription not found.', 404, 'PRESCRIPTION_NOT_FOUND');
    }

    // Ownership checks
    if (req.user.role === 'Patient') {
      const patient = await Patient.findOne({ userId: req.user._id });
      if (!patient || prescription.patientId._id.toString() !== patient._id.toString()) {
        throw new AppError('Access denied. You can only view your own prescriptions.', 403, 'OWNERSHIP_VIOLATION');
      }
    } else if (req.user.role === 'Doctor') {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (!doctor || prescription.doctorId._id.toString() !== doctor._id.toString()) {
        throw new AppError('Access denied. You can only view prescriptions you issued.', 403, 'OWNERSHIP_VIOLATION');
      }
    }

    res.status(200).json({
      success: true,
      message: 'Prescription retrieved successfully.',
      data: prescription
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/prescriptions/appointment/:appointmentId
 * Get prescription for a specific appointment
 */
const getPrescriptionByAppointment = async (req, res, next) => {
  try {
    const prescription = await Prescription.findOne({ appointmentId: req.params.appointmentId })
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email phone' }
      })
      .populate({
        path: 'patientId',
        populate: { path: 'userId', select: 'name email phone' }
      })
      .populate('appointmentId', 'date slot status reason');

    if (!prescription) {
      throw new AppError('No prescription found for this appointment.', 404, 'PRESCRIPTION_NOT_FOUND');
    }

    // Ownership check
    if (req.user.role === 'Patient') {
      const patient = await Patient.findOne({ userId: req.user._id });
      if (!patient || prescription.patientId._id.toString() !== patient._id.toString()) {
        throw new AppError('Access denied.', 403, 'OWNERSHIP_VIOLATION');
      }
    }

    res.status(200).json({
      success: true,
      message: 'Prescription retrieved successfully.',
      data: prescription
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/prescriptions/patient/:patientId
 * Get all prescriptions for a patient
 */
const getPatientPrescriptions = async (req, res, next) => {
  try {
    // Ownership check for Patient role
    if (req.user.role === 'Patient') {
      const patient = await Patient.findOne({ userId: req.user._id });
      if (!patient || patient._id.toString() !== req.params.patientId) {
        throw new AppError('Access denied. You can only view your own prescriptions.', 403, 'OWNERSHIP_VIOLATION');
      }
    }

    const prescriptions = await Prescription.find({ patientId: req.params.patientId })
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email' }
      })
      .populate('appointmentId', 'date slot status reason')
      .sort({ issuedAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Prescriptions retrieved successfully.',
      data: prescriptions
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createPrescription, getPrescriptionById, getPrescriptionByAppointment, getPatientPrescriptions };

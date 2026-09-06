const Billing = require('../models/Billing');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const { AppError } = require('../middleware/errorHandler');

/**
 * POST /api/billing
 * Create a billing record (Admin only, normally auto-created on appointment completion)
 */
const createBilling = async (req, res, next) => {
  try {
    const { appointmentId, amount, description } = req.body;

    // Verify appointment exists
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      throw new AppError('Appointment not found.', 404, 'APPOINTMENT_NOT_FOUND');
    }

    // Check for duplicate billing
    const existingBilling = await Billing.findOne({ appointmentId });
    if (existingBilling) {
      throw new AppError('A billing record already exists for this appointment.', 409, 'DUPLICATE_BILLING');
    }

    const billing = await Billing.create({
      appointmentId,
      patientId: appointment.patientId,
      amount,
      paymentStatus: 'Pending',
      description: description || 'Consultation Fee'
    });

    res.status(201).json({
      success: true,
      message: 'Billing record created successfully.',
      data: billing
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/billing/:id
 * Get billing record details
 */
const getBillingById = async (req, res, next) => {
  try {
    const billing = await Billing.findById(req.params.id)
      .populate({
        path: 'appointmentId',
        populate: {
          path: 'doctorId',
          populate: { path: 'userId', select: 'name' }
        }
      })
      .populate({
        path: 'patientId',
        populate: { path: 'userId', select: 'name email phone' }
      });

    if (!billing) {
      throw new AppError('Billing record not found.', 404, 'BILLING_NOT_FOUND');
    }

    // Ownership check for patients
    if (req.user.role === 'Patient') {
      const patient = await Patient.findOne({ userId: req.user._id });
      if (!patient || billing.patientId._id.toString() !== patient._id.toString()) {
        throw new AppError('Access denied.', 403, 'OWNERSHIP_VIOLATION');
      }
    }

    res.status(200).json({
      success: true,
      message: 'Billing record retrieved successfully.',
      data: billing
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/billing/:id
 * Update billing payment status (Admin only)
 */
const updateBilling = async (req, res, next) => {
  try {
    const { paymentStatus, paymentMethod } = req.body;

    const billing = await Billing.findById(req.params.id);
    if (!billing) {
      throw new AppError('Billing record not found.', 404, 'BILLING_NOT_FOUND');
    }

    billing.paymentStatus = paymentStatus;
    if (paymentMethod) billing.paymentMethod = paymentMethod;
    if (paymentStatus === 'Paid') billing.paidAt = new Date();

    await billing.save();

    res.status(200).json({
      success: true,
      message: 'Billing updated successfully.',
      data: billing
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/billing/patient/:patientId
 * Get all billing records for a patient
 */
const getPatientBilling = async (req, res, next) => {
  try {
    // Ownership check
    if (req.user.role === 'Patient') {
      const patient = await Patient.findOne({ userId: req.user._id });
      if (!patient || patient._id.toString() !== req.params.patientId) {
        throw new AppError('Access denied.', 403, 'OWNERSHIP_VIOLATION');
      }
    }

    const billings = await Billing.find({ patientId: req.params.patientId })
      .populate({
        path: 'appointmentId',
        populate: {
          path: 'doctorId',
          populate: { path: 'userId', select: 'name' }
        }
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Billing records retrieved successfully.',
      data: billings
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createBilling, getBillingById, updateBilling, getPatientBilling };

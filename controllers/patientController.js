const Patient = require('../models/Patient');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const Billing = require('../models/Billing');
const { AppError } = require('../middleware/errorHandler');

/**
 * GET /api/patients/profile
 * Get current patient's own profile
 */
const getMyProfile = async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) {
      throw new AppError('Patient profile not found.', 404, 'PATIENT_NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully.',
      data: {
        user: req.user,
        patient
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/patients/profile
 * Update current patient's profile
 */
const updateMyProfile = async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) {
      throw new AppError('Patient profile not found.', 404, 'PATIENT_NOT_FOUND');
    }

    const { dob, gender, bloodGroup, medicalNotes, address, emergencyContact, name, phone } = req.body;

    // Update patient fields
    if (dob) patient.dob = dob;
    if (gender) patient.gender = gender;
    if (bloodGroup) patient.bloodGroup = bloodGroup;
    if (medicalNotes !== undefined) patient.medicalNotes = medicalNotes;
    if (address !== undefined) patient.address = address;
    if (emergencyContact) patient.emergencyContact = emergencyContact;

    await patient.save();

    // Update user fields if provided
    if (name || phone) {
      const user = await User.findById(req.user._id);
      if (name) user.name = name;
      if (phone) user.phone = phone;
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: patient
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/patients/:id/history
 * Get chronological medical history for a patient
 * Combines appointments, prescriptions, and billing records
 */
const getPatientHistory = async (req, res, next) => {
  try {
    const patientId = req.params.id;

    // Verify patient exists
    const patient = await Patient.findById(patientId).populate('userId', 'name email phone');
    if (!patient) {
      throw new AppError('Patient not found.', 404, 'PATIENT_NOT_FOUND');
    }

    // Ownership check is handled by requirePatientOwnership middleware
    // but double-check for safety
    if (req.user.role === 'Patient') {
      const myPatient = await Patient.findOne({ userId: req.user._id });
      if (!myPatient || myPatient._id.toString() !== patientId) {
        throw new AppError('Access denied. You can only view your own medical history.', 403, 'OWNERSHIP_VIOLATION');
      }
    }

    // Get completed appointments with doctor info
    const appointments = await Appointment.find({
      patientId,
      status: { $in: ['Completed', 'Confirmed', 'Booked'] }
    })
      .populate({
        path: 'doctorId',
        populate: [
          { path: 'userId', select: 'name email' },
          { path: 'departmentId', select: 'name' }
        ]
      })
      .sort({ date: -1 });

    // Get prescriptions
    const prescriptions = await Prescription.find({ patientId })
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email' }
      })
      .populate('appointmentId', 'date slot')
      .sort({ issuedAt: -1 });

    // Get billing records
    const billingRecords = await Billing.find({ patientId })
      .populate('appointmentId', 'date slot status')
      .sort({ createdAt: -1 });

    // Build chronological history
    const history = appointments.map(apt => {
      const aptPrescriptions = prescriptions.filter(
        p => p.appointmentId && p.appointmentId._id.toString() === apt._id.toString()
      );
      const aptBilling = billingRecords.find(
        b => b.appointmentId && b.appointmentId._id.toString() === apt._id.toString()
      );

      return {
        appointment: apt,
        prescriptions: aptPrescriptions,
        billing: aptBilling || null
      };
    });

    res.status(200).json({
      success: true,
      message: 'Medical history retrieved successfully.',
      data: {
        patient: {
          name: patient.userId.name,
          email: patient.userId.email,
          dob: patient.dob,
          gender: patient.gender,
          bloodGroup: patient.bloodGroup
        },
        totalVisits: appointments.length,
        history
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/patients
 * List all patients (Admin only)
 */
const getAllPatients = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const patients = await Patient.find()
      .populate('userId', 'name email phone isActive')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Patient.countDocuments();

    res.status(200).json({
      success: true,
      message: 'Patients retrieved successfully.',
      data: {
        patients,
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

module.exports = { getMyProfile, updateMyProfile, getPatientHistory, getAllPatients };

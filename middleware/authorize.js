const mongoose = require('mongoose');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');

/**
 * Role-based authorization middleware factory
 * Usage: requireRole('Admin', 'Doctor')
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
        errorCode: 'AUTH_REQUIRED'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}.`,
        errorCode: 'FORBIDDEN'
      });
    }

    next();
  };
};

/**
 * Attaches patient profile to req.patient if user is a Patient
 */
const attachPatientProfile = async (req, res, next) => {
  try {
    if (req.user && req.user.role === 'Patient') {
      const patient = await Patient.findOne({ userId: req.user._id });
      if (patient) {
        req.patient = patient;
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Attaches doctor profile to req.doctor if user is a Doctor
 */
const attachDoctorProfile = async (req, res, next) => {
  try {
    if (req.user && req.user.role === 'Doctor') {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (doctor) {
        req.doctor = doctor;
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Ownership check: ensures a Patient can only access their own resources
 * paramName is the route parameter holding the patient ID to check
 */
const requirePatientOwnership = (paramName = 'id') => {
  return async (req, res, next) => {
    try {
      // Admin can access any patient's resources
      if (req.user.role === 'Admin') {
        return next();
      }

      // Doctor can access patient resources within scope
      if (req.user.role === 'Doctor') {
        return next();
      }

      // Patient must own the resource
      if (req.user.role === 'Patient') {
        const patient = await Patient.findOne({ userId: req.user._id });
        if (!patient) {
          return res.status(404).json({
            success: false,
            message: 'Patient profile not found.',
            errorCode: 'PATIENT_NOT_FOUND'
          });
        }

        const targetId = req.params[paramName];

        if (!mongoose.Types.ObjectId.isValid(targetId)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid patient ID format.',
            errorCode: 'INVALID_ID'
          });
        }

        if (patient._id.toString() !== targetId) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You can only access your own records.',
            errorCode: 'OWNERSHIP_VIOLATION'
          });
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { requireRole, attachPatientProfile, attachDoctorProfile, requirePatientOwnership };

const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Department = require('../models/Department');
const { AppError } = require('../middleware/errorHandler');

/**
 * Helper: convert "HH:MM" to minutes since midnight for overlap comparison
 */
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Helper: check if two time ranges overlap
 */
const slotsOverlap = (slot1, slot2) => {
  const s1Start = timeToMinutes(slot1.startTime);
  const s1End = timeToMinutes(slot1.endTime);
  const s2Start = timeToMinutes(slot2.startTime);
  const s2End = timeToMinutes(slot2.endTime);
  return s1Start < s2End && s2Start < s1End;
};

/**
 * POST /api/doctors
 * Create a doctor profile (Admin only) — creates User + Doctor
 */
const createDoctor = async (req, res, next) => {
  try {
    const { name, email, password, phone, specialization, departmentId,
            qualification, experience, consultationFee } = req.body;

    // Check department exists
    const department = await Department.findById(departmentId);
    if (!department) {
      throw new AppError('Department not found.', 404, 'DEPARTMENT_NOT_FOUND');
    }

    // Check duplicate email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('A user with this email already exists.', 409, 'DUPLICATE_EMAIL');
    }

    // Create user with Doctor role
    const user = await User.create({
      name,
      email,
      passwordHash: password,
      role: 'Doctor',
      phone
    });

    // Create doctor profile
    const doctor = await Doctor.create({
      userId: user._id,
      departmentId,
      specialization,
      qualification,
      experience,
      consultationFee: consultationFee || 500
    });

    const populatedDoctor = await Doctor.findById(doctor._id)
      .populate('userId', 'name email phone')
      .populate('departmentId', 'name');

    res.status(201).json({
      success: true,
      message: 'Doctor created successfully.',
      data: populatedDoctor
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/doctors
 * List/search doctors — public, with filters
 */
const getDoctors = async (req, res, next) => {
  try {
    const { specialization, department, available, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (specialization) {
      filter.specialization = { $regex: new RegExp(specialization, 'i') };
    }

    if (available !== undefined) {
      filter.isAvailable = available === 'true';
    }

    // Build query
    let query = Doctor.find(filter)
      .populate('userId', 'name email phone')
      .populate('departmentId', 'name description');

    // If filtering by department name, we need to find matching department IDs first
    if (department) {
      const departments = await Department.find({
        name: { $regex: new RegExp(department, 'i') }
      });
      const deptIds = departments.map(d => d._id);
      filter.departmentId = { $in: deptIds };
      query = Doctor.find(filter)
        .populate('userId', 'name email phone')
        .populate('departmentId', 'name description');
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const doctors = await query.skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 });
    const total = await Doctor.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: 'Doctors retrieved successfully.',
      data: {
        doctors,
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
 * GET /api/doctors/:id
 * Get a single doctor's public profile
 */
const getDoctorById = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .populate('userId', 'name email phone')
      .populate('departmentId', 'name description');

    if (!doctor) {
      throw new AppError('Doctor not found.', 404, 'DOCTOR_NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      message: 'Doctor retrieved successfully.',
      data: doctor
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/doctors/:id
 * Update doctor profile (Admin or the doctor themselves)
 */
const updateDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      throw new AppError('Doctor not found.', 404, 'DOCTOR_NOT_FOUND');
    }

    // Authorization: Admin or the doctor themselves
    if (req.user.role !== 'Admin' && doctor.userId.toString() !== req.user._id.toString()) {
      throw new AppError('Access denied. You can only update your own profile.', 403, 'FORBIDDEN');
    }

    const { specialization, departmentId, qualification, experience, consultationFee, isAvailable } = req.body;

    if (departmentId) {
      const department = await Department.findById(departmentId);
      if (!department) {
        throw new AppError('Department not found.', 404, 'DEPARTMENT_NOT_FOUND');
      }
      doctor.departmentId = departmentId;
    }

    if (specialization) doctor.specialization = specialization;
    if (qualification !== undefined) doctor.qualification = qualification;
    if (experience !== undefined) doctor.experience = experience;
    if (consultationFee !== undefined) doctor.consultationFee = consultationFee;
    if (isAvailable !== undefined) doctor.isAvailable = isAvailable;

    await doctor.save();

    const updatedDoctor = await Doctor.findById(doctor._id)
      .populate('userId', 'name email phone')
      .populate('departmentId', 'name');

    res.status(200).json({
      success: true,
      message: 'Doctor updated successfully.',
      data: updatedDoctor
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/doctors/:id/slots
 * Manage doctor availability slots
 * Validates: no overlapping slots on the same day, startTime < endTime
 */
const updateAvailability = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      throw new AppError('Doctor not found.', 404, 'DOCTOR_NOT_FOUND');
    }

    // Authorization: only the doctor or Admin
    if (req.user.role !== 'Admin' && doctor.userId.toString() !== req.user._id.toString()) {
      throw new AppError('Access denied. You can only update your own availability.', 403, 'FORBIDDEN');
    }

    const { availabilitySlots } = req.body;

    // Validate each slot: startTime must be before endTime
    for (const slot of availabilitySlots) {
      if (timeToMinutes(slot.startTime) >= timeToMinutes(slot.endTime)) {
        throw new AppError(
          `Invalid slot: start time (${slot.startTime}) must be before end time (${slot.endTime}).`,
          400,
          'INVALID_SLOT_TIME'
        );
      }
    }

    // Check for overlapping slots on the same day
    const slotsByDay = {};
    for (const slot of availabilitySlots) {
      if (!slotsByDay[slot.day]) {
        slotsByDay[slot.day] = [];
      }
      slotsByDay[slot.day].push(slot);
    }

    for (const [day, slots] of Object.entries(slotsByDay)) {
      for (let i = 0; i < slots.length; i++) {
        for (let j = i + 1; j < slots.length; j++) {
          if (slotsOverlap(slots[i], slots[j])) {
            throw new AppError(
              `Overlapping availability slots on ${day}: ${slots[i].startTime}-${slots[i].endTime} conflicts with ${slots[j].startTime}-${slots[j].endTime}.`,
              409,
              'OVERLAPPING_SLOTS'
            );
          }
        }
      }
    }

    // Replace all availability slots
    doctor.availabilitySlots = availabilitySlots;
    await doctor.save();

    const updatedDoctor = await Doctor.findById(doctor._id)
      .populate('userId', 'name email phone')
      .populate('departmentId', 'name');

    res.status(200).json({
      success: true,
      message: 'Availability updated successfully.',
      data: updatedDoctor
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/doctors/:id
 * Deactivate a doctor (Admin only)
 */
const deleteDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      throw new AppError('Doctor not found.', 404, 'DOCTOR_NOT_FOUND');
    }

    doctor.isAvailable = false;
    await doctor.save();

    // Also deactivate the user account
    await User.findByIdAndUpdate(doctor.userId, { isActive: false });

    res.status(200).json({
      success: true,
      message: 'Doctor deactivated successfully.',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createDoctor, getDoctors, getDoctorById, updateDoctor, updateAvailability, deleteDoctor };

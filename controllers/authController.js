const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Department = require('../models/Department');
const { jwtSecret, jwtExpiresIn } = require('../config/env');
const { AppError } = require('../middleware/errorHandler');

/**
 * Generate JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, role: user.role },
    jwtSecret,
    { expiresIn: jwtExpiresIn }
  );
};

/**
 * POST /api/auth/register
 * Register a new user (Patient by default, Doctor/Admin by admin)
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role,
            dob, gender, bloodGroup, medicalNotes, address, emergencyContact,
            specialization, departmentId, qualification, experience, consultationFee } = req.body;

    // Check for duplicate email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('A user with this email already exists.', 409, 'DUPLICATE_EMAIL');
    }

    // Default role is Patient; Doctor/Admin creation requires an existing Admin
    const userRole = role || 'Patient';

    // Only Admin can create Doctor or Admin accounts
    if ((userRole === 'Doctor' || userRole === 'Admin') && 
        (!req.user || req.user.role !== 'Admin')) {
      // Allow first-ever admin creation if no users exist
      const userCount = await User.countDocuments();
      if (userCount > 0) {
        throw new AppError('Only administrators can create Doctor or Admin accounts.', 403, 'FORBIDDEN');
      }
    }

    // Create user
    const user = await User.create({
      name,
      email,
      passwordHash: password, // pre-save hook will hash it
      role: userRole,
      phone
    });

    // Create role-specific profile
    if (userRole === 'Patient') {
      await Patient.create({
        userId: user._id,
        dob,
        gender,
        bloodGroup,
        medicalNotes: medicalNotes || '',
        address,
        emergencyContact
      });
    } else if (userRole === 'Doctor') {
      // Validate department exists
      const department = await Department.findById(departmentId);
      if (!department) {
        // Clean up user if department invalid
        await User.findByIdAndDelete(user._id);
        throw new AppError('Department not found.', 404, 'DEPARTMENT_NOT_FOUND');
      }

      await Doctor.create({
        userId: user._id,
        departmentId,
        specialization,
        qualification,
        experience,
        consultationFee: consultationFee || 500
      });
    }

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: `${userRole} registered successfully.`,
      data: {
        user: user.toJSON(),
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 * Login with email and password
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user including passwordHash for comparison
    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError('Invalid email or password.', 401, 'AUTH_INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new AppError('Account has been deactivated. Contact administration.', 401, 'AUTH_ACCOUNT_INACTIVE');
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401, 'AUTH_INVALID_CREDENTIALS');
    }

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        user: user.toJSON(),
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Get current authenticated user's profile
 */
const getMe = async (req, res, next) => {
  try {
    const user = req.user;
    let profile = null;

    if (user.role === 'Patient') {
      profile = await Patient.findOne({ userId: user._id });
    } else if (user.role === 'Doctor') {
      profile = await Doctor.findOne({ userId: user._id }).populate('departmentId', 'name description');
    }

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully.',
      data: {
        user,
        profile
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe };

const express = require('express');
const router = express.Router();
const { getMyProfile, updateMyProfile, getPatientHistory, getAllPatients } = require('../controllers/patientController');
const { updatePatientValidator } = require('../validators/patientValidator');
const { validate } = require('../middleware/validate');
const { authenticateJWT } = require('../middleware/auth');
const { requireRole, requirePatientOwnership } = require('../middleware/authorize');

// GET /api/patients/profile — Get own profile (Patient)
router.get('/profile', authenticateJWT, requireRole('Patient'), getMyProfile);

// PUT /api/patients/profile — Update own profile (Patient)
router.put('/profile', authenticateJWT, requireRole('Patient'), updatePatientValidator, validate, updateMyProfile);

// GET /api/patients — List all patients (Admin only)
router.get('/', authenticateJWT, requireRole('Admin'), getAllPatients);

// GET /api/patients/:id/history — Get medical history (ownership enforced)
router.get('/:id/history', authenticateJWT, requirePatientOwnership('id'), getPatientHistory);

module.exports = router;

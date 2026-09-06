const express = require('express');
const router = express.Router();
const { createDoctor, getDoctors, getDoctorById, updateDoctor, updateAvailability, deleteDoctor } = require('../controllers/doctorController');
const { createDoctorValidator, updateDoctorValidator, updateAvailabilityValidator, doctorSearchValidator } = require('../validators/doctorValidator');
const { validate } = require('../middleware/validate');
const { authenticateJWT } = require('../middleware/auth');
const { requireRole } = require('../middleware/authorize');

// GET /api/doctors — List/search doctors (public)
router.get('/', doctorSearchValidator, validate, getDoctors);

// GET /api/doctors/:id — Get doctor by ID (public)
router.get('/:id', getDoctorById);

// POST /api/doctors — Create doctor (Admin only)
router.post('/', authenticateJWT, requireRole('Admin'), createDoctorValidator, validate, createDoctor);

// PUT /api/doctors/:id — Update doctor profile (Admin or self)
router.put('/:id', authenticateJWT, requireRole('Admin', 'Doctor'), updateDoctorValidator, validate, updateDoctor);

// PUT /api/doctors/:id/slots — Update availability (Doctor self or Admin)
router.put('/:id/slots', authenticateJWT, requireRole('Admin', 'Doctor'), updateAvailabilityValidator, validate, updateAvailability);

// DELETE /api/doctors/:id — Deactivate doctor (Admin only)
router.delete('/:id', authenticateJWT, requireRole('Admin'), deleteDoctor);

module.exports = router;

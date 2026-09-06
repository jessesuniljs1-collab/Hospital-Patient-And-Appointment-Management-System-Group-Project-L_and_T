const express = require('express');
const router = express.Router();
const { createPrescription, getPrescriptionById, getPrescriptionByAppointment, getPatientPrescriptions } = require('../controllers/prescriptionController');
const { createPrescriptionValidator } = require('../validators/prescriptionValidator');
const { validate } = require('../middleware/validate');
const { authenticateJWT } = require('../middleware/auth');
const { requireRole } = require('../middleware/authorize');

// POST /api/prescriptions — Issue a prescription (Doctor only)
router.post('/', authenticateJWT, requireRole('Doctor'), createPrescriptionValidator, validate, createPrescription);

// GET /api/prescriptions/:id — Get prescription by ID
router.get('/:id', authenticateJWT, getPrescriptionById);

// GET /api/prescriptions/appointment/:appointmentId — Get prescription for an appointment
router.get('/appointment/:appointmentId', authenticateJWT, getPrescriptionByAppointment);

// GET /api/prescriptions/patient/:patientId — Get all prescriptions for a patient
router.get('/patient/:patientId', authenticateJWT, getPatientPrescriptions);

module.exports = router;

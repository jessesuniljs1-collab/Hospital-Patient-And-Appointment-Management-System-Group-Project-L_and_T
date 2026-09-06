const express = require('express');
const router = express.Router();
const { createAppointment, getAppointments, getAppointmentById, updateAppointmentStatus } = require('../controllers/appointmentController');
const { createAppointmentValidator, updateStatusValidator, appointmentQueryValidator } = require('../validators/appointmentValidator');
const { validate } = require('../middleware/validate');
const { authenticateJWT } = require('../middleware/auth');
const { requireRole } = require('../middleware/authorize');

// POST /api/appointments — Book an appointment (Patient or Admin)
router.post('/', authenticateJWT, requireRole('Patient', 'Admin'), createAppointmentValidator, validate, createAppointment);

// GET /api/appointments — List appointments (role-filtered)
router.get('/', authenticateJWT, appointmentQueryValidator, validate, getAppointments);

// GET /api/appointments/:id — Get appointment details
router.get('/:id', authenticateJWT, getAppointmentById);

// PUT /api/appointments/:id/status — Update appointment status (transition engine)
router.put('/:id/status', authenticateJWT, updateStatusValidator, validate, updateAppointmentStatus);

module.exports = router;

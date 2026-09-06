const express = require('express');
const router = express.Router();
const { getAppointmentReports, getDepartmentLoadReport, getDoctorUtilizationReport } = require('../controllers/reportController');
const { authenticateJWT } = require('../middleware/auth');
const { requireRole } = require('../middleware/authorize');

// All report routes are Admin only
router.use(authenticateJWT, requireRole('Admin'));

// GET /api/admin/reports/appointments — Appointment statistics
router.get('/appointments', getAppointmentReports);

// GET /api/admin/reports/departments — Department load
router.get('/departments', getDepartmentLoadReport);

// GET /api/admin/reports/doctors — Doctor utilization
router.get('/doctors', getDoctorUtilizationReport);

module.exports = router;

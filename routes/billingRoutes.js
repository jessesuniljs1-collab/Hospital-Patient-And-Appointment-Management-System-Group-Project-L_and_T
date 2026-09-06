const express = require('express');
const router = express.Router();
const { createBilling, getBillingById, updateBilling, getPatientBilling } = require('../controllers/billingController');
const { createBillingValidator, updateBillingValidator } = require('../validators/billingValidator');
const { validate } = require('../middleware/validate');
const { authenticateJWT } = require('../middleware/auth');
const { requireRole } = require('../middleware/authorize');

// POST /api/billing — Create billing (Admin only, normally auto-created)
router.post('/', authenticateJWT, requireRole('Admin'), createBillingValidator, validate, createBilling);

// GET /api/billing/:id — Get billing record
router.get('/:id', authenticateJWT, getBillingById);

// PUT /api/billing/:id — Update billing status (Admin only)
router.put('/:id', authenticateJWT, requireRole('Admin'), updateBillingValidator, validate, updateBilling);

// GET /api/billing/patient/:patientId — Get patient's billing records
router.get('/patient/:patientId', authenticateJWT, getPatientBilling);

module.exports = router;

const express = require('express');
const router = express.Router();
const { createDepartment, getDepartments, getDepartmentById, updateDepartment, deleteDepartment } = require('../controllers/departmentController');
const { createDepartmentValidator, updateDepartmentValidator } = require('../validators/departmentValidator');
const { validate } = require('../middleware/validate');
const { authenticateJWT } = require('../middleware/auth');
const { requireRole } = require('../middleware/authorize');

// GET /api/departments — List all departments (public)
router.get('/', getDepartments);

// GET /api/departments/:id — Get department by ID (public)
router.get('/:id', getDepartmentById);

// POST /api/departments — Create department (Admin only)
router.post('/', authenticateJWT, requireRole('Admin'), createDepartmentValidator, validate, createDepartment);

// PUT /api/departments/:id — Update department (Admin only)
router.put('/:id', authenticateJWT, requireRole('Admin'), updateDepartmentValidator, validate, updateDepartment);

// DELETE /api/departments/:id — Delete department (Admin only)
router.delete('/:id', authenticateJWT, requireRole('Admin'), deleteDepartment);

module.exports = router;

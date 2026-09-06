const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { registerValidator, loginValidator } = require('../validators/authValidator');
const { validate } = require('../middleware/validate');
const { authenticateJWT } = require('../middleware/auth');

// POST /api/auth/register — Register a new user (Patient by default)
router.post('/register', registerValidator, validate, register);

// POST /api/auth/login — Login
router.post('/login', loginValidator, validate, login);

// GET /api/auth/me — Get current user profile (protected)
router.get('/me', authenticateJWT, getMe);

module.exports = router;

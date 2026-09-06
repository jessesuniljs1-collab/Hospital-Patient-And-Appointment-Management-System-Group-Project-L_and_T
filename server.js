const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const connectDB = require('./config/db');
const { port, nodeEnv } = require('./config/env');
const { errorHandler } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');
const patientRoutes = require('./routes/patientRoutes');
const billingRoutes = require('./routes/billingRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

// Connect to MongoDB and auto-seed if empty
connectDB().then(async () => {
  try {
    const User = require('./models/User');
    const count = await User.countDocuments();
    if (count === 0) {
      console.log('🌱 Database is empty. Auto-seeding initial demo data...');
      const seedData = require('./seed/seedHelper');
      await seedData();
    }
  } catch (err) {
    console.error('Auto-seed check error:', err.message);
  }
});

// Core middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// Serve static files for optional frontend
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin/reports', reportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Hospital Management System API is running.',
    data: {
      environment: nodeEnv,
      timestamp: new Date().toISOString()
    }
  });
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    errorCode: 'ROUTE_NOT_FOUND'
  });
});

// Serve frontend for non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Centralized error handler (must be last middleware)
app.use(errorHandler);

// Start server
const PORT = port;
const server = app.listen(PORT, () => {
  console.log(`\n🏥 Hospital Management System API`);
  console.log(`   Environment: ${nodeEnv}`);
  console.log(`   Server running on port ${PORT}`);
  console.log(`   API Base URL: http://localhost:${PORT}/api`);
  console.log(`   Health Check: http://localhost:${PORT}/api/health\n`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err.message);
  server.close(() => process.exit(1));
});

module.exports = app;

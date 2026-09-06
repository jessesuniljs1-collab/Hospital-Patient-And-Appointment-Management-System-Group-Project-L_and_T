const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Import app without listening
let app;
let mongoServer;

// Shared test data and tokens
let adminToken, doctorToken, doctor2Token, patient1Token, patient2Token;
let departmentId, doctorId, patient1Id, patient2Id, appointmentId, completedApptId;

jest.setTimeout(300000);

beforeAll(async () => {
  // Spin up an in-memory MongoDB instance for fast, isolated, reliable integration testing
  mongoServer = await MongoMemoryServer.create({
    instance: {
      dbName: 'hospital_test'
    }
  });
  const uri = mongoServer.getUri();

  // Disconnect any existing connection and connect to in-memory instance
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(uri);

  // Set test environment variables
  process.env.JWT_SECRET = 'test_jwt_secret_key_12345';
  process.env.JWT_EXPIRES_IN = '1d';
  process.env.NODE_ENV = 'test';

  // Require express app (without server.listen)
  // We recreate the app setup using express routes
  const express = require('express');
  const cors = require('cors');
  const authRoutes = require('../routes/authRoutes');
  const departmentRoutes = require('../routes/departmentRoutes');
  const doctorRoutes = require('../routes/doctorRoutes');
  const appointmentRoutes = require('../routes/appointmentRoutes');
  const prescriptionRoutes = require('../routes/prescriptionRoutes');
  const patientRoutes = require('../routes/patientRoutes');
  const billingRoutes = require('../routes/billingRoutes');
  const notificationRoutes = require('../routes/notificationRoutes');
  const reportRoutes = require('../routes/reportRoutes');
  const { errorHandler } = require('../middleware/errorHandler');

  app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/departments', departmentRoutes);
  app.use('/api/doctors', doctorRoutes);
  app.use('/api/appointments', appointmentRoutes);
  app.use('/api/prescriptions', prescriptionRoutes);
  app.use('/api/patients', patientRoutes);
  app.use('/api/billing', billingRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/admin/reports', reportRoutes);
  app.use(errorHandler);
}, 300000);

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
}, 30000);

describe('1. Authentication & User Registration (Module 1)', () => {
  it('should register an initial Admin user successfully (201)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'System Administrator',
        email: 'admin@hospital.com',
        password: 'AdminPassword@123',
        role: 'Admin',
        phone: '+91 9876543210'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('Admin');
    expect(res.body.data.user.passwordHash).toBeUndefined(); // sensitive field excluded
    adminToken = res.body.data.token;
  });

  it('should reject registration with duplicate email (409)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Duplicate Admin',
        email: 'admin@hospital.com',
        password: 'AdminPassword@123',
        role: 'Admin'
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('DUPLICATE_EMAIL');
  });

  it('should register Patient 1 successfully with medical profile (201)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'John Doe',
        email: 'patient1@example.com',
        password: 'PatientPassword@123',
        phone: '+91 9876543221',
        dob: '1990-05-15',
        gender: 'Male',
        bloodGroup: 'O+',
        medicalNotes: 'Mild hypertension'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('Patient');
    patient1Token = res.body.data.token;
  });

  it('should register Patient 2 successfully (201)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Sarah Smith',
        email: 'patient2@example.com',
        password: 'PatientPassword@123',
        phone: '+91 9876543222',
        dob: '1995-11-20',
        gender: 'Female',
        bloodGroup: 'B+'
      });

    expect(res.status).toBe(201);
    patient2Token = res.body.data.token;
  });

  it('should reject registration on invalid input (400 VALIDATION_ERROR)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'J', // too short
        email: 'invalid-email',
        password: '123' // no uppercase, too short
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('should login successfully with valid credentials (200)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@hospital.com',
        password: 'AdminPassword@123'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  it('should reject login with wrong password (401)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@hospital.com',
        password: 'WrongPassword@999'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject request when token is missing on protected route (401)', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.errorCode).toBe('AUTH_TOKEN_MISSING');
  });
});

describe('2. Departments & Specialization Directory (Module 2 & 8)', () => {
  it('should create a department as Admin (201)', async () => {
    const res = await request(app)
      .post('/api/departments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Cardiology',
        description: 'Comprehensive cardiovascular care'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Cardiology');
    departmentId = res.body.data._id;
  });

  it('should create Neurology department as Admin (201)', async () => {
    const res = await request(app)
      .post('/api/departments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Neurology',
        description: 'Brain and nerve disorders'
      });

    expect(res.status).toBe(201);
  });

  it('should reject department creation from Patient (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/departments')
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({
        name: 'Unauthorized Department',
        description: 'Should fail'
      });

    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('FORBIDDEN');
  });

  it('should list departments publicly without authentication (200)', async () => {
    const res = await request(app).get('/api/departments');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });
});

describe('3. Doctor Profiles & Availability Slots (Module 2, 3 & 11)', () => {
  it('should create Doctor 1 as Admin (201)', async () => {
    const res = await request(app)
      .post('/api/doctors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Dr. Rajesh Sharma',
        email: 'dr.sharma@hospital.com',
        password: 'DoctorPassword@123',
        phone: '+91 9876543211',
        departmentId: departmentId,
        specialization: 'Cardiology',
        qualification: 'MBBS, MD',
        experience: 12,
        consultationFee: 800
      });

    expect(res.status).toBe(201);
    expect(res.body.data.specialization).toBe('Cardiology');
    doctorId = res.body.data._id;

    // Login as doctor to get token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'dr.sharma@hospital.com',
        password: 'DoctorPassword@123'
      });
    doctorToken = loginRes.body.data.token;
  });

  it('should update doctor availability slots successfully (200)', async () => {
    const res = await request(app)
      .put(`/api/doctors/${doctorId}/slots`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        availabilitySlots: [
          { day: 'Monday', startTime: '09:00', endTime: '13:00' },
          { day: 'Monday', startTime: '14:00', endTime: '18:00' },
          { day: 'Wednesday', startTime: '09:00', endTime: '13:00' }
        ]
      });

    expect(res.status).toBe(200);
    expect(res.body.data.availabilitySlots.length).toBe(3);
  });

  it('should REJECT overlapping availability slots on the same day (409 OVERLAPPING_SLOTS)', async () => {
    const res = await request(app)
      .put(`/api/doctors/${doctorId}/slots`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        availabilitySlots: [
          { day: 'Monday', startTime: '09:00', endTime: '12:00' },
          { day: 'Monday', startTime: '11:00', endTime: '14:00' } // overlaps 11:00-12:00
        ]
      });

    expect(res.status).toBe(409);
    expect(res.body.errorCode).toBe('OVERLAPPING_SLOTS');
  });

  it('should REJECT invalid slot times where start >= end (400 INVALID_SLOT_TIME)', async () => {
    const res = await request(app)
      .put(`/api/doctors/${doctorId}/slots`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        availabilitySlots: [
          { day: 'Monday', startTime: '14:00', endTime: '10:00' }
        ]
      });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('INVALID_SLOT_TIME');
  });

  it('should search doctors by specialization (public 200)', async () => {
    const res = await request(app).get('/api/doctors?specialization=Cardiology');
    expect(res.status).toBe(200);
    expect(res.body.data.doctors.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.doctors[0].specialization).toBe('Cardiology');
  });
});

describe('4. Appointment Booking & Conflict Detection (Module 4)', () => {
  // Find a future Monday for booking
  const getNextDayOfWeek = (dayName) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDay = days.indexOf(dayName);
    const date = new Date();
    date.setDate(date.getDate() + ((targetDay + 7 - date.getDay()) % 7 || 7));
    return date.toISOString().split('T')[0];
  };

  it('should book an appointment within doctor availability (201)', async () => {
    const futureMonday = getNextDayOfWeek('Monday');

    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({
        doctorId,
        date: futureMonday,
        slot: { startTime: '09:30', endTime: '10:00' },
        reason: 'Regular heart checkup'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('Booked');
    appointmentId = res.body.data._id;
  });

  it('should REJECT double booking for overlapping slot with same doctor (409 APPOINTMENT_CONFLICT)', async () => {
    const futureMonday = getNextDayOfWeek('Monday');

    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patient2Token}`)
      .send({
        doctorId,
        date: futureMonday,
        slot: { startTime: '09:45', endTime: '10:15' }, // Overlaps 09:30-10:00
        reason: 'Attempting conflicting booking'
      });

    expect(res.status).toBe(409);
    expect(res.body.errorCode).toBe('APPOINTMENT_CONFLICT');
  });

  it('should REJECT booking outside doctor availability (400 SLOT_NOT_AVAILABLE)', async () => {
    const futureMonday = getNextDayOfWeek('Monday');

    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({
        doctorId,
        date: futureMonday,
        slot: { startTime: '03:00', endTime: '03:30' }, // Doctor is not available at 3 AM
        reason: 'Night visit'
      });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('SLOT_NOT_AVAILABLE');
  });

  it('should REJECT booking on past date (400 INVALID_DATE)', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({
        doctorId,
        date: '2020-01-01',
        slot: { startTime: '10:00', endTime: '10:30' },
        reason: 'Past booking'
      });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('INVALID_DATE');
  });
});

describe('5. Appointment Status Workflow (Module 5)', () => {
  it('should transition Booked → Confirmed by Doctor (200)', async () => {
    const res = await request(app)
      .put(`/api/appointments/${appointmentId}/status`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        status: 'Confirmed',
        notes: 'Confirmed by Dr. Sharma'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Confirmed');
  });

  it('should transition Confirmed → Completed by Doctor (200)', async () => {
    const res = await request(app)
      .put(`/api/appointments/${appointmentId}/status`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        status: 'Completed',
        notes: 'Visit completed successfully'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Completed');
    completedApptId = appointmentId;
  });

  it('should REJECT invalid transition Completed → Booked (400 INVALID_STATUS_TRANSITION)', async () => {
    const res = await request(app)
      .put(`/api/appointments/${completedApptId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'Booked'
      });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('INVALID_STATUS_TRANSITION');
  });

  it('should REJECT invalid transition Completed → Confirmed (400)', async () => {
    const res = await request(app)
      .put(`/api/appointments/${completedApptId}/status`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        status: 'Confirmed'
      });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('INVALID_STATUS_TRANSITION');
  });
});

describe('6. Digital Prescription Module (Module 6)', () => {
  it('should create prescription for Completed appointment (Doctor only 201)', async () => {
    const res = await request(app)
      .post('/api/prescriptions')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        appointmentId: completedApptId,
        medicines: [
          {
            name: 'Amlodipine',
            dosage: '5mg',
            frequency: 'Once daily',
            duration: '30 days',
            instructions: 'Morning with water'
          }
        ],
        diagnosis: 'Hypertension Stage 1',
        notes: 'Maintain low salt diet'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.medicines.length).toBe(1);
  });

  it('should REJECT prescription creation by Patient (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/prescriptions')
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({
        appointmentId: completedApptId,
        medicines: [
          { name: 'Dummy', dosage: '10mg', frequency: 'Daily', duration: '5 days' }
        ]
      });

    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('FORBIDDEN');
  });

  it('should REJECT duplicate prescription for the same appointment (409 DUPLICATE_PRESCRIPTION)', async () => {
    const res = await request(app)
      .post('/api/prescriptions')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        appointmentId: completedApptId,
        medicines: [
          { name: 'Aspirin', dosage: '75mg', frequency: 'Daily', duration: '10 days' }
        ]
      });

    expect(res.status).toBe(409);
    expect(res.body.errorCode).toBe('DUPLICATE_PRESCRIPTION');
  });
});

describe('7. Patient Medical History & Ownership Protection (Module 7 & 13)', () => {
  it('should allow Patient to retrieve their own profile and ID (200)', async () => {
    const res = await request(app)
      .get('/api/patients/profile')
      .set('Authorization', `Bearer ${patient1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.patient).toBeDefined();
    patient1Id = res.body.data.patient._id;
  });

  it('should allow Patient to view their own medical history (200)', async () => {
    const res = await request(app)
      .get(`/api/patients/${patient1Id}/history`)
      .set('Authorization', `Bearer ${patient1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.history).toBeDefined();
    expect(Array.isArray(res.body.data.history)).toBe(true);
  });

  it('should REJECT Patient 2 trying to access Patient 1 history (403 OWNERSHIP_VIOLATION)', async () => {
    const res = await request(app)
      .get(`/api/patients/${patient1Id}/history`)
      .set('Authorization', `Bearer ${patient2Token}`);

    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('OWNERSHIP_VIOLATION');
  });
});

describe('8. Billing & Consultation Payments (Module 10)', () => {
  it('should have auto-created billing on appointment completion', async () => {
    const res = await request(app)
      .get(`/api/billing/patient/${patient1Id}`)
      .set('Authorization', `Bearer ${patient1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].paymentStatus).toBe('Pending');
  });

  it('should allow Admin to update billing payment status to Paid (200)', async () => {
    const listRes = await request(app)
      .get(`/api/billing/patient/${patient1Id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    const billingId = listRes.body.data[0]._id;

    const res = await request(app)
      .put(`/api/billing/${billingId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        paymentStatus: 'Paid',
        paymentMethod: 'Card'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.paymentStatus).toBe('Paid');
  });

  it('should REJECT Patient updating billing status (403 Forbidden)', async () => {
    const listRes = await request(app)
      .get(`/api/billing/patient/${patient1Id}`)
      .set('Authorization', `Bearer ${patient1Token}`);

    const billingId = listRes.body.data[0]._id;

    const res = await request(app)
      .put(`/api/billing/${billingId}`)
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({
        paymentStatus: 'Paid'
      });

    expect(res.status).toBe(403);
  });
});

describe('9. Notifications & Reminders (Module 9)', () => {
  it('should retrieve notifications for patient (200)', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${patient1Token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.notifications)).toBe(true);
    expect(res.body.data.notifications.length).toBeGreaterThanOrEqual(1);
  });

  it('should mark all notifications as read (200)', async () => {
    const res = await request(app)
      .put('/api/notifications/read-all')
      .set('Authorization', `Bearer ${patient1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('10. Admin Reports with Aggregation (Module 12)', () => {
  it('should generate appointment statistics report for Admin (200)', async () => {
    const res = await request(app)
      .get('/api/admin/reports/appointments?period=daily&days=30')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.totalAppointments).toBeGreaterThanOrEqual(1);
  });

  it('should generate department load report for Admin (200)', async () => {
    const res = await request(app)
      .get('/api/admin/reports/departments?days=30')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should generate doctor utilization report for Admin (200)', async () => {
    const res = await request(app)
      .get('/api/admin/reports/doctors?days=30')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should REJECT doctor or patient accessing admin reports (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/admin/reports/appointments')
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('FORBIDDEN');
  });
});

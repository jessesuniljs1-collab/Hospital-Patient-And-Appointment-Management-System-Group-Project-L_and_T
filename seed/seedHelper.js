const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Department = require('../models/Department');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const Billing = require('../models/Billing');
const Notification = require('../models/Notification');

const seedData = async () => {
  try {
    console.log('🧹 Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Patient.deleteMany({}),
      Doctor.deleteMany({}),
      Department.deleteMany({}),
      Appointment.deleteMany({}),
      Prescription.deleteMany({}),
      Billing.deleteMany({}),
      Notification.deleteMany({})
    ]);

    console.log('🏥 Seeding Departments...');
    const departments = await Department.create([
      {
        name: 'Cardiology',
        description: 'Comprehensive cardiovascular care, diagnostic tests, and heart health management.'
      },
      {
        name: 'Neurology',
        description: 'Advanced diagnosis and treatment for brain, spinal cord, and nerve disorders.'
      },
      {
        name: 'Orthopedics',
        description: 'Treatment of musculoskeletal conditions, bone fractures, and joint care.'
      },
      {
        name: 'Pediatrics',
        description: 'Specialized healthcare and developmental tracking for infants, children, and adolescents.'
      },
      {
        name: 'General Medicine',
        description: 'Primary healthcare, adult illness diagnosis, preventive care, and health screenings.'
      }
    ]);

    const deptMap = {};
    departments.forEach(dept => {
      deptMap[dept.name] = dept._id;
    });

    console.log('👤 Seeding Users & Roles...');
    // 1. Admin / Receptionist
    const adminUser = await User.create({
      name: 'System Admin',
      email: 'admin@hospital.com',
      passwordHash: 'Admin@123',
      role: 'Admin',
      phone: '+91 9876543210'
    });

    // 2. Doctor: Dr. Sharma (Cardiology)
    const doctor1User = await User.create({
      name: 'Dr. Rajesh Sharma',
      email: 'dr.sharma@hospital.com',
      passwordHash: 'Doctor@123',
      role: 'Doctor',
      phone: '+91 9876543211'
    });

    const doctor1 = await Doctor.create({
      userId: doctor1User._id,
      departmentId: deptMap['Cardiology'],
      specialization: 'Cardiology',
      qualification: 'MBBS, MD, DM (Cardiology)',
      experience: 12,
      consultationFee: 800,
      availabilitySlots: [
        { day: 'Monday', startTime: '09:00', endTime: '13:00' },
        { day: 'Monday', startTime: '14:00', endTime: '17:00' },
        { day: 'Tuesday', startTime: '09:00', endTime: '13:00' },
        { day: 'Wednesday', startTime: '09:00', endTime: '13:00' },
        { day: 'Thursday', startTime: '14:00', endTime: '18:00' },
        { day: 'Friday', startTime: '09:00', endTime: '13:00' }
      ]
    });

    // 3. Doctor: Dr. Patel (Neurology)
    const doctor2User = await User.create({
      name: 'Dr. Priya Patel',
      email: 'dr.patel@hospital.com',
      passwordHash: 'Doctor@123',
      role: 'Doctor',
      phone: '+91 9876543212'
    });

    const doctor2 = await Doctor.create({
      userId: doctor2User._id,
      departmentId: deptMap['Neurology'],
      specialization: 'Neurology',
      qualification: 'MBBS, MD, DNB (Neurology)',
      experience: 9,
      consultationFee: 900,
      availabilitySlots: [
        { day: 'Monday', startTime: '10:00', endTime: '14:00' },
        { day: 'Wednesday', startTime: '10:00', endTime: '14:00' },
        { day: 'Wednesday', startTime: '15:00', endTime: '18:00' },
        { day: 'Thursday', startTime: '10:00', endTime: '14:00' },
        { day: 'Friday', startTime: '14:00', endTime: '18:00' }
      ]
    });

    // 4. Patient 1: John Doe
    const patient1User = await User.create({
      name: 'John Doe',
      email: 'patient1@example.com',
      passwordHash: 'Patient@123',
      role: 'Patient',
      phone: '+91 9876543221'
    });

    const patient1 = await Patient.create({
      userId: patient1User._id,
      dob: new Date('1990-05-15'),
      gender: 'Male',
      bloodGroup: 'O+',
      medicalNotes: 'Mild hypertension. Allergic to Penicillin.',
      address: '42 Blossom Residency, Koramangala, Bengaluru',
      emergencyContact: {
        name: 'Jane Doe',
        phone: '+91 9876543222',
        relationship: 'Spouse'
      }
    });

    // 5. Patient 2: Sarah Smith
    const patient2User = await User.create({
      name: 'Sarah Smith',
      email: 'patient2@example.com',
      passwordHash: 'Patient@123',
      role: 'Patient',
      phone: '+91 9876543223'
    });

    const patient2 = await Patient.create({
      userId: patient2User._id,
      dob: new Date('1995-11-20'),
      gender: 'Female',
      bloodGroup: 'B+',
      medicalNotes: 'History of chronic migraines.',
      address: '108 Palm Meadows, Indiranagar, Bengaluru',
      emergencyContact: {
        name: 'Robert Smith',
        phone: '+91 9876543224',
        relationship: 'Father'
      }
    });

    console.log('📅 Seeding Appointments across multiple statuses...');
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 2);

    const apptCompleted = await Appointment.create({
      patientId: patient1._id,
      doctorId: doctor1._id,
      date: pastDate,
      slot: { startTime: '09:30', endTime: '10:00' },
      status: 'Completed',
      reason: 'Routine cardiac health checkup and blood pressure monitoring.',
      notes: 'Patient advised lifestyle modifications. BP: 130/85 mmHg.'
    });

    const futureDate1 = new Date();
    futureDate1.setDate(futureDate1.getDate() + 5);
    const apptConfirmed = await Appointment.create({
      patientId: patient1._id,
      doctorId: doctor1._id,
      date: futureDate1,
      slot: { startTime: '10:00', endTime: '10:30' },
      status: 'Confirmed',
      reason: 'Follow-up consultation on ECG findings.',
      notes: 'Please bring recent lipid panel reports.'
    });

    const futureDate2 = new Date();
    futureDate2.setDate(futureDate2.getDate() + 7);
    const apptBooked = await Appointment.create({
      patientId: patient2._id,
      doctorId: doctor2._id,
      date: futureDate2,
      slot: { startTime: '11:00', endTime: '11:30' },
      status: 'Booked',
      reason: 'Recurring severe headaches and light sensitivity.'
    });

    const cancelledDate = new Date();
    cancelledDate.setDate(cancelledDate.getDate() - 5);
    await Appointment.create({
      patientId: patient2._id,
      doctorId: doctor2._id,
      date: cancelledDate,
      slot: { startTime: '12:00', endTime: '12:30' },
      status: 'Cancelled',
      reason: 'Migraine assessment.',
      cancelledBy: 'Patient',
      cancellationReason: 'Patient rescheduled due to travel conflict.'
    });

    console.log('💊 Seeding Digital Prescription for Completed Visit...');
    await Prescription.create({
      appointmentId: apptCompleted._id,
      doctorId: doctor1._id,
      patientId: patient1._id,
      medicines: [
        {
          name: 'Amlodipine',
          dosage: '5mg',
          frequency: 'Once daily',
          duration: '30 days',
          instructions: 'Take in the morning after breakfast'
        },
        {
          name: 'Atorvastatin',
          dosage: '10mg',
          frequency: 'Once daily at bedtime',
          duration: '30 days',
          instructions: 'Take before sleep with a glass of water'
        }
      ],
      diagnosis: 'Stage 1 Essential Hypertension with mild hyperlipidemia',
      notes: 'Avoid high-sodium foods, exercise for 30 minutes daily. Follow up in 4 weeks.',
      issuedAt: pastDate
    });

    console.log('💳 Seeding Billing for Completed Visit...');
    await Billing.create({
      appointmentId: apptCompleted._id,
      patientId: patient1._id,
      amount: 800,
      paymentStatus: 'Paid',
      paymentMethod: 'UPI',
      description: 'Consultation Fee — Cardiology',
      paidAt: pastDate
    });

    console.log('🔔 Seeding Notifications...');
    await Notification.create([
      {
        userId: patient1User._id,
        appointmentId: apptCompleted._id,
        type: 'appointment_completed',
        title: 'Appointment Completed',
        message: 'Your appointment with Dr. Rajesh Sharma has been completed.',
        isRead: true,
        status: 'Read'
      },
      {
        userId: patient1User._id,
        appointmentId: apptCompleted._id,
        type: 'prescription_issued',
        title: 'Prescription Issued',
        message: 'Dr. Rajesh Sharma has issued a prescription for your visit.',
        isRead: true,
        status: 'Read'
      },
      {
        userId: patient1User._id,
        appointmentId: apptConfirmed._id,
        type: 'appointment_confirmed',
        title: 'Appointment Confirmed',
        message: `Your appointment with Dr. Rajesh Sharma has been confirmed for ${futureDate1.toLocaleDateString()} at 10:00.`,
        isRead: false,
        status: 'Pending'
      },
      {
        userId: doctor1User._id,
        appointmentId: apptConfirmed._id,
        type: 'appointment_confirmed',
        title: 'Appointment Confirmed',
        message: `Appointment with John Doe confirmed for ${futureDate1.toLocaleDateString()} at 10:00.`,
        isRead: false,
        status: 'Pending'
      },
      {
        userId: patient2User._id,
        appointmentId: apptBooked._id,
        type: 'appointment_booked',
        title: 'Appointment Booked',
        message: `Your appointment with Dr. Priya Patel is booked for ${futureDate2.toLocaleDateString()} at 11:00. Waiting for confirmation.`,
        isRead: false,
        status: 'Pending'
      }
    ]);

    console.log('✅ Demo data generated successfully.');
  } catch (error) {
    console.error('❌ Seeding Error:', error);
    throw error;
  }
};

module.exports = seedData;

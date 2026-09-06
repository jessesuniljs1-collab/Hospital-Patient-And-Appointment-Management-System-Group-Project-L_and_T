// Live End-to-End API Verification Script for Hospital Patient & Appointment Management System
const BASE_URL = 'http://localhost:5000/api';

const runVerification = async () => {
  console.log('\n🏥 ====================================================');
  console.log('   HOSPITAL MANAGEMENT SYSTEM — LIVE API VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const test = (name, condition) => {
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name}`);
      failed++;
    }
  };

  // 1. Health Check
  const healthRes = await fetch(`${BASE_URL}/health`);
  const healthData = await healthRes.json();
  test('Health Check API returns 200 & success:true', healthRes.status === 200 && healthData.success === true);

  // 2. Login Admin
  const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@hospital.com', password: 'Admin@123' })
  });
  const adminLoginData = await adminLoginRes.json();
  const adminToken = adminLoginData.data?.token;
  test('Admin Login returns 200 & JWT token', adminLoginRes.status === 200 && !!adminToken);

  // 3. Login Doctor (Dr. Sharma)
  const docLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'dr.sharma@hospital.com', password: 'Doctor@123' })
  });
  const docLoginData = await docLoginRes.json();
  const docToken = docLoginData.data?.token;
  test('Doctor Login returns 200 & JWT token', docLoginRes.status === 200 && !!docToken);

  // 4. Login Patient 1 (John Doe)
  const pat1LoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'patient1@example.com', password: 'Patient@123' })
  });
  const pat1LoginData = await pat1LoginRes.json();
  const pat1Token = pat1LoginData.data?.token;
  test('Patient 1 Login returns 200 & JWT token', pat1LoginRes.status === 200 && !!pat1Token);

  // 5. Login Patient 2 (Sarah Smith)
  const pat2LoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'patient2@example.com', password: 'Patient@123' })
  });
  const pat2LoginData = await pat2LoginRes.json();
  const pat2Token = pat2LoginData.data?.token;
  test('Patient 2 Login returns 200 & JWT token', pat2LoginRes.status === 200 && !!pat2Token);

  // 6. Departments (Public & Admin)
  const deptsRes = await fetch(`${BASE_URL}/departments`);
  const deptsData = await deptsRes.json();
  test('Public Departments listing returns 5 seeded departments', deptsRes.status === 200 && deptsData.data.length >= 5);

  // 7. Doctors (Public Directory & Search)
  const docsRes = await fetch(`${BASE_URL}/doctors?specialization=Cardiology`);
  const docsData = await docsRes.json();
  const doctor = docsData.data?.doctors?.[0];
  test('Doctor search by specialization returns cardiology specialists', docsRes.status === 200 && docsData.data.doctors.length >= 1);

  // 8. Doctor Availability Overlap Rejection (409)
  const overlapRes = await fetch(`${BASE_URL}/doctors/${doctor._id}/slots`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${docToken}`
    },
    body: JSON.stringify({
      availabilitySlots: [
        { day: 'Monday', startTime: '09:00', endTime: '12:00' },
        { day: 'Monday', startTime: '11:00', endTime: '14:00' }
      ]
    })
  });
  const overlapData = await overlapRes.json();
  test('Overlapping availability slots rejected with 409 OVERLAPPING_SLOTS', overlapRes.status === 409 && overlapData.errorCode === 'OVERLAPPING_SLOTS');

  // 9. Book Appointment (Module 4)
  // Find next Monday
  const nextMonday = new Date();
  nextMonday.setDate(nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7));
  const mondayStr = nextMonday.toISOString().split('T')[0];

  const bookRes = await fetch(`${BASE_URL}/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${pat1Token}`
    },
    body: JSON.stringify({
      doctorId: doctor._id,
      date: mondayStr,
      slot: { startTime: '09:30', endTime: '10:00' },
      reason: 'Regular consultation'
    })
  });
  const bookData = await bookRes.json();
  const newApptId = bookData.data?._id;
  test('Appointment booking succeeds (201 Booked)', bookRes.status === 201 && bookData.data.status === 'Booked');

  // 10. Double Booking Rejection (409)
  const doubleBookRes = await fetch(`${BASE_URL}/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${pat2Token}`
    },
    body: JSON.stringify({
      doctorId: doctor._id,
      date: mondayStr,
      slot: { startTime: '09:45', endTime: '10:15' }, // Overlaps 09:30-10:00
      reason: 'Conflicting appointment'
    })
  });
  const doubleBookData = await doubleBookRes.json();
  test('Double booking rejected with 409 APPOINTMENT_CONFLICT', doubleBookRes.status === 409 && doubleBookData.errorCode === 'APPOINTMENT_CONFLICT');

  // 11. Appointment Status Workflow (Booked -> Confirmed -> Completed)
  const confirmRes = await fetch(`${BASE_URL}/appointments/${newApptId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${docToken}`
    },
    body: JSON.stringify({ status: 'Confirmed', notes: 'Confirmed by doctor' })
  });
  test('Status transition Booked -> Confirmed succeeds (200)', confirmRes.status === 200);

  const completeRes = await fetch(`${BASE_URL}/appointments/${newApptId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${docToken}`
    },
    body: JSON.stringify({ status: 'Completed', notes: 'Consultation finished' })
  });
  test('Status transition Confirmed -> Completed succeeds (200)', completeRes.status === 200);

  // 12. Invalid Status Transition Rejection (Completed -> Booked, 400)
  const invalidTransRes = await fetch(`${BASE_URL}/appointments/${newApptId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ status: 'Booked' })
  });
  const invalidTransData = await invalidTransRes.json();
  test('Invalid transition Completed -> Booked rejected with 400 INVALID_STATUS_TRANSITION', invalidTransRes.status === 400 && invalidTransData.errorCode === 'INVALID_STATUS_TRANSITION');

  // 13. Digital Prescription Issuance (Module 6)
  const prescRes = await fetch(`${BASE_URL}/prescriptions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${docToken}`
    },
    body: JSON.stringify({
      appointmentId: newApptId,
      medicines: [
        { name: 'Metoprolol', dosage: '25mg', frequency: 'Daily', duration: '14 days' }
      ],
      diagnosis: 'Tachycardia',
      notes: 'Reduce stress and caffeine intake.'
    })
  });
  test('Doctor issues prescription for Completed visit (201)', prescRes.status === 201);

  // 14. Medical History & Ownership Protection (Module 7 & 13)
  const pat1ProfileRes = await fetch(`${BASE_URL}/patients/profile`, {
    headers: { 'Authorization': `Bearer ${pat1Token}` }
  });
  const pat1ProfileData = await pat1ProfileRes.json();
  const pat1Id = pat1ProfileData.data?.patient?._id;

  const historyRes = await fetch(`${BASE_URL}/patients/${pat1Id}/history`, {
    headers: { 'Authorization': `Bearer ${pat1Token}` }
  });
  const historyData = await historyRes.json();
  test('Patient views own medical history (200 with visits & prescriptions)', historyRes.status === 200 && historyData.data.history.length >= 1);

  // Ownership Violation Test (Patient 2 trying to view Patient 1's history)
  const hijackRes = await fetch(`${BASE_URL}/patients/${pat1Id}/history`, {
    headers: { 'Authorization': `Bearer ${pat2Token}` }
  });
  const hijackData = await hijackRes.json();
  test('Ownership violation rejected with 403 OWNERSHIP_VIOLATION', hijackRes.status === 403 && hijackData.errorCode === 'OWNERSHIP_VIOLATION');

  // 15. Automated Billing Verification (Module 10)
  const billingRes = await fetch(`${BASE_URL}/billing/patient/${pat1Id}`, {
    headers: { 'Authorization': `Bearer ${pat1Token}` }
  });
  const billingData = await billingRes.json();
  test('Billing record automatically generated on visit completion (Pending status)', billingRes.status === 200 && billingData.data.length >= 1);

  // 16. Notifications (Module 9)
  const notifRes = await fetch(`${BASE_URL}/notifications`, {
    headers: { 'Authorization': `Bearer ${pat1Token}` }
  });
  const notifData = await notifRes.json();
  test('Notifications retrieved for patient events', notifRes.status === 200 && notifData.data.notifications.length >= 1);

  // 17. Admin Aggregation Reports (Module 12)
  const reportRes = await fetch(`${BASE_URL}/admin/reports/appointments?period=daily`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const reportData = await reportRes.json();
  test('Admin retrieves appointment aggregation reports (200)', reportRes.status === 200 && reportData.data.totalAppointments >= 1);

  // 18. Non-Admin Blocked from Reports (403)
  const unauthReportRes = await fetch(`${BASE_URL}/admin/reports/appointments`, {
    headers: { 'Authorization': `Bearer ${pat1Token}` }
  });
  test('Non-Admin blocked from reports with 403 FORBIDDEN', unauthReportRes.status === 403);

  console.log('\n====================================================');
  console.log(`Verification Summary: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
};

runVerification().catch(err => {
  console.error('Verification crashed:', err);
  process.exit(1);
});

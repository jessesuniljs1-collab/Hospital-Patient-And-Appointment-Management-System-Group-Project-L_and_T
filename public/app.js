// State Management
const API_BASE = '/api';
let currentUser = null;
let currentToken = null;
let currentProfile = null;
let availableDoctors = [];
let availableDepartments = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  setupNav();
  loadDepartments();
  loadDoctors();
});

// Auth Initialization
function initAuth() {
  const savedToken = localStorage.getItem('token');
  const savedUser = localStorage.getItem('user');

  if (savedToken && savedUser) {
    currentToken = savedToken;
    currentUser = JSON.parse(savedUser);
    updateAuthUI();
    fetchProfile();
    fetchUnreadNotificationsCount();
  } else {
    updateAuthUI();
  }

  // Event Listeners for login/logout buttons
  document.getElementById('loginBtn')?.addEventListener('click', () => openAuthModal('login'));
  document.getElementById('registerBtn')?.addEventListener('click', () => openAuthModal('register'));
  document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
  document.getElementById('notificationsBtn')?.addEventListener('click', openNotificationsDrawer);
}

function updateAuthUI() {
  const unauth = document.getElementById('unauthControls');
  const auth = document.getElementById('authControls');
  const apptNav = document.getElementById('appointmentsNav');
  const histNav = document.getElementById('historyNav');
  const docNav = document.getElementById('doctorNav');
  const adminNav = document.getElementById('adminNav');

  if (currentUser && currentToken) {
    unauth.classList.add('hidden');
    auth.classList.remove('hidden');
    document.getElementById('navUserName').textContent = currentUser.name;
    document.getElementById('navUserRole').textContent = currentUser.role;
    document.getElementById('userInitial').textContent = currentUser.name.charAt(0).toUpperCase();

    // Role-specific nav links
    apptNav.classList.remove('hidden');

    if (currentUser.role === 'Patient') {
      histNav.classList.remove('hidden');
      docNav.classList.add('hidden');
      adminNav.classList.add('hidden');
    } else if (currentUser.role === 'Doctor') {
      histNav.classList.add('hidden');
      docNav.classList.remove('hidden');
      adminNav.classList.add('hidden');
    } else if (currentUser.role === 'Admin') {
      histNav.classList.add('hidden');
      docNav.classList.add('hidden');
      adminNav.classList.remove('hidden');
    }
  } else {
    unauth.classList.remove('hidden');
    auth.classList.add('hidden');
    apptNav.classList.add('hidden');
    histNav.classList.add('hidden');
    docNav.classList.add('hidden');
    adminNav.classList.add('hidden');
  }
}

// Navigation Tabs Setup
function setupNav() {
  const tabs = document.querySelectorAll('.nav-link');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetView = tab.dataset.tab;
      switchTab(targetView);
    });
  });
}

function switchTab(viewId) {
  document.querySelectorAll('.nav-link').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === viewId);
  });

  document.querySelectorAll('.view').forEach(view => {
    view.classList.toggle('active', view.id === viewId);
  });

  // Fetch view-specific data
  if (viewId === 'appointmentsTab') loadAppointments();
  if (viewId === 'historyTab') loadMedicalHistory();
  if (viewId === 'doctorPortalTab') loadDoctorPortal();
  if (viewId === 'adminTab') loadAdminReports();
}

// Standard User Authentication (JWT)
async function loginUser(email, password) {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Authentication failed');

    currentToken = data.data.token;
    currentUser = data.data.user;

    localStorage.setItem('token', currentToken);
    localStorage.setItem('user', JSON.stringify(currentUser));

    showToast(`Signed in successfully as ${currentUser.name} (${currentUser.role})`, 'success');
    updateAuthUI();
    fetchProfile();
    fetchUnreadNotificationsCount();

    // Route to role-specific dashboard
    if (currentUser.role === 'Doctor') {
      switchTab('doctorPortalTab');
    } else if (currentUser.role === 'Admin') {
      switchTab('adminTab');
    } else {
      switchTab('appointmentsTab');
    }
    return true;
  } catch (err) {
    showToast(err.message, 'error');
    return false;
  }
}

// Regular Login Submission
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const success = await loginUser(email, password);
  if (success) {
    closeAuthModal();
    document.getElementById('loginForm').reset();
  }
}

// Registration
async function handleRegister(e) {
  e.preventDefault();
  const body = {
    name: document.getElementById('regName').value,
    email: document.getElementById('regEmail').value,
    phone: document.getElementById('regPhone').value,
    password: document.getElementById('regPassword').value,
    dob: document.getElementById('regDob').value,
    gender: document.getElementById('regGender').value,
    bloodGroup: document.getElementById('regBloodGroup').value,
    medicalNotes: document.getElementById('regNotes').value
  };

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    if (!res.ok) {
      const errMsg = data.errors ? data.errors.map(e => e.message).join(', ') : data.message;
      throw new Error(errMsg || 'Registration failed');
    }

    currentToken = data.data.token;
    currentUser = data.data.user;

    localStorage.setItem('token', currentToken);
    localStorage.setItem('user', JSON.stringify(currentUser));

    showToast('Registration successful! Welcome to MediPulse.', 'success');
    closeAuthModal();
    updateAuthUI();
    fetchProfile();
    switchTab('searchTab');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  currentUser = null;
  currentToken = null;
  currentProfile = null;
  updateAuthUI();
  switchTab('searchTab');
  showToast('Logged out successfully.', 'info');
}

async function fetchProfile() {
  if (!currentToken) return;
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const data = await res.json();
    if (res.ok) {
      currentProfile = data.data.profile;
    }
  } catch (err) {
    console.error('Failed to fetch profile', err);
  }
}

// 1. Doctors Module & Search (Module 2, 8, 11)
async function loadDoctors() {
  const spec = document.getElementById('searchSpecialization').value.trim();
  const dept = document.getElementById('searchDepartment').value.trim();

  let url = `${API_BASE}/doctors?`;
  if (spec) url += `specialization=${encodeURIComponent(spec)}&`;
  if (dept) url += `department=${encodeURIComponent(dept)}&`;

  const grid = document.getElementById('doctorGrid');
  grid.innerHTML = '<div class="loading-spinner">Searching specialists...</div>';

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    availableDoctors = data.data.doctors;
    document.getElementById('doctorCountBadge').textContent = `${availableDoctors.length} Doctors Available`;

    if (availableDoctors.length === 0) {
      grid.innerHTML = '<p class="text-muted">No doctors found matching criteria.</p>';
      return;
    }

    grid.innerHTML = availableDoctors.map(doc => {
      const docName = doc.userId ? doc.userId.name : 'Dr. Specialist';
      const deptName = doc.departmentId ? doc.departmentId.name : 'General Care';

      const slotsPreview = (doc.availabilitySlots && doc.availabilitySlots.length > 0)
        ? doc.availabilitySlots.slice(0, 3).map(s => `<span class="slot-tag">${s.day.slice(0, 3)}: ${s.startTime}-${s.endTime}</span>`).join(' ')
        : '<span class="text-muted">No slots defined</span>';

      return `
        <div class="doctor-card">
          <div>
            <div class="doctor-card-header">
              <div>
                <span class="doctor-spec">${doc.specialization}</span>
                <h3 class="doctor-name">${docName}</h3>
                <span class="doctor-dept">${deptName} • ${doc.experience || 5} yrs exp</span>
              </div>
              <span class="doctor-fee">₹${doc.consultationFee || 500}</span>
            </div>
            <div class="slots-preview">
              <div class="slots-preview-title">Available Slots</div>
              ${slotsPreview}
            </div>
          </div>
          <button class="btn btn-primary btn-block mt-4" onclick="initiateBooking('${doc._id}')">
            Book Consultation
          </button>
        </div>
      `;
    }).join('');

    // Populate booking dropdown
    populateDoctorDropdown();
  } catch (err) {
    grid.innerHTML = `<p class="text-danger">${err.message}</p>`;
  }
}

function resetDoctorSearch() {
  document.getElementById('searchSpecialization').value = '';
  document.getElementById('searchDepartment').value = '';
  loadDoctors();
}

function populateDoctorDropdown() {
  const select = document.getElementById('bookDoctorSelect');
  if (!select) return;

  select.innerHTML = '<option value="">Choose a Doctor...</option>' + 
    availableDoctors.map(d => {
      const name = d.userId ? d.userId.name : 'Doctor';
      const dept = d.departmentId ? d.departmentId.name : '';
      return `<option value="${d._id}">${name} (${d.specialization} - ${dept})</option>`;
    }).join('');
}

// 2. Departments Module (Module 2 & 8)
async function loadDepartments() {
  const grid = document.getElementById('departmentGrid');
  try {
    const res = await fetch(`${API_BASE}/departments`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    availableDepartments = data.data;
    grid.innerHTML = availableDepartments.map(dept => `
      <div class="department-card">
        <h3>${dept.name}</h3>
        <p>${dept.description || 'Specialized outpatient and inpatient healthcare services.'}</p>
      </div>
    `).join('');
  } catch (err) {
    grid.innerHTML = `<p class="text-danger">${err.message}</p>`;
  }
}

// 3. Appointment Booking & Management (Module 4 & 5)
function initiateBooking(doctorId) {
  if (!currentUser) {
    openAuthModal('login');
    showToast('Please sign in as a Patient to book an appointment.', 'warning');
    return;
  }
  openBookModal(doctorId);
}

function openBookModal(preselectedDoctorId) {
  populateDoctorDropdown();
  if (preselectedDoctorId) {
    document.getElementById('bookDoctorSelect').value = preselectedDoctorId;
    onDoctorSelectChange();
  }
  // Set min date to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('bookDate').min = today;
  document.getElementById('bookModal').classList.remove('hidden');
}

function closeBookModal() {
  document.getElementById('bookModal').classList.add('hidden');
  document.getElementById('bookForm').reset();
  document.getElementById('doctorSlotsNotice').classList.add('hidden');
}

function onDoctorSelectChange() {
  const docId = document.getElementById('bookDoctorSelect').value;
  const noticeBox = document.getElementById('doctorSlotsNotice');

  if (!docId) {
    noticeBox.classList.add('hidden');
    return;
  }

  const doc = availableDoctors.find(d => d._id === docId);
  if (doc && doc.availabilitySlots && doc.availabilitySlots.length > 0) {
    const slotsTxt = doc.availabilitySlots.map(s => `<strong>${s.day}</strong>: ${s.startTime} - ${s.endTime}`).join(' | ');
    noticeBox.innerHTML = `🗓️ <strong>Doctor Availability:</strong><br>${slotsTxt}`;
    noticeBox.classList.remove('hidden');
  } else {
    noticeBox.innerHTML = '⚠️ Doctor has no availability slots configured.';
    noticeBox.classList.remove('hidden');
  }
}

function updateDayNotice() {
  const dateVal = document.getElementById('bookDate').value;
  if (!dateVal) return;
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = days[new Date(dateVal).getDay()];
  showToast(`Selected date is a ${dayName}. Make sure slot matches doctor availability.`, 'info');
}

async function handleBookAppointment(e) {
  e.preventDefault();

  const doctorId = document.getElementById('bookDoctorSelect').value;
  const date = document.getElementById('bookDate').value;
  const startTime = document.getElementById('bookStartTime').value;
  const endTime = document.getElementById('bookEndTime').value;
  const reason = document.getElementById('bookReason').value;

  try {
    const res = await fetch(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({
        doctorId,
        date,
        slot: { startTime, endTime },
        reason
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Appointment booking failed');
    }

    showToast('Appointment booked successfully!', 'success');
    closeBookModal();
    loadAppointments();
    fetchUnreadNotificationsCount();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Load Appointments
async function loadAppointments() {
  if (!currentToken) return;

  const status = document.getElementById('appointmentStatusFilter')?.value || '';
  let url = `${API_BASE}/appointments?`;
  if (status) url += `status=${status}&`;

  const tbody = document.getElementById('appointmentsList');
  tbody.innerHTML = '<tr><td colspan="6" class="text-center">Loading appointments...</td></tr>';

  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    const appts = data.data.appointments;
    if (appts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No appointments found.</td></tr>';
      return;
    }

    tbody.innerHTML = appts.map(apt => {
      const docName = apt.doctorId && apt.doctorId.userId ? apt.doctorId.userId.name : 'Specialist';
      const deptName = apt.doctorId && apt.doctorId.departmentId ? apt.doctorId.departmentId.name : '';
      const patName = apt.patientId && apt.patientId.userId ? apt.patientId.userId.name : 'Patient';
      const aptDate = new Date(apt.date).toLocaleDateString();
      const slotTime = `${apt.slot.startTime} - ${apt.slot.endTime}`;

      let actions = '';
      if (currentUser.role === 'Patient' && (apt.status === 'Booked' || apt.status === 'Confirmed')) {
        actions = `<button class="btn btn-xs btn-outline" onclick="cancelAppointment('${apt._id}')">Cancel</button>`;
      } else if (currentUser.role === 'Admin') {
        actions = `
          <select onchange="updateApptStatus('${apt._id}', this.value)" class="form-select-sm">
            <option value="">Action...</option>
            ${apt.status === 'Booked' ? '<option value="Confirmed">Confirm</option>' : ''}
            ${apt.status === 'Confirmed' ? '<option value="Completed">Complete</option>' : ''}
            ${apt.status === 'Confirmed' ? '<option value="No-show">No-show</option>' : ''}
            ${['Booked', 'Confirmed'].includes(apt.status) ? '<option value="Cancelled">Cancel</option>' : ''}
          </select>
        `;
      }

      return `
        <tr>
          <td><strong>${docName}</strong><br><small class="text-muted">${deptName}</small></td>
          <td>${patName}</td>
          <td>${aptDate}<br><small class="text-muted">${slotTime}</small></td>
          <td>${apt.reason || '-'}</td>
          <td><span class="status-badge status-${apt.status.toLowerCase()}">${apt.status}</span></td>
          <td>${actions || '-'}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-danger">${err.message}</td></tr>`;
  }
}

// Status Workflow Transition (Module 5)
async function updateApptStatus(apptId, newStatus) {
  if (!newStatus) return;

  try {
    const res = await fetch(`${API_BASE}/appointments/${apptId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({
        status: newStatus,
        notes: `Status updated to ${newStatus} via dashboard.`
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    showToast(`Appointment status changed to ${newStatus}`, 'success');
    loadAppointments();
    if (currentUser.role === 'Doctor') loadDoctorPortal();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function cancelAppointment(apptId) {
  if (!confirm('Are you sure you want to cancel this appointment?')) return;
  await updateApptStatus(apptId, 'Cancelled');
}

let currentDoctorProfile = null;

// 4. Doctor Clinical Portal (Module 3, 5, 6)
async function loadDoctorPortal() {
  if (!currentToken || currentUser.role !== 'Doctor') return;

  // Load doctor availability slots
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const data = await res.json();
    if (res.ok && data.data.profile) {
      const doc = data.data.profile;
      currentDoctorProfile = doc;
      const container = document.getElementById('doctorSlotsDisplay');
      if (doc.availabilitySlots && doc.availabilitySlots.length > 0) {
        container.innerHTML = doc.availabilitySlots.map(s => `
          <div class="slot-tag" style="margin: 0.2rem; display: inline-block;">
            <strong>${s.day}</strong>: ${s.startTime} - ${s.endTime}
          </div>
        `).join('');
      } else {
        container.innerHTML = '<p class="text-muted">No availability slots configured.</p>';
      }
    }
  } catch (err) {
    console.error(err);
  }

  // Load doctor appointments
  const tbody = document.getElementById('doctorApptList');
  tbody.innerHTML = '<tr><td colspan="5" class="text-center">Loading appointments...</td></tr>';

  try {
    const res = await fetch(`${API_BASE}/appointments`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    const appts = data.data.appointments;
    if (appts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No appointments scheduled.</td></tr>';
      return;
    }

    tbody.innerHTML = appts.map(apt => {
      const patName = apt.patientId && apt.patientId.userId ? apt.patientId.userId.name : 'Patient';
      const aptDate = new Date(apt.date).toLocaleDateString();
      const slotTime = `${apt.slot.startTime} - ${apt.slot.endTime}`;

      let workflowButtons = '';
      if (apt.status === 'Booked') {
        workflowButtons = `<button class="btn btn-xs btn-primary" onclick="updateApptStatus('${apt._id}', 'Confirmed')">Confirm Booking</button>`;
      } else if (apt.status === 'Confirmed') {
        workflowButtons = `<button class="btn btn-xs btn-primary" onclick="updateApptStatus('${apt._id}', 'Completed')">Mark Completed</button>`;
      } else if (apt.status === 'Completed') {
        workflowButtons = `<button class="btn btn-xs btn-outline" onclick="openPrescriptionModal('${apt._id}')">Issue Prescription</button>`;
      }

      return `
        <tr>
          <td><strong>${patName}</strong></td>
          <td>${aptDate}<br><small class="text-muted">${slotTime}</small></td>
          <td>${apt.reason || '-'}</td>
          <td><span class="status-badge status-${apt.status.toLowerCase()}">${apt.status}</span></td>
          <td>${workflowButtons || '-'}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-danger">${err.message}</td></tr>`;
  }
}

// Doctor Availability Slot Management (Module 3)
function openAvailabilityModal() {
  if (!currentDoctorProfile) {
    showToast('Doctor profile not loaded yet. Please wait...', 'warning');
    return;
  }
  const container = document.getElementById('availabilitySlotsContainer');
  container.innerHTML = '';
  const slots = currentDoctorProfile.availabilitySlots || [];
  if (slots.length === 0) {
    addAvailabilityRow({ day: 'Monday', startTime: '09:00', endTime: '13:00' });
  } else {
    slots.forEach(s => addAvailabilityRow(s));
  }
  document.getElementById('availabilityModal').classList.remove('hidden');
}

function closeAvailabilityModal() {
  document.getElementById('availabilityModal').classList.add('hidden');
}

function addAvailabilityRow(slot = { day: 'Monday', startTime: '09:00', endTime: '13:00' }) {
  const container = document.getElementById('availabilitySlotsContainer');
  const div = document.createElement('div');
  div.className = 'availability-row';
  div.innerHTML = `
    <select class="avail-day">
      ${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => `<option value="${d}" ${d === slot.day ? 'selected' : ''}>${d}</option>`).join('')}
    </select>
    <input type="text" class="avail-start" placeholder="09:00" value="${slot.startTime || '09:00'}" pattern="^([01]\\d|2[0-3]):([0-5]\\d)$" required>
    <input type="text" class="avail-end" placeholder="13:00" value="${slot.endTime || '13:00'}" pattern="^([01]\\d|2[0-3]):([0-5]\\d)$" required>
    <button type="button" class="btn btn-xs btn-outline" onclick="this.parentElement.remove()" title="Remove Slot">&times;</button>
  `;
  container.appendChild(div);
}

async function handleSaveAvailability(e) {
  e.preventDefault();
  if (!currentDoctorProfile) return;

  const rows = document.querySelectorAll('#availabilitySlotsContainer .availability-row');
  const availabilitySlots = Array.from(rows).map(r => ({
    day: r.querySelector('.avail-day').value,
    startTime: r.querySelector('.avail-start').value,
    endTime: r.querySelector('.avail-end').value
  }));

  try {
    const res = await fetch(`${API_BASE}/doctors/${currentDoctorProfile._id}/slots`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({ availabilitySlots })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update availability');

    showToast('Availability slots updated successfully!', 'success');
    closeAvailabilityModal();
    loadDoctorPortal();
    loadDoctors();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// 5. Digital Prescription (Module 6)
function openPrescriptionModal(apptId) {
  document.getElementById('prescApptId').value = apptId;
  document.getElementById('prescriptionModal').classList.remove('hidden');
}

function closePrescriptionModal() {
  document.getElementById('prescriptionModal').classList.add('hidden');
  document.getElementById('prescriptionForm').reset();
}

function addMedicineRow() {
  const container = document.getElementById('medicineRowsContainer');
  const div = document.createElement('div');
  div.className = 'medicine-row';
  div.innerHTML = `
    <input type="text" placeholder="Medicine Name" class="med-name" required>
    <input type="text" placeholder="Dosage" class="med-dose" required>
    <input type="text" placeholder="Freq" class="med-freq" required>
    <input type="text" placeholder="Duration" class="med-dur" required>
    <input type="text" placeholder="Instructions" class="med-inst">
  `;
  container.appendChild(div);
}

async function handleIssuePrescription(e) {
  e.preventDefault();
  const appointmentId = document.getElementById('prescApptId').value;
  const diagnosis = document.getElementById('prescDiagnosis').value;
  const notes = document.getElementById('prescNotes').value;

  const rows = document.querySelectorAll('#medicineRowsContainer .medicine-row');
  const medicines = Array.from(rows).map(r => ({
    name: r.querySelector('.med-name').value,
    dosage: r.querySelector('.med-dose').value,
    frequency: r.querySelector('.med-freq').value,
    duration: r.querySelector('.med-dur').value,
    instructions: r.querySelector('.med-inst').value
  }));

  try {
    const res = await fetch(`${API_BASE}/prescriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({
        appointmentId,
        diagnosis,
        notes,
        medicines
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    showToast('Prescription issued successfully!', 'success');
    closePrescriptionModal();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// 6. Patient Medical History (Module 7)
async function loadMedicalHistory() {
  if (!currentToken) return;

  const container = document.getElementById('historyContainer');
  container.innerHTML = '<div class="loading-spinner">Loading chronological medical records...</div>';

  try {
    // Get patient profile ID first
    const profileRes = await fetch(`${API_BASE}/patients/profile`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const profileData = await profileRes.json();
    if (!profileRes.ok) throw new Error(profileData.message);

    const patientId = profileData.data.patient._id;

    // Fetch history
    const historyRes = await fetch(`${API_BASE}/patients/${patientId}/history`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const historyData = await historyRes.json();
    if (!historyRes.ok) throw new Error(historyData.message);

    const visits = historyData.data.history;
    if (visits.length === 0) {
      container.innerHTML = '<p class="text-muted">No medical history records found.</p>';
      return;
    }

    container.innerHTML = visits.map(v => {
      const apt = v.appointment;
      const docName = apt.doctorId && apt.doctorId.userId ? apt.doctorId.userId.name : 'Specialist';
      const deptName = apt.doctorId && apt.doctorId.departmentId ? apt.doctorId.departmentId.name : '';
      const dateStr = new Date(apt.date).toLocaleDateString();

      let prescHtml = '';
      if (v.prescriptions && v.prescriptions.length > 0) {
        prescHtml = v.prescriptions.map(p => `
          <div class="presc-box">
            <h4>💊 Digital Prescription</h4>
            <p><strong>Diagnosis:</strong> ${p.diagnosis || 'Clinical evaluation'}</p>
            <ul>
              ${p.medicines.map(m => `<li><strong>${m.name}</strong> (${m.dosage}) — ${m.frequency} for ${m.duration} [${m.instructions || 'As advised'}]</li>`).join('')}
            </ul>
            ${p.notes ? `<p class="mt-2 text-muted"><strong>Advice:</strong> ${p.notes}</p>` : ''}
          </div>
        `).join('');
      }

      let billHtml = '';
      if (v.billing) {
        billHtml = `
          <div class="bill-box">
            <span>💳 <strong>Consultation Billing:</strong> ₹${v.billing.amount}</span>
            <span class="status-badge status-${v.billing.paymentStatus.toLowerCase()}">${v.billing.paymentStatus}</span>
          </div>
        `;
      }

      return `
        <div class="history-visit">
          <div class="visit-header">
            <div>
              <h3>Visit with ${docName} (${deptName})</h3>
              <span class="text-muted">Date: ${dateStr} • Status: ${apt.status}</span>
            </div>
          </div>
          <p><strong>Reason for Consultation:</strong> ${apt.reason || 'General health visit'}</p>
          ${apt.notes ? `<p class="text-muted"><strong>Doctor Notes:</strong> ${apt.notes}</p>` : ''}
          ${prescHtml}
          ${billHtml}
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<p class="text-danger">${err.message}</p>`;
  }
}

// 7. Admin Dashboard & Reports (Module 12)
async function loadAdminReports() {
  if (!currentToken || currentUser.role !== 'Admin') return;

  try {
    // 1. Overall stats
    const apptRes = await fetch(`${API_BASE}/admin/reports/appointments?period=daily&days=30`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const apptData = await apptRes.json();
    if (apptRes.ok) {
      document.getElementById('kpiTotalAppts').textContent = apptData.data.totalAppointments;

      const breakdown = apptData.data.statusBreakdown || [];
      const completedCount = (breakdown.find(b => b._id === 'Completed') || {}).count || 0;
      const confirmedCount = (breakdown.find(b => b._id === 'Confirmed') || {}).count || 0;
      const cancelledCount = (breakdown.find(b => b._id === 'Cancelled') || {}).count || 0;

      document.getElementById('kpiCompleted').textContent = completedCount;
      document.getElementById('kpiConfirmed').textContent = confirmedCount;
      document.getElementById('kpiCancelled').textContent = cancelledCount;
    }

    // 2. Department load report
    const deptRes = await fetch(`${API_BASE}/admin/reports/departments?days=30`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const deptData = await deptRes.json();
    if (deptRes.ok) {
      const container = document.getElementById('deptLoadContainer');
      const rows = deptData.data || [];
      if (rows.length === 0) {
        container.innerHTML = '<p class="text-muted">No department traffic data.</p>';
      } else {
        container.innerHTML = `
          <table class="data-table">
            <thead>
              <tr><th>Department</th><th>Total Appointments</th><th>Completed</th><th>Cancelled</th></tr>
            </thead>
            <tbody>
              ${rows.map(r => `
                <tr>
                  <td><strong>${r.department}</strong></td>
                  <td>${r.totalAppointments}</td>
                  <td class="text-success">${r.completedAppointments}</td>
                  <td class="text-danger">${r.cancelledAppointments}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
    }

    // 3. Doctor utilization report
    const docRes = await fetch(`${API_BASE}/admin/reports/doctors?days=30`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const docData = await docRes.json();
    if (docRes.ok) {
      const container = document.getElementById('doctorUtilContainer');
      const rows = docData.data || [];
      if (rows.length === 0) {
        container.innerHTML = '<p class="text-muted">No doctor utilization records.</p>';
      } else {
        container.innerHTML = `
          <table class="data-table">
            <thead>
              <tr><th>Doctor</th><th>Specialization</th><th>Appointments</th><th>Completion Rate</th></tr>
            </thead>
            <tbody>
              ${rows.map(r => `
                <tr>
                  <td><strong>${r.doctor.name}</strong></td>
                  <td>${r.doctor.specialization}</td>
                  <td>${r.totalAppointments}</td>
                  <td><span class="badge badge-purple">${r.completionRate}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
    }
  } catch (err) {
    console.error('Error loading admin reports:', err);
  }
}

// 8. Notifications Module (Module 9)
async function fetchUnreadNotificationsCount() {
  if (!currentToken) return;
  try {
    const res = await fetch(`${API_BASE}/notifications?limit=1`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const data = await res.json();
    if (res.ok) {
      const unread = data.data.unreadCount || 0;
      const badge = document.getElementById('unreadBadge');
      if (unread > 0) {
        badge.textContent = unread;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  } catch (err) {
    console.error(err);
  }
}

async function openNotificationsDrawer() {
  document.getElementById('notificationsDrawer').classList.remove('hidden');
  const container = document.getElementById('notificationsList');
  container.innerHTML = '<div class="loading-spinner">Loading notifications...</div>';

  try {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    const notifs = data.data.notifications;
    if (notifs.length === 0) {
      container.innerHTML = '<p class="text-muted">No notifications.</p>';
      return;
    }

    container.innerHTML = notifs.map(n => `
      <div class="notif-item ${n.isRead ? '' : 'unread'}">
        <div class="notif-title">${n.title}</div>
        <div class="notif-message">${n.message}</div>
        <div class="notif-time">${new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<p class="text-danger">${err.message}</p>`;
  }
}

function closeNotificationsDrawer() {
  document.getElementById('notificationsDrawer').classList.add('hidden');
}

async function markAllNotificationsRead() {
  try {
    await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    showToast('All notifications marked as read.', 'success');
    openNotificationsDrawer();
    fetchUnreadNotificationsCount();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Modal and Toast Utilities
function openAuthModal(mode) {
  document.getElementById('authModal').classList.remove('hidden');
  toggleAuthForm(mode);
}

function closeAuthModal() {
  document.getElementById('authModal').classList.add('hidden');
}

function toggleAuthForm(mode) {
  const loginForm = document.getElementById('loginFormContainer');
  const regForm = document.getElementById('registerFormContainer');
  const title = document.getElementById('authModalTitle');

  if (mode === 'register') {
    loginForm.classList.add('hidden');
    regForm.classList.remove('hidden');
    title.textContent = 'Register Patient Profile';
  } else {
    loginForm.classList.remove('hidden');
    regForm.classList.add('hidden');
    title.textContent = 'Sign In to MediPulse';
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

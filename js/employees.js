/**
 * HCM Lite - Employee Management System
 * Handles CRUD operations, case-insensitive email uniqueness check,
 * cascade deletion of attendance and leave records, and credentials generation.
 */

let currentEmployeesFilter = {
  search: '',
  department: 'all'
};

let editingEmployeeId = null;
let deletingEmployeeId = null;

/**
 * Initializes the Employees page.
 */
function initEmployeesPage() {
  const admin = requireRole('admin');
  if (!admin) return;

  setupNavigationUser(admin);
  populateDepartmentFilter();
  renderEmployeesTable();
  setupFilterListeners();
}

/**
 * Populates department dropdown filter based on existing departments.
 */
function populateDepartmentFilter() {
  const select = document.getElementById('employee-dept-filter');
  if (!select) return;

  const users = getUsers();
  const departments = new Set(['Engineering', 'Marketing', 'Sales', 'Human Resources', 'Finance', 'Operations', 'Design']);
  users.forEach(u => {
    if (u.department) departments.add(u.department);
  });

  const currentVal = select.value;
  select.innerHTML = '<option value="all">All Departments</option>';
  Array.from(departments).sort().forEach(dept => {
    const opt = document.createElement('option');
    opt.value = dept;
    opt.textContent = dept;
    select.appendChild(opt);
  });
  if (currentVal) select.value = currentVal;
}

/**
 * Setup search and filter input event listeners.
 */
function setupFilterListeners() {
  const searchInput = document.getElementById('employee-search-input');
  const deptSelect = document.getElementById('employee-dept-filter');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentEmployeesFilter.search = e.target.value.trim().toLowerCase();
      renderEmployeesTable();
    });
  }

  if (deptSelect) {
    deptSelect.addEventListener('change', (e) => {
      currentEmployeesFilter.department = e.target.value;
      renderEmployeesTable();
    });
  }

  // Live Amount in Words Preview for Salary
  const salaryInput = document.getElementById('emp-salary');
  if (salaryInput) {
    salaryInput.addEventListener('input', updateSalaryWordsPreview);
    salaryInput.addEventListener('change', updateSalaryWordsPreview);
  }
}

/**
 * Updates the Amount in Words live preview card based on emp-salary input.
 */
function updateSalaryWordsPreview() {
  const salaryInput = document.getElementById('emp-salary');
  const card = document.getElementById('salary-words-card');
  const textEl = document.getElementById('salary-words-text');
  const chipEl = document.getElementById('salary-words-chip');

  if (!salaryInput || !card || !textEl || !chipEl) return;

  const num = Number(salaryInput.value);
  if (num && num > 0) {
    const formatted = typeof formatCurrency === 'function' ? formatCurrency(num) : `PKR ${num.toLocaleString()}`;
    const words = typeof numberToWords === 'function' ? numberToWords(num) : `${num}`;
    
    chipEl.textContent = formatted;
    textEl.textContent = words;
    card.style.display = 'block';
  } else {
    card.style.display = 'none';
    textEl.textContent = '';
    chipEl.textContent = 'PKR 0';
  }
}

/**
 * Renders the employee table based on current search & filter state.
 */
function renderEmployeesTable() {
  const tbody = document.getElementById('employees-table-body');
  const emptyContainer = document.getElementById('employees-empty-state');
  const tableWrapper = document.getElementById('employees-table-container');
  const countBadge = document.getElementById('employees-total-badge');

  if (!tbody) return;

  const allUsers = getUsers();
  const employees = allUsers.filter(u => u.role === 'employee');

  if (countBadge) {
    countBadge.textContent = `${employees.length} Members`;
  }

  // Filter employees
  const filtered = employees.filter(emp => {
    const matchesSearch = !currentEmployeesFilter.search ||
      emp.name.toLowerCase().includes(currentEmployeesFilter.search) ||
      emp.email.toLowerCase().includes(currentEmployeesFilter.search) ||
      (emp.designation && emp.designation.toLowerCase().includes(currentEmployeesFilter.search));

    const matchesDept = currentEmployeesFilter.department === 'all' ||
      emp.department === currentEmployeesFilter.department;

    return matchesSearch && matchesDept;
  });

  if (filtered.length === 0) {
    if (tableWrapper) tableWrapper.style.display = 'none';
    if (emptyContainer) {
      emptyContainer.style.display = 'block';
      if (employees.length === 0) {
        renderEmptyState(emptyContainer, {
          title: 'No Employees Added Yet',
          message: 'Your organization currently has no employee profiles. Click "+ Add Employee" to onboard your first team member and create their login credentials.',
          actionText: '+ Add First Employee',
          actionHandler: () => openAddEmployeeModal()
        });
      } else {
        renderEmptyState(emptyContainer, {
          title: 'No Matching Employees Found',
          message: 'Try adjusting your search query or department filter.',
          actionText: 'Reset Filters',
          actionHandler: () => {
            const sInput = document.getElementById('employee-search-input');
            const dSelect = document.getElementById('employee-dept-filter');
            if (sInput) sInput.value = '';
            if (dSelect) dSelect.value = 'all';
            currentEmployeesFilter.search = '';
            currentEmployeesFilter.department = 'all';
            renderEmployeesTable();
          }
        });
      }
    }
    return;
  }

  if (tableWrapper) tableWrapper.style.display = 'block';
  if (emptyContainer) emptyContainer.style.display = 'none';

  tbody.innerHTML = filtered.map(emp => {
    const initials = (emp.name || 'User')
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);

    return `
      <tr style="height: 64px;">
        <td data-label="Employee" style="vertical-align: middle;">
          <div class="user-cell">
            <div class="avatar avatar-teal" style="background: linear-gradient(135deg, #0F9D8A 0%, #12B5A0 100%); flex-shrink: 0;" title="${escapeHtml(emp.name)}">${initials}</div>
            <div style="min-width: 0;">
              <div class="user-cell-name" style="font-weight: 700; white-space: nowrap;">${escapeHtml(emp.name)}</div>
              <div class="user-cell-sub" style="color: var(--text-muted); font-size: 0.78rem; white-space: nowrap;">${escapeHtml(emp.designation || 'Staff Member')}</div>
            </div>
          </div>
        </td>
        <td data-label="Work Email" style="vertical-align: middle;">
          <span style="font-family: monospace; font-size: 0.85rem; color: var(--text-muted);">${escapeHtml(emp.email)}</span>
        </td>
        <td data-label="Department" style="vertical-align: middle;">
          <span class="badge badge-purple" style="font-weight: 600;">${escapeHtml(emp.department || 'General')}</span>
        </td>
        <td data-label="Monthly Salary" style="vertical-align: middle;">
          <span style="font-weight: 800; color: var(--text); font-size: 0.95rem;">${formatCurrency(emp.salary)}</span>
        </td>
        <td data-label="Joining Date" style="vertical-align: middle;">
          <span style="color: var(--text-muted); font-size: 0.85rem;">${formatDate(emp.joinDate)}</span>
        </td>
        <td data-label="Phone" style="vertical-align: middle;">
          <span style="color: var(--text-muted); font-size: 0.85rem;">${escapeHtml(emp.phone || '-')}</span>
        </td>
        <td data-label="Actions" style="text-align: right; vertical-align: middle;">
          <div class="d-flex gap-1 justify-content-end">
            <button class="btn btn-secondary btn-icon btn-sm" onclick="openEditEmployeeModal('${emp.id}')" title="Edit Profile">
              <i data-lucide="edit-3" style="width: 15px; height: 15px;"></i>
            </button>
            <button class="btn btn-secondary btn-icon btn-sm text-danger" onclick="openDeleteEmployeeModal('${emp.id}')" title="Delete Profile">
              <i data-lucide="trash-2" style="width: 15px; height: 15px;"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

/**
 * Opens modal to onboard a new employee.
 */
function openAddEmployeeModal() {
  editingEmployeeId = null;
  const form = document.getElementById('employee-form');
  if (form) form.reset();

  const title = document.getElementById('employee-modal-title');
  if (title) title.textContent = 'Onboard New Employee';

  const passGroup = document.getElementById('emp-password-group');
  if (passGroup) passGroup.style.display = 'block';

  const passInput = document.getElementById('emp-password');
  if (passInput) {
    passInput.required = true;
    passInput.placeholder = 'Temporary login password (min 6 chars)';
  }

  const joinDateInput = document.getElementById('emp-join-date');
  if (joinDateInput) joinDateInput.value = todayStr();

  updateSalaryWordsPreview();
  clearAllFieldErrors(document.getElementById('employee-modal'));
  openModal('employee-modal');
}

/**
 * Opens modal to edit an existing employee.
 * @param {string} id 
 */
function openEditEmployeeModal(id) {
  const user = getUserById(id);
  if (!user) {
    showToast('Employee not found', 'error');
    return;
  }

  editingEmployeeId = id;
  const title = document.getElementById('employee-modal-title');
  if (title) title.textContent = `Edit Profile: ${user.name}`;

  document.getElementById('emp-name').value = user.name || '';
  document.getElementById('emp-email').value = user.email || '';
  document.getElementById('emp-department').value = user.department || 'Engineering';
  document.getElementById('emp-designation').value = user.designation || '';
  document.getElementById('emp-salary').value = user.salary || '';
  document.getElementById('emp-join-date').value = user.joinDate || todayStr();
  document.getElementById('emp-phone').value = user.phone || '';

  // Password is optional during edit
  const passGroup = document.getElementById('emp-password-group');
  if (passGroup) passGroup.style.display = 'block';
  const passInput = document.getElementById('emp-password');
  if (passInput) {
    passInput.required = false;
    passInput.value = '';
    passInput.placeholder = 'Leave blank to retain current password';
  }

  updateSalaryWordsPreview();
  clearAllFieldErrors(document.getElementById('employee-modal'));
  openModal('employee-modal');
}

/**
 * Handles employee form submission (Add or Edit).
 * @param {Event} e 
 */
function handleSaveEmployee(e) {
  e.preventDefault();

  const nameInput = document.getElementById('emp-name');
  const emailInput = document.getElementById('emp-email');
  const passInput = document.getElementById('emp-password');
  const deptInput = document.getElementById('emp-department');
  const desigInput = document.getElementById('emp-designation');
  const salaryInput = document.getElementById('emp-salary');
  const joinDateInput = document.getElementById('emp-join-date');
  const phoneInput = document.getElementById('emp-phone');

  clearAllFieldErrors(document.getElementById('employee-modal'));

  let hasError = false;

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passInput.value;
  const department = deptInput.value.trim();
  const designation = desigInput.value.trim();
  const salary = Number(salaryInput.value);
  const joinDate = joinDateInput.value;
  const phone = phoneInput.value.trim();

  if (!name) {
    showFieldError(nameInput, 'Full name is required');
    hasError = true;
  }

  if (!email || !isValidEmail(email)) {
    showFieldError(emailInput, 'A valid email address is required');
    hasError = true;
  }

  // Check email uniqueness (case-insensitive across all users)
  const users = getUsers();
  const duplicate = users.find(u => 
    u.email.toLowerCase() === email.toLowerCase() && 
    u.id !== editingEmployeeId
  );

  if (duplicate) {
    showFieldError(emailInput, 'An account with this email address already exists');
    hasError = true;
  }

  // Password validation: required for new employee, min 6 chars if provided
  if (!editingEmployeeId) {
    if (!password || password.length < 6) {
      showFieldError(passInput, 'Temporary password is required (minimum 6 characters)');
      hasError = true;
    }
  } else if (password && password.length < 6) {
    showFieldError(passInput, 'New password must be at least 6 characters');
    hasError = true;
  }

  if (!salary || salary <= 0) {
    showFieldError(salaryInput, 'Monthly salary must be a positive number greater than 0');
    hasError = true;
  }

  if (!joinDate) {
    showFieldError(joinDateInput, 'Joining date is required');
    hasError = true;
  }

  if (hasError) return;

  if (editingEmployeeId) {
    // Update existing
    const idx = users.findIndex(u => u.id === editingEmployeeId);
    if (idx !== -1) {
      users[idx].name = name;
      users[idx].email = email.toLowerCase();
      users[idx].department = department || 'General';
      users[idx].designation = designation || 'Staff Member';
      users[idx].salary = salary;
      users[idx].joinDate = joinDate;
      users[idx].phone = phone;
      if (password) {
        users[idx].password = password;
      }
      saveUsers(users);
      showToast('Employee details updated successfully!', 'success');
    }
    closeModal('employee-modal');
    renderEmployeesTable();
    populateDepartmentFilter();
  } else {
    // Create new employee
    const newEmployee = {
      id: generateId('usr'),
      name: name,
      email: email.toLowerCase(),
      password: password,
      role: 'employee',
      department: department || 'Engineering',
      designation: designation || 'Associate',
      salary: salary,
      joinDate: joinDate,
      phone: phone
    };

    users.push(newEmployee);
    saveUsers(users);

    closeModal('employee-modal');
    renderEmployeesTable();
    populateDepartmentFilter();

    // Show Credentials Created Card
    showCredentialsCard({
      name: newEmployee.name,
      email: newEmployee.email,
      password: newEmployee.password,
      designation: newEmployee.designation
    });
  }
}

/**
 * Displays the "Credentials Created" card with quick copy button.
 * @param {Object} credentials 
 */
function showCredentialsCard({ name, email, password, designation }) {
  const container = document.getElementById('credentials-card-content');
  if (!container) return;

  container.innerHTML = `
    <div class="credentials-badge mb-3">
      <i data-lucide="check-circle-2" style="width: 16px; height: 16px;"></i>
      Login Credentials Generated
    </div>
    <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.35rem;">${escapeHtml(name)}</h3>
    <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.5rem;">${escapeHtml(designation)} &bull; Employee Account</p>

    <div class="credentials-box">
      <div class="credentials-row">
        <span class="credentials-label">Portal URL:</span>
        <span class="credentials-val" style="font-family: monospace;">Relative: index.html</span>
      </div>
      <div class="credentials-row">
        <span class="credentials-label">Login Email:</span>
        <span class="credentials-val" id="cred-display-email" style="font-family: monospace; font-weight: 600;">${escapeHtml(email)}</span>
      </div>
      <div class="credentials-row">
        <span class="credentials-label">Temporary Password:</span>
        <span class="credentials-val" id="cred-display-pass" style="font-family: monospace; font-weight: 600; color: var(--teal-600);">${escapeHtml(password)}</span>
      </div>
    </div>

    <div class="d-flex gap-2 mt-4">
      <button class="btn btn-primary btn-block" id="btn-copy-credentials" onclick="copyCredentials('${escapeHtml(email)}', '${escapeHtml(password)}')">
        <i data-lucide="copy" style="width: 16px; height: 16px;"></i>
        <span>Copy Login Credentials</span>
      </button>
      <button class="btn btn-secondary" onclick="closeModal('credentials-modal')">
        <span>Dismiss</span>
      </button>
    </div>
  `;

  if (window.lucide) lucide.createIcons();
  openModal('credentials-modal');
}

/**
 * Copies employee credentials to clipboard.
 * @param {string} email 
 * @param {string} password 
 */
function copyCredentials(email, password) {
  const text = `HCM Lite Login Credentials:\nEmail: ${email}\nPassword: ${password}\nPlease log in and change your password.`;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('btn-copy-credentials');
    if (btn) {
      btn.innerHTML = `<i data-lucide="check" style="width: 16px; height: 16px;"></i> <span>Copied to Clipboard!</span>`;
      if (window.lucide) lucide.createIcons();
      setTimeout(() => {
        btn.innerHTML = `<i data-lucide="copy" style="width: 16px; height: 16px;"></i> <span>Copy Login Credentials</span>`;
        if (window.lucide) lucide.createIcons();
      }, 2500);
    }
    showToast('Credentials copied to clipboard!', 'success');
  }).catch(() => {
    showToast('Failed to copy. Please manually select the credentials.', 'warning');
  });
}

/**
 * Opens delete confirmation dialog.
 * @param {string} id 
 */
function openDeleteEmployeeModal(id) {
  const currentAdmin = getCurrentUser();
  if (currentAdmin && currentAdmin.id === id) {
    showToast('Security Alert: You cannot delete your own administrator account!', 'error');
    return;
  }

  const user = getUserById(id);
  if (!user) return;

  deletingEmployeeId = id;
  const nameEl = document.getElementById('delete-employee-name');
  if (nameEl) nameEl.textContent = user.name;

  openModal('delete-employee-modal');
}

/**
 * Confirms employee deletion with cascade deletion of attendance and leave records.
 */
function confirmDeleteEmployee() {
  if (!deletingEmployeeId) return;

  const currentAdmin = getCurrentUser();
  if (currentAdmin && currentAdmin.id === deletingEmployeeId) {
    showToast('Administrator cannot delete self', 'error');
    closeModal('delete-employee-modal');
    return;
  }

  // 1. Remove from users
  const users = getUsers().filter(u => u.id !== deletingEmployeeId);
  saveUsers(users);

  // 2. Cascade delete attendance records
  const attendance = getAttendance().filter(a => a.userId !== deletingEmployeeId);
  saveAttendance(attendance);

  // 3. Cascade delete leave records
  const leaves = getLeaves().filter(l => l.userId !== deletingEmployeeId);
  saveLeaves(leaves);

  showToast('Employee and all associated records deleted permanently', 'success');
  closeModal('delete-employee-modal');
  deletingEmployeeId = null;

  renderEmployeesTable();
  populateDepartmentFilter();
}

/**
 * HCM Lite - Authentication & Access Control
 * Manages first-run setup, credentials verification, session storage,
 * role-based route guards, and password management.
 */

/**
 * Checks if this is a fresh setup (no company configured or no admin user).
 * @returns {boolean}
 */
function isFirstRun() {
  const company = getCompany();
  const users = getUsers();
  const hasAdmin = users.some(u => u.role === 'admin');
  return (!company || !hasAdmin);
}

/**
 * Performs First-Run Company & Admin Setup.
 * @param {Object} data - { companyName, adminName, email, password }
 * @returns {Object} { success: boolean, error?: string, user?: Object }
 */
function setupFirstRun({ companyName, adminName, email, password }) {
  if (!companyName || !companyName.trim()) {
    return { success: false, error: 'Company name is required' };
  }
  if (!adminName || !adminName.trim()) {
    return { success: false, error: 'Admin full name is required' };
  }
  if (!email || !isValidEmail(email)) {
    return { success: false, error: 'A valid email is required' };
  }
  if (!password || password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters' };
  }

  // 1. Create company record with standard defaults
  const company = {
    name: companyName.trim(),
    officeStart: '09:00',
    graceMinutes: 15,
    yearlyLeaveQuota: 20,
    workingDays: [1, 2, 3, 4, 5] // Monday through Friday
  };
  saveCompany(company);

  // 2. Create the first admin user
  const adminUser = {
    id: generateId('usr'),
    name: adminName.trim(),
    email: email.trim().toLowerCase(),
    password: password,
    role: 'admin',
    department: 'Management',
    designation: 'System Administrator',
    salary: 200000,
    joinDate: todayStr(),
    phone: ''
  };

  const users = getUsers();
  users.push(adminUser);
  saveUsers(users);

  // 3. Establish session
  saveSession({
    userId: adminUser.id,
    role: adminUser.role
  });

  return { success: true, user: adminUser };
}

/**
 * Authenticates user credentials.
 * @param {string} email 
 * @param {string} password 
 * @returns {Object} { success: boolean, error?: string, user?: Object }
 */
function login(email, password) {
  if (!email || !password) {
    return { success: false, error: 'Email and password are required' };
  }

  const user = getUserByEmail(email);
  if (!user) {
    return { success: false, error: 'Invalid email or password' };
  }

  if (user.password !== password) {
    return { success: false, error: 'Invalid email or password' };
  }

  // Set session
  saveSession({
    userId: user.id,
    role: user.role
  });

  return { success: true, user };
}

/**
 * Logs out the current user and clears session.
 * @param {string} redirectPath - default to index.html
 */
function logout(redirectPath = '../index.html') {
  clearSession();
  window.location.href = redirectPath;
}

/**
 * Role Route Guard: Call at top of inner pages.
 * - Not logged in -> redirect to login (index.html)
 * - Employee accessing admin page -> redirect to employee.html
 * - Admin accessing employee-only page -> redirect to admin.html
 * 
 * @param {'admin'|'employee'|'any'} requiredRole 
 * @param {string} relativeLoginPath - Path back to index.html
 * @returns {Object|null} The current authenticated user object
 */
function requireRole(requiredRole = 'any', relativeLoginPath = '../index.html') {
  const session = getSession();
  if (!session || !session.userId) {
    window.location.replace(relativeLoginPath);
    return null;
  }

  const user = getCurrentUser();
  if (!user) {
    clearSession();
    window.location.replace(relativeLoginPath);
    return null;
  }

  // Check role permissions
  if (requiredRole === 'admin' && user.role !== 'admin') {
    // Unauthorized employee attempting to visit admin page
    window.location.replace('employee.html');
    return null;
  }

  if (requiredRole === 'employee' && user.role !== 'employee') {
    // Admin attempting to visit employee-only specific page
    window.location.replace('admin.html');
    return null;
  }

  return user;
}

/**
 * Changes password for the currently active user.
 * @param {string} currentPassword 
 * @param {string} newPassword 
 * @returns {Object} { success: boolean, error?: string }
 */
function changePassword(currentPassword, newPassword) {
  const user = getCurrentUser();
  if (!user) {
    return { success: false, error: 'Session expired. Please log in again.' };
  }

  if (user.password !== currentPassword) {
    return { success: false, error: 'Current password does not match' };
  }

  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'New password must be at least 6 characters' };
  }

  const users = getUsers();
  const idx = users.findIndex(u => u.id === user.id);
  if (idx === -1) {
    return { success: false, error: 'User record not found' };
  }

  users[idx].password = newPassword;
  saveUsers(users);

  return { success: true };
}

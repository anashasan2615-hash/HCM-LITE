/**
 * HCM Lite - Storage Manager
 * Encapsulates all LocalStorage operations.
 * GUARANTEE: Starts completely empty. Zero seed or dummy data injected.
 */

const STORAGE_KEYS = {
  COMPANY: 'hcm_company',
  USERS: 'hcm_users',
  ATTENDANCE: 'hcm_attendance',
  LEAVES: 'hcm_leaves',
  SESSION: 'hcm_session',
  ANNOUNCEMENTS: 'hcm_announcements',
  THEME: 'hcm_theme',
  LLM_KEY: 'hcm_demo_llm_key'
};

/**
 * Generic getter with fallback
 * @param {string} key 
 * @param {*} fallback 
 * @returns {*}
 */
function getData(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${key} from localStorage:`, err);
    return fallback;
  }
}

/**
 * Generic setter
 * @param {string} key 
 * @param {*} value 
 */
function setData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error writing ${key} to localStorage:`, err);
  }
}

// ----------------------------------------------------
// Entity Specific Helpers
// ----------------------------------------------------

// Company
function getCompany() {
  return getData(STORAGE_KEYS.COMPANY, null);
}

function saveCompany(companyData) {
  setData(STORAGE_KEYS.COMPANY, companyData);
}

// Users
function getUsers() {
  return getData(STORAGE_KEYS.USERS, []);
}

function saveUsers(users) {
  setData(STORAGE_KEYS.USERS, users);
}

function getUserById(id) {
  if (!id) return null;
  const users = getUsers();
  return users.find(u => u.id === id) || null;
}

function getUserByEmail(email) {
  if (!email) return null;
  const cleanEmail = email.trim().toLowerCase();
  const users = getUsers();
  return users.find(u => u.email.trim().toLowerCase() === cleanEmail) || null;
}

// Session & Active User
function getSession() {
  return getData(STORAGE_KEYS.SESSION, null);
}

function saveSession(session) {
  setData(STORAGE_KEYS.SESSION, session);
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.SESSION);
}

function getCurrentUser() {
  const session = getSession();
  if (!session || !session.userId) return null;
  return getUserById(session.userId);
}

// Attendance
function getAttendance() {
  return getData(STORAGE_KEYS.ATTENDANCE, []);
}

function saveAttendance(records) {
  setData(STORAGE_KEYS.ATTENDANCE, records);
}

// Leaves
function getLeaves() {
  return getData(STORAGE_KEYS.LEAVES, []);
}

function saveLeaves(leaves) {
  setData(STORAGE_KEYS.LEAVES, leaves);
}

// Announcements
function getAnnouncements() {
  return getData(STORAGE_KEYS.ANNOUNCEMENTS, []);
}

function saveAnnouncements(announcements) {
  setData(STORAGE_KEYS.ANNOUNCEMENTS, announcements);
}

/**
 * HCM Lite - Utilities
 * Date/time math, currency formatting, working-day calculations, and ID generation.
 * All date operations use local time strings to avoid timezone shift bugs.
 */

/**
 * Returns today's date formatted as "YYYY-MM-DD" in local time.
 * @returns {string}
 */
function todayStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns current time formatted as "HH:MM" (24-hour) in local time.
 * @returns {string}
 */
function currentTimeStr() {
  const d = new Date();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${mins}`;
}

/**
 * Generates a unique ID with an entity prefix.
 * @param {string} prefix 
 * @returns {string}
 */
function generateId(prefix = 'id') {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 7);
  return `${prefix}_${ts}_${rand}`;
}

/**
 * Formats a "YYYY-MM-DD" date string to a human-friendly format (e.g., "Oct 24, 2026").
 * @param {string} dateStr 
 * @param {boolean} includeDay 
 * @returns {string}
 */
function formatDate(dateStr, includeDay = false) {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day);

  const options = {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  };
  if (includeDay) {
    options.weekday = 'short';
  }
  return d.toLocaleDateString('en-US', options);
}

/**
 * Converts 24-hr "HH:MM" to 12-hr AM/PM format (e.g., "09:15 AM").
 * @param {string} timeStr 
 * @returns {string}
 */
function formatTime(timeStr) {
  if (!timeStr) return '-';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const mins = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  return `${String(hours).padStart(2, '0')}:${mins} ${ampm}`;
}

/**
 * Formats a number as PKR with commas (e.g. 150000 -> "PKR 150,000").
 * @param {number|string} amount 
 * @returns {string}
 */
function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return 'PKR ' + num.toLocaleString('en-PK', { maximumFractionDigits: 0 });
}

/**
 * Parses "HH:MM" into total minutes from 00:00.
 * @param {string} timeStr 
 * @returns {number}
 */
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Converts minutes to "HH:MM" format.
 * @param {number} totalMinutes 
 * @returns {string}
 */
function minutesToTime(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.floor(totalMinutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Checks if a given date string "YYYY-MM-DD" falls on an active company working day.
 * Standard JS getDay(): 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat.
 * @param {string} dateStr 
 * @param {Array<number>} workingDays - e.g. [1, 2, 3, 4, 5]
 * @returns {boolean}
 */
function isWorkingDay(dateStr, workingDays = [1, 2, 3, 4, 5]) {
  if (!dateStr) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dayOfWeek = new Date(y, m - 1, d).getDay();
  return workingDays.includes(dayOfWeek);
}

/**
 * Counts total company working days between fromStr and toStr inclusive.
 * @param {string} fromStr - "YYYY-MM-DD"
 * @param {string} toStr - "YYYY-MM-DD"
 * @param {Array<number>} workingDays - e.g. [1, 2, 3, 4, 5]
 * @returns {number}
 */
function getWorkingDaysBetween(fromStr, toStr, workingDays = [1, 2, 3, 4, 5]) {
  if (!fromStr || !toStr) return 0;
  if (fromStr > toStr) return 0;

  const [y1, m1, d1] = fromStr.split('-').map(Number);
  const [y2, m2, d2] = toStr.split('-').map(Number);

  let current = new Date(y1, m1 - 1, d1);
  const end = new Date(y2, m2 - 1, d2);
  let count = 0;

  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (workingDays.includes(dayOfWeek)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Calculates total working days in a specific calendar month.
 * @param {number} year 
 * @param {number} monthIndex - 0 to 11
 * @param {Array<number>} workingDays 
 * @returns {number}
 */
function getWorkingDaysInMonth(year, monthIndex, workingDays = [1, 2, 3, 4, 5]) {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  let count = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const dayOfWeek = new Date(year, monthIndex, day).getDay();
    if (workingDays.includes(dayOfWeek)) {
      count++;
    }
  }
  return count;
}

/**
 * Validates email format with regex.
 * @param {string} email 
 * @returns {boolean}
 */
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

/**
 * Computes monthly attendance breakdown for an employee.
 * Crucial Business Rule:
 * Absent is COMPUTED, never stored in hcm_attendance.
 * A working day with no record = absent.
 * Do NOT count:
 * - non-working days per settings
 * - days before employee joinDate
 * - future days
 * - today (until it ends, or if today has no record, not marked absent until day completes)
 * - days covered by an approved leave
 *
 * @param {Object} user 
 * @param {number} year 
 * @param {number} monthIndex - 0 to 11
 * @param {Array} attendanceRecords 
 * @param {Array} leavesList 
 * @param {Object} company 
 * @returns {Object} { workingDaysInMonth, eligibleDaysPassed, present, late, halfDay, approvedLeaveDays, absent }
 */
function computeMonthlyStats(user, year, monthIndex, attendanceRecords, leavesList, company) {
  const workingDays = (company && company.workingDays) || [1, 2, 3, 4, 5];
  const totalDaysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const workingDaysInMonth = getWorkingDaysInMonth(year, monthIndex, workingDays);
  
  const today = todayStr();
  const [tY, tM, tD] = today.split('-').map(Number);
  const isCurrentMonth = (year === tY && monthIndex === (tM - 1));

  let presentCount = 0;
  let lateCount = 0;
  let halfDayCount = 0;
  let approvedLeaveCount = 0;
  let absentCount = 0;
  let eligibleDaysPassed = 0;

  // Filter user records for this month
  const monthPrefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
  const userMonthAttendance = attendanceRecords.filter(a => a.userId === user.id && a.date.startsWith(monthPrefix));
  const userApprovedLeaves = leavesList.filter(l => l.userId === user.id && l.status === 'approved');

  // Loop through every day of the month up to today (or end of month if in past)
  for (let day = 1; day <= totalDaysInMonth; day++) {
    const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Skip future days
    if (dateStr > today) continue;

    // Rule: Don't count days before joinDate
    if (user.joinDate && dateStr < user.joinDate) continue;

    // Rule: Skip non-working days
    if (!isWorkingDay(dateStr, workingDays)) continue;

    // If it's today and today hasn't finished, does user have an attendance record?
    const record = userMonthAttendance.find(a => a.date === dateStr);

    if (record) {
      eligibleDaysPassed++;
      if (record.status === 'half_day') {
        halfDayCount++;
      } else if (record.status === 'late' || record.late) {
        lateCount++;
        presentCount++;
      } else {
        presentCount++;
      }
      continue;
    }

    // Check if covered by an approved leave
    const hasApprovedLeave = userApprovedLeaves.some(l => dateStr >= l.from && dateStr <= l.to);
    if (hasApprovedLeave) {
      eligibleDaysPassed++;
      approvedLeaveCount++;
      continue;
    }

    // If it is today and no record exists, today is in-progress (not marked absent yet)
    if (dateStr === today) {
      // Not counted as absent until day ends
      continue;
    }

    // Otherwise, past working day after joinDate with no attendance and no leave = ABSENT
    eligibleDaysPassed++;
    absentCount++;
  }

  return {
    workingDaysInMonth,
    eligibleDaysPassed,
    present: presentCount,
    late: lateCount,
    halfDay: halfDayCount,
    approvedLeaveDays: approvedLeaveCount,
    absent: absentCount
  };
}

/**
 * Calculates net salary and deductions based on the exact formula:
 * perDay = monthlySalary / workingDaysInMonth
 * deduction = perDay * (absentDays + 0.5 * halfDays)
 * net = salary - deduction
 *
 * @param {number} monthlySalary 
 * @param {number} workingDaysInMonth 
 * @param {number} absentDays 
 * @param {number} halfDays 
 * @returns {Object} { perDayRate, deduction, netSalary }
 */
function calculatePayroll(monthlySalary, workingDaysInMonth, absentDays, halfDays) {
  const salary = Number(monthlySalary) || 0;
  const workingDays = Math.max(Number(workingDaysInMonth) || 1, 1);
  const absent = Number(absentDays) || 0;
  const half = Number(halfDays) || 0;

  const perDayRate = salary / workingDays;
  const deduction = Math.round(perDayRate * (absent + 0.5 * half));
  const netSalary = Math.max(0, Math.round(salary - deduction));

  return {
    perDayRate: Math.round(perDayRate),
    deduction,
    netSalary
  };
}

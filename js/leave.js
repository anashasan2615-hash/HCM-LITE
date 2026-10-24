/**
 * HCM Lite - Leave Management
 * Handles leave application, working-day calculations, quota verification,
 * date-overlap detection, and status transitions (Pending -> Approved / Rejected).
 */

/**
 * Calculates working days between two dates based on company working days setting.
 * @param {string} fromStr 
 * @param {string} toStr 
 * @returns {number}
 */
function calculateLeaveWorkingDays(fromStr, toStr) {
  const company = getCompany() || { workingDays: [1, 2, 3, 4, 5] };
  return getWorkingDaysBetween(fromStr, toStr, company.workingDays || [1, 2, 3, 4, 5]);
}

/**
 * Validates and submits a new leave application for an employee.
 * @param {Object} param0 - { userId, type, from, to, reason }
 * @returns {Object} { success: boolean, message: string, leave?: Object }
 */
function submitLeaveApplication({ userId, type, from, to, reason }) {
  if (!userId) {
    return { success: false, message: 'User authentication missing.' };
  }
  if (!from || !to) {
    return { success: false, message: 'Please select both start and end dates.' };
  }
  if (from > to) {
    return { success: false, message: 'Start date cannot be after end date.' };
  }
  if (!reason || !reason.trim()) {
    return { success: false, message: 'Please provide a reason for your leave request.' };
  }

  const company = getCompany() || { yearlyLeaveQuota: 20, workingDays: [1, 2, 3, 4, 5] };
  const requestedWorkingDays = calculateLeaveWorkingDays(from, to);

  if (requestedWorkingDays === 0) {
    return {
      success: false,
      message: 'The selected date range does not contain any active company working days.'
    };
  }

  const allLeaves = getLeaves();
  const userLeaves = allLeaves.filter(l => l.userId === userId);

  // Rule: Check for date overlap with any pending or approved leaves
  const hasOverlap = userLeaves.some(l => {
    if (l.status === 'rejected') return false; // Rejected leaves do not conflict
    // Overlap condition: (StartA <= EndB) and (EndA >= StartB)
    return (from <= l.to && to >= l.from);
  });

  if (hasOverlap) {
    return {
      success: false,
      message: 'Your leave dates overlap with an existing pending or approved leave request.'
    };
  }

  // Rule: Cannot exceed yearly quota
  // Formula: approved + pending + requested > quota -> block
  let approvedDays = 0;
  let pendingDays = 0;

  userLeaves.forEach(l => {
    if (l.status === 'approved') approvedDays += (l.days || 0);
    else if (l.status === 'pending') pendingDays += (l.days || 0);
  });

  const quota = Number(company.yearlyLeaveQuota) || 20;
  const totalClaimed = approvedDays + pendingDays + requestedWorkingDays;

  if (totalClaimed > quota) {
    const availableQuota = Math.max(0, quota - (approvedDays + pendingDays));
    return {
      success: false,
      message: `Quota Exceeded! You have ${availableQuota} days available (Quota: ${quota}, Used: ${approvedDays}, Pending: ${pendingDays}). Requested: ${requestedWorkingDays} days.`
    };
  }

  // Create new leave record
  const newLeave = {
    id: generateId('lev'),
    userId: userId,
    type: type || 'casual',
    from: from,
    to: to,
    days: requestedWorkingDays,
    reason: reason.trim(),
    status: 'pending',
    comment: '',
    appliedOn: todayStr()
  };

  allLeaves.push(newLeave);
  saveLeaves(allLeaves);

  return {
    success: true,
    message: `Leave application for ${requestedWorkingDays} working day(s) submitted successfully!`,
    leave: newLeave
  };
}

/**
 * Gets employee leave summary statistics.
 * @param {string} userId 
 * @returns {Object} { quota, approvedDays, pendingDays, remainingDays }
 */
function getEmployeeLeaveSummary(userId) {
  const company = getCompany() || { yearlyLeaveQuota: 20 };
  const quota = Number(company.yearlyLeaveQuota) || 20;

  const userLeaves = getLeaves().filter(l => l.userId === userId);
  let approvedDays = 0;
  let pendingDays = 0;

  userLeaves.forEach(l => {
    if (l.status === 'approved') approvedDays += (l.days || 0);
    else if (l.status === 'pending') pendingDays += (l.days || 0);
  });

  const remainingDays = Math.max(0, quota - approvedDays);

  return {
    quota,
    approvedDays,
    pendingDays,
    remainingDays
  };
}

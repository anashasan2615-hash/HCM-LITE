/**
 * HCM Lite - Attendance Management
 * Enforces business rules:
 * - One check-in per day; check-out only after check-in; only on working days.
 * - Late if checkIn > officeStart + graceMinutes. Else present.
 * - On check-out: hours = out - in. If hours < 5 -> status "half_day" (preserves late flag).
 *   Otherwise status = late ? "late" : "present".
 * - Absent is COMPUTED, never stored in DB.
 * - Camera check-in with graceful fallback.
 * - Attendance CSV export.
 */

/**
 * Gets attendance record for an employee for a specific date.
 * @param {string} userId 
 * @param {string} dateStr 
 * @returns {Object|null}
 */
function getAttendanceForDate(userId, dateStr = todayStr()) {
  const records = getAttendance();
  return records.find(r => r.userId === userId && r.date === dateStr) || null;
}

/**
 * Executes Check-In for an employee.
 * @param {string} userId 
 * @param {string} [customTime] - Optional HH:MM for testing or manual override
 * @returns {Object} { success: boolean, message: string, record?: Object }
 */
function performCheckIn(userId, customTime = null) {
  const company = getCompany() || {
    officeStart: '09:00',
    graceMinutes: 15,
    workingDays: [1, 2, 3, 4, 5]
  };

  const today = todayStr();
  const workingDays = company.workingDays || [1, 2, 3, 4, 5];

  // Rule: Check-in only on working days
  if (!isWorkingDay(today, workingDays)) {
    return {
      success: false,
      message: 'Today is designated as a company non-working day. Check-in is not required.'
    };
  }

  // Rule: One check-in per day
  const existing = getAttendanceForDate(userId, today);
  if (existing) {
    return {
      success: false,
      message: `You have already checked in today at ${formatTime(existing.checkIn)}.`
    };
  }

  const checkInTime = customTime || currentTimeStr();
  const officeStartMins = timeToMinutes(company.officeStart || '09:00');
  const graceMinutes = Number(company.graceMinutes) || 15;
  const thresholdMins = officeStartMins + graceMinutes;
  const checkInMins = timeToMinutes(checkInTime);

  const isLate = checkInMins > thresholdMins;
  const status = isLate ? 'late' : 'present';

  const newRecord = {
    id: generateId('att'),
    userId: userId,
    date: today,
    checkIn: checkInTime,
    checkOut: null,
    hours: 0,
    status: status,
    late: isLate
  };

  const records = getAttendance();
  records.push(newRecord);
  saveAttendance(records);

  const statusText = isLate ? 'marked as Late (arrived after grace period)' : 'marked On-Time';
  return {
    success: true,
    message: `Checked in successfully at ${formatTime(checkInTime)} (${statusText}).`,
    record: newRecord
  };
}

/**
 * Executes Check-Out for an employee.
 * @param {string} userId 
 * @param {string} [customTime] 
 * @returns {Object} { success: boolean, message: string, record?: Object }
 */
function performCheckOut(userId, customTime = null) {
  const today = todayStr();
  const records = getAttendance();
  const idx = records.findIndex(r => r.userId === userId && r.date === today);

  // Rule: Check-out only after check-in
  if (idx === -1) {
    return {
      success: false,
      message: 'Cannot check out: You have not checked in today yet.'
    };
  }

  const record = records[idx];
  if (record.checkOut) {
    return {
      success: false,
      message: `You have already checked out today at ${formatTime(record.checkOut)}.`
    };
  }

  const checkOutTime = customTime || currentTimeStr();
  const inMins = timeToMinutes(record.checkIn);
  const outMins = timeToMinutes(checkOutTime);

  // Calculate duration
  let diffMins = outMins - inMins;
  if (diffMins < 0) diffMins = 0;
  const rawHours = diffMins / 60;
  const hoursFormatted = Math.round(rawHours * 10) / 10; // 1 decimal place

  // Rule: If hours < 5 -> status "half_day" (keep late:true flag if they were late)
  // Otherwise status = late ? "late" : "present"
  let finalStatus;
  if (hoursFormatted < 5.0) {
    finalStatus = 'half_day';
  } else {
    finalStatus = record.late ? 'late' : 'present';
  }

  record.checkOut = checkOutTime;
  record.hours = hoursFormatted;
  record.status = finalStatus;

  records[idx] = record;
  saveAttendance(records);

  const halfDayMsg = finalStatus === 'half_day' ? ' (Under 5 hours worked - marked as Half Day)' : '';
  return {
    success: true,
    message: `Checked out at ${formatTime(checkOutTime)}. Total worked: ${hoursFormatted} hrs${halfDayMsg}.`,
    record: record
  };
}

/**
 * Exports all attendance logs into a clean CSV file download.
 */
function exportAttendanceToCSV() {
  const records = getAttendance();
  const users = getUsers();
  const userMap = {};
  users.forEach(u => { userMap[u.id] = u; });

  if (records.length === 0) {
    showToast('No attendance records available to export.', 'info');
    return;
  }

  const headers = ['Record ID', 'Employee Name', 'Email', 'Department', 'Date', 'Check In', 'Check Out', 'Hours Worked', 'Status', 'Late Flag'];
  const rows = records.map(r => {
    const user = userMap[r.userId] || { name: 'Unknown', email: '-', department: '-' };
    return [
      `"${r.id}"`,
      `"${user.name}"`,
      `"${user.email}"`,
      `"${user.department || '-'}"`,
      `"${r.date}"`,
      `"${r.checkIn || '-'}"`,
      `"${r.checkOut || '-'}"`,
      r.hours || 0,
      `"${r.status}"`,
      r.late ? 'TRUE' : 'FALSE'
    ];
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `hcm_attendance_export_${todayStr()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('Attendance report exported successfully as CSV!', 'success');
}

/**
 * Camera Check-In bonus handler with webcam stream and fallback.
 * @param {string} userId 
 * @param {Function} onSuccessCallback 
 */
function startCameraCheckIn(userId, onSuccessCallback) {
  const modal = document.getElementById('camera-checkin-modal');
  const video = document.getElementById('camera-video-preview');
  const errorBox = document.getElementById('camera-error-message');
  const snapBtn = document.getElementById('btn-capture-checkin');

  if (!modal || !video) return;

  if (errorBox) errorBox.style.display = 'none';
  if (snapBtn) snapBtn.disabled = true;

  openModal('camera-checkin-modal');

  // Check WebRTC camera support
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    handleCameraFallback('Webcam access is not supported by your browser. Falling back to standard one-click check-in.');
    return;
  }

  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } })
    .then(stream => {
      video.srcObject = stream;
      window.activeCameraStream = stream;
      if (snapBtn) {
        snapBtn.disabled = false;
        snapBtn.onclick = () => {
          stopActiveCameraStream();
          closeModal('camera-checkin-modal');
          const result = performCheckIn(userId);
          if (result.success) {
            showToast(`Camera Verified! ${result.message}`, 'success');
            if (onSuccessCallback) onSuccessCallback(result.record);
          } else {
            showToast(result.message, 'warning');
          }
        };
      }
    })
    .catch(err => {
      console.warn('Camera access denied or unavailable:', err);
      handleCameraFallback('Camera permission denied or camera unavailable. You can proceed with standard instant check-in.');
    });
}

function handleCameraFallback(msg) {
  const errorBox = document.getElementById('camera-error-message');
  const snapBtn = document.getElementById('btn-capture-checkin');
  if (errorBox) {
    errorBox.textContent = msg;
    errorBox.style.display = 'block';
  }
  if (snapBtn) {
    snapBtn.disabled = false;
    snapBtn.textContent = 'Proceed with Instant Check-In';
    snapBtn.onclick = () => {
      stopActiveCameraStream();
      closeModal('camera-checkin-modal');
      const user = getCurrentUser();
      if (user) {
        const result = performCheckIn(user.id);
        if (result.success) {
          showToast(result.message, 'success');
          location.reload();
        } else {
          showToast(result.message, 'warning');
        }
      }
    };
  }
}

function stopActiveCameraStream() {
  if (window.activeCameraStream) {
    window.activeCameraStream.getTracks().forEach(track => track.stop());
    window.activeCameraStream = null;
  }
}

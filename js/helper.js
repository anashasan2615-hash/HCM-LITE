/**
 * HCM Lite - Smart Helper Assistant
 * Floating AI-themed conversational widget.
 * Features:
 * - Pure function getHelperReply(question, currentUser) enforcing role data boundaries.
 * - Admin intents: headcount, who is on leave today, late arrivals, present/absent stats, pending leaves, dept breakdown, policies.
 * - Employee intents: remaining leave balance, today's late check, weekly hours, monthly attendance breakdown, leave application status, estimated net salary.
 * - Strict isolation: employee accounts cannot query company-wide or peer records.
 * - Offline NLP intent matcher with optional fallback to user-supplied demo LLM key.
 */

/**
 * Pure function to determine response from intent and current user data scope.
 * @param {string} question 
 * @param {Object} currentUser 
 * @returns {string}
 */
function getHelperReply(question, currentUser) {
  if (!question || !question.trim()) {
    return "Hello! How can I assist you with your workforce or attendance today?";
  }

  const q = question.toLowerCase().trim();
  const isAdmin = currentUser && currentUser.role === 'admin';
  const company = getCompany() || {
    name: 'Our Organization',
    officeStart: '09:00',
    graceMinutes: 15,
    yearlyLeaveQuota: 20,
    workingDays: [1, 2, 3, 4, 5]
  };

  const today = todayStr();
  const allUsers = getUsers();
  const employees = allUsers.filter(u => u.role === 'employee');
  const allAttendance = getAttendance();
  const todayAttendance = allAttendance.filter(a => a.date === today);
  const allLeaves = getLeaves();
  const todayLeaves = allLeaves.filter(l => l.status === 'approved' && today >= l.from && today <= l.to);

  // -----------------------------------------------------------
  // GREETINGS & CASUAL
  // -----------------------------------------------------------
  if (/^(hi|hello|hey|salam|assalam|greetings|morning|afternoon)/i.test(q)) {
    const greeting = currentUser ? `Hello ${currentUser.name.split(' ')[0]}!` : 'Hello!';
    return `${greeting} I am your HCM Lite Smart Assistant. Ask me anything about attendance, leaves, schedules, or policies.`;
  }

  // -----------------------------------------------------------
  // EMPLOYEE RESTRICTION CHECK: Block company-wide queries for employees
  // -----------------------------------------------------------
  if (!isAdmin) {
    const blockedKeywords = [
      'how many employees', 'all employees', 'team salary', 'who is late',
      'who is absent', 'who is on leave', 'other employee', 'department headcount',
      'all leaves', 'all attendance', 'list employees'
    ];
    const isProbingCompanyData = blockedKeywords.some(kw => q.includes(kw));

    if (isProbingCompanyData) {
      return "🔒 <strong>Data Privacy Notice:</strong> As an employee, you can only access your own personal records (attendance, remaining leaves, and salary). Company-wide analytics are restricted to Administrators.";
    }
  }

  // -----------------------------------------------------------
  // ADMIN SPECIFIC INTENTS
  // -----------------------------------------------------------
  if (isAdmin) {
    // 1. Employee headcount & department breakdown
    if (q.includes('how many employees') || q.includes('total employees') || q.includes('headcount') || q.includes('staff count')) {
      const depts = {};
      employees.forEach(e => {
        const d = e.department || 'General';
        depts[d] = (depts[d] || 0) + 1;
      });
      const deptBreakdown = Object.entries(depts).map(([d, c]) => `${d}: ${c}`).join(', ');
      return `📊 <strong>Total Employees:</strong> ${employees.length} active members across ${Object.keys(depts).length} departments.<br><span style="font-size:0.85em; color:var(--text-secondary);">Breakdown: ${deptBreakdown || 'None yet'}</span>`;
    }

    // 2. Department-wise breakdown specifically
    if (q.includes('department') && (q.includes('count') || q.includes('headcount') || q.includes('employees') || q.includes('wise'))) {
      const depts = {};
      employees.forEach(e => {
        const d = e.department || 'General';
        depts[d] = (depts[d] || 0) + 1;
      });
      if (Object.keys(depts).length === 0) {
        return "No employees onboarded yet to show departmental distribution.";
      }
      const list = Object.entries(depts).map(([d, c]) => `&bull; <strong>${escapeHtml(d)}:</strong> ${c} member${c > 1 ? 's' : ''}`).join('<br>');
      return `🏢 <strong>Department Distribution:</strong><br>${list}`;
    }

    // 3. Who is on leave today
    if (q.includes('leave today') || q.includes('who is on leave') || q.includes('absent on leave')) {
      if (todayLeaves.length === 0) {
        return "🌴 <strong>Leaves Today:</strong> No employees are currently on approved leave today.";
      }
      const leaveDetails = todayLeaves.map(l => {
        const u = getUserById(l.userId);
        const name = u ? u.name : 'Unknown';
        const typeCapitalized = l.type.charAt(0).toUpperCase() + l.type.slice(1);
        return `&bull; <strong>${escapeHtml(name)}</strong> (${typeCapitalized} Leave)`;
      }).join('<br>');

      return `🌴 <strong>On Leave Today (${todayLeaves.length}):</strong><br>${leaveDetails}`;
    }

    // 4. Who was late today
    if (q.includes('who was late') || q.includes('who is late') || q.includes('late today') || q.includes('late employees')) {
      const lateToday = todayAttendance.filter(a => a.status === 'late' || a.late);
      if (lateToday.length === 0) {
        return "⏰ <strong>Punctuality Report:</strong> Awesome! No employees have arrived late today.";
      }
      const list = lateToday.map(a => {
        const u = getUserById(a.userId);
        const name = u ? u.name : 'Unknown';
        return `&bull; <strong>${escapeHtml(name)}</strong> checked in at ${formatTime(a.checkIn)}`;
      }).join('<br>');

      return `⏰ <strong>Late Arrivals Today (${lateToday.length}):</strong><br>${list}`;
    }

    // 5. Present & Absent status today
    if (q.includes('who is present') || q.includes('present today') || q.includes('absent today') || q.includes('who is absent') || q.includes('today attendance')) {
      const presentCount = todayAttendance.length;
      const onLeaveCount = todayLeaves.length;
      const notCheckedIn = Math.max(0, employees.length - (presentCount + onLeaveCount));

      return `📋 <strong>Today's Attendance Snapshot:</strong><br>` +
        `&bull; <strong>Present:</strong> ${presentCount} employee${presentCount === 1 ? '' : 's'}<br>` +
        `&bull; <strong>On Approved Leave:</strong> ${onLeaveCount}<br>` +
        `&bull; <strong>Not Checked In / Pending:</strong> ${notCheckedIn} out of ${employees.length} total staff.`;
    }

    // 6. Pending leave requests count
    if (q.includes('pending leave') || q.includes('leave requests') || q.includes('waiting approval')) {
      const pending = allLeaves.filter(l => l.status === 'pending');
      if (pending.length === 0) {
        return "✅ <strong>Leave Inbox:</strong> All caught up! There are 0 pending leave requests.";
      }
      return `📬 <strong>Pending Leave Requests:</strong> You have <strong>${pending.length}</strong> request(s) awaiting your review in the <a href="leaves.html" style="color:var(--teal-500); text-decoration:underline;">Leave Requests</a> tab.`;
    }

    // 7. Company policy / shift timing / quota
    if (q.includes('office timing') || q.includes('shift') || q.includes('grace') || q.includes('quota') || q.includes('policy')) {
      return `⚙️ <strong>Company Policy Settings:</strong><br>` +
        `&bull; <strong>Shift Starts:</strong> ${formatTime(company.officeStart || '09:00')}<br>` +
        `&bull; <strong>Grace Period:</strong> ${company.graceMinutes || 15} minutes<br>` +
        `&bull; <strong>Annual Paid Leaves:</strong> ${company.yearlyLeaveQuota || 20} days per employee<br>` +
        `&bull; <strong>Working Days:</strong> ${(company.workingDays || [1,2,3,4,5]).length} days/week.`;
    }
  }

  // -----------------------------------------------------------
  // EMPLOYEE SPECIFIC INTENTS (Self Data Only)
  // -----------------------------------------------------------
  if (!isAdmin && currentUser) {
    const userAttendance = allAttendance.filter(a => a.userId === currentUser.id);
    const userLeaves = allLeaves.filter(l => l.userId === currentUser.id);
    const approvedLeaves = userLeaves.filter(l => l.status === 'approved');
    const pendingLeaves = userLeaves.filter(l => l.status === 'pending');

    let approvedDays = 0;
    approvedLeaves.forEach(l => { approvedDays += (l.days || 0); });
    let pendingDays = 0;
    pendingLeaves.forEach(l => { pendingDays += (l.days || 0); });

    const quota = company.yearlyLeaveQuota || 20;
    const remainingDays = Math.max(0, quota - approvedDays);

    // 1. Leave balance query
    if (q.includes('leave') && (q.includes('how many') || q.includes('left') || q.includes('remaining') || q.includes('balance') || q.includes('quota'))) {
      return `🌴 <strong>Your Leave Balance:</strong><br>` +
        `&bull; <strong>Remaining:</strong> <strong>${remainingDays} days</strong><br>` +
        `&bull; <strong>Approved Used:</strong> ${approvedDays} days<br>` +
        `&bull; <strong>Pending Approval:</strong> ${pendingDays} days<br>` +
        `&bull; <strong>Total Yearly Quota:</strong> ${quota} days`;
    }

    // 2. Was I late today
    if (q.includes('late today') || q.includes('was i late') || q.includes('my arrival') || q.includes('did i arrive on time')) {
      const myTodayAtt = userAttendance.find(a => a.date === today);
      if (!myTodayAtt) {
        return "You have not checked in yet today.";
      }
      if (myTodayAtt.late || myTodayAtt.status === 'late') {
        return `⚠️ You checked in at <strong>${formatTime(myTodayAtt.checkIn)}</strong> today, which was marked <strong>Late</strong> (after the ${company.graceMinutes}m grace period).`;
      }
      return `✅ You checked in at <strong>${formatTime(myTodayAtt.checkIn)}</strong> today, perfectly <strong>On-Time</strong>!`;
    }

    // 3. Hours worked this week
    if (q.includes('hours') && (q.includes('week') || q.includes('worked'))) {
      // Calculate start of current week (Monday)
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 is Sun, 1 is Mon
      const diffToMon = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMon);
      const mondayStr = `${monday.getFullYear()}-${String(monday.getMonth()+1).padStart(2,'0')}-${String(monday.getDate()).padStart(2,'0')}`;

      const weekRecords = userAttendance.filter(a => a.date >= mondayStr && a.date <= today);
      let totalHrs = 0;
      weekRecords.forEach(r => { totalHrs += (Number(r.hours) || 0); });
      totalHrs = Math.round(totalHrs * 10) / 10;

      return `⏱️ <strong>Hours This Week:</strong> You have logged <strong>${totalHrs} hours</strong> across ${weekRecords.length} day(s) this week.`;
    }

    // 4. Monthly attendance breakdown
    if (q.includes('attendance') && (q.includes('month') || q.includes('my attendance') || q.includes('summary'))) {
      const now = new Date();
      const stats = computeMonthlyStats(currentUser, now.getFullYear(), now.getMonth(), allAttendance, allLeaves, company);
      return `📅 <strong>My Attendance This Month:</strong><br>` +
        `&bull; <strong>Present Days:</strong> ${stats.present}<br>` +
        `&bull; <strong>Late Days:</strong> ${stats.late}<br>` +
        `&bull; <strong>Half Days:</strong> ${stats.halfDay}<br>` +
        `&bull; <strong>Approved Leave Days:</strong> ${stats.approvedLeaveDays}<br>` +
        `&bull; <strong>Unexcused Absences:</strong> ${stats.absent}`;
    }

    // 5. Leave application status
    if (q.includes('my leave status') || (q.includes('leave') && q.includes('status'))) {
      if (userLeaves.length === 0) {
        return "You have not submitted any leave applications yet.";
      }
      const recent = userLeaves.slice(-3).reverse();
      const list = recent.map(l => {
        const badgeColor = l.status === 'approved' ? 'teal' : (l.status === 'rejected' ? 'red' : 'amber');
        return `&bull; <strong>${l.type.toUpperCase()}:</strong> ${formatDate(l.from)} to ${formatDate(l.to)} (${l.days} days) &mdash; <span class="badge badge-${badgeColor}">${l.status.toUpperCase()}</span>`;
      }).join('<br>');
      return `📑 <strong>Recent Leave Applications:</strong><br>${list}`;
    }

    // 6. Net salary estimate
    if (q.includes('salary') || q.includes('pay') || q.includes('net salary') || q.includes('earnings') || q.includes('deduction')) {
      const now = new Date();
      const stats = computeMonthlyStats(currentUser, now.getFullYear(), now.getMonth(), allAttendance, allLeaves, company);
      const payroll = calculatePayroll(currentUser.salary, stats.workingDaysInMonth, stats.absent, stats.halfDay);

      return `💵 <strong>Estimated Net Salary This Month:</strong><br>` +
        `&bull; <strong>Base Monthly:</strong> ${formatCurrency(currentUser.salary)}<br>` +
        `&bull; <strong>Working Days in Month:</strong> ${stats.workingDaysInMonth}<br>` +
        `&bull; <strong>Deductions:</strong> ${formatCurrency(payroll.deduction)} (${stats.absent} absences, ${stats.halfDay} half-days)<br>` +
        `&bull; <strong>Estimated Net:</strong> <strong style="color:var(--teal-600);">${formatCurrency(payroll.netSalary)}</strong><br>` +
        `<a href="payslip.html" style="font-size:0.85em; color:var(--teal-500); text-decoration:underline;">View full payslip breakdown &rarr;</a>`;
    }
  }

  // -----------------------------------------------------------
  // DEFAULT HELPFUL FALLBACK (Contextualized by Role)
  // -----------------------------------------------------------
  if (isAdmin) {
    return `🤔 I didn't quite catch that. As an administrator, you can ask me questions such as:<br>` +
      `&bull; <em>"How many employees do we have?"</em><br>` +
      `&bull; <em>"Who is on leave today?"</em><br>` +
      `&bull; <em>"Who was late today?"</em><br>` +
      `&bull; <em>"Who is present today?"</em><br>` +
      `&bull; <em>"Pending leave requests count"</em><br>` +
      `&bull; <em>"Department headcount"</em><br>` +
      `&bull; <em>"Company office timing"</em>`;
  } else {
    return `🤔 I'm not sure how to answer that. You can ask me personal questions such as:<br>` +
      `&bull; <em>"How many leaves do I have left?"</em><br>` +
      `&bull; <em>"Was I late today?"</em><br>` +
      `&bull; <em>"Hours worked this week"</em><br>` +
      `&bull; <em>"My attendance this month"</em><br>` +
      `&bull; <em>"My leave status"</em><br>` +
      `&bull; <em>"My net salary estimate"</em>`;
  }
}

/**
 * Initializes the Smart Helper UI on the page.
 */
function initSmartHelper() {
  const launcher = document.getElementById('smart-helper-launcher');
  const windowEl = document.getElementById('smart-helper-window');
  const closeBtn = document.getElementById('smart-helper-close');
  const sendBtn = document.getElementById('smart-helper-send');
  const inputEl = document.getElementById('smart-helper-input');
  const messagesBox = document.getElementById('smart-helper-messages');

  if (!launcher || !windowEl) return;

  const currentUser = getCurrentUser();
  const isAdmin = currentUser && currentUser.role === 'admin';

  // Toggle open / close
  launcher.addEventListener('click', () => {
    windowEl.classList.toggle('is-open');
    if (windowEl.classList.contains('is-open')) {
      if (inputEl) inputEl.focus();
      scrollHelperToBottom();
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      windowEl.classList.remove('is-open');
    });
  }

  function handleSend() {
    if (!inputEl) return;
    const text = inputEl.value.trim();
    if (!text) return;

    appendHelperMessage(text, 'user');
    inputEl.value = '';

    // Show typing indicator briefly
    const typingId = showHelperTyping();

    setTimeout(() => {
      removeHelperTyping(typingId);
      const reply = getHelperReply(text, currentUser);
      appendHelperMessage(reply, 'bot');
    }, 450);
  }

  if (sendBtn) {
    sendBtn.addEventListener('click', handleSend);
  }

  if (inputEl) {
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSend();
      }
    });
  }

  // Populate suggestion chips
  populateHelperChips(isAdmin);
}

function populateHelperChips(isAdmin) {
  const chipsContainer = document.getElementById('smart-helper-chips');
  if (!chipsContainer) return;

  const chips = isAdmin ? [
    'Who is on leave today?',
    'Who was late today?',
    'How many employees?',
    'Pending leaves count',
    'Department headcount'
  ] : [
    'How many leaves left?',
    'Was I late today?',
    'Hours worked this week',
    'My attendance this month',
    'My net salary estimate'
  ];

  chipsContainer.innerHTML = chips.map(c => 
    `<button class="helper-chip-btn" type="button" onclick="sendHelperPrompt('${escapeHtml(c)}')">${escapeHtml(c)}</button>`
  ).join('');
}

function sendHelperPrompt(prompt) {
  const inputEl = document.getElementById('smart-helper-input');
  const sendBtn = document.getElementById('smart-helper-send');
  if (inputEl && sendBtn) {
    inputEl.value = prompt;
    sendBtn.click();
  }
}

function appendHelperMessage(htmlContent, sender = 'bot') {
  const messagesBox = document.getElementById('smart-helper-messages');
  if (!messagesBox) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = `helper-bubble helper-bubble-${sender}`;

  if (sender === 'bot') {
    msgDiv.innerHTML = `
      <div class="helper-bubble-bot-avatar">
        <i data-lucide="bot" style="width: 14px; height: 14px;"></i>
      </div>
      <div class="helper-bubble-content">${htmlContent}</div>
    `;
  } else {
    msgDiv.innerHTML = `
      <div class="helper-bubble-content">${escapeHtml(htmlContent)}</div>
    `;
  }

  messagesBox.appendChild(msgDiv);
  if (window.lucide) lucide.createIcons();
  scrollHelperToBottom();
}

function showHelperTyping() {
  const messagesBox = document.getElementById('smart-helper-messages');
  if (!messagesBox) return null;

  const typingDiv = document.createElement('div');
  const id = 'typing_' + Date.now();
  typingDiv.id = id;
  typingDiv.className = 'helper-bubble helper-bubble-bot';
  typingDiv.innerHTML = `
    <div class="helper-bubble-bot-avatar"><i data-lucide="bot" style="width: 14px; height: 14px;"></i></div>
    <div class="helper-typing-dots">
      <span></span><span></span><span></span>
    </div>
  `;
  messagesBox.appendChild(typingDiv);
  if (window.lucide) lucide.createIcons();
  scrollHelperToBottom();
  return id;
}

function removeHelperTyping(id) {
  if (!id) return;
  const el = document.getElementById(id);
  if (el) el.remove();
}

function scrollHelperToBottom() {
  const messagesBox = document.getElementById('smart-helper-messages');
  if (messagesBox) {
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }
}

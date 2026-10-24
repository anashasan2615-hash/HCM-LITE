/**
 * HCM Lite - UI Toolkit
 * Toasts, Modals, Theme Switcher, Count-Up Animations, Form Validation,
 * Mobile Sidebar Drawer, and Empty State Renderers.
 */

// ----------------------------------------------------
// Theme Management
// ----------------------------------------------------
function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEYS.THEME);
  // Default is LIGHT theme unless user explicitly toggled to dark
  if (saved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(STORAGE_KEYS.THEME, next);
  updateThemeIcons();
  // Dispatch custom event for Chart.js and dynamic components
  window.dispatchEvent(new CustomEvent('themechanged', { detail: { theme: next } }));
}

function updateThemeIcons() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    btn.innerHTML = isDark 
      ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
      : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    btn.setAttribute('title', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
  });
}

// ----------------------------------------------------
// Toast Notifications
// ----------------------------------------------------
function ensureToastContainer() {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Displays a toast notification.
 * @param {string} message 
 * @param {'success'|'error'|'info'|'warning'} type 
 * @param {number} durationMs 
 */
function showToast(message, type = 'info', durationMs = 3500) {
  const container = ensureToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    error: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
  };

  toast.innerHTML = `
    <div class="toast-icon">${iconMap[type] || iconMap.info}</div>
    <div class="toast-message">${escapeHtml(message)}</div>
    <button class="toast-close" aria-label="Close notification" onclick="this.parentElement.remove()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;

  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, durationMs);
}

// ----------------------------------------------------
// Modal System
// ----------------------------------------------------
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add('is-active');
  document.body.style.overflow = 'hidden';

  // Auto focus first input
  const firstInput = modal.querySelector('input:not([type="hidden"]), select, textarea');
  if (firstInput) {
    setTimeout(() => firstInput.focus(), 100);
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove('is-active');
  document.body.style.overflow = '';
}

// Global click outside, ESC listeners, and focus trap for modals
document.addEventListener('keydown', (e) => {
  const activeModal = document.querySelector('.modal-backdrop.is-active');
  if (!activeModal) return;

  if (e.key === 'Escape') {
    activeModal.classList.remove('is-active');
    document.body.style.overflow = '';
    return;
  }

  if (e.key === 'Tab') {
    const focusable = activeModal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});

document.addEventListener('click', (e) => {
  if (e.target.classList && e.target.classList.contains('modal-backdrop')) {
    e.target.classList.remove('is-active');
    document.body.style.overflow = '';
  }
});

// ----------------------------------------------------
// Count-Up Animation for Stats
// ----------------------------------------------------
function animateValue(element, start, end, duration = 800) {
  if (!element) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    element.textContent = end;
    return;
  }
  let startTimestamp = null;
  const startNum = Number(start) || 0;
  const endNum = Number(end) || 0;
  if (startNum === endNum) {
    element.textContent = endNum;
    return;
  }

  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    // Ease-out cubic formula
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(easeProgress * (endNum - startNum) + startNum);
    element.textContent = current;
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      element.textContent = endNum;
    }
  };
  window.requestAnimationFrame(step);
}

// ----------------------------------------------------
// Inline Form Validation Helpers
// ----------------------------------------------------
function showFieldError(inputElement, errorMessage) {
  if (!inputElement) return;
  inputElement.classList.add('is-invalid');
  
  // Find error container or create one
  const parent = inputElement.closest('.form-group') || inputElement.parentElement;
  if (parent) {
    parent.classList.add('has-error');
    let errorEl = parent.querySelector('.error-text');
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.className = 'error-text';
      parent.appendChild(errorEl);
    }
    errorEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> <span>${escapeHtml(errorMessage)}</span>`;
    errorEl.style.display = 'flex';
  }
}

function clearFieldError(inputElement) {
  if (!inputElement) return;
  inputElement.classList.remove('is-invalid');
  const parent = inputElement.closest('.form-group') || inputElement.parentElement;
  if (parent) {
    parent.classList.remove('has-error');
    const errorEl = parent.querySelector('.error-text');
    if (errorEl) {
      errorEl.style.display = 'none';
      errorEl.textContent = '';
    }
  }
}

function clearAllFieldErrors(container) {
  if (!container) return;
  container.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  container.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));
  container.querySelectorAll('.error-text').forEach(el => {
    el.style.display = 'none';
    el.textContent = '';
  });
}

// ----------------------------------------------------
// Empty State Renderer
// ----------------------------------------------------
function renderEmptyState(container, { title = 'No records found', message = 'Get started by creating your first entry.', actionText = null, actionHandler = null }) {
  if (typeof container === 'string') {
    container = document.getElementById(container);
  }
  if (!container) return;

  const btnHtml = actionText 
    ? `<button class="btn btn-primary btn-sm mt-3" id="empty-state-action-btn">${escapeHtml(actionText)}</button>` 
    : '';

  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
        </svg>
      </div>
      <h3 class="empty-state-title">${escapeHtml(title)}</h3>
      <p class="empty-state-desc">${escapeHtml(message)}</p>
      ${btnHtml}
    </div>
  `;

  if (actionText && actionHandler) {
    const btn = container.querySelector('#empty-state-action-btn');
    if (btn) btn.addEventListener('click', actionHandler);
  }
}

// ----------------------------------------------------
// Password Show/Hide Toggle
// ----------------------------------------------------
function initPasswordToggles() {
  document.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      if (!input) return;
      const isPass = input.type === 'password';
      input.type = isPass ? 'text' : 'password';
      btn.innerHTML = isPass
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    });
  });
}

// ----------------------------------------------------
// HTML Sanitizer
// ----------------------------------------------------
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ----------------------------------------------------
// Sidebar and Drawer Toggles & Navigation
// ----------------------------------------------------
function highlightActiveNav() {
  const currentPath = window.location.pathname.toLowerCase();
  let currentFile = currentPath.substring(currentPath.lastIndexOf('/') + 1) || 'admin.html';
  if (currentFile.includes('?')) currentFile = currentFile.split('?')[0];
  if (currentFile.includes('#')) currentFile = currentFile.split('#')[0];
  if (!currentFile || currentFile === '') currentFile = 'admin.html';

  const navLinks = document.querySelectorAll('.sidebar .sidebar-nav a.nav-item, .sidebar .sidebar-nav a.nav-link, .sidebar .sidebar-nav a');
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    const targetFile = href.split('/').pop().toLowerCase();
    if (targetFile === currentFile) {
      link.classList.add('is-active');
      link.classList.add('active');
    } else {
      link.classList.remove('is-active');
      link.classList.remove('active');
    }
  });
}

function setupMobileSidebar() {
  const toggleBtns = document.querySelectorAll('.mobile-nav-toggle');
  const sidebar = document.querySelector('.sidebar');
  let overlay = document.querySelector('.sidebar-overlay');

  if (!overlay && sidebar) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
  }

  toggleBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (sidebar) sidebar.classList.toggle('is-open');
      if (overlay) overlay.classList.toggle('is-open');
    });
  });

  if (overlay && sidebar) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('is-open');
      overlay.classList.remove('is-open');
    });
  }

  // Close sidebar on mobile link click
  document.querySelectorAll('.sidebar .sidebar-nav a').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth < 900 && sidebar && overlay) {
        sidebar.classList.remove('is-open');
        overlay.classList.remove('is-open');
      }
    });
  });
}

// ----------------------------------------------------
// Change Password Modal Initializer
// ----------------------------------------------------
function openChangePasswordModal() {
  openModal('change-password-modal');
}

function handlePasswordChangeSubmit(e) {
  if (e) e.preventDefault();
  const currentPass = document.getElementById('cp-current-pass');
  const newPass = document.getElementById('cp-new-pass');
  const confirmPass = document.getElementById('cp-confirm-pass');

  clearAllFieldErrors(document.getElementById('change-password-modal'));
  let hasError = false;

  if (!currentPass.value) {
    showFieldError(currentPass, 'Current password is required');
    hasError = true;
  }
  if (!newPass.value || newPass.value.length < 6) {
    showFieldError(newPass, 'New password must be at least 6 characters');
    hasError = true;
  }
  if (newPass.value !== confirmPass.value) {
    showFieldError(confirmPass, 'Passwords do not match');
    hasError = true;
  }

  if (hasError) return;

  const result = changePassword(currentPass.value, newPass.value);
  if (result.success) {
    showToast('Password changed successfully!', 'success');
    closeModal('change-password-modal');
    currentPass.value = '';
    newPass.value = '';
    confirmPass.value = '';
  } else {
    showFieldError(currentPass, result.error || 'Failed to change password');
  }
}

// ----------------------------------------------------
// Navigation & Shell User Setup
// ----------------------------------------------------
function setupNavigationUser(user) {
  if (!user) return;

  const initials = (user.name || 'User')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  document.querySelectorAll('.nav-user-name').forEach(el => {
    el.textContent = user.name;
  });

  document.querySelectorAll('.nav-user-role').forEach(el => {
    el.textContent = user.role === 'admin' ? 'Administrator' : (user.designation || 'Employee');
  });

  document.querySelectorAll('.nav-user-avatar').forEach(el => {
    el.textContent = initials;
  });

  const company = getCompany();
  if (company && company.name) {
    document.querySelectorAll('.sidebar-company-name').forEach(el => {
      el.textContent = company.name;
    });
  }

  const dateEl = document.getElementById('top-header-date');
  if (dateEl && typeof formatDate === 'function' && typeof todayStr === 'function') {
    dateEl.textContent = formatDate(todayStr(), true);
  }

  highlightActiveNav();
}

// Initialize theme on script load
initTheme();
document.addEventListener('DOMContentLoaded', () => {
  updateThemeIcons();
  initPasswordToggles();
  setupMobileSidebar();
  highlightActiveNav();
});


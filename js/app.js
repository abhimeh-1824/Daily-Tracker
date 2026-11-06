import {
  subscribeAuth,
  loginUser,
  signupUser,
  resetPassword,
  logoutUser,
  getAuthUser
} from './auth.js';
import {
  formatDateISO,
  addDays,
  refreshIcons,
  showToast
} from './utils.js';
import {
  loadDayData,
  getActiveDate,
  setActiveDate,
  setTrackerDataListener,
  triggerAutoSave
} from './tracker.js';
import { renderDashboard } from './dashboard.js';
import { renderAnalytics, render30DayChallenge } from './analytics.js';
import {
  renderWeeklyTimetable,
  renderDSATracker,
  renderEnglishTracker,
  renderGATETracker
} from './subject-trackers.js';
import { renderSettings } from './settings.js';
import { setDemoModeUser, isLocalMode } from './firestore.js';
import { renderVerbFlashcards } from './verbs.js';

let currentActiveView = 'dashboard';
let currentLoadedDayData = null;

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupDateControls();
  setupAuthUI();
  setupModals();

  // Listen to Auth state changes
  subscribeAuth((user) => {
    if (user) {
      onUserSignedIn(user);
    } else {
      onUserSignedOut();
    }
  });

  // Listen to Tracker data updates so dashboard remains in sync
  setTrackerDataListener((dayData) => {
    currentLoadedDayData = dayData;
    if (currentActiveView === 'dashboard') {
      renderDashboard(dayData, getAuthUser());
    }
  });

  refreshIcons();
});

/**
 * Handle User Signed In
 */
async function onUserSignedIn(user) {
  setDemoModeUser(user);
  document.getElementById('auth-view').style.display = 'none';
  document.getElementById('app-shell').style.display = 'flex';

  // Update user name in sidebar
  const nameLabel = document.getElementById('sidebar-user-name');
  const emailLabel = document.getElementById('sidebar-user-email');
  const avatarLabel = document.getElementById('sidebar-user-avatar');

  const displayName = user.displayName || user.email?.split('@')[0] || 'Scholar';
  if (nameLabel) nameLabel.textContent = displayName;
  if (emailLabel) emailLabel.textContent = user.email || '';
  if (avatarLabel) avatarLabel.textContent = displayName.charAt(0).toUpperCase();

  // Update sync status indicator
  const syncLabel = document.getElementById('sync-label');
  const syncDot = document.getElementById('sync-dot');
  if (syncLabel && syncDot) {
    syncLabel.textContent = 'All changes saved';
    syncDot.style.background = 'var(--emerald-success)';
    syncDot.style.boxShadow = '0 0 8px rgba(16, 185, 129, 0.4)';
  }

  // Load today's tracking data
  const todayISO = formatDateISO(new Date());
  await loadDayData(todayISO);

  // Switch to default view
  switchView(currentActiveView || 'dashboard');
}

/**
 * Handle User Signed Out
 */
function onUserSignedOut() {
  setDemoModeUser(null);
  document.getElementById('app-shell').style.display = 'none';
  document.getElementById('auth-view').style.display = 'flex';
}

/**
 * View Switcher
 */
export function switchView(viewName) {
  currentActiveView = viewName;

  // Update nav item active classes
  document.querySelectorAll('.nav-item').forEach(el => {
    if (el.getAttribute('data-view') === viewName) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });

  // Update mobile bottom nav items
  document.querySelectorAll('.mobile-nav-item').forEach(el => {
    if (el.getAttribute('data-view') === viewName) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });

  // Hide all view panes
  document.querySelectorAll('.view-pane').forEach(p => p.classList.remove('active'));

  // Show selected pane
  const targetPane = document.getElementById(`${viewName}-view`);
  if (targetPane) {
    targetPane.classList.add('active');
  }

  // Close mobile sidebar drawer if open
  closeMobileSidebar();

  // Route specific rendering logic
  const user = getAuthUser();
  if (viewName === 'dashboard') {
    renderDashboard(currentLoadedDayData, user);
  } else if (viewName === 'tracker') {
    // Already loaded via tracker.js
  } else if (viewName === 'timetable') {
    renderWeeklyTimetable();
  } else if (viewName === 'dsa') {
    renderDSATracker();
  } else if (viewName === 'english') {
    renderEnglishTracker();
  } else if (viewName === 'verbs') {
    renderVerbFlashcards(document.getElementById('verbs-view'));
  } else if (viewName === 'gate') {
    renderGATETracker();
  } else if (viewName === 'challenge') {
    render30DayChallenge();
  } else if (viewName === 'analytics') {
    renderAnalytics();
  } else if (viewName === 'settings') {
    renderSettings(user);
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Attach globally for inline button onclick attributes
window.switchView = switchView;

/**
 * Setup Desktop & Mobile Navigation
 */
function setupNavigation() {
  // Sidebar items
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.getAttribute('data-view');
      if (view) switchView(view);
    });
  });

  // Mobile bottom nav items
  document.querySelectorAll('.mobile-nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.getAttribute('data-view');
      if (view) switchView(view);
    });
  });

  // Mobile hamburger menu toggle
  const menuBtn = document.getElementById('mobile-menu-btn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (menuBtn && sidebar && overlay) {
    menuBtn.onclick = () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('active');
    };
    overlay.onclick = closeMobileSidebar;
  }

  // Logout button
  const logoutBtn = document.getElementById('sidebar-logout-btn');
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      if (confirm('Are you sure you want to log out?')) {
        await logoutUser();
      }
    };
  }
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('active');
}

/**
 * Setup Topbar Date Controls (< Prev, Date picker, Today, Next >)
 */
function setupDateControls() {
  const prevBtn = document.getElementById('btn-prev-day');
  const nextBtn = document.getElementById('btn-next-day');
  const todayBtn = document.getElementById('btn-today');
  const dateInput = document.getElementById('current-date-input');

  if (prevBtn) {
    prevBtn.onclick = () => {
      const cur = getActiveDate();
      const prev = addDays(cur, -1);
      setActiveDate(prev);
    };
  }

  if (nextBtn) {
    nextBtn.onclick = () => {
      const cur = getActiveDate();
      const next = addDays(cur, 1);
      setActiveDate(next);
    };
  }

  if (todayBtn) {
    todayBtn.onclick = () => {
      const today = formatDateISO(new Date());
      setActiveDate(today);
    };
  }

  if (dateInput) {
    dateInput.onchange = (e) => {
      if (e.target.value) {
        setActiveDate(e.target.value);
      }
    };
  }
}

/**
 * Quick complete task handler (for dashboard pending list)
 */
window.quickCompleteTask = (actId) => {
  if (!currentLoadedDayData) return;
  const act = currentLoadedDayData.activities.find(a => a.id === actId);
  if (act) {
    act.status = 'done';
    if (!act.actualMinutes || act.actualMinutes === 0) {
      act.actualMinutes = act.plannedMinutes || 30;
    }
    showToast(`Marked "${act.title}" as Done!`, 'success');
    triggerAutoSave();
  }
};

/**
 * Jump to tracker for a specific date (from 30-day challenge grid)
 */
window.jumpToTrackerDate = (dateISO) => {
  setActiveDate(dateISO);
  switchView('tracker');
};

/**
 * Setup Authentication UI (Login, Signup, Forgot Password)
 */
function setupAuthUI() {
  const loginTab = document.getElementById('tab-login');
  const signupTab = document.getElementById('tab-signup');
  const loginForm = document.getElementById('form-login');
  const signupForm = document.getElementById('form-signup');
  const forgotBtn = document.getElementById('btn-forgot-password');

  if (loginTab && signupTab && loginForm && signupForm) {
    loginTab.onclick = () => {
      loginTab.classList.add('active');
      signupTab.classList.remove('active');
      loginForm.style.display = 'block';
      signupForm.style.display = 'none';
    };

    signupTab.onclick = () => {
      signupTab.classList.add('active');
      loginTab.classList.remove('active');
      signupForm.style.display = 'block';
      loginForm.style.display = 'none';
    };
  }

  // Login Submit
  if (loginForm) {
    loginForm.onsubmit = async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const pass = document.getElementById('login-password').value;
      const submitBtn = loginForm.querySelector('button[type="submit"]');

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in...';
        await loginUser(email, pass);
      } catch (err) {
        console.error(err);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In to Tracker';
      }
    };
  }

  // Signup Submit
  if (signupForm) {
    signupForm.onsubmit = async (e) => {
      e.preventDefault();
      const name = document.getElementById('signup-name').value;
      const email = document.getElementById('signup-email').value;
      const pass = document.getElementById('signup-password').value;
      const submitBtn = signupForm.querySelector('button[type="submit"]');

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating account...';
        await signupUser(email, pass, name);
      } catch (err) {
        console.error(err);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Free Account';
      }
    };
  }

  // Forgot password
  if (forgotBtn) {
    forgotBtn.onclick = async () => {
      const email = prompt('Enter your registered email address to receive a password reset link:');
      if (email) {
        await resetPassword(email);
      }
    };
  }

  // Toggle password visibility
  document.querySelectorAll('.password-toggle-btn').forEach(btn => {
    btn.onclick = () => {
      const input = btn.previousElementSibling;
      if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
      }
    };
  });
}

/**
 * Setup Modals Close Handlers
 */
function setupModals() {
  document.querySelectorAll('.modal-backdrop').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });

  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-backdrop');
      if (modal) modal.classList.remove('active');
    });
  });
}

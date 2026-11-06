import {
  formatDateISO,
  formatDateReadable,
  getDayOfWeek,
  addDays,
  showToast,
  triggerCelebration,
  refreshIcons,
  formatMinutes
} from './utils.js';
import { DEFAULT_TIME_BLOCKS, generateDayActivities } from './timetable.js';
import { saveDayRecord, getDayRecord, getUserProfile } from './firestore.js';

let activeDate = formatDateISO(new Date());
let currentDayData = null;
let saveDebounceTimer = null;
let onDataUpdatedCallback = null;

export function setTrackerDataListener(callback) {
  onDataUpdatedCallback = callback;
}

export function getActiveDate() {
  return activeDate;
}

export function setActiveDate(newDate) {
  activeDate = newDate;
  loadDayData(activeDate);
}

/**
 * Calculate completion percentage and category breakdowns
 */
export function calculateProgress(activities = []) {
  if (!activities || activities.length === 0) {
    return {
      percentage: 0,
      totalCount: 0,
      doneCount: 0,
      partialCount: 0,
      skippedCount: 0,
      notDoneCount: 0,
      totalMinutes: 0,
      categoryStats: {}
    };
  }

  let doneCount = 0;
  let partialCount = 0;
  let skippedCount = 0;
  let notDoneCount = 0;
  let totalMinutes = 0;

  const categories = ['morning', 'jobPrep', 'dsa', 'advanced', 'english', 'gate'];
  const categoryStats = {};
  categories.forEach(cat => {
    categoryStats[cat] = { total: 0, completedWeight: 0, minutes: 0 };
  });

  activities.forEach(act => {
    totalMinutes += Number(act.actualMinutes) || 0;
    const cat = act.category || 'jobPrep';
    if (!categoryStats[cat]) {
      categoryStats[cat] = { total: 0, completedWeight: 0, minutes: 0 };
    }
    categoryStats[cat].minutes += Number(act.actualMinutes) || 0;

    if (act.status === 'done') {
      doneCount++;
      categoryStats[cat].total++;
      categoryStats[cat].completedWeight += 1;
    } else if (act.status === 'partial') {
      partialCount++;
      categoryStats[cat].total++;
      categoryStats[cat].completedWeight += 0.5;
    } else if (act.status === 'skip') {
      skippedCount++;
    } else {
      notDoneCount++;
      categoryStats[cat].total++;
    }
  });

  const activeCount = activities.length - skippedCount;
  let percentage = 0;
  if (activeCount > 0) {
    const rawScore = doneCount + (partialCount * 0.5);
    percentage = Math.round((rawScore / activeCount) * 100);
  }

  // Calculate percentages per category
  Object.keys(categoryStats).forEach(cat => {
    const stat = categoryStats[cat];
    stat.percentage = stat.total > 0 ? Math.round((stat.completedWeight / stat.total) * 100) : 0;
  });

  return {
    percentage,
    totalCount: activities.length,
    doneCount,
    partialCount,
    skippedCount,
    notDoneCount,
    totalMinutes,
    categoryStats
  };
}

/**
 * Load day tracking data from Firestore or initialize from schedule template
 */
export async function loadDayData(dateStr) {
  activeDate = dateStr;
  updateDateUI();

  setSyncState('syncing', 'Loading data...');

  try {
    const existing = await getDayRecord(dateStr);
    const dayOfWeek = getDayOfWeek(dateStr);
    const profile = await getUserProfile().catch(() => null);

    if (existing && existing.activities && existing.activities.length > 0) {
      currentDayData = existing;
    } else {
      // Generate default activities for this day of week
      const activities = generateDayActivities(dayOfWeek, profile?.customTimetable);
      currentDayData = {
        date: dateStr,
        activities: activities,
        notes: '',
        completionPercentage: 0,
        totalMinutesSpent: 0
      };
    }

    renderTrackerUI();
    setSyncState('saved', 'Synced with Cloud Firestore');

    if (onDataUpdatedCallback) {
      onDataUpdatedCallback(currentDayData);
    }
  } catch (error) {
    console.error('Error loading day data:', error);
    setSyncState('error', 'Sync failed');
    showToast('Failed to load study data from Firestore.', 'error');
  }
}

/**
 * Update UI for Date Navigator
 */
function updateDateUI() {
  const label = document.getElementById('current-date-label');
  const input = document.getElementById('current-date-input');
  if (label) label.textContent = formatDateReadable(activeDate);
  if (input) input.value = activeDate;
}

/**
 * Set Visual Sync State
 */
export function setSyncState(state, text) {
  const dot = document.getElementById('sync-dot');
  const label = document.getElementById('sync-label');
  if (!dot || !label) return;

  if (state === 'syncing') {
    dot.className = 'sync-dot syncing';
    label.textContent = text || 'Syncing...';
  } else if (state === 'saved') {
    dot.className = 'sync-dot';
    label.textContent = text || 'Saved to Firestore';
  } else if (state === 'error') {
    dot.className = 'sync-dot';
    dot.style.backgroundColor = 'var(--rose-danger)';
    label.textContent = text || 'Sync error';
  }
}

/**
 * Trigger debounce auto-save to Firestore
 */
export function triggerAutoSave() {
  setSyncState('syncing', 'Saving changes...');
  clearTimeout(saveDebounceTimer);

  saveDebounceTimer = setTimeout(async () => {
    if (!currentDayData) return;

    const progress = calculateProgress(currentDayData.activities);
    currentDayData.completionPercentage = progress.percentage;
    currentDayData.totalActivities = progress.totalCount;
    currentDayData.completedActivities = progress.doneCount;
    currentDayData.partialActivities = progress.partialCount;
    currentDayData.skippedActivities = progress.skippedCount;
    currentDayData.totalMinutesSpent = progress.totalMinutes;
    currentDayData.categoryProgress = progress.categoryStats;

    try {
      await saveDayRecord(activeDate, currentDayData);
      setSyncState('saved', 'All changes saved to Firestore');

      // If user hit 100%, trigger celebration!
      if (progress.percentage === 100 && progress.doneCount > 5) {
        triggerCelebration();
      }

      if (onDataUpdatedCallback) {
        onDataUpdatedCallback(currentDayData);
      }
    } catch (err) {
      console.error('Failed to save day record:', err);
      setSyncState('error', 'Error saving to Firestore');
      showToast('Error saving data to Firestore', 'error');
    }
  }, 400);
}

/**
 * Render the Tracker View
 */
export function renderTrackerUI() {
  const container = document.getElementById('tracker-blocks-container');
  if (!container || !currentDayData) return;

  const progress = calculateProgress(currentDayData.activities);

  // Update header indicators
  const percentEl = document.getElementById('tracker-completion-percent');
  const barEl = document.getElementById('tracker-completion-bar');
  const statsSummaryEl = document.getElementById('tracker-stats-summary');

  if (percentEl) percentEl.textContent = `${progress.percentage}%`;
  if (barEl) barEl.style.width = `${progress.percentage}%`;
  if (statsSummaryEl) {
    statsSummaryEl.textContent = `${progress.doneCount} Done • ${progress.partialCount} Partial • ${progress.skippedCount} Skipped • ${formatMinutes(progress.totalMinutes)} study time`;
  }

  // Group activities by block
  const blockMap = {};
  DEFAULT_TIME_BLOCKS.forEach(b => {
    blockMap[b.id] = { ...b, items: [] };
  });

  currentDayData.activities.forEach(act => {
    const blockId = act.blockId || 'jobPrep';
    if (blockMap[blockId]) {
      blockMap[blockId].items.push(act);
    }
  });

  let html = '';

  DEFAULT_TIME_BLOCKS.forEach(block => {
    const blockData = blockMap[block.id];
    if (!blockData || blockData.items.length === 0) return;

    html += `
      <div class="timetable-section">
        <div class="time-block-header">
          <div class="time-block-title">
            <span class="badge ${block.badgeClass}">${block.title}</span>
            <span class="time-block-badge">${block.timeRange}</span>
          </div>
          <span style="font-size: 12px; color: var(--text-muted);">
            ${blockData.items.filter(i => i.status === 'done').length}/${blockData.items.length} completed
          </span>
        </div>
        <div class="activity-items-list">
    `;

    blockData.items.forEach(act => {
      const isDone = act.status === 'done';
      const isPartial = act.status === 'partial';
      const isSkip = act.status === 'skip';
      const isNotDone = !act.status || act.status === 'not_done';

      html += `
        <div class="activity-card status-${act.status || 'not_done'}" data-act-id="${act.id}">
          <div class="activity-left">
            <span class="activity-time-pill">${act.time}</span>
            <div class="activity-main-info">
              <div class="activity-name-row">
                <span class="activity-title">${act.title}</span>
                ${act.topic ? `<span class="activity-topic-badge">${act.topic}</span>` : ''}
              </div>
              ${act.notes ? `
                <div class="activity-note-preview">
                  <i data-lucide="file-text" style="width: 13px; height: 13px;"></i>
                  <span>${escapeHtml(act.notes)}</span>
                </div>
              ` : ''}
            </div>
          </div>

          <div class="activity-controls">
            <!-- Time Spent Controller -->
            <div class="time-spent-input-box" title="Actual minutes spent">
              <i data-lucide="clock" style="width: 14px; height: 14px; color: var(--text-muted);"></i>
              <input 
                type="number" 
                class="time-spent-input" 
                data-act-id="${act.id}"
                min="0" 
                max="999" 
                value="${act.actualMinutes || 0}" 
              />
              <span class="time-spent-unit">m</span>
              <button class="btn-sm btn-outline quick-add-time" data-act-id="${act.id}" data-add="15" title="Add 15m">+15</button>
            </div>

            <!-- Notes Button -->
            <button class="btn-icon open-notes-modal-btn" data-act-id="${act.id}" title="Edit activity notes">
              <i data-lucide="message-square" style="width: 16px; height: 16px;"></i>
            </button>

            <!-- Status Buttons Group -->
            <div class="status-btn-group">
              <button 
                class="status-opt-btn ${isDone ? 'active done' : ''}" 
                data-act-id="${act.id}" 
                data-status="done"
                title="Mark Done (100%)">
                Done
              </button>
              <button 
                class="status-opt-btn ${isPartial ? 'active partial' : ''}" 
                data-act-id="${act.id}" 
                data-status="partial"
                title="Mark Partial (50%)">
                Partial
              </button>
              <button 
                class="status-opt-btn ${isNotDone ? 'active not_done' : ''}" 
                data-act-id="${act.id}" 
                data-status="not_done"
                title="Mark Not Done">
                Not Done
              </button>
              <button 
                class="status-opt-btn ${isSkip ? 'active skip' : ''}" 
                data-act-id="${act.id}" 
                data-status="skip"
                title="Skip this activity">
                Skip
              </button>
            </div>
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;
  });

  // Daily reflections box
  html += `
    <div class="card" style="margin-top: 24px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
        <h4 style="font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
          <i data-lucide="book-open" style="width: 18px; height: 18px; color: var(--teal-primary);"></i>
          Daily Study Notes & Reflection
        </h4>
        <span style="font-size: 12px; color: var(--text-muted);">Saved automatically</span>
      </div>
      <textarea 
        id="daily-summary-notes" 
        rows="3" 
        style="width: 100%; resize: vertical;" 
        placeholder="Log key learnings, blockers encountered, LeetCode problem numbers, or reflections for today..."
      >${escapeHtml(currentDayData.notes || '')}</textarea>
    </div>
  `;

  container.innerHTML = html;
  refreshIcons();
  attachTrackerEvents();
}

/**
 * Attach dynamic events to activity items
 */
function attachTrackerEvents() {
  // Status buttons
  document.querySelectorAll('.status-opt-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const actId = e.currentTarget.getAttribute('data-act-id');
      const status = e.currentTarget.getAttribute('data-status');
      updateActivityStatus(actId, status);
    });
  });

  // Time spent inputs
  document.querySelectorAll('.time-spent-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const actId = e.target.getAttribute('data-act-id');
      const val = Math.max(0, parseInt(e.target.value, 10) || 0);
      updateActivityTime(actId, val);
    });
  });

  // Quick +15m buttons
  document.querySelectorAll('.quick-add-time').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const actId = e.currentTarget.getAttribute('data-act-id');
      const addMins = parseInt(e.currentTarget.getAttribute('data-add'), 10) || 15;
      const act = currentDayData.activities.find(a => a.id === actId);
      if (act) {
        const newVal = (Number(act.actualMinutes) || 0) + addMins;
        updateActivityTime(actId, newVal);
        const input = document.querySelector(`.time-spent-input[data-act-id="${actId}"]`);
        if (input) input.value = newVal;
      }
    });
  });

  // Notes Modal Open
  document.querySelectorAll('.open-notes-modal-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const actId = e.currentTarget.getAttribute('data-act-id');
      openActivityNotesModal(actId);
    });
  });

  // Daily reflections notes textarea
  const summaryNotes = document.getElementById('daily-summary-notes');
  if (summaryNotes) {
    summaryNotes.addEventListener('input', (e) => {
      if (currentDayData) {
        currentDayData.notes = e.target.value;
        triggerAutoSave();
      }
    });
  }
}

function updateActivityStatus(actId, status) {
  if (!currentDayData) return;
  const act = currentDayData.activities.find(a => a.id === actId);
  if (act) {
    act.status = status;
    // Auto populate time spent if marked done and currently 0
    if (status === 'done' && (!act.actualMinutes || act.actualMinutes === 0)) {
      act.actualMinutes = act.plannedMinutes || 30;
    }
    renderTrackerUI();
    triggerAutoSave();
  }
}

function updateActivityTime(actId, minutes) {
  if (!currentDayData) return;
  const act = currentDayData.activities.find(a => a.id === actId);
  if (act) {
    act.actualMinutes = minutes;
    triggerAutoSave();
  }
}

/**
 * Modal to edit activity-specific notes
 */
export function openActivityNotesModal(actId) {
  if (!currentDayData) return;
  const act = currentDayData.activities.find(a => a.id === actId);
  if (!act) return;

  const modal = document.getElementById('activity-notes-modal');
  const titleEl = document.getElementById('modal-activity-title');
  const textarea = document.getElementById('modal-activity-notes-input');
  const saveBtn = document.getElementById('modal-save-notes-btn');

  if (titleEl) titleEl.textContent = `${act.title} (${act.time})`;
  if (textarea) textarea.value = act.notes || '';

  if (modal) modal.classList.add('active');

  const onSave = () => {
    act.notes = textarea.value.trim();
    if (modal) modal.classList.remove('active');
    renderTrackerUI();
    triggerAutoSave();
    saveBtn.removeEventListener('click', onSave);
  };

  if (saveBtn) {
    saveBtn.onclick = onSave;
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

import Chart from 'chart.js/auto';
import {
  formatDateReadable,
  formatDateISO,
  daysBetween,
  formatMinutes,
  refreshIcons,
  showToast,
  triggerCelebration
} from './utils.js';
import { getAllDaysRecords, getUserProfile, saveUserProfile } from './firestore.js';

let completionChartInstance = null;
let categoryChartInstance = null;
let hoursChartInstance = null;

/**
 * Render the dedicated Analytics view
 */
export async function renderAnalytics() {
  const container = document.getElementById('analytics-view');
  if (!container) return;

  const records = await getAllDaysRecords().catch(() => []);

  // Compute aggregate numbers
  let totalDone = 0;
  let totalPartial = 0;
  let totalMissed = 0;
  let totalMinutes = 0;
  let totalPercentageSum = 0;

  const categoryTotals = {
    jobPrep: 0,
    dsa: 0,
    english: 0,
    gate: 0,
    advanced: 0,
    morning: 0
  };

  records.forEach(r => {
    totalDone += r.completedActivities || 0;
    totalPartial += r.partialActivities || 0;
    totalMissed += r.notDoneCount || 0;
    totalMinutes += r.totalMinutesSpent || 0;
    totalPercentageSum += r.completionPercentage || 0;

    if (r.categoryProgress) {
      Object.keys(categoryTotals).forEach(cat => {
        if (r.categoryProgress[cat]) {
          categoryTotals[cat] += r.categoryProgress[cat].minutes || 0;
        }
      });
    }
  });

  const avgCompletion = records.length > 0 ? Math.round(totalPercentageSum / records.length) : 0;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Progress Analytics & Insights</h1>
        <p class="page-subtitle">Historical performance aggregated across all logged study sessions</p>
      </div>
      <div style="display: flex; gap: 8px;">
        <span class="badge badge-teal">${records.length} Days Recorded</span>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon-wrapper teal">
          <i data-lucide="check-check" style="width: 24px; height: 24px;"></i>
        </div>
        <div class="stat-content">
          <div class="stat-label">Total Completed Tasks</div>
          <div class="stat-value">${totalDone}</div>
          <div class="stat-subtext">${totalPartial} Partial • ${totalMissed} Missed</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon-wrapper blue">
          <i data-lucide="percent" style="width: 24px; height: 24px;"></i>
        </div>
        <div class="stat-content">
          <div class="stat-label">Average Daily Completion</div>
          <div class="stat-value">${avgCompletion}%</div>
          <div class="stat-subtext">Across all ${records.length} active logs</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon-wrapper amber">
          <i data-lucide="clock-3" style="width: 24px; height: 24px;"></i>
        </div>
        <div class="stat-content">
          <div class="stat-label">Total Time Invested</div>
          <div class="stat-value">${formatMinutes(totalMinutes)}</div>
          <div class="stat-subtext">~${(totalMinutes / 60).toFixed(1)} hours of deep work</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon-wrapper emerald">
          <i data-lucide="target" style="width: 24px; height: 24px;"></i>
        </div>
        <div class="stat-content">
          <div class="stat-label">Most Focused Subject</div>
          <div class="stat-value" style="font-size: 20px;">
            ${getTopCategoryName(categoryTotals)}
          </div>
          <div class="stat-subtext">${formatMinutes(Math.max(...Object.values(categoryTotals)))} logged</div>
        </div>
      </div>
    </div>

    <!-- Interactive Charts Grid -->
    <div class="charts-grid">
      <!-- 7-Day Completion Trend -->
      <div class="chart-card">
        <div class="chart-card-header">
          <h3 class="chart-card-title">Daily Completion Trend (%)</h3>
          <span class="badge badge-teal">Recent Days</span>
        </div>
        <div class="chart-canvas-wrapper">
          <canvas id="chart-daily-completion"></canvas>
        </div>
      </div>

      <!-- Category Time Distribution -->
      <div class="chart-card">
        <div class="chart-card-header">
          <h3 class="chart-card-title">Time Spent by Subject Area</h3>
          <span class="badge badge-blue">Category Share</span>
        </div>
        <div class="chart-canvas-wrapper">
          <canvas id="chart-category-distribution"></canvas>
        </div>
      </div>

      <!-- Study Hours Logged Trend -->
      <div class="chart-card" style="grid-column: 1 / -1;">
        <div class="chart-card-header">
          <h3 class="chart-card-title">Daily Study Hours Logged</h3>
          <span class="badge badge-indigo">Time (Hours)</span>
        </div>
        <div class="chart-canvas-wrapper" style="min-height: 280px;">
          <canvas id="chart-hours-trend"></canvas>
        </div>
      </div>
    </div>
  `;

  refreshIcons();
  initAnalyticsCharts(records, categoryTotals);
}

function getTopCategoryName(totals) {
  let topCat = 'dsa';
  let maxMin = -1;
  const names = {
    jobPrep: 'Job Prep',
    dsa: 'DSA (JS)',
    english: 'English',
    gate: 'GATE DA',
    advanced: 'System Design',
    morning: 'Morning'
  };
  Object.keys(totals).forEach(cat => {
    if (totals[cat] > maxMin) {
      maxMin = totals[cat];
      topCat = cat;
    }
  });
  return maxMin > 0 ? names[topCat] || 'DSA' : 'DSA (JS)';
}

function initAnalyticsCharts(records, categoryTotals) {
  // 1. Completion Chart (last 14 days or records)
  const recentRecords = records.slice(-14);
  const labels = recentRecords.map(r => r.date ? r.date.slice(5) : '');
  const dataPoints = recentRecords.map(r => r.completionPercentage || 0);

  const compCtx = document.getElementById('chart-daily-completion');
  if (compCtx) {
    if (completionChartInstance) completionChartInstance.destroy();
    completionChartInstance = new Chart(compCtx, {
      type: 'bar',
      data: {
        labels: labels.length > 0 ? labels : ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'],
        datasets: [{
          label: 'Completion %',
          data: dataPoints.length > 0 ? dataPoints : [80, 90, 70, 85, 95],
          backgroundColor: 'rgba(20, 184, 166, 0.75)',
          borderColor: '#14b8a6',
          borderWidth: 1.5,
          borderRadius: 6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `Score: ${ctx.raw}%`
            }
          }
        },
        scales: {
          y: {
            min: 0,
            max: 100,
            grid: { color: 'rgba(255, 255, 255, 0.06)' },
            ticks: { color: '#94a3b8' }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8' }
          }
        }
      }
    });
  }

  // 2. Category Share Chart
  const catCtx = document.getElementById('chart-category-distribution');
  if (catCtx) {
    if (categoryChartInstance) categoryChartInstance.destroy();

    const catValues = [
      categoryTotals.dsa || 30,
      categoryTotals.jobPrep || 25,
      categoryTotals.gate || 20,
      categoryTotals.english || 10,
      categoryTotals.advanced || 10,
      categoryTotals.morning || 5,
    ];

    categoryChartInstance = new Chart(catCtx, {
      type: 'doughnut',
      data: {
        labels: ['DSA (JS)', 'Job Prep (React/Node)', 'GATE DA (Python/Math)', 'English Practice', 'System Design', 'Morning Routine'],
        datasets: [{
          data: catValues,
          backgroundColor: [
            '#14b8a6', // Teal
            '#3b82f6', // Blue
            '#f59e0b', // Amber
            '#10b981', // Emerald
            '#6366f1', // Indigo
            '#38bdf8', // Light Blue
          ],
          borderColor: '#111827',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: '#94a3b8', font: { size: 12 } }
          }
        }
      }
    });
  }

  // 3. Hours Trend Line Chart
  const hoursCtx = document.getElementById('chart-hours-trend');
  if (hoursCtx) {
    if (hoursChartInstance) hoursChartInstance.destroy();
    const hoursData = recentRecords.map(r => ((r.totalMinutesSpent || 0) / 60).toFixed(1));

    hoursChartInstance = new Chart(hoursCtx, {
      type: 'line',
      data: {
        labels: labels.length > 0 ? labels : ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'],
        datasets: [{
          label: 'Study Hours',
          data: hoursData.length > 0 ? hoursData : [4.5, 5.2, 6.0, 4.0, 6.5],
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.15)',
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#818cf8',
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            min: 0,
            grid: { color: 'rgba(255, 255, 255, 0.06)' },
            ticks: { color: '#94a3b8' }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8' }
          }
        }
      }
    });
  }
}

/**
 * Render 30-Day Consistency Challenge View
 */
export async function render30DayChallenge() {
  const container = document.getElementById('challenge-view');
  if (!container) return;

  const [records, profile] = await Promise.all([
    getAllDaysRecords().catch(() => []),
    getUserProfile().catch(() => null)
  ]);

  const recordMap = {};
  records.forEach(r => {
    if (r.date) recordMap[r.date] = r;
  });

  const todayISO = formatDateISO(new Date());
  const challengeStartDate = profile?.challengeStartDate || records[0]?.date || todayISO;

  // Build 30 days starting from challengeStartDate
  const days = [];
  let successfulDays = 0;
  let partialDays = 0;
  let lowDays = 0;
  let totalScoreSum = 0;
  let daysElapsed = 0;

  for (let i = 0; i < 30; i++) {
    const curDate = addDaysToISO(challengeStartDate, i);
    const isToday = curDate === todayISO;
    const isFuture = curDate > todayISO;
    const record = recordMap[curDate];

    let status = 'future';
    let percent = 0;

    if (record) {
      percent = record.completionPercentage || 0;
      if (percent >= 75) {
        status = 'high';
        successfulDays++;
      } else if (percent >= 40) {
        status = 'medium';
        partialDays++;
      } else {
        status = 'low';
        lowDays++;
      }
      totalScoreSum += percent;
      daysElapsed++;
    } else if (!isFuture) {
      status = 'low';
      lowDays++;
      daysElapsed++;
    }

    days.push({
      dayNum: i + 1,
      date: curDate,
      isToday,
      isFuture,
      status,
      percent
    });
  }

  const avgChallengeScore = daysElapsed > 0 ? Math.round(totalScoreSum / daysElapsed) : 0;
  const currentDayNum = Math.min(30, Math.max(1, daysBetween(challengeStartDate, todayISO) + 1));

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">30-Day Consistency Challenge</h1>
        <p class="page-subtitle">Build ironclad discipline with color-coded daily accountability</p>
      </div>
      <div style="display: flex; gap: 10px; align-items: center;">
        <button class="btn btn-secondary btn-sm" id="btn-change-challenge-start">
          <i data-lucide="calendar" style="width: 14px; height: 14px;"></i>
          Start Date: ${challengeStartDate}
        </button>
        <button class="btn btn-outline btn-sm" id="btn-restart-challenge">
          <i data-lucide="rotate-ccw" style="width: 14px; height: 14px;"></i>
          Restart Cycle
        </button>
      </div>
    </div>

    <!-- Challenge Overview Banner -->
    <div class="challenge-header-card">
      <div>
        <span class="badge badge-teal" style="margin-bottom: 8px;">Active Challenge</span>
        <h2 style="font-size: 22px; font-weight: 700; color: #fff;">
          Day ${currentDayNum} of 30
        </h2>
        <p style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">
          Legend: <span style="color: var(--emerald-success); font-weight: 600;">● Green (≥75%)</span> | 
          <span style="color: var(--amber-warning); font-weight: 600;">● Yellow (40–74%)</span> | 
          <span style="color: var(--rose-danger); font-weight: 600;">● Red (&lt;40%)</span>
        </p>
      </div>

      <div class="challenge-stats">
        <div class="challenge-stat-item">
          <span class="challenge-stat-label">Successful Days</span>
          <span class="challenge-stat-val" style="color: var(--emerald-success);">${successfulDays}</span>
        </div>
        <div class="challenge-stat-item">
          <span class="challenge-stat-label">Partial Days</span>
          <span class="challenge-stat-val" style="color: var(--amber-warning);">${partialDays}</span>
        </div>
        <div class="challenge-stat-item">
          <span class="challenge-stat-label">Missed Days</span>
          <span class="challenge-stat-val" style="color: var(--rose-danger);">${lowDays}</span>
        </div>
        <div class="challenge-stat-item">
          <span class="challenge-stat-label">Challenge Avg</span>
          <span class="challenge-stat-val" style="color: var(--teal-primary);">${avgChallengeScore}%</span>
        </div>
      </div>
    </div>

    <!-- 30-Day Grid -->
    <div class="challenge-grid">
      ${days.map(d => `
        <div 
          class="challenge-day-card status-${d.status} ${d.isToday ? 'today' : ''}" 
          onclick="window.jumpToTrackerDate('${d.date}')"
          title="${formatDateReadable(d.date)}: ${d.percent}%">
          <div class="day-number">Day ${d.dayNum}</div>
          <div class="day-date-label">${d.date.slice(5)}</div>
          <div class="day-percent-indicator ${d.status}">
            ${d.isFuture ? 'Upcoming' : `${d.percent}%`}
          </div>
          ${d.isToday ? '<span class="badge badge-teal" style="font-size: 9px; padding: 1px 6px;">Today</span>' : ''}
        </div>
      `).join('')}
    </div>
  `;

  refreshIcons();

  // Attach restart / change start date handlers
  const restartBtn = document.getElementById('btn-restart-challenge');
  if (restartBtn) {
    restartBtn.onclick = async () => {
      const confirmReset = confirm('Start a brand new 30-Day Consistency Challenge from today? (Your past daily logs will NOT be deleted).');
      if (confirmReset) {
        await saveUserProfile({ challengeStartDate: todayISO });
        showToast('New 30-Day Challenge cycle started!', 'success');
        render30DayChallenge();
      }
    };
  }

  const changeStartBtn = document.getElementById('btn-change-challenge-start');
  if (changeStartBtn) {
    changeStartBtn.onclick = async () => {
      const newDate = prompt('Enter start date in YYYY-MM-DD format:', challengeStartDate);
      if (newDate && /^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
        await saveUserProfile({ challengeStartDate: newDate });
        showToast('Challenge start date updated!', 'success');
        render30DayChallenge();
      } else if (newDate) {
        showToast('Invalid date format. Use YYYY-MM-DD.', 'error');
      }
    };
  }
}

function addDaysToISO(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yStr = dt.getFullYear();
  const mStr = String(dt.getMonth() + 1).padStart(2, '0');
  const dStr = String(dt.getDate()).padStart(2, '0');
  return `${yStr}-${mStr}-${dStr}`;
}

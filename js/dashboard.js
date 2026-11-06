import {
  formatDateISO,
  formatDateReadable,
  getDayOfWeek,
  getMotivationalQuote,
  formatMinutes,
  refreshIcons,
  daysBetween
} from './utils.js';
import { getAllDaysRecords, getUserProfile } from './firestore.js';
import { calculateProgress } from './tracker.js';

export async function renderDashboard(todayData, currentUser) {
  const container = document.getElementById('dashboard-view');
  if (!container) return;

  // Compute greeting
  const hour = new Date().getHours();
  let timeGreeting = 'Good Morning';
  if (hour >= 12 && hour < 17) timeGreeting = 'Good Afternoon';
  else if (hour >= 17) timeGreeting = 'Good Evening';

  const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Scholar';

  // Compute progress for today
  const progress = calculateProgress(todayData?.activities || []);
  const quote = getMotivationalQuote(progress.percentage);

  // Fetch all records for streak & weekly average
  let allRecords = [];
  let userProfile = null;
  try {
    [allRecords, userProfile] = await Promise.all([
      getAllDaysRecords().catch(() => []),
      getUserProfile().catch(() => null)
    ]);
  } catch (e) {
    console.warn('Dashboard auxiliary fetch error:', e);
  }

  // Calculate Streak & Stats
  const stats = calculateStreakAndAverages(allRecords, todayData);

  // Calculate 30-day challenge day
  const todayISO = formatDateISO(new Date());
  const challengeStart = userProfile?.challengeStartDate || allRecords[0]?.date || todayISO;
  const dayDifference = daysBetween(challengeStart, todayISO);
  const challengeDay = Math.min(30, Math.max(1, (dayDifference % 30) + 1));

  // Determine current active activity based on hour
  const currentSlot = getCurrentScheduleSlot();

  const html = `
    <!-- Greeting & Banner -->
    <div class="page-header">
      <div>
        <h1 class="page-title">${timeGreeting}, ${userName}!</h1>
        <p class="page-subtitle">${formatDateReadable(todayISO)} • ${getDayOfWeek(todayISO)}</p>
      </div>
      <div style="display: flex; gap: 10px; align-items: center;">
        <span class="badge badge-teal">Day ${challengeDay} of 30 Challenge</span>
        <span class="badge badge-amber"><i data-lucide="flame" style="width: 14px; height: 14px;"></i> ${stats.currentStreak} Day Streak</span>
      </div>
    </div>

    <!-- Motivational Banner -->
    <div class="motivation-banner">
      <div class="motivation-icon-box">
        <i data-lucide="sparkles" style="width: 24px; height: 24px;"></i>
      </div>
      <div class="motivation-text">
        <div class="motivation-quote">"${quote.text}"</div>
        <div class="motivation-author">— ${quote.author}</div>
      </div>
      <div style="text-align: right; min-width: 110px;">
        <span style="font-size: 28px; font-weight: 800; color: var(--teal-primary);">${progress.percentage}%</span>
        <div style="font-size: 11.5px; color: var(--text-muted); text-transform: uppercase;">Today's Score</div>
      </div>
    </div>

    <!-- Metric Stats Grid -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon-wrapper teal">
          <i data-lucide="check-circle-2" style="width: 24px; height: 24px;"></i>
        </div>
        <div class="stat-content">
          <div class="stat-label">Daily Completion</div>
          <div class="stat-value">${progress.percentage}%</div>
          <div class="stat-subtext">${progress.doneCount}/${progress.totalCount - progress.skippedCount} targets completed</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon-wrapper amber">
          <i data-lucide="flame" style="width: 24px; height: 24px;"></i>
        </div>
        <div class="stat-content">
          <div class="stat-label">Current Streak</div>
          <div class="stat-value">${stats.currentStreak} <span style="font-size: 16px; font-weight: 500;">days</span></div>
          <div class="stat-subtext">Best Streak: ${stats.bestStreak} days</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon-wrapper blue">
          <i data-lucide="trending-up" style="width: 24px; height: 24px;"></i>
        </div>
        <div class="stat-content">
          <div class="stat-label">Weekly Average</div>
          <div class="stat-value">${stats.weeklyAverage}%</div>
          <div class="stat-subtext">Last 7 logged days</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon-wrapper indigo">
          <i data-lucide="clock" style="width: 24px; height: 24px;"></i>
        </div>
        <div class="stat-content">
          <div class="stat-label">Total Time Today</div>
          <div class="stat-value">${formatMinutes(progress.totalMinutes)}</div>
          <div class="stat-subtext">Total all-time: ${formatMinutes(stats.totalAllMinutes)}</div>
        </div>
      </div>
    </div>

    <!-- Category Progress Breakdown -->
    <div style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
      <h3 style="font-size: 16px; font-weight: 700; color: var(--text-primary);">Subject & Routine Progress</h3>
      <span style="font-size: 12px; color: var(--text-muted);">Real-time progress</span>
    </div>

    <div class="category-progress-grid">
      <!-- Job Prep -->
      <div class="category-card">
        <div class="category-card-top">
          <span class="category-card-title">
            <i data-lucide="briefcase" style="width: 17px; height: 17px; color: var(--blue-primary);"></i>
            Job Preparation
          </span>
          <span class="category-card-percent">${progress.categoryStats.jobPrep?.percentage || 0}%</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill blue" style="width: ${progress.categoryStats.jobPrep?.percentage || 0}%;"></div>
        </div>
        <div class="category-card-meta">
          <span>JavaScript, React, Node, Projects</span>
          <span>${formatMinutes(progress.categoryStats.jobPrep?.minutes || 0)}</span>
        </div>
      </div>

      <!-- DSA -->
      <div class="category-card">
        <div class="category-card-top">
          <span class="category-card-title">
            <i data-lucide="code-2" style="width: 17px; height: 17px; color: var(--teal-primary);"></i>
            DSA (JavaScript)
          </span>
          <span class="category-card-percent">${progress.categoryStats.dsa?.percentage || 0}%</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width: ${progress.categoryStats.dsa?.percentage || 0}%;"></div>
        </div>
        <div class="category-card-meta">
          <span>Algorithms & Data Structures</span>
          <span>${formatMinutes(progress.categoryStats.dsa?.minutes || 0)}</span>
        </div>
      </div>

      <!-- English Practice -->
      <div class="category-card">
        <div class="category-card-top">
          <span class="category-card-title">
            <i data-lucide="languages" style="width: 17px; height: 17px; color: var(--emerald-success);"></i>
            English Practice
          </span>
          <span class="category-card-percent">${progress.categoryStats.english?.percentage || 0}%</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill emerald" style="width: ${progress.categoryStats.english?.percentage || 0}%;"></div>
        </div>
        <div class="category-card-meta">
          <span>Reading, Listening, Writing, Speaking</span>
          <span>${formatMinutes(progress.categoryStats.english?.minutes || 0)}</span>
        </div>
      </div>

      <!-- GATE DA -->
      <div class="category-card">
        <div class="category-card-top">
          <span class="category-card-title">
            <i data-lucide="graduation-cap" style="width: 17px; height: 17px; color: var(--amber-warning);"></i>
            GATE DA (Data Science)
          </span>
          <span class="category-card-percent">${progress.categoryStats.gate?.percentage || 0}%</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill amber" style="width: ${progress.categoryStats.gate?.percentage || 0}%;"></div>
        </div>
        <div class="category-card-meta">
          <span>Python, Aptitude, PYQ & Revision</span>
          <span>${formatMinutes(progress.categoryStats.gate?.minutes || 0)}</span>
        </div>
      </div>

      <!-- Advanced / System Design -->
      <div class="category-card">
        <div class="category-card-top">
          <span class="category-card-title">
            <i data-lucide="layers" style="width: 17px; height: 17px; color: var(--indigo-primary);"></i>
            System Design & HLD/LLD
          </span>
          <span class="category-card-percent">${progress.categoryStats.advanced?.percentage || 0}%</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill indigo" style="width: ${progress.categoryStats.advanced?.percentage || 0}%;"></div>
        </div>
        <div class="category-card-meta">
          <span>HLD, LLD, Architecture & Mock</span>
          <span>${formatMinutes(progress.categoryStats.advanced?.minutes || 0)}</span>
        </div>
      </div>

      <!-- Morning Routine -->
      <div class="category-card">
        <div class="category-card-top">
          <span class="category-card-title">
            <i data-lucide="sun" style="width: 17px; height: 17px; color: #38bdf8;"></i>
            Morning Routine
          </span>
          <span class="category-card-percent">${progress.categoryStats.morning?.percentage || 0}%</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width: ${progress.categoryStats.morning?.percentage || 0}%; background: linear-gradient(90deg, #38bdf8, #0284c7);"></div>
        </div>
        <div class="category-card-meta">
          <span>Workout, Breakfast, Personal Work</span>
          <span>${formatMinutes(progress.categoryStats.morning?.minutes || 0)}</span>
        </div>
      </div>
    </div>

    <!-- Active Schedule Focus & Today Quick Actions -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px;">
      <!-- Up Next / Current Focus -->
      <div class="card">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <h4 style="font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
            <i data-lucide="compass" style="width: 18px; height: 18px; color: var(--teal-primary);"></i>
            Current Timetable Slot
          </h4>
          <span class="badge badge-teal">Live</span>
        </div>

        <div style="background-color: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 16px; margin-bottom: 14px;">
          <div style="font-size: 12px; color: var(--teal-primary); font-weight: 600; text-transform: uppercase;">
            ${currentSlot.time}
          </div>
          <div style="font-size: 16px; font-weight: 700; color: #fff; margin-top: 4px;">
            ${currentSlot.title}
          </div>
          <div style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">
            ${currentSlot.desc}
          </div>
        </div>

        <div style="display: flex; gap: 10px;">
          <button class="btn btn-primary" style="flex: 1;" onclick="window.switchView('tracker')">
            <i data-lucide="check-square" style="width: 16px; height: 16px;"></i>
            Open Daily Tracker
          </button>
          <button class="btn btn-secondary" onclick="window.switchView('timetable')">
            <i data-lucide="calendar" style="width: 16px; height: 16px;"></i>
            View Week
          </button>
        </div>
      </div>

      <!-- Pending Tasks Summary -->
      <div class="card">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <h4 style="font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
            <i data-lucide="list-todo" style="width: 18px; height: 18px; color: var(--amber-warning);"></i>
            Pending Targets for Today
          </h4>
          <span style="font-size: 12px; color: var(--text-muted);">${progress.notDoneCount} Remaining</span>
        </div>

        <div style="max-height: 220px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;">
          ${renderPendingList(todayData?.activities || [])}
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
  refreshIcons();
}

function renderPendingList(activities) {
  const pending = activities.filter(a => !a.status || a.status === 'not_done');
  if (pending.length === 0) {
    return `
      <div style="text-align: center; padding: 24px; color: var(--emerald-success);">
        <i data-lucide="check-circle" style="width: 32px; height: 32px; margin: 0 auto 8px; display: block;"></i>
        <div style="font-weight: 600;">All daily activities completed or logged!</div>
        <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Superb discipline today.</div>
      </div>
    `;
  }

  return pending.slice(0, 5).map(act => `
    <div style="display: flex; align-items: center; justify-content: space-between; background-color: var(--bg-input); padding: 10px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
      <div style="min-width: 0; flex: 1;">
        <div style="font-size: 13.5px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${act.title}</div>
        <div style="font-size: 11.5px; color: var(--text-muted);">${act.time}</div>
      </div>
      <button class="btn-sm btn-primary" onclick="window.quickCompleteTask('${act.id}')">
        Done
      </button>
    </div>
  `).join('');
}

function getCurrentScheduleSlot() {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const timeVal = hour * 60 + minute;

  if (timeVal >= 360 && timeVal < 450) { // 6:00 - 7:30
    return { time: '6:00 – 7:30 AM', title: 'Exercise / Ground workout', desc: 'Physical fitness, energy boosting, running, or gym' };
  } else if (timeVal >= 450 && timeVal < 540) { // 7:30 - 9:00
    return { time: '7:30 – 9:00 AM', title: 'Freshen up + Healthy Breakfast', desc: 'Nutritious meal & planning the day' };
  } else if (timeVal >= 540 && timeVal < 600) { // 9:00 - 10:00
    return { time: '9:00 – 10:00 AM', title: 'Personal Work', desc: 'Admin tasks, personal errands & focus preparation' };
  } else if (timeVal >= 600 && timeVal < 660) { // 10:00 - 11:00
    return { time: '10:00 – 11:00 AM', title: 'Job Applications / Career Activities', desc: 'Tailoring resumes, applying to top openings & LinkedIn' };
  } else if (timeVal >= 720 && timeVal < 810) { // 12:00 - 1:30
    return { time: '12:00 – 1:30 PM', title: 'DSA using JavaScript', desc: 'Targeted algorithm & problem solving practice' };
  } else if (timeVal >= 825 && timeVal < 885) { // 1:45 - 2:45
    return { time: '1:45 – 2:45 PM', title: 'JavaScript / TypeScript Deep Dive', desc: 'Core language mastery and internal mechanics' };
  } else if (timeVal >= 900 && timeVal < 960) { // 3:00 - 4:00
    return { time: '3:00 – 4:00 PM', title: 'React.js / Node.js Framework Study', desc: 'Component architecture, state, and server APIs' };
  } else if (timeVal >= 975 && timeVal < 1020) { // 4:15 - 5:00
    return { time: '4:15 – 5:00 PM', title: 'Project Development & Architecture', desc: 'Writing clean code and building production features' };
  } else if (timeVal >= 1140 && timeVal < 1200) { // 7:00 - 8:00
    return { time: '7:00 – 8:00 PM', title: 'Advanced Prep / System Design (HLD/LLD)', desc: 'High-level scalability, distributed systems & interview prep' };
  } else if (timeVal >= 1200 && timeVal < 1260) { // 8:00 - 9:00
    return { time: '8:00 – 9:00 PM', title: 'English Practice (4 Skills)', desc: 'Reading (15m), Listening (15m), Writing (15m), Speaking (15m)' };
  } else if (timeVal >= 1260 && timeVal < 1350) { // 9:00 - 10:30
    return { time: '9:00 – 10:30 PM', title: 'GATE DA: Python Programming', desc: 'Python for Data Science & AI syllabus coverage' };
  } else if (timeVal >= 1360 && timeVal < 1410) { // 10:40 - 11:30
    return { time: '10:40 – 11:30 PM', title: 'GATE DA: Aptitude & Math', desc: 'Quantitative aptitude, probability & reasoning drills' };
  } else if (timeVal >= 1410 || timeVal < 60) { // 11:30 - 12:00
    return { time: '11:30 – 12:00 AM', title: 'GATE DA: PYQ + Revision', desc: 'Review mistakes, solve past papers, and wind down' };
  } else {
    return { time: 'Rest & Focus Period', title: 'Self-Directed Study or Recharge', desc: 'Next scheduled block will start soon' };
  }
}

/**
 * Streak and average calculation algorithm from real Firestore data
 */
function calculateStreakAndAverages(records = [], todayRecord = null) {
  const map = {};
  records.forEach(r => {
    if (r.date) map[r.date] = r;
  });

  if (todayRecord && todayRecord.date) {
    map[todayRecord.date] = todayRecord;
  }

  const allDates = Object.keys(map).sort();
  let totalAllMinutes = 0;
  allDates.forEach(d => {
    totalAllMinutes += Number(map[d].totalMinutesSpent) || 0;
  });

  // Calculate Streak backwards from today
  const todayISO = formatDateISO(new Date());
  let currentStreak = 0;
  let checkDate = todayISO;

  // Check today first
  const todayEntry = map[todayISO];
  if (todayEntry && todayEntry.completionPercentage >= 40) {
    currentStreak++;
    checkDate = addDays(checkDate, -1);
  } else {
    // If today hasn't finished yet or percentage is low, check yesterday
    checkDate = addDays(todayISO, -1);
  }

  while (true) {
    const entry = map[checkDate];
    if (entry && entry.completionPercentage >= 40) {
      currentStreak++;
      checkDate = addDays(checkDate, -1);
    } else {
      break;
    }
  }

  // Calculate best streak across history
  let bestStreak = 0;
  let tempStreak = 0;
  let prevDate = null;

  allDates.forEach(d => {
    const entry = map[d];
    if (entry.completionPercentage >= 40) {
      if (prevDate && daysBetween(prevDate, d) === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
      bestStreak = Math.max(bestStreak, tempStreak);
      prevDate = d;
    } else {
      tempStreak = 0;
      prevDate = null;
    }
  });

  bestStreak = Math.max(bestStreak, currentStreak);

  // Calculate weekly average (last 7 recorded days)
  const last7 = allDates.slice(-7);
  let weeklyAverage = 0;
  if (last7.length > 0) {
    const sum = last7.reduce((acc, d) => acc + (map[d].completionPercentage || 0), 0);
    weeklyAverage = Math.round(sum / last7.length);
  } else if (todayEntry) {
    weeklyAverage = todayEntry.completionPercentage || 0;
  }

  return {
    currentStreak,
    bestStreak,
    weeklyAverage,
    totalAllMinutes
  };
}

function addDays(dateStr, days) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dt = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dt}`;
}

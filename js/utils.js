import confetti from 'canvas-confetti';
import { createIcons, icons } from 'lucide';

// Format Date to YYYY-MM-DD in local time
export function formatDateISO(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Format Date to readable string (e.g. "Friday, Nov 6, 2026")
export function formatDateReadable(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Get day name (Monday, Tuesday, etc.)
export function getDayOfWeek(dateStr) {
  if (!dateStr) return 'Monday';
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}

// Add days to date string
export function addDays(dateStr, days) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + days);
  return formatDateISO(d);
}

// Calculate days difference between two ISO dates (d2 - d1)
export function daysBetween(dateStr1, dateStr2) {
  const [y1, m1, d1] = dateStr1.split('-').map(Number);
  const [y2, m2, d2] = dateStr2.split('-').map(Number);
  const dt1 = new Date(y1, m1 - 1, d1);
  const dt2 = new Date(y2, m2 - 1, d2);
  const diffTime = dt2.getTime() - dt1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

// Motivational quotes categorized by progress percentage
const MOTIVATIONAL_QUOTES = {
  perfect: [
    { text: "Outstanding execution! 100% completion today. You are building championship habits.", author: "Mastery Mindset" },
    { text: "Flawless consistency today! Every topic conquered builds unstoppable momentum.", author: "Growth Formula" },
    { text: "Perfection achieved! Your future self will look back on today with absolute gratitude.", author: "Daily Focus" }
  ],
  high: [
    { text: "Incredible work today! High consistency is the secret compound interest of mastery.", author: "James Clear" },
    { text: "You've crushed the majority of your goals. Finish with pride and prepare for tomorrow.", author: "Deep Work" },
    { text: "Over 75% completed! Keep this fire burning, day by day, problem by problem.", author: "DSA Discipline" }
  ],
  medium: [
    { text: "Solid progress logged. Every completed block moves you closer to the finish line.", author: "Continuous Growth" },
    { text: "Halfway or more! Push through the remaining study sessions to close out strong.", author: "Focus Mantra" },
    { text: "Consistency beats intensity every single time. Keep chipping away at your targets.", author: "Engineering Mindset" }
  ],
  low: [
    { text: "A journey of a thousand miles begins with a single step. Complete one more activity!", author: "Lao Tzu" },
    { text: "Even small progress beats zero. Open your notes and conquer one focused pomodoro.", author: "Atomic Habits" },
    { text: "Don't break the chain. 20 minutes of DSA or English today will preserve your streak.", author: "Streak Keeper" }
  ],
  zero: [
    { text: "A fresh canvas awaits today. Start with your morning workout or first coding block!", author: "Daily Starter" },
    { text: "Success is the sum of small efforts repeated day in and day out. Let's make today count.", author: "Robert Collier" },
    { text: "Focus on the process, not the pressure. Your 30-day consistency journey is happening now.", author: "Mindset" }
  ]
};

export function getMotivationalQuote(percentage) {
  let category = 'zero';
  if (percentage === 100) category = 'perfect';
  else if (percentage >= 75) category = 'high';
  else if (percentage >= 45) category = 'medium';
  else if (percentage > 0) category = 'low';

  const list = MOTIVATIONAL_QUOTES[category];
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

// Toast Notification System
export function showToast(message, type = 'info', duration = 3000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div style="flex: 1;">${message}</div>
    <button style="color: var(--text-muted); padding: 4px;" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 200ms ease';
      setTimeout(() => toast.remove(), 200);
    }
  }, duration);
}

// Trigger Confetti Celebration
export function triggerCelebration() {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#14b8a6', '#06b6d4', '#3b82f6', '#10b981', '#f59e0b']
  });
}

// Refresh Lucide Icons across DOM
export function refreshIcons() {
  try {
    createIcons({ icons });
  } catch (e) {
    console.error('Error refreshing Lucide icons:', e);
  }
}

// Export data to CSV file download
export function exportToCSV(filename, rows) {
  const processRow = (row) => {
    return row.map(val => {
      if (val === null || val === undefined) return '""';
      let result = String(val).replace(/"/g, '""');
      if (result.search(/("|,|\n)/g) >= 0) {
        result = `"${result}"`;
      }
      return result;
    }).join(',');
  };

  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(processRow).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

// Export data to JSON file download
export function exportToJSON(filename, data) {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
  const link = document.createElement('a');
  link.setAttribute('href', dataStr);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

// Format minutes into human-readable e.g. "1h 30m" or "45m"
export function formatMinutes(minutes) {
  const mins = Number(minutes) || 0;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

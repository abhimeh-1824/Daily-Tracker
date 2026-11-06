import {
  DEFAULT_WEEKLY_ROTATION,
  DEFAULT_TIME_BLOCKS
} from './timetable.js';
import { getUserProfile, saveUserProfile, getAllDaysRecords } from './firestore.js';
import { refreshIcons, showToast, formatDateReadable, formatMinutes } from './utils.js';

/**
 * Render the Weekly Timetable Matrix
 */
export async function renderWeeklyTimetable() {
  const container = document.getElementById('timetable-view');
  if (!container) return;

  const profile = await getUserProfile().catch(() => null);
  const currentRotation = profile?.customTimetable || DEFAULT_WEEKLY_ROTATION;

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  let html = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Weekly Subject Rotation & Schedule</h1>
        <p class="page-subtitle">Structured syllabus progression across all 7 days with custom topic editing</p>
      </div>
      <div style="display: flex; gap: 10px;">
        <button class="btn btn-secondary btn-sm" id="btn-edit-timetable">
          <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i>
          Customize Topics
        </button>
        <button class="btn btn-outline btn-sm" id="btn-reset-timetable">
          <i data-lucide="rotate-ccw" style="width: 14px; height: 14px;"></i>
          Reset to Default
        </button>
      </div>
    </div>

    <!-- Daily Time Slots Reference -->
    <div class="card" style="margin-bottom: 24px;">
      <h3 style="font-size: 15px; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
        <i data-lucide="clock" style="width: 18px; height: 18px; color: var(--teal-primary);"></i>
        Standard Daily Schedule Blueprint
      </h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
        ${DEFAULT_TIME_BLOCKS.map(b => `
          <div style="background-color: var(--bg-input); padding: 10px 14px; border-radius: var(--radius-md); border-left: 3px solid var(--teal-primary);">
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">${b.timeRange}</div>
            <div style="font-size: 13.5px; font-weight: 600; color: var(--text-primary); margin-top: 2px;">${b.title}</div>
            <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 4px;">${b.activities.length} targeted activities</div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- 7-Day Matrix Table -->
    <div class="weekly-timetable-container">
      <table class="weekly-table">
        <thead>
          <tr>
            <th style="width: 140px;">Day</th>
            <th>DSA (JavaScript)</th>
            <th>JS / Framework</th>
            <th>GATE Python</th>
            <th>GATE Aptitude</th>
            <th>Advanced / System Design</th>
          </tr>
        </thead>
        <tbody>
          ${daysOfWeek.map(day => {
            const rot = currentRotation[day] || DEFAULT_WEEKLY_ROTATION[day];
            const isToday = day === todayName;
            return `
              <tr class="${isToday ? 'today-row' : ''}">
                <td class="${isToday ? 'today-cell' : ''}" style="font-weight: 700; color: ${isToday ? 'var(--teal-primary)' : 'var(--text-primary)'};">
                  ${day}
                  ${isToday ? '<br><span class="badge badge-teal" style="font-size: 9px; margin-top: 4px;">Today</span>' : ''}
                </td>
                <td class="${isToday ? 'today-cell' : ''}">
                  <span class="subject-item-tag" style="border-left: 3px solid var(--teal-primary); font-weight: 600;">
                    ${rot.dsa || '—'}
                  </span>
                </td>
                <td class="${isToday ? 'today-cell' : ''}">
                  <span class="subject-item-tag" style="border-left: 3px solid var(--blue-primary);">
                    ${rot.js_ts || '—'}
                  </span>
                  <span class="subject-item-tag" style="border-left: 3px solid #60a5fa; font-size: 11px;">
                    ${rot.framework || '—'}
                  </span>
                </td>
                <td class="${isToday ? 'today-cell' : ''}">
                  <span class="subject-item-tag" style="border-left: 3px solid var(--amber-warning);">
                    ${rot.gate_python || '—'}
                  </span>
                </td>
                <td class="${isToday ? 'today-cell' : ''}">
                  <span class="subject-item-tag" style="border-left: 3px solid #fbbf24;">
                    ${rot.gate_aptitude || '—'}
                  </span>
                </td>
                <td class="${isToday ? 'today-cell' : ''}">
                  <span class="subject-item-tag" style="border-left: 3px solid var(--indigo-primary);">
                    ${rot.advanced || '—'}
                  </span>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;
  refreshIcons();

  // Reset timetable handler
  const resetBtn = document.getElementById('btn-reset-timetable');
  if (resetBtn) {
    resetBtn.onclick = async () => {
      if (confirm('Reset weekly timetable to original syllabus rotations?')) {
        await saveUserProfile({ customTimetable: DEFAULT_WEEKLY_ROTATION });
        showToast('Weekly timetable reset to default!', 'success');
        renderWeeklyTimetable();
      }
    };
  }

  // Edit timetable handler
  const editBtn = document.getElementById('btn-edit-timetable');
  if (editBtn) {
    editBtn.onclick = () => {
      openTimetableEditorModal(currentRotation);
    };
  }
}

function openTimetableEditorModal(rotation) {
  const modal = document.getElementById('timetable-edit-modal');
  const daySelect = document.getElementById('modal-timetable-day-select');
  const dsaInput = document.getElementById('modal-tt-dsa');
  const jsInput = document.getElementById('modal-tt-js');
  const frameInput = document.getElementById('modal-tt-framework');
  const pythonInput = document.getElementById('modal-tt-python');
  const aptInput = document.getElementById('modal-tt-aptitude');
  const advInput = document.getElementById('modal-tt-advanced');
  const saveBtn = document.getElementById('modal-save-timetable-btn');

  const populateFields = (day) => {
    const cur = rotation[day] || DEFAULT_WEEKLY_ROTATION[day];
    if (dsaInput) dsaInput.value = cur.dsa || '';
    if (jsInput) jsInput.value = cur.js_ts || '';
    if (frameInput) frameInput.value = cur.framework || '';
    if (pythonInput) pythonInput.value = cur.gate_python || '';
    if (aptInput) aptInput.value = cur.gate_aptitude || '';
    if (advInput) advInput.value = cur.advanced || '';
  };

  if (daySelect) {
    daySelect.onchange = (e) => populateFields(e.target.value);
    populateFields(daySelect.value);
  }

  if (modal) modal.classList.add('active');

  if (saveBtn) {
    saveBtn.onclick = async () => {
      const day = daySelect.value;
      const updated = {
        ...rotation,
        [day]: {
          dsa: dsaInput.value.trim(),
          js_ts: jsInput.value.trim(),
          framework: frameInput.value.trim(),
          gate_python: pythonInput.value.trim(),
          gate_aptitude: aptInput.value.trim(),
          advanced: advInput.value.trim()
        }
      };

      await saveUserProfile({ customTimetable: updated });
      showToast(`Updated subjects for ${day}!`, 'success');
      if (modal) modal.classList.remove('active');
      renderWeeklyTimetable();
    };
  }
}

/**
 * Render Dedicated DSA Tracker
 */
export async function renderDSATracker() {
  const container = document.getElementById('dsa-view');
  if (!container) return;

  const [records, profile] = await Promise.all([
    getAllDaysRecords().catch(() => []),
    getUserProfile().catch(() => null)
  ]);

  const savedTopics = profile?.dsaTopics || {
    'arrays': { name: 'Arrays & Two Pointers', solved: 24, status: 'Mastered' },
    'sliding_window': { name: 'Sliding Window (Fixed & Variable)', solved: 18, status: 'In Progress' },
    'hashmap_prefix': { name: 'HashMap & Prefix Sum', solved: 20, status: 'Mastered' },
    'binary_search': { name: 'Binary Search (Classic & Answer Space)', solved: 16, status: 'In Progress' },
    'linked_list': { name: 'Linked Lists (Fast/Slow & Reversals)', solved: 14, status: 'Mastered' },
    'stack_queue': { name: 'Stack, Monotonic Stack & Queue', solved: 15, status: 'In Progress' },
    'trees': { name: 'Binary Trees, BST & Traversals', solved: 22, status: 'In Progress' },
    'graphs': { name: 'Graphs (BFS, DFS, Dijkstra, TopoSort)', solved: 12, status: 'Learning' },
    'dp': { name: 'Dynamic Programming (1D, 2D, Knapsack)', solved: 8, status: 'Learning' }
  };

  // Calculate total problems solved
  const totalSolved = Object.values(savedTopics).reduce((acc, t) => acc + (Number(t.solved) || 0), 0);

  // Filter study sessions from records
  const dsaSessions = [];
  records.forEach(r => {
    if (r.activities) {
      r.activities.forEach(a => {
        if (a.category === 'dsa' && a.status === 'done') {
          dsaSessions.push({
            date: r.date,
            topic: a.topic || 'DSA Practice',
            minutes: a.actualMinutes || 90,
            notes: a.notes || ''
          });
        }
      });
    }
  });

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">DSA Mastery Tracker (JavaScript)</h1>
        <p class="page-subtitle">Track algorithm problem counts, topic proficiency, and LeetCode progression</p>
      </div>
      <div>
        <span class="badge badge-teal">${totalSolved} Total Problems Solved</span>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon-wrapper teal"><i data-lucide="code-2" style="width: 24px; height: 24px;"></i></div>
        <div class="stat-content">
          <div class="stat-label">Total Solved</div>
          <div class="stat-value">${totalSolved}</div>
          <div class="stat-subtext">Across 9 core patterns</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrapper blue"><i data-lucide="check-circle" style="width: 24px; height: 24px;"></i></div>
        <div class="stat-content">
          <div class="stat-label">Patterns Mastered</div>
          <div class="stat-value">${Object.values(savedTopics).filter(t => t.status === 'Mastered').length} / 9</div>
          <div class="stat-subtext">High confidence</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrapper amber"><i data-lucide="calendar" style="width: 24px; height: 24px;"></i></div>
        <div class="stat-content">
          <div class="stat-label">Completed Sessions</div>
          <div class="stat-value">${dsaSessions.length}</div>
          <div class="stat-subtext">From daily study logs</div>
        </div>
      </div>
    </div>

    <!-- DSA Topic Roadmap Table -->
    <div class="card" style="margin-bottom: 24px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
        <h3 style="font-size: 16px; font-weight: 700;">Topic Roadmap & Problem Counts</h3>
        <span style="font-size: 12px; color: var(--text-muted);">Click +/- to update solved counts</span>
      </div>
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-subtle); text-align: left; font-size: 12.5px; color: var(--text-muted);">
              <th style="padding: 10px 14px;">Topic / Pattern</th>
              <th style="padding: 10px 14px;">Status</th>
              <th style="padding: 10px 14px;">Problems Solved</th>
              <th style="padding: 10px 14px; text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${Object.keys(savedTopics).map(key => {
              const topic = savedTopics[key];
              const badgeStyle = topic.status === 'Mastered' ? 'badge-emerald' : topic.status === 'In Progress' ? 'badge-amber' : 'badge-blue';
              return `
                <tr style="border-bottom: 1px solid var(--border-subtle); font-size: 13.5px;">
                  <td style="padding: 12px 14px; font-weight: 600; color: var(--text-primary);">${topic.name}</td>
                  <td style="padding: 12px 14px;">
                    <span class="badge ${badgeStyle}">${topic.status}</span>
                  </td>
                  <td style="padding: 12px 14px; font-weight: 700; color: var(--teal-primary); font-family: var(--font-mono);">${topic.solved}</td>
                  <td style="padding: 12px 14px; text-align: right;">
                    <button class="btn-sm btn-secondary" onclick="window.updateDSAProblems('${key}', 1)">+1 Problem</button>
                    <button class="btn-sm btn-outline" onclick="window.toggleDSAStatus('${key}')">Status</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Recent DSA Daily Study Logs -->
    <div class="card">
      <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 14px;">Recent DSA Daily Sessions</h3>
      ${dsaSessions.length === 0 ? `
        <div style="text-align: center; padding: 20px; color: var(--text-muted);">No completed DSA sessions logged yet. Mark your daily DSA block as Done in Daily Tracker!</div>
      ` : `
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${dsaSessions.slice(-6).reverse().map(s => `
            <div style="background-color: var(--bg-input); padding: 10px 14px; border-radius: var(--radius-sm); border-left: 3px solid var(--teal-primary); display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span style="font-weight: 600; color: var(--text-primary); font-size: 13.5px;">${s.topic}</span>
                ${s.notes ? `<div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">${s.notes}</div>` : ''}
              </div>
              <div style="text-align: right; font-size: 12px; color: var(--text-secondary);">
                <div>${formatDateReadable(s.date)}</div>
                <div style="color: var(--teal-primary); font-weight: 600;">${formatMinutes(s.minutes)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;

  refreshIcons();

  window.updateDSAProblems = async (key, delta) => {
    savedTopics[key].solved = Math.max(0, (savedTopics[key].solved || 0) + delta);
    await saveUserProfile({ dsaTopics: savedTopics });
    showToast(`Updated ${savedTopics[key].name}!`, 'success');
    renderDSATracker();
  };

  window.toggleDSAStatus = async (key) => {
    const statuses = ['Learning', 'In Progress', 'Mastered'];
    const curIdx = statuses.indexOf(savedTopics[key].status);
    savedTopics[key].status = statuses[(curIdx + 1) % statuses.length];
    await saveUserProfile({ dsaTopics: savedTopics });
    renderDSATracker();
  };
}

/**
 * Render Dedicated English Practice Tracker
 */
export async function renderEnglishTracker() {
  const container = document.getElementById('english-view');
  if (!container) return;

  const profile = await getUserProfile().catch(() => null);
  const vocabList = profile?.vocabulary || [
    { word: 'Pragmatic', meaning: 'Dealing with things sensibly and realistically based on practical rather than theoretical considerations.', example: 'He took a pragmatic approach to optimizing the database query.' },
    { word: 'Concurrent', meaning: 'Occurring or existing at the same time.', example: 'Node.js handles concurrent requests efficiently via the event loop.' },
    { word: 'Idempotent', meaning: 'An operation that produces the same result whether applied once or multiple times.', example: 'HTTP PUT requests should be idempotent.' }
  ];

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">English Practice (4 Skills Daily)</h1>
        <p class="page-subtitle">Daily dedicated 1-hour split: Reading, Listening, Writing, and Speaking</p>
      </div>
      <div style="display: flex; gap: 10px;">
        <button class="btn btn-primary btn-sm" onclick="window.switchView('verbs')">
          <i data-lucide="brain" style="width: 14px; height: 14px;"></i>
          Verb Flashcards & Revision Lab
        </button>
        <button class="btn btn-secondary btn-sm" id="btn-add-vocab">
          <i data-lucide="plus" style="width: 14px; height: 14px;"></i>
          Add Vocabulary
        </button>
      </div>
    </div>

    <!-- Verb Memory & Fast Revision Feature Card -->
    <div style="background: linear-gradient(135deg, #11283a 0%, #17344c 100%); border: 1px solid rgba(20, 184, 166, 0.35); border-radius: var(--radius-lg); padding: 20px 24px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.3);">
      <div style="display: flex; align-items: center; gap: 16px;">
        <div style="width: 48px; height: 48px; border-radius: var(--radius-md); background-color: rgba(20, 184, 166, 0.15); display: flex; align-items: center; justify-content: center; color: var(--teal-primary); flex-shrink: 0;">
          <i data-lucide="brain" style="width: 26px; height: 26px;"></i>
        </div>
        <div>
          <h3 style="font-size: 16.5px; font-weight: 700; color: #fff;">Action Verbs & Fast Revision Lab</h3>
          <p style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">
            Master high-impact action verbs with 2 to 3 real-life engineering sentences, mnemonics, 3D flip flashcards, and native audio.
          </p>
        </div>
      </div>
      <button class="btn btn-primary" onclick="window.switchView('verbs')">
        <i data-lucide="layers" style="width: 16px; height: 16px;"></i>
        Launch Verb Lab
      </button>
    </div>

    <!-- 4 Skills Breakdown Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon-wrapper teal"><i data-lucide="book-open" style="width: 24px; height: 24px;"></i></div>
        <div class="stat-content">
          <div class="stat-label">Reading (8:00 – 8:15 PM)</div>
          <div class="stat-value" style="font-size: 18px;">Tech Blogs & Docs</div>
          <div class="stat-subtext">HackerNews, Medium, MDN articles</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrapper blue"><i data-lucide="headphones" style="width: 24px; height: 24px;"></i></div>
        <div class="stat-content">
          <div class="stat-label">Listening (8:15 – 8:30 PM)</div>
          <div class="stat-value" style="font-size: 18px;">Engineering Talks</div>
          <div class="stat-subtext">Syntax FM, Lex Fridman, TED</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrapper amber"><i data-lucide="pen-tool" style="width: 24px; height: 24px;"></i></div>
        <div class="stat-content">
          <div class="stat-label">Writing (8:30 – 8:45 PM)</div>
          <div class="stat-value" style="font-size: 18px;">Daily Summary</div>
          <div class="stat-subtext">Technical summaries & professional writing</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrapper emerald"><i data-lucide="mic" style="width: 24px; height: 24px;"></i></div>
        <div class="stat-content">
          <div class="stat-label">Speaking (8:45 – 9:00 PM)</div>
          <div class="stat-value" style="font-size: 18px;">Fluency Drills</div>
          <div class="stat-subtext">Explaining solutions aloud</div>
        </div>
      </div>
    </div>

    <!-- Vocabulary Bank -->
    <div class="card">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
        <h3 style="font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
          <i data-lucide="bookmark" style="width: 18px; height: 18px; color: var(--emerald-success);"></i>
          Vocabulary Notebook (${vocabList.length} words saved)
        </h3>
        <span style="font-size: 12px; color: var(--text-muted);">Synced to cloud</span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px;">
        ${vocabList.map((item, idx) => `
          <div style="background-color: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 15px; font-weight: 700; color: #fff;">${item.word}</span>
              <button class="btn-icon" style="width: 24px; height: 24px;" onclick="window.removeVocab(${idx})">
                <i data-lucide="trash-2" style="width: 13px; height: 13px; color: var(--rose-danger);"></i>
              </button>
            </div>
            <div style="font-size: 12.5px; color: var(--text-secondary); line-height: 1.4; margin-bottom: 8px;">${item.meaning}</div>
            <div style="font-size: 11.5px; color: var(--text-muted); font-style: italic; border-left: 2px solid var(--emerald-success); padding-left: 8px;">"${item.example}"</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  refreshIcons();

  const addBtn = document.getElementById('btn-add-vocab');
  if (addBtn) {
    addBtn.onclick = async () => {
      const word = prompt('Enter new word:');
      if (!word) return;
      const meaning = prompt(`Meaning of "${word}":`) || '';
      const example = prompt(`Example sentence:`) || '';

      const updated = [...vocabList, { word: word.trim(), meaning: meaning.trim(), example: example.trim() }];
      await saveUserProfile({ vocabulary: updated });
      showToast(`Added "${word}" to vocabulary notebook!`, 'success');
      renderEnglishTracker();
    };
  }

  window.removeVocab = async (idx) => {
    if (confirm('Delete this word from your notebook?')) {
      vocabList.splice(idx, 1);
      await saveUserProfile({ vocabulary: vocabList });
      renderEnglishTracker();
    }
  };
}

/**
 * Render Dedicated GATE DA Tracker
 */
export async function renderGATETracker() {
  const container = document.getElementById('gate-view');
  if (!container) return;

  const profile = await getUserProfile().catch(() => null);
  const gateTopics = profile?.gateTopics || {
    python: { name: 'Python Programming (Syntax, OOP, NumPy, Pandas)', completed: 80 },
    stats: { name: 'Probability & Statistics (Distributions, Hypothesis Testing)', completed: 65 },
    math: { name: 'Linear Algebra & Calculus (Matrices, Eigenvalues, Gradients)', completed: 70 },
    ml: { name: 'Machine Learning (Regression, Classification, Clustering)', completed: 50 },
    ai: { name: 'Artificial Intelligence (Search Algorithms, Logic)', completed: 40 },
    dbms: { name: 'DBMS & Warehousing (SQL, Normalization, Indexing)', completed: 75 },
    aptitude: { name: 'General Aptitude (Percentages, Time & Work, Reasoning)', completed: 85 }
  };

  const mockScores = profile?.gateMocks || [
    { name: 'GATE DA Mock Test 1', score: 68, total: 100, date: '2026-11-01' },
    { name: 'Python & Math Sectional Mock', score: 42, total: 50, date: '2026-11-04' }
  ];

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">GATE DA (Data Science & AI) Tracker</h1>
        <p class="page-subtitle">Track syllabus coverage, aptitude practice, and mock test scores for GATE DA</p>
      </div>
      <button class="btn btn-primary btn-sm" id="btn-add-mock-score">
        <i data-lucide="plus" style="width: 14px; height: 14px;"></i>
        Log Mock Test Score
      </button>
    </div>

    <!-- Syllabus Modules Progress -->
    <div class="card" style="margin-bottom: 24px;">
      <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 16px;">Syllabus Mastery Progress</h3>
      <div style="display: flex; flex-direction: column; gap: 14px;">
        ${Object.keys(gateTopics).map(key => {
          const t = gateTopics[key];
          return `
            <div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 13.5px;">
                <span style="font-weight: 600; color: var(--text-primary);">${t.name}</span>
                <span style="font-weight: 700; color: var(--amber-warning); cursor: pointer;" onclick="window.updateGATESyllabus('${key}')">${t.completed}%</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill amber" style="width: ${t.completed}%;"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Mock Test Scores History -->
    <div class="card">
      <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 14px;">Mock Examination History</h3>
      <div style="display: flex; flex-direction: column; gap: 10px;">
        ${mockScores.map((m, idx) => `
          <div style="background-color: var(--bg-input); padding: 12px 16px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between; border-left: 3px solid var(--amber-warning);">
            <div>
              <div style="font-weight: 600; color: #fff; font-size: 14px;">${m.name}</div>
              <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">Taken on ${formatDateReadable(m.date)}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 14px;">
              <span style="font-size: 18px; font-weight: 700; color: var(--amber-warning); font-family: var(--font-mono);">${m.score}/${m.total}</span>
              <button class="btn-icon" style="width: 24px; height: 24px;" onclick="window.deleteMock(${idx})">
                <i data-lucide="trash-2" style="width: 13px; height: 13px; color: var(--rose-danger);"></i>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  refreshIcons();

  window.updateGATESyllabus = async (key) => {
    const cur = gateTopics[key].completed;
    const input = prompt(`Update % completion for ${gateTopics[key].name}:`, cur);
    if (input !== null) {
      const val = Math.min(100, Math.max(0, parseInt(input, 10) || 0));
      gateTopics[key].completed = val;
      await saveUserProfile({ gateTopics });
      showToast('Updated GATE syllabus percentage!', 'success');
      renderGATETracker();
    }
  };

  const addMockBtn = document.getElementById('btn-add-mock-score');
  if (addMockBtn) {
    addMockBtn.onclick = async () => {
      const name = prompt('Mock Test Name / Subject:');
      if (!name) return;
      const score = parseInt(prompt('Your Score:'), 10) || 0;
      const total = parseInt(prompt('Total Marks:'), 10) || 100;
      const today = new Date().toISOString().slice(0, 10);

      const updated = [...mockScores, { name: name.trim(), score, total, date: today }];
      await saveUserProfile({ gateMocks: updated });
      showToast('Mock test score logged!', 'success');
      renderGATETracker();
    };
  }

  window.deleteMock = async (idx) => {
    mockScores.splice(idx, 1);
    await saveUserProfile({ gateMocks: mockScores });
    renderGATETracker();
  };
}

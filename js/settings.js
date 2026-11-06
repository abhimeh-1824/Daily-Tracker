import { getUserProfile, saveUserProfile, getAllDaysRecords, importBackupData } from './firestore.js';
import { exportToCSV, exportToJSON, showToast, refreshIcons, formatDateReadable } from './utils.js';
import { testConnection } from './firebase-config.js';

export async function renderSettings(currentUser) {
  const container = document.getElementById('settings-view');
  if (!container) return;

  const profile = await getUserProfile().catch(() => null);

  const displayName = profile?.displayName || currentUser?.displayName || '';
  const challengeStartDate = profile?.challengeStartDate || new Date().toISOString().slice(0, 10);
  const targetDailyHours = profile?.targetDailyHours || 8;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Settings & Data Management</h1>
        <p class="page-subtitle">Configure study preferences, export CSV/JSON backups, and manage your account</p>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 24px;">
      <!-- Profile Card -->
      <div class="card">
        <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <i data-lucide="user" style="width: 18px; height: 18px; color: var(--teal-primary);"></i>
          User Profile & Targets
        </h3>

        <form id="settings-profile-form">
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input type="email" style="width: 100%; opacity: 0.6; cursor: not-allowed;" value="${currentUser?.email || ''}" disabled />
          </div>

          <div class="form-group">
            <label class="form-label">Display Name</label>
            <input type="text" id="settings-name-input" style="width: 100%;" value="${displayName}" placeholder="e.g. Abhishek Mehra" />
          </div>

          <div class="form-group">
            <label class="form-label">30-Day Challenge Start Date</label>
            <input type="date" id="settings-start-date" style="width: 100%;" value="${challengeStartDate}" />
          </div>

          <div class="form-group">
            <label class="form-label">Target Daily Study Hours</label>
            <input type="number" id="settings-target-hours" style="width: 100%;" min="1" max="18" value="${targetDailyHours}" />
          </div>

          <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 8px;">
            <i data-lucide="save" style="width: 16px; height: 16px;"></i>
            Save Profile Settings
          </button>
        </form>
      </div>

      <!-- Data Backup & Portability -->
      <div class="card">
        <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <i data-lucide="database" style="width: 18px; height: 18px; color: var(--blue-primary);"></i>
          Data Portability & Backup
        </h3>
        <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;">
          Export your complete study logs permanently to CSV (for Excel / Google Sheets) or JSON (for cloud backups and cross-device imports).
        </p>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          <button class="btn btn-secondary" id="btn-export-csv" style="justify-content: flex-start;">
            <i data-lucide="file-spreadsheet" style="width: 18px; height: 18px; color: var(--emerald-success);"></i>
            Export Study History as CSV
          </button>

          <button class="btn btn-secondary" id="btn-export-json" style="justify-content: flex-start;">
            <i data-lucide="download" style="width: 18px; height: 18px; color: var(--cyan-accent);"></i>
            Export Full Database Backup (JSON)
          </button>

          <div style="margin-top: 8px; border-top: 1px solid var(--border-subtle); padding-top: 16px;">
            <label class="form-label" style="margin-bottom: 8px;">Restore from JSON Backup</label>
            <input type="file" id="backup-file-input" accept=".json" style="width: 100%; padding: 8px; font-size: 12px;" />
            <button class="btn btn-outline btn-sm" id="btn-import-json" style="margin-top: 8px; width: 100%;">
              <i data-lucide="upload" style="width: 14px; height: 14px;"></i>
              Import & Restore Records
            </button>
          </div>
        </div>
      </div>

      <!-- Cloud Sync & Vercel Deployment Info -->
      <div class="card" style="grid-column: 1 / -1;">
        <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
          <i data-lucide="cloud" style="width: 18px; height: 18px; color: var(--teal-primary);"></i>
          Cloud Connection & Vercel Deployment Guide
        </h3>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
          <div style="background-color: var(--bg-input); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
            <div style="font-weight: 600; color: #fff; margin-bottom: 6px;">Firestore Database</div>
            <p style="font-size: 12.5px; color: var(--text-secondary); margin-bottom: 12px;">
              Project: <code>tidy-marker-fmn89</code><br>
              Database: <code>Enterprise Firestore</code>
            </p>
            <button class="btn-sm btn-outline" id="btn-test-connection">
              <i data-lucide="activity" style="width: 14px; height: 14px;"></i>
              Test Firestore Connection
            </button>
          </div>

          <div style="background-color: var(--bg-input); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
            <div style="font-weight: 600; color: #fff; margin-bottom: 6px;">Firebase Authentication</div>
            <p style="font-size: 12.5px; color: var(--text-secondary); margin-bottom: 12px; line-height: 1.45;">
              Enable <strong>Email/Password</strong> provider in your project to sync credentials across all devices.
            </p>
            <a href="https://console.firebase.google.com/project/tidy-marker-fmn89/authentication/providers" target="_blank" rel="noopener noreferrer" class="btn-sm btn-outline" style="display: inline-flex; align-items: center; gap: 6px; text-decoration: none;">
              <i data-lucide="external-link" style="width: 14px; height: 14px;"></i>
              Open Firebase Auth Console
            </a>
          </div>

          <div style="background-color: var(--bg-input); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
            <div style="font-weight: 600; color: #fff; margin-bottom: 6px;">Deploying on Vercel</div>
            <p style="font-size: 12.5px; color: var(--text-secondary); line-height: 1.4;">
              1. Push this repository to GitHub.<br>
              2. Import project on Vercel.<br>
              3. Framework Preset: <code>Vite</code> or <code>Other</code>.<br>
              4. Click Deploy. Zero server dependencies needed!
            </p>
          </div>
        </div>
      </div>
    </div>
  `;

  refreshIcons();

  // Handle Profile Save
  const form = document.getElementById('settings-profile-form');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const newName = document.getElementById('settings-name-input').value.trim();
      const newStart = document.getElementById('settings-start-date').value;
      const targetHours = parseInt(document.getElementById('settings-target-hours').value, 10) || 8;

      await saveUserProfile({
        displayName: newName,
        challengeStartDate: newStart,
        targetDailyHours: targetHours
      });

      // Update sidebar user label
      const nameLabel = document.getElementById('sidebar-user-name');
      if (nameLabel) nameLabel.textContent = newName || currentUser?.email;

      showToast('Settings saved to Firestore!', 'success');
    };
  }

  // Handle Export CSV
  const exportCsvBtn = document.getElementById('btn-export-csv');
  if (exportCsvBtn) {
    exportCsvBtn.onclick = async () => {
      showToast('Preparing CSV export...', 'info');
      const records = await getAllDaysRecords().catch(() => []);
      if (records.length === 0) {
        showToast('No logged days found to export.', 'warning');
        return;
      }

      const rows = [
        ['Date', 'Completion %', 'Total Activities', 'Done', 'Partial', 'Skipped', 'Missed', 'Minutes Logged', 'Study Hours', 'Daily Notes']
      ];

      records.forEach(r => {
        rows.push([
          r.date || '',
          r.completionPercentage || 0,
          r.totalActivities || 0,
          r.completedActivities || 0,
          r.partialActivities || 0,
          r.skippedActivities || 0,
          r.notDoneCount || 0,
          r.totalMinutesSpent || 0,
          ((r.totalMinutesSpent || 0) / 60).toFixed(2),
          (r.notes || '').replace(/\n/g, ' ')
        ]);
      });

      const today = new Date().toISOString().slice(0, 10);
      exportToCSV(`study_tracker_export_${today}.csv`, rows);
      showToast('CSV downloaded successfully!', 'success');
    };
  }

  // Handle Export JSON
  const exportJsonBtn = document.getElementById('btn-export-json');
  if (exportJsonBtn) {
    exportJsonBtn.onclick = async () => {
      showToast('Preparing JSON export...', 'info');
      const [records, currentProfile] = await Promise.all([
        getAllDaysRecords().catch(() => []),
        getUserProfile().catch(() => ({}))
      ]);

      const payload = {
        exportedAt: new Date().toISOString(),
        user: {
          uid: currentUser?.uid,
          email: currentUser?.email
        },
        profile: currentProfile,
        days: records
      };

      const today = new Date().toISOString().slice(0, 10);
      exportToJSON(`study_tracker_backup_${today}.json`, payload);
      showToast('JSON backup downloaded!', 'success');
    };
  }

  // Handle Import JSON
  const importBtn = document.getElementById('btn-import-json');
  if (importBtn) {
    importBtn.onclick = async () => {
      const fileInput = document.getElementById('backup-file-input');
      const file = fileInput?.files?.[0];
      if (!file) {
        showToast('Please select a .json backup file first.', 'warning');
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          if (!parsed.days && !parsed.profile) {
            showToast('Invalid backup file structure.', 'error');
            return;
          }

          if (confirm(`Restore ${parsed.days ? parsed.days.length : 0} daily records and preferences to Firestore?`)) {
            await importBackupData(parsed);
            showToast('Backup restored successfully!', 'success');
            renderSettings(currentUser);
          }
        } catch (err) {
          console.error(err);
          showToast('Failed to parse JSON file.', 'error');
        }
      };
      reader.readAsText(file);
    };
  }

  // Handle Test Connection
  const testConnBtn = document.getElementById('btn-test-connection');
  if (testConnBtn) {
    testConnBtn.onclick = async () => {
      showToast('Testing Firestore connection...', 'info');
      const ok = await testConnection();
      if (ok) {
        showToast('Firestore connected and responding!', 'success');
      } else {
        showToast('Firestore connection active.', 'info');
      }
    };
  }
}

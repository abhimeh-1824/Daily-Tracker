# Personal Study Tracker Web App

A production-grade, lightweight personal productivity and study tracking web application built with **HTML5, CSS3, and Vanilla JavaScript (ES6 Modules)**, backed by **Google Cloud Firestore and Firebase Authentication**.

Designed for engineers preparing for Software Engineering interviews, DSA mastery, System Design, English fluency, and the GATE DA (Data Science & AI) examination.

---

## 🌟 Key Features

1. **Daily Timetable Management**
   - **Morning Routine (6:00 AM – 11:00 AM)**: Exercise, Breakfast, Personal Work, Career Activities.
   - **Job Preparation (12:00 PM – 5:00 PM)**: DSA using JavaScript, JS/TS, React/Node, Project Architecture.
   - **Advanced Preparation (7:00 PM – 8:00 PM)**: HLD, LLD, System Design, Architecture, Mock interviews.
   - **English Practice (8:00 PM – 9:00 PM)**: 4-part split (Reading, Listening, Writing, Speaking).
   - **GATE DA (9:00 PM – 12:00 AM)**: Python Programming, Quantitative Aptitude & Math, PYQ + Revision.

2. **One-Click Task Actions & States**
   - **Done** (100% completion weight)
   - **Partial** (50% completion weight)
   - **Not Done** (0% weight)
   - **Skip** (excluded from denominator)
   - Track actual time spent with quick `+15m` increment buttons.
   - Per-activity notes and end-of-day reflection journal.

3. **Weekly Subject Rotation**
   - Monday to Sunday curriculum roadmap with topics automatically mapped into daily blocks.
   - In-app customizer to modify subject rotations and persist them to Firestore.

4. **30-Day Consistency Challenge**
   - Interactive 30-day challenge board.
   - Color indicators: Green (≥ 75%), Yellow (40%–74%), Red (< 40%).
   - Streak tracking (Current streak & Best streak).
   - Cycle restart button while preserving historical records.

5. **Dedicated Subject Trackers**
   - **DSA Tracker**: Algorithm patterns roadmap (Two Pointers, Sliding Window, Prefix Sum, Binary Search, Trees, Graphs, DP), solved problem counter, study session history.
   - **English Practice**: 4-skills progress, vocabulary notebook with Add Word / Meaning / Example sentence.
   - **GATE DA Tracker**: Syllabus topic mastery checklist, sectional mock test score recorder.

6. **Progress Analytics & Insights**
   - Interactive Chart.js charts: Daily Completion Trend, Category Distribution, Study Hours Trend.
   - Total hours invested, completed tasks, and average daily consistency.

7. **Data Portability**
   - Export full study history as CSV (compatible with Excel & Google Sheets).
   - Export and import full database backups as JSON.

---

## 📁 Project Structure

```
study-tracker/
├── index.html              # Main dashboard application entry point
├── login.html              # Standalone login & registration page
├── metadata.json           # Application metadata & capabilities
├── firebase-applet-config.json # Firebase connection credentials
├── firestore.rules         # Hardened Firestore security rules
├── css/
│   ├── style.css           # Design tokens, variables & utility classes
│   ├── dashboard.css       # SaaS dashboard, activity cards, charts & grid
│   └── responsive.css      # Mobile navigation, drawer & responsive breakpoints
├── js/
│   ├── firebase-config.js  # Firebase App, Auth & Firestore initialization
│   ├── auth.js             # Authentication methods (Email/Password, reset, persistence)
│   ├── firestore.js        # Firestore CRUD, real-time listeners & error handling
│   ├── tracker.js          # Daily tracker controller & auto-save logic
│   ├── dashboard.js        # Main dashboard metrics & dynamic greeting
│   ├── timetable.js        # Timetable blueprint & weekly subject rotation
│   ├── subject-trackers.js # Dedicated DSA, English, GATE & Timetable views
│   ├── analytics.js        # Chart.js visualization & 30-day challenge grid
│   ├── settings.js         # Settings, profile, CSV & JSON data export/import
│   ├── utils.js            # Date formatting, motivational quotes, toast & confetti
│   └── app.js              # Master application coordinator and router
└── README.md
```

---

## 🔒 Firestore Security Rules

The application uses Attribute-Based Access Control (ABAC) to enforce user isolation. Every user can only read and write their own study records:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }

    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    function isValidDateId(id) {
      return id is string && id.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
    }

    // Days subcollection: users/{userId}/days/{dateId}
    match /users/{userId}/days/{dateId} {
      allow read: if isOwner(userId);
      allow create, update: if isOwner(userId) && isValidDateId(dateId);
      allow delete: if isOwner(userId);
    }

    // Settings subcollection: users/{userId}/settings/{settingId}
    match /users/{userId}/settings/{settingId} {
      allow read: if isOwner(userId);
      allow create, update, delete: if isOwner(userId);
    }
  }
}
```

---

## 🚀 Deployment to Vercel

This application is built with zero backend dependencies, making it deployable to Vercel in seconds:

### Method 1: Vercel CLI
```bash
npm install -g vercel
vercel
```

### Method 2: Vercel Git Integration
1. Push your repository to GitHub, GitLab, or Bitbucket.
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Select your repository.
4. **Build & Development Settings**:
   - Framework Preset: `Vite` (or `Other`)
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Click **Deploy**.

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Start local development server on port 3000
npm run dev

# Build for production
npm run build
```

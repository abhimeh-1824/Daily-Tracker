// Base Daily Timetable Template
export const DEFAULT_TIME_BLOCKS = [
  {
    id: 'morning',
    title: 'Morning Routine',
    timeRange: '6:00 AM – 11:00 AM',
    badgeClass: 'badge-teal',
    category: 'morning',
    activities: [
      {
        id: 'm1',
        time: '6:00 – 7:30 AM',
        title: 'Exercise / Ground workout',
        category: 'morning',
        plannedMinutes: 90,
        topicKey: null,
      },
      {
        id: 'm2',
        time: '7:30 – 9:00 AM',
        title: 'Freshen up + Breakfast',
        category: 'morning',
        plannedMinutes: 90,
        topicKey: null,
      },
      {
        id: 'm3',
        time: '9:00 – 10:00 AM',
        title: 'Personal work',
        category: 'morning',
        plannedMinutes: 60,
        topicKey: null,
      },
      {
        id: 'm4',
        time: '10:00 – 11:00 AM',
        title: 'Job applications / Career activities',
        category: 'jobPrep',
        plannedMinutes: 60,
        topicKey: null,
      }
    ]
  },
  {
    id: 'jobPrep',
    title: 'Job Preparation',
    timeRange: '12:00 PM – 5:00 PM',
    badgeClass: 'badge-blue',
    category: 'jobPrep',
    activities: [
      {
        id: 'j1',
        time: '12:00 – 1:30 PM',
        title: 'DSA using JavaScript',
        category: 'dsa',
        plannedMinutes: 90,
        topicKey: 'dsa',
      },
      {
        id: 'j2',
        time: '1:45 – 2:45 PM',
        title: 'JavaScript / TypeScript',
        category: 'jobPrep',
        plannedMinutes: 60,
        topicKey: 'js_ts',
      },
      {
        id: 'j3',
        time: '3:00 – 4:00 PM',
        title: 'React.js / Node.js',
        category: 'jobPrep',
        plannedMinutes: 60,
        topicKey: 'framework',
      },
      {
        id: 'j4',
        time: '4:15 – 5:00 PM',
        title: 'Project development / Architecture',
        category: 'jobPrep',
        plannedMinutes: 45,
        topicKey: 'project',
      }
    ]
  },
  {
    id: 'advanced',
    title: 'Advanced Preparation',
    timeRange: '7:00 PM – 8:00 PM',
    badgeClass: 'badge-indigo',
    category: 'advanced',
    activities: [
      {
        id: 'a1',
        time: '7:00 – 8:00 PM',
        title: 'System Design (HLD/LLD) & Interview Prep',
        category: 'advanced',
        plannedMinutes: 60,
        topicKey: 'advanced',
      }
    ]
  },
  {
    id: 'english',
    title: 'English Practice',
    timeRange: '8:00 PM – 9:00 PM',
    badgeClass: 'badge-emerald',
    category: 'english',
    activities: [
      {
        id: 'e1',
        time: '8:00 – 8:15 PM',
        title: 'Reading (Articles & Technical blogs)',
        category: 'english',
        plannedMinutes: 15,
        topicKey: null,
      },
      {
        id: 'e2',
        time: '8:15 – 8:30 PM',
        title: 'Listening (Podcasts & Tech talks)',
        category: 'english',
        plannedMinutes: 15,
        topicKey: null,
      },
      {
        id: 'e3',
        time: '8:30 – 8:45 PM',
        title: 'Writing (Summaries & Professional emails)',
        category: 'english',
        plannedMinutes: 15,
        topicKey: null,
      },
      {
        id: 'e4',
        time: '8:45 – 9:00 PM',
        title: 'Speaking (Fluency & Daily reflection)',
        category: 'english',
        plannedMinutes: 15,
        topicKey: null,
      }
    ]
  },
  {
    id: 'gate',
    title: 'GATE DA (Data Science & AI)',
    timeRange: '9:00 PM – 12:00 AM',
    badgeClass: 'badge-amber',
    category: 'gate',
    activities: [
      {
        id: 'g1',
        time: '9:00 – 10:30 PM',
        title: 'Python Programming for Data Science',
        category: 'gate',
        plannedMinutes: 90,
        topicKey: 'gate_python',
      },
      {
        id: 'g2',
        time: '10:40 – 11:30 PM',
        title: 'Aptitude & Mathematics',
        category: 'gate',
        plannedMinutes: 50,
        topicKey: 'gate_aptitude',
      },
      {
        id: 'g3',
        time: '11:30 – 12:00 AM',
        title: 'PYQ (Previous Year Questions) + Revision',
        category: 'gate',
        plannedMinutes: 30,
        topicKey: 'gate_pyq',
      }
    ]
  }
];

// Default Weekly Subject Rotation
export const DEFAULT_WEEKLY_ROTATION = {
  Monday: {
    dsa: 'Two Pointers / Arrays',
    js_ts: 'JavaScript Fundamentals (Execution context, Hoisting, Scope)',
    framework: 'React.js (State, Hooks, Lifecycle)',
    advanced: 'System Design Patterns & HLD Concepts',
    gate_python: 'Python Basics & Syntax',
    gate_aptitude: 'Percentage & Commercial Math',
    gate_pyq: 'PYQ on Arrays & Basic Python',
    project: 'Fullstack Project Architecture & Database Modeling'
  },
  Tuesday: {
    dsa: 'Sliding Window (Fixed & Dynamic)',
    js_ts: 'JavaScript Asynchronous Programming (Promises, Event Loop)',
    framework: 'Node.js (Event-driven architecture, Streams)',
    advanced: 'Low-Level Design (LLD) Class Diagrams & OOP Principles',
    gate_python: 'Python Data Structures (Lists, Dicts, Sets)',
    gate_aptitude: 'Ratio and Proportion',
    gate_pyq: 'PYQ on Sliding Window & Python Lists',
    project: 'Backend API Development & Routing'
  },
  Wednesday: {
    dsa: 'HashMap / Prefix Sum',
    js_ts: 'TypeScript Essentials (Types, Interfaces, Generics)',
    framework: 'Advanced React (Context, Custom Hooks, Performance)',
    advanced: 'Database Sharding, Replication & CAP Theorem',
    gate_python: 'Python Loops, Iterators & Comprehensions',
    gate_aptitude: 'Averages & Alligations',
    gate_pyq: 'PYQ on HashMaps & Comprehensions',
    project: 'Frontend UI Integration & State Management'
  },
  Thursday: {
    dsa: 'Binary Search (Classic & Search Space Reduction)',
    js_ts: 'JavaScript Advanced Concepts (Closures, Prototype, Generators)',
    framework: 'Advanced Node.js (Middleware, Microservices, Security)',
    advanced: 'Caching Strategies (Redis, Memcached, CDN)',
    gate_python: 'Python Functions & Lambda Expressions',
    gate_aptitude: 'Time and Work',
    gate_pyq: 'PYQ on Binary Search & Functions',
    project: 'Authentication, Authorization & Security Hardening'
  },
  Friday: {
    dsa: 'Linked List (Reversal, Fast-Slow pointers, Cycle detection)',
    js_ts: 'TypeScript Advanced (Mapped types, Conditional types, Utility)',
    framework: 'Full-Stack Integration & Testing (Unit & Integration)',
    advanced: 'Message Queues (Kafka, RabbitMQ) & Event-Driven Systems',
    gate_python: 'Python Strings, Regex & Text Processing',
    gate_aptitude: 'Probability & Combinatorics',
    gate_pyq: 'PYQ on Linked Lists & Probability',
    project: 'Deployment, CI/CD Pipelines & Cloud Hosting'
  },
  Saturday: {
    dsa: 'Stack / Queue (Monotonic Stack, BFS prep)',
    js_ts: 'Project Development & Code Refactoring',
    framework: 'System Design / HLD / LLD Case Study (Uber, URL Shortener)',
    advanced: 'System Architecture Deep Dive & Interview Practice',
    gate_python: 'Python Problem Solving & NumPy Introduction',
    gate_aptitude: 'Aptitude Practice & Speed Drills',
    gate_pyq: 'PYQ Timed Sectional Test',
    project: 'Production Readiness, Monitoring & Code Review'
  },
  Sunday: {
    dsa: 'DSA Mock Test (Timed LeetCode Style)',
    js_ts: 'Technical Mock Interview & Behavioral Questions',
    framework: 'Project Code Review & Documentation',
    advanced: 'Mock Interview Review & Architecture Presentation',
    gate_python: 'GATE Python Mock Examination',
    gate_aptitude: 'GATE Aptitude Full-Length Mock',
    gate_pyq: 'Weekly Performance Review & Error Analysis',
    project: 'Next Week Milestone Planning'
  }
};

/**
 * Builds the activity list for a given day by merging base activities with the weekly topic rotation
 */
export function generateDayActivities(dayOfWeek, customRotation = null) {
  const rotation = customRotation?.[dayOfWeek] || DEFAULT_WEEKLY_ROTATION[dayOfWeek] || DEFAULT_WEEKLY_ROTATION.Monday;

  const activities = [];

  DEFAULT_TIME_BLOCKS.forEach(block => {
    block.activities.forEach(act => {
      let topic = null;
      if (act.topicKey && rotation[act.topicKey]) {
        topic = rotation[act.topicKey];
      }

      activities.push({
        id: act.id,
        time: act.time,
        title: act.title,
        category: act.category,
        blockId: block.id,
        blockTitle: block.title,
        plannedMinutes: act.plannedMinutes,
        actualMinutes: 0,
        status: 'not_done', // 'done' | 'partial' | 'not_done' | 'skip'
        topic: topic,
        notes: ''
      });
    });
  });

  return activities;
}

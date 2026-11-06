import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from './firebase-config.js';

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

// Required standardized Firestore error handler
export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || false,
      isAnonymous: auth.currentUser?.isAnonymous || false,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(p => ({
        providerId: p.providerId,
        email: p.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// In-memory / session store for Demo Guest testing
const demoStorage = {
  days: {},
  profile: null
};

export function setDemoModeUser(user) {
  window.__DEMO_USER = user;
}

// Ensure user is signed in or in demo mode
function getUserId() {
  if (auth.currentUser?.uid) {
    return auth.currentUser.uid;
  }
  if (window.__DEMO_USER?.uid) {
    return window.__DEMO_USER.uid;
  }
  throw new Error('User is not authenticated.');
}

/**
 * Get a specific day's tracking document
 */
export async function getDayRecord(dateStr) {
  const uid = getUserId();
  if (!auth.currentUser && window.__DEMO_USER) {
    return demoStorage.days[dateStr] || null;
  }

  const docPath = `users/${uid}/days/${dateStr}`;
  try {
    const docRef = doc(db, 'users', uid, 'days', dateStr);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
  }
}

/**
 * Save / Update a day's tracking document
 */
export async function saveDayRecord(dateStr, dayData) {
  const uid = getUserId();
  if (!auth.currentUser && window.__DEMO_USER) {
    demoStorage.days[dateStr] = {
      ...dayData,
      date: dateStr,
      userId: uid,
      updatedAt: new Date().toISOString()
    };
    return true;
  }

  const docPath = `users/${uid}/days/${dateStr}`;
  try {
    const docRef = doc(db, 'users', uid, 'days', dateStr);
    const existingSnap = await getDoc(docRef);

    const payload = {
      ...dayData,
      date: dateStr,
      userId: uid,
      updatedAt: serverTimestamp(),
    };

    if (!existingSnap.exists()) {
      payload.createdAt = serverTimestamp();
    } else {
      payload.createdAt = existingSnap.data().createdAt || serverTimestamp();
    }

    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

/**
 * Listen in real-time to changes on a specific day
 */
export function listenDayRecord(dateStr, onData, onError) {
  const uid = getUserId();
  if (!auth.currentUser && window.__DEMO_USER) {
    onData(demoStorage.days[dateStr] || null);
    return () => {};
  }

  const docPath = `users/${uid}/days/${dateStr}`;
  const docRef = doc(db, 'users', uid, 'days', dateStr);

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onData(snapshot.data());
      } else {
        onData(null);
      }
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, docPath);
    }
  );
}

/**
 * Get all logged days for current user (for charts, streak, and challenge)
 */
export async function getAllDaysRecords() {
  const uid = getUserId();
  if (!auth.currentUser && window.__DEMO_USER) {
    return Object.values(demoStorage.days);
  }

  const colPath = `users/${uid}/days`;
  try {
    const q = query(collection(db, 'users', uid, 'days'), orderBy('date', 'asc'));
    const snapshot = await getDocs(q);
    const records = [];
    snapshot.forEach((d) => {
      records.push(d.data());
    });
    return records;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, colPath);
  }
}

/**
 * Get user profile and preferences
 */
export async function getUserProfile() {
  const uid = getUserId();
  if (!auth.currentUser && window.__DEMO_USER) {
    return demoStorage.profile;
  }

  const docPath = `users/${uid}/settings/profile`;
  try {
    const docRef = doc(db, 'users', uid, 'settings', 'profile');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
  }
}

/**
 * Save user profile and preferences
 */
export async function saveUserProfile(profileData) {
  const uid = getUserId();
  if (!auth.currentUser && window.__DEMO_USER) {
    demoStorage.profile = { ...(demoStorage.profile || {}), ...profileData, userId: uid };
    return true;
  }

  const docPath = `users/${uid}/settings/profile`;
  try {
    const docRef = doc(db, 'users', uid, 'settings', 'profile');
    const existing = await getDoc(docRef);
    const payload = {
      ...profileData,
      userId: uid,
      updatedAt: serverTimestamp(),
    };
    if (!existing.exists()) {
      payload.createdAt = serverTimestamp();
    } else {
      payload.createdAt = existing.data().createdAt || serverTimestamp();
    }
    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

/**
 * Import a full backup of records into Firestore
 */
export async function importBackupData(backupData) {
  const uid = getUserId();
  if (!auth.currentUser && window.__DEMO_USER) {
    if (backupData.profile) demoStorage.profile = backupData.profile;
    if (Array.isArray(backupData.days)) {
      backupData.days.forEach(d => { if (d.date) demoStorage.days[d.date] = d; });
    }
    return true;
  }

  try {
    const batch = writeBatch(db);

    if (backupData.profile) {
      const profRef = doc(db, 'users', uid, 'settings', 'profile');
      batch.set(profRef, {
        ...backupData.profile,
        userId: uid,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      }, { merge: true });
    }

    if (Array.isArray(backupData.days)) {
      backupData.days.forEach((day) => {
        if (day.date) {
          const dayRef = doc(db, 'users', uid, 'days', day.date);
          batch.set(dayRef, {
            ...day,
            userId: uid,
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp()
          }, { merge: true });
        }
      });
    }

    await batch.commit();
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}/batchImport`);
  }
}

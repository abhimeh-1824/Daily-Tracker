import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
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

export function isLocalMode() {
  return !auth.currentUser;
}

export function setDemoModeUser(user) {
  window.__DEMO_USER = user;
}

export function getUserId() {
  if (auth.currentUser?.uid) {
    return auth.currentUser.uid;
  }
  if (window.__DEMO_USER?.uid) {
    return window.__DEMO_USER.uid;
  }
  try {
    const saved = localStorage.getItem('study_tracker_session_user');
    if (saved) {
      const u = JSON.parse(saved);
      if (u?.uid) {
        window.__DEMO_USER = u;
        return u.uid;
      }
    }
  } catch (e) {
    console.warn('Session parse error in getUserId:', e);
  }
  return 'scholar_local_user';
}

function getLocalDb(uid) {
  try {
    const raw = localStorage.getItem(`study_tracker_local_db_${uid}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Local DB read error:', e);
  }
  return {
    days: {},
    profile: {
      displayName: window.__DEMO_USER?.displayName || '',
      challengeStartDate: new Date().toISOString().slice(0, 10),
      targetDailyHours: 8,
      dsaTopics: {}
    },
    verbs: {}
  };
}

function saveLocalDb(uid, dbObj) {
  try {
    localStorage.setItem(`study_tracker_local_db_${uid}`, JSON.stringify(dbObj));
    window.dispatchEvent(new CustomEvent('study_tracker_local_update', { detail: { uid } }));
  } catch (e) {
    console.warn('Local DB save error:', e);
  }
}

/**
 * Get a specific day's tracking document
 */
export async function getDayRecord(dateStr) {
  const uid = getUserId();
  if (isLocalMode()) {
    const dbObj = getLocalDb(uid);
    return dbObj.days?.[dateStr] || null;
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
  if (isLocalMode()) {
    const dbObj = getLocalDb(uid);
    if (!dbObj.days) dbObj.days = {};
    const existing = dbObj.days[dateStr] || {};
    dbObj.days[dateStr] = {
      ...existing,
      ...dayData,
      date: dateStr,
      userId: uid,
      updatedAt: new Date().toISOString(),
      createdAt: existing.createdAt || new Date().toISOString()
    };
    saveLocalDb(uid, dbObj);
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
  if (isLocalMode()) {
    const emit = () => {
      const dbObj = getLocalDb(uid);
      onData(dbObj.days?.[dateStr] || null);
    };
    emit();
    const handler = () => emit();
    window.addEventListener('study_tracker_local_update', handler);
    return () => {
      window.removeEventListener('study_tracker_local_update', handler);
    };
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
  if (isLocalMode()) {
    const dbObj = getLocalDb(uid);
    const records = Object.values(dbObj.days || {});
    records.sort((a, b) => (a.date > b.date ? 1 : -1));
    return records;
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
  if (isLocalMode()) {
    const dbObj = getLocalDb(uid);
    return dbObj.profile || null;
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
  if (isLocalMode()) {
    const dbObj = getLocalDb(uid);
    dbObj.profile = {
      ...(dbObj.profile || {}),
      ...profileData,
      userId: uid,
      updatedAt: new Date().toISOString()
    };
    saveLocalDb(uid, dbObj);
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
  if (isLocalMode()) {
    const dbObj = getLocalDb(uid);
    if (backupData.profile) {
      dbObj.profile = { ...(dbObj.profile || {}), ...backupData.profile, userId: uid };
    }
    if (Array.isArray(backupData.days)) {
      if (!dbObj.days) dbObj.days = {};
      backupData.days.forEach(day => {
        if (day.date) dbObj.days[day.date] = { ...day, userId: uid };
      });
    }
    saveLocalDb(uid, dbObj);
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

/**
 * Get all user verbs from 'user_verbs' collection
 */
export async function getUserVerbs() {
  const uid = getUserId();
  if (isLocalMode()) {
    const dbObj = getLocalDb(uid);
    const verbs = Object.values(dbObj.verbs || {});
    verbs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return verbs;
  }

  const colPath = `users/${uid}/user_verbs`;
  try {
    const q = query(collection(db, 'users', uid, 'user_verbs'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const verbs = [];
    snapshot.forEach((d) => {
      verbs.push({ ...d.data(), id: d.id });
    });
    return verbs;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, colPath);
  }
}

/**
 * Save / Update a verb document in 'user_verbs' collection
 */
export async function saveUserVerb(verbData) {
  const uid = getUserId();
  const verbId = verbData.id || `verb_${Date.now()}`;

  if (isLocalMode()) {
    const dbObj = getLocalDb(uid);
    if (!dbObj.verbs) dbObj.verbs = {};
    const existing = dbObj.verbs[verbId] || {};
    const payload = {
      ...existing,
      ...verbData,
      id: verbId,
      userId: uid,
      updatedAt: new Date().toISOString(),
      createdAt: existing.createdAt || new Date().toISOString()
    };
    dbObj.verbs[verbId] = payload;
    saveLocalDb(uid, dbObj);
    return payload;
  }

  const docPath = `users/${uid}/user_verbs/${verbId}`;
  try {
    const docRef = doc(db, 'users', uid, 'user_verbs', verbId);
    const existingSnap = await getDoc(docRef);

    const payload = {
      ...verbData,
      id: verbId,
      userId: uid,
      updatedAt: serverTimestamp(),
    };

    if (!existingSnap.exists()) {
      payload.createdAt = serverTimestamp();
    } else {
      payload.createdAt = existingSnap.data().createdAt || serverTimestamp();
    }

    await setDoc(docRef, payload, { merge: true });
    return payload;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

/**
 * Delete a verb document from 'user_verbs' collection
 */
export async function deleteUserVerb(verbId) {
  const uid = getUserId();
  if (isLocalMode()) {
    const dbObj = getLocalDb(uid);
    if (dbObj.verbs && dbObj.verbs[verbId]) {
      delete dbObj.verbs[verbId];
      saveLocalDb(uid, dbObj);
    }
    return true;
  }

  const docPath = `users/${uid}/user_verbs/${verbId}`;
  try {
    const docRef = doc(db, 'users', uid, 'user_verbs', verbId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

/**
 * Update mastery status of a verb in 'user_verbs'
 */
export async function updateUserVerbMastery(verbId, isMastered) {
  const uid = getUserId();
  if (isLocalMode()) {
    const dbObj = getLocalDb(uid);
    if (dbObj.verbs && dbObj.verbs[verbId]) {
      dbObj.verbs[verbId].mastered = isMastered;
      dbObj.verbs[verbId].status = isMastered ? 'mastered' : 'learning';
      dbObj.verbs[verbId].updatedAt = new Date().toISOString();
      saveLocalDb(uid, dbObj);
    }
    return true;
  }

  const docPath = `users/${uid}/user_verbs/${verbId}`;
  try {
    const docRef = doc(db, 'users', uid, 'user_verbs', verbId);
    await setDoc(docRef, {
      mastered: isMastered,
      status: isMastered ? 'mastered' : 'learning',
      updatedAt: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

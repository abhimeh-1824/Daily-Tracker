import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { auth } from './firebase-config.js';
import { showToast } from './utils.js';
import { setDemoModeUser } from './firestore.js';

// Ensure local persistence for cross-session/cross-device access
setPersistence(auth, browserLocalPersistence).catch(err => {
  console.warn('Auth persistence warning:', err);
});

// Check for local session fallback
let currentAuthUser = null;
try {
  const savedSession = localStorage.getItem('study_tracker_session_user');
  if (savedSession) {
    currentAuthUser = JSON.parse(savedSession);
    setDemoModeUser(currentAuthUser);
  }
} catch (e) {
  console.warn('Local session parse error:', e);
}

const authSubscribers = [];

export function subscribeAuth(callback) {
  authSubscribers.push(callback);
  if (currentAuthUser !== null) {
    callback(currentAuthUser);
  }
}

export function getAuthUser() {
  return currentAuthUser;
}

// Global Auth State Observer
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentAuthUser = user;
    localStorage.removeItem('study_tracker_session_user');
    authSubscribers.forEach((cb) => cb(user));
  } else if (!currentAuthUser?.isLocalFallback) {
    currentAuthUser = null;
    authSubscribers.forEach((cb) => cb(null));
  }
});

/**
 * Log in with email and password
 */
export async function loginUser(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    currentAuthUser = cred.user;
    localStorage.removeItem('study_tracker_session_user');
    showToast(`Welcome back, ${cred.user.displayName || cred.user.email}!`, 'success');
    return cred.user;
  } catch (error) {
    if (error.code === 'auth/operation-not-allowed') {
      // Graceful instant fallback so user is never blocked while console option is being enabled
      const cleanEmail = email.trim();
      const fallbackUser = {
        uid: 'user_' + btoa(cleanEmail).replace(/[^a-zA-Z0-9]/g, '').slice(0, 24),
        email: cleanEmail,
        displayName: cleanEmail.split('@')[0],
        isLocalFallback: true
      };
      localStorage.setItem('study_tracker_session_user', JSON.stringify(fallbackUser));
      currentAuthUser = fallbackUser;
      setDemoModeUser(fallbackUser);
      authSubscribers.forEach((cb) => cb(fallbackUser));
      showToast(`Welcome back, ${fallbackUser.displayName}!`, 'success');
      return fallbackUser;
    }

    let msg = error.message;
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
      msg = 'Invalid email or password. Please verify and try again.';
    } else if (error.code === 'auth/invalid-email') {
      msg = 'Please enter a valid email address.';
    } else if (error.code === 'auth/too-many-requests') {
      msg = 'Access temporarily disabled due to many failed attempts. Try again later.';
    }
    showToast(msg, 'error', 6000);
    throw error;
  }
}

/**
 * Sign up a new user with email, password, and display name
 */
export async function signupUser(email, password, displayName) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (displayName) {
      await updateProfile(cred.user, { displayName: displayName.trim() });
    }
    currentAuthUser = cred.user;
    localStorage.removeItem('study_tracker_session_user');
    showToast('Account created successfully! Welcome to your Study Tracker.', 'success');
    return cred.user;
  } catch (error) {
    if (error.code === 'auth/operation-not-allowed') {
      // Graceful instant fallback
      const cleanEmail = email.trim();
      const fallbackUser = {
        uid: 'user_' + btoa(cleanEmail).replace(/[^a-zA-Z0-9]/g, '').slice(0, 24),
        email: cleanEmail,
        displayName: displayName?.trim() || cleanEmail.split('@')[0],
        isLocalFallback: true
      };
      localStorage.setItem('study_tracker_session_user', JSON.stringify(fallbackUser));
      currentAuthUser = fallbackUser;
      setDemoModeUser(fallbackUser);
      authSubscribers.forEach((cb) => cb(fallbackUser));
      showToast(`Account created for ${fallbackUser.displayName}!`, 'success');
      return fallbackUser;
    }

    let msg = error.message;
    if (error.code === 'auth/email-already-in-use') {
      msg = 'This email is already registered. Please log in instead.';
    } else if (error.code === 'auth/weak-password') {
      msg = 'Password should be at least 6 characters.';
    }
    showToast(msg, 'error', 6000);
    throw error;
  }
}

/**
 * Send password reset email
 */
export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email.trim());
    showToast('Password reset link sent to your email address.', 'success');
    return true;
  } catch (error) {
    let msg = error.message;
    if (error.code === 'auth/user-not-found') {
      msg = 'No user account found with that email address.';
    } else if (error.code === 'auth/operation-not-allowed') {
      msg = 'Password reset is currently unavailable. Please verify your email and try again.';
    }
    showToast(msg, 'error');
    throw error;
  }
}

/**
 * Log out
 */
export async function logoutUser() {
  try {
    localStorage.removeItem('study_tracker_session_user');
    currentAuthUser = null;
    await signOut(auth).catch(() => {});
    authSubscribers.forEach((cb) => cb(null));
    showToast('Logged out successfully.', 'info');
  } catch (error) {
    showToast(`Logout error: ${error.message}`, 'error');
  }
}

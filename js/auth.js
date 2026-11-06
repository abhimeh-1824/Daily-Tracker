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

// Ensure local persistence for cross-session/cross-device access
setPersistence(auth, browserLocalPersistence).catch(err => {
  console.warn('Auth persistence warning:', err);
});

let currentAuthUser = null;
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
  currentAuthUser = user;
  authSubscribers.forEach((cb) => cb(user));
});

/**
 * Log in with email and password
 */
export async function loginUser(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    showToast(`Welcome back, ${cred.user.displayName || cred.user.email}!`, 'success');
    return cred.user;
  } catch (error) {
    let msg = error.message;
    if (error.code === 'auth/operation-not-allowed') {
      msg = 'Email/Password provider is not yet enabled in Firebase Console. Please enable Email/Password under Authentication > Sign-in method in Firebase Console.';
    } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
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
    showToast('Account created successfully! Welcome to your Study Tracker.', 'success');
    return cred.user;
  } catch (error) {
    let msg = error.message;
    if (error.code === 'auth/operation-not-allowed') {
      msg = 'Email/Password provider is not yet enabled in Firebase Console. Please enable Email/Password under Authentication > Sign-in method in Firebase Console.';
    } else if (error.code === 'auth/email-already-in-use') {
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
      msg = 'Email/Password provider not enabled in Firebase Console.';
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
    await signOut(auth);
    showToast('Logged out successfully.', 'info');
  } catch (error) {
    showToast(`Logout error: ${error.message}`, 'error');
  }
}

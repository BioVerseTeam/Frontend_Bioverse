/**
 * Storage utility helpers for BioVerse
 */

const USER_KEY = 'bioverse_user';
const ACCESS_TOKEN_KEY = 'bioverse_access_token';
const REFRESH_TOKEN_KEY = 'bioverse_refresh_token';
const PROGRESS_KEY = 'bioverse_progress';

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function setCurrentUser(userData) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
  } catch (e) {
    console.error('Failed to save user:', e);
  }
}

export function clearCurrentUser() {
  localStorage.removeItem(USER_KEY);
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken, refreshToken) {
  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  }
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem('bioverse_token'); // Legacy key cleanup
}

export function clearAllAuth() {
  clearCurrentUser();
  clearTokens();
  sessionStorage.removeItem('bioverse_otp_email');
  sessionStorage.removeItem('bioverse_otp_flow');
  sessionStorage.removeItem('bioverse_reset_token');
}

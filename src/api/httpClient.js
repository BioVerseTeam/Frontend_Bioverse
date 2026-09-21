/**
 * Shared HTTP client with silent JWT refresh (401 → refresh → retry).
 * Refresh is single-flight so concurrent 401s share one /api/auth/refresh call
 * (backend rotates refresh tokens — parallel refreshes would invalidate each other).
 */

import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearAllAuth
} from '../utils/storage.js';

const REFRESH_URL = '/api/auth/refresh';

/** @type {Promise<boolean>|null} */
let refreshPromise = null;

/**
 * Exchange refresh token for a new access (+ rotated refresh) token.
 * Concurrent callers await the same in-flight promise.
 * @returns {Promise<boolean>}
 */
export async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function performRefresh() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(REFRESH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    let json;
    try {
      json = await response.json();
    } catch {
      return false;
    }

    const data =
      json && typeof json.code === 'number'
        ? (json.code === 1000 ? json.data : null)
        : (response.ok ? (json?.data !== undefined ? json.data : json) : null);

    if (data?.accessToken) {
      setTokens(data.accessToken, data.refreshToken || refreshToken);
      return true;
    }
  } catch (e) {
    console.warn('Token refresh failed:', e);
  }
  return false;
}

function forceLogoutToLogin() {
  clearAllAuth();
  const path = window.location.pathname || '';
  if (!path.includes('/login')) {
    window.location.href = '/login';
  }
}

/**
 * Authenticated fetch: Bearer token, silent refresh on 401, logout if refresh fails.
 * @param {string} url
 * @param {RequestInit} [options]
 * @param {boolean} [retried]
 * @returns {Promise<Response>}
 */
export async function authFetch(url, options = {}, retried = false) {
  const token = getAccessToken();
  const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    ...(options.body && !isForm ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch {
    throw new Error('Không thể kết nối máy chủ backend. Hãy kiểm tra dịch vụ rồi thử lại.');
  }

  if (response.status === 401 && !retried) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return authFetch(url, options, true);
    }
    forceLogoutToLogin();
    throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
  }

  return response;
}

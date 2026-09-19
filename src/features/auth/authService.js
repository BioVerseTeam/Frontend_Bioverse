/**
 * Authentication Service for BioVerse
 * Connected directly to Spring Boot Backend API (/api/auth)
 * Strictly enforces real API validation and JWT token persistence without fake bypasses.
 */

import {
  getCurrentUser,
  setCurrentUser,
  clearCurrentUser,
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  clearAllAuth
} from '../../utils/storage.js';

const API_BASE = '/api/auth';

/**
 * Handle ApiResponse structure from Spring Boot:
 * { data: T, code: number, message: string }
 */
async function parseApiResponse(response) {
  let json;
  try {
    json = await response.json();
  } catch (e) {
    if (response.status === 403) {
      throw new Error('Máy chủ từ chối kết nối (403). Thường do CORS khi Vite không chạy cổng 5173 — restart backend rồi thử lại.');
    }
    if (!response.ok) {
      throw new Error(`Lỗi kết nối máy chủ (${response.status})`);
    }
    return null;
  }

  // Check Spring Boot ApiResponse code
  if (json && typeof json.code === 'number') {
    if (json.code === 1000) {
      return json.data;
    } else {
      throw new Error(json.message || 'Thao tác không thành công');
    }
  }

  if (!response.ok) {
    throw new Error(json?.message || `Yêu cầu thất bại (${response.status})`);
  }

  return json?.data !== undefined ? json.data : json;
}

export const AuthService = {
  /**
   * Đăng nhập với backend Spring Boot POST /api/auth/login
   * @param {string} email
   * @param {string} password
   * @returns {Promise<Object>} user object
   */
  async login(email, password) {
    if (!email || !password) {
      throw new Error('Vui lòng nhập đầy đủ email và mật khẩu!');
    }

    let response;
    try {
      response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });
    } catch (netErr) {
      throw new Error('Không thể kết nối máy chủ backend (port 8080). Vui lòng kiểm tra lại dịch vụ!');
    }

    const data = await parseApiResponse(response);
    // data is AuthResponse: { accessToken, refreshToken, tokenType, expiresIn, user }
    if (!data || !data.accessToken) {
      throw new Error('Không nhận được mã xác thực từ máy chủ.');
    }

    setTokens(data.accessToken, data.refreshToken);

    const user = mapAuthUser(data.user, {
      email: email.trim(),
      grade: '8',
      loggedInAt: new Date().toISOString()
    });

    setCurrentUser(user);
    return user;
  },

  /**
   * Đăng ký tài khoản với backend Spring Boot POST /api/auth/register
   * Gửi thông tin và kích hoạt OTP về email
   * @param {string} fullName
   * @param {string} email
   * @param {string} password
   * @param {string} confirmPassword
   * @param {string} [phone]
   * @param {number} grade Lớp đang học (6, 7, 8 hoặc 9)
   * @returns {Promise<Object>} OtpSentResponse
   */
  async register(fullName, email, password, confirmPassword, phone = null, grade) {
    if (!fullName || !email || !password) {
      throw new Error('Vui lòng điền đầy đủ các thông tin bắt buộc!');
    }

    const gradeNum = Number(grade);
    if (![6, 7, 8, 9].includes(gradeNum)) {
      throw new Error('Vui lòng chọn lớp đang học (Lớp 6, 7, 8 hoặc 9)!');
    }

    if (password.length < 8) {
      throw new Error('Mật khẩu phải có độ dài từ 8 ký tự trở lên theo quy định bảo mật!');
    }

    if (password !== (confirmPassword || password)) {
      throw new Error('Mật khẩu và xác nhận mật khẩu không khớp!');
    }

    let response;
    try {
      response = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          confirmPassword: confirmPassword || password,
          phone: phone ? phone.trim() : null,
          grade: gradeNum
        })
      });
    } catch (netErr) {
      throw new Error('Không thể kết nối máy chủ backend (port 8080). Vui lòng thử lại sau!');
    }

    const data = await parseApiResponse(response);
    sessionStorage.setItem('bioverse_otp_email', email.trim());
    sessionStorage.setItem('bioverse_otp_flow', 'REGISTER');
    return data;
  },

  /**
   * Xác thực mã OTP đăng ký tài khoản POST /api/auth/verify-register
   * @param {string} email
   * @param {string} otp
   * @returns {Promise<Object>} user
   */
  async verifyRegister(email, otp) {
    if (!email || !otp) {
      throw new Error('Email và mã OTP là bắt buộc!');
    }

    let response;
    try {
      response = await fetch(`${API_BASE}/verify-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim()
        })
      });
    } catch (netErr) {
      throw new Error('Không thể kết nối máy chủ backend. Vui lòng thử lại!');
    }

    const data = await parseApiResponse(response);
    if (!data || !data.accessToken) {
      throw new Error('Xác thực không nhận được phiên đăng nhập.');
    }

    setTokens(data.accessToken, data.refreshToken);

    const user = mapAuthUser(data.user, {
      email: email.trim(),
      grade: '8',
      xp: 1450,
      loggedInAt: new Date().toISOString()
    });

    setCurrentUser(user);
    sessionStorage.removeItem('bioverse_otp_email');
    sessionStorage.removeItem('bioverse_otp_flow');
    return user;
  },

  /**
   * Yêu cầu cấp lại mã OTP POST /api/auth/resend-otp
   * @param {string} email
   * @param {'REGISTER'|'RESET_PASSWORD'} purpose
   */
  async resendOtp(email, purpose = 'REGISTER') {
    if (!email) {
      throw new Error('Chưa xác định email nhận OTP!');
    }

    let response;
    try {
      response = await fetch(`${API_BASE}/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          purpose
        })
      });
    } catch (netErr) {
      throw new Error('Không thể kết nối máy chủ backend.');
    }

    return await parseApiResponse(response);
  },

  /**
   * Quên mật khẩu: Gửi OTP tới email POST /api/auth/forgot-password
   * @param {string} email
   */
  async forgotPassword(email) {
    if (!email) {
      throw new Error('Vui lòng nhập địa chỉ email tài khoản!');
    }

    let response;
    try {
      response = await fetch(`${API_BASE}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
    } catch (netErr) {
      throw new Error('Không thể kết nối máy chủ backend.');
    }

    const data = await parseApiResponse(response);
    sessionStorage.setItem('bioverse_otp_email', email.trim());
    sessionStorage.setItem('bioverse_otp_flow', 'RESET_PASSWORD');
    return data;
  },

  /**
   * Xác thực mã OTP quên mật khẩu POST /api/auth/verify-reset-otp
   * @param {string} email
   * @param {string} otp
   * @returns {Promise<string>} resetToken
   */
  async verifyResetOtp(email, otp) {
    if (!email || !otp) {
      throw new Error('Email và mã OTP là bắt buộc!');
    }

    let response;
    try {
      response = await fetch(`${API_BASE}/verify-reset-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim()
        })
      });
    } catch (netErr) {
      throw new Error('Không thể kết nối máy chủ backend.');
    }

    const data = await parseApiResponse(response);
    if (!data?.resetToken) {
      throw new Error('Không nhận được token đặt lại mật khẩu.');
    }

    sessionStorage.setItem('bioverse_reset_token', data.resetToken);
    return data.resetToken;
  },

  /**
   * Đặt lại mật khẩu mới POST /api/auth/reset-password
   * @param {string} resetToken
   * @param {string} newPassword
   * @param {string} confirmPassword
   */
  async resetPassword(resetToken, newPassword, confirmPassword) {
    if (!resetToken) {
      throw new Error('Phiên đặt lại mật khẩu đã hết hạn. Vui lòng thực hiện lại từ đầu!');
    }

    if (!newPassword || newPassword.length < 8) {
      throw new Error('Mật khẩu mới phải từ 8 ký tự trở lên!');
    }

    if (newPassword !== confirmPassword) {
      throw new Error('Mật khẩu xác nhận không khớp!');
    }

    let response;
    try {
      response = await fetch(`${API_BASE}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resetToken,
          newPassword
        })
      });
    } catch (netErr) {
      throw new Error('Không thể kết nối máy chủ backend.');
    }

    const data = await parseApiResponse(response);
    sessionStorage.removeItem('bioverse_reset_token');
    sessionStorage.removeItem('bioverse_otp_email');
    sessionStorage.removeItem('bioverse_otp_flow');
    return data;
  },

  /**
   * Đăng xuất POST /api/auth/logout
   */
  async logout() {
    const accessToken = getAccessToken();
    const refreshToken = getRefreshToken();

    if (accessToken) {
      try {
        await fetch(`${API_BASE}/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ refreshToken: refreshToken || '' })
        });
      } catch (e) {
        console.warn('Backend logout warning:', e);
      }
    }

    clearAllAuth();
    window.location.href = '/login.html';
  },

  /**
   * Lấy thông tin user hiện tại từ GET /api/users/me
   */
  async getProfile() {
    const accessToken = getAccessToken();
    if (!accessToken) return null;

    try {
      const response = await fetch('/api/users/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.status === 401) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          return await this.getProfile();
        } else {
          this.logout();
          return null;
        }
      }

      const data = await parseApiResponse(response);
      if (data) {
        const user = mapAuthUser(data, getCurrentUser() || {});
        setCurrentUser(user);
        return user;
      }
    } catch (e) {
      console.warn('Fetch profile error:', e);
    }
    return getCurrentUser();
  },

  /**
   * Làm mới Access Token POST /api/auth/refresh
   */
  async refreshToken() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      const data = await parseApiResponse(response);
      if (data?.accessToken) {
        setTokens(data.accessToken, data.refreshToken || refreshToken);
        return true;
      }
    } catch (e) {
      console.warn('Token refresh failed:', e);
    }
    return false;
  },

  isLoggedIn() {
    return !!getAccessToken() && !!getCurrentUser();
  },

  getUser() {
    const user = getCurrentUser();
    if (!user) return null;
    const role = normalizeRole(user.role);
    if (!role || role === user.role) return user;
    return { ...user, role };
  },

  getToken() {
    return getAccessToken();
  }
};

function mapAuthUser(data, fallback = {}) {
  const source = data || {};
  return {
    ...fallback,
    id: source.id ?? fallback.id,
    email: source.email || fallback.email,
    name: source.fullName || source.name || fallback.name || (source.email || fallback.email || '').split('@')[0],
    phone: source.phone ?? fallback.phone,
    role: normalizeRole(source.role) || normalizeRole(fallback.role) || 'STUDENT',
    gender: source.gender ?? fallback.gender,
    avatarUrl: source.avatarUrl ?? fallback.avatarUrl,
    grade: source.grade != null ? String(source.grade) : (fallback.grade || '8'),
    currentStreak: source.currentStreak ?? fallback.currentStreak ?? 0,
    longestStreak: source.longestStreak ?? fallback.longestStreak ?? 0,
    lastCheckInDate: source.lastCheckInDate ?? fallback.lastCheckInDate ?? null,
    checkedInToday: source.checkedInToday ?? fallback.checkedInToday ?? false
  };
}

function normalizeRole(role) {
  if (!role) return '';
  const raw = typeof role === 'string'
    ? role
    : String(role.code || role.name || role.authority || '');
  return raw.replace(/^ROLE_/i, '').toUpperCase();
}

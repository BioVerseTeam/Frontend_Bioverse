/**
 * BioVerse - Login Page Controller (login.html)
 * Connected directly to Spring Boot Auth API
 */

import { AuthService } from '../features/auth/authService.js';
import { alertModal, showToast } from '../components/modal.js';
import { homeAfterLogin, isAdmin } from '../utils/adminGuard.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('form');
  const identifierInput = document.getElementById('identifier');
  const passwordInput = document.getElementById('password');
  const toggleBtn = document.getElementById('togglePassBtn') || document.querySelector('button[aria-label="Hiện mật khẩu"]');
  const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

  // Create an inline error alert container if not present
  let errorBanner = document.getElementById('auth-error-banner');
  if (!errorBanner && form) {
    errorBanner = document.createElement('div');
    errorBanner.id = 'auth-error-banner';
    errorBanner.className = 'hidden mb-4 p-3 bg-[#ffebee] border-2 border-[#b71422] rounded-xl text-[#b71422] font-body-sm text-sm flex items-center gap-2 shadow-[2px_2px_0px_#b71422]';
    errorBanner.innerHTML = `
      <span class="material-symbols-outlined text-[20px] shrink-0">error</span>
      <span class="error-text font-semibold flex-1"></span>
    `;
    form.parentNode.insertBefore(errorBanner, form);
  }

  function showError(msg) {
    if (errorBanner) {
      const textEl = errorBanner.querySelector('.error-text');
      if (textEl) textEl.textContent = msg;
      errorBanner.classList.remove('hidden');
      errorBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      alertModal(msg, 'Đăng nhập không thành công', 'error');
    }
  }

  function clearError() {
    if (errorBanner) {
      errorBanner.classList.add('hidden');
    }
  }

  // Quick Account Fill Buttons (Helper for Seeded Accounts)
  const quickClassBtn = document.getElementById('quick-demo-btn') || 
                        Array.from(document.querySelectorAll('button[type="button"]')).find(b => 
                          b.textContent.includes('student@bioverse.com') || 
                          b.textContent.includes('qr_code_scanner') ||
                          b.textContent.includes('Mã Lớp Học')
                        );
  if (quickClassBtn) {
    quickClassBtn.title = "Bấm để điền tài khoản mẫu THCS (student@bioverse.com)";
    quickClassBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (identifierInput) identifierInput.value = 'student@bioverse.com';
      if (passwordInput) passwordInput.value = 'Student@123456';
      clearError();
      showToast('Đã điền tài khoản mẫu: student@bioverse.com', 'info');
    });
  }

  // Toggle Password Visibility
  if (toggleBtn && passwordInput) {
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const isPw = passwordInput.type === 'password';
      passwordInput.type = isPw ? 'text' : 'password';
      const icon = toggleBtn.querySelector('.material-symbols-outlined') || document.getElementById('togglePassIcon');
      if (icon) {
        icon.textContent = isPw ? 'visibility_off' : 'visibility';
      }
    });
  }

  // Clear error on input typing
  [identifierInput, passwordInput].forEach(inp => {
    if (inp) {
      inp.addEventListener('input', clearError);
    }
  });

  // Handle Form Submit
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearError();

      let identifier = identifierInput ? identifierInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';

      if (!identifier || !password) {
        showError('Vui lòng nhập đầy đủ tài khoản và mật khẩu!');
        return;
      }

      // Auto-fill domain if user typed shorthand 'student' or 'admin'
      if (!identifier.includes('@')) {
        if (['student', 'admin', 'student2'].includes(identifier.toLowerCase())) {
          identifier = `${identifier.toLowerCase()}@bioverse.com`;
          if (identifierInput) identifierInput.value = identifier;
        } else {
          showError('Vui lòng nhập địa chỉ email hợp lệ (Ví dụ: student@bioverse.com)!');
          return;
        }
      }

      // UI Loading state
      const origBtnHtml = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
          <span class="material-symbols-outlined animate-spin text-xl">progress_activity</span>
          <span>Đang xác thực với máy chủ...</span>
        `;
      }

      try {
        const user = await AuthService.login(identifier, password);
        const dest = homeAfterLogin(user);
        showToast(
          isAdmin(user) ? 'Đăng nhập thành công! Đang mở phòng điều hành...' : 'Đăng nhập thành công! Đang mở Sổ tay STEM...',
          'success'
        );
        setTimeout(() => {
          window.location.href = dest;
        }, 600);
      } catch (err) {
        console.error('Login error:', err);
        showError(err.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại!');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origBtnHtml;
        }
      }
    });
  }
});

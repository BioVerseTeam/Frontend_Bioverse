/**
 * BioVerse - Forgot Password Page Controller (forgot-password.html)
 * Connected directly to Spring Boot /api/auth/forgot-password
 */

import { AuthService } from '../features/auth/authService.js';
import { alertModal, showToast } from '../components/modal.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('forgot-password-form') || document.querySelector('form');
  const input = document.getElementById('recovery-input') || document.querySelector('input[type="text"]');
  const submitBtn = document.getElementById('submit-btn');

  // Create inline error banner
  let errorBanner = document.getElementById('forgot-pw-error');
  if (!errorBanner && form) {
    errorBanner = document.createElement('div');
    errorBanner.id = 'forgot-pw-error';
    errorBanner.className = 'hidden mb-3 p-3 bg-[#ffebee] border-2 border-[#b71422] rounded-xl text-[#b71422] font-body-sm text-sm flex items-center gap-2 shadow-[2px_2px_0px_#b71422]';
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
    } else {
      alertModal(msg, 'Quên mật khẩu', 'error');
    }
  }

  function clearError() {
    if (errorBanner) {
      errorBanner.classList.add('hidden');
    }
  }

  if (input) {
    input.addEventListener('input', clearError);
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearError();

      const target = input ? input.value.trim() : '';

      if (!target) {
        showError('Vui lòng nhập địa chỉ email tài khoản học sinh!');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(target)) {
        showError('Vui lòng nhập đúng định dạng email (Ví dụ: student@bioverse.com)');
        return;
      }

      const origBtnHtml = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
          <span class="material-symbols-outlined animate-spin text-xl">progress_activity</span>
          <span>Đang gửi mã cứu hộ...</span>
        `;
      }

      try {
        await AuthService.forgotPassword(target);
        // Redirect to OTP with reset flow
        window.location.href = '/otp';
      } catch (err) {
        console.error('Forgot password error:', err);
        showError(err.message || 'Không thể gửi yêu cầu đặt lại mật khẩu. Vui lòng kiểm tra lại địa chỉ email!');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origBtnHtml;
        }
      }
    });
  }
});

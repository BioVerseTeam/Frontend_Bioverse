/**
 * BioVerse - Register Page Controller (register.html)
 * Strictly wired to Spring Boot /api/auth/register API
 */

import { AuthService } from '../features/auth/authService.js';
import { alertModal, showToast } from '../components/modal.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('form');
  const fullNameInput = document.getElementById('register-fullname');
  const emailInput = document.getElementById('register-email');
  const passwordInput = document.getElementById('register-password');
  const confirmPasswordInput = document.getElementById('register-confirm-password');
  const gradePills = document.querySelectorAll('.grade-pill');
  const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

  let selectedGrade = '7';

  // Inline error alert container
  let errorBanner = document.getElementById('register-error-banner');
  if (!errorBanner && form) {
    errorBanner = document.createElement('div');
    errorBanner.id = 'register-error-banner';
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
      errorBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      alertModal(msg, 'Lỗi đăng ký', 'error');
    }
  }

  function clearError() {
    if (errorBanner) {
      errorBanner.classList.add('hidden');
    }
  }

  [fullNameInput, emailInput, passwordInput, confirmPasswordInput].forEach(inp => {
    if (inp) inp.addEventListener('input', clearError);
  });

  // Handle Grade selection
  window.selectGrade = function(pill) {
    gradePills.forEach(p => {
      p.classList.remove('selected-active');
      const text = p.querySelector('span');
      if (text) {
        text.classList.remove('text-primary', 'font-bold');
        text.classList.add('text-on-surface');
      }
      const doodle = p.querySelector('.marker-circle');
      if (doodle) doodle.remove();
    });

    pill.classList.add('selected-active');
    const activeText = pill.querySelector('span');
    if (activeText) {
      activeText.classList.remove('text-on-surface');
      activeText.classList.add('text-primary', 'font-bold');
    }

    // Add marker doodle
    const svgDoodle = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgDoodle.setAttribute('class', 'marker-circle absolute -inset-1.5 w-[calc(100%+12px)] h-[calc(100%+12px)] pointer-events-none');
    svgDoodle.setAttribute('viewBox', '0 0 100 50');
    svgDoodle.setAttribute('fill', 'none');
    svgDoodle.innerHTML = '<path d="M 12,25 C 10,8 88,6 92,24 C 95,40 16,46 8,26 C 6,18 25,12 50,11" stroke="#ff4d4d" stroke-linecap="round" stroke-width="3"/>';
    pill.appendChild(svgDoodle);

    selectedGrade = pill.textContent.trim().replace(/\D/g, '') || '7';
  };

  // Handle Form Submit
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearError();

      const fullName = fullNameInput ? fullNameInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';
      const confirmPw = confirmPasswordInput ? confirmPasswordInput.value : '';

      if (!fullName || !email || !password || !confirmPw) {
        showError('Vui lòng điền đầy đủ các mục thông tin bắt buộc (*)');
        return;
      }

      // Email format check
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showError('Địa chỉ email không đúng định dạng (Ví dụ: hocsinh@gmail.com)');
        return;
      }

      // Password length check
      if (password.length < 8) {
        showError('Mật khẩu phải chứa ít nhất 8 ký tự theo quy định của hệ thống.');
        return;
      }

      if (password !== confirmPw) {
        showError('Mật khẩu và Xác nhận mật khẩu không trùng khớp!');
        return;
      }

      const origBtnHtml = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
          <span class="material-symbols-outlined animate-spin text-xl">progress_activity</span>
          <span>Đang tạo tài khoản &amp; gửi OTP...</span>
        `;
      }

      try {
        await AuthService.register(fullName, email, password, confirmPw);
        // On success, redirect to OTP page to verify email
        window.location.href = '/otp.html';
      } catch (err) {
        console.error('Registration failed:', err);
        showError(err.message || 'Đăng ký không thành công. Vui lòng kiểm tra lại!');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origBtnHtml;
        }
      }
    });
  }
});

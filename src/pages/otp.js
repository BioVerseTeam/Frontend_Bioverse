/**
 * BioVerse - OTP Verification Page Controller (otp.html)
 * Connected directly to Spring Boot Auth API
 * Supports both Registration flow and Password Reset flow
 */

import { AuthService } from '../features/auth/authService.js';
import { alertModal, showToast } from '../components/modal.js';

document.addEventListener('DOMContentLoaded', () => {
  const email = sessionStorage.getItem('bioverse_otp_email');
  const flow = sessionStorage.getItem('bioverse_otp_flow') || 'REGISTER';

  const targetEmailEl = document.getElementById('otp-target-email');
  const headerTitleEl = document.getElementById('otp-header-title');
  const backLinkEl = document.getElementById('back-link');
  const errorBanner = document.getElementById('otp-error-banner');
  const errorText = errorBanner ? errorBanner.querySelector('.error-text') : null;

  const otpInputSection = document.getElementById('otp-input-section');
  const resetPwSection = document.getElementById('reset-password-section');
  const verifyBtn = document.getElementById('btn-verify-otp');
  const resendBtn = document.getElementById('btn-resend-otp');
  const timerEl = document.getElementById('otp-timer');

  const newPwInput = document.getElementById('new-pw-input');
  const confirmNewPwInput = document.getElementById('confirm-new-pw-input');
  const submitNewPwBtn = document.getElementById('btn-submit-new-password');

  const inputs = Array.from(document.querySelectorAll('.otp-digit'));

  let resetToken = null;

  function showError(msg) {
    if (errorBanner && errorText) {
      errorText.textContent = msg;
      errorBanner.classList.remove('hidden');
    } else {
      alertModal(msg, 'Thông báo OTP', 'error');
    }
  }

  function clearError() {
    if (errorBanner) {
      errorBanner.classList.add('hidden');
    }
  }

  // Update flow-specific UI
  if (targetEmailEl) {
    targetEmailEl.textContent = email || 'bạn (chưa xác định email)';
  }

  if (headerTitleEl) {
    headerTitleEl.textContent = flow === 'RESET_PASSWORD'
      ? 'Xác Thực Đặt Lại Mật Khẩu'
      : 'Xác Thực Tài Khoản BioVerse';
  }

  if (backLinkEl) {
    backLinkEl.href = flow === 'RESET_PASSWORD' ? '/forgot-password' : '/register';
    const linkSpan = backLinkEl.querySelector('span:last-child');
    if (linkSpan) {
      linkSpan.textContent = flow === 'RESET_PASSWORD' ? 'Nhập lại email quên mật khẩu' : 'Nhập lại thông tin đăng ký';
    }
  }

  if (!email) {
    showError('Không tìm thấy thông tin email cần xác thực. Vui lòng thực hiện lại từ màn hình Đăng ký hoặc Quên mật khẩu.');
  }

  // Focus navigation for 6 OTP inputs
  inputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      clearError();
      const val = input.value.replace(/\D/g, '');
      input.value = val ? val[val.length - 1] : '';

      if (input.value && index < inputs.length - 1) {
        inputs[index + 1].focus();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && index > 0) {
        inputs[index - 1].focus();
      }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      clearError();
      const pasteData = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').trim();
      if (pasteData) {
        pasteData.split('').slice(0, inputs.length).forEach((char, i) => {
          inputs[i].value = char;
        });
        const nextIdx = Math.min(pasteData.length, inputs.length - 1);
        inputs[nextIdx].focus();
      }
    });
  });

  if (inputs.length > 0 && inputs[0]) {
    inputs[0].focus();
  }

  // Timer countdown
  let timeLeft = 600; // 10 minutes
  const timerInterval = setInterval(() => {
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      if (timerEl) timerEl.textContent = '00:00 (Hết hạn)';
      showError('Mã OTP đã hết hiệu lực. Vui lòng bấm "Gửi lại mã OTP" để nhận mã mới.');
      return;
    }
    timeLeft--;
    const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const secs = String(timeLeft % 60).padStart(2, '0');
    if (timerEl) timerEl.textContent = `${mins}:${secs}s`;
  }, 1000);

  // Resend OTP button
  let resendCooldown = 0;
  if (resendBtn) {
    resendBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      clearError();

      if (!email) {
        showError('Không có email để gửi lại mã!');
        return;
      }

      if (resendCooldown > 0) {
        showError(`Vui lòng đợi ${resendCooldown}s trước khi yêu cầu gửi lại OTP!`);
        return;
      }

      const origText = resendBtn.innerHTML;
      resendBtn.disabled = true;
      resendBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">progress_activity</span> Đang gửi...';

      try {
        const purpose = flow === 'RESET_PASSWORD' ? 'RESET_PASSWORD' : 'REGISTER';
        await AuthService.resendOtp(email, purpose);
        showToast(`Đã gửi lại mã OTP mới tới ${email}!`, 'info');
        // Start 60s cooldown
        resendCooldown = 60;
        const cooldownTimer = setInterval(() => {
          resendCooldown--;
          if (resendCooldown <= 0) {
            clearInterval(cooldownTimer);
            resendBtn.disabled = false;
            resendBtn.innerHTML = origText;
          } else {
            resendBtn.innerHTML = `Gửi lại sau (${resendCooldown}s)`;
          }
        }, 1000);
      } catch (err) {
        console.error('Resend OTP error:', err);
        showError(err.message || 'Chưa thể gửi lại mã OTP. Vui lòng thử lại sau.');
        resendBtn.disabled = false;
        resendBtn.innerHTML = origText;
      }
    });
  }

  // Verify OTP button
  if (verifyBtn) {
    verifyBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      clearError();

      const code = inputs.map(i => i.value.trim()).join('');
      if (code.length !== 6) {
        showError('Vui lòng nhập đầy đủ 6 chữ số của mã OTP!');
        return;
      }

      if (!email) {
        showError('Thiếu địa chỉ email cần xác thực. Vui lòng quay lại.');
        return;
      }

      const origVerifyHtml = verifyBtn.innerHTML;
      verifyBtn.disabled = true;
      verifyBtn.innerHTML = `
        <span class="material-symbols-outlined animate-spin text-xl">progress_activity</span>
        <span>Đang kiểm tra với máy chủ...</span>
      `;

      try {
        if (flow === 'RESET_PASSWORD') {
          // Verify reset OTP
          resetToken = await AuthService.verifyResetOtp(email, code);
          // Show password reset form
          if (otpInputSection) otpInputSection.classList.add('hidden');
          if (resetPwSection) {
            resetPwSection.classList.remove('hidden');
            resetPwSection.classList.add('flex');
          }
          if (newPwInput) newPwInput.focus();
        } else {
          // Verify registration
          await AuthService.verifyRegister(email, code);
          showToast('Kích hoạt tài khoản thành công!', 'success');
          await alertModal('Chúc mừng! Tài khoản học sinh BioVerse đã được kích hoạt thành công. Nhấn OK để bước vào Sổ tay STEM!', 'Kích hoạt thành công', 'success');
          window.location.href = '/';
        }
      } catch (err) {
        console.error('OTP verification failed:', err);
        showError(err.message || 'Mã OTP không chính xác hoặc đã hết hạn. Vui lòng thử lại!');
        inputs.forEach(i => i.value = '');
        if (inputs[0]) inputs[0].focus();
      } finally {
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = origVerifyHtml;
      }
    });
  }

  // Handle New Password Submission (Forgot Password Flow Step 2)
  if (submitNewPwBtn) {
    submitNewPwBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      clearError();

      const newPw = newPwInput ? newPwInput.value : '';
      const confirmNewPw = confirmNewPwInput ? confirmNewPwInput.value : '';

      if (!newPw || !confirmNewPw) {
        showError('Vui lòng nhập mật khẩu mới và xác nhận mật khẩu!');
        return;
      }

      if (newPw.length < 8) {
        showError('Mật khẩu mới phải từ 8 ký tự trở lên theo tiêu chuẩn an toàn!');
        return;
      }

      if (newPw !== confirmNewPw) {
        showError('Mật khẩu mới và xác nhận mật khẩu không khớp!');
        return;
      }

      const origBtnHtml = submitNewPwBtn.innerHTML;
      submitNewPwBtn.disabled = true;
      submitNewPwBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-xl">progress_activity</span> Đang lưu mật khẩu...';

      try {
        await AuthService.resetPassword(resetToken, newPw, confirmNewPw);
        showToast('Đặt lại mật khẩu thành công!', 'success');
        await alertModal('Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.', 'Hoàn tất', 'success');
        window.location.href = '/login';
      } catch (err) {
        console.error('Reset password failed:', err);
        showError(err.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại!');
      } finally {
        submitNewPwBtn.disabled = false;
        submitNewPwBtn.innerHTML = origBtnHtml;
      }
    });
  }
});

/**
 * BioVerse - Scientific Sketchbook Custom Modal & Toast System
 * Neo-Brutalist design replacing browser alerts and confirms.
 */

import '../styles/modal.css';

// Type configurations
const TYPE_CONFIGS = {
  success: {
    tag: 'THÀNH CÔNG',
    icon: 'task_alt',
    defaultTitle: 'Thao tác thành công!',
    btnClass: 'bv-modal-btn-success',
    defaultConfirmText: 'Tiếp tục',
    washiTag: 'LAB VERIFIED ✓'
  },
  confirm: {
    tag: 'XÁC NHẬN',
    icon: 'help_outline',
    defaultTitle: 'Xác nhận thao tác',
    btnClass: 'bv-modal-btn-primary',
    defaultConfirmText: 'Đồng ý',
    washiTag: 'ACTION REQUIRED'
  },
  warning: {
    tag: 'LƯU Ý QUAN TRỌNG',
    icon: 'warning',
    defaultTitle: 'Chú ý phòng thí nghiệm',
    btnClass: 'bv-modal-btn-primary',
    defaultConfirmText: 'Đã hiểu',
    washiTag: 'LAB SAFETY NOTE'
  },
  error: {
    tag: 'CẢNH BÁO',
    icon: 'report_problem',
    defaultTitle: 'Không thể thực hiện',
    btnClass: 'bv-modal-btn-destructive',
    defaultConfirmText: 'Đóng lại',
    washiTag: 'EXPERIMENT ERROR'
  },
  info: {
    tag: 'THÔNG BÁO STEM',
    icon: 'lightbulb',
    defaultTitle: 'Thông báo từ BioVerse',
    btnClass: 'bv-modal-btn-primary',
    defaultConfirmText: 'Đã rõ',
    washiTag: 'BIOVERSE NOTE #01'
  }
};

class ModalManager {
  constructor() {
    this.backdrop = null;
    this.activeResolve = null;
    this.keyHandler = null;
    this.toastContainer = null;
    this.ensureElements();
  }

  ensureElements() {
    if (typeof document === 'undefined') return;

    if (!this.backdrop) {
      this.backdrop = document.createElement('div');
      this.backdrop.className = 'bv-modal-backdrop';
      this.backdrop.setAttribute('role', 'dialog');
      this.backdrop.setAttribute('aria-modal', 'true');
      this.backdrop.innerHTML = `
        <div class="bv-modal-dialog">
          <!-- Washi Tape -->
          <div class="bv-modal-washi-tape" id="bv-modal-washi">
            <span class="material-symbols-outlined text-[13px]">bookmark</span>
            <span id="bv-modal-washi-text">BIOVERSE LAB NOTE</span>
          </div>

          <!-- Close button -->
          <button type="button" class="bv-modal-close-btn" id="bv-modal-close" aria-label="Đóng">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>

          <!-- Icon Badge -->
          <div class="bv-modal-icon-badge" id="bv-modal-badge">
            <span class="material-symbols-outlined text-[32px]" id="bv-modal-icon">info</span>
          </div>

          <!-- Header & Title -->
          <div class="bv-modal-title-wrap">
            <span class="bv-modal-tag" id="bv-modal-tag">THÔNG BÁO</span>
            <h3 class="bv-modal-title" id="bv-modal-title">Tiêu đề thông báo</h3>
          </div>

          <!-- Body Message -->
          <div class="bv-modal-message" id="bv-modal-message">
            Nội dung thông báo hiển thị tại đây...
          </div>

          <!-- Actions Bar -->
          <div class="bv-modal-actions" id="bv-modal-actions">
            <button type="button" class="bv-modal-btn bv-modal-btn-cancel" id="bv-modal-cancel">Hủy bỏ</button>
            <button type="button" class="bv-modal-btn bv-modal-btn-primary" id="bv-modal-confirm">Đồng ý</button>
          </div>
        </div>
      `;

      document.body.appendChild(this.backdrop);

      // Event listeners
      const closeBtn = this.backdrop.querySelector('#bv-modal-close');
      const cancelBtn = this.backdrop.querySelector('#bv-modal-cancel');
      const confirmBtn = this.backdrop.querySelector('#bv-modal-confirm');

      closeBtn.addEventListener('click', () => this.close(false));
      cancelBtn.addEventListener('click', () => this.close(false));
      confirmBtn.addEventListener('click', () => this.close(true));

      // Click outside to close (only if not confirm type)
      this.backdrop.addEventListener('click', (e) => {
        if (e.target === this.backdrop) {
          this.close(false);
        }
      });
    }

    if (!this.toastContainer) {
      this.toastContainer = document.createElement('div');
      this.toastContainer.className = 'bv-toast-container';
      document.body.appendChild(this.toastContainer);
    }
  }

  show(options = {}) {
    this.ensureElements();

    return new Promise((resolve) => {
      this.activeResolve = resolve;

      const type = options.type || (options.showCancel ? 'confirm' : 'info');
      const config = TYPE_CONFIGS[type] || TYPE_CONFIGS.info;
      const isConfirm = options.showCancel !== undefined ? options.showCancel : (type === 'confirm');

      // Update dialog styling
      const dialog = this.backdrop.querySelector('.bv-modal-dialog');
      dialog.className = `bv-modal-dialog bv-modal-type-${type}`;

      // Update Washi text
      const washiText = document.getElementById('bv-modal-washi-text');
      if (washiText) {
        washiText.textContent = options.washiTag || config.washiTag;
      }

      // Update Tag badge
      const tag = document.getElementById('bv-modal-tag');
      if (tag) {
        tag.textContent = options.tag || config.tag;
      }

      // Update Icon
      const icon = document.getElementById('bv-modal-icon');
      if (icon) {
        icon.textContent = options.icon || config.icon;
      }

      // Update Title
      const title = document.getElementById('bv-modal-title');
      if (title) {
        title.innerHTML = options.title || config.defaultTitle;
      }

      // Update Message
      const message = document.getElementById('bv-modal-message');
      if (message) {
        message.innerHTML = options.message || '';
      }

      // Buttons
      const cancelBtn = document.getElementById('bv-modal-cancel');
      const confirmBtn = document.getElementById('bv-modal-confirm');

      if (isConfirm) {
        cancelBtn.style.display = 'inline-flex';
        cancelBtn.textContent = options.cancelText || 'Hủy bỏ';
      } else {
        cancelBtn.style.display = 'none';
      }

      confirmBtn.textContent = options.confirmText || config.defaultConfirmText;

      // Button variant class
      confirmBtn.className = 'bv-modal-btn';
      if (options.isDestructive) {
        confirmBtn.classList.add('bv-modal-btn-destructive');
      } else if (type === 'success') {
        confirmBtn.classList.add('bv-modal-btn-success');
      } else {
        confirmBtn.classList.add('bv-modal-btn-primary');
      }

      // Show backdrop
      this.backdrop.classList.add('is-active');

      // Keyboard handler (Escape / Enter)
      if (this.keyHandler) {
        window.removeEventListener('keydown', this.keyHandler);
      }

      this.keyHandler = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          this.close(false);
        } else if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.close(true);
        }
      };
      window.addEventListener('keydown', this.keyHandler);

      // Focus confirm button
      setTimeout(() => confirmBtn.focus(), 80);
    });
  }

  close(result) {
    if (this.backdrop) {
      this.backdrop.classList.remove('is-active');
    }

    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }

    if (this.activeResolve) {
      const res = this.activeResolve;
      this.activeResolve = null;
      res(result);
    }
  }

  toast(message, type = 'success', duration = 3500) {
    this.ensureElements();

    const toastEl = document.createElement('div');
    toastEl.className = `bv-toast bv-toast-${type}`;

    const iconMap = {
      success: 'task_alt',
      error: 'report_problem',
      warning: 'warning',
      info: 'lightbulb'
    };
    const titleMap = {
      success: 'THÀNH CÔNG',
      error: 'CẢNH BÁO',
      warning: 'LƯU Ý',
      info: 'THÔNG TIN'
    };

    toastEl.innerHTML = `
      <div class="bv-toast-icon">
        <span class="material-symbols-outlined text-[20px]">${iconMap[type] || 'info'}</span>
      </div>
      <div class="bv-toast-content">
        <div class="bv-toast-title">${titleMap[type] || 'THÔNG BÁO'}</div>
        <div class="bv-toast-message">${message}</div>
      </div>
      <button type="button" class="bv-toast-close" aria-label="Đóng">
        <span class="material-symbols-outlined text-[16px]">close</span>
      </button>
      <div class="bv-toast-progress" style="transition: transform ${duration}ms linear; transform: scaleX(1);"></div>
    `;

    this.toastContainer.appendChild(toastEl);

    // Trigger entrance animation
    requestAnimationFrame(() => {
      toastEl.classList.add('is-show');
      const progressBar = toastEl.querySelector('.bv-toast-progress');
      if (progressBar) {
        requestAnimationFrame(() => {
          progressBar.style.transform = 'scaleX(0)';
        });
      }
    });

    // Auto dismiss
    const timer = setTimeout(() => dismiss(), duration);

    const dismiss = () => {
      clearTimeout(timer);
      toastEl.classList.remove('is-show');
      setTimeout(() => toastEl.remove(), 350);
    };

    toastEl.querySelector('.bv-toast-close').addEventListener('click', dismiss);
  }
}

// Singleton instance
const manager = new ModalManager();

/**
 * Universal Modal Method
 * @param {Object} options
 * @returns {Promise<boolean>}
 */
export function showModal(options) {
  return manager.show(options);
}

/**
 * Custom Alert Modal (Replaces window.alert)
 * @param {string|Object} messageOrOptions
 * @param {string} [title]
 * @param {string} [type]
 * @returns {Promise<void>}
 */
export async function alertModal(messageOrOptions, title = null, type = 'info') {
  let opts = {};
  if (typeof messageOrOptions === 'string') {
    opts = {
      message: messageOrOptions,
      title: title || (type === 'error' ? 'Không thể hoàn tất' : (type === 'success' ? 'Thành công!' : 'Thông báo')),
      type: type,
      showCancel: false
    };
  } else {
    opts = {
      ...messageOrOptions,
      showCancel: false
    };
  }
  await manager.show(opts);
}

/**
 * Custom Confirm Modal (Replaces window.confirm)
 * @param {string|Object} messageOrOptions
 * @param {string} [title]
 * @param {Object} [extraOptions]
 * @returns {Promise<boolean>}
 */
export async function confirmModal(messageOrOptions, title = 'Xác nhận thao tác', extraOptions = {}) {
  let opts = {};
  if (typeof messageOrOptions === 'string') {
    opts = {
      message: messageOrOptions,
      title: title,
      type: 'confirm',
      showCancel: true,
      ...extraOptions
    };
  } else {
    opts = {
      type: 'confirm',
      showCancel: true,
      ...messageOrOptions
    };
  }
  return await manager.show(opts);
}

/**
 * Custom Toast Notification (Post-it note in corner)
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} [type]
 * @param {number} [duration]
 */
export function showToast(message, type = 'success', duration = 3500) {
  manager.toast(message, type, duration);
}

/**
 * Patch window.alert to automatically use the custom modal
 */
export function initGlobalDialogs() {
  if (typeof window !== 'undefined') {
    window.bioverseAlert = alertModal;
    window.bioverseConfirm = confirmModal;
    window.bioverseToast = showToast;
  }
}

/**
 * BioVerse User Feedback Widget
 * Giao diện người dùng gửi góp ý, đánh giá và báo lỗi, tích hợp GSAP animation
 * và phong cách Neo-Brutalist Sketchbook.
 */

import gsap from 'gsap';
import '../styles/feedbackWidget.css';
import { submitFeedback, getClientDeviceInfo } from '../api/feedbackApi.js';
import { AuthService } from '../features/auth/authService.js';

const RATING_LABELS = {
  1: '😡 Rất không hài lòng',
  2: '🙁 Cần cải thiện nhiều',
  3: '😐 Bình thường',
  4: '🙂 Hài lòng',
  5: '🤩 Rất tuyệt vời!'
};

const CATEGORIES = [
  { key: 'GENERAL', label: 'Góp ý chung', icon: 'chat_bubble' },
  { key: 'BUG', label: 'Báo lỗi kỹ thuật', icon: 'bug_report' },
  { key: 'CONTENT', label: 'Nội dung & 3D', icon: 'science' },
  { key: 'UI_UX', label: 'Giao diện', icon: 'palette' },
  { key: 'FEATURE', label: 'Đề xuất tính năng', icon: 'lightbulb' }
];

export class FeedbackWidget {
  constructor(options = {}) {
    this.options = {
      autoMount: true,
      showLauncher: true,
      ...options
    };

    this.isOpen = false;
    this.selectedCategory = 'GENERAL';
    this.selectedRating = 5;
    this.isSubmitting = false;

    if (this.options.autoMount) {
      this.init();
    }
  }

  init() {
    if (document.getElementById('bv-feedback-widget-root')) return;

    this.render();
    this.bindEvents();
    this.animateLauncherEntrance();

    // Export global trigger for other components
    window.openFeedbackModal = (preset = {}) => this.open(preset);
  }

  render() {
    const root = document.createElement('div');
    root.id = 'bv-feedback-widget-root';

    const currentUser = AuthService.getUser();
    const defaultName = currentUser?.fullName || currentUser?.name || '';
    const defaultEmail = currentUser?.email || '';
    const deviceInfo = getClientDeviceInfo();

    root.innerHTML = `
      <!-- 1. Floating Launcher Button -->
      ${this.options.showLauncher ? `
        <button type="button" id="bv-feedback-launcher" class="bv-feedback-launcher" aria-label="Gửi phản hồi đóng góp">
          <span class="bv-feedback-launcher-icon">
            <span class="material-symbols-outlined">rate_review</span>
          </span>
          <span>Góp ý</span>
        </button>
      ` : ''}

      <!-- 2. Modal Backdrop & Dialog -->
      <div id="bv-feedback-backdrop" class="bv-feedback-backdrop" role="dialog" aria-modal="true" aria-labelledby="bv-feedback-title" hidden>
        <div id="bv-feedback-modal" class="bv-feedback-modal">
          
          <!-- Normal Form State -->
          <div id="bv-feedback-form-view">
            <!-- Header -->
            <div class="bv-feedback-header">
              <div class="bv-feedback-brand">
                <div class="bv-feedback-stamp">
                  <span class="material-symbols-outlined">mark_email_read</span>
                </div>
                <div>
                  <h2 id="bv-feedback-title" class="bv-feedback-title">Góp ý & Báo lỗi</h2>
                  <p class="bv-feedback-subtitle">Ý kiến của bạn giúp phòng thí nghiệm BioVerse hoàn thiện hơn mỗi ngày.</p>
                </div>
              </div>
              <button type="button" id="bv-feedback-close-btn" class="bv-feedback-close" aria-label="Đóng bảng góp ý">
                <span class="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <!-- Category Selector -->
            <div>
              <div class="bv-feedback-section-label">
                <span class="material-symbols-outlined text-[14px]">category</span>
                <span>Chủ đề góp ý</span>
              </div>
              <div class="bv-feedback-categories" id="bv-feedback-category-group">
                ${CATEGORIES.map(cat => `
                  <button type="button" 
                          class="bv-feedback-chip ${cat.key === this.selectedCategory ? 'is-active' : ''}" 
                          data-cat="${cat.key}">
                    <span class="material-symbols-outlined text-[15px]">${cat.icon}</span>
                    <span>${cat.label}</span>
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Star Rating -->
            <div class="bv-feedback-rating-wrapper" id="bv-feedback-rating-box">
              <div class="bv-feedback-section-label" style="margin-bottom: 4px;">
                <span class="material-symbols-outlined text-[14px]">star</span>
                <span>Mức độ hài lòng của bạn</span>
              </div>
              <div class="bv-feedback-stars-row" id="bv-feedback-stars">
                ${[1, 2, 3, 4, 5].map(star => `
                  <button type="button" class="bv-feedback-star ${star <= this.selectedRating ? 'is-lit' : ''}" data-star="${star}" aria-label="${star} sao">
                    <span class="material-symbols-outlined">star</span>
                  </button>
                `).join('')}
              </div>
              <div id="bv-feedback-rating-label" class="bv-feedback-rating-label">
                ${RATING_LABELS[this.selectedRating]}
              </div>
            </div>

            <!-- Form Inputs -->
            <form id="bv-feedback-form">
              <div class="bv-feedback-field">
                <input type="text" 
                       id="bv-feedback-input-title" 
                       class="bv-feedback-input" 
                       placeholder="Tiêu đề tóm tắt (ví dụ: Mô hình xoay rất mượt, Cần thêm chú thích...)" 
                       maxlength="200">
              </div>

              <div class="bv-feedback-field">
                <textarea id="bv-feedback-input-content" 
                          class="bv-feedback-textarea" 
                          placeholder="Chia sẻ chi tiết trải nghiệm, cảm nhận hoặc lỗi bạn gặp phải tại đây... *" 
                          required 
                          rows="3"></textarea>
              </div>

              <!-- Name & Email (Pre-filled if logged in) -->
              <div class="bv-feedback-meta-grid">
                <div>
                  <input type="text" 
                         id="bv-feedback-input-name" 
                         class="bv-feedback-input" 
                         placeholder="Tên của bạn (hoặc ẩn danh)" 
                         value="${escapeHtml(defaultName)}">
                </div>
                <div>
                  <input type="email" 
                         id="bv-feedback-input-email" 
                         class="bv-feedback-input" 
                         placeholder="Email để nhận phản hồi" 
                         value="${escapeHtml(defaultEmail)}">
                </div>
              </div>

              <!-- Context Tag -->
              <div class="bv-feedback-device-tag">
                <span class="material-symbols-outlined text-[16px] text-gray-500">info</span>
                <span>Thông tin trang & thiết bị (<strong>${deviceInfo}</strong>) sẽ được đính kèm tự động để hỗ trợ xử lý.</span>
              </div>

              <!-- Action Buttons -->
              <div class="bv-feedback-actions">
                <button type="button" id="bv-feedback-cancel-btn" class="bv-feedback-btn-cancel">Hủy</button>
                <button type="submit" id="bv-feedback-submit-btn" class="bv-feedback-btn-submit">
                  <span class="material-symbols-outlined text-[18px]">send</span>
                  <span>Gửi góp ý</span>
                </button>
              </div>
            </form>
          </div>

          <!-- 3. Success View (Hidden by default) -->
          <div id="bv-feedback-success-view" class="bv-feedback-success" hidden>
            <div class="bv-feedback-success-icon" id="bv-feedback-success-icon">
              <span class="material-symbols-outlined">check_circle</span>
            </div>
            <h3 class="bv-feedback-success-title">Cảm ơn bạn rất nhiều!</h3>
            <p class="bv-feedback-success-desc">
              Ý kiến đóng góp quý báu của bạn đã được chuyển tới ban quản trị phòng thí nghiệm BioVerse.
            </p>
            <button type="button" id="bv-feedback-done-btn" class="bv-feedback-btn-submit" style="margin: 0 auto;">
              <span class="material-symbols-outlined text-[18px]">done_all</span>
              <span>Đóng cửa sổ</span>
            </button>
          </div>

        </div>
      </div>
    `;

    document.body.appendChild(root);
  }

  bindEvents() {
    const launcher = document.getElementById('bv-feedback-launcher');
    const backdrop = document.getElementById('bv-feedback-backdrop');
    const modal = document.getElementById('bv-feedback-modal');
    const closeBtn = document.getElementById('bv-feedback-close-btn');
    const cancelBtn = document.getElementById('bv-feedback-cancel-btn');
    const doneBtn = document.getElementById('bv-feedback-done-btn');
    const form = document.getElementById('bv-feedback-form');

    if (launcher) {
      launcher.addEventListener('click', () => this.open());
    }

    if (closeBtn) closeBtn.addEventListener('click', () => this.close());
    if (cancelBtn) cancelBtn.addEventListener('click', () => this.close());
    if (doneBtn) doneBtn.addEventListener('click', () => this.close());

    // Click outside to close
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) this.close();
      });
    }

    // Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.close();
    });

    // Category chips
    const catGroup = document.getElementById('bv-feedback-category-group');
    if (catGroup) {
      catGroup.addEventListener('click', (e) => {
        const btn = e.target.closest('.bv-feedback-chip');
        if (!btn) return;
        const cat = btn.dataset.cat;
        if (!cat) return;

        this.selectedCategory = cat;
        catGroup.querySelectorAll('.bv-feedback-chip').forEach(b => {
          b.classList.toggle('is-active', b.dataset.cat === cat);
        });

        // Tactile GSAP bounce
        gsap.fromTo(btn, { scale: 0.92 }, { scale: 1, duration: 0.2, ease: 'back.out(2)' });
      });
    }

    // Rating stars
    const starsContainer = document.getElementById('bv-feedback-stars');
    const ratingLabel = document.getElementById('bv-feedback-rating-label');

    if (starsContainer) {
      starsContainer.addEventListener('click', (e) => {
        const starBtn = e.target.closest('.bv-feedback-star');
        if (!starBtn) return;
        const val = Number(starBtn.dataset.star);
        if (!val) return;

        this.selectedRating = val;
        this.updateStarVisuals(val);

        if (ratingLabel) {
          ratingLabel.textContent = RATING_LABELS[val] || '';
          gsap.fromTo(ratingLabel, { opacity: 0.3, y: -2 }, { opacity: 1, y: 0, duration: 0.2 });
        }

        // GSAP star pop animation
        gsap.fromTo(starBtn, 
          { scale: 0.7, rotate: -20 }, 
          { scale: 1.35, rotate: 10, duration: 0.18, yoyo: true, repeat: 1, ease: 'back.out(2)' }
        );
      });

      // Star Hover Preview
      starsContainer.querySelectorAll('.bv-feedback-star').forEach(starBtn => {
        starBtn.addEventListener('mouseenter', () => {
          const val = Number(starBtn.dataset.star);
          this.updateStarVisuals(val);
        });
      });

      starsContainer.addEventListener('mouseleave', () => {
        this.updateStarVisuals(this.selectedRating);
      });
    }

    // Form submit
    if (form) {
      form.addEventListener('submit', (e) => this.handleSubmit(e));
    }
  }

  updateStarVisuals(rating) {
    const stars = document.querySelectorAll('.bv-feedback-star');
    stars.forEach(s => {
      const starVal = Number(s.dataset.star);
      s.classList.toggle('is-lit', starVal <= rating);
    });
  }

  animateLauncherEntrance() {
    const launcher = document.getElementById('bv-feedback-launcher');
    if (!launcher) return;

    gsap.fromTo(launcher, 
      { scale: 0, opacity: 0, y: 20 },
      { scale: 1, opacity: 1, y: 0, duration: 0.6, delay: 0.5, ease: 'back.out(1.8)' }
    );
  }

  open(preset = {}) {
    const backdrop = document.getElementById('bv-feedback-backdrop');
    const modal = document.getElementById('bv-feedback-modal');
    const formView = document.getElementById('bv-feedback-form-view');
    const successView = document.getElementById('bv-feedback-success-view');

    if (!backdrop || !modal) return;

    // Apply presets
    if (preset.category) {
      this.selectedCategory = preset.category;
      document.querySelectorAll('.bv-feedback-chip').forEach(b => {
        b.classList.toggle('is-active', b.dataset.cat === preset.category);
      });
    }
    if (preset.title) {
      const titleInput = document.getElementById('bv-feedback-input-title');
      if (titleInput) titleInput.value = preset.title;
    }

    // Refresh logged in user prefill
    const user = AuthService.getUser();
    if (user) {
      const nameInput = document.getElementById('bv-feedback-input-name');
      const emailInput = document.getElementById('bv-feedback-input-email');
      if (nameInput && !nameInput.value) nameInput.value = user.fullName || user.name || '';
      if (emailInput && !emailInput.value) emailInput.value = user.email || '';
    }

    formView.hidden = false;
    successView.hidden = true;
    backdrop.hidden = false;
    backdrop.classList.add('is-open');
    this.isOpen = true;

    // GSAP entrance animation
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    tl.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.22 })
      .fromTo(modal, 
        { scale: 0.88, y: 35, opacity: 0 }, 
        { scale: 1, y: 0, opacity: 1, duration: 0.38, ease: 'back.out(1.4)' }, 
        '-=0.1'
      )
      .fromTo('#bv-feedback-category-group .bv-feedback-chip',
        { y: 10, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.04, duration: 0.25 },
        '-=0.2'
      );

    setTimeout(() => {
      const textarea = document.getElementById('bv-feedback-input-content');
      if (textarea) textarea.focus();
    }, 250);
  }

  close() {
    const backdrop = document.getElementById('bv-feedback-backdrop');
    const modal = document.getElementById('bv-feedback-modal');
    if (!backdrop || !modal) return;

    gsap.to(modal, {
      scale: 0.9,
      y: 20,
      opacity: 0,
      duration: 0.2,
      ease: 'power2.in'
    });

    gsap.to(backdrop, {
      opacity: 0,
      duration: 0.2,
      delay: 0.05,
      onComplete: () => {
        backdrop.classList.remove('is-open');
        backdrop.hidden = true;
        this.isOpen = false;
        this.resetForm();
      }
    });
  }

  resetForm() {
    const form = document.getElementById('bv-feedback-form');
    if (form) form.reset();
    this.selectedRating = 5;
    this.updateStarVisuals(5);
    const label = document.getElementById('bv-feedback-rating-label');
    if (label) label.textContent = RATING_LABELS[5];
  }

  async handleSubmit(e) {
    e.preventDefault();
    if (this.isSubmitting) return;

    const titleInput = document.getElementById('bv-feedback-input-title');
    const contentInput = document.getElementById('bv-feedback-input-content');
    const nameInput = document.getElementById('bv-feedback-input-name');
    const emailInput = document.getElementById('bv-feedback-input-email');
    const submitBtn = document.getElementById('bv-feedback-submit-btn');

    const content = contentInput?.value?.trim() || '';
    if (!content) {
      gsap.fromTo(contentInput, { x: -8 }, { x: 8, duration: 0.08, repeat: 3, yoyo: true });
      contentInput?.focus();
      return;
    }

    this.isSubmitting = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
        <span>Đang gửi...</span>
      `;
    }

    try {
      await submitFeedback({
        category: this.selectedCategory,
        rating: this.selectedRating,
        title: titleInput?.value || '',
        content,
        userName: nameInput?.value || '',
        userEmail: emailInput?.value || '',
        pageUrl: window.location.pathname + window.location.search
      });

      this.showSuccessView();
    } catch (err) {
      console.error('Submit feedback failed:', err);
      alert('Không thể gửi góp ý: ' + err.message);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
          <span class="material-symbols-outlined text-[18px]">send</span>
          <span>Gửi góp ý</span>
        `;
      }
    } finally {
      this.isSubmitting = false;
    }
  }

  showSuccessView() {
    const formView = document.getElementById('bv-feedback-form-view');
    const successView = document.getElementById('bv-feedback-success-view');
    const submitBtn = document.getElementById('bv-feedback-submit-btn');

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <span class="material-symbols-outlined text-[18px]">send</span>
        <span>Gửi góp ý</span>
      `;
    }

    gsap.to(formView, {
      opacity: 0,
      y: -15,
      duration: 0.2,
      onComplete: () => {
        formView.hidden = true;
        successView.hidden = false;

        const tl = gsap.timeline({ defaults: { ease: 'back.out(2)' } });
        tl.fromTo(successView, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.3 })
          .fromTo('#bv-feedback-success-icon', 
            { scale: 0, rotate: -45 }, 
            { scale: 1, rotate: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' }, 
            '-=0.15'
          );

        // Auto close after 3 seconds
        setTimeout(() => {
          if (this.isOpen) this.close();
        }, 3000);
      }
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Auto mount singleton helper
let widgetInstance = null;
export function initFeedbackWidget(options = {}) {
  if (!widgetInstance) {
    widgetInstance = new FeedbackWidget(options);
  }
  return widgetInstance;
}

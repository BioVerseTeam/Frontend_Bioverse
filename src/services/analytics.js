/**
 * Unified Analytics Service for BioVerse
 * Bridges Google Analytics 4 (GA4) and PostHog (Product Analytics & Session Replay).
 *
 * Configured via environment variables:
 * - VITE_GA4_MEASUREMENT_ID: 'G-XXXXXXXXXX'
 * - VITE_POSTHOG_KEY: 'phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
 * - VITE_POSTHOG_HOST: 'https://us.i.posthog.com' (optional, defaults to US cloud)
 *
 * Designed to fail gracefully if keys are missing/unconfigured.
 */

import posthog from 'posthog-js';

class AnalyticsService {
  constructor() {
    this.initialized = false;
    this.ga4Enabled = false;
    this.posthogEnabled = false;
    this.currentUserId = null;
  }

  /**
   * Khởi tạo các dịch vụ Analytics (GA4 + PostHog)
   */
  init() {
    if (this.initialized) return;

    const ga4Id = (import.meta.env.VITE_GA4_MEASUREMENT_ID || '').trim();
    const posthogKey = (import.meta.env.VITE_POSTHOG_KEY || '').trim();
    const posthogHost = (import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com').trim();

    // 1. Khởi tạo PostHog
    if (posthogKey && !posthogKey.startsWith('phc_example')) {
      try {
        posthog.init(posthogKey, {
          api_host: posthogHost,
          autocapture: true, // Tự động bắt tương tác click, forms
          capture_pageview: true, // Bắt pageview tự động
          disable_session_recording: false, // Bật Session Replay xem học sinh tương tác 3D
          session_recording: {
            maskAllInputs: true, // Bảo mật thông tin input cá nhân/mật khẩu
            maskTextSelector: '.auth-sensitive',
          },
          person_profiles: 'identified_only',
          loaded: () => {
            if (import.meta.env.DEV) {
              console.log('[Analytics] PostHog SDK initialized successfully.');
            }
          },
        });
        this.posthogEnabled = true;
      } catch (err) {
        console.warn('[Analytics] Failed to initialize PostHog:', err);
      }
    } else if (import.meta.env.DEV) {
      console.info('[Analytics] PostHog is disabled (VITE_POSTHOG_KEY is not set).');
    }

    // 2. Khởi tạo Google Analytics 4 (GA4)
    if (ga4Id && ga4Id.startsWith('G-') && ga4Id !== 'G-XXXXXXXXXX') {
      try {
        this._loadGa4Script(ga4Id);
        this.ga4Enabled = true;
        if (import.meta.env.DEV) {
          console.log(`[Analytics] GA4 initialized with ID: ${ga4Id}`);
        }
      } catch (err) {
        console.warn('[Analytics] Failed to load GA4 script:', err);
      }
    } else if (import.meta.env.DEV) {
      console.info('[Analytics] GA4 is disabled (VITE_GA4_MEASUREMENT_ID is not set).');
    }

    this.initialized = true;
  }

  /**
   * Tải Google tag script (gtag.js) bất đồng bộ
   * @private
   */
  _loadGa4Script(measurementId) {
    if (document.getElementById('ga4-gtag-script')) return;

    const script = document.createElement('script');
    script.id = 'ga4-gtag-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;

    gtag('js', new Date());
    gtag('config', measurementId, {
      send_page_view: true,
      anonymize_ip: true,
    });
  }

  /**
   * Gửi sự kiện tùy biến (Custom Event)
   * @param {string} eventName Tên sự kiện (snake_case)
   * @param {Object} properties Thông tin đi kèm
   */
  track(eventName, properties = {}) {
    this._ensureInit();

    const payload = {
      ...properties,
      timestamp: new Date().toISOString(),
      path: window.location.pathname,
    };

    // PostHog
    if (this.posthogEnabled) {
      try {
        posthog.capture(eventName, payload);
      } catch (err) {
        console.warn(`[Analytics] PostHog track error for "${eventName}":`, err);
      }
    }

    // GA4
    if (this.ga4Enabled && window.gtag) {
      try {
        window.gtag('event', eventName, payload);
      } catch (err) {
        console.warn(`[Analytics] GA4 track error for "${eventName}":`, err);
      }
    }

    if (import.meta.env.DEV && (this.posthogEnabled || this.ga4Enabled)) {
      console.debug(`[Analytics Track] "${eventName}":`, payload);
    }
  }

  /**
   * Ghi nhận Pageview thủ công (hữu ích khi chuyển router hoặc dynamic views)
   * @param {string} pageTitle
   * @param {string} [pagePath]
   */
  pageView(pageTitle = document.title, pagePath = window.location.pathname) {
    this._ensureInit();

    if (this.posthogEnabled) {
      try {
        posthog.capture('$pageview', {
          $current_url: window.location.href,
          title: pageTitle,
          path: pagePath,
        });
      } catch (err) {
        console.warn('[Analytics] PostHog pageview error:', err);
      }
    }

    if (this.ga4Enabled && window.gtag) {
      try {
        window.gtag('event', 'page_view', {
          page_title: pageTitle,
          page_path: pagePath,
          page_location: window.location.href,
        });
      } catch (err) {
        console.warn('[Analytics] GA4 pageview error:', err);
      }
    }
  }

  /**
   * Định danh người dùng khi đăng nhập
   * @param {string|number} userId
   * @param {Object} traits Thuộc tính người dùng (email, fullName, role, grade...)
   */
  identify(userId, traits = {}) {
    if (!userId) return;
    this._ensureInit();

    const idStr = String(userId);
    this.currentUserId = idStr;

    // Filter out sensitive traits like passwords or raw tokens
    const safeTraits = { ...traits };
    delete safeTraits.password;
    delete safeTraits.accessToken;
    delete safeTraits.refreshToken;

    if (this.posthogEnabled) {
      try {
        posthog.identify(idStr, safeTraits);
      } catch (err) {
        console.warn('[Analytics] PostHog identify error:', err);
      }
    }

    if (this.ga4Enabled && window.gtag) {
      try {
        window.gtag('set', 'user_id', idStr);
        window.gtag('set', 'user_properties', safeTraits);
      } catch (err) {
        console.warn('[Analytics] GA4 identify error:', err);
      }
    }

    if (import.meta.env.DEV) {
      console.log(`[Analytics] Identified user ${idStr}:`, safeTraits);
    }
  }

  /**
   * Xóa danh tính khi đăng xuất
   */
  reset() {
    this.currentUserId = null;

    if (this.posthogEnabled) {
      try {
        posthog.reset();
      } catch (err) {
        console.warn('[Analytics] PostHog reset error:', err);
      }
    }

    if (this.ga4Enabled && window.gtag) {
      try {
        window.gtag('set', 'user_id', null);
      } catch (err) {
        console.warn('[Analytics] GA4 reset error:', err);
      }
    }
  }

  /* -------------------------------------------------------------
   * BioVerse Domain Specific Event Helpers
   * ----------------------------------------------------------- */

  /**
   * Theo dõi khi mở xem một mô hình 3D (Hộp sọ, Tim đập, Thực vật...)
   */
  trackModelView(modelId, modelName, category = 'biology') {
    this.track('view_3d_model', {
      model_id: modelId,
      model_name: modelName,
      category,
    });
  }

  /**
   * Theo dõi khi click bóc tách / tương tác với bộ phận 3D
   */
  trackModelInteraction(modelId, partName, action = 'inspect_part') {
    this.track('interact_3d_part', {
      model_id: modelId,
      part_name: partName,
      action,
    });
  }

  /**
   * Theo dõi bắt đầu làm bài trắc nghiệm
   */
  trackExamStart(examId, examTitle, questionCount = 0) {
    this.track('exam_started', {
      exam_id: examId,
      exam_title: examTitle,
      question_count: questionCount,
    });
  }

  /**
   * Theo dõi nộp bài trắc nghiệm
   */
  trackExamSubmit(examId, score, durationSeconds, passed = false) {
    this.track('exam_submitted', {
      exam_id: examId,
      score,
      duration_seconds: durationSeconds,
      passed,
    });
  }

  /**
   * Theo dõi sự kiện Đăng nhập
   */
  trackLogin(method = 'password', role = 'STUDENT') {
    this.track('login_success', {
      method,
      role,
    });
  }

  /**
   * Theo dõi sự kiện Đăng ký
   */
  trackRegister(grade = 8) {
    this.track('signup_success', {
      grade,
    });
  }

  _ensureInit() {
    if (!this.initialized) {
      this.init();
    }
  }
}

export const analytics = new AnalyticsService();

// Tự động khởi tạo ngay khi service được load trên trình duyệt
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => analytics.init());
  } else {
    analytics.init();
  }
}

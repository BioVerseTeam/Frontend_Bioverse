import { getPublicPlans, getMySubscription, createCheckout, getPaymentStatus } from '../api/subscriptionApi.js';
import { AuthService } from '../features/auth/authService.js';
import { alertModal, confirmModal, showToast } from '../components/modal.js';

const FALLBACK_PLANS = [
  {
    id: 1,
    name: 'Gói Tháng',
    slug: 'monthly',
    description: 'Truy cập đầy đủ nội dung trong 30 ngày',
    durationDays: 30,
    price: 2000,
    originalPrice: 49000,
    discountPercentage: 96,
    features: ['Lý thuyết 3D', 'Bài tập & đề thi', 'Chat AI', 'Học trên mọi thiết bị'],
    status: 'ACTIVE',
    sortOrder: 1
  },
  {
    id: 2,
    name: 'Gói Quý',
    slug: 'quarterly',
    description: 'Tiết kiệm hơn khi học theo học kỳ',
    durationDays: 90,
    price: 129000,
    originalPrice: 237000,
    discountPercentage: 46,
    features: ['Lý thuyết 3D', 'Bài tập & đề thi', 'Chat AI', 'Ưu tiên hỗ trợ', 'Mở khoá toàn bộ Lab'],
    status: 'ACTIVE',
    sortOrder: 2
  },
  {
    id: 3,
    name: 'Gói Năm',
    slug: 'yearly',
    description: 'Học cả năm với mức giá tốt nhất',
    durationDays: 365,
    price: 399000,
    originalPrice: 948000,
    discountPercentage: 58,
    features: ['Lý thuyết 3D', 'Bài tập & đề thi', 'Chat AI', 'Ưu tiên hỗ trợ', 'Mọi tính năng mới sớm nhất'],
    status: 'ACTIVE',
    sortOrder: 3
  }
];

function formatVND(amount) {
  if (amount == null) return '0đ';
  return Number(amount).toLocaleString('vi-VN') + 'đ';
}

async function initNavbar() {
  const nameEl = document.getElementById('header-user-name');
  const badgeEl = document.getElementById('header-user-badge');
  const loginBtn = document.getElementById('header-login-btn');

  const user = AuthService.getUser();
  if (!user) {
    if (nameEl) nameEl.textContent = 'Khách thăm';
    if (badgeEl) {
      badgeEl.textContent = 'Trải nghiệm Free';
      badgeEl.className = 'font-label-sm text-[11px] px-2 py-0.5 rounded-full border border-[#2d2d2d] bg-[#f9f7f2] font-bold text-gray-700';
    }
    if (loginBtn) {
      loginBtn.hidden = false;
      loginBtn.href = '/login?next=/pricing';
    }
    return;
  }

  if (nameEl) nameEl.textContent = user.fullName || user.email;
  if (loginBtn) {
    loginBtn.textContent = 'Trang cá nhân';
    loginBtn.href = '/?view=student';
  }

  try {
    const subStatus = await getMySubscription();
    if (badgeEl) {
      if (subStatus?.isPremium && !subStatus?.isFreeAccessMode) {
        badgeEl.textContent = `Premium (${subStatus.daysRemaining || 0} ngày)`;
        badgeEl.className = 'font-label-sm text-[11px] px-2 py-0.5 rounded-full border border-[#2d2d2d] bg-[#2e7d32] text-white font-bold';
      } else {
        badgeEl.textContent = 'Free Access Toàn bộ';
        badgeEl.className = 'font-label-sm text-[11px] px-2 py-0.5 rounded-full border border-[#2d2d2d] bg-[#e8f5e9] text-[#2e7d32] font-bold';
      }
    }
  } catch (err) {
    console.warn('Could not load subscription status:', err);
  }
}

async function loadPlans() {
  const container = document.getElementById('plans-grid');
  if (!container) return;

  let plans = [];
  try {
    const res = await getPublicPlans();
    if (Array.isArray(res) && res.length > 0) {
      plans = res;
    } else {
      plans = FALLBACK_PLANS;
    }
  } catch (e) {
    console.warn('Could not fetch public plans, using fallback:', e);
    plans = FALLBACK_PLANS;
  }

  container.innerHTML = plans.map((plan, index) => {
    const isPopular = plan.slug === 'quarterly' || index === 1;
    const features = Array.isArray(plan.features) ? plan.features : [];

    return `
      <div class="relative flex flex-col justify-between bg-white border-[2.5px] border-[#2d2d2d] rounded-2xl p-6 md:p-8 sketch-shadow transition-transform hover:-translate-y-1.5 ${isPopular ? 'ring-4 ring-primary ring-offset-2' : ''}">
        ${isPopular ? `
          <div class="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-white font-['Space_Grotesk'] text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full border-2 border-[#2d2d2d] sketch-shadow-sm">
            Phổ biến nhất
          </div>
        ` : ''}

        <div>
          <div class="flex items-center justify-between gap-2 mb-2">
            <h3 class="font-['Epilogue'] text-2xl font-black text-[#1b1c1c]">${plan.name}</h3>
            ${plan.discountPercentage ? `
              <span class="text-xs font-bold text-[#b71422] bg-[#ffdad6] border border-[#b71422] px-2 py-0.5 rounded-md">
                -${plan.discountPercentage}%
              </span>
            ` : ''}
          </div>
          <p class="font-['Be_Vietnam_Pro'] text-xs text-[#5b403e] min-h-[32px]">${plan.description || 'Gói học tập BioVerse STEM'}</p>

          <div class="my-6">
            <div class="flex items-baseline gap-2">
              <span class="font-['Epilogue'] text-4xl font-extrabold text-[#1b1c1c]">${formatVND(plan.price)}</span>
              <span class="text-xs text-[#76716a]">/ ${plan.durationDays} ngày</span>
            </div>
            ${plan.originalPrice && Number(plan.originalPrice) > Number(plan.price) ? `
              <p class="text-xs text-[#76716a] line-through mt-1">Giá gốc: ${formatVND(plan.originalPrice)}</p>
            ` : ''}
          </div>

          <div class="border-t border-dashed border-[#2d2d2d] pt-4 mb-6">
            <p class="font-['Space_Grotesk'] text-xs font-bold text-[#1b1c1c] uppercase tracking-wide mb-3">Quyền lợi gói:</p>
            <ul class="flex flex-col gap-2.5 text-xs text-[#2d2d2d]">
              ${features.map(f => `
                <li class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-[18px] text-[#2e7d32]">check_circle</span>
                  <span>${f}</span>
                </li>
              `).join('')}
            </ul>
          </div>
        </div>

        <button
          type="button"
          data-plan-id="${plan.id}"
          class="checkout-btn w-full neo-btn ${isPopular ? 'neo-btn-primary' : 'neo-btn-secondary'} rounded-xl py-3 font-bold text-sm flex items-center justify-center gap-2"
        >
          <span class="material-symbols-outlined text-[18px]">shopping_bag</span>
          <span>Mua gói</span>
        </button>
      </div>
    `;
  }).join('');

  bindCheckoutButtons();
}

let activePaymentBackdrop = null;
let paymentPollTimer = null;
let paymentPollCount = 0;
let isPaymentModalGuarded = false;

async function confirmLeavePayment(orderCode) {
  return await confirmModal(
    `Đơn thanh toán <strong>#${orderCode}</strong> đang trong quá trình chờ xử lý.<br><br>Nếu bạn đã chuyển khoản trên app ngân hàng hoặc cổng PayOS, hệ thống sẽ tự động kích hoạt gói cước trong giây lát.<br><br>Bạn có chắc chắn muốn quay về không?`,
    'Xác nhận quay về',
    {
      confirmText: 'Đồng ý quay về',
      cancelText: 'Ở lại thanh toán',
      washiTag: 'GIAO DỊCH ĐANG CHỜ',
      icon: 'help'
    }
  );
}

function closePaymentModal() {
  if (paymentPollTimer) {
    clearTimeout(paymentPollTimer);
    paymentPollTimer = null;
  }
  isPaymentModalGuarded = false;
  if (activePaymentBackdrop) {
    activePaymentBackdrop.classList.remove('is-active');
    setTimeout(() => {
      activePaymentBackdrop?.remove();
      activePaymentBackdrop = null;
    }, 250);
  }
  resetCheckoutButtons();
}

function openPaymentModal(checkout) {
  if (activePaymentBackdrop) {
    activePaymentBackdrop.remove();
  }

  isPaymentModalGuarded = true;
  paymentPollCount = 0;

  const backdrop = document.createElement('div');
  backdrop.id = 'inapp-payment-backdrop';
  backdrop.className = 'bv-modal-backdrop is-active';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');

  backdrop.innerHTML = `
    <div class="bv-modal-dialog max-w-lg text-center" style="max-width: 480px;">
      <!-- Washi tape -->
      <div class="bv-modal-washi-tape">
        <span class="material-symbols-outlined text-[13px]">bookmark</span>
        <span>GIAO DỊCH ĐANG CHỜ</span>
      </div>

      <!-- Close button (X) -->
      <button type="button" class="bv-modal-close-btn" id="inapp-payment-close" aria-label="Đóng">
        <span class="material-symbols-outlined text-[18px]">close</span>
      </button>

      <!-- Badge Icon -->
      <div class="w-14 h-14 mx-auto rounded-full bg-[#fff8e1] border-2 border-[#f57f17] text-[#f57f17] flex items-center justify-center mb-3 sketch-shadow-sm">
        <span class="material-symbols-outlined text-[28px] animate-spin">hourglass_empty</span>
      </div>

      <!-- Title -->
      <div class="mb-4">
        <span class="font-['Space_Grotesk'] text-[11px] font-bold text-[#f57f17] uppercase tracking-widest px-2.5 py-0.5 bg-[#fff8e1] rounded-full border border-[#f57f17]">
          ĐANG CHỜ THANH TOÁN
        </span>
        <h3 class="font-['Epilogue'] text-2xl font-black text-[#1b1c1c] mt-2">Đang xử lý đơn #${checkout.orderCode}</h3>
        <p class="font-['Be_Vietnam_Pro'] text-xs text-[#5b403e] mt-1">
          Vui lòng mở cổng PayOS để quét mã VietQR hoặc chuyển khoản trực tuyến.
        </p>
      </div>

      <!-- Card detail -->
      <div class="w-full bg-[#f9f7f2] border-2 border-[#2d2d2d] rounded-xl p-4 text-left text-xs flex flex-col gap-2.5 mb-5 sketch-shadow-sm">
        <div class="flex justify-between items-center">
          <span class="text-[#76716a]">Gói cước:</span>
          <span class="font-bold text-[#1b1c1c]">${checkout.planName || 'BioVerse STEM'}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-[#76716a]">Số tiền thanh toán:</span>
          <span class="font-bold text-[#b71422] text-sm">${formatVND(checkout.amount)}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-[#76716a]">Mã đơn hàng:</span>
          <span class="font-mono font-bold text-[#1b1c1c]">#${checkout.orderCode}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-[#76716a]">Nội dung chuyển khoản:</span>
          <span class="font-mono font-bold text-[#1b1c1c] bg-white px-2 py-0.5 rounded border border-[#2d2d2d]">${checkout.description || ''}</span>
        </div>
      </div>

      <!-- Realtime waiting indicator -->
      <div class="flex items-center justify-center gap-2 p-2.5 bg-[#e8f5e9] border border-[#2e7d32] rounded-xl mb-5 text-xs text-[#2e7d32] font-semibold">
        <span class="w-2 h-2 rounded-full bg-[#2e7d32] animate-ping"></span>
        <span>Hệ thống tự động kích hoạt ngay khi nhận được tiền</span>
      </div>

      <!-- Actions -->
      <div class="flex flex-col gap-2.5 w-full">
        ${checkout.checkoutUrl ? `
          <a
            href="${checkout.checkoutUrl}"
            target="_blank"
            id="inapp-open-payos-btn"
            class="neo-btn neo-btn-primary rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2"
          >
            <span class="material-symbols-outlined text-[18px]">open_in_new</span>
            <span>Mở trang thanh toán PayOS</span>
          </a>
        ` : ''}

        <div class="flex gap-2 w-full">
          <a
            href="/checkout?orderCode=${checkout.orderCode}"
            class="flex-1 neo-btn neo-btn-secondary rounded-xl py-2.5 text-xs font-bold text-[#1b1c1c] flex items-center justify-center gap-1.5"
          >
            <span class="material-symbols-outlined text-[16px]">receipt_long</span>
            <span>Chi tiết đơn</span>
          </a>
          <button
            type="button"
            id="inapp-payment-cancel-btn"
            class="flex-1 neo-btn neo-btn-secondary rounded-xl py-2.5 text-xs font-bold text-[#5b403e] flex items-center justify-center gap-1.5"
          >
            <span class="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Quay về</span>
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);
  activePaymentBackdrop = backdrop;

  // Bắt nút [X] đóng modal
  const closeBtn = backdrop.querySelector('#inapp-payment-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', async () => {
      const ok = await confirmLeavePayment(checkout.orderCode);
      if (ok) {
        closePaymentModal();
      }
    });
  }

  // Bắt nút "Quay về"
  const cancelBtn = backdrop.querySelector('#inapp-payment-cancel-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', async () => {
      const ok = await confirmLeavePayment(checkout.orderCode);
      if (ok) {
        closePaymentModal();
      }
    });
  }

  // Bắt click ra ngoài vùng backdrop
  backdrop.addEventListener('click', async (e) => {
    if (e.target === backdrop) {
      const ok = await confirmLeavePayment(checkout.orderCode);
      if (ok) {
        closePaymentModal();
      }
    }
  });

  // Bắt phím Escape
  const escHandler = async (e) => {
    if (e.key === 'Escape' && isPaymentModalGuarded) {
      e.preventDefault();
      const ok = await confirmLeavePayment(checkout.orderCode);
      if (ok) {
        window.removeEventListener('keydown', escHandler);
        closePaymentModal();
      }
    }
  };
  window.addEventListener('keydown', escHandler);

  // Đẩy history state để bắt nút Back của trình duyệt khi modal đang mở
  try {
    history.pushState({ page: 'payment-modal' }, '', window.location.href);
  } catch (e) {
    console.warn('Could not pushState:', e);
  }

  const popstateHandler = async () => {
    if (isPaymentModalGuarded) {
      try {
        history.pushState({ page: 'payment-modal' }, '', window.location.href);
      } catch (e) {}
      const ok = await confirmLeavePayment(checkout.orderCode);
      if (ok) {
        window.removeEventListener('popstate', popstateHandler);
        closePaymentModal();
      }
    }
  };
  window.addEventListener('popstate', popstateHandler);

  // Bắt đầu lắng nghe trạng thái thanh toán realtime
  pollPaymentStatus(checkout.orderCode, backdrop);
}

async function pollPaymentStatus(orderCode, backdrop) {
  if (!isPaymentModalGuarded || !backdrop) return;
  paymentPollCount++;

  try {
    const payment = await getPaymentStatus(orderCode);
    if (payment.status === 'PAID') {
      isPaymentModalGuarded = false;
      renderPaymentSuccessInModal(backdrop, payment);
      return;
    }
  } catch (err) {
    console.warn('Poll payment status error:', err);
  }

  if (paymentPollCount < 48 && isPaymentModalGuarded) { // 48 * 2.5s = 120s
    paymentPollTimer = setTimeout(() => pollPaymentStatus(orderCode, backdrop), 2500);
  }
}

function renderPaymentSuccessInModal(backdrop, payment) {
  if (!backdrop) return;
  const dialog = backdrop.querySelector('.bv-modal-dialog');
  if (!dialog) return;

  dialog.innerHTML = `
    <!-- Washi tape -->
    <div class="bv-modal-washi-tape">
      <span class="material-symbols-outlined text-[13px]">verified</span>
      <span>THANH TOÁN THÀNH CÔNG</span>
    </div>

    <!-- Badge Icon -->
    <div class="w-16 h-16 mx-auto rounded-full bg-[#e8f5e9] border-2 border-[#2e7d32] text-[#2e7d32] flex items-center justify-center mb-3 sketch-shadow-sm">
      <span class="material-symbols-outlined text-[36px]">task_alt</span>
    </div>

    <!-- Title -->
    <div class="mb-4">
      <span class="font-['Space_Grotesk'] text-[11px] font-bold text-[#2e7d32] uppercase tracking-widest px-3 py-1 bg-[#e8f5e9] rounded-full border border-[#2e7d32]">
        KÍCH HOẠT THÀNH CÔNG
      </span>
      <h3 class="font-['Epilogue'] text-2xl font-black text-[#1b1c1c] mt-2">Cảm ơn bạn đã đăng ký!</h3>
      <p class="font-['Be_Vietnam_Pro'] text-xs text-[#5b403e] mt-1">
        Gói cước <strong>${payment.planName || 'BioVerse'}</strong> đã được kích hoạt trên tài khoản của bạn.
      </p>
    </div>

    <!-- Card detail -->
    <div class="w-full bg-[#f9f7f2] border-2 border-[#2d2d2d] rounded-xl p-4 text-left text-xs flex flex-col gap-2 mb-5 sketch-shadow-sm">
      <div class="flex justify-between">
        <span class="text-[#76716a]">Mã đơn hàng:</span>
        <span class="font-bold text-[#1b1c1c]">#${payment.orderCode}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-[#76716a]">Số tiền thanh toán:</span>
        <span class="font-bold text-[#2e7d32]">${formatVND(payment.amount)}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-[#76716a]">Phương thức:</span>
        <span class="font-medium text-[#1b1c1c]">Cổng PayOS / VietQR</span>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex flex-col gap-2.5 w-full">
      <a href="/sinh-hoc" class="neo-btn neo-btn-primary rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2">
        <span class="material-symbols-outlined text-[18px]">view_in_ar</span>
        <span>Khám phá Mô hình 3D ngay</span>
      </a>
      <a href="/checkout?orderCode=${payment.orderCode}" class="neo-btn neo-btn-secondary rounded-xl py-2.5 text-xs font-bold text-[#5b403e] flex items-center justify-center gap-1.5">
        <span class="material-symbols-outlined text-[16px]">receipt_long</span>
        <span>Xem hóa đơn giao dịch</span>
      </a>
    </div>
  `;

  showToast('Thanh toán thành công! Gói cước đã được kích hoạt.', 'success');
  initNavbar();
}

function resetCheckoutButtons() {
  document.querySelectorAll('.checkout-btn').forEach(btn => {
    btn.disabled = false;
    btn.innerHTML = `
      <span class="material-symbols-outlined text-[18px]">shopping_bag</span>
      <span>Mua gói</span>
    `;
  });
}

function bindCheckoutButtons() {
  document.querySelectorAll('.checkout-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const planId = btn.dataset.planId;
      if (!planId) return;

      const user = AuthService.getUser();
      if (!user) {
        window.location.href = `/login?next=${encodeURIComponent('/pricing')}`;
        return;
      }

      btn.disabled = true;
      const originalText = btn.innerHTML;
      btn.innerHTML = `
        <span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
        <span>Đang kết nối...</span>
      `;

      try {
        const checkout = await createCheckout({ planId: Number(planId) });
        resetCheckoutButtons();
        if (checkout?.orderCode) {
          openPaymentModal(checkout);
        } else {
          throw new Error('Không nhận được link thanh toán từ máy chủ.');
        }
      } catch (err) {
        console.error('Checkout error:', err);
        await alertModal(err.message || 'Không thể tạo đơn thanh toán. Vui lòng thử lại sau ít phút.', 'Thông báo', 'error');
        resetCheckoutButtons();
      }
    });
  });
}

// Khôi phục trạng thái nút bấm khi người dùng quay lại trang bằng nút Back (BfCache) hoặc chuyển tab
window.addEventListener('pageshow', () => {
  resetCheckoutButtons();
});
window.addEventListener('focus', () => {
  resetCheckoutButtons();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    resetCheckoutButtons();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  loadPlans();
});

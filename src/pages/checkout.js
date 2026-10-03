import { getPaymentStatus, cancelPayment } from '../api/subscriptionApi.js';
import { AuthService } from '../features/auth/authService.js';
import { confirmModal } from '../components/modal.js';

function formatVND(amount) {
  if (amount == null) return '0đ';
  return Number(amount).toLocaleString('vi-VN') + 'đ';
}

function formatDate(dtStr) {
  if (!dtStr) return '—';
  try {
    const d = new Date(dtStr);
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dtStr;
  }
}

let pollTimer = null;
let pollCount = 0;
const MAX_POLLS = 40; // 40 * 2.5s = 100s
let currentPayment = null;
let isGuardActive = false;

async function confirmLeaveCheckout() {
  if (!currentPayment || currentPayment.status !== 'PENDING') {
    return true;
  }
  return await confirmModal(
    `Đơn thanh toán <strong>#${currentPayment.orderCode}</strong> đang trong quá trình chờ xử lý.<br><br>Nếu bạn đã chuyển khoản trên app ngân hàng hoặc cổng PayOS, hệ thống sẽ tự động cập nhật ngay khi nhận được tiền.<br><br>Bạn có chắc chắn muốn quay về không?`,
    'Xác nhận quay về',
    {
      confirmText: 'Đồng ý quay về',
      cancelText: 'Ở lại thanh toán',
      washiTag: 'GIAO DỊCH ĐANG CHỜ',
      icon: 'help'
    }
  );
}

function setupNavigationGuard() {
  if (isGuardActive) return;
  isGuardActive = true;

  // Bắt sự kiện click nút quay lại trên header
  const backBtn = document.getElementById('back-to-pricing-btn');
  if (backBtn) {
    backBtn.addEventListener('click', async (e) => {
      if (currentPayment?.status === 'PENDING') {
        e.preventDefault();
        const ok = await confirmLeaveCheckout();
        if (ok) {
          isGuardActive = false;
          window.location.href = '/pricing';
        }
      }
    });
  }

  // Đẩy 1 trạng thái history để bắt nút Back của trình duyệt
  try {
    history.pushState({ page: 'checkout-guard' }, '', window.location.href);
  } catch (err) {
    console.warn('Could not push history state:', err);
  }

  window.addEventListener('popstate', async () => {
    if (isGuardActive && currentPayment?.status === 'PENDING') {
      try {
        history.pushState({ page: 'checkout-guard' }, '', window.location.href);
      } catch (err) {
        console.warn('Could not push history state:', err);
      }
      const ok = await confirmLeaveCheckout();
      if (ok) {
        isGuardActive = false;
        window.location.href = '/pricing';
      }
    }
  });

  // Cảnh báo người dùng khi reload hoặc đóng tab
  window.addEventListener('beforeunload', (e) => {
    if (isGuardActive && currentPayment?.status === 'PENDING') {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}

async function initCheckout() {
  const card = document.getElementById('checkout-card');
  const params = new URLSearchParams(window.location.search);
  const orderCode = params.get('orderCode');

  if (!orderCode) {
    if (card) {
      card.innerHTML = `
        <span class="material-symbols-outlined text-[48px] text-[#b71422] mb-3">error</span>
        <h1 class="font-['Epilogue'] text-2xl font-bold mb-2">Không tìm thấy mã đơn</h1>
        <p class="font-['Be_Vietnam_Pro'] text-sm text-[#5b403e] mb-6">Đường dẫn không hợp lệ hoặc thiếu mã đơn hàng.</p>
        <a href="/pricing" class="neo-btn neo-btn-primary rounded-xl px-5 py-2.5 text-sm font-bold">Xem bảng giá</a>
      `;
    }
    return;
  }

  const user = AuthService.getUser();
  if (!user) {
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    return;
  }

  await checkStatus(orderCode);
}

async function checkStatus(orderCode) {
  const card = document.getElementById('checkout-card');
  pollCount++;

  try {
    const payment = await getPaymentStatus(orderCode);
    currentPayment = payment;
    renderPaymentCard(card, payment);

    if (payment.status === 'PENDING') {
      setupNavigationGuard();
      if (pollCount < MAX_POLLS) {
        pollTimer = setTimeout(() => checkStatus(orderCode), 2500);
      }
    } else {
      isGuardActive = false;
    }
  } catch (err) {
    console.error('Error fetching payment status:', err);
    if (card) {
      card.innerHTML = `
        <span class="material-symbols-outlined text-[48px] text-[#b71422] mb-3">warning</span>
        <h1 class="font-['Epilogue'] text-2xl font-bold mb-2">Lỗi kiểm tra giao dịch</h1>
        <p class="font-['Be_Vietnam_Pro'] text-sm text-[#5b403e] mb-6">${err.message || 'Không thể lấy thông tin đơn hàng.'}</p>
        <a href="/pricing" class="neo-btn neo-btn-secondary rounded-xl px-5 py-2.5 text-sm font-bold">Quay lại Bảng giá</a>
      `;
    }
  }
}

function renderPaymentCard(card, payment) {
  if (!card || !payment) return;

  const status = payment.status;

  if (status === 'PAID') {
    isGuardActive = false;
    if (pollTimer) clearTimeout(pollTimer);
    card.innerHTML = `
      <div class="w-16 h-16 rounded-full bg-[#e8f5e9] border-2 border-[#2e7d32] text-[#2e7d32] flex items-center justify-center mb-4 sketch-shadow-sm">
        <span class="material-symbols-outlined text-[36px]">verified</span>
      </div>
      <span class="font-['Space_Grotesk'] text-xs font-bold text-[#2e7d32] uppercase tracking-widest px-3 py-1 bg-[#e8f5e9] rounded-full border border-[#2e7d32] mb-2">
        Thanh toán thành công
      </span>
      <h1 class="font-['Epilogue'] text-3xl font-black text-[#1b1c1c] mb-2">Cảm ơn bạn đã đồng hành!</h1>
      <p class="font-['Be_Vietnam_Pro'] text-sm text-[#5b403e] max-w-md mb-6">
        Gói cước <strong>${payment.planName || 'BioVerse Premium'}</strong> đã được kích hoạt thành công trên tài khoản của bạn.
      </p>

      <div class="w-full bg-[#f9f7f2] border-2 border-[#2d2d2d] rounded-xl p-4 text-left text-xs flex flex-col gap-2 mb-6">
        <div class="flex justify-between">
          <span class="text-[#76716a]">Mã giao dịch:</span>
          <span class="font-bold text-[#1b1c1c]">#${payment.orderCode}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-[#76716a]">Số tiền thanh toán:</span>
          <span class="font-bold text-[#2e7d32]">${formatVND(payment.amount)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-[#76716a]">Thời gian thanh toán:</span>
          <span class="font-medium text-[#1b1c1c]">${formatDate(payment.paidAt || payment.updatedAt)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-[#76716a]">Phương thức:</span>
          <span class="font-medium text-[#1b1c1c]">Cổng PayOS / VietQR</span>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row gap-3 w-full">
        <a href="/" class="flex-1 neo-btn neo-btn-primary rounded-xl py-3 text-sm font-bold text-center">
          Về Trang Chủ Sổ Tay
        </a>
        <a href="/sinh-hoc" class="flex-1 neo-btn neo-btn-secondary rounded-xl py-3 text-sm font-bold text-center">
          Khám Phá Mô Hình 3D
        </a>
      </div>
    `;
    return;
  }

  if (status === 'PENDING') {
    card.innerHTML = `
      <div class="w-16 h-16 rounded-full bg-[#fff8e1] border-2 border-[#f57f17] text-[#f57f17] flex items-center justify-center mb-4 sketch-shadow-sm">
        <span class="material-symbols-outlined text-[36px] animate-spin">hourglass_empty</span>
      </div>
      <span class="font-['Space_Grotesk'] text-xs font-bold text-[#f57f17] uppercase tracking-widest px-3 py-1 bg-[#fff8e1] rounded-full border border-[#f57f17] mb-2">
        Đang chờ thanh toán
      </span>
      <h1 class="font-['Epilogue'] text-2xl font-black text-[#1b1c1c] mb-2">Đang xử lý đơn #${payment.orderCode}</h1>
      <p class="font-['Be_Vietnam_Pro'] text-sm text-[#5b403e] max-w-md mb-6">
        Vui lòng quét mã QR hoặc hoàn tất thanh toán trên cổng PayOS. Hệ thống sẽ tự động cập nhật ngay khi nhận được tiền.
      </p>

      <div class="w-full bg-[#f9f7f2] border-2 border-[#2d2d2d] rounded-xl p-4 text-left text-xs flex flex-col gap-2 mb-6">
        <div class="flex justify-between">
          <span class="text-[#76716a]">Gói cước:</span>
          <span class="font-bold text-[#1b1c1c]">${payment.planName || 'BioVerse Plan'}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-[#76716a]">Số tiền cần thanh toán:</span>
          <span class="font-bold text-primary text-sm">${formatVND(payment.amount)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-[#76716a]">Nội dung chuyển khoản:</span>
          <span class="font-mono font-bold text-[#1b1c1c]">${payment.description || ''}</span>
        </div>
      </div>

      <div class="flex flex-col gap-3 w-full">
        ${payment.payosPaymentLink ? `
          <a href="${payment.payosPaymentLink}" target="_blank" class="neo-btn neo-btn-primary rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2">
            <span class="material-symbols-outlined text-[18px]">open_in_new</span>
            <span>Mở trang thanh toán PayOS</span>
          </a>
        ` : ''}

        <button id="cancel-payment-btn" data-order="${payment.orderCode}" class="neo-btn neo-btn-secondary rounded-xl py-2.5 text-xs font-bold text-[#5b403e]">
          Hủy giao dịch này
        </button>
      </div>
    `;

    const cancelBtn = document.getElementById('cancel-payment-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', async () => {
        const ok = await confirmModal('Bạn có chắc chắn muốn hủy đơn thanh toán này không?', 'Xác nhận hủy');
        if (!ok) return;
        try {
          cancelBtn.disabled = true;
          cancelBtn.textContent = 'Đang hủy...';
          await cancelPayment(payment.orderCode);
          if (pollTimer) clearTimeout(pollTimer);
          checkStatus(payment.orderCode);
        } catch (e) {
          alert('Không thể hủy đơn: ' + e.message);
          cancelBtn.disabled = false;
        }
      });
    }
    return;
  }

  if (status === 'CANCELLED') {
    isGuardActive = false;
    if (pollTimer) clearTimeout(pollTimer);
    card.innerHTML = `
      <div class="w-16 h-16 rounded-full bg-[#f5f5f5] border-2 border-[#76716a] text-[#76716a] flex items-center justify-center mb-4">
        <span class="material-symbols-outlined text-[36px]">block</span>
      </div>
      <h1 class="font-['Epilogue'] text-2xl font-bold mb-2">Đơn hàng đã được hủy</h1>
      <p class="font-['Be_Vietnam_Pro'] text-sm text-[#5b403e] mb-6">Giao dịch #${payment.orderCode} đã kết thúc mà không phát sinh cước.</p>
      <a href="/pricing" class="neo-btn neo-btn-primary rounded-xl px-6 py-2.5 text-sm font-bold">Chọn gói khác</a>
    `;
    return;
  }

  if (status === 'FAILED') {
    isGuardActive = false;
    if (pollTimer) clearTimeout(pollTimer);
    card.innerHTML = `
      <div class="w-16 h-16 rounded-full bg-[#ffdad6] border-2 border-[#b71422] text-[#b71422] flex items-center justify-center mb-4">
        <span class="material-symbols-outlined text-[36px]">error</span>
      </div>
      <h1 class="font-['Epilogue'] text-2xl font-bold mb-2">Thanh toán không thành công</h1>
      <p class="font-['Be_Vietnam_Pro'] text-sm text-[#5b403e] mb-2">${payment.failedReason || 'Giao dịch bị từ chối hoặc lỗi xử lý.'}</p>
      <p class="text-xs text-[#76716a] mb-6">Mã giao dịch: #${payment.orderCode}</p>
      <a href="/pricing" class="neo-btn neo-btn-primary rounded-xl px-6 py-2.5 text-sm font-bold">Thử lại với gói cước</a>
    `;
  }
}

document.addEventListener('DOMContentLoaded', initCheckout);

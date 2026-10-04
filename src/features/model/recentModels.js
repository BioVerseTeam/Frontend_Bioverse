/**
 * Recent Models Tracker Service for BioVerse
 * Manages recently viewed 3D models in localStorage with real-time events.
 */

const RECENT_MODELS_KEY = 'bioverse_recent_models';
const MAX_RECENT_MODELS = 10;

/**
 * Lấy danh sách các mô hình 3D đã xem gần đây
 * @returns {Array<Object>}
 */
export function getRecentModels() {
  try {
    const raw = localStorage.getItem(RECENT_MODELS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    console.warn('Lỗi đọc lịch sử mô hình:', e);
    return [];
  }
}

/**
 * Ghi nhận một mô hình 3D vừa được xem
 * @param {Object} model
 */
export function recordViewedModel(model) {
  if (!model || (!model.id && !model.slug)) return;

  try {
    const current = getRecentModels();
    const modelId = model.id ? String(model.id) : String(model.slug);

    // Lọc bỏ nếu đã có để đưa lên đầu danh sách
    const filtered = current.filter((item) => {
      const itemId = item.id ? String(item.id) : String(item.slug);
      return itemId !== modelId;
    });

    const entry = {
      id: model.id,
      slug: model.slug || null,
      name: model.name || 'Mô hình 3D',
      category: model.category || 'Sinh học',
      grade: model.grade || null,
      thumbnailUrl: model.thumbnailUrl || null,
      description: model.description || '',
      badgeText: model.badgeText || '3D',
      actionIcon: model.actionIcon || '3d_rotation',
      actionText: model.actionText || 'Xem lại',
      viewedAt: new Date().toISOString()
    };

    filtered.unshift(entry);
    const updated = filtered.slice(0, MAX_RECENT_MODELS);
    localStorage.setItem(RECENT_MODELS_KEY, JSON.stringify(updated));

    // Bắn sự kiện cập nhật để các component khác đồng bộ ngay
    window.dispatchEvent(new CustomEvent('bioverse_recent_models_updated', {
      detail: updated
    }));

    return updated;
  } catch (e) {
    console.warn('Lỗi lưu lịch sử mô hình:', e);
    return [];
  }
}

/**
 * Xóa một mô hình cụ thể khỏi danh sách đã xem
 * @param {string|number} modelId
 */
export function removeRecentModel(modelId) {
  try {
    const current = getRecentModels();
    const filtered = current.filter((item) => {
      const id = item.id ? String(item.id) : String(item.slug);
      return id !== String(modelId);
    });
    localStorage.setItem(RECENT_MODELS_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('bioverse_recent_models_updated', {
      detail: filtered
    }));
    return filtered;
  } catch (e) {
    console.warn('Lỗi xóa mô hình khỏi lịch sử:', e);
    return [];
  }
}

/**
 * Xóa toàn bộ lịch sử mô hình đã xem
 */
export function clearRecentModels() {
  try {
    localStorage.removeItem(RECENT_MODELS_KEY);
    window.dispatchEvent(new CustomEvent('bioverse_recent_models_updated', {
      detail: []
    }));
  } catch (e) {
    console.warn('Lỗi xóa lịch sử:', e);
  }
}

/**
 * Định dạng thời gian xem tương đối tiếng Việt
 * @param {string} isoString
 * @returns {string}
 */
export function formatTimeAgoVi(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Vừa xem xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHour < 24) return `${diffHour} giờ trước`;
  if (diffDay === 1) return 'Hôm qua';
  if (diffDay < 7) return `${diffDay} ngày trước`;

  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Public Bio Model API — catalog for students and guests.
 * GET /api/models/catalog, /featured, /categories, /detail/:id, /slug/:slug
 */

const API_BASE = '/api/models';

async function parseApiResponse(response) {
  let json;
  try {
    json = await response.json();
  } catch {
    if (!response.ok) {
      throw new Error(`Lỗi kết nối máy chủ (${response.status})`);
    }
    return null;
  }

  if (json && typeof json.code === 'number') {
    if (json.code === 1000) {
      return json.data;
    }
    throw new Error(json.message || 'Thao tác không thành công');
  }

  if (!response.ok) {
    throw new Error(json?.message || `Yêu cầu thất bại (${response.status})`);
  }

  return json?.data !== undefined ? json.data : json;
}

async function request(path) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`);
  } catch {
    throw new Error('Không thể kết nối máy chủ backend. Hãy kiểm tra dịch vụ rồi thử lại.');
  }
  return parseApiResponse(response);
}

/**
 * @param {{ grade?: number|null, category?: string|null, subject?: string, q?: string|null, page?: number, size?: number }} filters
 * @returns {Promise<{ items: Array, totalElements: number, totalPages: number, page: number, size: number }>}
 */
export async function getCatalog({
  grade = null,
  category = null,
  subject = 'BIOLOGY',
  q = null,
  page = 0,
  size = 12
} = {}) {
  const params = new URLSearchParams();
  if (grade != null && grade !== '') params.set('grade', String(grade));
  if (category) params.set('category', category);
  if (subject) params.set('subject', subject);
  if (q) params.set('q', q);
  params.set('page', String(page));
  params.set('size', String(size));
  return request(`/catalog?${params.toString()}`);
}

export async function getCategories(subject = 'BIOLOGY') {
  const params = new URLSearchParams();
  if (subject) params.set('subject', subject);
  return request(`/categories?${params.toString()}`);
}

export async function getFeaturedModels() {
  return request('/featured');
}

export async function getModelById(id) {
  return request(`/detail/${encodeURIComponent(id)}`);
}

export async function getModelBySlug(slug) {
  return request(`/slug/${encodeURIComponent(slug)}`);
}

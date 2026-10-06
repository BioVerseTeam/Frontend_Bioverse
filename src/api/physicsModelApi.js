/**
 * Physics Model API Client for BioVerse
 * Chuẩn kết nối API Backend theo tài liệu FRONTEND_PHYSICS_3D_INTEGRATION_GUIDE.md
 * Các API endpoints:
 *   1. GET /api/models/catalog?subject=PHYSICS&grade=&category=&q=&page=0&size=12
 *   2. GET /api/models/slug/{slug}
 *   3. GET /api/models/detail/{id}
 *   4. GET /api/models/featured
 *   5. GET /api/models/categories?subject=PHYSICS
 */

const API_BASE = '/api/models';

/**
 * Xử lý response từ Backend với cấu trúc chuẩn:
 * { "code": 1000, "message": "Thành công", "data": { ... } }
 */
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
    response = await fetch(`${API_BASE}${path}`, {
      headers: {
        'Accept': 'application/json'
      }
    });
  } catch (err) {
    console.error(`[physicsModelApi] Network error requesting ${path}:`, err);
    throw new Error('Không thể kết nối đến máy chủ Backend (http://localhost:8080). Hãy đảm bảo Backend đang chạy.');
  }
  return parseApiResponse(response);
}

export const physicsModelApi = {
  /**
   * 1. Lấy danh mục mô hình Vật lý có phân trang & bộ lọc từ Backend
   * Endpoint: GET /api/models/catalog?subject=PHYSICS
   * @param {{ grade?: number|null, category?: string|null, q?: string|null, page?: number, size?: number }} params
   * @returns {Promise<{ content: Array, page: number, size: number, totalElements: number, totalPages: number, first: boolean, last: boolean }>}
   */
  getCatalog: async ({
    grade = null,
    category = null,
    q = null,
    page = 0,
    size = 12
  } = {}) => {
    const searchParams = new URLSearchParams();
    searchParams.set('subject', 'PHYSICS');
    if (grade != null && grade !== '') searchParams.set('grade', String(grade));
    if (category && category.trim()) searchParams.set('category', category.trim());
    if (q && q.trim()) searchParams.set('q', q.trim());
    searchParams.set('page', String(page));
    searchParams.set('size', String(size));

    const data = await request(`/catalog?${searchParams.toString()}`);
    // Chuẩn hóa định dạng PageResponse của Spring Boot
    const content = data?.content || data?.items || (Array.isArray(data) ? data : []);
    return {
      content,
      items: content,
      page: typeof data?.page === 'number' ? data.page : page,
      size: typeof data?.size === 'number' ? data.size : size,
      totalElements: typeof data?.totalElements === 'number' ? data.totalElements : content.length,
      totalPages: typeof data?.totalPages === 'number' ? data.totalPages : Math.ceil(content.length / size),
      first: Boolean(data?.first ?? page === 0),
      last: Boolean(data?.last ?? true)
    };
  },

  /**
   * 2. Lấy chi tiết mô hình 3D theo Slug (Bao gồm URL file .glb từ Backend)
   * Endpoint: GET /api/models/slug/{slug}
   * @param {string} slug
   */
  getBySlug: async (slug) => {
    if (!slug) throw new Error('Thiếu slug mô hình');
    return request(`/slug/${encodeURIComponent(slug)}`);
  },

  /**
   * 3. Lấy chi tiết mô hình 3D theo ID
   * Endpoint: GET /api/models/detail/{id}
   * @param {number|string} id
   */
  getById: async (id) => {
    if (!id) throw new Error('Thiếu id mô hình');
    return request(`/detail/${encodeURIComponent(id)}`);
  },

  /**
   * 4. Lấy danh sách mô hình nổi bật môn Vật lý (isFeatured = true)
   * Endpoint: GET /api/models/featured
   */
  getFeatured: async () => {
    const list = await request('/featured');
    if (!Array.isArray(list)) return [];
    return list.filter((m) => m.subject === 'PHYSICS');
  },

  /**
   * 5. Lấy danh sách thể loại môn Vật lý từ Backend
   * Endpoint: GET /api/models/categories?subject=PHYSICS
   * @returns {Promise<string[]>}
   */
  getCategories: async () => {
    const data = await request('/categories?subject=PHYSICS');
    return Array.isArray(data) ? data : [];
  },

  /**
   * 6. Lấy đề thi Quiz trắc nghiệm 3D theo Slug mô hình
   * Endpoint: GET /api/models/slug/{slug}/exam
   * @param {string} slug
   */
  getExamBySlug: async (slug) => {
    if (!slug) throw new Error('Thiếu slug mô hình');
    return request(`/slug/${encodeURIComponent(slug)}/exam`);
  },

  /**
   * 7. Lấy đề thi Quiz trắc nghiệm 3D theo Model ID
   * Endpoint: GET /api/models/{id}/exam
   * @param {number|string} id
   */
  getExamById: async (id) => {
    if (!id) throw new Error('Thiếu id mô hình');
    return request(`/${encodeURIComponent(id)}/exam`);
  },

  /**
   * 8. Nộp bài thi Quiz 3D lên server để chấm điểm
   * Endpoint: POST /api/student/exams/{examId}/submit
   * @param {number|string} examId
   * @param {{ answers: Array<{ questionId: number, selectedAnswerId: number }>, timeSpentSec: number }} payload
   */
  submitExam: async (examId, payload) => {
    if (!examId) throw new Error('Thiếu examId');
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`/api/student/exams/${encodeURIComponent(examId)}/submit`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    return parseApiResponse(response);
  },

  /**
   * 9. Lấy chi tiết kết quả thi và lời giải thích (Review)
   * Endpoint: GET /api/student/exam-attempts/{attemptId}
   * @param {number|string} attemptId
   */
  getExamAttempt: async (attemptId) => {
    if (!attemptId) throw new Error('Thiếu attemptId');
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const headers = {
      'Accept': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`/api/student/exam-attempts/${encodeURIComponent(attemptId)}`, {
      method: 'GET',
      headers
    });
    return parseApiResponse(response);
  }
};

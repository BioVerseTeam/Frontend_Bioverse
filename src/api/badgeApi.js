/**
 * Public STEM Badge API Client
 * GET /api/badges — danh sách danh hiệu khoa học cho học sinh & sổ tay 3D
 */

const API_BASE = '/api/badges';

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
    if (json.code === 1000) return json.data;
    throw new Error(json.message || 'Thao tác không thành công');
  }

  if (!response.ok) {
    throw new Error(json?.message || `Yêu cầu thất bại (${response.status})`);
  }

  return json?.data !== undefined ? json.data : json;
}

export async function listPublicBadges() {
  try {
    const res = await fetch(API_BASE);
    const data = await parseApiResponse(res);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('Public badge fetch note:', err);
    return [];
  }
}

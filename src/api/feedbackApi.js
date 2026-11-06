/**
 * Client-facing Feedback API
 * Cho phép học sinh, giáo viên và khách gửi phản hồi đóng góp cho BioVerse
 */

import { authFetch } from './httpClient.js';

const FEEDBACK_ENDPOINT = '/api/feedbacks';

export async function submitFeedback({
  category = 'GENERAL',
  rating = 5,
  title = '',
  content = '',
  userEmail = '',
  userName = '',
  pageUrl = window.location.href,
  deviceInfo = ''
} = {}) {
  const payload = {
    category,
    rating,
    title: title.trim(),
    content: content.trim(),
    userEmail: userEmail ? userEmail.trim() : null,
    userName: userName ? userName.trim() : null,
    pageUrl: pageUrl || window.location.pathname,
    deviceInfo: deviceInfo || getClientDeviceInfo()
  };

  const res = await authFetch(FEEDBACK_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(json?.message || `Không thể gửi góp ý (${res.status})`);
  }

  return json?.data || json;
}

export function getClientDeviceInfo() {
  try {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const ua = navigator.userAgent;
    let browser = 'Trình duyệt Web';
    if (ua.includes('Edg/')) browser = 'Microsoft Edge';
    else if (ua.includes('Chrome/')) browser = 'Google Chrome';
    else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Apple Safari';
    else if (ua.includes('Firefox/')) browser = 'Mozilla Firefox';

    let os = 'Thiết bị';
    if (ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('iPhone')) os = 'iPhone iOS';
    else if (ua.includes('iPad')) os = 'iPadOS';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('Linux')) os = 'Linux';

    return `${browser} • ${os} (${width}x${height})`;
  } catch {
    return 'Thiết bị web';
  }
}

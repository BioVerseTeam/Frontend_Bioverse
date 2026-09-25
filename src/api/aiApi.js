import { authFetch } from './httpClient.js';

const API_BASE = '/api/ai';

/**
 * Get or create an anonymous student ID stored in localStorage.
 * @returns {string} The student ID.
 */
export function getAnonymousStudentId() {
  let studentId = localStorage.getItem('bioverse_student_id');
  if (!studentId) {
    studentId = `student-${crypto.randomUUID()}`;
    localStorage.setItem('bioverse_student_id', studentId);
  }
  return studentId;
}

/**
 * Send a chat message to the Backend.
 * Supports signal for AbortController.
 * @param {Object} params
 * @param {string} params.question - The question asked by the user.
 * @param {string|null} params.conversationId - The current conversation ID or null.
 * @param {AbortSignal} [params.signal] - Optional AbortSignal to cancel in-flight request.
 * @returns {Promise<Object>} The response JSON: { conversationId, answer }
 */
export async function sendChatMessage({ question, conversationId, signal }) {
  const studentId = getAnonymousStudentId();
  
  try {
    const response = await authFetch(`${API_BASE}/chat`, {
      method: 'POST',
      body: JSON.stringify({
        conversationId: conversationId || null,
        studentId,
        question
      }),
      signal
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.message || `Lỗi máy chủ AI (${response.status})`);
    }

    const resJson = await response.json();
    return resJson.data || resJson;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    console.error('Error sending chat message:', error);
    throw error;
  }
}

/**
 * Fetch paginated list of user's past AI conversations.
 * @param {Object} [options]
 * @param {number} [options.limit=20]
 * @param {string|null} [options.cursor=null]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{ items: Array, nextCursor: string|null, hasMore: boolean }>}
 */
export async function getUserConversations({ limit = 20, cursor = null, signal } = {}) {
  try {
    let url = `${API_BASE}/conversations?limit=${limit}`;
    if (cursor) {
      url += `&cursor=${encodeURIComponent(cursor)}`;
    }
    const response = await authFetch(url, { signal });
    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.message || `Lỗi khi lấy danh sách cuộc trò chuyện (${response.status})`);
    }
    const resJson = await response.json();
    return resJson.data || { items: [], nextCursor: null, hasMore: false };
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    console.error('Error getting user conversations:', error);
    throw error;
  }
}

/**
 * Fetch messages for a specific conversation owned by the authenticated user.
 * @param {string} conversationId
 * @param {Object} [options]
 * @param {number} [options.limit=50]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<Array<{ role: string, content: string, createdAt: string }>>}
 */
export async function getConversationMessages(conversationId, { limit = 50, signal } = {}) {
  try {
    const response = await authFetch(`${API_BASE}/conversations/${conversationId}/messages?limit=${limit}`, { signal });
    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.message || `Lỗi khi lấy lịch sử tin nhắn (${response.status})`);
    }
    const resJson = await response.json();
    return resJson.data || [];
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    console.error('Error getting conversation messages:', error);
    throw error;
  }
}

/**
 * Delete a conversation owned by the authenticated user.
 * @param {string} conversationId
 * @param {Object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<boolean>}
 */
export async function deleteConversation(conversationId, { signal } = {}) {
  try {
    const response = await authFetch(`${API_BASE}/conversations/${conversationId}`, {
      method: 'DELETE',
      signal
    });
    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.message || `Lỗi khi xóa cuộc trò chuyện (${response.status})`);
    }
    return true;
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    console.error('Error deleting conversation:', error);
    throw error;
  }
}

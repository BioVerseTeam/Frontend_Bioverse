const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/ai';

/**
 * Get or create an anonymous student ID stored in localStorage.
 * @returns {string} The student ID.
 */
export function getAnonymousStudentId() {
  let studentId = localStorage.getItem('bioverse_student_id');
  if (!studentId) {
    studentId = `anonymous-${crypto.randomUUID()}`;
    localStorage.setItem('bioverse_student_id', studentId);
  }
  return studentId;
}

/**
 * Send a chat message to the Backend.
 * @param {Object} params
 * @param {string} params.question - The question asked by the user.
 * @param {string|null} params.conversationId - The current conversation ID or null.
 * @returns {Promise<Object>} The response JSON: { conversationId, answer }
 */
export async function sendChatMessage({ question, conversationId }) {
  const studentId = getAnonymousStudentId();
  
  try {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        conversationId: conversationId || null,
        studentId,
        question
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`HTTP error ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending chat message:', error);
    throw error;
  }
}

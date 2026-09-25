/**
 * BioVerse — Admin Exam & Academic Taxonomy API Client
 * Interfaces with /api/classes, /api/semesters, /api/subjects, /api/exams,
 * /api/questions, /api/exam-questions, /api/answers, /api/question-images, /api/answer-images.
 */

import { authFetch } from './httpClient.js';

export class ExamApiError extends Error {
  constructor(code, message, data = null) {
    super(message);
    this.name = 'ExamApiError';
    this.code = code;
    this.data = data;
  }
}

/**
 * Danh mục mã lỗi nghiệp vụ phân hệ Exam (ErrorCode Series 16xx & 1400)
 * Đồng bộ chính xác theo EXAM_API_DOCUMENTATION.md
 */
export const EXAM_ERROR_CODES = {
  1400: {
    code: 1400,
    name: 'INVALID_DATA',
    httpStatus: 400,
    defaultMessage: 'Dữ liệu không hợp lệ',
    userMessage: 'Dữ liệu không hợp lệ hoặc vi phạm quy chuẩn kiểm tra tính hợp lệ (Validation).'
  },
  1601: {
    code: 1601,
    name: 'CLASS_NOT_FOUND',
    httpStatus: 404,
    defaultMessage: 'Không tìm thấy khối lớp',
    userMessage: 'Không tìm thấy khối lớp yêu cầu trong hệ thống (ID hoặc Grade không tồn tại).'
  },
  1602: {
    code: 1602,
    name: 'CLASS_GRADE_EXISTS',
    httpStatus: 409,
    defaultMessage: 'Khối lớp đã tồn tại trong hệ thống',
    userMessage: 'Khối lớp này đã tồn tại trong hệ thống. Mỗi số khối (Lớp 6, 7, 8, 9) chỉ được tạo 1 lần duy nhất.'
  },
  1603: {
    code: 1603,
    name: 'SEMESTER_NOT_FOUND',
    httpStatus: 404,
    defaultMessage: 'Không tìm thấy học kỳ',
    userMessage: 'Không tìm thấy học kỳ yêu cầu hoặc học kỳ đã bị xóa.'
  },
  1604: {
    code: 1604,
    name: 'SUBJECT_NOT_FOUND',
    httpStatus: 404,
    defaultMessage: 'Không tìm thấy môn học',
    userMessage: 'Không tìm thấy môn học yêu cầu hoặc môn học đã bị xóa.'
  },
  1605: {
    code: 1605,
    name: 'EXAM_NOT_FOUND',
    httpStatus: 404,
    defaultMessage: 'Không tìm thấy đề thi',
    userMessage: 'Không tìm thấy đề thi yêu cầu (ID hoặc Code không tồn tại).'
  },
  1606: {
    code: 1606,
    name: 'QUESTION_NOT_FOUND',
    httpStatus: 404,
    defaultMessage: 'Không tìm thấy câu hỏi',
    userMessage: 'Không tìm thấy câu hỏi yêu cầu trong ngân hàng đề thi.'
  },
  1607: {
    code: 1607,
    name: 'ANSWER_NOT_FOUND',
    httpStatus: 404,
    defaultMessage: 'Không tìm thấy đáp án',
    userMessage: 'Không tìm thấy đáp án yêu cầu.'
  },
  1608: {
    code: 1608,
    name: 'EXAM_QUESTION_NOT_FOUND',
    httpStatus: 404,
    defaultMessage: 'Không tìm thấy câu hỏi trong đề thi',
    userMessage: 'Liên kết giữa đề thi và câu hỏi không tồn tại.'
  },
  1609: {
    code: 1609,
    name: 'QUESTION_IMAGE_NOT_FOUND',
    httpStatus: 404,
    defaultMessage: 'Không tìm thấy hình ảnh câu hỏi',
    userMessage: 'Không tìm thấy hình ảnh minh họa của câu hỏi.'
  },
  1610: {
    code: 1610,
    name: 'ANSWER_IMAGE_NOT_FOUND',
    httpStatus: 404,
    defaultMessage: 'Không tìm thấy hình ảnh đáp án',
    userMessage: 'Không tìm thấy hình ảnh minh họa của đáp án.'
  },
  1611: {
    code: 1611,
    name: 'UNSUPPORTED_RETURN_TYPE',
    httpStatus: 400,
    defaultMessage: 'Kiểu dữ liệu phản hồi không được hỗ trợ',
    userMessage: 'Kiểu dữ liệu phản hồi (returnType) yêu cầu không hợp lệ.'
  },
  1410: {
    code: 1410,
    name: 'INVALID_FILE',
    httpStatus: 400,
    defaultMessage: 'Tệp hình ảnh không hợp lệ',
    userMessage: 'Chưa chọn file hoặc định dạng file không được hỗ trợ (chỉ chấp nhận JPG, PNG, WebP).'
  },
  1411: {
    code: 1411,
    name: 'FILE_TOO_LARGE',
    httpStatus: 400,
    defaultMessage: 'Dung lượng tệp vượt quá giới hạn',
    userMessage: 'Dung lượng tệp hình ảnh vượt quá 5MB. Vui lòng nén ảnh hoặc chọn ảnh có dung lượng nhỏ hơn.'
  }
};

export function parseExamError(err) {
  if (err instanceof ExamApiError) {
    const info = EXAM_ERROR_CODES[err.code];
    return {
      code: err.code,
      name: info?.name || 'APP_ERROR',
      message: err.message,
      userMessage: info?.userMessage || err.message,
      data: err.data
    };
  }
  return {
    code: null,
    name: 'NETWORK_OR_SERVER_ERROR',
    message: err?.message || 'Có lỗi xảy ra',
    userMessage: err?.message || 'Không thể kết nối máy chủ. Vui lòng thử lại sau.'
  };
}

async function handleResponse(res) {
  let json;
  try {
    json = await res.json();
  } catch {
    if (!res.ok) {
      throw new ExamApiError(res.status, `Máy chủ phản hồi mã lỗi HTTP ${res.status}`);
    }
    return null;
  }

  if (json && typeof json.code === 'number') {
    if (json.code === 1000) {
      return json.data;
    }
    // Validation error details (1400)
    if (json.code === 1400 && json.data && typeof json.data === 'object') {
      const errDetails = Object.entries(json.data)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      throw new ExamApiError(1400, `${json.message || 'Dữ liệu không hợp lệ'} (${errDetails})`, json.data);
    }
    
    // Series 16xx & Other Business Errors
    const known = EXAM_ERROR_CODES[json.code];
    const msg = json.message || known?.defaultMessage || `Lỗi nghiệp vụ (${json.code})`;
    throw new ExamApiError(json.code, msg, json.data);
  }

  if (!res.ok) {
    throw new ExamApiError(res.status, json?.message || `Yêu cầu thất bại (${res.status})`, json);
  }

  return json?.data !== undefined ? json.data : json;
}

/* ==========================================================================
   1. KHỐI LỚP (CLASSES / GRADES - /api/classes)
   ========================================================================== */

export async function listClasses() {
  const res = await authFetch('/api/classes');
  return handleResponse(res);
}

export async function getClassById(id) {
  const res = await authFetch(`/api/classes/${encodeURIComponent(id)}`);
  return handleResponse(res);
}

export async function getClassByGrade(grade) {
  const res = await authFetch(`/api/classes/grade/${encodeURIComponent(grade)}`);
  return handleResponse(res);
}

export async function createClass(data) {
  const res = await authFetch('/api/classes', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return handleResponse(res);
}

export async function updateClass(id, data) {
  const res = await authFetch(`/api/classes/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  return handleResponse(res);
}

export async function deleteClass(id) {
  const res = await authFetch(`/api/classes/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
  return handleResponse(res);
}

/* ==========================================================================
   2. HỌC KỲ (SEMESTERS - /api/semesters)
   ========================================================================== */

export async function listSemesters() {
  const res = await authFetch('/api/semesters');
  return handleResponse(res);
}

export async function listSemestersByClassId(classId) {
  const res = await authFetch(`/api/semesters/class/${encodeURIComponent(classId)}`);
  return handleResponse(res);
}

export async function getSemesterById(id) {
  const res = await authFetch(`/api/semesters/${encodeURIComponent(id)}`);
  return handleResponse(res);
}

export async function createSemester(data) {
  const res = await authFetch('/api/semesters', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return handleResponse(res);
}

export async function updateSemester(id, data) {
  const res = await authFetch(`/api/semesters/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  return handleResponse(res);
}

export async function deleteSemester(id) {
  const res = await authFetch(`/api/semesters/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
  return handleResponse(res);
}

/* ==========================================================================
   3. MÔN HỌC (SUBJECTS - /api/subjects)
   ========================================================================== */

export async function listSubjects() {
  const res = await authFetch('/api/subjects');
  return handleResponse(res);
}

export async function listSubjectsBySemesterId(semesterId) {
  const res = await authFetch(`/api/subjects/semester/${encodeURIComponent(semesterId)}`);
  return handleResponse(res);
}

export async function getSubjectById(id) {
  const res = await authFetch(`/api/subjects/${encodeURIComponent(id)}`);
  return handleResponse(res);
}

export async function createSubject(data) {
  const res = await authFetch('/api/subjects', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return handleResponse(res);
}

export async function updateSubject(id, data) {
  const res = await authFetch(`/api/subjects/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  return handleResponse(res);
}

export async function deleteSubject(id) {
  const res = await authFetch(`/api/subjects/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
  return handleResponse(res);
}

/* ==========================================================================
   4. ĐỀ THI (EXAMS - /api/exams)
   ========================================================================== */

export async function listExams({ page, size } = {}) {
  let url = '/api/exams';
  if (page !== undefined && size !== undefined) {
    url += `?page=${encodeURIComponent(page)}&size=${encodeURIComponent(size)}`;
  }
  const res = await authFetch(url);
  return handleResponse(res);
}

export async function getExamById(id) {
  const res = await authFetch(`/api/exams/${encodeURIComponent(id)}`);
  return handleResponse(res);
}

export async function getExamByCode(code) {
  const res = await authFetch(`/api/exams/code/${encodeURIComponent(code)}`);
  return handleResponse(res);
}

export async function createExam(data) {
  const res = await authFetch('/api/exams', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return handleResponse(res);
}

export async function updateExam(id, data) {
  const res = await authFetch(`/api/exams/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  return handleResponse(res);
}

export async function deleteExam(id) {
  const res = await authFetch(`/api/exams/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
  return handleResponse(res);
}

export async function duplicateExam(id, { newCode, newTitle }) {
  const res = await authFetch(`/api/exams/${encodeURIComponent(id)}/duplicate`, {
    method: 'POST',
    body: JSON.stringify({ newCode, newTitle })
  });
  return handleResponse(res);
}

export async function getExamBuilder(id) {
  const res = await authFetch(`/api/exams/${encodeURIComponent(id)}/builder`);
  return handleResponse(res);
}

export async function reorderExamQuestions(id, items) {
  const res = await authFetch(`/api/exams/${encodeURIComponent(id)}/questions/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ items })
  });
  return handleResponse(res);
}

export async function createCompositeQuestion(examId, data) {
  const res = await authFetch(`/api/exams/${encodeURIComponent(examId)}/questions/composite`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return handleResponse(res);
}

export async function removeQuestionFromExam(examId, questionId) {
  const res = await authFetch(`/api/exams/${encodeURIComponent(examId)}/questions/${encodeURIComponent(questionId)}`, {
    method: 'DELETE'
  });
  return handleResponse(res);
}

export async function pickQuestionsFromBank(examId, questionIds, defaultPoint = 0.25) {
  const res = await authFetch(`/api/exams/${encodeURIComponent(examId)}/questions/pick-from-bank`, {
    method: 'POST',
    body: JSON.stringify({ questionIds, defaultPoint })
  });
  return handleResponse(res);
}

/* ==========================================================================
   5. CÂU HỎI (QUESTIONS - /api/questions & /api/exam-questions)
   ========================================================================== */

export async function listQuestions() {
  const res = await authFetch('/api/questions');
  return handleResponse(res);
}

export async function getQuestionById(id) {
  const res = await authFetch(`/api/questions/${encodeURIComponent(id)}`);
  return handleResponse(res);
}

export async function createQuestion(data) {
  const res = await authFetch('/api/questions', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return handleResponse(res);
}

export async function updateQuestion(id, data) {
  const res = await authFetch(`/api/questions/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  return handleResponse(res);
}

export async function deleteQuestion(id) {
  const res = await authFetch(`/api/questions/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
  return handleResponse(res);
}

export async function listExamQuestions(examId) {
  const res = await authFetch(`/api/exam-questions/exam/${encodeURIComponent(examId)}`);
  return handleResponse(res);
}

export async function addQuestionToExam(data) {
  const res = await authFetch('/api/exam-questions', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return handleResponse(res);
}

export async function updateExamQuestion(id, data) {
  const res = await authFetch(`/api/exam-questions/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  return handleResponse(res);
}

export async function deleteExamQuestion(id) {
  const res = await authFetch(`/api/exam-questions/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
  return handleResponse(res);
}

/* ==========================================================================
   6. ĐÁP ÁN (ANSWERS - /api/answers)
   ========================================================================== */

export async function listAnswersByQuestionId(questionId) {
  const res = await authFetch(`/api/answers/question/${encodeURIComponent(questionId)}`);
  return handleResponse(res);
}

export async function createAnswer(data) {
  const res = await authFetch('/api/answers', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return handleResponse(res);
}

export async function updateAnswer(id, data) {
  const res = await authFetch(`/api/answers/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  return handleResponse(res);
}

export async function deleteAnswer(id) {
  const res = await authFetch(`/api/answers/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
  return handleResponse(res);
}

/* ==========================================================================
   7. ẢNH CÂU HỎI & ĐÁP ÁN (/api/question-images, /api/answer-images)
   ========================================================================== */

export async function listQuestionImages(questionId) {
  const res = await authFetch(`/api/question-images/question/${encodeURIComponent(questionId)}`);
  return handleResponse(res);
}

export async function createQuestionImage(data) {
  const res = await authFetch('/api/question-images', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return handleResponse(res);
}

export async function updateQuestionImage(id, data) {
  const res = await authFetch(`/api/question-images/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  return handleResponse(res);
}

export async function deleteQuestionImage(id) {
  const res = await authFetch(`/api/question-images/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
  return handleResponse(res);
}

export async function listAnswerImages(answerId) {
  const res = await authFetch(`/api/answer-images/answer/${encodeURIComponent(answerId)}`);
  return handleResponse(res);
}

export async function createAnswerImage(data) {
  const res = await authFetch('/api/answer-images', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return handleResponse(res);
}

export async function updateAnswerImage(id, data) {
  const res = await authFetch(`/api/answer-images/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  return handleResponse(res);
}

export async function deleteAnswerImage(id) {
  const res = await authFetch(`/api/answer-images/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
  return handleResponse(res);
}

/* ==========================================================================
   8. NGÂN HÀNG CÂU HỎI & TẢI LÊN MEDIA (/api/questions/bank, /api/media/upload)
   ========================================================================== */

export async function listQuestionBank({ search = '', type = '', page = 0, size = 20 } = {}) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (type) params.set('type', type);
  params.set('page', page);
  params.set('size', size);

  const res = await authFetch(`/api/questions/bank?${params.toString()}`);
  return handleResponse(res);
}

export async function uploadMediaFile(file, folder = 'exams') {
  if (!file) throw new ExamApiError(1410, 'Vui lòng chọn một tệp hình ảnh để tải lên');
  if (file.size > 5 * 1024 * 1024) throw new ExamApiError(1411, 'Dung lượng file vượt quá 5MB. Vui lòng chọn tệp nhỏ hơn');

  const formData = new FormData();
  formData.append('file', file);
  if (folder) formData.append('folder', folder);

  const res = await authFetch('/api/media/upload', {
    method: 'POST',
    body: formData
  });
  return handleResponse(res);
}


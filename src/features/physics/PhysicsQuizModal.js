/**
 * Physics 3D Quiz Modal / Interactive Exam Runner
 * Chuẩn Neo-Brutalism Sketchbook cho học sinh THCS
 * Kết nối trực tiếp với Backend API:
 *   - Lấy đề thi: GET /api/models/slug/{slug}/exam
 *   - Nộp bài thi: POST /api/student/exams/{examId}/submit
 *   - Xem lời giải: GET /api/student/exam-attempts/{attemptId}
 */

import gsap from 'gsap';
import { physicsModelApi } from '../../api/physicsModelApi.js';
import { confirmModal, showToast } from '../../components/modal.js';
import { addXP } from '../progress/progressService.js';

export class PhysicsQuizModal {
  constructor() {
    this.modalEl = null;
    this.exam = null;
    this.modelSlug = null;
    this.modelName = '';
    this.currentQuestionIndex = 0;
    this.userAnswers = {}; // { [questionId]: selectedAnswerId }
    this.startTime = null;
    this.timerInterval = null;
    this.remainingSeconds = 600; // 10 phút mặc định
    this.timeSpentSec = 0;
    this.isSubmitted = false;
    this.submitResult = null;
    this.reviewData = null;
    this.viewMode = 'quiz'; // 'quiz' | 'result' | 'review'

    this._initDom();
  }

  _initDom() {
    let existing = document.getElementById('physics-quiz-modal');
    if (existing) existing.remove();

    const wrapper = document.createElement('div');
    wrapper.id = 'physics-quiz-modal';
    wrapper.className = 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm hidden';
    wrapper.innerHTML = `
      <div id="physics-quiz-dialog" class="relative w-full max-w-2xl max-h-[92vh] bg-[#fdfbf7] border-[3px] border-[#2d2d2d] rounded-2xl sketch-shadow-lg flex flex-col overflow-hidden text-on-surface">
        
        <!-- Header -->
        <div class="px-5 pt-4 pb-3 border-b-2 border-dashed border-[#2d2d2d]/30 bg-white/70 flex items-center justify-between gap-3 shrink-0">
          <div class="min-w-0">
            <!-- Physical Tape Accent Tag -->
            <div class="inline-flex items-center gap-1 px-3 py-0.5 mb-1.5 bg-[#fed7aa] border-2 border-[#2d2d2d] rounded-md sketch-shadow-sm transform -rotate-1">
              <span class="text-[10px] font-['Space_Grotesk'] text-[#7c2d12] tracking-wider uppercase font-bold flex items-center gap-1">
                <span>⚡</span> BÀI TẬP VẬT LÝ 3D
              </span>
            </div>
            <h2 id="pq-exam-title" class="font-['Epilogue'] text-base sm:text-lg font-bold text-[#2d2d2d] truncate">
              Quiz 3D: Mô hình Vật lý
            </h2>
            <div class="flex items-center gap-2 mt-0.5 text-xs font-['Space_Grotesk'] text-[#5b403e]">
              <span id="pq-question-count-badge" class="font-bold text-[#ed8936]">5 câu hỏi</span>
              <span>•</span>
              <span id="pq-points-badge">Thang điểm 10.0</span>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <!-- Timer Badge -->
            <div id="pq-timer-box" class="flex items-center gap-1 px-2.5 py-1 bg-[#fff9c4] border-2 border-[#2d2d2d] rounded-lg font-['Space_Grotesk'] text-xs font-bold sketch-shadow-sm">
              <span class="material-symbols-outlined text-[16px] text-[#ed8936]">timer</span>
              <span id="pq-timer-text">10:00</span>
            </div>

            <!-- Close Button -->
            <button type="button" id="pq-btn-close" class="w-8 h-8 rounded-lg border-2 border-[#2d2d2d] bg-white hover:bg-[#fee2e2] hover:text-[#b71422] flex items-center justify-center font-bold sketch-shadow-sm transition-transform active:scale-95 cursor-pointer" title="Đóng">
              &times;
            </button>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="w-full bg-[#f0eded] h-1.5 border-b border-[#2d2d2d]/20 shrink-0 overflow-hidden">
          <div id="pq-progress-fill" class="h-full bg-[#ed8936] transition-all duration-300" style="width: 20%;"></div>
        </div>

        <!-- Body Area (Scrollable) -->
        <div id="pq-body-container" class="flex-1 overflow-y-auto p-4 sm:p-6">
          <!-- Dynamic Content Rendered by JS -->
        </div>

        <!-- Footer / Navigation Bar -->
        <div id="pq-footer-bar" class="px-5 py-3 border-t-2 border-dashed border-[#2d2d2d]/30 bg-white/70 flex items-center justify-between gap-3 shrink-0">
          <button type="button" id="pq-btn-prev" class="px-3 py-1.5 bg-white hover:bg-[#f6f3f2] border-2 border-[#2d2d2d] rounded-xl font-['Space_Grotesk'] text-xs font-bold sketch-shadow-sm flex items-center gap-1 transition-transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
            <span class="material-symbols-outlined text-[16px]">chevron_left</span>
            <span>Câu trước</span>
          </button>

          <!-- Question Dots Palette -->
          <div id="pq-palette" class="flex items-center gap-1.5 overflow-x-auto max-w-[240px] px-1 py-0.5">
            <!-- Rendered by JS -->
          </div>

          <div class="flex items-center gap-2">
            <button type="button" id="pq-btn-next" class="px-3.5 py-1.5 bg-white hover:bg-[#fffaf0] border-2 border-[#2d2d2d] rounded-xl font-['Space_Grotesk'] text-xs font-bold sketch-shadow-sm flex items-center gap-1 transition-transform active:scale-95 cursor-pointer">
              <span>Câu sau</span>
              <span class="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
            <button type="button" id="pq-btn-submit" class="px-4 py-1.5 bg-[#ed8936] hover:bg-[#dd6b20] text-white border-2 border-[#2d2d2d] rounded-xl font-['Space_Grotesk'] text-xs font-bold sketch-shadow-sm flex items-center gap-1 transition-transform active:scale-95 cursor-pointer">
              <span class="material-symbols-outlined text-[16px]">task_alt</span>
              <span>Nộp bài</span>
            </button>
          </div>
        </div>

      </div>
    `;

    document.body.appendChild(wrapper);
    this.modalEl = wrapper;

    this._bindEvents();
  }

  _bindEvents() {
    this.modalEl.querySelector('#pq-btn-close')?.addEventListener('click', () => {
      this.close();
    });

    this.modalEl.querySelector('#pq-btn-prev')?.addEventListener('click', () => {
      if (this.currentQuestionIndex > 0) {
        this.currentQuestionIndex--;
        this._renderCurrentQuestion();
      }
    });

    this.modalEl.querySelector('#pq-btn-next')?.addEventListener('click', () => {
      if (this.exam && this.currentQuestionIndex < this.exam.questions.length - 1) {
        this.currentQuestionIndex++;
        this._renderCurrentQuestion();
      }
    });

    this.modalEl.querySelector('#pq-btn-submit')?.addEventListener('click', () => {
      this._confirmAndSubmit();
    });

    // Close on backdrop click with confirmation if in-progress
    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) {
        this.close();
      }
    });
  }

  /**
   * Khởi chạy Quiz cho một mô hình Vật lý bằng Slug hoặc Exam Object
   */
  async startQuiz({ slug = null, id = null, modelName = 'Mô hình vật lý' } = {}) {
    this.modelSlug = slug;
    this.modelName = modelName;
    this.userAnswers = {};
    this.currentQuestionIndex = 0;
    this.isSubmitted = false;
    this.submitResult = null;
    this.reviewData = null;
    this.viewMode = 'quiz';

    this.showLoading();

    try {
      let examData = null;
      if (slug) {
        examData = await physicsModelApi.getExamBySlug(slug);
      } else if (id) {
        examData = await physicsModelApi.getExamById(id);
      }

      if (!examData || !Array.isArray(examData.questions) || examData.questions.length === 0) {
        throw new Error('Mô hình này chưa có bài trắc nghiệm gắn liền từ Backend.');
      }

      this.exam = examData;
      this.remainingSeconds = (examData.durationMinutes || 10) * 60;
      this.startTime = Date.now();

      this._startTimer();
      this._openModal();
      this._renderCurrentQuestion();
    } catch (err) {
      console.warn('Lỗi lấy bài thi Quiz Vật lý:', err);
      showToast(err.message || 'Không thể tải đề thi từ Backend.', 'error');
      this.hide();
    }
  }

  showLoading() {
    this._openModal();
    const title = this.modalEl.querySelector('#pq-exam-title');
    if (title) title.textContent = `Đang tải Quiz: ${this.modelName}…`;

    const body = this.modalEl.querySelector('#pq-body-container');
    if (body) {
      body.innerHTML = `
        <div class="py-12 flex flex-col items-center justify-center gap-3">
          <span class="material-symbols-outlined text-[40px] text-[#ed8936] animate-spin">progress_activity</span>
          <p class="font-['Be_Vietnam_Pro'] text-sm text-[#5b403e]">Đang lấy câu hỏi trắc nghiệm tương tác từ máy chủ…</p>
        </div>
      `;
    }

    const footer = this.modalEl.querySelector('#pq-footer-bar');
    if (footer) footer.style.display = 'none';
  }

  _openModal() {
    this.modalEl.classList.remove('hidden');
    gsap.fromTo(
      this.modalEl.querySelector('#physics-quiz-dialog'),
      { scale: 0.95, opacity: 0, y: 15 },
      { scale: 1, opacity: 1, y: 0, duration: 0.25, ease: 'back.out(1.5)' }
    );
  }

  hide() {
    this._stopTimer();
    this.modalEl.classList.add('hidden');
  }

  async close() {
    if (this.viewMode === 'quiz' && !this.isSubmitted && Object.keys(this.userAnswers).length > 0) {
      const confirm = await confirmModal({
        title: 'Tạm dừng bài Quiz?',
        message: 'Bạn đang làm dở bài trắc nghiệm. Nếu đóng bây giờ, các câu trả lời chưa nộp sẽ không được lưu điểm.',
        confirmText: 'Vẫn đóng',
        cancelText: 'Làm tiếp',
        isDanger: true
      });
      if (!confirm) return;
    }
    this.hide();
  }

  _startTimer() {
    this._stopTimer();
    const timerText = this.modalEl.querySelector('#pq-timer-text');
    const timerBox = this.modalEl.querySelector('#pq-timer-box');

    const updateDisplay = () => {
      const mins = Math.floor(this.remainingSeconds / 60);
      const secs = this.remainingSeconds % 60;
      if (timerText) {
        timerText.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      }
      if (this.remainingSeconds <= 60 && timerBox) {
        timerBox.classList.add('bg-rose-100', 'text-rose-700', 'border-rose-400');
      }
    };

    updateDisplay();

    this.timerInterval = setInterval(() => {
      this.remainingSeconds--;
      if (this.remainingSeconds <= 0) {
        this._stopTimer();
        showToast('Hết thời gian làm bài! Đang tự động nộp bài…', 'info');
        this._submitExam();
      } else {
        updateDisplay();
      }
    }, 1000);
  }

  _stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  _renderCurrentQuestion() {
    if (!this.exam || !this.exam.questions) return;

    this.viewMode = 'quiz';
    const questions = this.exam.questions;
    const total = questions.length;
    const currentQ = questions[this.currentQuestionIndex];
    if (!currentQ) return;

    // Header info
    const title = this.modalEl.querySelector('#pq-exam-title');
    if (title) title.textContent = this.exam.name || `Quiz: ${this.modelName}`;

    const countBadge = this.modalEl.querySelector('#pq-question-count-badge');
    if (countBadge) countBadge.textContent = `${total} câu hỏi`;

    const pointsBadge = this.modalEl.querySelector('#pq-points-badge');
    if (pointsBadge) pointsBadge.textContent = `${currentQ.point || 2.0} điểm / câu`;

    // Progress bar
    const progressFill = this.modalEl.querySelector('#pq-progress-fill');
    if (progressFill) {
      const pct = Math.round(((this.currentQuestionIndex + 1) / total) * 100);
      progressFill.style.width = `${pct}%`;
    }

    // Palette dots
    const palette = this.modalEl.querySelector('#pq-palette');
    if (palette) {
      palette.innerHTML = questions.map((q, idx) => {
        const isCurrent = idx === this.currentQuestionIndex;
        const isAnswered = this.userAnswers[q.id] != null;
        let classes = 'w-7 h-7 rounded-lg border-2 border-[#2d2d2d] flex items-center justify-center font-bold text-xs sketch-shadow-sm transition-all cursor-pointer';
        if (isCurrent) {
          classes += ' bg-[#ed8936] text-white scale-105';
        } else if (isAnswered) {
          classes += ' bg-[#dcfce7] text-[#166534] border-[#166534]';
        } else {
          classes += ' bg-white hover:bg-gray-100 text-[#2d2d2d]';
        }
        return `
          <button type="button" data-jump-q="${idx}" class="${classes}" title="Câu ${idx + 1}">
            ${idx + 1}
          </button>
        `;
      }).join('');

      palette.querySelectorAll('[data-jump-q]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.currentQuestionIndex = Number(btn.dataset.jumpQ);
          this._renderCurrentQuestion();
        });
      });
    }

    // Prev / Next button states
    const btnPrev = this.modalEl.querySelector('#pq-btn-prev');
    if (btnPrev) btnPrev.disabled = this.currentQuestionIndex === 0;

    const btnNext = this.modalEl.querySelector('#pq-btn-next');
    if (btnNext) {
      btnNext.style.display = this.currentQuestionIndex === total - 1 ? 'none' : 'inline-flex';
    }

    // Question content & answers
    const body = this.modalEl.querySelector('#pq-body-container');
    const selectedAnswerId = this.userAnswers[currentQ.id];

    body.innerHTML = `
      <div class="flex flex-col gap-4">
        <!-- Question Header Card -->
        <div class="p-4 bg-white border-2 border-[#2d2d2d] rounded-xl sketch-shadow-sm">
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="px-2.5 py-0.5 rounded-md bg-[#fffaf0] border border-[#2d2d2d] font-['Space_Grotesk'] text-[11px] font-bold text-[#dd6b20]">
              Câu hỏi ${this.currentQuestionIndex + 1} / ${total}
            </span>
            <span class="font-['Space_Grotesk'] text-xs text-[#76716a] font-semibold">
              Điểm: +${currentQ.point || 2.0}đ
            </span>
          </div>
          <p class="font-['Epilogue'] text-base sm:text-lg font-bold text-[#2d2d2d] leading-snug">
            ${this._escapeHtml(currentQ.content)}
          </p>
        </div>

        <!-- Answers List -->
        <div class="flex flex-col gap-2.5" role="radiogroup" aria-label="Lựa chọn đáp án">
          ${(currentQ.answers || []).map((ans, aIdx) => {
            const letter = String.fromCharCode(65 + aIdx); // A, B, C, D
            const isSelected = selectedAnswerId === ans.id;
            let cardClasses = 'group p-3.5 bg-white border-2 border-[#2d2d2d] rounded-xl sketch-shadow-sm hover:-translate-y-0.5 transition-all flex items-start gap-3 cursor-pointer select-none';
            let circleClasses = 'w-7 h-7 rounded-lg border-2 border-[#2d2d2d] flex items-center justify-center font-["Space_Grotesk"] text-xs font-bold shrink-0 transition-colors';

            if (isSelected) {
              cardClasses += ' bg-[#fffaf0] border-[#ed8936] ring-2 ring-[#ed8936]/30';
              circleClasses += ' bg-[#ed8936] text-white border-[#ed8936]';
            } else {
              circleClasses += ' bg-[#fdfbf7] text-[#2d2d2d] group-hover:bg-[#fffaf0]';
            }

            return `
              <div data-answer-id="${ans.id}" class="${cardClasses}" role="radio" aria-checked="${isSelected}">
                <div class="${circleClasses}">
                  ${letter}
                </div>
                <div class="flex-1 font-['Be_Vietnam_Pro'] text-sm sm:text-[15px] text-[#2d2d2d] pt-0.5 leading-relaxed">
                  ${this._escapeHtml(ans.content)}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    // Bind Answer Click
    body.querySelectorAll('[data-answer-id]').forEach((card) => {
      card.addEventListener('click', () => {
        const ansId = Number(card.dataset.answerId);
        this.userAnswers[currentQ.id] = ansId;
        this._renderCurrentQuestion();
      });
    });

    const footer = this.modalEl.querySelector('#pq-footer-bar');
    if (footer) footer.style.display = 'flex';
  }

  async _confirmAndSubmit() {
    if (!this.exam || !this.exam.questions) return;
    const total = this.exam.questions.length;
    const answeredCount = Object.keys(this.userAnswers).length;

    if (answeredCount < total) {
      const confirm = await confirmModal({
        title: 'Chưa làm hết câu hỏi!',
        message: `Bạn mới hoàn thành ${answeredCount}/${total} câu hỏi. Bạn có chắc chắn muốn nộp bài sớm không?`,
        confirmText: 'Nộp bài ngay',
        cancelText: 'Làm tiếp',
        isDanger: false
      });
      if (!confirm) return;
    }

    await this._submitExam();
  }

  async _submitExam() {
    this._stopTimer();
    this.isSubmitted = true;
    this.timeSpentSec = Math.max(1, Math.round((Date.now() - this.startTime) / 1000));

    // Show submitting state
    const body = this.modalEl.querySelector('#pq-body-container');
    if (body) {
      body.innerHTML = `
        <div class="py-12 flex flex-col items-center justify-center gap-3">
          <span class="material-symbols-outlined text-[42px] text-[#ed8936] animate-spin">sync</span>
          <p class="font-['Epilogue'] text-base font-bold text-[#2d2d2d]">Đang nộp bài và chấm điểm tự động…</p>
          <p class="font-['Be_Vietnam_Pro'] text-xs text-[#5b403e]">Hệ thống đang đối chiếu đáp án với chuẩn kiến thức GDPT.</p>
        </div>
      `;
    }

    const footer = this.modalEl.querySelector('#pq-footer-bar');
    if (footer) footer.style.display = 'none';

    try {
      const answersPayload = Object.entries(this.userAnswers).map(([qId, aId]) => ({
        questionId: Number(qId),
        selectedAnswerId: Number(aId)
      }));

      const res = await physicsModelApi.submitExam(this.exam.examId, {
        answers: answersPayload,
        timeSpentSec: this.timeSpentSec
      });

      this.submitResult = res;

      // Cộng điểm XP vào hệ thống lưu trữ học sinh
      if (res?.earnedXp) {
        try {
          addXP(res.earnedXp);
        } catch (e) {
          console.debug('Lỗi addXP cục bộ:', e);
        }
      }

      this._renderResultView();
    } catch (err) {
      console.warn('Lỗi khi nộp bài thi:', err);
      showToast(err.message || 'Không thể nộp bài thi lên máy chủ.', 'error');
      if (body) {
        body.innerHTML = `
          <div class="py-10 text-center">
            <span class="material-symbols-outlined text-[44px] text-rose-600 mb-2">error</span>
            <p class="font-['Epilogue'] text-lg font-bold text-gray-900 mb-1">Nộp bài thất bại</p>
            <p class="font-['Be_Vietnam_Pro'] text-sm text-[#5b403e] mb-4">${this._escapeHtml(err.message)}</p>
            <button type="button" id="pq-btn-retry-submit" class="px-4 py-2 bg-[#ed8936] text-white rounded-xl font-bold font-['Space_Grotesk'] text-sm border-2 border-[#2d2d2d] sketch-shadow-sm">
              Thử nộp lại
            </button>
          </div>
        `;
        body.querySelector('#pq-btn-retry-submit')?.addEventListener('click', () => {
          this._submitExam();
        });
      }
    }
  }

  _renderResultView() {
    this.viewMode = 'result';
    const d = this.submitResult || {};
    const score = d.score != null ? d.score : 0;
    const correctCount = d.correctCount || 0;
    const totalQuestions = d.totalQuestions || this.exam.questions.length || 5;
    const earnedXp = d.earnedXp || Math.round(score * 10);
    const feedback = d.feedback || 'Hoàn thành bài tập trắc nghiệm 3D!';

    const mins = Math.floor(this.timeSpentSec / 60);
    const secs = this.timeSpentSec % 60;
    const timeFormatted = `${mins > 0 ? `${mins}m ` : ''}${secs}s`;

    const body = this.modalEl.querySelector('#pq-body-container');
    body.innerHTML = `
      <div class="flex flex-col items-center text-center py-4">
        
        <!-- Score Stamp Ring -->
        <div class="w-24 h-24 rounded-full border-[3.5px] border-[#2d2d2d] bg-[#fffaf0] sketch-shadow flex flex-col items-center justify-center mb-4 transform -rotate-3">
          <span class="font-['Epilogue'] text-3xl font-black text-[#ed8936] leading-none">${score.toFixed(1)}</span>
          <span class="font-['Space_Grotesk'] text-[10px] font-bold text-[#76716a] tracking-wider uppercase mt-1">Điểm / 10</span>
        </div>

        <h3 class="font-['Epilogue'] text-xl font-bold text-[#2d2d2d] mb-1">
          ${score >= 8.0 ? '🎉 Xuất sắc! Bạn nắm bài rất tốt!' : score >= 5.0 ? '👍 Khá lắm! Tiếp tục phát huy!' : '💪 Hãy cố gắng ôn tập thêm!'}
        </h3>
        <p class="font-['Be_Vietnam_Pro'] text-sm text-[#5b403e] max-w-md mb-5 leading-relaxed">
          ${this._escapeHtml(feedback)}
        </p>

        <!-- Stats Grid -->
        <div class="grid grid-cols-3 gap-3 w-full max-w-md mb-6">
          <div class="p-3 bg-white border-2 border-[#2d2d2d] rounded-xl sketch-shadow-sm flex flex-col items-center">
            <span class="material-symbols-outlined text-[#166534] text-[20px] mb-0.5">check_circle</span>
            <span class="font-['Space_Grotesk'] text-base font-bold text-[#166534]">${correctCount}/${totalQuestions}</span>
            <span class="text-[10px] font-['Space_Grotesk'] text-[#76716a] uppercase">Câu đúng</span>
          </div>

          <div class="p-3 bg-white border-2 border-[#2d2d2d] rounded-xl sketch-shadow-sm flex flex-col items-center">
            <span class="material-symbols-outlined text-[#ed8936] text-[20px] mb-0.5">timer</span>
            <span class="font-['Space_Grotesk'] text-base font-bold text-[#2d2d2d]">${timeFormatted}</span>
            <span class="text-[10px] font-['Space_Grotesk'] text-[#76716a] uppercase">Thời gian</span>
          </div>

          <div class="p-3 bg-white border-2 border-[#2d2d2d] rounded-xl sketch-shadow-sm flex flex-col items-center">
            <span class="material-symbols-outlined text-[#eab308] text-[20px] mb-0.5">award_star</span>
            <span class="font-['Space_Grotesk'] text-base font-bold text-[#b45309]">+${earnedXp} XP</span>
            <span class="text-[10px] font-['Space_Grotesk'] text-[#76716a] uppercase">Thưởng</span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
          <button type="button" id="pq-btn-view-review" class="flex-1 w-full py-2.5 px-4 bg-[#fffaf0] hover:bg-[#fed7aa] text-[#7c2d12] border-2 border-[#2d2d2d] rounded-xl font-['Space_Grotesk'] text-xs font-bold sketch-shadow-sm flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer">
            <span class="material-symbols-outlined text-[18px]">menu_book</span>
            <span>Xem lời giải chi tiết</span>
          </button>

          <button type="button" id="pq-btn-retry-exam" class="flex-1 w-full py-2.5 px-4 bg-[#ed8936] hover:bg-[#dd6b20] text-white border-2 border-[#2d2d2d] rounded-xl font-['Space_Grotesk'] text-xs font-bold sketch-shadow-sm flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer">
            <span class="material-symbols-outlined text-[18px]">replay</span>
            <span>Làm lại bài thi</span>
          </button>
        </div>

      </div>
    `;

    body.querySelector('#pq-btn-view-review')?.addEventListener('click', () => {
      this._loadAndRenderReview();
    });

    body.querySelector('#pq-btn-retry-exam')?.addEventListener('click', () => {
      this.startQuiz({ slug: this.modelSlug, modelName: this.modelName });
    });

    const footer = this.modalEl.querySelector('#pq-footer-bar');
    if (footer) footer.style.display = 'none';
  }

  async _loadAndRenderReview() {
    this.viewMode = 'review';
    const body = this.modalEl.querySelector('#pq-body-container');
    const attemptId = this.submitResult?.attemptId;

    if (!attemptId) {
      showToast('Không tìm thấy mã lượt thi để xem lại.', 'warning');
      return;
    }

    body.innerHTML = `
      <div class="py-12 flex flex-col items-center justify-center gap-3">
        <span class="material-symbols-outlined text-[40px] text-[#ed8936] animate-spin">sync</span>
        <p class="font-['Be_Vietnam_Pro'] text-sm text-[#5b403e]">Đang tải lời giải và phân tích đáp án chi tiết…</p>
      </div>
    `;

    try {
      const reviewResp = await physicsModelApi.getExamAttempt(attemptId);
      this.reviewData = reviewResp;
      this._renderReviewList();
    } catch (err) {
      console.warn('Lỗi lấy bài giải chi tiết:', err);
      showToast('Không thể tải lời giải từ máy chủ.', 'error');
      this._renderResultView();
    }
  }

  _renderReviewList() {
    const data = this.reviewData || {};
    const questions = data.questions || [];
    const body = this.modalEl.querySelector('#pq-body-container');

    body.innerHTML = `
      <div class="flex flex-col gap-5">
        <div class="flex items-center justify-between gap-2 pb-2 border-b-2 border-dashed border-[#2d2d2d]/30">
          <div class="flex items-center gap-2">
            <span class="w-3 h-6 bg-[#ed8936] rounded-sm border border-[#2d2d2d]"></span>
            <h3 class="font-['Epilogue'] text-base font-bold text-[#2d2d2d]">
              Giải thích chi tiết & Đáp án chuẩn (${questions.length} câu)
            </h3>
          </div>
          <button type="button" id="pq-btn-back-to-result" class="px-2.5 py-1 bg-white hover:bg-gray-100 border border-[#2d2d2d] rounded-lg font-['Space_Grotesk'] text-xs font-bold sketch-shadow-sm flex items-center gap-1">
            <span class="material-symbols-outlined text-[14px]">arrow_back</span>
            Kết quả
          </button>
        </div>

        <div class="flex flex-col gap-4">
          ${questions.map((q, idx) => {
            const isCorrect = Boolean(q.isCorrect);
            return `
              <div class="p-4 bg-white border-2 border-[#2d2d2d] rounded-xl sketch-shadow-sm flex flex-col gap-3">
                
                <!-- Question Top -->
                <div class="flex items-start justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <span class="w-6 h-6 rounded-md border border-[#2d2d2d] flex items-center justify-center font-['Space_Grotesk'] text-xs font-bold ${isCorrect ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#fee2e2] text-[#991b1b]'}">
                      ${idx + 1}
                    </span>
                    <span class="font-['Space_Grotesk'] text-xs font-bold ${isCorrect ? 'text-[#166534]' : 'text-[#991b1b]'}">
                      ${isCorrect ? '✓ Đúng (+2.0đ)' : '✗ Chưa chính xác (0đ)'}
                    </span>
                  </div>
                </div>

                <p class="font-['Epilogue'] text-sm sm:text-base font-bold text-[#2d2d2d]">
                  ${this._escapeHtml(q.content)}
                </p>

                <!-- Answers with Highlight -->
                <div class="flex flex-col gap-2">
                  ${(q.answers || []).map((ans, aIdx) => {
                    const letter = String.fromCharCode(65 + aIdx);
                    const isRightAnswer = ans.isCorrect === true;
                    const isUserChoice = ans.isSelected === true || ans.id === q.selectedAnswerId;

                    let rowClass = 'p-2.5 rounded-lg border flex items-center gap-2.5 text-xs sm:text-sm font-["Be_Vietnam_Pro"]';
                    if (isRightAnswer) {
                      rowClass += ' bg-[#ecfdf5] border-[#059669] text-[#065f46] font-semibold';
                    } else if (isUserChoice && !isRightAnswer) {
                      rowClass += ' bg-[#fef2f2] border-[#dc2626] text-[#991b1b] line-through';
                    } else {
                      rowClass += ' bg-[#fdfbf7] border-[#e5e0d8] text-[#5b403e] opacity-80';
                    }

                    return `
                      <div class="${rowClass}">
                        <span class="w-5 h-5 rounded border border-[#2d2d2d] flex items-center justify-center text-[10px] font-bold font-['Space_Grotesk'] shrink-0 ${isRightAnswer ? 'bg-[#059669] text-white border-[#059669]' : 'bg-white'}">
                          ${letter}
                        </span>
                        <span class="flex-1">${this._escapeHtml(ans.content)}</span>
                        ${isRightAnswer ? '<span class="text-[10px] font-bold text-[#059669] font-["Space_Grotesk"] uppercase shrink-0">Đáp án đúng</span>' : ''}
                        ${isUserChoice && !isRightAnswer ? '<span class="text-[10px] font-bold text-[#dc2626] font-["Space_Grotesk"] uppercase shrink-0">Bạn đã chọn</span>' : ''}
                      </div>
                    `;
                  }).join('')}
                </div>

                <!-- Explanation Box -->
                ${q.explanation ? `
                  <div class="p-3 bg-[#fffaf0] border border-dashed border-[#ed8936] rounded-lg">
                    <span class="font-['Space_Grotesk'] text-[11px] font-bold text-[#dd6b20] uppercase flex items-center gap-1 mb-1">
                      <span class="material-symbols-outlined text-[14px]">lightbulb</span>
                      Lời giải thích khoa học:
                    </span>
                    <p class="font-['Be_Vietnam_Pro'] text-xs text-[#5b403e] leading-relaxed">
                      ${this._escapeHtml(q.explanation)}
                    </p>
                  </div>
                ` : ''}

              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    body.querySelector('#pq-btn-back-to-result')?.addEventListener('click', () => {
      this._renderResultView();
    });
  }

  _escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

// Singleton instance
export const physicsQuizModal = new PhysicsQuizModal();

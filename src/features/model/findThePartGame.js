/**
 * Find the Part — Trò chơi giáo dục nhận diện giải phẫu 3D (BioVerse Gamification V1)
 *
 * Nhiệm vụ chính:
 * - Lọc danh sách cấu trúc hợp lệ (findPart: true)
 * - Xáo trộn câu hỏi ngẫu nhiên (tối đa 5 câu/lượt)
 * - Quản lý trạng thái câu hỏi, chấm điểm, ghi nhận kết quả
 * - Hỗ trợ các pha: 'question' -> 'feedback' -> 'finished' -> 'review'
 * - Không phụ thuộc framework bên ngoài, độc lập và dễ kiểm thử
 */

export class FindThePartGame {
  /**
   * @param {Object} options
   * @param {Array} options.structures - Danh sách cấu trúc từ anatomyStructures
   * @param {string} [options.modelTitle] - Tên mô hình
   * @param {number} [options.maxQuestions=5] - Số câu hỏi tối đa mỗi lượt chơi
   * @param {Function} [options.onStateChange] - Callback khi trạng thái game thay đổi
   */
  constructor({
    structures = [],
    modelTitle = 'Mô hình sinh học',
    maxQuestions = 5,
    onStateChange = null
  } = {}) {
    this.allStructures = Array.isArray(structures) ? structures : [];
    this.modelTitle = modelTitle;
    this.maxQuestions = maxQuestions;
    this.onStateChange = onStateChange;

    this.isActive = false;
    this.phase = 'idle'; // 'idle' | 'question' | 'feedback' | 'finished' | 'review'
    this.questions = [];
    this.currentQuestionIndex = 0;
    this.score = 0;
    this.results = [];
    this.isLocked = false;
    this.currentReviewIndex = 0;
  }

  /**
   * Cập nhật danh sách cấu trúc nếu mô hình thay đổi
   * @param {Array} structures
   * @param {string} [modelTitle]
   */
  setStructures(structures, modelTitle) {
    this.allStructures = Array.isArray(structures) ? structures : [];
    if (modelTitle) this.modelTitle = modelTitle;
  }

  /**
   * Lấy danh sách cấu trúc hợp lệ cho game
   * @returns {Array}
   */
  getEligibleStructures() {
    return this.allStructures.filter((item) => {
      if (item.game && typeof item.game.findPart === 'boolean') {
        return item.game.findPart;
      }
      return !item.isInternal;
    });
  }

  /**
   * Kiểm tra xem mô hình hiện tại có đủ cấu trúc để chơi game không
   * @returns {boolean}
   */
  canPlay() {
    return this.getEligibleStructures().length > 0;
  }

  /**
   * Khởi động một lượt chơi mới
   * @returns {Object|null} Câu hỏi đầu tiên hoặc null nếu không đủ dữ liệu
   */
  start() {
    const eligible = this.getEligibleStructures();
    if (!eligible.length) {
      console.warn('FindThePartGame: Không có cấu trúc giải phẫu hợp lệ để tạo câu hỏi.');
      return null;
    }

    // Xáo trộn ngẫu nhiên (Fisher-Yates shuffle)
    const shuffled = [...eligible];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Giới hạn số câu hỏi (mặc định tối đa 5 câu, không trùng lặp)
    const count = Math.min(this.maxQuestions, shuffled.length);
    this.questions = shuffled.slice(0, count);

    this.currentQuestionIndex = 0;
    this.score = 0;
    this.results = [];
    this.isActive = true;
    this.phase = 'question';
    this.isLocked = false;
    this.currentReviewIndex = 0;

    this._notify();
    return this.getCurrentQuestion();
  }

  /**
   * Lấy dữ liệu câu hỏi hiện tại
   * @returns {Object|null}
   */
  getCurrentQuestion() {
    if (!this.questions.length || this.currentQuestionIndex >= this.questions.length) {
      return null;
    }
    return this.questions[this.currentQuestionIndex];
  }

  /**
   * Nộp câu trả lời khi người dùng bấm vào một bộ phận / hotspot 3D
   * Quy tắc quan trọng: 1 lần chọn = 1 câu trả lời cuối cùng cho câu hỏi đó
   * @param {string} selectedPartId - ID bộ phận mà học sinh chọn
   * @param {string} [selectedPartName] - Tên hiển thị của bộ phận học sinh chọn
   * @returns {Object|null} Kết quả đánh giá
   */
  submitAnswer(selectedPartId, selectedPartName = '') {
    if (!this.isActive || this.phase !== 'question' || this.isLocked) {
      return null;
    }

    const target = this.getCurrentQuestion();
    if (!target) return null;

    // Fail-safe (Section 9): Ignore click if selectedPartId is falsy or null
    if (!selectedPartId) {
      return null;
    }

    // Resolve canonical structure for target and selected
    const targetStructure = this.allStructures.find((s) => s.id === target.id) || target;
    const selectedStructure = this.allStructures.find(
      (s) => s.id === selectedPartId || (s.aliases && s.aliases.includes(selectedPartId))
    ) || null;

    // If selectedPartId is unverified and cannot be resolved in structures, fail-safe ignore
    if (!selectedStructure && this.allStructures.length > 0) {
      return null;
    }

    const canonicalTargetId = targetStructure.id;
    const canonicalSelectedId = selectedStructure ? selectedStructure.id : String(selectedPartId);

    // Section 8: Exact canonical ID comparison (with name equivalence guarantee)
    const isNameEquivalent = Boolean(
      (selectedStructure?.name && targetStructure?.name && selectedStructure.name.trim().toLowerCase() === targetStructure.name.trim().toLowerCase()) ||
      (selectedPartName && targetStructure?.name && selectedPartName.trim().toLowerCase() === targetStructure.name.trim().toLowerCase())
    );
    const isCorrect = (canonicalSelectedId === canonicalTargetId) || isNameEquivalent;
    if (isCorrect) {
      this.score += 100;
    }

    // Khóa ngay lập tức để chống click liên tiếp / đoán mò
    this.isLocked = true;

    // Section 7: Always resolve full canonical anatomical labels
    const targetLabel = targetStructure.name || target.name;
    const selectedLabel = selectedStructure?.name || selectedPartName || 'Chưa xác định';

    const record = {
      index: this.currentQuestionIndex,
      targetId: canonicalTargetId,
      targetName: targetLabel,
      targetLatin: targetStructure.latin || target.latin || '',
      selectedId: canonicalSelectedId,
      selectedName: selectedLabel,
      isCorrect,
      targetData: targetStructure
    };
    this.results.push(record);

    this.phase = 'feedback';
    this._notify();

    return {
      isCorrect,
      target: targetStructure,
      selectedPartId: canonicalSelectedId,
      selectedPartName: record.selectedName,
      score: this.score,
      isLastQuestion: (this.currentQuestionIndex === this.questions.length - 1)
    };
  }

  /**
   * Chuyển sang câu hỏi tiếp theo hoặc kết thúc game
   * @returns {Object}
   */
  nextQuestion() {
    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex++;
      this.phase = 'question';
      this.isLocked = false;
      this._notify();
      return {
        finished: false,
        question: this.getCurrentQuestion(),
        index: this.currentQuestionIndex,
        total: this.questions.length
      };
    }

    // Đã hoàn thành câu hỏi cuối cùng
    this.phase = 'finished';
    this.isLocked = true;
    this._notify();
    return {
      finished: true,
      summary: this.getSummary()
    };
  }

  /**
   * Lấy tổng kết điểm và kết quả của toàn bộ lượt chơi
   * @returns {Object}
   */
  getSummary() {
    const total = this.questions.length;
    const correctCount = this.results.filter((r) => r.isCorrect).length;
    const maxScore = total * 100;
    const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    let message = '';
    let icon = 'sentiment_satisfied';
    if (percentage === 100) {
      message = 'Xuất sắc! Bạn đã nhận diện rất tốt toàn bộ các bộ phận.';
      icon = 'workspace_premium';
    } else if (percentage >= 60) {
      message = 'Rất tốt! Bạn nắm khá vững vị trí các cơ quan. Hãy xem lại những phần còn nhầm nhé.';
      icon = 'thumb_up';
    } else {
      message = 'Tiếp tục khám phá mô hình 3D rồi thử sức lại nhé!';
      icon = 'school';
    }

    return {
      total,
      correctCount,
      wrongCount: total - correctCount,
      score: this.score,
      maxScore,
      percentage,
      message,
      icon,
      results: this.results,
      modelTitle: this.modelTitle
    };
  }

  /**
   * Bắt đầu chế độ xem lại đáp án
   * @param {number} [index=0] - Chỉ số câu hỏi muốn xem lại
   */
  startReview(index = 0) {
    this.phase = 'review';
    this.currentReviewIndex = Math.max(0, Math.min(index, this.results.length - 1));
    this._notify();
  }

  /**
   * Chọn câu hỏi cần xem lại trong chế độ Review
   * @param {number} index
   * @returns {Object|null}
   */
  setReviewIndex(index) {
    if (index >= 0 && index < this.results.length) {
      this.currentReviewIndex = index;
      this._notify();
      return this.results[index];
    }
    return null;
  }

  /**
   * Thoát khỏi chế độ game và đặt lại toàn bộ trạng thái
   */
  exit() {
    this.isActive = false;
    this.phase = 'idle';
    this.isLocked = false;
    this.questions = [];
    this.currentQuestionIndex = 0;
    this.results = [];
    this.score = 0;
    this._notify();
  }

  /**
   * Báo cáo cập nhật trạng thái ra bên ngoài
   * @private
   */
  _notify() {
    if (typeof this.onStateChange === 'function') {
      this.onStateChange({
        isActive: this.isActive,
        phase: this.phase,
        question: this.getCurrentQuestion(),
        index: this.currentQuestionIndex,
        total: this.questions.length,
        score: this.score,
        results: this.results,
        isLocked: this.isLocked,
        currentReviewIndex: this.currentReviewIndex,
        summary: this.phase === 'finished' ? this.getSummary() : null
      });
    }
  }
}

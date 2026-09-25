# ĐỀ XUẤT BỔ SUNG API ENDPOINTS CHO PHÂN HỆ KHẢO THÍ HỌC SINH (STUDENT EXAM SYSTEM)

> **Dự án:** BioVerse (`EXE101_group_project_BE` & `Frontend_Bioverse`)  
> **Tài liệu tham chiếu:** [EXAM_API_DOCUMENTATION.md](file:///d:/university/EXE101-201/project/FE/EXAM_API_DOCUMENTATION.md)  
> **Người đề xuất:** Antigravity AI Assistant  
> **Mục tiêu:** Cung cấp giải pháp bảo mật chống gian lận (Anti-Cheat), cơ chế chấm điểm bảo mật phía Server (Server-Side Grading) và quản lý lịch sử khảo thí học sinh.

---

## 1. TỔNG QUAN VẤN ĐỀ HIỆN TẠI TRONG `EXAM_API_DOCUMENTATION.md`

Tài liệu hiện tại [EXAM_API_DOCUMENTATION.md](file:///d:/university/EXE101-201/project/FE/EXAM_API_DOCUMENTATION.md) đã bao phủ rất tốt các API phục vụ **Admin / Quản trị viên** (CRUD khối lớp, học kỳ, môn học, tạo đề thi, ngân hàng câu hỏi, builder). Tuy nhiên, đối với luồng **Học sinh làm bài thi (Student Exam Flow)**, đang tồn tại các lỗ hổng kiến trúc sau:

1. **Lộ đáp án qua Network (Lỗ hổng Anti-Cheat):**
   - Hiện tại, Client lấy câu hỏi qua `GET /api/questions/exam/{id}` hoặc `GET /api/exams/{id}/builder`. Các API này trả về cả `isCorrect: true/false` và `explain`/`explanation`.
   - Bất kỳ học sinh nào mở **F12 / Inspect Network Tab** đều có thể thấy ngay đáp án đúng trước khi làm bài.
2. **Chấm điểm hoàn toàn ở Client (Thiếu Server-Side Grading):**
   - Hiện tại Frontend tự so khớp đáp án bằng JavaScript và lưu tạm vào `localStorage`. Điểm số này không được lưu vào cơ sở dữ liệu BE, không gắn liền với tài khoản học sinh, không thể dùng làm dữ liệu báo cáo cho giáo viên/phụ huynh.
3. **Chưa có lưu trữ lịch sử bài thi (`ExamAttempt`):**
   - Học sinh sau khi nộp bài không thể tra cứu lại các đề đã làm trong quá khứ, không có biểu đồ tiến độ học tập.

---

## 2. DANH SÁCH API ĐỀ XUẤT BỔ SUNG CHO HỌC SINH

```
┌────────────────────────────────────────────────────────────────────────┐
│                        STUDENT EXAM WORKFLOW                           │
│                                                                        │
│ 1. GET /api/student/exams/{id}/paper       (Lấy đề thi bảo mật)        │
│                    │                                                   │
│                    ▼                                                   │
│ 2. POST /api/student/exams/{id}/submit     (Nộp bài & Server chấm điểm)│
│                    │                                                   │
│                    ▼                                                   │
│ 3. GET /api/student/exam-attempts/{id}     (Xem lại bài & Lời giải)    │
│                    │                                                   │
│                    ▼                                                   │
│ 4. GET /api/student/exam-attempts/history  (Lịch sử & Tiến độ học tập) │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 2.1. `GET /api/student/exams/{id}/paper` - Lấy đề thi bảo mật cho học sinh

- **Chức năng:** Trả về danh sách câu hỏi và các phương án trả lời **đã được loại bỏ thuộc tính `isCorrect` và `explanation`** để đảm bảo học sinh không thể gian lận qua F12 DevTools.
- **Header:** `Authorization: Bearer <token>`
- **Path Variable:** `id` (`Long`) - ID của đề thi.
- **Output:** `ApiResponse<StudentExamPaperResponse>`

```json
{
  "code": 1000,
  "message": "Thành công",
  "data": {
    "examId": 12,
    "code": "DE_GK1_KHTN6_01",
    "title": "Đề thi giữa kì 1 KHTN 6 Kết nối tri thức - Đề số 1",
    "subjectName": "Khoa học Tự nhiên",
    "durationMinutes": 45,
    "totalQuestions": 40,
    "questions": [
      {
        "id": 101,
        "order": 1,
        "content": "Để đo chiều dài của một vật, người ta dùng dụng cụ nào?",
        "point": 0.25,
        "images": [
          { "id": 1, "url": "https://res.cloudinary.com/.../ruler.png", "name": "Thước cuộn" }
        ],
        "answers": [
          { "id": 501, "content": "Thước kẻ" },
          { "id": 502, "content": "Cân đồng hồ" },
          { "id": 503, "content": "Nhiệt kế" },
          { "id": 504, "content": "Bình chia độ" }
        ]
        /* CHÚ Ý: isCorrect và explanation bị loại bỏ hoàn toàn tại đây */
      }
    ]
  }
}
```

---

### 2.2. `POST /api/student/exams/{id}/submit` - Nộp bài thi và Chấm điểm tự động trên Server

- **Chức năng:** Học sinh nộp danh sách đáp án đã chọn. Server tự động tính điểm theo thang 10, tính số câu đúng/sai, ghi nhận thời gian làm bài, tạo bản ghi `ExamAttempt` và trả về kết quả ngay lập tức.
- **Header:** `Authorization: Bearer <token>`
- **Path Variable:** `id` (`Long`) - ID đề thi.
- **Request Body:**
```json
{
  "timeSpentSeconds": 1345,
  "answers": [
    { "questionId": 101, "selectedAnswerId": 501 },
    { "questionId": 102, "selectedAnswerId": 506 },
    { "questionId": 103, "selectedAnswerId": null }
  ]
}
```
- **Validation Rules:**
  - `timeSpentSeconds`: `@NotNull`, `@Min(0)`
  - `answers`: `@NotNull`, `@Valid`
  - `answers[].questionId`: `@NotNull`, `@Positive`
- **Output:** `ApiResponse<StudentExamSubmitResultResponse>`
```json
{
  "code": 1000,
  "message": "Nộp bài thi thành công",
  "data": {
    "attemptId": 894,
    "examId": 12,
    "examTitle": "Đề thi giữa kì 1 KHTN 6 Kết nối tri thức - Đề số 1",
    "score10": 8.5,
    "totalQuestions": 40,
    "correctCount": 34,
    "wrongCount": 4,
    "unansweredCount": 2,
    "timeSpentSeconds": 1345,
    "submittedAt": "2026-09-25T21:40:00",
    "xpEarned": 85
  }
}
```

---

### 2.3. `GET /api/student/exam-attempts/{attemptId}` - Xem lại bài làm chi tiết & Lời giải

- **Chức năng:** Sau khi nộp bài thành công (hoặc khi học sinh xem lại bài cũ trong lịch sử), API này sẽ trả về toàn bộ dữ liệu đối chiếu: học sinh đã chọn phương án nào, đáp án nào mới là đáp án đúng, và **Lời giải chi tiết (`explanation`)**.
- **Header:** `Authorization: Bearer <token>`
- **Path Variable:** `attemptId` (`Long`) - ID lần làm bài.
- **Output:** `ApiResponse<StudentAttemptDetailResponse>`
```json
{
  "code": 1000,
  "message": "Thành công",
  "data": {
    "attemptId": 894,
    "examId": 12,
    "examTitle": "Đề thi giữa kì 1 KHTN 6",
    "score10": 8.5,
    "correctCount": 34,
    "totalQuestions": 40,
    "timeSpentSeconds": 1345,
    "questions": [
      {
        "questionId": 101,
        "content": "Để đo chiều dài của một vật, người ta dùng dụng cụ nào?",
        "userAnswerId": 501,
        "correctAnswerId": 501,
        "isUserCorrect": true,
        "pointEarned": 0.25,
        "explanation": "Thước là dụng cụ chuyên dùng để đo độ dài trong hệ đo lường chuẩn SGK KHTN 6 (Chương I).",
        "answers": [
          { "id": 501, "content": "Thước kẻ", "isCorrect": true },
          { "id": 502, "content": "Cân đồng hồ", "isCorrect": false },
          { "id": 503, "content": "Nhiệt kế", "isCorrect": false },
          { "id": 504, "content": "Bình chia độ", "isCorrect": false }
        ]
      }
    ]
  }
}
```

---

### 2.4. `GET /api/student/exam-attempts/my-history` - Lịch sử làm bài thi của học sinh

- **Chức năng:** Trả về danh sách tất cả các bài thi mà học sinh đang đăng nhập đã hoàn thành, phục vụ trang cá nhân và theo dõi lộ trình tiến bộ.
- **Header:** `Authorization: Bearer <token>`
- **Query Params:**
  - `page` (int, default: 0)
  - `size` (int, default: 10)
  - `subjectId` (Long, optional)
- **Output:** `ApiResponse<PageResponse<StudentAttemptSummaryResponse>>`
```json
{
  "code": 1000,
  "message": "Thành công",
  "data": {
    "items": [
      {
        "attemptId": 894,
        "examId": 12,
        "examCode": "DE_GK1_KHTN6_01",
        "examTitle": "Đề thi giữa kì 1 KHTN 6 Kết nối tri thức - Đề số 1",
        "subjectName": "Khoa học Tự nhiên",
        "score10": 8.5,
        "correctCount": 34,
        "totalQuestions": 40,
        "timeSpentSeconds": 1345,
        "submittedAt": "2026-09-25T21:40:00"
      }
    ],
    "page": 0,
    "size": 10,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

---

## 3. KHUYẾN NGHỊ THIẾT KẾ ENTITY PHÍA BACKEND (`ExamAttempt`)

Để hỗ trợ 4 API trên, Backend chỉ cần thêm 2 Entity đơn giản:

```java
@Entity
@Table(name = "exam_attempts")
public class ExamAttempt {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false)
    private Exam exam;

    private Double score10;
    private Integer correctCount;
    private Integer totalQuestions;
    private Integer timeSpentSeconds;

    @CreationTimestamp
    private LocalDateTime submittedAt;

    @OneToMany(mappedBy = "attempt", cascade = CascadeType.ALL)
    private List<ExamAttemptDetail> details = new ArrayList<>();
}
```

```java
@Entity
@Table(name = "exam_attempt_details")
public class ExamAttemptDetail {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attempt_id")
    private ExamAttempt attempt;

    private Long questionId;
    private Long selectedAnswerId;
    private Boolean isCorrect;
    private Double pointEarned;
}
```

---

## 4. KHẢ NĂNG TƯƠNG THÍCH TRÊN FRONTEND HIỆN TẠI

- Giao diện `pages/exams.html` và file điều khiển `src/features/exams/exams.js` hiện tại **đã được thiết kế theo cơ chế Hybrid**:
  1. Khi chưa có API riêng cho học sinh: Tự động dùng `GET /api/questions/exam/{id}` và chấm điểm client-side mượt mà, lưu vào `localStorage` qua `progressService`.
  2. Ngay khi Backend bổ sung các endpoint trên: Chỉ cần thay đổi URL endpoint mà không cần chỉnh sửa lại bất kỳ cấu trúc HTML nào.

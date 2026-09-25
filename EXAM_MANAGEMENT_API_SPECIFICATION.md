# ĐẶC TẢ YÊU CẦU API ENDPOINTS: QUẢN TRỊ ĐỀ THI & BIÊN SOẠN CÂU HỎI
> **Dự án:** BioVerse 3D STEM Platform  
> **Phân hệ:** Quản Trị Đề Thi & Soạn Thảo Câu Hỏi (`Admin Exam & Question Authoring Studio`)  
> **Tài liệu tham chiếu:** `EXAM_API_DOCUMENTATION.md`, `EXAM_ENTITY_DOCUMENTATION.md`, `ARCHITECTURE.md`

---

## 1. TỔNG QUAN PHÂN HỆ & BỐI CẢNH NGHIỆP VỤ

Giao diện **"Quản Trị Đề Thi & Biên Soạn Câu Hỏi"** được thiết kế phục vụ 2 tác vụ cốt lõi của Quản trị viên / Giáo viên:
1. **Danh mục & Quản lý Đề thi (Exam Catalog):** Tìm kiếm, lọc theo khối/môn, theo dõi trạng thái đề thi, số lượng câu hỏi, tổng điểm, thời gian làm bài, tạo mới, chỉnh sửa thông tin chung hoặc nhân bản đề thi.
2. **Xưởng Biên soạn Câu hỏi (Exam Studio / Question Builder):** Biên soạn nội dung câu hỏi, công thức toán/hóa học, gắn hình ảnh minh họa 2D/3D, soạn danh sách đáp án, chỉ định đáp án đúng, phân bổ điểm số (`point`) và sắp xếp thứ tự câu hỏi (`questionOrder`).

Để giao diện hoạt động mượt mà, trực quan, **tránh tình trạng gọi quá nhiều request rời rạc (N+1 Query Problem)** và hiển thị đầy đủ các badge thống kê (như `40 câu hỏi`, `Tổng điểm 10.0`), hệ thống API backend cần cung cấp các nhóm endpoint chuyên biệt dưới đây.

---

## 2. MA TRẬN CÁC ENDPOINT CẦN THIẾT

| STT | Phương thức | Endpoint URI | Mục đích nghiệp vụ | Điểm dữ liệu then chốt trả về |
|:---:|:---:|:---|:---|:---|
| **I** | **QUẢN LÝ DANH MỤC ĐỀ THI (EXAM CATALOG)** | | | |
| 1 | `GET` | `/api/exams` | Lấy danh sách đề thi (phân trang, lọc theo môn, khối, kỳ, tìm kiếm) | Danh sách đề kèm `questionCount`, `totalPoints`, `subjectName`, `grade` |
| 2 | `GET` | `/api/exams/{id}` | Lấy thông tin cơ bản một đề thi | Chi tiết cấu hình đề: tiêu đề, mã, thời gian, trạng thái |
| 3 | `POST` | `/api/exams` | Tạo mới đề thi | Thông tin đề thi vừa tạo kèm ID |
| 4 | `PUT` | `/api/exams/{id}` | Cập nhật thông tin cơ bản đề thi | Thông tin đề thi sau cập nhật |
| 5 | `DELETE` | `/api/exams/{id}` | Xóa đề thi (Soft delete hoặc Hard delete) | Trạng thái xóa, cảnh báo nếu đã có học sinh làm bài |
| 6 | `POST` | `/api/exams/{id}/duplicate` | Nhân bản đề thi (sao chép toàn bộ câu hỏi sang đề mới) | Đề thi mới được tạo với mã đề và câu hỏi kế thừa |
| **II** | **XƯỞNG BIÊN SOẠN CÂU HỎI (EXAM STUDIO / QUESTION BUILDER)** | | | |
| 7 | `GET` | `/api/exams/{id}/builder` | **[Quan trọng nhất]** Lấy toàn bộ cây cấu trúc đề thi để hiển thị giao diện soạn thảo | Cây lồng nhau: Đề thi ➔ Câu hỏi (kèm order, point) ➔ Đáp án (kèm isCorrect) ➔ Hình ảnh |
| 8 | `PUT` | `/api/exams/{id}/questions/reorder` | Cập nhật lại thứ tự câu hỏi & phân bổ điểm số hàng loạt | Danh sách thứ tự và điểm số mới |
| 9 | `POST` | `/api/exams/{id}/questions` | Tạo câu hỏi mới và tự động gắn vào đề thi này | Câu hỏi mới kèm các đáp án và liên kết `examQuestion` |
| 10 | `DELETE` | `/api/exams/{id}/questions/{questionId}` | Gỡ câu hỏi ra khỏi đề thi (xóa liên kết `exam_question`) | Trạng thái gỡ câu hỏi |
| **III** | **NGÂN HÀNG CÂU HỎI & SOẠN THẢO CHI TIẾT (QUESTION & ANSWER CRUD)** | | | |
| 11 | `GET` | `/api/questions/bank` | Tìm kiếm ngân hàng câu hỏi để tái sử dụng / chèn vào đề | Danh sách câu hỏi kèm bộ lọc độ khó, chủ đề, môn học |
| 12 | `POST` | `/api/exams/{id}/questions/pick-from-bank` | Gắn một hoặc nhiều câu hỏi có sẵn từ kho vào đề thi | Danh sách liên kết mới tạo trong đề |
| 13 | `PUT` | `/api/questions/{id}` | Cập nhật nội dung câu hỏi, độ khó, lời giải thích | Chi tiết câu hỏi sau cập nhật |
| 14 | `POST` | `/api/questions/{questionId}/answers` | Thêm đáp án cho câu hỏi | Đáp án mới kèm ID |
| 15 | `PUT` | `/api/answers/{id}` | Sửa nội dung đáp án, cờ `isCorrect`, lời giải thích | Chi tiết đáp án sau cập nhật |
| 16 | `DELETE` | `/api/answers/{id}` | Xóa đáp án khỏi câu hỏi | Trạng thái xóa |
| **IV** | **QUẢN LÝ MEDIA & HÌNH ẢNH MINH HỌA (IMAGE MANAGEMENT)** | | | |
| 17 | `POST` | `/api/media/upload` | Upload file ảnh trực tiếp (Multipart `image/png`, `image/jpeg`) | `imageUrl`, `fileSize`, `dimensions` trên CDN/S3 |
| 18 | `POST` | `/api/question-images` | Gắn URL hình ảnh vào câu hỏi (kèm caption, order) | Bản ghi `QuestionImage` mới |
| 19 | `DELETE` | `/api/question-images/{id}` | Xóa hình ảnh của câu hỏi | Trạng thái xóa |
| 20 | `POST` | `/api/answer-images` | Gắn URL hình ảnh vào đáp án | Bản ghi `AnswerImage` mới |
| 21 | `DELETE` | `/api/answer-images/{id}` | Xóa hình ảnh của đáp án | Trạng thái xóa |
| **V** | **DỮ LIỆU DANH MỤC TRỢ GIÚP BỘ LỌC (METADATA & TAXONOMY)** | | | |
| 22 | `GET` | `/api/subjects` | Lấy danh sách môn học kèm tên khối/học kỳ để đổ vào dropdown bộ lọc | Danh sách `Subject` (id, name, code, semester, grade) |

---

## 3. CHI TIẾT CÁC ENDPOINT QUAN TRỌNG NHẤT & CẤU TRÚC DỮ LIỆU TRẢ VỀ

### 3.1. Endpoint 1: Lấy danh sách đề thi (`GET /api/exams`)

- **Mục đích:** Hiển thị lưới danh sách thẻ đề thi tại trang `/admin-exams` (như trong ảnh mockup).
- **Query Parameters:**
  - `page`: Số trang (mặc định: `0`)
  - `size`: Số phần tử/trang (mặc định: `12`)
  - `search`: Từ khóa tìm theo mã đề (`code`) hoặc tiêu đề (`title`)
  - `subjectId`: Lọc theo môn học cụ thể
  - `grade`: Lọc theo khối lớp (6, 7, 8, 9)
  - `sort`: Tiêu chí sắp xếp (ví dụ: `createdAt,desc`)

- **Cấu trúc DTO trả về (Response Payload):**
```json
{
  "code": 1000,
  "message": "Lấy danh sách đề thi thành công",
  "data": {
    "content": [
      {
        "id": "ex_001",
        "code": "DE_GK1_KHTN6_01",
        "title": "Đề thi giữa kì 1 KHTN 6 Kết nối tri thức - Đề số 1",
        "description": "Đề kiểm tra giữa học kì 1 gồm 40 câu trắc nghiệm khách quan chuẩn SGK Kết nối tri thức.",
        "duration": 45,
        "maxScore": 10.0,
        "status": "PUBLISHED",
        "subject": {
          "id": "sub_khtn_6",
          "name": "Khoa học Tự nhiên",
          "code": "KHTN6",
          "grade": 6,
          "semester": "Học kỳ 1"
        },
        "stats": {
          "questionCount": 40,
          "totalAssignedPoints": 10.0,
          "participantCount": 128,
          "averageScore": 7.85
        },
        "createdAt": "2026-09-15T08:30:00Z",
        "updatedAt": "2026-09-20T14:10:00Z"
      }
    ],
    "page": {
      "number": 0,
      "size": 12,
      "totalElements": 24,
      "totalPages": 2
    }
  }
}
```

> **Tại sao cần các trường này?**
> - `stats.questionCount`: **Bắt buộc** để giải quyết lỗi thẻ đề thi luôn hiển thị `(0 câu hỏi)` trên UI.
> - `subject`: Trả về trực tiếp object môn học (kèm `grade` và `semester`) để giao diện hiển thị badge màu xanh lá "Khoa học Tự nhiên" mà không cần gọi thêm API tra cứu môn học.
> - `stats.totalAssignedPoints`: Giúp quản trị viên phát hiện ngay đề thi chưa được cấu hình đủ 10 điểm.

---

### 3.2. Endpoint 2: Cây cấu trúc Đề thi phục vụ Xưởng biên soạn (`GET /api/exams/{id}/builder`)

- **Mục đích:** Khi người dùng click nút **"Soạn câu hỏi"**, giao diện chuyển sang chế độ Studio Builder. Endpoint này nạp toàn bộ cấu trúc câu hỏi, đáp án, hình ảnh và cơ cấu điểm trong một lần gọi duy nhất.
- **URL:** `GET /api/exams/{id}/builder` hoặc `GET /api/exams/{id}/full-detail`

- **Cấu trúc DTO trả về (Response Payload):**
```json
{
  "code": 1000,
  "message": "Nạp dữ liệu đề thi thành công",
  "data": {
    "exam": {
      "id": "ex_001",
      "code": "DE_GK1_KHTN6_01",
      "title": "Đề thi giữa kì 1 KHTN 6 Kết nối tri thức - Đề số 1",
      "duration": 45,
      "maxScore": 10.0,
      "subjectName": "Khoa học Tự nhiên 6",
      "status": "DRAFT"
    },
    "summary": {
      "totalQuestions": 2,
      "totalPoints": 0.5,
      "isValidTotalPoints": false
    },
    "questions": [
      {
        "examQuestionId": "eq_01",
        "questionId": "q_101",
        "questionOrder": 1,
        "point": 0.25,
        "content": "Cơ quan nào sau đây ở người thực hiện chức năng lọc máu và bài tiết nước tiểu?",
        "difficultyLevel": "EASY",
        "topic": "Hệ bài tiết người",
        "explanation": "Thận là cơ quan chính trong hệ bài tiết nước tiểu có chức năng lọc máu tạo thành nước tiểu.",
        "images": [
          {
            "id": "qimg_01",
            "imageUrl": "https://cdn.bioverse.edu.vn/images/than-nguoi-2d.png",
            "caption": "Sơ đồ cấu tạo hệ bài tiết người",
            "imageOrder": 1
          }
        ],
        "answers": [
          {
            "id": "ans_101_1",
            "content": "Thận",
            "isCorrect": true,
            "answerOrder": 1,
            "explanation": "Đáp án đúng: Thận lọc và tạo nước tiểu.",
            "images": []
          },
          {
            "id": "ans_101_2",
            "content": "Dạ dày",
            "isCorrect": false,
            "answerOrder": 2,
            "explanation": "Dạ dày thuộc hệ tiêu hóa.",
            "images": []
          },
          {
            "id": "ans_101_3",
            "content": "Phổi",
            "isCorrect": false,
            "answerOrder": 3,
            "explanation": "Phổi thuộc hệ hô hấp.",
            "images": []
          },
          {
            "id": "ans_101_4",
            "content": "Tim",
            "isCorrect": false,
            "answerOrder": 4,
            "explanation": "Tim thuộc hệ tuần hoàn.",
            "images": []
          }
        ]
      }
    ]
  }
}
```

> **Lợi ích kiến trúc của Endpoint này:**
> 1. **Hiệu năng vượt trội:** Frontend chỉ cần gửi đúng **1 request** là có thể dựng hoàn chỉnh toàn bộ danh sách 40 câu hỏi, các hình ảnh và các nút chọn radio đáp án đúng.
> 2. **Kiểm tra nghiệp vụ tức thì:** Trường `summary.totalPoints` và `summary.isValidTotalPoints` giúp frontend cảnh báo ngay cho quản trị viên nếu tổng điểm chưa khớp với `maxScore` (ví dụ: mới được 9.5/10 điểm).

---

### 3.3. Endpoint 3: Tạo câu hỏi nguyên khối kèm đáp án (`POST /api/exams/{id}/questions/composite`)

- **Mục đích:** Khi người dùng bấm nút **"+ Thêm câu hỏi"** trong màn hình Soạn thảo, gửi toàn bộ nội dung câu hỏi, các lựa chọn A, B, C, D và đáp án đúng trong **một transaction duy nhất**, thay vì phải gọi lần lượt 6 API (`POST /questions` ➔ `POST /exam-questions` ➔ 4 lần `POST /answers`).

- **Request Body (JSON):**
```json
{
  "content": "Đơn vị cấu tạo cơ bản của mọi cơ thể sống là gì?",
  "point": 0.25,
  "difficultyLevel": "EASY",
  "explanation": "Tế bào là đơn vị cơ bản cấu tạo nên mọi sinh vật sống.",
  "images": [
    {
      "imageUrl": "https://cdn.bioverse.edu.vn/images/cell_diagram.png",
      "caption": "Hình ảnh kính hiển vi tế bào thực vật"
    }
  ],
  "answers": [
    { "content": "Tế bào", "isCorrect": true, "explanation": "Chính xác" },
    { "content": "Mô", "isCorrect": false },
    { "content": "Cơ quan", "isCorrect": false },
    { "content": "Hệ cơ quan", "isCorrect": false }
  ]
}
```

- **Response Payload:**
```json
{
  "code": 1000,
  "message": "Thêm câu hỏi vào đề thi thành công",
  "data": {
    "examQuestionId": "eq_02",
    "questionId": "q_102",
    "questionOrder": 2,
    "point": 0.25,
    "content": "Đơn vị cấu tạo cơ bản của mọi cơ thể sống là gì?",
    "answersCount": 4
  }
}
```

---

### 3.4. Endpoint 4: Sắp xếp thứ tự & Phân bổ lại điểm số (`PUT /api/exams/{id}/questions/reorder`)

- **Mục đích:** Khi giáo viên kéo thả (drag & drop) đổi vị trí câu hỏi trên giao diện, hoặc bấm nút "Chia đều điểm số cho tất cả câu hỏi".

- **Request Body (JSON):**
```json
{
  "items": [
    { "examQuestionId": "eq_01", "newOrder": 1, "point": 0.5 },
    { "examQuestionId": "eq_02", "newOrder": 2, "point": 0.5 }
  ]
}
```

- **Response Payload:**
```json
{
  "code": 1000,
  "message": "Cập nhật thứ tự và phân bổ điểm thành công",
  "data": {
    "totalQuestions": 2,
    "totalPoints": 1.0
  }
}
```

---

### 3.5. Endpoint 5: Upload tệp hình ảnh minh họa (`POST /api/media/upload`)

- **Mục đích:** Cho phép kéo thả hình ảnh từ máy tính để đính kèm vào câu hỏi hoặc đáp án, thay vì bắt giáo viên phải tự tìm URL ảnh bên ngoài.
- **Content-Type:** `multipart/form-data`
- **Request Form-Data:**
  - `file`: Tệp nhị phân (`image/png`, `image/jpeg`, `image/webp`, tối đa 5MB)
  - `folder`: Phân mục lưu trữ (ví dụ: `exams/questions` hoặc `exams/answers`)

- **Response Payload:**
```json
{
  "code": 1000,
  "message": "Upload hình ảnh thành công",
  "data": {
    "url": "https://storage.bioverse.edu.vn/uploads/exams/questions/2026/cell_diagram_hd.webp",
    "fileName": "cell_diagram_hd.webp",
    "fileSize": 248102,
    "mimeType": "image/webp",
    "width": 1280,
    "height": 720
  }
}
```

---

### 3.6. Endpoint 6: Sao chép / Nhân bản đề thi (`POST /api/exams/{id}/duplicate`)

- **Mục đích:** Khi giáo viên muốn tạo "Đề số 2", "Đề số 3" hoặc đề kiểm tra kỳ sau dựa trên khung đề cũ. Hệ thống tự động sao chép thông tin đề và clone toàn bộ danh sách câu hỏi liên kết sang đề mới.

- **Request Body (JSON):**
```json
{
  "newCode": "DE_GK1_KHTN6_02",
  "newTitle": "Đề thi giữa kì 1 KHTN 6 Kết nối tri thức - Đề số 2"
}
```

- **Response Payload:**
```json
{
  "code": 1000,
  "message": "Nhân bản đề thi thành công",
  "data": {
    "id": "ex_002",
    "code": "DE_GK1_KHTN6_02",
    "title": "Đề thi giữa kì 1 KHTN 6 Kết nối tri thức - Đề số 2",
    "clonedQuestionsCount": 40
  }
}
```

---

## 4. TỔNG KẾT CÁC CẢI TIẾN TRỌNG TÂM DÀNH CHO BACKEND

Để trang quản trị đạt trải nghiệm người dùng (UX) cao cấp và chuyên nghiệp:
1. **Bổ sung trường `stats.questionCount` và `subject` vào `GET /api/exams`:** Tránh tình trạng frontend phải lặp qua từng đề để đếm câu hỏi hoặc bị hiển thị mặc định `0 câu hỏi`.
2. **Cung cấp Endpoint tổng hợp `GET /api/exams/{id}/builder`:** Gom toàn bộ dữ liệu Đề thi ➔ Câu hỏi ➔ Đáp án ➔ Hình ảnh vào 1 DTO phân cấp, giúp màn hình soạn thảo tải tức thì.
3. **Cung cấp API Composite Create (`POST /api/exams/{id}/questions/composite`):** Tạo câu hỏi và 4 đáp án trong 1 giao dịch cơ sở dữ liệu duy nhất, đảm bảo tính toàn vẹn dữ liệu (Atomicity).
4. **Hỗ trợ Upload File trực tiếp (`POST /api/media/upload`):** Tích hợp Cloud Storage (Firebase Storage / AWS S3 / Cloudinary) giúp giáo viên thao tác kéo thả ảnh trực quan trên trình duyệt.

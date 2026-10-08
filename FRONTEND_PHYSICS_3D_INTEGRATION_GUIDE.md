# 🔬 Hướng dẫn tích hợp Mô hình 3D Vật lý cho Frontend (BioVerse)

Tài liệu này cung cấp đầy đủ thông tin dành cho lập trình viên **Frontend** để kết nối API, lấy dữ liệu và hiển thị các mô hình 3D Vật lý (Lớp 6–8 và Lớp 7–9) lên giao diện người dùng (UI Web).

---

## 📌 1. Thông tin chung & Môi trường

- **Quyền truy cập (Auth):** Các API hiển thị mô hình (`/api/models/**`) là **PUBLIC**, **KHÔNG YÊU CẦU** JWT Token hay đăng nhập.
- **Base API URL:**
  - **Local Development:** `http://localhost:8080`
  - **Production:** `https://bioverse.eraidev.id.vn`
- **Cloudflare R2 CDN Base URL:**
  - `https://pub-b282035203fc485cb0cd7dadcbb4f8ae.r2.dev`
- **Định dạng file 3D:** Chuẩn `.glb` (glTF nhị phân), tối ưu cho WebGL / Three.js / Google `<model-viewer>`.

---

## 📡 2. Danh sách API Endpoints chi tiết

Tất cả phản hồi từ Backend đều được bọc trong cấu trúc chuẩn:
```json
{
  "code": 1000,
  "message": "Thành công",
  "data": { ... }
}
```

---

### 2.1. Lấy danh sách mô hình Vật lý có phân trang & bộ lọc
- **Endpoint:** `GET /api/models/catalog`
- **Mục đích:** Render trang danh mục / thư viện mô hình Vật lý.

#### Query Parameters:
| Param | Kiểu | Bắt buộc | Mặc định | Mô tả |
|---|---|---|---|---|
| `subject` | `string` | **Nên truyền** | - | Truyền `PHYSICS` để chỉ lấy mô hình Vật lý. |
| `grade` | `number` | Không | - | Khối lớp: `6` (Lớp 6-8) hoặc `9` (Lớp 7-9). |
| `category` | `string` | Không | - | Thể loại: `Cơ học`, `Điện học`, `Dụng cụ đo điện`, `Điện từ học`, `Từ học`. |
| `q` | `string` | Không | - | Từ khóa tìm kiếm theo tên hoặc mô tả. |
| `page` | `number` | Không | `0` | Số trang (bắt đầu từ 0). |
| `size` | `number` | Không | `12` | Số lượng phần tử mỗi trang. |

#### Request mẫu:
```http
GET /api/models/catalog?subject=PHYSICS&grade=6&page=0&size=12 HTTP/1.1
Host: localhost:8080
```

#### Response mẫu (`PageResponse<ModelSummaryResponse>`):
```json
{
  "code": 1000,
  "message": "Thành công",
  "data": {
    "content": [
      {
        "id": 11,
        "name": "Hệ Thống Ròng Rọc",
        "nameEn": "Block and Tackle Pulley System",
        "slug": "he-thong-rong-roc",
        "category": "Cơ học",
        "description": "Mô hình 3D hệ thống ròng rọc (palăng / block & tackle) mô phỏng nguyên lý cơ học giảm lực kéo...",
        "grade": 6,
        "subject": "PHYSICS",
        "thumbnailUrl": "https://pub-b282035203fc485cb0cd7dadcbb4f8ae.r2.dev/thumbnails/0feeb96f-90df-4535-9242-377412599138.png",
        "badgeText": "Cơ học",
        "actionText": "Khám phá ngay",
        "actionIcon": "settings",
        "targetMode": "pulley",
        "viewsCount": 150
      }
    ],
    "page": 0,
    "size": 12,
    "totalElements": 12,
    "totalPages": 1,
    "first": true,
    "last": true
  }
}
```

---

### 2.2. Lấy danh sách mô hình nổi bật (Trang chủ)
- **Endpoint:** `GET /api/models/featured`
- **Mục đích:** Hiển thị carousel / banner các mô hình tiêu biểu trên trang chủ.
- **Dữ liệu trả về:** Danh sách `ModelSummaryResponse[]` được đánh dấu `is_featured = true`.
  *(Trong môn Vật lý có sẵn: "Đoàn Tàu Điện Từ Trường" và "Từ Trường Nam Châm Chữ U")*

---

### 2.3. Xem chi tiết mô hình 3D (Đầy đủ URL file `.glb`)
Dùng khi người dùng bấm vào một thẻ card để chuyển sang trang tương tác 3D. Hỗ trợ 2 cách gọi:

1. **Theo Slug (Khuyên dùng cho SEO và URL đẹp):**
   ```http
   GET /api/models/slug/{slug}
   Ví dụ: GET /api/models/slug/he-thong-rong-roc
   ```
2. **Theo ID:**
   ```http
   GET /api/models/detail/{id}
   Ví dụ: GET /api/models/detail/11
   ```

*(Mỗi lần gọi API này, Backend sẽ tự động tăng `viewsCount` thêm 1).*

#### Response mẫu (`ModelDetailResponse`):
```json
{
  "code": 1000,
  "message": "Thành công",
  "data": {
    "id": 11,
    "name": "Hệ Thống Ròng Rọc",
    "nameEn": "Block and Tackle Pulley System",
    "slug": "he-thong-rong-roc",
    "scientificName": null,
    "category": "Cơ học",
    "description": "Mô hình 3D hệ thống ròng rọc (palăng / block & tackle) mô phỏng nguyên lý cơ học giảm lực kéo...",
    "grade": 6,
    "subject": "PHYSICS",
    "badgeText": "Cơ học",
    "actionText": "Khám phá ngay",
    "actionIcon": "settings",
    "targetMode": "pulley",
    
    "modelUrl": "https://pub-b282035203fc485cb0cd7dadcbb4f8ae.r2.dev/lop6-8/block_and_tackle.glb",
    "thumbnailUrl": "https://pub-b282035203fc485cb0cd7dadcbb4f8ae.r2.dev/thumbnails/0feeb96f-90df-4535-9242-377412599138.png",
    "modelFormat": "glb",
    "modelSizeBytes": null,

    "defaultScale": 1.0,
    "defaultRotation": null,
    "cameraPosition": null,
    "annotations": null,

    "viewsCount": 151,
    "isFeatured": false,
    "isActive": true,
    "sortOrder": 1,
    "createdAt": "2026-10-06T09:30:00",
    "updatedAt": "2026-10-06T09:30:00",

    "examId": 25,
    "examCode": "QUIZ_MODEL_he-thong-rong-roc"
  }
}
```

> 💡 **Điểm mấu chốt cho 3D & Quiz:**
> - Trường `modelUrl`: chứa đường dẫn trực tiếp tới file `.glb` trên R2 CDN, truyền thẳng vào Viewer 3D để tải mô hình.
> - Trường `examId` / `examCode`: ID và mã của đề trắc nghiệm tương tác 5 câu hỏi gắn liền với mô hình 3D này.

---

### 2.5. Đề thi trắc nghiệm tương tác 3D (Exam & Quiz Flow)

Mỗi mô hình 3D đều có một bài kiểm tra 5 câu hỏi trắc nghiệm chất lượng cao (thang điểm 10.0, mỗi câu 2.0 điểm) được xây dựng từ module `exam` chuẩn của hệ thống BioVerse.

#### A. Lấy đề thi trắc nghiệm (Anti-Cheat Paper):
Có thể gọi bằng 1 trong 3 cách:
1. `GET /api/models/slug/{slug}/exam` (ví dụ: `/api/models/slug/he-thong-rong-roc/exam`)
2. `GET /api/models/{id}/exam` (ví dụ: `/api/models/11/exam`)
3. `GET /api/student/exams/{examId}/paper` (ví dụ: `/api/student/exams/25/paper`)

**Response mẫu (`StudentExamPaperResponse`):**
```json
{
  "code": 1000,
  "message": "Thành công",
  "data": {
    "examId": 25,
    "code": "QUIZ_MODEL_he-thong-rong-roc",
    "name": "Quiz 3D: Hệ Thống Ròng Rọc",
    "subjectName": "Vật lý",
    "description": "Bộ câu hỏi trắc nghiệm tương tác kiểm tra kiến thức về ròng rọc cố định, ròng rọc động...",
    "durationMinutes": 10,
    "totalScore": 10.0,
    "totalQuestions": 5,
    "questions": [
      {
        "id": 101,
        "questionOrder": 1,
        "type": "SINGLE_CHOICE",
        "point": 2.0,
        "content": "Ròng rọc cố định có tác dụng gì chủ yếu trong thực tế?",
        "answers": [
          { "id": 401, "type": "TEXT", "content": "Cho ta lợi 2 lần về lực nâng." },
          { "id": 402, "type": "TEXT", "content": "Làm thay đổi hướng của lực kéo so với khi kéo trực tiếp mà không làm giảm độ lớn của lực." },
          { "id": 403, "type": "TEXT", "content": "Làm giảm công cơ học cần thực hiện đi một nửa." },
          { "id": 404, "type": "TEXT", "content": "Cho ta lợi cả về lực kéo lẫn quãng đường đi." }
        ]
      }
    ]
  }
}
```
*(Ghi chú: Đề thi chống gian lận giấu trường `is_correct` để tránh học sinh soi đáp án trước khi nộp).*

#### B. Nộp bài kiểm tra & Chấm điểm tự động:
- **Endpoint:** `POST /api/student/exams/{examId}/submit`
- **Headers:** `Authorization: Bearer <token>` (hoặc ẩn danh nếu làm bài tự do)
- **Request Body (`StudentExamSubmitRequest`):**
```json
{
  "answers": [
    { "questionId": 101, "selectedAnswerId": 402 },
    { "questionId": 102, "selectedAnswerId": 405 },
    { "questionId": 103, "selectedAnswerId": 411 },
    { "questionId": 104, "selectedAnswerId": 414 },
    { "questionId": 105, "selectedAnswerId": 418 }
  ],
  "timeSpentSec": 150
}
```

- **Response:**
  - Điểm số học sinh đạt được (thang 10).
  - Số câu đúng/sai.
  - Điểm kinh nghiệm (XP) và streak được cộng thêm.
  - Toàn bộ lời giải thích khoa học chi tiết (`explanation`) của từng câu hỏi để học sinh ôn tập.

---

### 2.6. Lấy danh sách thể loại môn Vật lý (Tabs / Filter Pills)
- **Endpoint:** `GET /api/models/categories?subject=PHYSICS`
- **Response:**
  ```json
  {
    "code": 1000,
    "message": "Thành công",
    "data": [
      "Cơ học",
      "Điện học",
      "Dụng cụ đo điện",
      "Điện từ học",
      "Từ học"
    ]
  }
  ```

---

## 🛠️ 3. Khai báo TypeScript Interfaces

Frontend có thể copy các interface sau để sử dụng trong dự án (React / Vue / Angular):

```typescript
// types/physicsModel.ts

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

// Thẻ rút gọn dùng cho danh sách / grid card
export interface ModelSummary {
  id: number;
  name: string;
  nameEn: string;
  slug: string;
  category: string;
  description: string;
  grade: number;
  subject: 'PHYSICS' | 'BIOLOGY' | 'CHEMISTRY';
  thumbnailUrl: string;
  badgeText: string;
  actionText: string;
  actionIcon: string;
  targetMode: string;
  viewsCount: number;
}

// Chi tiết đầy đủ dùng cho 3D Viewer & bài học
export interface ModelDetail extends ModelSummary {
  modelUrl: string;
  modelFormat: string;
  modelSizeBytes?: number;
  defaultScale?: number;
  defaultRotation?: string;
  cameraPosition?: string;
  annotations?: string;
  classification?: string;
  funFacts?: string;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
```

---

## 🎮 4. Hướng dẫn nhúng Viewer 3D trên Web

### Cách 1: Sử dụng Google `<model-viewer>` (Khuyên dùng — Đơn giản & mượt mà nhất)

Thư viện `@google/model-viewer` hỗ trợ xoay 360°, phóng to/thu nhỏ, cảm ứng đa điểm, chế độ AR trên điện thoại và tự động quản lý tài nguyên WebGL.

#### 1. Cài đặt:
```bash
npm install @google/model-viewer
```

#### 2. React / Next.js Component mẫu:
```tsx
// components/Model3DViewer.tsx
import React, { useEffect } from 'react';

// Khai báo kiểu cho TypeScript nếu cần
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': any;
    }
  }
}

interface Props {
  modelUrl: string;
  thumbnailUrl: string;
  title: string;
}

export const Model3DViewer: React.FC<Props> = ({ modelUrl, thumbnailUrl, title }) => {
  useEffect(() => {
    // Import Web Component ở client-side
    import('@google/model-viewer');
  }, []);

  return (
    <div className="relative w-full h-[500px] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl">
      <model-viewer
        src={modelUrl}
        poster={thumbnailUrl}
        alt={title}
        auto-rotate
        rotation-per-second="30deg"
        camera-controls
        touch-action="pan-y"
        shadow-intensity="1"
        environment-image="neutral"
        exposure="1.0"
        loading="lazy"
        style={{ width: '100%', height: '100%' }}
      >
        {/* Thanh loading tùy biến */}
        <div slot="poster" className="w-full h-full flex flex-col items-center justify-center bg-slate-900">
          <img src={thumbnailUrl} alt={title} className="max-h-64 object-contain animate-pulse" />
          <p className="mt-4 text-emerald-400 font-medium">Đang tải mô hình 3D...</p>
        </div>
      </model-viewer>
    </div>
  );
};
```

---

### Cách 2: Sử dụng React Three Fiber (Three.js)

Nếu dự án dùng hệ sinh thái Three.js nâng cao:
```bash
npm install three @react-three/fiber @react-three/drei
```

```tsx
import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Stage } from '@react-three/drei';

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

export function ThreeViewer({ modelUrl }: { modelUrl: string }) {
  return (
    <Canvas camera={{ position: [0, 1.5, 4], fov: 50 }}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <Suspense fallback={null}>
        <Stage environment="city" intensity={0.6}>
          <Model url={modelUrl} />
        </Stage>
        <OrbitControls autoRotate enableZoom makeDefault />
      </Suspense>
    </Canvas>
  );
}
```

---

## 📋 5. Bảng tham chiếu 12 Mô hình 3D Vật lý hiện có

Frontend dev có thể dùng bảng này để kiểm tra nhanh hoặc mockup dữ liệu:

| No | Tên mô hình (Tiếng Việt) | Slug | Lớp | Danh mục | Lab Code (`targetMode`) | File 3D (.glb) |
|:---:|---|---|:---:|---|---|---|
| 1 | **Hệ Thống Ròng Rọc** | `he-thong-rong-roc` | 6 | Cơ học | `pulley` | `lop6-8/block_and_tackle.glb` |
| 2 | **Lò Xo Cuộn** | `lo-xo-cuon` | 6 | Cơ học | `spring` | `lop6-8/coil_spring.glb` |
| 3 | **Mạch Điện Cơ Bản** | `mach-dien-co-ban` | 6 | Điện học | `circuit` | `lop6-8/electric_circuit.glb` |
| 4 | **Vôn Kế** | `von-ke` | 6 | Dụng cụ đo điện | `instrument` | `lop6-8/voltmeter.glb` |
| 5 | **Đoàn Tàu Điện Từ Trường** ⭐ | `tau-dien-tu-truong` | 9 | Điện từ học | `magnetic` | `lop7-9/battery_magnetic_train.glb` |
| 6 | **Bo Mạch Nối Dây (Breadboard)** | `breadboard-mach-dien` | 9 | Điện học | `circuit` | `lop7-9/breadboard.glb` |
| 7 | **Cấu Tạo Pin Điện Hóa** | `pin-dien-hoa` | 9 | Điện học | `battery` | `lop7-9/cell_battery__luna_has_gone_prop.glb` |
| 8 | **Từ Trường Nam Châm Chữ U** ⭐ | `nam-cham-mong-ngua` | 9 | Từ học | `magnetic` | `lop7-9/feld-hufeisenmagnet.glb` |
| 9 | **Từ Trường Ống Dây Solenoid** | `tu-truong-cuon-day-solenoid` | 9 | Điện từ học | `solenoid` | `lop7-9/magnetic_field_of_solenoid_by_yuyalyj.glb` |
| 10 | **Đồng Hồ Vạn Năng** | `dong-ho-van-nang` | 9 | Dụng cụ đo điện | `instrument` | `lop7-9/multimeter_-_free.glb` |
| 11 | **Cuộn Dây Điện Solenoid** | `cuon-day-solenoid` | 9 | Điện từ học | `solenoid` | `lop7-9/solenoid_12fbx.glb` |
| 12 | **Vôn Kế Thí Nghiệm Tiêu Chuẩn** | `von-ke-chi-tiet` | 9 | Dụng cụ đo điện | `instrument` | `lop7-9/voltmeter-freepoly.org.glb` |

*(⭐: Đang được bật cờ `is_featured = true` cho trang chủ)*

---

## ⚡ 6. Code mẫu Service gọi API (Axios / Fetch)

```typescript
// services/physicsModelApi.ts
import axios from 'axios';
import { ApiResponse, PageResponse, ModelSummary, ModelDetail } from '../types/physicsModel';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/models`,
  timeout: 10000,
});

export const physicsModelApi = {
  // 1. Lấy danh mục có bộ lọc
  getCatalog: async (params?: { grade?: number; category?: string; q?: string; page?: number; size?: number }) => {
    const res = await api.get<ApiResponse<PageResponse<ModelSummary>>>('/catalog', {
      params: {
        subject: 'PHYSICS',
        ...params,
      },
    });
    return res.data.data;
  },

  // 2. Lấy chi tiết mô hình theo Slug
  getBySlug: async (slug: string) => {
    const res = await api.get<ApiResponse<ModelDetail>>(`/slug/${slug}`);
    return res.data.data;
  },

  // 3. Lấy mô hình nổi bật
  getFeatured: async () => {
    const res = await api.get<ApiResponse<ModelSummary[]>>('/featured');
    return res.data.data;
  },

  // 4. Lấy danh sách thể loại Vật lý
  getCategories: async () => {
    const res = await api.get<ApiResponse<string[]>>('/categories', {
      params: { subject: 'PHYSICS' },
    });
    return res.data.data;
  },
};
```

---

## 💡 7. Các lưu ý quan trọng (Gotchas & Best Practices)

1. **Hiển thị Thumbnail trước khi tải 3D:**
   - File 3D `.glb` có dung lượng từ 1MB – 15MB. Luôn hiển thị `thumbnailUrl` làm placeholder/poster trước khi người dùng bấm tương tác hoặc trong lúc model đang tải.
2. **CORS:**
   - File 3D được host trên Cloudflare R2 Public CDN (`pub-b282035203fc485cb0cd7dadcbb4f8ae.r2.dev`) đã hỗ trợ truy cập trực tiếp từ mọi domain.
3. **Responsive trên Mobile:**
   - Trên màn hình điện thoại, nên đặt thuộc tính `touch-action="pan-y"` trên thẻ `<model-viewer>` để thao tác cuộn trang không bị xung đột với thao tác xoay mô hình 3D.
4. **Tăng lượt xem:**
   - Khi gọi `GET /api/models/slug/{slug}` hoặc `GET /api/models/detail/{id}`, Backend đã tự động tăng bộ đếm lượt xem (`viewsCount`), Frontend không cần gửi thêm request riêng.

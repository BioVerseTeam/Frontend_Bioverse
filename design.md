# CẨM NANG THIẾT KẾ GIAO DIỆN BIOVERSE (DESIGN.MD)
## Hệ Thống Thiết Kế Sổ Tay Khoa Học (Scientific Sketchbook STEM Platform Design System)

> **Mục đích tài liệu:** Đây là bộ quy chuẩn thiết kế duy nhất và toàn diện của nền tảng BioVerse. Mọi trang web mới, tính năng mới hoặc thành phần giao diện (UI Component) khi được tạo ra **bắt buộc phải tuân thủ** các quy tắc, bảng màu, typography và phong cách phác thảo được định nghĩa trong tài liệu này.

---

## 1. Triết Lý & Nhận Diện Cốt Lõi (Core Brand Identity)

### 1.1. Đối tượng người dùng mục tiêu
- **Học sinh Trung học Cơ sở (Lớp 6 – Lớp 9, độ tuổi 11 – 15 tuổi)** tại Việt Nam học môn Khoa học Tự nhiên (KHTN - Sinh học, Hóa học, Vật lý).
- **Giáo viên bộ môn & Phụ huynh** đồng hành cùng học sinh trong các buổi học thực nghiệm ảo.

### 1.2. Cảm xúc & Phong cách chủ đạo (Design Spirit)
- **Tên phong cách:** **Scientific Sketchbook (Phác thảo Sổ tay Phòng Thí Nghiệm STEM)** kết hợp **Neo-Brutalism mềm mại**.
- **Cảm xúc mang lại:** Tò mò, háo hức khám phá, tự tin thử nghiệm và không sợ sai (*Celebrate trial & error*).
- **Tránh xa:** 
  - ❌ Giao diện EdTech công sở cứng nhắc, vô hồn hoặc bảng điều khiển xám xịt.
  - ❌ Nền đen tuyền (#000000) hoặc trắng tinh khiết tuyệt đối (#ffffff) vô trùng của phòng khám y tế.
  - ❌ Hiệu ứng bóng mờ mịn (soft blur / glassmorphism) quá đà làm mất đi chất liệu vật lý của giấy vẽ.
- **Tôn vinh:**
  - ✅ **Chất liệu giấy phác thảo thực tế:** Giấy can ấm áp kết hợp lưới chấm tròn (Dot-grid pattern 24px) như trong sổ tay thí nghiệm bìa cứng.
  - ✅ **Nét mực than chì (Charcoal Ink):** Đường viền dày dặn (2px – 3px solid #2d2d2d), góc bo méo tay tự nhiên không hoàn hảo (`border-radius: 255px 15px 225px 15px/15px 225px 15px 255px`).
  - ✅ **Đổ bóng cứng vật lý (Hard Neo-Brutalist Offset Shadows):** Bóng đổ không nhòe `4px 4px 0px #2d2d2d` tạo cảm giác nổi khối như các tấm bìa, sticker dán chồng lên nhau.
  - ✅ **Ẩn dụ vật lý (Physical Metaphors):** Băng dính Washi dán góc, vết kim kẹp giấy (paperclip), nhãn dán Post-it note vàng, ghim bấm tròn đỏ (pushpin), và các hình vẽ doodle tay (mũi tên nguệch ngoạc, tia sáng lấp lánh, mầm cây).

---

## 2. Bảng Màu Tiêu Chuẩn (Color Tokens & Palette)

### 2.1. Màu nền & Kết cấu giấy (Canvas & Base)
| Token Name | Hex Code | Ứng dụng cụ thể |
| :--- | :--- | :--- |
| **`canvas-base`** | `#fdfbf7` | Nền chính của toàn bộ trang web (màu giấy vẽ ấm). |
| **`dot-grid`** | `#dcd5cb` | Họa tiết lưới chấm 24px x 24px tạo khung hướng dẫn vẽ. |
| **`paper-white`** | `#ffffff` | Ruột thẻ nổi (card body), ô nhập liệu khi focus. |
| **`paper-card-low`** | `#f6f3f2` | Nền thẻ phụ, thẻ phân cấp thấp. |
| **`paper-card-high`** | `#eae7e7` | Nền thanh công cụ, dải phân cách. |
| **`kraft-divider`** | `#e5e0d8` | Màu giấy xi măng (kraft) cho tab sổ tay và dải phân vùng. |

### 2.2. Nét vẽ & Than chì (Ink & Outlines)
| Token Name | Hex Code | Ứng dụng cụ thể |
| :--- | :--- | :--- |
| **`ink-charcoal`** | `#2d2d2d` | Toàn bộ đường viền (borders), văn bản chính, icon nét vẽ tay, bóng đổ cứng. |
| **`ink-pencil-faint`** | `#76716a` | Chữ gợi ý placeholder, thông tin phụ, ngày tháng ghi chép. |

### 2.3. Màu điểm nhấn Bút Dạ & Bút Bi (Pen & Marker Accents)
| Token Name | Hex Code | Ứng dụng cụ thể |
| :--- | :--- | :--- |
| **`marker-red` (Primary)** | `#ff4d4d` | Màu đỏ bút dạ chấm bài của giáo viên. Dùng cho nút kêu gọi hành động chính (CTA), huy hiệu khẩn cấp, ghim bấm. |
| **`primary-container`** | `#db3237` | Nền header, icon container nổi bật. |
| **`ballpoint-blue` (Secondary)** | `#2d5da1` / `#2e5ea2` | Màu mực bút bi học sinh. Dùng cho liên kết tương tác, thanh trắc nghiệm, trạng thái focus ô nhập liệu. |
| **`postit-yellow` (Warning/Note)** | `#fff9c4` | Màu giấy dán ghi chú Post-it vàng ấm áp. Dùng cho thẻ mẹo học tập, ghi chú giải phẫu, nhãn XP. |

### 2.4. Màu Nhận Diện 3 Phân Môn STEM (Discipline Tags)
| Phân Môn | Màu Chủ Đạo | Hex | Màu Phụ / Nền Nhẹ | Ứng dụng |
| :--- | :--- | :--- | :--- | :--- |
| **Sinh Học (Biology)** | Xanh Lá Mầm | `#48bb78` (`#00864c`) | `#e8f5e9` | Mẫu tế bào, kính hiển vi, cơ quan, giải phẫu, vi sinh vật. |
| **Hóa Học (Chemistry)** | Tím Phản Ứng | `#9f7aea` (`#7c3aed`) | `#f3e8ff` | Ống nghiệm, bảng tuần hoàn, phân tử, phản ứng đổi màu. |
| **Vật Lý (Physics)** | Cam Động Năng | `#ed8936` (`#dd6b20`) | `#fffaf0` | Lực kế, mạch điện, chuyển động, năng lượng, quỹ đạo. |

---

## 3. Hệ Thống Kiểu Chữ (Typography System)

Các trang sử dụng bộ 3 font chữ chuyên biệt được tải từ Google Fonts:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Epilogue:wght@600;700;800&family=Be+Vietnam+Pro:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet">
```

| Vai trò Typography | Font Family | Trọng lượng (Weight) | Ứng dụng |
| :--- | :--- | :--- | :--- |
| **Tiêu đề lớn (Headlines)** | `Epilogue`, cursive, sans-serif | 700 (Bold), 800 (ExtraBold) | Tên ứng dụng, tiêu đề trang (H1, H2), lời chào mừng. Mang nét bút to, năng động. |
| **Nội dung chính (Body Text)** | `Be Vietnam Pro`, sans-serif | 400 (Regular), 500, 600 | Đoạn văn mô tả thí nghiệm, câu hỏi trắc nghiệm, nhãn form. Tối ưu hoàn hảo cho dấu tiếng Việt. |
| **Nhãn kỹ thuật & Số liệu (Labels/Codes)** | `Space Grotesk`, monospace, sans-serif | 600, 700 (Bold) | Mã đề, đơn vị đo (ml, cm, °C), thời gian làm bài, tọa độ 3D, thanh tab sổ tay. |

---

## 4. Đường Nét, Góc Bo & Hiệu Ứng Nổi Khối (Elevation & Shapes)

### 4.1. Góc bo méo tay bất đối xứng (Organic Asymmetrical Corners)
Để tạo cảm giác giấy cắt thủ công, các card chính và banner sử dụng `border-radius` đa bán kính:
```css
/* Viền méo tay tiêu chuẩn cho thẻ bài tập & banner */
.sketch-border {
  border: 2.5px solid #2d2d2d;
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
  box-shadow: 4px 4px 0px #2d2d2d;
}

/* Biến thể thẻ đảo góc để tránh sự nhàm chán lặp lại */
.sketch-border-alt {
  border: 2.5px solid #2d2d2d;
  border-radius: 18px 240px 20px 230px / 240px 18px 230px 20px;
  box-shadow: 4px 4px 0px #2d2d2d;
}
```

### 4.2. Hiệu ứng đổ bóng cứng (Hard Drop Shadows)
- **Bóng thường (Default Card/Button):** `box-shadow: 4px 4px 0px #2d2d2d;`
- **Bóng nhỏ (Tag/Chip/Small Button):** `box-shadow: 2px 2px 0px #2d2d2d;`
- **Bóng lớn (Popup/Floating Panel/Modal):** `box-shadow: 6px 6px 0px #2d2d2d;`

### 4.3. Động lực học khi tương tác nút bấm (Button Dynamics)
Mô phỏng cảm giác đóng con dấu mộc cao su thật lên mặt giấy:
```css
.neo-btn {
  border: 2.5px solid #2d2d2d;
  box-shadow: 4px 4px 0px #2d2d2d;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.neo-btn:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0px #2d2d2d;
}

.neo-btn:active {
  transform: translate(3px, 3px);
  box-shadow: 1px 1px 0px #2d2d2d;
}
```

### 4.4. Phụ kiện sổ tay (Notebook Artifacts)
1. **Băng dính Washi Tape:**
   ```html
   <div class="absolute -top-3 left-6 w-24 h-5 bg-[#f0e6d2]/85 border border-dashed border-[#2d2d2d] transform -rotate-2 pointer-events-none z-10 flex items-center justify-center">
     <span class="text-[9px] font-bold text-[#76716a] tracking-widest uppercase">LAB SPECIMEN</span>
   </div>
   ```
2. **Ghi chú dán lệch (Tilted Post-it Note):**
   ```html
   <div class="bg-[#fff9c4] border-2 border-[#2d2d2d] p-3 rounded-md shadow-[3px_3px_0px_#2d2d2d] transform rotate-1 hover:rotate-0 transition-transform">
     <p class="text-xs text-[#2d2d2d] font-semibold">💡 Mẹo quan sát: Hãy xoay mẫu 3D góc 45° để thấy rõ vách ngăn!</p>
   </div>
   ```
3. **Ghim bấm đỏ (Pushpin Icon):**
   ```html
   <div class="w-3.5 h-3.5 rounded-full bg-[#ff4d4d] border-2 border-[#2d2d2d] mx-auto -mt-2"></div>
   ```

---

## 5. Thư Viện Thành Phần Mẫu (Component Recipes)

### 5.1. Nút Bấm (Buttons)
```html
<!-- Nút CTA Chính (Primary Action) -->
<button class="bg-[#ff4d4d] text-white font-bold font-['Space_Grotesk'] text-sm px-6 py-2.5 rounded-xl border-[2.5px] border-[#2d2d2d] shadow-[4px_4px_0px_#2d2d2d] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#2d2d2d] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#2d2d2d] transition-all flex items-center gap-2">
  <span>Khám Phá Mô Hình 3D</span>
  <span class="material-symbols-outlined text-lg">arrow_forward</span>
</button>

<!-- Nút Phụ (Secondary Action / Ghi Chép) -->
<button class="bg-[#fdfbf7] text-[#2d2d2d] font-bold font-['Space_Grotesk'] text-sm px-5 py-2.5 rounded-xl border-2 border-[#2d2d2d] shadow-[3px_3px_0px_#2d2d2d] hover:bg-white hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all flex items-center gap-2">
  <span class="material-symbols-outlined text-lg text-[#2d5da1]">menu_book</span>
  <span>Xem Hướng Dẫn</span>
</button>
```

### 5.2. Thẻ Học Tập Bento (Bento Study Card)
```html
<div class="relative bg-white border-[2.5px] border-[#2d2d2d] rounded-2xl p-5 shadow-[4px_4px_0px_#2d2d2d] transform hover:-translate-y-1 transition-all">
  <!-- Tag môn học -->
  <div class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#e8f5e9] border border-[#2d2d2d] text-[#00864c] font-['Space_Grotesk'] text-xs font-bold mb-3">
    <span class="w-2 h-2 rounded-full bg-[#48bb78]"></span>
    Sinh Học KHTN 8
  </div>
  <h3 class="font-['Epilogue'] text-lg font-bold text-[#2d2d2d] mb-2">Cấu Tạo Hộp Sọ Người</h3>
  <p class="font-['Be_Vietnam_Pro'] text-sm text-[#5b403e] mb-4 line-clamp-2">Khám phá 22 mảnh xương khớp và các xoang bảo vệ bộ não thông qua mô hình 3D tương tác.</p>
  <a href="/lab.html?mode=skull" class="inline-flex items-center gap-1 text-sm font-bold text-[#ff4d4d] hover:underline decoration-wavy">
    Mở phòng mổ xẻ 3D →
  </a>
</div>
```

### 5.3. Ô Nhập Liệu Biểu Mẫu (Form Inputs)
```html
<div class="flex flex-col gap-1.5">
  <label class="font-['Space_Grotesk'] text-xs font-bold uppercase tracking-wider text-[#2d2d2d]">Email hoặc Tên đăng nhập</label>
  <input type="text" 
         placeholder="VD: nguyen_van_a@thcs.edu.vn" 
         class="w-full px-4 py-2.5 bg-[#fdfbf7] border-2 border-[#2d2d2d] rounded-lg font-['Be_Vietnam_Pro'] text-sm text-[#2d2d2d] placeholder:text-[#76716a] focus:outline-none focus:bg-white focus:shadow-[3px_3px_0px_#2d5da1] transition-all" />
</div>
```

### 5.4. Khung Xem Mô Hình 3D (3D Viewport Stage Frame)
Khung hiển thị Three.js không bao giờ để trơn bóng mà được viền bằng đường chì than và các ký hiệu góc kỹ thuật:
- Viền bao quanh: `border: 3px solid #2d2d2d; border-radius: 16px;`
- Bốn góc có dấu ngắm phác thảo: `⌜ ⌝ ⌞ ⌟`
- Thước chia tỷ lệ ở cạnh dưới với vạch đo milimet hoặc micromet (`µm`).

---

## 6. Hướng Dẫn Thiết Kế Trang Mới (How to Create New Pages)

Khi cần xây dựng bất kỳ trang nào mới trong BioVerse, hãy tuân theo quy trình 5 bước sau:

### Bước 1: Khởi tạo Template HTML & Nền Sổ Tay
Mỗi trang web mới phải có lớp giấy `sketch-paper` và nạp đầy đủ font:
```html
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Tên Trang] - BioVerse</title>
  <link rel="stylesheet" href="/src/sketchbook.css">
</head>
<body class="sketch-paper min-h-screen text-[#2d2d2d]">
  <!-- Nội dung trang -->
</body>
</html>
```

### Bước 2: Tích hợp Navbar Chuẩn
Header cố định phía trên với Logo phác thảo BioVerse, liên kết các phân hệ chính:
- **Khám Phá** (`/index.html`)
- **Phòng Thí Nghiệm 3D** (`/lab.html`)
- **Luyện Đề Trắc Nghiệm** (`/exams.html`)
- **Đăng Nhập / Tài Khoản** (`/login.html`)

### Bước 3: Áp dụng Quy chuẩn Typography
- Tên trang & tiêu đề khu vực dùng thẻ `h1, h2` với font `Epilogue`.
- Chữ giải thích dùng font `Be Vietnam Pro`.
- Nhãn phụ, thông số, thời gian dùng font `Space Grotesk`.

### Bước 4: Kiểm tra Checklist Nhận Diện
- [ ] Mọi card và button đều có viền `solid #2d2d2d` (2px đến 3px).
- [ ] Các thẻ nổi có bóng đổ cứng `box-shadow: 4px 4px 0px #2d2d2d;` (không dùng bóng nhòe mờ).
- [ ] Không có nền đen toàn phần hoặc trắng chói mắt; dùng `#fdfbf7` làm màu nền chủ đạo.
- [ ] Điểm nhấn CTA chính dùng màu đỏ dạ `#ff4d4d`.
- [ ] Điểm nhấn liên kết hoặc tag thông tin dùng màu bút bi xanh `#2d5da1`.
- [ ] Có chi tiết phác thảo vui tươi (washi tape, ghim bấm, sticker xoay nhẹ -1.5° đến 2°).

### Bước 5: Đăng ký Trang mới vào `vite.config.js`
1. **Tạo file HTML** trong thư mục `pages/` (ví dụ: `pages/trang-moi.html`).
2. **Tạo file JS controller** trong `src/pages/` (ví dụ: `src/pages/trangMoi.js`) và liên kết qua `<script type="module" src="/src/pages/trangMoi.js"></script>`.
3. **Đăng ký rollup input** trong `vite.config.js`:
```javascript
input: {
  main: resolve(__dirname, 'index.html'),
  lab: resolve(__dirname, 'pages/lab.html'),
  // Thêm trang mới vào đây:
  trangMoi: resolve(__dirname, 'pages/trang-moi.html'),
}
```
4. **Đăng ký Clean URL** trong `cleanUrlPlugin` route map:
```javascript
'/trang-moi': '/pages/trang-moi.html',
'/trang-moi.html': '/pages/trang-moi.html',
```

---
*Tài liệu được cập nhật tự động và đồng bộ từ Stitch Project `BioVerse Sketchbook STEM Platform` (ID: `16780848014086539402`).*

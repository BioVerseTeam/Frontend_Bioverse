# 🧪 HƯỚNG DẪN THIẾT KẾ MODEL 3D - PHÒNG THÍ NGHIỆM HÓA HỌC (MVP)

Tài liệu này cung cấp danh sách chi tiết các mô hình 3D cần thiết kế để phục vụ cho **3 thí nghiệm hóa học cơ bản** trong phiên bản MVP của ứng dụng mô phỏng 3D tương tác.

---

## 📌 THÔNG SỐ KỸ THUẬT CHUNG CHO MODEL 3D
* **Định dạng file**: `.glb` hoặc `.gltf` (khuyên dùng `.glb` để đóng gói toàn bộ texture).
* **Tối ưu hóa dung lượng**: Mỗi mô hình dụng cụ/hóa chất nên giới hạn dưới **2MB** để đảm bảo thời gian tải trang nhanh trên trình duyệt.
* **Tọa độ Pivot (Trọng tâm)**: 
  * Các loại cốc, bình chứa, dụng cụ đặt bàn: Pivot phải nằm ở **chính giữa đáy** của vật thể ($Y = 0$) để dễ dàng đặt khớp lên mặt bàn thí nghiệm.
  * Các loại kẹp gắp, diêm châm: Pivot nằm ở **tay cầm** hoặc vị trí tương tác để xoay hoạt cảnh chính xác.
* **Tách Mesh Chất Lỏng**: 
  * Đối với cốc mỏ, bình tam giác, ống nghiệm: Phần mesh nước/chất lỏng bên trong phải là **vật thể độc lập** (ví dụ đặt tên là `liquid_mesh`) nằm lọt trong bình thủy tinh. Phần mesh này sẽ được lập trình đổi màu (color) hoặc co giãn chiều cao (scale Y) để mô phỏng mức chất lỏng vơi/đầy.

---

## 🧪 CHI TIẾT 3 THÍ NGHIỆM & DANH SÁCH THIẾT BỊ 3D CẦN TẠO

### 1. Thí nghiệm 1: Phản ứng Trung hòa Axit - Bazơ (HCl + NaOH)
* **Hiện tượng**: Dung dịch $\text{NaOH}$ (có phenol) ban đầu màu hồng cánh sen, khi rót dần dung dịch $\text{HCl}$ vào sẽ đổi màu đột ngột sang trong suốt không màu tại điểm tương đương.

| Tên Vật Dụng 3D | Loại | Mô tả thiết kế |
| :--- | :--- | :--- |
| **Beaker (Cốc mỏ)** | Tool | Cốc thủy tinh hình trụ dung tích 250ml, có vạch chia độ trắng trên thành cốc. Thủy tinh trong suốt. |
| **Flask (Bình tam giác)** | Tool | Bình hình nón cụt, cổ hẹp dung tích 150ml. Dùng để rót axit. |
| **Lọ Phenolphthalein** | Chemical | Lọ thủy tinh màu tối hổ phách (amber glass bottle) đựng dung dịch chỉ thị, có nắp bóp nhỏ giọt cao su màu đen. |
| **Dung dịch (Liquid)** | Chemical | Mesh chất lỏng tương ứng vừa vặn trong Beaker và Flask. |

---

### 2. Thí nghiệm 2: Kim loại tác dụng với Axit (Zn + HCl)
* **Hiện tượng**: Cho kẽm hạt vào ống nghiệm axit $\text{HCl}$ sủi bọt khí Hydro cuồn cuộn bay lên mặt nước và ăn mòn hạt kẽm.

| Tên Vật Dụng 3D | Loại | Mô tả thiết kế |
| :--- | :--- | :--- |
| **Test Tube (Ống nghiệm)** | Tool | Ống thủy tinh dài hình trụ tròn, đáy bo tròn. |
| **Test Tube Rack (Giá đỡ)** | Tool | Kệ gỗ mộc mạc hoặc kệ nhựa màu xám xanh dùng để cắm ống nghiệm đứng thẳng trên bàn. |
| **Lọ đựng Kẽm viên** | Chemical | Hũ thủy tinh miệng rộng có nắp vặn kim loại chứa các viên Kẽm rắn bên trong. |
| **Kẽm viên (Zn Granules)** | Chemical | Các hạt kim loại nhỏ dạng thô ráp, góc cạnh, màu xám bạc ánh kim xước nhẹ. |
| **Tweezers (Kẹp gắp)** | Tool | Kẹp nhíp panh kim loại xước sáng bóng để gắp hạt kẽm. |

---

### 3. Thí nghiệm 3: Đun nóng hóa chất bằng Đèn cồn
* **Hiện tượng**: Đốt đèn cồn tạo lửa cam gia nhiệt cho cốc nước bên trên sôi sùng sục và bốc hơi nước.

| Tên Vật Dụng 3D | Loại | Mô tả thiết kế |
| :--- | :--- | :--- |
| **Alcohol Burner (Đèn cồn)**| Tool | Thân đèn thủy tinh tròn dẹt chứa cồn lỏng màu xanh lá/xanh lam nhạt, có bấc vải và nắp chụp bằng thủy tinh/nhựa đỏ. |
| **Tripod Stand (Kiềng sắt)** | Tool | Kiềng 3 chân sắt đen nhám, độ cao vừa khít đèn cồn đặt bên dưới. |
| **Wire Gauze (Lưới amiăng)** | Tool | Tấm lưới sắt đan vuông có tấm lót tròn màu trắng cách nhiệt nằm ở giữa để đặt lên kiềng sắt. |
| **Matchbox (Hộp diêm)** | Tool | Hộp giấy đựng diêm kèm các que diêm gỗ đầu đỏ để diễn tả thao tác châm lửa. |

---

## 🎨 HƯỚNG DẪN THIẾT LẬP CHẤT LIỆU (PBR MATERIALS)

Để render trên WebGL (Three.js) đạt hiệu ứng thị giác bóng bẩy, cao cấp nhất:
1. **Glass Material (Thủy tinh)**:
   * `Transmission = 1.0` (Độ xuyên sáng tối đa).
   * `Roughness = 0.05 - 0.1` (Nhám thấp để tạo độ phản chiếu sắc nét).
   * `IOR = 1.5` (Chỉ số khúc xạ của thủy tinh).
   * `Thickness = 0.01 - 0.02` (Độ dày thành bình).
2. **Metal Material (Kim loại kiềng/kẹp)**:
   * `Metallic = 0.9` (Độ kim loại cao).
   * `Roughness = 0.3` (Hơi xước tạo cảm giác thiết bị phòng lab chân thực).
3. **Wood Material (Giá đỡ gỗ)**:
   * `Roughness = 0.8` (Độ nhám cao).
   * Dùng Map gỗ nâu ấm để tạo cảm giác tự nhiên, mộc mạc.

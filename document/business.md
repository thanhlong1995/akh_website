# Business Requirements — AKH Quán Admin Dashboard

Web quản lý bán hàng (admin dashboard) cho cửa hàng ăn uống.

---

## 6 Module chính

### 0. Đăng nhập (Login)
- Màn hình đăng nhập hiển thị khi chưa xác thực; che toàn bộ dashboard
- Thông tin đăng nhập cố định: **user: admin / password: admin123**
- Mật khẩu lưu dạng hash SHA-256 trong code backend — không lưu Database
- Sau khi đăng nhập thành công, server trả về session token; frontend lưu vào `sessionStorage`
- Mọi API call đều gửi kèm `Authorization: Bearer <token>` — backend từ chối 401 nếu thiếu/sai
- Nút **Đăng xuất** ở cuối sidebar — xoá token khỏi `sessionStorage`, hiện lại màn hình login
- Token tồn tại trong phạm vi tab hiện tại (sessionStorage reset khi đóng tab)

### 1. Tổng quan (Dashboard)
- Hiển thị 4 chỉ số: Doanh thu hôm nay, Đơn hàng mới, Tổng sản phẩm, Khách hàng mới
- Mỗi chỉ số có delta so sánh hôm qua / tuần trước
- Biểu đồ cột doanh thu 7 ngày gần nhất
- Bảng đơn hàng gần đây (mã đơn, khách hàng, tổng tiền, trạng thái)

### 2. Quản lý bàn & Tạo đơn hàng
- Màn hình hiển thị lưới bàn (3 bàn/hàng, tự xuống dòng khi thêm)
- Tên bàn tự động tăng: **Bàn 1, Bàn 2, Bàn N** — nút "+ Thêm bàn" trên topbar
- Bàn có món hiển thị màu viền xanh lá, số món và tổng tiền; bàn trống hiển thị "Trống"
- Click vào bàn → hiển thị form quản lý đơn của bàn đó bên dưới lưới
- Trong form bàn:
  - Tìm và thêm món ăn/đồ uống theo tên
  - Tăng/giảm số lượng: đơn vị **con** → ±1, đơn vị **kg** → ±0.1
  - Tự động tính tạm tính và tổng cộng
  - Nút "Tạo đơn hàng" lưu vào database; trạng thái mặc định là **Xử lý**
  - Nút "In phiếu" in phiếu đặt món gắn tên bàn
  - Nút "Xoá bàn" xoá bàn khỏi danh sách
- Danh sách bàn và món đang chọn được lưu vào **localStorage** (giữ qua reload trang)

### 3. Đơn hàng (Lịch sử & Quản lý trạng thái)
- Danh sách tất cả đơn hàng đã tạo (mã đơn, tổng tiền, trạng thái, thời gian)
- Click vào hàng → mở rộng xem chi tiết từng món trong đơn (tên, số lượng, đơn giá, thành tiền)
- Đổi trạng thái đơn ngay trong bảng qua dropdown: **Xử lý → Đang giao → Đã giao / Huỷ**
- Cập nhật trạng thái phản hồi ngay lập tức (optimistic update), tự động rollback nếu lỗi
- Không cho phép sửa nội dung đơn (món, giá) sau khi đã tạo

### 4. Sản phẩm (Thực đơn)
- Sản phẩm là món ăn và đồ uống (món nước, bia, coca,...)
- Bảng danh sách: tên món, danh mục, **đơn vị**, giá bán
- Tìm kiếm theo tên món
- Lọc theo danh mục: Món ăn / Món nước / Bia & Nước ngọt
- Thêm món mới: tên, danh mục, đơn vị (`con` hoặc `kg`), giá bán
- Chỉnh sửa và xoá món

### 5. Báo cáo
- 3 chỉ số tháng: Doanh thu, Tổng đơn, Giá trị trung bình mỗi đơn
- Biểu đồ cột doanh thu 12 tháng (T1–T12)

---

## UI / UX

- Layout: sidebar trái cố định (220px) + main content bên phải
- Sidebar: 5 mục điều hướng có icon (Tổng quan, Bàn, Đơn hàng, Sản phẩm, Báo cáo)
- Topbar: tên trang hiện tại + ngày tháng + nút hành động chính
- Màu chủ đạo: xanh dương `#185FA5`
- Badge trạng thái đơn: xanh lá (đã giao), vàng (đang giao), xanh dương (xử lý), đỏ (huỷ)
- Responsive cơ bản, font hệ thống

---

## Yêu cầu chung

- Toàn bộ giao diện và dữ liệu bằng tiếng Việt
- Giá tiền định dạng kiểu Việt Nam (ví dụ: 320.000đ)

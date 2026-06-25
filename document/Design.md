Design a Vietnamese food & beverage admin dashboard with 5 pages:
Login, Overview, Create Order, Products, and Report.

## Brand & Style
- Primary color: #185FA5 (blue)
- Style: clean, flat, professional — inspired by modern SaaS admin panels
- Language: Vietnamese
- Currency format: 320.000đ

## Page 0 — Đăng nhập (Login)
- Full-screen centered card on gray-50 background (`#F9FAFB`)
- Card: white, border 1px `#E5E7EB`, border-radius 16px, padding 40px, max-width 380px
- Logo row: grid icon + "AKH Quán" in primary blue `#185FA5`, font-weight 700
- Title: "Đăng nhập" 20px semibold
- Two fields: Tên đăng nhập (text) + Mật khẩu (password) — same input style as dashboard forms
- Error text: red `#DC2626`, 13px, below password field
- Submit button: full-width primary blue, height 40px
- Sidebar has a **Đăng xuất** button at the bottom (logout icon + text, semi-transparent white)

## Layout (all pages)
- Fixed left sidebar 220px: logo "AKH Quán" at top, 4 nav items with icons
  (Tổng quan, Tạo đơn hàng, Sản phẩm, Báo cáo)
- Topbar: current page title (left) + date + primary action button (right)
- Main content area: white background, 24px padding

## Page 1 — Tổng quan (Overview)
- Row of 4 metric cards:
  Doanh thu hôm nay / Đơn hàng mới / Tổng sản phẩm / Khách hàng mới
  Each card: muted label 12px, large number 22px, delta indicator ↑ or ↓
- Two-column section below:
  Left: bar chart "Doanh thu 7 ngày"
  Right: table "Đơn hàng gần đây"
  columns: Mã đơn | Khách | Tổng | Trạng thái
  Status badges: green (Đã giao), amber (Đang giao), blue (Xử lý), red (Huỷ)

## Page 2 — Tạo đơn hàng (Create Order)
- Single focused layout:
  Optional customer input at top (text field, placeholder "Tên hoặc SĐT khách hàng — để trống nếu vãng lai")
  Search input below to find món ăn / đồ uống by name
  List of added items — each row shows:
    Tên món | icon − | số lượng | icon + | thành tiền | nút xoá (trash icon)
  Summary section at bottom:
    Tạm tính: ...
    Tổng cộng: ... (bold, blue, larger font)
  "Tạo đơn hàng" primary button full width at bottom

## Page 3 — Sản phẩm (Products / Menu)
- Products are food and drinks (món ăn, món nước, bia, coca,...)
- Top bar: search input + category filter dropdown
  (Tất cả / Món ăn / Món nước / Bia & Nước ngọt) + "Thêm món" button
- Table columns: Tên món | Danh mục | Đơn vị | Giá bán | Actions (edit + delete icons)
- Inline add/edit form card below table:
  Tên món / Danh mục / Đơn vị (con | kg) / Giá bán — Save and Cancel buttons

## Page 4 — Báo cáo (Report)
- Row of 3 metric cards:
  Doanh thu tháng / Tổng đơn / Giá trị trung bình mỗi đơn
- Full-width bar chart "Doanh thu theo tháng" (12 bars, T1–T12)

## Design Details
- Sidebar active state: light blue background (#E6F1FB), blue text
- Metric cards: light gray surface, muted label, value 22px medium weight
- Tables: 0.5px borders, hover highlight per row, badge pills for status
- Buttons: primary filled blue, secondary outlined gray
- Forms: clean inputs, subtle border, focus ring in primary blue
- Charts: flat bar charts, blue/teal color palette
- Border radius: 8px elements, 12px cards
- No shadows, no gradients — flat design only

## Deliverable
Design all 4 pages as high-fidelity desktop mockups (1440px wide).
Show sidebar and topbar consistently across all pages.
Include hover and focus states for interactive elements.
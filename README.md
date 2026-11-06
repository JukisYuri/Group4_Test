# DỰ ÁN KIỂM THỬ TỰ ĐỘNG NOPCOMMERCE - NHÓM 04

Dự án kiểm thử tự động toàn diện (End-to-End Automation Testing) cho hệ thống thương mại điện tử **nopCommerce** sử dụng framework **Playwright**.

---

## 👥 Thành viên nhóm & Phân chia công việc

| STT | MSSV | Họ và tên | Module kiểm thử đảm nhiệm | Thư mục test |
| :---: | :---: | :--- | :--- | :--- |
| 1 | **23130018** | **Lâm Gia Bảo** | • Quản lý Bài viết Blog (Blog Posts)<br>• Quản lý Diễn đàn (Forums)<br>• Quản lý Tin tức (News Items)<br>• Quản lý Chủ đề (Topics) | `tests/23130018_LamGiaBao/` |
| 2 | **23130085** | **Hồ Thanh Hải** | • Quản lý Sản phẩm (Products Management)<br>• Quản lý Danh mục (Categories Management)<br>• Quản lý Nhà sản xuất (Manufacturers) | `tests/23130085_HoThanhHai/` |
| 3 | **23130092** | **Ngô Anh Hào** | • Giỏ hàng khách hàng (Shopping Cart)<br>• Quản lý Quốc gia (Country Management)<br>• Quản lý Tài khoản Email (Email Accounts) | `tests/23130092_NgoAnhHao/` |
| 4 | **23130193** | **Nguyễn Quang Minh** | • Quản lý Đơn hàng (Orders Management)<br>• Quản lý Giảm giá (Discounts Management)<br>• Quản lý Tiếp thị liên kết (Affiliates)<br>• Quản lý Người đăng ký bản tin (Newsletter) | `tests/23130193_NguyenQuangMinh/` |
| 5 | **23130385** | **Phan Ngọc Vinh** | • Quản lý Khách hàng (Customers Management)<br>• Quản lý Vai trò khách hàng (Customer Roles)<br>• Quản lý Nhật ký hoạt động (Activity Logs) | `tests/23130385_PhanNgocVinh/` |

> 📊 **Quy mô dự án**: Bao gồm **295 Test Cases** được chia thành **15 test suites** độc lập.

---

## ⚙️ Yêu cầu môi trường (Prerequisites)

- **Node.js**: Phiên bản 18.x, 20.x hoặc mới hơn ([Tải tại đây](https://nodejs.org/))
- **Trình duyệt**: Google Chrome / Chromium (được quản lý tự động bởi Playwright)
- **Hệ thống nopCommerce**: Đã được cài đặt và đang chạy trên máy (Local IIS, Docker hoặc Kestrel)

---

## 🚀 Hướng dẫn cài đặt

### Bước 1: Di chuyển vào thư mục dự án
```bash
cd Group4_Test
```

### Bước 2: Cài đặt các thư viện phụ thuộc (Dependencies)
```bash
npm install
```

### Bước 3: Cài đặt trình duyệt cho Playwright (nếu chưa có)
```bash
npx playwright install chromium
```

---

## 🛠️ Hướng dẫn cấu hình môi trường (.env)

Dự án sử dụng cơ chế biến môi trường chung giúp toàn bộ script của các thành viên tự động kết nối đúng đến địa chỉ website và tài khoản Admin trên máy bạn mà không cần sửa code.

1. Tạo file `.env` bằng cách sao chép từ file mẫu:
   - **Trên Windows (cmd/PowerShell):**
     ```powershell
     copy .env.example .env
     ```
   - **Trên macOS / Linux:**
     ```bash
     cp .env.example .env
     ```

2. Mở file `.env` và điều chỉnh các thông số phù hợp:
   ```env
   # URL website nopCommerce trên máy của bạn (VD: http://localhost, http://localhost:8080, http://127.0.0.1:8081)
   BASE_URL=http://localhost

   # Email đăng nhập tài khoản Quản trị viên
   ADMIN_EMAIL=admin@yourstore.com

   # Mật khẩu tài khoản Quản trị viên
   ADMIN_PASSWORD=Admin@123

   # Cho phép chạy các test case thao tác ghi/sửa/xóa dữ liệu (true/false)
   RUN_MUTATING_TESTS=true
   ```

---

## ▶️ Hướng dẫn chạy kiểm thử

### 1. Chạy trên giao diện tương tác Playwright UI (Khuyên dùng)
Giao diện UI cho phép bạn trực quan hóa từng bước click, xem màn hình và DOM tree, chạy toàn bộ hoặc chạy riêng từng test case:
```bash
npm run test:ui
# hoặc
npx playwright test --ui
```

### 2. Chạy toàn bộ test trên Terminal (Chế độ Headless)
```bash
npm test
# hoặc
npx playwright test
```

### 3. Chạy có mở cửa sổ trình duyệt (Headed mode)
```bash
npm run test:headed
```

### 4. Chạy riêng bài test của từng thành viên

- **Chạy toàn bộ module của Hồ Thanh Hải:**
  ```bash
  npx playwright test tests/23130085_HoThanhHai/ --ui
  ```

- **Chạy toàn bộ module của Nguyễn Quang Minh:**
  ```bash
  npx playwright test tests/23130193_NguyenQuangMinh/ --ui
  ```

- **Chạy toàn bộ module của Phan Ngọc Vinh:**
  ```bash
  npx playwright test tests/23130385_PhanNgocVinh/ --ui
  ```

- **Chạy toàn bộ module của Ngô Anh Hào:**
  ```bash
  npx playwright test tests/23130092_NgoAnhHao/ --ui
  ```

- **Chạy toàn bộ module của Lâm Gia Bảo:**
  ```bash
  npx playwright test tests/23130018_LamGiaBao/ --ui
  ```

### 5. Chạy một file test cụ thể
```bash
npx playwright test tests/23130085_HoThanhHai/categories.spec.js --ui
```

---

## 📈 Xem báo cáo kiểm thử (HTML Report)

Sau khi chạy xong test trên dòng lệnh, bạn có thể mở báo cáo chi tiết trực quan (bao gồm thời gian chạy, ảnh chụp màn hình lỗi, video, trace):
```bash
npm run test:report
# hoặc
npx playwright show-report
```

---

## 📁 Cấu trúc thư mục dự án

```text
Group4_Test/
├── .env.example                                  # File mẫu cấu hình biến môi trường
├── .env                                          # File cấu hình thực tế (không commit)
├── .gitignore                                    # Danh sách file/thư mục bỏ qua khi commit
├── package.json                                  # Khai báo dependencies và scripts
├── playwright.config.js                          # File cấu hình trung tâm Playwright
├── README.md                                     # Tài liệu hướng dẫn dự án
└── tests/                                        # Thư mục chứa toàn bộ kịch bản kiểm thử
    ├── 23130018_LamGiaBao/                       # Test suite của Lâm Gia Bảo
    │   ├── blog.spec.js
    │   ├── forums.spec.js
    │   ├── news.spec.js
    │   ├── topics.spec.js
    │   └── nopcommerce-test-helpers.js
    ├── 23130085_HoThanhHai/                      # Test suite của Hồ Thanh Hải
    │   ├── auth.helper.js
    │   ├── categories.spec.js
    │   ├── manufacturers.spec.js
    │   └── products.spec.js
    ├── 23130092_NgoAnhHao/                       # Test suite của Ngô Anh Hào
    │   ├── cart-module5-2.test.js
    │   ├── country-module5-3.test.js
    │   └── email-module5-2.test.js
    ├── 23130193_NguyenQuangMinh/                 # Test suite của Nguyễn Quang Minh
    │   ├── affiliates.spec.js
    │   ├── discounts.spec.js
    │   ├── newsletter.spec.js
    │   └── orders.spec.js
    └── 23130385_PhanNgocVinh/                    # Test suite của Phan Ngọc Vinh
        ├── nopcommerce_activitylog.spec.js
        ├── nopcommerce_customerrole.spec.js
        └── nopcommerce_customers.spec.js
```

---

## 💡 Lưu ý quan trọng khi chạy kiểm thử

1. **Khởi động nopCommerce trước khi test**: Hãy chắc chắn rằng website nopCommerce đã sẵn sàng truy cập trên trình duyệt trước khi chạy lệnh test.
2. **Tuần tự hóa (Single Worker)**: Dự án được cấu hình `workers: 1` nhằm mục đích cho các bài kiểm thử chạy nối tiếp nhau, tránh việc nhiều tiến trình cùng đăng nhập Admin hoặc sửa đổi CSDL đồng thời gây xung đột dữ liệu.
3. **Mật khẩu & Port**: Nếu chạy thấy test bị dừng tại màn hình đăng nhập hoặc báo lỗi `Connection Refused`, hãy mở file `.env` và kiểm tra lại `BASE_URL` (port 80, 8080 hay 8081) và `ADMIN_PASSWORD`.

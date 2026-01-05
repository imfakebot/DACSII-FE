# Frontend - Ứng Dụng Đặt Sân Thể Thao (DACS II)

<p align="center">
  <a href="https://angular.io/" target="blank"><img src="https://angular.io/assets/images/logos/angular/angular.svg" width="120" alt="Angular Logo" /></a>
</p>

<p align="center">
  Ứng dụng web đặt sân thể thao được xây dựng bằng <a href="https://angular.io/" target="blank">Angular 20</a> với giao diện hiện đại và trải nghiệm người dùng tối ưu.
</p>

## 📜 Giới thiệu

Đây là mã nguồn frontend cho dự án **Đồ án cơ sở ngành 2 (DACS II)** - Hệ thống đặt sân thể thao trực tuyến. Ứng dụng cung cấp giao diện người dùng thân thiện để tìm kiếm, đặt sân và quản lý các booking sân thể thao (Bóng đá, Tennis, Cầu lông, Bóng bàn).

## ✨ Tính năng nổi bật

### 👤 Người dùng

- **Xác thực:** Đăng ký, đăng nhập (Email/Password, Google OAuth), quên mật khẩu, đặt lại mật khẩu
- **Hồ sơ cá nhân:** Xem và cập nhật thông tin, thay đổi mật khẩu
- **Tìm kiếm sân:** Tìm kiếm theo tên, loại sân, khu vực, giá cả
- **Đặt sân:** Chọn khung giờ, áp dụng voucher, thanh toán qua VNPay
- **Lịch sử đặt sân:** Xem danh sách booking, hủy booking, đánh giá sân
- **Thông báo real-time:** Nhận thông báo về trạng thái booking qua WebSocket
- **Phản hồi:** Gửi phản hồi và góp ý cho hệ thống

### 🔧 Quản trị viên (Admin)

- **Dashboard:** Thống kê tổng quan (doanh thu, số lượng booking, người dùng)
- **Quản lý booking:** Xem, duyệt, check-in, hủy booking
- **Quản lý sân:** Tạo, sửa, xóa sân và chi nhánh
- **Quản lý người dùng:** Xem danh sách, phân quyền
- **Quản lý voucher:** Tạo và quản lý mã giảm giá
- **Quản lý tiện ích:** Thêm/sửa các tiện ích của sân
- **Quản lý đánh giá & phản hồi:** Xem và phản hồi đánh giá từ người dùng

## 🛡️ Bảo mật

Ứng dụng được xây dựng với nhiều lớp bảo vệ để đảm bảo an toàn:

- **XSS Protection:**

  - Service `XssSanitizerService` để sanitize/escape HTML
  - Pipes (`safeText`, `stripHtml`, `safeUrl`, `sanitizeHtml`) cho template
  - Directives (`xssSanitize`, `noHtmlPaste`) cho form inputs
  - Chi tiết tham khảo: [XSS-PROTECTION-GUIDE.md](./XSS-PROTECTION-GUIDE.md)

- **HTTP Interceptor:** Tự động xử lý 401 Unauthorized, clear session khi token hết hạn

- **Auth State Management:** Quản lý trạng thái đăng nhập tập trung qua `AuthStateService`

- **Token Verification:** Kiểm tra tính hợp lệ của token khi khởi động ứng dụng

- **Angular Built-in Security:** Tận dụng DomSanitizer và auto-escaping của Angular

## 🚀 Công nghệ sử dụng

| Công nghệ            | Phiên bản | Mô tả                |
| -------------------- | --------- | -------------------- |
| **Angular**          | 20.x      | Framework chính      |
| **TypeScript**       | 5.x       | Ngôn ngữ lập trình   |
| **Tailwind CSS**     | 4.x       | CSS framework        |
| **Angular Material** | 20.x      | UI Components        |
| **RxJS**             | 7.8       | Reactive programming |
| **Socket.IO Client** | 4.x       | Real-time WebSocket  |
| **Leaflet**          | 1.9       | Map integration      |
| **ZXing**            | 0.21      | QR Code scanner      |

## 📁 Cấu trúc dự án

```
src/app/
├── 404/                    # Trang 404 Not Found
├── admin/                  # Module admin (dashboard, quản lý)
├── badminton/              # Trang danh sách sân cầu lông
├── body/                   # Body component (trang chủ)
├── booking-management/     # Quản lý booking (admin)
├── components/             # Shared components
├── dashboard/              # Admin dashboard
├── feedbacks/              # Quản lý phản hồi
├── field-details/          # Chi tiết sân & booking
├── fields/                 # Quản lý sân (admin)
├── football/               # Trang danh sách sân bóng đá
├── footer/                 # Footer component
├── ForgotPassword/         # Quên mật khẩu
├── header/                 # Header component
├── interceptors/           # HTTP interceptors
├── Login/                  # Đăng nhập
├── my-bookings/            # Lịch sử đặt sân
├── notifications/          # Thông báo
├── payment-result/         # Kết quả thanh toán
├── Register/               # Đăng ký
├── ResetPassword/          # Đặt lại mật khẩu
├── review/                 # Đánh giá sân
├── security/               # XSS protection utilities
├── services/               # API services
├── sports/                 # Shared sports components
├── table-tennis/           # Trang sân bóng bàn
├── tennis/                 # Trang sân tennis
├── users/                  # Hồ sơ người dùng
├── utility/                # Quản lý tiện ích
├── vnpay-return/           # VNPay callback handler
├── voucher/                # Voucher pages
├── app.config.ts           # App configuration
├── app.routes.ts           # Route definitions
└── base_url.ts             # API base URL config
```

## ⚙️ Cài đặt và Chạy dự án

### 1. Yêu cầu

- **Node.js:** v18.x trở lên
- **npm:** v9.x trở lên (hoặc yarn)
- **Angular CLI:** v20.x

### 2. Cài đặt

```bash
# Clone repository
git clone <your-repository-url>
cd DACSII-FE

# Cài đặt dependencies
npm install

# Cài đặt Angular CLI (nếu chưa có)
npm install -g @angular/cli
```

### 3. Cấu hình

#### Cấu hình API URL

Chỉnh sửa file `src/app/base_url.ts`:

```typescript
export const BASE_URL = 'http://localhost:3001/api/v1';
```

#### Cấu hình Proxy (Development)

File `proxy.conf.json` đã được cấu hình để proxy requests đến backend:

```json
{
  "/api": {
    "target": "http://localhost:3001",
    "secure": false,
    "changeOrigin": true
  }
}
```

### 4. Chạy ứng dụng

```bash
# Chế độ development (với hot-reload)
npm start
# hoặc
ng serve --proxy-config proxy.conf.json

# Ứng dụng sẽ chạy tại: http://localhost:4200
```

### 5. Build Production

```bash
# Build cho production
npm run build

# Build files sẽ được tạo tại: dist/frontend/
```

### 6. Chạy SSR (Server-Side Rendering)

```bash
# Build và chạy SSR
npm run build
npm run serve:ssr:frontend
```

## 🧪 Testing

```bash
# Chạy unit tests
npm run test

# Chạy tests với coverage
npm run test -- --code-coverage
```

## 📱 Responsive Design

Ứng dụng hỗ trợ đầy đủ responsive cho các thiết bị:

- 📱 Mobile (< 640px)
- 📱 Tablet (640px - 1024px)
- 💻 Desktop (> 1024px)

## 🎨 Theming

Ứng dụng sử dụng Tailwind CSS với custom theme:

- **Primary Color (Brand):** Màu chủ đạo của ứng dụng
- **Glass Effect:** Hiệu ứng kính mờ cho header
- **Smooth Transitions:** Animation mượt mà

## 📖 Tài liệu liên quan

- [XSS Protection Guide](./XSS-PROTECTION-GUIDE.md) - Hướng dẫn bảo vệ XSS
- [Backend README](../DACSII-BE/README.md) - Tài liệu backend
- [Booking Flow Guide](../docs/BOOKING-FLOW-GUIDE.md) - Luồng đặt sân

## 🤝 Đóng góp

1. Fork dự án
2. Tạo branch mới (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## 📝 License

Dự án này được phát triển cho mục đích học tập - DACS II.

## 👥 Tác giả

- **Sinh viên:** [Tên sinh viên]
- **MSSV:** [Mã số sinh viên]
- **Lớp:** [Tên lớp]
- **Trường:** [Tên trường]

---

<p align="center">
  Made with ❤️ using Angular
</p>

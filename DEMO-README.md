# 🎯 Demo Payment Flow - Báo Cáo DACSII

## 📋 Tổng Quan

Demo này mô phỏng flow đặt sân và thanh toán hoàn chỉnh cho hệ thống quản lý sân thể thao.

## 🚀 Cách Chạy Demo

### 1. Start Backend (NestJS)

```bash
cd DACSII-BE
npm run start:dev
```

### 2. Start Frontend (Angular)

```bash
cd DACSII-FE
npm start
```

### 3. Mở Demo Page

Mở file `demo-payment-flow.html` trong trình duyệt hoặc truy cập:

- Demo page: `file:///path/to/DACSII-FE/demo-payment-flow.html`
- Hoặc trực tiếp: `http://localhost:4200/payment-success?bookingId=DEMO-12345`

## 📱 Các Trang Đã Implement

### 1. `/detail/:id` - Trang Đặt Sân

**Features:**

- ✅ Chọn ngày, giờ, thời lượng
- ✅ Schedule grid với slots available/booked
- ✅ Click vào slot để chọn giờ nhanh
- ✅ Check availability realtime
- ✅ Tính giá tự động
- ✅ Áp dụng voucher
- ✅ Validation đầy đủ
- ✅ Timezone handling chính xác

**Flow:**

1. User chọn ngày → Load schedule grid
2. User chọn slot/giờ → Auto-fill form
3. User chọn thời lượng → Highlight affected slots
4. User click "Thanh toán ngay" → Backend tạo booking + payment URL
5. **Redirect sang VNPay Gateway** (Real bank payment)

### 2. `/vnpay-return` - VNPay Callback Handler

**Features:**

- ✅ Nhận callback từ VNPay
- ✅ Parse query params (vnp_ResponseCode, vnp_TxnRef)
- ✅ Validate payment status
- ✅ Redirect sang `/payment-success` hoặc error page

**Flow:**

1. User thanh toán xong trên VNPay
2. VNPay redirect về `/vnpay-return?vnp_ResponseCode=00&vnp_TxnRef=BOOKING_ID`
3. Component xử lý → Redirect `/payment-success`

### 3. `/payment-success` - Màn Hình Thành Công ⭐

**Features:**

- ✅ **Animation success icon** với confetti
- ✅ **Hiển thị đầy đủ thông tin booking:**
  - Mã đặt chỗ
  - Tên sân, loại sân
  - Địa điểm
  - Thời gian, thời lượng
  - Tên khách hàng
  - Tổng tiền
  - Trạng thái thanh toán
- ✅ **QR Code check-in** (generated dynamically)
- ✅ **Nút Tải Vé** → Download ticket.txt
- ✅ **Nút In Vé** → Print-friendly layout
- ✅ **Lưu ý quan trọng** (đến sớm 15 phút, chính sách hủy, etc.)
- ✅ **Links:**
  - Xem lịch sử đặt sân
  - Về trang chủ

**Design:**

- Gradient background (purple/blue)
- Modern card design
- Responsive (mobile + desktop)
- Print-optimized styles
- Smooth animations

## 🎬 Demo Flow Hoàn Chỉnh

### Scenario 1: Flow Thành Công

```
User chọn sân A1
  ↓
Chọn ngày: 10/12/2024
  ↓
Chọn giờ: 14:00 (click vào slot xanh)
  ↓
Chọn thời lượng: 90 phút
  ↓
Click "Thanh toán ngay"
  ↓
Backend tạo booking + payment record
  ↓
Frontend redirect → window.location.href = vnpayUrl
  ↓
User thanh toán trên VNPay (real bank gateway)
  ↓
VNPay redirect → /vnpay-return?vnp_ResponseCode=00&vnp_TxnRef=abc123
  ↓
Component xử lý → /payment-success?bookingId=abc123
  ↓
Load booking details
  ↓
Hiển thị màn hình thành công + QR code + nút tải vé
  ↓
User click "Tải vé" → Download ticket.txt
  ✅ DONE
```

### Scenario 2: Payment Failed

```
VNPay redirect → /vnpay-return?vnp_ResponseCode=99
  ↓
Component detect lỗi
  ↓
Alert "Thanh toán không thành công"
  ↓
Redirect về trang chủ
```

## 📸 Screenshots (Mô Tả Cho Báo Cáo)

### 1. Trang Đặt Sân

- Hero image với thông tin sân
- Form đặt lịch (ngày, giờ, thời lượng, voucher)
- **Schedule Grid** 32 slots với color coding
- Button "Thanh toán ngay" (green, prominent)

### 2. VNPay Gateway (External - Bank Website)

- Logo ngân hàng
- Thông tin giao dịch
- Form nhập thông tin thẻ
- Button "Thanh toán"

### 3. Payment Success Page ⭐

- **Header:**

  - Success icon (green checkmark) với confetti animation
  - Title: "Đặt Sân Thành Công!"
  - Subtitle: "Thanh toán đã được xác nhận..."

- **Booking Card:**

  - Header: "Thông Tin Đặt Sân" + badge "Đã xác nhận"
  - Info rows:
    - Mã đặt chỗ: [BOOKING_ID]
    - Sân: Sân A1 (Bóng đá 5 người)
    - Địa điểm: 123 ABC, Hà Nội
    - Thời gian: 10/12/2024 14:00 (90 phút)
    - Khách hàng: Nguyễn Văn A
    - Tổng tiền: 300,000đ
    - Thanh toán: ✅ Đã thanh toán
  - QR Code section với label "Mã QR Check-in"

- **Action Buttons:**

  - 🟢 "Tải vé" (primary, green)
  - 🔵 "In vé" (blue)
  - 🟣 "Xem lịch sử đặt sân" (purple)
  - ⚪ "Về trang chủ" (outline white)

- **Lưu Ý:**
  - Đến sân trước 15 phút
  - Mang mã QR để check-in
  - Hotline: 1900-xxxx
  - Chính sách hủy: 24 giờ trước

## 🔧 Technical Implementation

### Backend (NestJS)

- **Race Condition Handling:** Pessimistic write lock
- **Transaction Management:** QueryRunner with rollback
- **VNPay Integration:**
  - Generate payment URL với HMAC-SHA512 signature
  - Return URL: `/vnpay-return`
  - IPN URL: `/payment/vnpay-ipn` (webhook)

### Frontend (Angular)

- **Standalone Components:** Lazy loading
- **Services:**
  - `BookingsService`: Create booking, get schedule
  - `PaymentService`: Stats, revenue chart
- **Routing:**
  - `/detail/:id` → Booking page
  - `/vnpay-return` → Callback handler
  - `/payment-success` → Success page
- **State Management:** RxJS + LocalStorage
- **Timezone:** Proper UTC handling

## 📊 Data Flow

```
Frontend                Backend              VNPay
   |                       |                   |
   |--Create Booking------>|                   |
   |                       |--Check Field----->DB
   |                       |--Pessimistic Lock-|
   |                       |--Create Payment-->|
   |                       |--Generate URL-----|
   |<--Payment URL---------|                   |
   |                                           |
   |--Redirect to VNPay---------------------->|
   |                                           |
   |<--User pays on bank site-----------------|
   |                                           |
   |<--Callback /vnpay-return-----------------|
   |                                           |
   |--Process & Redirect /payment-success---->|
   |                                           |
   |--Load Booking Details------------------->|
   |<--Booking Data---------------------------|
   |                                           |
   |--Download Ticket------------------------>|
   ✅ DONE
```

## 🎓 Điểm Nổi Bật Cho Báo Cáo

1. **Race Condition Prevention:** Sử dụng pessimistic write lock để tránh double booking
2. **Real Payment Integration:** Tích hợp VNPay gateway thật (không phải mock)
3. **Timezone Handling:** Xử lý chính xác múi giờ local vs UTC
4. **Schedule Visualization:** Grid 32 slots với realtime updates
5. **QR Code Generation:** Dynamic QR code cho check-in
6. **Ticket Download:** Export ticket dạng text file
7. **Responsive Design:** Hoạt động tốt trên mobile và desktop
8. **Error Handling:** Xử lý đầy đủ các trường hợp lỗi
9. **UX Optimization:**
   - Click slot để chọn giờ nhanh
   - Auto-refresh schedule
   - Loading states
   - Success animations

## 📝 Notes

- **Mock Data:** Nếu API fail, component sẽ fallback sang mock data để demo được
- **Booking Details:** Hiện tại dùng mock data, có thể thay bằng API call thật
- **Ticket Format:** Text file đơn giản, có thể nâng cấp lên PDF

## 🚀 Quick Demo

```bash
# Terminal 1: Backend
cd DACSII-BE && npm run start:dev

# Terminal 2: Frontend
cd DACSII-FE && npm start

# Browser: Open demo page
open demo-payment-flow.html
# OR
open http://localhost:4200/payment-success?bookingId=DEMO-12345
```

---

**🎉 Demo sẵn sàng cho báo cáo!**

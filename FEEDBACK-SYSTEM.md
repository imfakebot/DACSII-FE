# ✅ Feedback/Support Ticket System - Complete Implementation

## 🎯 Overview

Hệ thống tạo và quản lý ticket hỗ trợ/feedback đã được fix hoàn toàn, matching với backend API.

## 📋 Backend API

### POST /feedbacks - Tạo ticket mới

**Endpoint:** `http://localhost:3000/feedbacks`
**Auth:** JWT Bearer Token (User/Admin)
**Method:** POST

**Request Body (CreateFeedbackDto):**

```json
{
  "title": "Góp ý về sân",
  "category": "suggestion",
  "content": "Sân nên có thêm ghế ngồi và đèn chiếu sáng tốt hơn."
}
```

**Fields:**

- `title` (string, required) - Tiêu đề ticket
- `category` (string, required) - Danh mục: `support`, `suggestion`, `complaint`, `inquiry`, `other`
- `content` (string, required) - Nội dung chi tiết

**Response:**

```json
{
  "id": "uuid",
  "title": "Góp ý về sân",
  "category": "suggestion",
  "status": "open",
  "created_at": "2025-12-08T00:00:00.000Z",
  "updated_at": "2025-12-08T00:00:00.000Z",
  "user": {
    "id": "uuid",
    "full_name": "Nguyễn Văn A",
    "email": "user@example.com"
  },
  "responses": []
}
```

### GET /feedbacks/me - Lấy ticket của tôi

**Endpoint:** `http://localhost:3000/feedbacks/me`
**Auth:** JWT Bearer Token (User)
**Method:** GET
**Returns:** Array of feedback tickets

### GET /feedbacks/admin/all - Lấy tất cả tickets (Admin)

**Endpoint:** `http://localhost:3000/feedbacks/admin/all`
**Auth:** JWT Bearer Token (Admin/Manager)
**Method:** GET

### GET /feedbacks/:id - Chi tiết ticket

**Endpoint:** `http://localhost:3000/feedbacks/:id`
**Auth:** JWT Bearer Token
**Method:** GET
**Returns:** Ticket với tất cả responses

### POST /feedbacks/:id/reply - Trả lời ticket

**Endpoint:** `http://localhost:3000/feedbacks/:id/reply`
**Auth:** JWT Bearer Token
**Method:** POST
**Body:** `{ "message": "Cảm ơn bạn đã góp ý!" }`

## 🎨 Frontend Implementation

### Route

**URL:** `http://localhost:4200/feedbacks`

### Features

#### 1. Create Ticket Form

- **Tiêu đề** (required) - Tóm tắt vấn đề
- **Danh mục** (required) - Dropdown với 5 options:
  - 🛠️ Yêu cầu hỗ trợ (support)
  - 💡 Góp ý / Đề xuất (suggestion)
  - ⚠️ Khiếu nại (complaint)
  - ❓ Câu hỏi / Tư vấn (inquiry)
  - 📝 Khác (other)
- **Nội dung** (required) - Mô tả chi tiết

#### 2. Ticket List

- Grid layout responsive
- Mỗi card hiển thị:
  - Tiêu đề
  - Category badge
  - Status badge (Mới/Đang xử lý/Đã giải quyết/Đã đóng)
  - Thời gian (relative: "5 phút trước", "2 giờ trước")
  - Số lượng phản hồi
- Click vào card → Chi tiết ticket

#### 3. Status Colors

- 🔵 **Mới (open)** - Blue
- 🟡 **Đang xử lý (in_progress)** - Yellow
- 🟢 **Đã giải quyết (resolved)** - Green
- ⚪ **Đã đóng (closed)** - Gray

#### 4. UI/UX

- ✅ Form grid 2-column layout
- ✅ Category dropdown với custom arrow
- ✅ Full-width textarea
- ✅ Loading states
- ✅ Error/Success messages
- ✅ Empty state với illustration
- ✅ Hover animations
- ✅ Responsive design
- ✅ Category badge display
- ✅ Relative time formatting

### Example Usage

#### Create Support Ticket

```
Title: Không thể đặt sân vào cuối tuần
Category: Yêu cầu hỗ trợ
Content: Tôi đã thử đặt sân cho Thứ 7 tuần này nhưng hệ thống báo lỗi.
         Booking ID: ABC123. Vui lòng hỗ trợ kiểm tra.
```

#### Create Suggestion

```
Title: Đề xuất thêm sân đá banh 7 người
Category: Góp ý / Đề xuất
Content: Hiện tại chỉ có sân 5 và 11 người. Nên thêm sân 7 người
         để có nhiều lựa chọn hơn cho khách hàng.
```

#### Create Complaint

```
Title: Sân bóng bẩn, không vệ sinh
Category: Khiếu nại
Content: Sân số 3 hôm qua (07/12/2025) rất bẩn, có rác và nước đọng.
         Mong được cải thiện vệ sinh sân.
```

## 🔧 Technical Details

### Changes Made

#### 1. FeedbacksService (`feedbacks.service.ts`)

**Before:**

```typescript
export interface CreateFeedbackDto {
  subject: string;
  message: string;
}
```

**After:**

```typescript
export interface CreateFeedbackDto {
  title: string;
  category: string;
  content: string;
}
```

#### 2. Component (`my-feedbacks.ts`)

**Added:**

- `categories` array với 5 options
- `getCategoryLabel()` helper method
- Updated validation to check `title` and `content`
- Updated `resetForm()` with default category

**Form Object:**

```typescript
newTicket: CreateFeedbackDto = {
  title: '',
  category: 'support',
  content: '',
};
```

#### 3. Template (`my-feedbacks.html`)

**Added:**

- Category select dropdown
- Category badge display in ticket cards
- Grid layout for form (2 columns)
- Full-width class for textarea

**Form Structure:**

```html
<form (ngSubmit)="createTicket()">
  <div class="form-group">
    <!-- Title input -->
  </div>
  <div class="form-group">
    <!-- Category select -->
  </div>
  <div class="form-group full-width">
    <!-- Content textarea -->
  </div>
  <div class="form-actions">
    <!-- Submit/Cancel buttons -->
  </div>
</form>
```

#### 4. Styles (`my-feedbacks.scss`)

**Added:**

- Grid layout: `display: grid; grid-template-columns: 1fr 1fr;`
- `.full-width` class: `grid-column: 1 / -1;`
- Select styling với custom arrow (SVG)
- `.feedback-category` badge styles
- `.header-left` flex container

## 🚀 Testing

### 1. Create Ticket

1. Navigate to `/feedbacks`
2. Click "Tạo ticket mới"
3. Fill form:
   - Title: "Test ticket"
   - Category: "Yêu cầu hỗ trợ"
   - Content: "Đây là test content"
4. Click "Gửi ticket"
5. ✅ Success message appears
6. ✅ Form closes
7. ✅ New ticket appears in list

### 2. View Ticket List

1. Check ticket cards display:
   - ✅ Title
   - ✅ Category badge
   - ✅ Status badge
   - ✅ Created time (relative)
   - ✅ Response count
2. Hover on card → ✅ Lift animation

### 3. Empty State

1. No tickets → ✅ Shows illustration and "Tạo ticket đầu tiên" button

### 4. Validation

- ❌ Empty title → Error message
- ❌ Empty content → Error message
- ✅ Both fields filled → Submit successful

### 5. Category Dropdown

- ✅ Shows 5 options
- ✅ Default: "Yêu cầu hỗ trợ"
- ✅ Custom arrow icon
- ✅ Keyboard accessible

## 📊 Data Flow

```
User fills form (title, category, content)
     ↓
Frontend validation
     ↓
Create payload: { title, category, content }
     ↓
POST /feedbacks with JWT token
     ↓
Backend validates CreateFeedbackDto
     ↓
Save to database with user info
     ↓
Return ticket object with status "open"
     ↓
Frontend shows success + refreshes list
     ↓
User can click card → View detail page
```

## 🎓 Key Points

1. **Three Required Fields:**

   - `title` - Tiêu đề ticket
   - `category` - Danh mục (support/suggestion/complaint/inquiry/other)
   - `content` - Nội dung chi tiết

2. **Category System:**

   - Dropdown với 5 predefined options
   - Default: "support"
   - Displayed as badge in ticket list

3. **Status Lifecycle:**

   - **open** (created) → **in_progress** (admin replies) → **resolved** (issue fixed) → **closed**

4. **Ticket Structure:**

   - Initial ticket contains user's first message in `content`
   - Replies stored in `responses[]` array
   - Each response has `sender_type: 'user' | 'admin'`

5. **UI Enhancements:**
   - 2-column form layout
   - Category badge with icon
   - Relative time display
   - Hover animations
   - Empty state illustration

## 🐛 Common Issues & Solutions

### Issue: 400 Bad Request

**Cause:** Missing required fields (title, category, content)
**Solution:** ✅ Fixed - All 3 fields now required in form

### Issue: 401 Unauthorized

**Cause:** No JWT token or expired
**Solution:** Login first at `/auth/login`

### Issue: Ticket list empty but created successfully

**Cause:** GET /feedbacks/me returns empty array
**Solution:** Check backend database, verify JWT token belongs to ticket creator

### Issue: Category not showing

**Cause:** Backend doesn't return category field
**Solution:** ✅ Fixed - Category now included in response and displayed as badge

## 🎉 Before vs After

### Before (BROKEN)

```typescript
// ❌ Mismatched DTO
CreateFeedbackDto {
  subject: string;  // Backend expects "title"
  message: string;  // Backend expects "content"
  // Missing "category" field
}
```

### After (FIXED)

```typescript
// ✅ Matching backend exactly
CreateFeedbackDto {
  title: string;    // ✓ Matches backend
  category: string; // ✓ Now included
  content: string;  // ✓ Matches backend
}
```

## ✅ Completion Checklist

- ✅ Fix CreateFeedbackDto interface (title, category, content)
- ✅ Add categories array with 5 options
- ✅ Update form with title input
- ✅ Add category dropdown
- ✅ Rename message → content
- ✅ Add getCategoryLabel() helper
- ✅ Display category badge in ticket list
- ✅ Grid layout for form (2 columns)
- ✅ Select styling with custom arrow
- ✅ Full-width textarea
- ✅ Form validation
- ✅ Error handling
- ✅ Success notifications
- ✅ Responsive design
- ✅ Hover animations

**🎊 Feature 100% Functional!**

# [BE-06] API Quản Lý Khóa Học & Bài Học Kéo-Thả Scratch (Scratch Engine Backend)

> **Mô tả nghiệp vụ**: Xây dựng hệ thống quản lý các khóa học và bài học lập trình trực quan kéo-thả Scratch cho thiếu nhi. Cung cấp API lưu trữ tiến độ học tập của từng học sinh (Đã mở khóa, Đang học, Hoàn thành), xác thực chuỗi khối lệnh mục tiêu (Block Sequence Verification) từ phía máy chủ và cấp thưởng XP/Sao Xu khi hoàn thành bài học.

---

## 📌 1. THÔNG TIN TASK
- **Mã Task**: `BE-06`
- **Mảng phụ trách**: Backend (FastAPI + SQLAlchemy + PostgreSQL)
- **Độ ưu tiên**: 🟠 P1 (Quan trọng / Trải nghiệm EdTech cốt lõi)
- **Người thực hiện**: Antigravity Assistant
- **Trạng thái**: 🟢 Done (Đã hoàn thành 100%)
- **Branch làm việc**: `feature/be-06-scratch-courses`

---

## 📖 2. ĐIỂM LƯU Ý VỀ CÔNG NGHỆ & THUẬT NGỮ CẦN NẮM

1. **Target Block Sequence (Chuỗi khối lệnh mục tiêu)**:
   - Dữ liệu quy định chuỗi hành động mà học sinh cần lắp ghép để giải bài toán Scratch.
   - Ví dụ: `"move_forward,move_forward,turn_left,move_forward"`.
2. **Start Scene JSON (Trạng thái khởi đầu của sân khấu)**:
   - Tọa độ khởi đầu của nhân vật Mèo (`cat_pos: [row, col]`), vị trí ngôi sao cần ăn (`star_pos: [row, col]`), các chướng ngại vật trên ma trận.
3. **Lesson Progression Flow (Tiến độ bài học tuần tự)**:
   - Học sinh phải hoàn thành bài 1 thì bài 2 mới được tự động mở khóa (Unlock Next Lesson).
   - Lưu trữ trong bảng `user_scratch_progress` (User ID, Course ID, Lesson Num, Status: `completed` / `locked`).

---

## 🎯 3. CHI TIẾT TÍNH NĂNG CẦN PHÁT TRIỂN (FEATURE SCOPE)

1. **API Lấy Danh Sách Khóa Học Kèm Tiến Độ Học Sinh (`GET /api/scratch/courses?userId=...`)**:
   - Trả về danh sách khóa học kèm danh sách bài học.
   - Nếu có truyền `userId`: Đánh dấu rõ bài học nào đã hoàn thành (kèm số sao), bài học nào đang mở, bài học nào bị khóa.
2. **API Nộp & Kiểm Tra Kết Quả Bài Học Scratch (`POST /api/scratch/lessons/submit`)**:
   - Nhận đầu vào: `userId`, `courseId`, `lessonNum`, `submittedSequence` (chuỗi khối lệnh học sinh vừa xếp).
   - So sánh chuỗi lệnh với `target_block_sequence` trong DB:
     - Nếu đúng: Đánh dấu hoàn thành bài học, mở khóa bài kế tiếp, cộng `xp_reward` và xu thưởng vào Ví.
     - Nếu sai: Trả về gợi ý sư phạm để bé sửa lại logic.
3. **API Admin / Teacher Tạo Bài Học Scratch Mới (`POST /api/admin/scratch/lessons`)**:
   - Cho phép giáo viên thiết lập bài tập Scratch mới (Tiêu đề, nội dung hướng dẫn, tọa độ nhân vật, khối lệnh mục tiêu).

---

## 📋 4. DANH SÁCH CÔNG VIỆC CHI TIẾT (CHECKLIST)

- [x] **1. Nâng cấp Models trong `backend/app/models.py`**:
  - [x] Thêm bảng `UserScratchProgress` (`user_id`, `course_id`, `lesson_id`, `completed`, `stars_earned`, `completed_at`).
- [x] **2. Tạo Router riêng `backend/app/routers/scratch.py`**:
  - [x] `GET /api/scratch/courses`: Danh sách khóa học kèm tiến độ.
  - [x] `POST /api/scratch/lessons/submit`: Chấm điểm bài học Scratch.
  - [x] `POST /api/admin/scratch/courses`: Tạo khóa học mới.
  - [x] `POST /api/admin/scratch/lessons`: Tạo bài học mới.
  - [x] `PUT /api/admin/scratch/lessons/{lesson_id}` & `DELETE /api/admin/scratch/courses/{course_id}`.
- [x] **3. Đăng ký Router mới vào `backend/app/main.py`**.
- [x] **4. Bổ sung Seed Data 5 bài học Scratch nhập môn chuẩn mực trong `backend/app/seed.py`**.
- [x] **5. Viết Test & Kiểm thử thực tế**:
  - [x] Viết `backend/test_be06_scratch.py` bao phủ 100% các kịch bản và test thành công.

---

## 💡 5. HƯỚNG DẪN CODE MẪU THAM KHẢO

### Logic kiểm tra khối lệnh và cập nhật tiến độ:

```python
@router.post("/api/scratch/lessons/submit")
def submit_scratch_lesson(body: schemas.ScratchSubmitIn, db: Session = Depends(get_db)):
    user = db.get(models.User, body.userId)
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    lesson = (
        db.query(models.ScratchLesson)
        .filter_by(course_id=body.courseId, lesson_num=body.lessonNum)
        .first()
    )
    if not lesson:
        raise HTTPException(status_code=404, detail="Bài học không tồn tại")

    # Chuẩn hóa chuỗi khối lệnh để so sánh
    target_seq = [s.strip().lower() for s in lesson.target_block_sequence.split(",") if s.strip()]
    user_seq = [s.strip().lower() for s in body.submittedSequence if s.strip()]

    is_correct = (target_seq == user_seq)
    if not is_correct:
        return {
            "success": False,
            "message": "Các bước đi chưa hoàn toàn chính xác. Hãy xem kỹ đường đi của chú Mèo nhé!",
        }

    # Đánh dấu hoàn thành
    progress = (
        db.query(models.UserScratchProgress)
        .filter_by(user_id=body.userId, lesson_id=lesson.id)
        .first()
    )
    if not progress:
        progress = models.UserScratchProgress(
            user_id=body.userId,
            course_id=body.courseId,
            lesson_id=lesson.id,
            completed=True,
            stars_earned=3,
        )
        db.add(progress)
        # Thưởng XP
        user.xp += lesson.xp_reward
    
    db.commit()

    return {
        "success": True,
        "message": "Tuyệt vời! Bạn đã điều khiển chú Mèo lập trình thành công!",
        "xpAwarded": lesson.xp_reward,
        "nextLessonNum": body.lessonNum + 1,
    }
```

---

## 🚫 6. QUY TẮC GIT & TẠO PULL REQUEST (BẮT BUỘC)

1. **Khởi tạo branch**:
   ```bash
   git checkout main && git pull origin main
   git checkout -b feature/be-06-scratch-courses
   ```
2. **Tuyệt đối KHÔNG commit trực tiếp vào `main`**.
3. **Commit message chuẩn**:
   ```bash
   git commit -m "backend: xây dựng API quản lý khóa học Scratch và chấm chuỗi khối lệnh"
   ```
4. **Quy trình gửi PR**: Push branch lên remote và mở PR trỏ vào `main`.

---

## 🧪 7. TIÊU CHÍ NGHIỆM THU & BƯỚC TEST KỸ TRƯỚC KHI TẠO PR

- [ ] **1. Test Lấy danh sách khóa học**:
  - Gọi `GET /api/scratch/courses` ➔ Nhận danh sách các khóa học kèm các bài học lồng nhau.
- [ ] **2. Test Nộp bài học Scratch**:
  - Gửi chuỗi khối lệnh đúng ➔ API trả về `success: true`, cộng điểm XP cho học sinh, bài tiếp theo mở khóa.
  - Gửi chuỗi sai ➔ API trả về `success: false` kèm lời gợi ý động viên.
- [ ] **3. Test Lưu tiến độ**:
  - F5 hoặc gọi lại API ➔ Bài học đã hoàn thành có cờ `completed = true`.

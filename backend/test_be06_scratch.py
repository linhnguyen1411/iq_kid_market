"""
Script kiểm thử toàn diện Task BE-06: API Quản Lý Khóa Học & Bài Học Kéo-Thả Scratch (Scratch Engine)
"""
import os
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app import seed as seed_module

TEST_DB_URL = "sqlite:///:memory:"
engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)

# Nạp seed data khởi tạo
with TestingSessionLocal() as db:
    seed_module.run_seed(db, force=True)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def test_be06_scratch_pipeline():
    print("🚀 BẮT ĐẦU KIỂM THỬ TASK BE-06: SCRATCH COURSES & LESSON SUBMISSION...\n")

    # 1. TẠO TÀI KHOẢN HỌC SINH & GIÁO VIÊN
    print("1️⃣ [Chuẩn bị dữ liệu]: Tạo tài khoản Học sinh và Giáo viên...")
    res_student = client.post("/api/auth/register", json={
        "username": "coder_kid",
        "password": "password123",
        "name": "Bé Lập Trình Viên 💻",
        "role": "student",
    })
    assert res_student.status_code == 200
    student_id = res_student.json()["user"]["id"]

    res_teacher = client.post("/api/auth/register", json={
        "username": "teacher_scratch",
        "password": "password123",
        "name": "Thầy Nam Scratch",
        "role": "teacher",
    })
    teacher_token = res_teacher.json()["access_token"]
    teacher_headers = {"Authorization": f"Bearer {teacher_token}"}
    print(f"   ✅ Học sinh: {student_id}, Giáo viên: Đã lấy token.")

    # 2. TEST GET /api/scratch/courses
    print("2️⃣ [Test Lấy Danh Sách Khóa Học & Tiến Độ Ban Đầu]: GET /api/scratch/courses...")
    res_courses = client.get(f"/api/scratch/courses?userId={student_id}")
    assert res_courses.status_code == 200
    courses = res_courses.json()
    assert len(courses) > 0
    course1 = courses[0]
    course_id = course1["id"]
    lessons = course1["lessons"]
    assert len(lessons) >= 2
    assert lessons[0]["lesson_num"] == 1
    assert lessons[0]["isLocked"] is False  # Bài 1 luôn mở
    assert lessons[1]["lesson_num"] == 2
    assert lessons[1]["isLocked"] is True  # Bài 2 bị khóa khi chưa hoàn thành bài 1
    print(f"   ✅ Khóa học: '{course1['title']}' có {len(lessons)} bài học. Bài 1 mở, Bài 2 khóa.")

    # 3. TEST NỘP BÀI SAI KHỐI LỆNH -> BÁO LỖI GỢI Ý
    print("3️⃣ [Test Nộp Bài Sai Khối Lệnh]: POST /api/scratch/lessons/submit...")
    res_wrong = client.post("/api/scratch/lessons/submit", json={
        "userId": student_id,
        "courseId": course_id,
        "lessonNum": 1,
        "submittedSequence": ["turn_left", "turn_right"],  # Sai
    })
    assert res_wrong.status_code == 200
    data_wrong = res_wrong.json()
    assert data_wrong["success"] is False
    assert "chưa hoàn toàn chính xác" in data_wrong["message"]
    print("   ✅ Hệ thống đã phát hiện khối lệnh sai và gửi thông báo gợi ý sư phạm.")

    # 4. TEST NỘP BÀI ĐÚNG KHỐI LỆNH -> NHẬN XP, XU VÀ MỞ KHÓA BÀI TIẾP THEO
    print("4️⃣ [Test Nộp Bài Đúng Khối Lệnh]: POST /api/scratch/lessons/submit...")
    target_seq = lessons[0]["target_block_sequence"]
    res_correct = client.post("/api/scratch/lessons/submit", json={
        "userId": student_id,
        "courseId": course_id,
        "lessonNum": 1,
        "submittedSequence": target_seq,  # Đúng chuỗi mục tiêu
    })
    assert res_correct.status_code == 200
    data_correct = res_correct.json()
    assert data_correct["success"] is True
    assert data_correct["xpAwarded"] >= 30
    assert data_correct["coinAwarded"] >= 10
    assert data_correct["nextLessonNum"] == 2
    print(f"   ✅ Nộp bài thành công! Thưởng +{data_correct['xpAwarded']} XP, +{data_correct['coinAwarded']} xu, mở khóa Bài 2.")

    # 5. TEST KIỂM TRA LẠI TIẾN ĐỘ SAU KHI NỘP BÀI 1
    print("5️⃣ [Test Tiến Độ Tự Động Mở Khóa]: GET /api/scratch/courses?userId=...")
    res_after = client.get(f"/api/scratch/courses?userId={student_id}")
    courses_after = res_after.json()
    lessons_after = courses_after[0]["lessons"]
    assert lessons_after[0]["completed"] is True
    assert lessons_after[1]["isLocked"] is False  # Bài 2 đã được mở khóa!
    print("   ✅ Bài 1 đã chuyển 'completed=true', Bài 2 đã tự động mở khóa 'isLocked=false'.")

    # 6. TEST API GIÁO VIÊN TẠO KHÓA HỌC & BÀI HỌC MỚI
    print("6️⃣ [Test API Quản Lý Khóa Học Dành Cho Giáo Viên]:...")
    res_create_course = client.post(
        "/api/admin/scratch/courses",
        json={
            "id": "course_advance_ai",
            "title": "Scratch Nâng Cao: Mê Cung Thông Minh 🏰",
            "description": "Thử thách lập trình thuật toán né chướng ngại vật.",
            "thumbnail": "🏰",
            "difficulty": "Nâng cao",
        },
        headers=teacher_headers,
    )
    assert res_create_course.status_code == 200
    new_c_id = res_create_course.json()["course"]["id"]
    print(f"   ✅ Giáo viên tạo khóa học thành công: ID={new_c_id}.")

    # Thêm bài học vào khóa học vừa tạo
    res_create_lesson = client.post(
        "/api/admin/scratch/lessons",
        json={
            "course_id": new_c_id,
            "lesson_num": 1,
            "title": "Màn 1: Vượt Cầu Gỗ 🪵",
            "content": "Sử dụng 3 khối lệnh đi thẳng và 1 khối lệnh rẽ phải.",
            "target_block_sequence": "move_forward,move_forward,move_forward,turn_right",
            "xp_reward": 50,
        },
        headers=teacher_headers,
    )
    assert res_create_lesson.status_code == 200
    created_lesson_id = res_create_lesson.json()["lesson"]["id"]
    print(f"   ✅ Đã thêm bài học thành công: ID={created_lesson_id}.")

    # Cập nhật bài học
    res_update_lesson = client.put(
        f"/api/admin/scratch/lessons/{created_lesson_id}",
        json={"title": "Màn 1: Vượt Cầu Gỗ Hiểm Trở 🪵⚡", "xp_reward": 60},
        headers=teacher_headers,
    )
    assert res_update_lesson.status_code == 200
    assert res_update_lesson.json()["lesson"]["xp_reward"] == 60
    print("   ✅ Cập nhật bài học thành công.")

    print("\n🎉 TẤT CẢ CÁC TEST CASES CỦA TASK BE-06 ĐÃ PASSED 100%! MODULE SCRATCH ENGINE HOÀN HẢO.")


if __name__ == "__main__":
    test_be06_scratch_pipeline()

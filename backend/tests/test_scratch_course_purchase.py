import pytest
from app import models

def test_scratch_course_purchase_and_admin_bypass(client, student_auth, teacher_auth, admin_auth, db_session):
    """
    Kiểm tra:
    1. Học sinh: Lesson 1 mở (trial), Lesson 2 bị khóa (need_purchase).
    2. Học sinh mua khóa học bằng ví xu thành công.
    3. Sau khi mua, hoàn thành Bài 1 thì Bài 2 mở khóa (tuần tự).
    4. Giáo viên / Admin: Tự động bypass mở khóa toàn bộ bài học (Phương án 2).
    """
    student_headers = student_auth["headers"]
    student_id = student_auth["user_id"]

    # 1. Học sinh xem danh sách khóa học ban đầu
    res = client.get("/api/scratch/courses", headers=student_headers)
    assert res.status_code == 200
    courses = res.json()
    sc4 = [c for c in courses if c["id"] == "sc4"][0]
    assert sc4["price"] == 50
    assert sc4["isPurchased"] is False

    # Bài 1 mở cho học thử
    assert sc4["lessons"][0]["isLocked"] is False
    # Bài 2 bị khóa vì chưa mua khóa học
    assert sc4["lessons"][1]["isLocked"] is True
    assert sc4["lessons"][1]["lockReason"] == "need_purchase"

    # Thử lấy chi tiết bài 2 khi chưa mua -> 403
    res_l2_detail = client.get("/api/scratch/courses/sc4/lessons/2", headers=student_headers)
    assert res_l2_detail.status_code == 403

    # 2. Học sinh nạp Token và mua khóa học sc4 (giá 50 Token)
    wallet = db_session.query(models.Wallet).filter_by(user_id=student_id).first()
    wallet.balance = 60
    db_session.commit()

    res_buy = client.post("/api/scratch/courses/sc4/purchase", headers=student_headers)
    assert res_buy.status_code == 200
    buy_data = res_buy.json()
    assert buy_data["success"] is True
    assert buy_data["isPurchased"] is True
    assert buy_data["balance"] == 10  # 60 - 50 = 10 Token

    # Sau khi mua nhưng chưa làm bài 1: Bài 2 bị khóa vì cần làm bài 1 trước
    res_after_buy = client.get("/api/scratch/courses", headers=student_headers)
    sc4_after_buy = [c for c in res_after_buy.json() if c["id"] == "sc4"][0]
    assert sc4_after_buy["isPurchased"] is True
    assert sc4_after_buy["lessons"][1]["isLocked"] is True
    assert sc4_after_buy["lessons"][1]["lockReason"] == "need_previous"

    # 3. Học sinh hoàn thành Bài 1
    res_submit1 = client.post("/api/scratch/lessons/submit", json={
        "courseId": "sc4",
        "lessonNum": 1,
        "submittedSequence": {
            "blocks": [
                {"type": "scratch_when_flag_clicked"},
                {"type": "scratch_say_for_secs", "fields": {"MESSAGE": "Xin chào!"}}
            ],
            "telemetry": {
                "has_run": True,
                "actions": {"messages_said": ["Xin chào!"]}
            }
        }
    }, headers=student_headers)
    assert res_submit1.status_code == 200

    # Sau khi xong Bài 1: Bài 2 tự động mở khóa
    res_after_l1 = client.get("/api/scratch/courses", headers=student_headers)
    sc4_after_l1 = [c for c in res_after_l1.json() if c["id"] == "sc4"][0]
    assert sc4_after_l1["lessons"][1]["isLocked"] is False
    assert sc4_after_l1["lessons"][1]["lockReason"] is None

    # 4. Kiểm tra quyền Giáo viên (Phương án 2 bypass)
    res_teacher = client.get("/api/scratch/courses", headers=teacher_auth["headers"])
    assert res_teacher.status_code == 200
    sc4_teacher = [c for c in res_teacher.json() if c["id"] == "sc4"][0]
    assert sc4_teacher["isPurchased"] is True
    for lesson in sc4_teacher["lessons"]:
        assert lesson["isLocked"] is False, f"Giáo viên phải mở khóa bài {lesson['lesson_num']}"

    # 5. Kiểm tra quyền Admin (Phương án 2 bypass)
    res_admin = client.get("/api/scratch/courses", headers=admin_auth["headers"])
    assert res_admin.status_code == 200
    sc4_admin = [c for c in res_admin.json() if c["id"] == "sc4"][0]
    assert sc4_admin["isPurchased"] is True
    for lesson in sc4_admin["lessons"]:
        assert lesson["isLocked"] is False, f"Admin phải mở khóa bài {lesson['lesson_num']}"

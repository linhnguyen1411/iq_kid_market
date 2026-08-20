import time
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..auth_utils import require_roles

router = APIRouter(tags=["scratch"])


# ---------- 1. Danh sách tất cả các khóa học Scratch & Tiến độ học sinh ----------
@router.get("/api/scratch/courses")
def get_scratch_courses(userId: str | None = None, db: Session = Depends(get_db)):
    """
    Lấy danh sách khóa học Scratch.
    Nếu có truyền userId: Tự động tính toán trạng thái (Hoàn thành / Đang học / Đang bị khóa)
    và số sao đạt được cho từng bài học.
    """
    courses = db.query(models.ScratchCourse).all()

    # Nếu có userId, lấy toàn bộ tiến độ của học sinh
    user_progress_map = {}
    if userId:
        progresses = db.query(models.UserScratchProgress).filter_by(user_id=userId).all()
        for p in progresses:
            user_progress_map[(p.course_id, p.lesson_num)] = p

    result = []
    for c in courses:
        lessons_data = []
        previous_lesson_completed = True  # Bài 1 luôn mở khóa mặc định

        for l in c.lessons:
            p = user_progress_map.get((c.id, l.lesson_num))
            is_completed = p.completed if p else False
            stars = p.stars_earned if p else 0
            is_locked = not previous_lesson_completed

            lessons_data.append({
                "id": l.id,
                "lesson_num": l.lesson_num,
                "title": l.title,
                "content": l.content,
                "target_block_sequence": l.target_block_sequence,
                "start_scene_json": l.start_scene_json,
                "xp_reward": l.xp_reward,
                "completed": is_completed,
                "stars": stars,
                "isLocked": is_locked,
            })

            # Cập nhật điều kiện mở khóa cho bài tiếp theo
            previous_lesson_completed = is_completed

        completed_lessons_count = sum(1 for item in lessons_data if item["completed"])
        progress_percent = int((completed_lessons_count / len(lessons_data) * 100)) if lessons_data else 0

        result.append({
            "id": c.id,
            "title": c.title,
            "description": c.description,
            "thumbnail": c.thumbnail,
            "difficulty": c.difficulty,
            "total_lessons": c.total_lessons or len(c.lessons),
            "completedLessons": completed_lessons_count,
            "progressPercent": progress_percent,
            "lessons": lessons_data,
        })

    return result


# ---------- 2. Chi tiết 1 khóa học Scratch ----------
@router.get("/api/scratch/courses/{course_id}")
def get_scratch_course_detail(course_id: str, userId: str | None = None, db: Session = Depends(get_db)):
    course = db.get(models.ScratchCourse, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Không tìm thấy khóa học Scratch!")

    user_progress_map = {}
    if userId:
        progresses = db.query(models.UserScratchProgress).filter_by(user_id=userId, course_id=course_id).all()
        for p in progresses:
            user_progress_map[p.lesson_num] = p

    lessons_data = []
    previous_completed = True

    for l in course.lessons:
        p = user_progress_map.get(l.lesson_num)
        is_completed = p.completed if p else False
        stars = p.stars_earned if p else 0
        is_locked = not previous_completed

        lessons_data.append({
            "id": l.id,
            "lesson_num": l.lesson_num,
            "title": l.title,
            "content": l.content,
            "target_block_sequence": l.target_block_sequence,
            "start_scene_json": l.start_scene_json,
            "xp_reward": l.xp_reward,
            "completed": is_completed,
            "stars": stars,
            "isLocked": is_locked,
        })
        previous_completed = is_completed

    return {
        "id": course.id,
        "title": course.title,
        "description": course.description,
        "thumbnail": course.thumbnail,
        "difficulty": course.difficulty,
        "total_lessons": course.total_lessons,
        "lessons": lessons_data,
    }


# ---------- 3. Chi tiết 1 bài học Scratch cụ thể ----------
@router.get("/api/scratch/courses/{course_id}/lessons/{lesson_num}")
@router.get("/api/scratch/lessons/{course_id}/{lesson_num}")
def get_scratch_lesson(
    course_id: str,
    lesson_num: int,
    userId: str | None = None,
    db: Session = Depends(get_db),
):
    lesson = (
        db.query(models.ScratchLesson)
        .filter_by(course_id=course_id, lesson_num=lesson_num)
        .first()
    )
    if not lesson:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài học Scratch này!")

    # Lấy trạng thái hoàn thành & sao nếu có userId
    is_completed = False
    stars = 0
    if userId:
        progress = (
            db.query(models.UserScratchProgress)
            .filter_by(user_id=userId, course_id=course_id, lesson_num=lesson_num)
            .first()
        )
        if progress:
            is_completed = progress.completed
            stars = progress.stars_earned

    return {
        "id": lesson.id,
        "course_id": lesson.course_id,
        "lesson_num": lesson.lesson_num,
        "title": lesson.title,
        "content": lesson.content,
        "target_block_sequence": lesson.target_block_sequence,
        "start_scene_json": lesson.start_scene_json,
        "xp_reward": lesson.xp_reward,
        "completed": is_completed,
        "stars": stars,
    }


# ---------- 4. Chấm điểm & Xác thực chuỗi khối lệnh Scratch ----------
@router.post("/api/scratch/lessons/submit", response_model=schemas.ScratchSubmitOut)
def submit_scratch_lesson(body: schemas.ScratchSubmitIn, db: Session = Depends(get_db)):
    """
    Xác thực chuỗi khối lệnh học sinh kéo thả trên sân khấu:
    1. So sánh chuỗi với target_block_sequence.
    2. Nếu đúng: Lưu UserScratchProgress, thưởng XP & xu, mở khóa bài tiếp theo.
    3. Nếu sai: Phản hồi gợi ý sửa lỗi logic.
    """
    user = db.get(models.User, body.userId)
    if not user:
        user = models.User(
            id=body.userId,
            username=body.userId,
            name="Học Sinh Trải Nghiệm",
            role="student",
            grade=2,
            avatar="smile_tiger",
            xp=0,
            level=1,
            streak=1,
        )
        db.add(user)
        db.flush()
        wallet = models.Wallet(user_id=user.id, balance=90000)
        db.add(wallet)
        db.flush()

    lesson = (
        db.query(models.ScratchLesson)
        .filter_by(course_id=body.courseId, lesson_num=body.lessonNum)
        .first()
    )
    if not lesson:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài học Scratch!")

    # Chuẩn hóa chuỗi khối lệnh mục tiêu
    target_seq = [s.strip().lower() for s in (lesson.target_block_sequence or "").split(",") if s.strip()]

    # Chuẩn hóa chuỗi khối lệnh học sinh nộp
    if isinstance(body.submittedSequence, list):
        user_seq = [str(s).strip().lower() for s in body.submittedSequence if str(s).strip()]
    elif isinstance(body.submittedSequence, str):
        user_seq = [s.strip().lower() for s in body.submittedSequence.split(",") if s.strip()]
    else:
        user_seq = []

    is_correct = (target_seq == user_seq)

    if not is_correct:
        return {
            "success": False,
            "message": "Các bước đi chưa hoàn toàn chính xác. Hãy quan sát lại mục tiêu và thử lại nhé! 💡",
            "xpAwarded": 0,
            "coinAwarded": 0,
            "nextLessonNum": None,
            "starsEarned": 0,
        }

    # Đánh dấu hoàn thành bài học
    now_dt = datetime.utcnow()
    progress = (
        db.query(models.UserScratchProgress)
        .filter_by(user_id=body.userId, course_id=body.courseId, lesson_num=body.lessonNum)
        .first()
    )
    if not progress:
        progress = models.UserScratchProgress(
            id=f"usp_{body.userId}_{body.courseId}_{body.lessonNum}_{int(time.time()*1000)}",
            user_id=body.userId,
            course_id=body.courseId,
            lesson_id=lesson.id,
            lesson_num=body.lessonNum,
            completed=True,
            stars_earned=3,
            submitted_sequence=",".join(user_seq),
            completed_at=now_dt,
        )
        db.add(progress)
    else:
        progress.completed = True
        progress.stars_earned = 3
        progress.submitted_sequence = ",".join(user_seq)
        progress.completed_at = now_dt

    # Thưởng XP cho học sinh
    xp_gain = lesson.xp_reward or 30
    user.xp = (user.xp or 0) + xp_gain

    # Thưởng xu vào ví học sinh
    coin_gain = 10
    wallet = user.wallet
    if wallet:
        wallet.balance += coin_gain
        tx = models.WalletTransaction(
            id=f"tx_scratch_{int(time.time()*1000)}",
            wallet_user_id=wallet.user_id,
            amount=coin_gain,
            type="thưởng chơi game",
            detail=f'Thưởng hoàn thành bài học Scratch: "{lesson.title}" (+{coin_gain} xu)',
            created_at=now_dt,
        )
        db.add(tx)

    db.commit()

    # Kiểm tra xem có bài học tiếp theo hay không
    next_lesson = (
        db.query(models.ScratchLesson)
        .filter_by(course_id=body.courseId, lesson_num=body.lessonNum + 1)
        .first()
    )

    return {
        "success": True,
        "message": "Tuyệt vời! Bạn đã lập trình điều khiển chú Mèo giải mã thử thách hoàn toàn chính xác! 🐱🎉",
        "xpAwarded": xp_gain,
        "coinAwarded": coin_gain,
        "nextLessonNum": (body.lessonNum + 1) if next_lesson else None,
        "starsEarned": 3,
    }


# ---------- 5. API Quản lý dành cho Giáo viên / Admin ----------
@router.post("/api/admin/scratch/courses")
def create_scratch_course(
    body: schemas.CreateScratchCourseIn,
    current_user: models.User = Depends(require_roles(["admin", "teacher", "creator"])),
    db: Session = Depends(get_db),
):
    course_id = body.id or f"course_scratch_{int(time.time()*1000)}"
    course = models.ScratchCourse(
        id=course_id,
        title=body.title,
        description=body.description,
        thumbnail=body.thumbnail or "🐱",
        difficulty=body.difficulty or "Cơ bản",
        total_lessons=0,
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return {"success": True, "course": course}


@router.post("/api/admin/scratch/lessons")
def create_scratch_lesson(
    body: schemas.CreateScratchLessonIn,
    current_user: models.User = Depends(require_roles(["admin", "teacher", "creator"])),
    db: Session = Depends(get_db),
):
    course = db.get(models.ScratchCourse, body.course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Không tìm thấy khóa học Scratch để thêm bài học!")

    lesson_num = body.lesson_num or (len(course.lessons) + 1)
    lesson = models.ScratchLesson(
        course_id=body.course_id,
        lesson_num=lesson_num,
        title=body.title,
        content=body.content or "Hướng dẫn giải thuật lập trình kéo thả",
        target_block_sequence=body.target_block_sequence,
        start_scene_json=body.start_scene_json or '{"cat_pos":[0,0],"star_pos":[2,0]}',
        xp_reward=body.xp_reward or 30,
    )
    db.add(lesson)
    course.total_lessons = len(course.lessons) + 1
    db.commit()
    db.refresh(lesson)
    return {"success": True, "lesson": lesson}


@router.put("/api/admin/scratch/lessons/{lesson_id}")
def update_scratch_lesson(
    lesson_id: int,
    body: schemas.UpdateScratchLessonIn,
    current_user: models.User = Depends(require_roles(["admin", "teacher", "creator"])),
    db: Session = Depends(get_db),
):
    lesson = db.get(models.ScratchLesson, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài học Scratch!")

    if body.title:
        lesson.title = body.title
    if body.content is not None:
        lesson.content = body.content
    if body.target_block_sequence:
        lesson.target_block_sequence = body.target_block_sequence
    if body.start_scene_json:
        lesson.start_scene_json = body.start_scene_json
    if body.xp_reward is not None:
        lesson.xp_reward = body.xp_reward

    db.commit()
    db.refresh(lesson)
    return {"success": True, "lesson": lesson}


@router.delete("/api/admin/scratch/courses/{course_id}")
def delete_scratch_course(
    course_id: str,
    current_user: models.User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db),
):
    course = db.get(models.ScratchCourse, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Không tìm thấy khóa học để xóa!")

    db.delete(course)
    db.commit()
    return {"success": True, "message": f'Đã xóa khóa học "{course.title}" thành công!'}

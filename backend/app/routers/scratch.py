import json
import time
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..auth_utils import require_roles, get_current_user_required, get_current_user_optional
from ..daily_quests import update_quest_progress, XP_PER_LEVEL
from ..exercise_evaluator import evaluate_exercise

router = APIRouter(tags=["scratch"])


# Danh mục các huy hiệu Scratch chuyên biệt (Phase 8)
SCRATCH_ACHIEVEMENT_DEFINITIONS = [
    {
        "id": "scratch_first_code",
        "title": "Bước Chân Đầu Tiên",
        "description": "Hoàn thành bài học Scratch Studio đầu tiên",
        "badge_code": "scratch_first_code",
        "xp_bonus": 100,
        "icon": "🐣",
    },
    {
        "id": "scratch_loop_wizard",
        "title": "Phù Thủy Vòng Lặp",
        "description": "Chinh phục bài học vòng lặp và tối ưu hóa khối lệnh Scratch",
        "badge_code": "scratch_loop_wizard",
        "xp_bonus": 150,
        "icon": "🔄",
    },
    {
        "id": "scratch_creator",
        "title": "Nhà Sáng Tạo Trẻ",
        "description": "Tạo và lưu ít nhất một dự án sáng tạo mới trong Scratch Studio",
        "badge_code": "scratch_creator",
        "xp_bonus": 120,
        "icon": "🎨",
    },
    {
        "id": "scratch_master",
        "title": "Bậc Thầy Scratch",
        "description": "Chinh phục toàn bộ 11 cấp độ trong lộ trình Scratch Studio",
        "badge_code": "scratch_master",
        "xp_bonus": 300,
        "icon": "👑",
    },
]


def check_and_unlock_scratch_achievements(db: Session, user: models.User) -> list[dict]:
    """Kiểm tra và tự động mở khóa các huy hiệu Scratch cho học sinh."""
    existing_unlocked_ids = {
        ua.achievement_id
        for ua in db.query(models.UserAchievement).filter_by(user_id=user.id).all()
    }

    completed_progresses = (
        db.query(models.UserScratchProgress)
        .filter_by(user_id=user.id, completed=True)
        .all()
    )
    total_completed = len(completed_progresses)

    sc4_completed = {
        p.lesson_num
        for p in completed_progresses
        if p.course_id == "sc4"
    }

    project_count = (
        db.query(models.ScratchProject)
        .filter_by(user_id=user.id)
        .count()
    )

    new_unlocked = []
    for defn in SCRATCH_ACHIEVEMENT_DEFINITIONS:
        ach_id = defn["id"]
        if ach_id in existing_unlocked_ids:
            continue

        should_unlock = False
        if ach_id == "scratch_first_code":
            should_unlock = len(sc4_completed) >= 1
        elif ach_id == "scratch_loop_wizard":
            should_unlock = 4 in sc4_completed
        elif ach_id == "scratch_creator":
            should_unlock = project_count >= 1
        elif ach_id == "scratch_master":
            should_unlock = len(sc4_completed) >= 11

        if should_unlock:
            ach = db.get(models.Achievement, ach_id)
            if not ach:
                ach = models.Achievement(**defn)
                db.add(ach)
                db.flush()

            ts = int(time.time() * 1000)
            ua = models.UserAchievement(
                id=f"ua_{user.id}_{ach_id}_{ts}",
                user_id=user.id,
                achievement_id=ach_id,
                unlocked_at=datetime.utcnow(),
            )
            db.add(ua)
            bonus = int(defn["xp_bonus"])
            user.xp = (user.xp or 0) + bonus
            user.level = ((user.xp or 0) // XP_PER_LEVEL) + 1
            new_unlocked.append({
                "id": ach_id,
                "title": defn["title"],
                "badge_code": defn["badge_code"],
                "icon": defn["icon"],
                "xp_bonus": bonus,
                "description": defn["description"],
            })

    if new_unlocked:
        db.commit()
        db.refresh(user)

    return new_unlocked


# ---------- 1. Danh sách tất cả các khóa học Scratch & Tiến độ học sinh ----------
@router.get("/api/scratch/courses")
def get_scratch_courses(
    userId: str | None = None,
    course_type: str | None = Query(None, alias="type"),
    current_user: models.User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    Lấy danh sách khóa học Scratch.
    Nếu có truyền userId hoặc có Token đăng nhập: Tự động tính toán trạng thái
    (Hoàn thành / Đang học / Đang bị khóa) và số sao đạt được cho từng bài học.
    """
    target_user_id = userId or (current_user.id if current_user else None)
    query = db.query(models.ScratchCourse)
    if course_type:
        query = query.filter(models.ScratchCourse.course_type == course_type)
    courses = query.all()

    # Nếu có target_user_id, lấy toàn bộ tiến độ của học sinh
    user_progress_map = {}
    if target_user_id:
        progresses = db.query(models.UserScratchProgress).filter_by(user_id=target_user_id).all()
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
                "engine_type": getattr(l, "engine_type", None) or "algorithm_maze",
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
            "course_type": getattr(c, "course_type", None) or "algorithm_maze",
            "total_lessons": c.total_lessons or len(c.lessons),
            "completedLessons": completed_lessons_count,
            "progressPercent": progress_percent,
            "lessons": lessons_data,
        })

    return result


# ---------- 2. Chi tiết 1 khóa học Scratch ----------
@router.get("/api/scratch/courses/{course_id}")
def get_scratch_course_detail(
    course_id: str,
    userId: str | None = None,
    current_user: models.User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    course = db.get(models.ScratchCourse, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Không tìm thấy khóa học Scratch!")

    target_user_id = userId or (current_user.id if current_user else None)
    user_progress_map = {}
    if target_user_id:
        progresses = db.query(models.UserScratchProgress).filter_by(user_id=target_user_id, course_id=course_id).all()
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
            "engine_type": getattr(l, "engine_type", None) or "algorithm_maze",
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
        "course_type": getattr(course, "course_type", None) or "algorithm_maze",
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
    current_user: models.User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    lesson = (
        db.query(models.ScratchLesson)
        .filter_by(course_id=course_id, lesson_num=lesson_num)
        .first()
    )
    if not lesson:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài học Scratch này!")

    # Lấy trạng thái hoàn thành & sao nếu có user
    target_user_id = userId or (current_user.id if current_user else None)
    is_completed = False
    stars = 0
    if target_user_id:
        progress = (
            db.query(models.UserScratchProgress)
            .filter_by(user_id=target_user_id, course_id=course_id, lesson_num=lesson_num)
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
        "engine_type": getattr(lesson, "engine_type", None) or "algorithm_maze",
        "completed": is_completed,
        "stars": stars,
    }


# ---------- 4. Chấm điểm & Xác thực chuỗi khối lệnh Scratch ----------
@router.post("/api/scratch/lessons/submit", response_model=schemas.ScratchSubmitOut)
def submit_scratch_lesson(
    body: schemas.ScratchSubmitIn,
    current_user: models.User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """
    Xác thực chuỗi khối lệnh học sinh kéo thả trên sân khấu:
    1. Xác thực người dùng qua JWT Token (current_user).
    2. So sánh chuỗi với target_block_sequence.
    3. Nếu đúng: Lưu UserScratchProgress.
       CHỈ THƯỞNG XP & Xu LẦN ĐẦU TIÊN để chống gian lận lặp lại.
    4. Nếu sai: Phản hồi gợi ý sửa lỗi logic.
    """
    user = current_user

    lesson = (
        db.query(models.ScratchLesson)
        .filter_by(course_id=body.courseId, lesson_num=body.lessonNum)
        .first()
    )
    if not lesson:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài học Scratch!")

    engine_type = getattr(lesson, "engine_type", None) or "algorithm_maze"
    is_correct, eval_message, hint = evaluate_exercise(engine_type, body.submittedSequence, lesson)

    if not is_correct:
        return {
            "success": False,
            "message": eval_message,
            "hint": hint,
            "xpAwarded": 0,
            "coinAwarded": 0,
            "nextLessonNum": None,
            "starsEarned": 0,
            "alreadyRewarded": False,
            "newXP": user.xp or 0,
            "newLevel": user.level or 1,
        }

    # Chuẩn hóa chuỗi lưu lịch sử nộp bài
    if isinstance(body.submittedSequence, dict):
        saved_seq = json.dumps(body.submittedSequence, ensure_ascii=False)
    elif isinstance(body.submittedSequence, list):
        saved_seq = ",".join(str(s).strip() for s in body.submittedSequence)
    else:
        saved_seq = str(body.submittedSequence or "").strip()

    # Đánh dấu hoàn thành bài học
    now_dt = datetime.utcnow()
    progress = (
        db.query(models.UserScratchProgress)
        .filter_by(user_id=user.id, course_id=body.courseId, lesson_num=body.lessonNum)
        .first()
    )
    was_already_completed = bool(progress and progress.completed)

    if not progress:
        progress = models.UserScratchProgress(
            id=f"usp_{user.id}_{body.courseId}_{body.lessonNum}",
            user_id=user.id,
            course_id=body.courseId,
            lesson_id=lesson.id,
            lesson_num=body.lessonNum,
            completed=True,
            stars_earned=3,
            submitted_sequence=saved_seq,
            completed_at=now_dt,
        )
        db.add(progress)
    else:
        progress.completed = True
        progress.stars_earned = 3
        progress.submitted_sequence = saved_seq
        progress.completed_at = now_dt

    xp_gain = 0
    coin_gain = 0
    if not was_already_completed:
        update_quest_progress(db, user.id, "scratch_complete")
        # Thưởng XP cho học sinh (chỉ thưởng lần đầu tiên)
        xp_gain = lesson.xp_reward or 30
        user.xp = (user.xp or 0) + xp_gain
        user.level = ((user.xp or 0) // XP_PER_LEVEL) + 1

        # Thưởng xu vào ví học sinh (chỉ thưởng lần đầu tiên)
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
    db.refresh(user)

    # Tự động kiểm tra và mở khóa huy hiệu Scratch
    check_and_unlock_scratch_achievements(db, user)

    # Kiểm tra xem có bài học tiếp theo hay không
    next_lesson = (
        db.query(models.ScratchLesson)
        .filter_by(course_id=body.courseId, lesson_num=body.lessonNum + 1)
        .first()
    )

    message = (
        "Bạn đã hoàn thành thử thách này trước đó rồi! Luyện tập lại giúp nhớ lâu hơn nhé! 👍"
        if was_already_completed
        else eval_message
    )

    return {
        "success": True,
        "message": message,
        "xpAwarded": xp_gain,
        "coinAwarded": coin_gain,
        "nextLessonNum": (body.lessonNum + 1) if next_lesson else None,
        "starsEarned": 3,
        "alreadyRewarded": was_already_completed,
        "newXP": user.xp or 0,
        "newLevel": user.level or 1,
    }


# ---------- 5. Báo Cáo Năng Lực & Kỹ Năng Lập Trình Scratch (Phase 8) ----------
@router.get("/api/scratch/analytics", response_model=schemas.ScratchAnalyticsOut)
def get_scratch_analytics(
    current_user: models.User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """
    API Báo Cáo Năng Lực & Kỹ Năng Lập Trình Scratch Studio (Phase 8):
    - Thống kê bài học hoàn thành, tổng số sao, số dự án, chuỗi ngày streak.
    - Đánh giá mức độ thông thạo (Mastery Percent) 8 nhóm kỹ năng cốt lõi.
    - Danh sách huy hiệu Scratch và trạng thái mở khóa.
    """
    user_id = current_user.id

    # 1. Tiến độ bài học
    progresses = (
        db.query(models.UserScratchProgress)
        .filter_by(user_id=user_id, completed=True)
        .all()
    )
    sc4_lessons = (
        db.query(models.ScratchLesson)
        .filter_by(course_id="sc4")
        .order_by(models.ScratchLesson.lesson_num)
        .all()
    )
    total_curriculum = len(sc4_lessons) or 11
    completed_sc4_nums = {p.lesson_num for p in progresses if p.course_id == "sc4"}
    total_completed_sc4 = len(completed_sc4_nums)
    completion_rate = int((total_completed_sc4 / total_curriculum) * 100) if total_curriculum else 0
    total_stars = sum(p.stars_earned or 0 for p in progresses)

    # 2. Số dự án
    project_count = db.query(models.ScratchProject).filter_by(user_id=user_id).count()

    # 3. Tính toán độ thành thạo 8 kỹ năng cốt lõi
    skills_mastery = [
        {
            "skill": "sequence",
            "title": "Thuật Toán Tuần Tự (Sequence)",
            "mastery_percent": 100 if 1 in completed_sc4_nums else (30 if project_count > 0 else 0),
            "level_required": 1,
        },
        {
            "skill": "events",
            "title": "Xử Lý Sự Kiện (Events)",
            "mastery_percent": 100 if 2 in completed_sc4_nums else (25 if 1 in completed_sc4_nums else 0),
            "level_required": 2,
        },
        {
            "skill": "motion",
            "title": "Chuyển Động & Tọa Độ (Motion)",
            "mastery_percent": 100 if 3 in completed_sc4_nums else (30 if 2 in completed_sc4_nums else 0),
            "level_required": 3,
        },
        {
            "skill": "loops",
            "title": "Vòng Lặp Tuần Hoàn (Loops)",
            "mastery_percent": 100 if 4 in completed_sc4_nums else 0,
            "level_required": 4,
        },
        {
            "skill": "conditionals",
            "title": "Cấu Trúc Điều Kiện (Conditionals)",
            "mastery_percent": 100 if 5 in completed_sc4_nums else 0,
            "level_required": 5,
        },
        {
            "skill": "variables",
            "title": "Biến Số & Dữ Liệu (Variables)",
            "mastery_percent": 100 if 6 in completed_sc4_nums else 0,
            "level_required": 6,
        },
        {
            "skill": "sensing",
            "title": "Cảm Biến Tương Tác (Sensing)",
            "mastery_percent": 100 if 7 in completed_sc4_nums else 0,
            "level_required": 7,
        },
        {
            "skill": "game_architecture",
            "title": "Kiến Trúc Game & Dự Án Hoàn Chỉnh",
            "mastery_percent": int(
                (sum(1 for n in (8, 9, 10, 11) if n in completed_sc4_nums) / 4) * 100
            ),
            "level_required": 11,
        },
    ]

    # 4. Huy hiệu thành tích Scratch
    unlocked_uas = {
        ua.achievement_id: ua.unlocked_at.isoformat() if ua.unlocked_at else None
        for ua in db.query(models.UserAchievement).filter_by(user_id=user_id).all()
    }

    badges = []
    for defn in SCRATCH_ACHIEVEMENT_DEFINITIONS:
        ach_id = defn["id"]
        is_unlocked = ach_id in unlocked_uas
        badges.append({
            "id": ach_id,
            "title": defn["title"],
            "description": defn["description"],
            "icon": defn["icon"],
            "badge_code": defn["badge_code"],
            "xp_bonus": defn["xp_bonus"],
            "unlocked": is_unlocked,
            "unlocked_at": unlocked_uas.get(ach_id),
        })

    return {
        "total_completed_lessons": total_completed_sc4,
        "total_curriculum_lessons": total_curriculum,
        "completion_rate": completion_rate,
        "total_stars": total_stars,
        "total_projects": project_count,
        "streak_days": current_user.streak or 1,
        "xp_earned": current_user.xp or 0,
        "skills_mastery": skills_mastery,
        "badges": badges,
    }


# ---------- 6. API Quản lý dành cho Giáo viên / Admin ----------
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
        course_type=body.course_type or "algorithm_maze",
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
        engine_type=body.engine_type or "algorithm_maze",
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
    if body.engine_type is not None:
        lesson.engine_type = body.engine_type

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


@router.delete("/api/admin/scratch/lessons/{lesson_id}")
def delete_scratch_lesson(
    lesson_id: int,
    current_user: models.User = Depends(require_roles(["admin", "teacher"])),
    db: Session = Depends(get_db),
):
    lesson = db.get(models.ScratchLesson, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài học Scratch để xóa!")

    course = db.get(models.ScratchCourse, lesson.course_id)
    db.delete(lesson)
    if course:
        course.total_lessons = max(0, len(course.lessons) - 1)
    db.commit()
    return {"success": True, "message": f'Đã xóa bài học "{lesson.title}" thành công!'}

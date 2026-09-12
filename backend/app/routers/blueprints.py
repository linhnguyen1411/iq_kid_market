"""
Game Blueprints Router (Phase 5).
Manages declarative pedagogical recipes (GameBlueprints) and provides
1-click auto-assembly from the Question Bank using the Snapshot Pattern.
"""

import math
import time
import uuid
from copy import deepcopy
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth_utils import get_current_user_required, require_admin
from ..database import get_db
from ..default_templates import default_thumbnail
from ..game_config import DEFAULT_UNLOCK_PRICE, is_level_free
from ..sanitizer import sanitize_text

router = APIRouter(tags=["blueprints"])


@router.get("/api/blueprints", response_model=schemas.PaginatedBlueprintsOut)
def list_blueprints(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    grade: Optional[int] = None,
    subject: Optional[str] = None,
    target_engine: Optional[str] = None,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: models.User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """
    Lấy danh sách các Công thức Game (Game Blueprints).
    - Mặc định chỉ trả về các blueprint đang hoạt động (is_active=True).
    - Admin có thể lọc blueprint đã tắt (is_active=False).
    """
    query = db.query(models.GameBlueprint)

    if current_user.role != "admin":
        query = query.filter(models.GameBlueprint.is_active == True)
    elif is_active is not None:
        query = query.filter(models.GameBlueprint.is_active == is_active)

    if grade is not None:
        query = query.filter(models.GameBlueprint.grade == grade)
    if subject:
        query = query.filter(models.GameBlueprint.subject == subject)
    if target_engine:
        query = query.filter(models.GameBlueprint.target_engine == target_engine)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                models.GameBlueprint.title.ilike(search_pattern),
                models.GameBlueprint.topic.ilike(search_pattern),
                models.GameBlueprint.description.ilike(search_pattern),
            )
        )

    query = query.order_by(models.GameBlueprint.grade.asc(), models.GameBlueprint.created_at.desc())

    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return schemas.PaginatedBlueprintsOut(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/api/blueprints/{blueprint_id}", response_model=schemas.GameBlueprintOut)
def get_blueprint(
    blueprint_id: str,
    current_user: models.User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """Lấy chi tiết một Công thức Game theo ID."""
    bp = db.get(models.GameBlueprint, blueprint_id)
    if not bp:
        raise HTTPException(status_code=404, detail="Không tìm thấy công thức game")
    if not bp.is_active and current_user.role != "admin":
        raise HTTPException(status_code=404, detail="Công thức game này hiện đã tạm ngưng")
    return bp


@router.post("/api/admin/blueprints", response_model=schemas.GameBlueprintOut)
def create_blueprint(
    body: schemas.GameBlueprintCreateIn,
    admin_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Tạo mới một Công thức Game (Chỉ Admin)."""
    bp_id = body.id or f"bp_{body.target_engine}_{body.grade}_{uuid.uuid4().hex[:6]}"
    existing = db.get(models.GameBlueprint, bp_id)
    if existing:
        raise HTTPException(status_code=400, detail=f"Mã công thức '{bp_id}' đã tồn tại")

    bp = models.GameBlueprint(
        id=bp_id,
        title=sanitize_text(body.title),
        description=sanitize_text(body.description) if body.description else None,
        grade=body.grade,
        subject=body.subject,
        topic=sanitize_text(body.topic),
        target_engine=body.target_engine,
        total_questions=body.total_questions or 10,
        rule_config=body.rule_config or {},
        is_active=body.is_active if body.is_active is not None else True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(bp)
    db.commit()
    db.refresh(bp)
    return bp


@router.put("/api/admin/blueprints/{blueprint_id}", response_model=schemas.GameBlueprintOut)
def update_blueprint(
    blueprint_id: str,
    body: schemas.GameBlueprintUpdateIn,
    admin_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Cập nhật Công thức Game (Chỉ Admin)."""
    bp = db.get(models.GameBlueprint, blueprint_id)
    if not bp:
        raise HTTPException(status_code=404, detail="Không tìm thấy công thức game")

    if body.title is not None:
        bp.title = sanitize_text(body.title)
    if body.description is not None:
        bp.description = sanitize_text(body.description)
    if body.grade is not None:
        bp.grade = body.grade
    if body.subject is not None:
        bp.subject = body.subject
    if body.topic is not None:
        bp.topic = sanitize_text(body.topic)
    if body.target_engine is not None:
        bp.target_engine = body.target_engine
    if body.total_questions is not None:
        bp.total_questions = body.total_questions
    if body.rule_config is not None:
        bp.rule_config = body.rule_config
    if body.is_active is not None:
        bp.is_active = body.is_active

    bp.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(bp)
    return bp


@router.delete("/api/admin/blueprints/{blueprint_id}")
def delete_blueprint(
    blueprint_id: str,
    admin_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Vô hiệu hóa (Soft Delete) Công thức Game (Chỉ Admin)."""
    bp = db.get(models.GameBlueprint, blueprint_id)
    if not bp:
        raise HTTPException(status_code=404, detail="Không tìm thấy công thức game")
    bp.is_active = False
    bp.updated_at = datetime.utcnow()
    db.commit()
    return {"success": True, "message": f"Đã vô hiệu hóa công thức game '{blueprint_id}'"}


@router.post("/api/admin/games/build-from-blueprint/{blueprint_id}")
def build_game_from_blueprint(
    blueprint_id: str,
    body: schemas.BuildGameFromBlueprintIn,
    current_user: models.User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """
    1-Click Auto-Assembly Engine (Phase 5):
    Tự động truy vấn Ngân hàng câu hỏi theo công thức Blueprint,
    lựa chọn các câu hỏi phù hợp, đóng gói Snapshot bất biến,
    tạo Game mới kèm GameVersion v1 và tăng lượt sử dụng usage_count.

    Chính sách Anti-Theft:
    - Creator chỉ được ghép từ câu hỏi của mình hoặc câu hỏi hệ thống (visibility == 'system').
    - Admin có toàn quyền sử dụng tất cả câu hỏi.
    """
    bp = db.get(models.GameBlueprint, blueprint_id)
    if not bp:
        raise HTTPException(status_code=404, detail="Không tìm thấy công thức game")
    if not bp.is_active and current_user.role != "admin":
        raise HTTPException(status_code=400, detail="Công thức game này hiện đã tạm ngưng kích hoạt")

    # 1. Truy vấn câu hỏi hợp lệ từ Question Bank
    query = db.query(models.Question).filter(
        models.Question.engine_code == bp.target_engine,
        models.Question.status != "archived",
    )

    # Ràng buộc bảo mật sở hữu: Creator chỉ bốc câu hỏi của mình hoặc system
    if current_user.role != "admin":
        query = query.filter(
            or_(
                models.Question.creator_id == current_user.id,
                models.Question.visibility == "system",
            )
        )

    all_candidates = query.all()
    if not all_candidates:
        raise HTTPException(
            status_code=400,
            detail=f"Ngân hàng câu hỏi chưa có câu hỏi nào tương thích với engine '{bp.target_engine}' cho công thức này.",
        )

    # 2. Phân loại câu hỏi theo độ ưu tiên sư phạm
    # Ưu tiên 1: Đúng khối lớp và đúng môn học
    exact_candidates = [
        q for q in all_candidates
        if (q.grade == bp.grade or q.grade is None) and (q.subject == bp.subject or q.subject is None)
    ]
    pool = exact_candidates if exact_candidates else all_candidates

    # Lấy phân bổ độ khó từ rule_config nếu có
    diff_dist = bp.rule_config.get("difficulty_distribution", {})
    # e.g. {"1": 4, "2": 4, "3": 2}
    selected_questions: list[models.Question] = []
    used_ids: set[str] = set()

    # Thử lấy theo phân bổ độ khó
    if diff_dist and any(int(v) > 0 for v in diff_dist.values()):
        for diff_level in [1, 2, 3]:
            target_count = int(diff_dist.get(str(diff_level), 0))
            if target_count <= 0:
                continue
            matching_diff = [q for q in pool if q.difficulty == diff_level and q.id not in used_ids]
            # Ưu tiên các câu có trùng topic
            matching_diff.sort(key=lambda q: 0 if bp.topic.lower() in (q.topic or "").lower() else 1)
            for q in matching_diff[:target_count]:
                selected_questions.append(q)
                used_ids.add(q.id)

    # Nếu chưa đủ total_questions, bổ sung thêm từ các câu còn lại trong pool
    needed = (bp.total_questions or 10) - len(selected_questions)
    if needed > 0:
        remaining = [q for q in pool if q.id not in used_ids]
        remaining.sort(key=lambda q: 0 if bp.topic.lower() in (q.topic or "").lower() else 1)
        for q in remaining[:needed]:
            selected_questions.append(q)
            used_ids.add(q.id)

    # Nếu vẫn chưa đủ mà all_candidates còn câu hỏi khác engine
    needed_still = (bp.total_questions or 10) - len(selected_questions)
    if needed_still > 0:
        other_remaining = [q for q in all_candidates if q.id not in used_ids]
        for q in other_remaining[:needed_still]:
            selected_questions.append(q)
            used_ids.add(q.id)

    if not selected_questions:
        raise HTTPException(
            status_code=400,
            detail="Không tìm thấy câu hỏi phù hợp để ghép theo công thức này.",
        )

    # 3. Tạo cấu trúc màn chơi (Levels Snapshot)
    clean_title = sanitize_text(body.custom_title or bp.title)
    game_id = f"game_bp_{int(time.time() * 1000)}"
    rewards = bp.rule_config.get("rewards", {})
    xp_reward = rewards.get("xp", 80)
    coin_reward = rewards.get("coins", 20)

    levels = []
    for idx, q in enumerate(selected_questions):
        level_num = idx + 1
        levels.append({
            "id": f"{game_id}_l{level_num}",
            "level_num": level_num,
            "title": f"Màn {level_num}: {q.topic or q.skill or clean_title}",
            "xp_reward": xp_reward,
            "coin_reward": coin_reward,
            "is_free": is_level_free(level_num),
            "questions": [
                {
                    "id": f"{game_id}_l{level_num}_q1",
                    "question_type": q.engine_code,
                    "prompt": q.prompt,
                    "points": 25,
                    "data": deepcopy(q.data),
                    "question_bank_id": q.id,
                }
            ],
        })
        # Tăng số lần sử dụng trong ngân hàng câu hỏi
        q.usage_count = (q.usage_count or 0) + 1
        q.updated_at = datetime.utcnow()

    unlock_price = body.price if body.price is not None and body.price >= 0 else DEFAULT_UNLOCK_PRICE

    game = models.Game(
        id=game_id,
        title=clean_title,
        description=sanitize_text(body.description) if body.description else (bp.description or f"Bộ trò chơi theo công thức {bp.title}"),
        detailed_description=bp.description,
        thumbnail=default_thumbnail(bp.target_engine),
        price=unlock_price,
        grade_from=body.grade_from or bp.grade,
        grade_to=body.grade_to or bp.grade,
        template_code=bp.target_engine,
        category=body.category or ("math" if bp.subject == "math" else "iq"),
        creator_id=current_user.id,
        creator_name=current_user.name,
        review_status="pending_review",
        is_published=False,
        rating_avg=5.0,
        plays_count=0,
        levels=levels,
        current_version_num=1,
        is_seed=False,
    )
    db.add(game)
    db.flush()

    # 4. Đóng gói GameVersion v1 bất biến
    gv = models.GameVersion(
        id=f"gv_{uuid.uuid4().hex[:12]}",
        game_id=game_id,
        version_num=1,
        status="pending_review",
        changelog=f"Tự động sinh từ Công thức Blueprint '{bp.title}'",
        levels=levels,
        title=clean_title,
        description=game.description,
        detailed_description=game.detailed_description,
        price=unlock_price,
        template_code=bp.target_engine,
        category=game.category,
    )
    db.add(gv)
    db.commit()
    db.refresh(game)

    return {
        "success": True,
        "game_id": game_id,
        "title": clean_title,
        "levels_count": len(levels),
        "version_num": 1,
        "blueprint_id": bp.id,
        "target_engine": bp.target_engine,
        "message": f"Đã sinh thành công game '{clean_title}' với {len(levels)} màn chơi từ công thức '{bp.title}'!",
    }

import os
import time
import re
import uuid
from datetime import datetime
from copy import deepcopy
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from .. import models, schemas
from ..database import get_db
from ..auth_utils import require_roles, get_current_user_optional, hash_password
from ..default_templates import build_default_level, default_thumbnail
from ..ai_content import (
    generate_fallback_game,
    generate_game_with_gemini,
    generate_single_question_with_gemini,
    generate_batch_questions_with_gemini,
    is_content_safe_for_kids,
    ensure_level_count,
    build_compact_sample_pack,
    shuffle_levels_answers,
)
from ..deterministic_verifier import verify_and_normalize_ai_question
from ..game_config import (
    DEFAULT_UNLOCK_PRICE,
    DEFAULT_LEVEL_COUNT,
    FREE_LEVEL_COUNT,
    TEXT_PACK_TEMPLATES,
    is_text_pack_template,
    is_level_free,
)
from ..sanitizer import sanitize_text, sanitize_content_payload, validate_import_payload_limits
from ..content_hasher import compute_dual_hashes
from ..content_quality_gate import score_game_content
from ..duplicate_detector import find_cross_game_duplicates, classify_risk_level


router = APIRouter(prefix="/api/admin", tags=["admin"])

CATEGORY_CODE_RE = re.compile(r"^[a-z][a-z0-9_]{0,48}$")


def _assert_can_edit_game(game: models.Game, current_user: models.User) -> None:
    if current_user.role == "admin":
        return
    if game.is_seed:
        raise HTTPException(status_code=400, detail="Không thể sửa trò chơi gốc mặc định của hệ thống!")
    if not game.creator_id or game.creator_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Bạn chỉ có thể chỉnh sửa trò chơi do chính mình thiết kế!",
        )


def _get_or_create_active_draft(
    game: models.Game,
    db: Session,
    user_id: str | None = None,
    changelog: str = "Cập nhật bản nháp",
) -> models.GameVersion:
    draft = (
        db.query(models.GameVersion)
        .filter(
            models.GameVersion.game_id == game.id,
            models.GameVersion.status.in_(["draft", "pending_review", "rejected"]),
        )
        .order_by(models.GameVersion.version_num.desc())
        .first()
    )
    if draft:
        return draft

    max_v = (
        db.query(func.max(models.GameVersion.version_num))
        .filter(models.GameVersion.game_id == game.id)
        .scalar()
    ) or 0

    base_levels, _ = schemas.resolve_game_version_content(game, db, is_creator_or_admin=True)

    new_draft = models.GameVersion(
        id=f"gv_{uuid.uuid4().hex[:12]}",
        game_id=game.id,
        version_num=max_v + 1,
        status="draft",
        changelog=changelog,
        levels=deepcopy(base_levels),
        title=game.title,
        description=game.description,
        detailed_description=game.detailed_description,
        price=game.price or 0,
        template_code=game.template_code or "quiz",
        category=game.category or "iq",
    )
    db.add(new_draft)
    db.flush()
    return new_draft


# ---------- 1. Tạo game mới (Form CMS Studio) ----------
@router.post("/games")
def create_game(
    body: schemas.CreateGameIn,
    current_user: models.User = Depends(require_roles(["admin", "teacher", "creator"])),
    db: Session = Depends(get_db),
):
    clean_title = sanitize_text(body.title)
    clean_description = sanitize_text(body.description)
    clean_detailed_description = sanitize_text(body.detailed_description or body.description)

    if not clean_title or not clean_description or not body.template_code or not body.category:
        raise HTTPException(status_code=400, detail="Vui lòng nhập đầy đủ các trường bắt buộc!")

    creator_id = current_user.id if current_user else (body.creatorId or "system")
    creator_name = current_user.name if current_user else "Nhà Sáng Tạo Nhí"

    ts = int(time.time() * 1000)
    game_id = f"custom_g_{ts}"
    if body.customFirstLevel:
        clean_first_level = sanitize_content_payload(body.customFirstLevel)
        # Validate data của câu hỏi trong màn đầu tiên nếu có
        q_data = clean_first_level.get("questions", [{}])[0].get("data")
        if q_data:
            schemas.AddLevelQuestionIn.validate_game_data(body.template_code, q_data)
        seed_levels = [{**clean_first_level, "id": f"{game_id}_l1", "level_num": 1}]
    else:
        seed_levels = [build_default_level(body.template_code)]

    levels = ensure_level_count(
        seed_levels,
        topic=clean_title,
        template=body.template_code,
        base_id=game_id,
        count=DEFAULT_LEVEL_COUNT,
        pad_to_count=False,
    )
    unlock_price = body.price if body.price and body.price > 0 else DEFAULT_UNLOCK_PRICE

    game = models.Game(
        id=game_id,
        title=clean_title,
        description=clean_description,
        detailed_description=clean_detailed_description,
        thumbnail=default_thumbnail(body.template_code),
        price=unlock_price,
        grade_from=body.grade_from or 1,
        grade_to=body.grade_to or 9,
        template_code=body.template_code,
        creator_id=creator_id,
        creator_name=creator_name,
        review_status="pending_review",
        is_published=False,
        rating_avg=5.0,
        plays_count=0,
        category=body.category,
        is_seed=False,
        levels=levels,
        current_version_num=None,
    )
    db.add(game)
    db.flush()

    initial_version = models.GameVersion(
        id=f"gv_{uuid.uuid4().hex[:12]}",
        game_id=game_id,
        version_num=1,
        status="pending_review" if current_user.role != "admin" else "draft",
        changelog="Khởi tạo giáo án ban đầu",
        levels=levels,
        title=clean_title,
        description=clean_description,
        detailed_description=clean_detailed_description,
        price=unlock_price,
        template_code=body.template_code,
        category=body.category,
    )
    db.add(initial_version)
    db.commit()
    db.refresh(game)
    return {
        "success": True,
        "message": f'Tạo game "{game.title}" với {len(levels)} màn ({FREE_LEVEL_COUNT} free + {len(levels) - FREE_LEVEL_COUNT} mở khóa ví).',
        "game": schemas.GameOut.model_validate(game).model_dump(),
    }


# ---------- 2. Thống kê tổng quan ----------
@router.get("/stats")
def get_stats(
    current_user: models.User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    total_users = db.query(models.User).count()
    total_games = db.query(models.Game).count()
    custom_games_count = db.query(models.Game).filter(models.Game.is_seed == False).count()  # noqa: E712
    attempts_count = db.query(models.Attempt).count()

    total_revenue = (
        db.query(models.WalletTransaction)
        .filter(models.WalletTransaction.amount < 0, models.WalletTransaction.type == "mua game")
        .all()
    )
    total_revenue_sum = sum(abs(t.amount) for t in total_revenue)
    users_list = db.query(models.User).all()

    return {
        "totalUsers": total_users,
        "totalGames": total_games,
        "totalRevenue": total_revenue_sum,
        "attemptsCount": attempts_count,
        "usersList": [schemas.UserOut.model_validate(u).model_dump() for u in users_list],
        "customGamesCount": custom_games_count,
    }


# ---------- 3. Thêm màn chơi mới vào game có sẵn ----------
@router.post("/levels/add")
def add_level(
    body: schemas.AddLevelIn,
    current_user: models.User = Depends(require_roles(["admin", "teacher", "creator"])),
    db: Session = Depends(get_db),
):
    if not body.gameId or not body.title or not body.question:
        raise HTTPException(status_code=400, detail="Thiếu thông tin trò chơi, tiêu đề màn hoặc câu hỏi chính!")

    game = db.get(models.Game, body.gameId)
    if not game:
        raise HTTPException(status_code=404, detail="Không tìm thấy trò chơi để cập nhật!")

    # Phân quyền: chỉ chủ sở hữu (hoặc admin / game hệ thống) mới được thêm màn
    user_id = current_user.id if current_user else body.creatorId
    if game.creator_id and game.creator_id != user_id and current_user.role != "admin" and game.creator_id != "system":
        raise HTTPException(
            status_code=403,
            detail="Lỗi phân quyền: Bạn chỉ có thể bổ sung màn chơi mới cho trò chơi do chính mình thiết kế!",
        )

    q_type = body.question.question_type or game.template_code

    # Validate cấu trúc dữ liệu câu hỏi theo quy tắc chuẩn EdTech
    try:
        schemas.AddLevelQuestionIn.validate_game_data(q_type, body.question.data)
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))

    clean_title = sanitize_text(body.title)
    clean_prompt = sanitize_text(body.question.prompt)
    clean_data = sanitize_content_payload(body.question.data)

    levels = list(game.levels or [])
    lvl_num = body.level_num or (len(levels) + 1)
    ts = int(time.time() * 1000)

    new_level = {
        "id": f"level_{body.gameId}_{ts}",
        "level_num": lvl_num,
        "title": clean_title,
        "xp_reward": body.xp_reward or 80,
        "coin_reward": body.coin_reward or 20,
        "questions": [{
            "id": f"q_{body.gameId}_{ts}",
            "question_type": q_type,
            "prompt": clean_prompt,
            "points": body.question.points or 25,
            "data": clean_data,
        }],
    }

    existing_idx = next((i for i, l in enumerate(levels) if l.get("level_num") == lvl_num), None)
    if existing_idx is not None:
        levels[existing_idx] = new_level
    else:
        levels.append(new_level)
        levels.sort(key=lambda l: l.get("level_num", 0))

    draft = _get_or_create_active_draft(game, db, user_id=user_id, changelog=f"Thêm/sửa màn {lvl_num}")
    draft.levels = levels
    flag_modified(draft, "levels")

    game.levels = levels
    flag_modified(game, "levels")
    if current_user.role != "admin":
        draft.status = "pending_review"
        game.review_status = "pending_review"
        game.is_published = False
        game.review_feedback = None
    db.commit()
    db.refresh(game)
    return {
        "success": True,
        "game": schemas.GameOut.model_validate(game).model_dump(),
        "newLevel": new_level,
    }


# ---------- 4. Cập nhật thông tin 1 màn chơi có sẵn ----------
@router.put("/levels/{game_id}/{level_num}")
def update_level(
    game_id: str,
    level_num: int,
    body: schemas.UpdateLevelIn,
    current_user: models.User = Depends(require_roles(["admin", "teacher", "creator"])),
    db: Session = Depends(get_db),
):
    game = db.get(models.Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Không tìm thấy trò chơi!")

    _assert_can_edit_game(game, current_user)

    levels = deepcopy(list(game.levels or []))
    target_idx = next((i for i, l in enumerate(levels) if l.get("level_num") == level_num), None)
    if target_idx is None:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy màn chơi số {level_num} trong game này!")

    level_obj = deepcopy(levels[target_idx])
    if body.title:
        level_obj["title"] = body.title
    if body.xp_reward is not None:
        level_obj["xp_reward"] = body.xp_reward
    if body.coin_reward is not None:
        level_obj["coin_reward"] = body.coin_reward

    if body.question:
        q_type = body.question.question_type or game.template_code
        try:
            schemas.AddLevelQuestionIn.validate_game_data(q_type, body.question.data)
        except ValueError as val_err:
            raise HTTPException(status_code=400, detail=str(val_err))

        level_obj["questions"] = [{
            "id": f"q_{game_id}_{int(time.time()*1000)}",
            "question_type": q_type,
            "prompt": body.question.prompt,
            "points": body.question.points or 25,
            "data": body.question.data,
        }]

    levels[target_idx] = level_obj
    draft = _get_or_create_active_draft(game, db, user_id=current_user.id, changelog=f"Cập nhật màn {level_num}")
    draft.levels = levels
    flag_modified(draft, "levels")

    game.levels = levels
    flag_modified(game, "levels")
    if current_user.role != "admin":
        draft.status = "pending_review"
        game.review_status = "pending_review"
        game.is_published = False
        game.review_feedback = None
    db.commit()
    db.refresh(game)

    return {"success": True, "game": schemas.GameOut.model_validate(game).model_dump()}


# ---------- 4b. Cập nhật thông tin game (metadata + levels) ----------
@router.put("/games/{game_id}")
@router.post("/games/{game_id}/update")
def update_game(
    game_id: str,
    body: schemas.UpdateGameIn,
    current_user: models.User = Depends(require_roles(["admin", "teacher", "creator"])),
    db: Session = Depends(get_db),
):
    game = db.get(models.Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Không tìm thấy trò chơi để cập nhật!")

    _assert_can_edit_game(game, current_user)

    if body.title is not None:
        title = sanitize_text(body.title)
        if not title:
            raise HTTPException(status_code=400, detail="Tên trò chơi không được để trống!")
        game.title = title

    if body.description is not None:
        desc = sanitize_text(body.description)
        if not desc:
            raise HTTPException(status_code=400, detail="Mô tả bài học không được để trống!")
        game.description = desc

    if body.detailed_description is not None:
        clean_detailed = sanitize_text(body.detailed_description)
        game.detailed_description = clean_detailed or game.description

    if body.price is not None:
        unlock_price = int(body.price)
        game.price = unlock_price if unlock_price > 0 else DEFAULT_UNLOCK_PRICE

    if body.grade_from is not None:
        game.grade_from = int(body.grade_from)
    if body.grade_to is not None:
        game.grade_to = int(body.grade_to)
    if body.category is not None:
        game.category = sanitize_text(body.category) or game.category
    if body.thumbnail is not None:
        game.thumbnail = body.thumbnail.strip() or game.thumbnail

    if body.levels is not None:
        if not isinstance(body.levels, list) or len(body.levels) < 1:
            raise HTTPException(status_code=400, detail="Danh sách màn chơi (levels) phải là mảng có ít nhất 1 phần tử!")
        validate_import_payload_limits(body.levels)
        levels = sanitize_content_payload(list(body.levels))
        for lv in levels:
            for q in lv.get("questions") or []:
                q_type = (q.get("question_type") or game.template_code).strip().lower()
                q_data = q.get("data")
                if q_data:
                    try:
                        schemas.AddLevelQuestionIn.validate_game_data(q_type, q_data)
                    except ValueError as val_err:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Màn {lv.get('level_num')}: {val_err}",
                        ) from val_err
        draft = _get_or_create_active_draft(game, db, user_id=current_user.id, changelog="Cập nhật màn chơi")
        draft.levels = levels
        flag_modified(draft, "levels")
        game.levels = levels
        flag_modified(game, "levels")

    # Giáo viên / creator sửa game → gửi lại kiểm duyệt; admin giữ trạng thái publish nếu đã duyệt
    if current_user.role != "admin":
        draft = _get_or_create_active_draft(game, db, user_id=current_user.id, changelog="Cập nhật thông tin game")
        draft.status = "pending_review"
        game.review_status = "pending_review"
        game.is_published = False
        game.review_feedback = None

    db.commit()
    db.refresh(game)

    resubmit_note = (
        " Game đã được gửi lại hàng đợi kiểm duyệt."
        if current_user.role != "admin"
        else ""
    )
    return {
        "success": True,
        "message": f'Đã cập nhật trò chơi "{game.title}" thành công!{resubmit_note}',
        "game": schemas.GameOut.model_validate(game).model_dump(),
    }


# ---------- 5. Xóa trò chơi (Chỉ áp dụng game custom, cấm xóa seed gốc) ----------
@router.delete("/games/{game_id}")
def delete_game(
    game_id: str,
    current_user: models.User = Depends(require_roles(["admin", "teacher", "creator"])),
    db: Session = Depends(get_db),
):
    game = db.get(models.Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Không tìm thấy trò chơi để xóa!")

    if game.is_seed and current_user.role != "admin":
        raise HTTPException(status_code=400, detail="Không thể xóa trò chơi gốc mặc định của hệ thống!")

    if game.creator_id and game.creator_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Bạn chỉ có quyền xóa trò chơi do chính mình thiết kế!")

    db.delete(game)
    db.commit()
    return {"success": True, "message": f'Đã xóa trò chơi "{game.title}" thành công!'}


# ---------- 6. Export mẫu JSON gọn (1 câu) — import sẽ nhân 20 màn ----------
@router.get("/games/sample-export")
def export_sample_game_pack(
    template_code: str = Query(default="quiz"),
    topic: str = Query(default="Chủ đề bài học mẫu"),
    grade_from: int = Query(default=1, ge=1, le=9),
    grade_to: int = Query(default=3, ge=1, le=9),
    category: str = Query(default="iq"),
    current_user: models.User = Depends(require_roles(["admin", "teacher", "creator"])),
):
    """
    Tải mẫu JSON gọn: chỉ 1 câu hỏi (level_template).
    Khi POST /games/upload, hệ thống nhân bản đủ 20 màn cùng schema.
    """
    code = (template_code or "quiz").strip().lower()
    if not is_text_pack_template(code):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Template '{code}' không hỗ trợ import pack text. "
                f"Chỉ áp dụng: {', '.join(sorted(TEXT_PACK_TEMPLATES))}."
            ),
        )

    sample = build_compact_sample_pack(
        topic=topic.strip() or "Chủ đề bài học mẫu",
        template=code,
        grade_from=grade_from,
        grade_to=max(grade_from, grade_to),
        category=category or "iq",
        creator_id=current_user.id,
        creator_name=current_user.name,
    )
    sample["_meta"] = {
        "sample_levels": 1,
        "expand_on_import_to": DEFAULT_LEVEL_COUNT,
        "free_levels": FREE_LEVEL_COUNT,
        "paid_levels": DEFAULT_LEVEL_COUNT - FREE_LEVEL_COUNT,
        "text_pack_only": True,
        "instruction": (
            "Chỉ cần chỉnh 1 câu trong level_template (hoặc levels[0]). "
            f"Khi import, hệ thống nhân bản đủ {DEFAULT_LEVEL_COUNT} màn cùng cấu trúc."
        ),
    }
    return sample



# ---------- 6a. Canonical JSON Import Templates & External AI System Prompts ----------
@router.get("/games/import-templates")
def get_import_templates(
    current_user: models.User = Depends(require_roles(["admin", "teacher", "creator"])),
):
    """
    Cung cấp cấu trúc JSON chuẩn và system prompt cho AI bên ngoài (ChatGPT / Claude / Gemini)
    đối với tất cả 10 Base Engines.
    """
    templates = {
        "quiz": {
            "title": "Thử Thách Trắc Nghiệm Thông Minh",
            "template_code": "quiz",
            "category": "iq",
            "grade_from": 1,
            "grade_to": 3,
            "price": 0,
            "description": "Luyện tập tư duy phản xạ qua các câu hỏi trắc nghiệm sinh động",
            "levels": [
                {
                    "level_num": 1,
                    "title": "Màn 1: Nhận biết loài vật",
                    "xp_reward": 80,
                    "coin_reward": 20,
                    "questions": [
                        {
                            "question_type": "quiz",
                            "prompt": "Con vật nào sau đây biết bay?",
                            "points": 25,
                            "data": {
                                "options": ["Con chim bồ câu", "Con cá chép", "Con rùa biển", "Con mèo con"],
                                "answer": "Con chim bồ câu",
                                "explanation": "Chim bồ câu có cánh và có khả năng bay lượn trên không."
                            }
                        }
                    ]
                }
            ]
        },
        "matching": {
            "title": "Ghép Cặp Từ Và Hình Ảnh",
            "template_code": "matching",
            "category": "language",
            "grade_from": 1,
            "grade_to": 2,
            "price": 0,
            "description": "Nối các cặp từ tương ứng",
            "levels": [
                {
                    "level_num": 1,
                    "title": "Màn 1: Tiếng kêu của thú",
                    "xp_reward": 80,
                    "coin_reward": 20,
                    "questions": [
                        {
                            "question_type": "matching",
                            "prompt": "Hãy nối con vật với tiếng kêu của nó:",
                            "points": 25,
                            "data": {
                                "pairs": [
                                    {"left": "Con mèo", "right": "Meo meo"},
                                    {"left": "Con chó", "right": "Gâu gâu"},
                                    {"left": "Con vịt", "right": "Cạp cạp"}
                                ]
                            }
                        }
                    ]
                }
            ]
        },
        "sequence": {
            "title": "Quy Luật Dãy Số Tư Duy",
            "template_code": "sequence",
            "category": "math",
            "grade_from": 2,
            "grade_to": 4,
            "price": 0,
            "description": "Tìm số còn thiếu theo quy luật toán học",
            "levels": [
                {
                    "level_num": 1,
                    "title": "Màn 1: Dãy số cộng 2",
                    "xp_reward": 80,
                    "coin_reward": 20,
                    "questions": [
                        {
                            "question_type": "sequence",
                            "prompt": "Điền số tiếp theo vào dãy số sau:",
                            "points": 25,
                            "data": {
                                "sequence": ["2", "4", "6", "8"],
                                "answer": "10",
                                "options": ["9", "10", "11", "12"]
                            }
                        }
                    ]
                }
            ]
        },
        "math": {
            "title": "Toán Đố Siêu Tốc",
            "template_code": "math",
            "category": "math",
            "grade_from": 1,
            "grade_to": 3,
            "price": 0,
            "description": "Tính nhẩm nhanh các phép toán cơ bản",
            "levels": [
                {
                    "level_num": 1,
                    "title": "Màn 1: Phép cộng có nhớ trong phạm vi 20",
                    "xp_reward": 80,
                    "coin_reward": 20,
                    "questions": [
                        {
                            "question_type": "math",
                            "prompt": "Tính kết quả của phép tính:",
                            "points": 25,
                            "data": {
                                "expression": "9 + 6",
                                "answer": "15",
                                "hint": "9 cộng 1 bằng 10, 10 cộng 5 bằng 15"
                            }
                        }
                    ]
                }
            ]
        },
        "memory": {
            "title": "Lật Thẻ Trí Nhớ Siêu Phàm",
            "template_code": "memory",
            "category": "iq",
            "grade_from": 1,
            "grade_to": 5,
            "price": 0,
            "description": "Ghi nhớ vị trí các biểu tượng",
            "levels": [
                {
                    "level_num": 1,
                    "title": "Màn 1: Hoa quả tươi ngon",
                    "xp_reward": 80,
                    "coin_reward": 20,
                    "questions": [
                        {
                            "question_type": "memory",
                            "prompt": "Tìm các cặp hình giống nhau:",
                            "points": 25,
                            "data": {
                                "items": ["🍎", "🍌", "🍇", "🍉"]
                            }
                        }
                    ]
                }
            ]
        },
        "sorting": {
            "title": "Sắp Xếp Trật Tự Logic",
            "template_code": "sorting",
            "category": "iq",
            "grade_from": 1,
            "grade_to": 4,
            "price": 0,
            "description": "Sắp xếp các bước theo thứ tự hợp lý",
            "levels": [
                {
                    "level_num": 1,
                    "title": "Màn 1: Quy trình đánh răng",
                    "xp_reward": 80,
                    "coin_reward": 20,
                    "questions": [
                        {
                            "question_type": "sorting",
                            "prompt": "Sắp xếp các bước đánh răng đúng cách:",
                            "points": 25,
                            "data": {
                                "items": [
                                    {"id": "b1", "text": "Lấy kem vào bàn chải"},
                                    {"id": "b2", "text": "Chải sạch các mặt răng"},
                                    {"id": "b3", "text": "Súc miệng bằng nước sạch"}
                                ],
                                "correct_sequence_ids": ["b1", "b2", "b3"]
                            }
                        }
                    ]
                }
            ]
        },
        "language": {
            "title": "Thử Thách Ghép Từ Tiếng Việt",
            "template_code": "language",
            "category": "language",
            "grade_from": 1,
            "grade_to": 3,
            "price": 0,
            "description": "Luyện từ và câu Tiếng Việt",
            "levels": [
                {
                    "level_num": 1,
                    "title": "Màn 1: Ghép câu hoàn chỉnh",
                    "xp_reward": 80,
                    "coin_reward": 20,
                    "questions": [
                        {
                            "question_type": "language",
                            "prompt": "Sắp xếp các từ thành câu đúng:",
                            "points": 25,
                            "data": {
                                "type": "unscramble",
                                "scrambled_words": ["học", "Em", "bài", "chăm"],
                                "correct_order": ["Em", "chăm", "học", "bài"]
                            }
                        }
                    ]
                }
            ]
        },
        "flashcard": {
            "title": "Thẻ Ghi Nhớ Từ Vựng",
            "template_code": "flashcard",
            "category": "language",
            "grade_from": 1,
            "grade_to": 5,
            "price": 0,
            "description": "Học nhanh kiến thức qua flashcard",
            "levels": [
                {
                    "level_num": 1,
                    "title": "Màn 1: Từ vựng màu sắc",
                    "xp_reward": 80,
                    "coin_reward": 20,
                    "questions": [
                        {
                            "question_type": "flashcard",
                            "prompt": "Lật thẻ để ghi nhớ từ vựng:",
                            "points": 25,
                            "data": {
                                "cards": [
                                    {"front": "Màu đỏ", "back": "Red"},
                                    {"front": "Màu xanh dương", "back": "Blue"},
                                    {"front": "Màu vàng", "back": "Yellow"}
                                ]
                            }
                        }
                    ]
                }
            ]
        },
        "observation": {
            "title": "Quan Sát Nhanh Mắt",
            "template_code": "observation",
            "category": "iq",
            "grade_from": 1,
            "grade_to": 4,
            "price": 0,
            "description": "Tìm đối tượng khác biệt hoặc xác định tọa độ",
            "levels": [
                {
                    "level_num": 1,
                    "title": "Màn 1: Tìm con vật khác biệt",
                    "xp_reward": 80,
                    "coin_reward": 20,
                    "questions": [
                        {
                            "question_type": "observation",
                            "prompt": "Xác định vị trí con mèo nằm trong ma trận:",
                            "points": 25,
                            "data": {
                                "grid": [
                                    ["🐶", "🐶", "🐶"],
                                    ["🐶", "🐱", "🐶"],
                                    ["🐶", "🐶", "🐶"]
                                ],
                                "target_row": 1,
                                "target_col": 1,
                                "answer": "🐱"
                            }
                        }
                    ]
                }
            ]
        },
        "coding": {
            "title": "Tư Duy Lập Trình Nhí",
            "template_code": "coding",
            "category": "scratch",
            "grade_from": 2,
            "grade_to": 5,
            "price": 0,
            "description": "Sửa lỗi lệnh và thuật toán cơ bản",
            "levels": [
                {
                    "level_num": 1,
                    "title": "Màn 1: Lệnh di chuyển",
                    "xp_reward": 80,
                    "coin_reward": 20,
                    "questions": [
                        {
                            "question_type": "coding",
                            "prompt": "Để nhân vật đi về phía trước 10 bước, ta dùng lệnh nào?",
                            "points": 25,
                            "data": {
                                "options": ["move(10)", "turn_left(90)", "jump()", "hide()"],
                                "answer": "move(10)"
                            }
                        }
                    ]
                }
            ]
        }
    }
    prompt_guidelines = (
        "Bạn là chuyên gia sư phạm và kỹ sư thiết kế nội dung trò chơi giáo dục cho trẻ em từ 5-12 tuổi.\n"
        "Hãy tạo một gói trò chơi hoàn chỉnh theo cấu trúc JSON chuẩn của nền tảng IQ Kid Market.\n"
        "Quy định nghiêm ngặt:\n"
        "1. Trả về ĐÚNG một JSON Object hợp lệ (không kèm giải thích markdown ngoài khối JSON).\n"
        "2. Tạo từ 5 đến 10 màn chơi (levels) có độ khó tăng dần từ dễ đến khó.\n"
        "3. Các câu hỏi trong các màn chơi không được trùng lặp nội dung với nhau.\n"
        "4. Nội dung bài học phải hoàn toàn trong sáng, sư phạm, tôn trọng trẻ em và an toàn 100%.\n"
        "5. Đáp án (answer) bắt buộc phải nằm chính xác trong danh sách lựa chọn (options hoặc pairs)."
    )
    return {
        "templates": templates,
        "promptGuidelines": prompt_guidelines,
    }


# ---------- 6c. Game Builder & Question Reuse (Phase 4) ----------
@router.post("/games/build-from-bank")
def build_game_from_bank(
    body: schemas.BuildGameFromBankIn,
    current_user: models.User = Depends(require_roles(["admin", "teacher", "creator"])),
    db: Session = Depends(get_db),
):
    """
    Tạo trò chơi mới bằng cách ghép các câu hỏi đã chọn từ Ngân hàng câu hỏi (Snapshot Pattern).
    - Bảo toàn tính bất biến: Sao chép độc lập nội dung câu hỏi vào Game levels và GameVersion v1.
    - Chống đánh cắp bản quyền: Chặn tuyệt đối 403 nếu Creator dùng câu hỏi private của người khác.
    - Tự động tăng usage_count cho từng câu hỏi tái sử dụng.
    """
    clean_title = (body.title or "").strip()
    if not clean_title:
        raise HTTPException(status_code=400, detail="Tên trò chơi không được để trống!")

    if not body.question_ids or len(body.question_ids) < 1:
        raise HTTPException(status_code=400, detail="Vui lòng chọn ít nhất 1 câu hỏi từ Ngân hàng câu hỏi!")

    template_code = (body.template_code or "").strip().lower()
    if not is_text_pack_template(template_code):
        raise HTTPException(
            status_code=400,
            detail=f"Template '{template_code}' không hợp lệ. Các loại hỗ trợ: {', '.join(sorted(TEXT_PACK_TEMPLATES))}.",
        )

    # Lấy danh sách câu hỏi từ CSDL
    questions = db.query(models.Question).filter(models.Question.id.in_(body.question_ids)).all()
    q_map = {q.id: q for q in questions}

    # Kiểm tra sự tồn tại của tất cả câu hỏi được yêu cầu
    for qid in body.question_ids:
        if qid not in q_map:
            raise HTTPException(
                status_code=404,
                detail=f"Không tìm thấy câu hỏi với ID '{qid}' trong Ngân hàng câu hỏi!",
            )

    # Kiểm tra phân quyền sở hữu / chống đánh cắp câu hỏi riêng tư
    if current_user.role != "admin":
        for qid in body.question_ids:
            q = q_map[qid]
            if q.creator_id != current_user.id and q.visibility != "system":
                raise HTTPException(
                    status_code=403,
                    detail=f"Bạn không có quyền sử dụng câu hỏi riêng tư '{qid}' của tác giả khác!",
                )

    game_id = f"bank_{current_user.id}_{int(time.time() * 1000)}"
    levels = []

    for idx, qid in enumerate(body.question_ids):
        q = q_map[qid]
        level_num = idx + 1
        levels.append({
            "id": f"{game_id}_l{level_num}",
            "level_num": level_num,
            "title": f"Màn {level_num}: {q.topic or q.skill or clean_title}",
            "xp_reward": 80,
            "coin_reward": 20,
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

    unlock_price = body.price if body.price and body.price > 0 else DEFAULT_UNLOCK_PRICE

    game = models.Game(
        id=game_id,
        title=clean_title,
        description=body.description or f"Bộ bài học {clean_title} ghép từ Ngân hàng câu hỏi",
        detailed_description=body.detailed_description or body.description,
        thumbnail=default_thumbnail(template_code),
        price=unlock_price,
        grade_from=body.grade_from or 1,
        grade_to=body.grade_to or 9,
        template_code=template_code,
        category=body.category or "iq",
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

    gv = models.GameVersion(
        id=f"gv_{uuid.uuid4().hex[:12]}",
        game_id=game_id,
        version_num=1,
        status="pending_review",
        changelog="Khởi tạo từ Ngân hàng câu hỏi (Snapshot Pattern)",
        levels=levels,
        title=clean_title,
        description=game.description,
        detailed_description=game.detailed_description,
        price=unlock_price,
        template_code=template_code,
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
        "message": f"Đã ghép thành công trò chơi '{clean_title}' với {len(levels)} màn chơi từ Ngân hàng câu hỏi!",
    }


@router.post("/games/{game_id}/add-from-bank")
def add_questions_from_bank(
    game_id: str,
    body: schemas.AddQuestionsFromBankIn,
    current_user: models.User = Depends(require_roles(["admin", "teacher", "creator"])),
    db: Session = Depends(get_db),
):
    """
    Bổ sung câu hỏi từ Ngân hàng câu hỏi vào một Game đã có.
    - Cập nhật bản nháp GameVersion (Draft) an toàn.
    - Chống đánh cắp câu hỏi của người khác (403).
    - Tăng usage_count cho các câu hỏi được thêm vào.
    """
    game = db.get(models.Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Không tìm thấy trò chơi!")
    _assert_can_edit_game(game, current_user)

    if not body.question_ids or len(body.question_ids) < 1:
        raise HTTPException(status_code=400, detail="Vui lòng chọn ít nhất 1 câu hỏi để bổ sung!")

    questions = db.query(models.Question).filter(models.Question.id.in_(body.question_ids)).all()
    q_map = {q.id: q for q in questions}

    for qid in body.question_ids:
        if qid not in q_map:
            raise HTTPException(
                status_code=404,
                detail=f"Không tìm thấy câu hỏi với ID '{qid}' trong Ngân hàng câu hỏi!",
            )

    if current_user.role != "admin":
        for qid in body.question_ids:
            q = q_map[qid]
            if q.creator_id != current_user.id and q.visibility != "system":
                raise HTTPException(
                    status_code=403,
                    detail=f"Bạn không có quyền sử dụng câu hỏi riêng tư '{qid}' của tác giả khác!",
                )

    draft = _get_or_create_active_draft(
        game, db, user_id=current_user.id, changelog="Bổ sung câu hỏi từ Ngân hàng câu hỏi"
    )
    current_levels = list(draft.levels or [])
    start_num = len(current_levels) + 1
    new_levels = []

    for idx, qid in enumerate(body.question_ids):
        q = q_map[qid]
        level_num = start_num + idx
        lvl_obj = {
            "id": f"{game_id}_l{level_num}",
            "level_num": level_num,
            "title": f"Màn {level_num}: {q.topic or q.skill or game.title}",
            "xp_reward": 80,
            "coin_reward": 20,
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
        }
        current_levels.append(lvl_obj)
        new_levels.append(lvl_obj)
        q.usage_count = (q.usage_count or 0) + 1
        q.updated_at = datetime.utcnow()

    draft.levels = current_levels
    flag_modified(draft, "levels")
    game.levels = current_levels
    flag_modified(game, "levels")
    db.commit()

    return {
        "success": True,
        "game_id": game_id,
        "added_count": len(new_levels),
        "total_levels": len(current_levels),
        "message": f"Đã thêm thành công {len(new_levels)} màn chơi từ Ngân hàng câu hỏi!",
    }


@router.post("/games/{game_id}/extract-to-bank", response_model=schemas.ExtractQuestionsToBankOut)
def extract_questions_to_bank(
    game_id: str,
    current_user: models.User = Depends(require_roles(["admin", "teacher", "creator"])),
    db: Session = Depends(get_db),
):
    """
    Trích xuất toàn bộ câu hỏi từ một trò chơi hiện có vào Ngân hàng câu hỏi.
    - Lưu giữ provenance metadata: creator_id, source_game_id, source_game_version.
    - Tự động tính toán dual hashes (content_hash, normalized_hash).
    - Tự động phát hiện và liên kết câu hỏi nếu đã tồn tại trong kho (chống duplicate).
    """
    game = db.get(models.Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Không tìm thấy trò chơi!")
    _assert_can_edit_game(game, current_user)

    levels = game.levels or []
    if not levels:
        raise HTTPException(status_code=400, detail="Trò chơi hiện chưa có màn chơi nào để trích xuất!")

    is_system = bool(game.is_seed and current_user.role == "admin")
    visibility = "system" if is_system else "private"

    extracted_count = 0
    skipped_duplicate_count = 0
    result_qids = []

    for lv in levels:
        for q in lv.get("questions") or []:
            prompt = (q.get("prompt") or "").strip()
            q_data = q.get("data") or {}
            engine = (q.get("question_type") or game.template_code or "quiz").strip().lower()

            c_hash, n_hash = compute_dual_hashes(engine, prompt, q_data)

            # Kiểm tra xem câu hỏi này đã có trong kho của user chưa
            existing_q = (
                db.query(models.Question)
                .filter(
                    models.Question.creator_id == current_user.id,
                    models.Question.normalized_hash == n_hash,
                )
                .first()
            )

            if existing_q:
                existing_q.usage_count = (existing_q.usage_count or 0) + 1
                skipped_duplicate_count += 1
                result_qids.append(existing_q.id)
                q["question_bank_id"] = existing_q.id
            else:
                new_qid = f"q_{uuid.uuid4().hex[:12]}"
                new_q = models.Question(
                    id=new_qid,
                    engine_code=engine,
                    grade=game.grade_from or 1,
                    subject=game.category or "iq",
                    topic=game.title,
                    skill=None,
                    difficulty=1,
                    prompt=prompt,
                    data=deepcopy(q_data),
                    content_hash=c_hash,
                    normalized_hash=n_hash,
                    creator_id=current_user.id,
                    source_game_id=game.id,
                    source_game_version=game.current_version_num or 1,
                    visibility=visibility,
                    status="ready",
                    usage_count=1,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                db.add(new_q)
                extracted_count += 1
                result_qids.append(new_qid)
                q["question_bank_id"] = new_qid

    flag_modified(game, "levels")
    db.commit()

    return schemas.ExtractQuestionsToBankOut(
        extracted_count=extracted_count,
        skipped_duplicate_count=skipped_duplicate_count,
        question_ids=result_qids,
    )


# ---------- 6b. Quality Gate Pre-validation & Staging Preview (Phase 3) ----------
@router.post("/games/import-preview", response_model=schemas.ImportPreviewOut)
def preview_import_game_pack(
    body: schemas.ImportPreviewIn,
    current_user: models.User = Depends(require_roles(["admin", "teacher", "creator"])),
    db: Session = Depends(get_db),
):
    """
    Cổng thẩm định chất lượng (Quality Gate) & Xem trước nội dung JSON import.
    - TUYỆT ĐỐI KHÔNG LƯU VÀO CSDL (Zero DB Mutations).
    - Giới hạn 2MB payload & chống DoS.
    - Làm sạch mã độc XSS bằng sanitizer.
    - Kiểm định tính toàn vẹn câu hỏi theo 10 Base Engines.
    - Quét nội dung an toàn trẻ em (Child Safety Filter).
    - Phát hiện câu hỏi trùng lặp nội bộ trong game bằng normalized_hash.
    - Trả về danh sách màn chơi đã chuẩn hóa để hiển thị trực quan trên Frontend.
    """
    if not body.gameObject:
        raise HTTPException(status_code=400, detail="Vui lòng đính kèm cấu hình đóng gói JSON!")

    # 1. Giới hạn 2MB payload & làm sạch XSS
    validate_import_payload_limits(body.gameObject)
    sanitized_obj = sanitize_content_payload(body.gameObject)

    g = sanitized_obj[0] if isinstance(sanitized_obj, list) and sanitized_obj else sanitized_obj
    if not isinstance(g, dict):
        return schemas.ImportPreviewOut(
            valid=False,
            errors=["Dữ liệu JSON phải là một Object chứa thông tin trò chơi."],
            warnings=[],
            game=None,
            stats=None,
        )

    errors: list[str] = []
    warnings: list[str] = []

    title = (g.get("title") or "").strip()
    if not title:
        errors.append("Trò chơi phải có tên (trường 'title' không được để trống).")

    template_code = (g.get("template_code") or "").strip().lower()
    if not template_code:
        errors.append("Trò chơi phải có loại engine (trường 'template_code' không được để trống).")
    elif not is_text_pack_template(template_code):
        errors.append(
            f"Template '{template_code}' không hợp lệ hoặc không hỗ trợ import. "
            f"Các loại engine hỗ trợ: {', '.join(sorted(TEXT_PACK_TEMPLATES))}."
        )

    raw_levels = g.get("levels") if isinstance(g.get("levels"), list) else []
    level_template = g.get("level_template") if isinstance(g.get("level_template"), dict) else None
    if not raw_levels and level_template:
        raw_levels = [level_template]

    if not raw_levels:
        errors.append("Gói JSON phải chứa danh sách các màn chơi trong trường 'levels'.")

    # Chuẩn hóa các màn chơi mà KHÔNG TỰ Ý NHÂN BẢN (pad_to_count=False)
    levels = []
    if raw_levels:
        levels = ensure_level_count(
            raw_levels,
            topic=title or "Preview",
            template=template_code or "quiz",
            base_id="preview",
            count=len(raw_levels),
            level_template=level_template,
            pad_to_count=False,
        )

    if len(levels) < 5:
        warnings.append(
            f"Gói hiện có {len(levels)} màn chơi. Để được duyệt xuất bản lên Marketplace, "
            f"trò chơi cần tối thiểu 5 màn chơi hợp lệ."
        )

    seen_hashes: dict[str, int] = {}
    duplicate_count = 0
    safe_for_kids = True
    total_questions = 0

    for lv in levels:
        lv_num = lv.get("level_num") or 1
        questions = lv.get("questions") or []
        if not questions:
            errors.append(f"Màn {lv_num} chưa có câu hỏi nào.")
            continue

        for q in questions:
            total_questions += 1
            prompt = (q.get("prompt") or "").strip()
            if len(prompt) < 5:
                warnings.append(f"Màn {lv_num}: Đề bài quá ngắn ({len(prompt)} ký tự, khuyến nghị >= 5 ký tự).")
            elif len(prompt) > 500:
                errors.append(f"Màn {lv_num}: Đề bài quá dài ({len(prompt)} ký tự, tối đa 500 ký tự).")

            # Quét an toàn trẻ em
            safe_p, msg_p = is_content_safe_for_kids(prompt)
            if not safe_p:
                safe_for_kids = False
                errors.append(f"Màn {lv_num}: {msg_p or 'Nội dung đề bài vi phạm an toàn trẻ em.'}")

            q_type = (q.get("question_type") or template_code).strip().lower()
            q_data = q.get("data")
            if not q_data or not isinstance(q_data, dict):
                errors.append(f"Màn {lv_num}: Dữ liệu 'data' của câu hỏi phải là một JSON Object.")
                continue

            safe_d, msg_d = is_content_safe_for_kids(str(q_data))
            if not safe_d:
                safe_for_kids = False
                errors.append(f"Màn {lv_num}: {msg_d or 'Dữ liệu câu hỏi chứa từ khóa không an toàn cho trẻ em.'}")

            # Kiểm tra engine data contract
            try:
                schemas.AddLevelQuestionIn.validate_game_data(q_type, q_data)
            except ValueError as val_err:
                errors.append(f"Màn {lv_num} ({q_type}): {val_err}")
                continue

            # Phát hiện trùng lặp nội bộ trong pack bằng normalized_hash
            _, n_hash = compute_dual_hashes(q_type, prompt, q_data)
            if n_hash in seen_hashes:
                orig_lv = seen_hashes[n_hash]
                warnings.append(f"Màn {lv_num} có nội dung trùng lặp với Màn {orig_lv} (cùng ngữ nghĩa).")
                duplicate_count += 1
            else:
                seen_hashes[n_hash] = lv_num

    # Phase 7: So khớp trùng lặp liên trò chơi với CSDL (Cross-game duplicate check)
    if levels:
        try:
            cross_dups = find_cross_game_duplicates(
                db=db,
                target_levels=levels,
                template_code=template_code,
                threshold=0.60,
            )
            if cross_dups:
                top_dup = cross_dups[0]
                if top_dup["similarity"] >= 0.80:
                    warnings.append(
                        f"Cảnh báo trùng lặp cao: Gói bài tập có độ tương đồng ngữ nghĩa {top_dup['similarity_percent']}% "
                        f"với trò chơi '{top_dup['title']}' đã có trên hệ thống (nguy cơ bị từ chối duyệt)."
                    )
                else:
                    warnings.append(
                        f"Lưu ý: Gói bài tập có độ tương đồng {top_dup['similarity_percent']}% "
                        f"với trò chơi '{top_dup['title']}' (trùng {top_dup['common_count']} câu hỏi)."
                    )
        except Exception:
            pass

    valid = (len(errors) == 0)

    game_dict = {
        "title": title,
        "description": g.get("description") or f"Bộ bài học {title}",
        "detailed_description": g.get("detailed_description") or g.get("description"),
        "template_code": template_code,
        "category": g.get("category") or "iq",
        "grade_from": int(g.get("grade_from") or 1),
        "grade_to": int(g.get("grade_to") or 9),
        "price": int(g.get("price") or 0),
        "thumbnail": g.get("thumbnail") or "📦",
        "levels": levels,
    }

    stats = schemas.ImportPreviewStats(
        total_levels=len(levels),
        total_questions=total_questions,
        unique_questions=len(seen_hashes),
        safe_for_kids=safe_for_kids,
    )

    return schemas.ImportPreviewOut(
        valid=valid,
        errors=errors,
        warnings=warnings,
        game=game_dict,
        stats=stats,
    )


# ---------- 6b. Upload text-pack (1 câu mẫu hoặc đủ màn — thiếu thì nhân bản) ----------
@router.post("/games/upload")
def upload_games(
    body: schemas.UploadGamesIn,
    current_user: models.User = Depends(require_roles(["admin", "teacher", "creator"])),
    db: Session = Depends(get_db),
):
    if not body.gameObject:
        raise HTTPException(status_code=400, detail="Vui lòng đính kèm cấu hình đóng gói JSON!")

    # P0-3 & P0-2: Kiểm tra giới hạn 2MB/DoS và làm sạch mã độc XSS
    validate_import_payload_limits(body.gameObject)
    sanitized_game_object = sanitize_content_payload(body.gameObject)

    games_to_import = sanitized_game_object if isinstance(sanitized_game_object, list) else [sanitized_game_object]
    imported = []

    try:
        for g in games_to_import:
            if not isinstance(g, dict):
                raise HTTPException(status_code=400, detail="Mỗi game trong pack phải là object JSON.")

            title = (g.get("title") or "").strip()
            template_code = (g.get("template_code") or "").strip().lower()
            if not title or not template_code:
                raise HTTPException(
                    status_code=400,
                    detail="Pack không hợp lệ. Mỗi game phải có 'title' và 'template_code'.",
                )

            if not is_text_pack_template(template_code):
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Template '{template_code}' cần media hoặc không hỗ trợ import nhanh. "
                        f"Chỉ cho phép: {', '.join(sorted(TEXT_PACK_TEMPLATES))}."
                    ),
                )

            game_id = (g.get("id") or "").strip() or f"pack_{current_user.id}_{int(time.time() * 1000)}"
            existing = db.get(models.Game, game_id)
            if existing and existing.is_seed and current_user.role != "admin":
                raise HTTPException(status_code=400, detail="Không được ghi đè game seed gốc của hệ thống!")
            if (
                existing
                and existing.creator_id
                and existing.creator_id != current_user.id
                and current_user.role != "admin"
            ):
                raise HTTPException(status_code=403, detail="Không được ghi đè game của người khác!")

            raw_levels = g.get("levels") if isinstance(g.get("levels"), list) else []
            level_template = g.get("level_template") if isinstance(g.get("level_template"), dict) else None
            if not raw_levels and level_template:
                raw_levels = [level_template]

            if not raw_levels:
                raise HTTPException(
                    status_code=400,
                    detail="Gói JSON phải chứa danh sách màn chơi trong trường 'levels'!",
                )

            # Phase 3: Tắt triệt để nhân bản tự động (pad_to_count=False) — giữ đúng số màn tác giả cung cấp
            target_count = len(raw_levels)

            levels = ensure_level_count(
                raw_levels,
                topic=title,
                template=template_code,
                base_id=game_id,
                count=target_count,
                level_template=level_template,
                pad_to_count=False,
            )
            # Xáo đáp án mỗi màn (kể cả màn đã có sẵn trong JSON) — tránh đáp án luôn ở vị trí cố định
            levels = shuffle_levels_answers(levels)

            # Validate question data theo schema engine
            for lv in levels:
                for q in lv.get("questions") or []:
                    q_type = (q.get("question_type") or template_code).strip().lower()
                    q_data = q.get("data")
                    if q_data:
                        try:
                            schemas.AddLevelQuestionIn.validate_game_data(q_type, q_data)
                        except ValueError as val_err:
                            raise HTTPException(
                                status_code=400,
                                detail=f"Màn {lv.get('level_num')}: {val_err}",
                            ) from val_err

            unlock_price = int(g.get("price") or 0)
            if unlock_price <= 0:
                unlock_price = DEFAULT_UNLOCK_PRICE

            values = dict(
                title=title,
                description=g.get("description") or f"Pack {DEFAULT_LEVEL_COUNT} màn — {title}",
                detailed_description=(
                    g.get("detailed_description")
                    or g.get("description")
                    or (
                        f"{FREE_LEVEL_COUNT} màn free + "
                        f"{DEFAULT_LEVEL_COUNT - FREE_LEVEL_COUNT} màn mở khóa ví."
                    )
                ),
                thumbnail=g.get("thumbnail") or "📦",
                price=unlock_price,
                grade_from=int(g.get("grade_from") or 1),
                grade_to=int(g.get("grade_to") or 9),
                template_code=template_code,
                category=g.get("category") or "iq",
                creator_id=current_user.id,
                creator_name=current_user.name,
                review_status="pending_review",
                review_feedback=None,
                is_published=False,
                rating_avg=float(g.get("rating_avg") or 5.0),
                plays_count=int(g.get("plays_count") or 0),
                levels=levels,
                is_seed=False,
            )

            if existing:
                for k, v in values.items():
                    setattr(existing, k, v)
                draft = _get_or_create_active_draft(existing, db, user_id=current_user.id, changelog="Import JSON text pack")
                draft.levels = levels
                draft.status = "pending_review"
                flag_modified(draft, "levels")
                imported.append(existing.id)
            else:
                db.add(models.Game(id=game_id, **values))
                db.flush()
                gv = models.GameVersion(
                    id=f"gv_{uuid.uuid4().hex[:12]}",
                    game_id=game_id,
                    version_num=1,
                    status="pending_review",
                    changelog="Upload JSON text pack",
                    levels=levels,
                    title=title,
                    description=values.get("description"),
                    detailed_description=values.get("detailed_description"),
                    price=unlock_price,
                    template_code=template_code,
                    category=values.get("category") or "iq",
                )
                db.add(gv)
                imported.append(game_id)

        db.commit()
        return {
            "success": True,
            "count": len(imported),
            "gameIds": imported,
            "message": f"Đã import {len(imported)} game thành công vào hàng đợi kiểm duyệt.",
        }
    except HTTPException:
        raise
    except Exception as err:  # noqa: BLE001
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Đóng gói không hợp lệ: {err}")


# ---------- 7. Sinh game bằng AI (Gemini) — CHỈ ADMIN ----------
@router.post("/games/ai-generate")
def ai_generate_game(
    body: schemas.AiGenerateIn,
    current_user: models.User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db),
):
    if not body.topic or not body.template_code:
        raise HTTPException(status_code=400, detail="Vui lòng điền chủ đề học tập và lựa chọn Game Template!")

    # 1. Lọc an toàn nội dung cho học sinh
    safe, msg = is_content_safe_for_kids(body.topic)
    if not safe:
        raise HTTPException(status_code=400, detail=msg)

    category = body.category or "iq"
    price = body.price if body.price and body.price > 0 else DEFAULT_UNLOCK_PRICE
    grade_from = body.grade_from or 1
    grade_to = body.grade_to or 5

    creator_id = current_user.id if current_user else (body.creatorId or "system")
    creator_name = current_user.name if current_user else "Hệ Thống AI"

    try:
        generated = generate_game_with_gemini(
            topic=body.topic,
            template_code=body.template_code,
            grade_from=grade_from,
            grade_to=grade_to,
            category=category,
        )

        game_id = generated.get("id") or f"ai_g_{int(time.time()*1000)}"
        levels = ensure_level_count(
            generated.get("levels") or [],
            topic=body.topic,
            template=body.template_code,
            base_id=game_id,
            count=DEFAULT_LEVEL_COUNT,
        )
        unlock_price = int(generated.get("price") or price or DEFAULT_UNLOCK_PRICE)
        if unlock_price <= 0:
            unlock_price = DEFAULT_UNLOCK_PRICE

        game = models.Game(
            id=game_id,
            title=generated.get("title") or f"AI: {body.topic}",
            description=generated.get("description") or f"Game bài học về {body.topic}",
            detailed_description=generated.get("detailed_description") or generated.get("description"),
            thumbnail=generated.get("thumbnail") or "🤖",
            price=unlock_price,
            grade_from=grade_from,
            grade_to=grade_to,
            template_code=body.template_code,
            category=category,
            creator_id=creator_id,
            creator_name=creator_name,
            review_status="pending_review",
            is_published=False,
            rating_avg=5.0,
            plays_count=0,
            levels=levels,
            is_seed=False,
            current_version_num=None,
        )
        db.add(game)
        db.flush()

        gv = models.GameVersion(
            id=f"gv_{uuid.uuid4().hex[:12]}",
            game_id=game_id,
            version_num=1,
            status="pending_review",
            changelog="Khởi tạo giáo án từ AI",
            levels=levels,
            title=game.title,
            description=game.description,
            detailed_description=game.detailed_description,
            price=unlock_price,
            template_code=body.template_code,
            category=category,
        )
        db.add(gv)
        db.commit()
        db.refresh(game)
        return {
            "success": True,
            "message": (
                f'Trò chơi AI "{game.title}" đã tạo {len(levels)} màn '
                f'({FREE_LEVEL_COUNT} free + {len(levels) - FREE_LEVEL_COUNT} mở khóa ví) '
                f'và đưa vào hàng đợi kiểm duyệt!'
            ),
            "game": schemas.GameOut.model_validate(game).model_dump(),
        }
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as err:  # noqa: BLE001
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi thiết kế từ hệ thống trí tuệ nhân tạo Gemini: {err}")


# ---------- 8. Sinh 1 câu hỏi / màn chơi đơn lẻ bằng AI — CHỈ ADMIN ----------
@router.post("/ai/generate-question")
def generate_ai_question(
    body: schemas.AiGenerateQuestionIn,
    current_user: models.User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db),
):
    """Chỉ Admin được dùng Gemini để gợi ý câu hỏi đơn lẻ."""
    if not body.topic or not body.template_code:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp chủ đề và mã template!")

    safe, msg = is_content_safe_for_kids(body.topic)
    if not safe:
        raise HTTPException(status_code=400, detail=msg)

    try:
        question_data = generate_single_question_with_gemini(
            topic=body.topic,
            template_code=body.template_code,
            grade=body.grade or 2,
            category=body.category or "iq",
        )
        return {
            "success": True,
            "question": question_data,
        }
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Lỗi khi sinh câu hỏi AI: {err}")


# ---------- 8b. Sinh lô 1-5 câu hỏi AI thẩm định xác định (Phase 8) — CHỈ ADMIN ----------
@router.post("/ai/batch-generate-questions", response_model=schemas.AiBatchGenerateQuestionsOut)
def batch_generate_ai_questions(
    body: schemas.AiBatchGenerateQuestionsIn,
    current_user: models.User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db),
):
    """
    Admin AI Content Factory:
    - Giới hạn cứng 1 <= count <= 5 câu hỏi / lần yêu cầu.
    - Phải qua thẩm định thuật toán xác định (Deterministic Algorithmic Verification).
    - AI không phải là cơ quan thẩm định cuối cùng (Safe AST math, option containment, etc.).
    - Tuỳ chọn tự động đồng bộ vào Question Bank hệ thống (visibility = 'system').
    """
    if not body.topic or not body.template_code:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp chủ đề và mã template!")

    safe, msg = is_content_safe_for_kids(body.topic)
    if not safe:
        raise HTTPException(status_code=400, detail=msg)

    # Clamping nghiêm ngặt từ 1 đến 5 câu hỏi
    clamped_count = min(max(1, body.count), 5)

    try:
        raw_questions = generate_batch_questions_with_gemini(
            topic=body.topic,
            template_code=body.template_code,
            count=clamped_count,
            grade=body.grade or 2,
            category=body.category or "iq",
        )
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Lỗi khi sinh lô câu hỏi AI: {err}")

    items: list[schemas.VerifiedQuestionItem] = []
    saved_count = 0

    for idx, raw_q in enumerate(raw_questions):
        prompt = str(raw_q.get("prompt") or "").strip()
        data = raw_q.get("data") or {}
        q_type = str(raw_q.get("question_type") or body.template_code).strip()

        is_valid, err_msg, normalized_data = verify_and_normalize_ai_question(
            template_code=q_type,
            prompt=prompt,
            data=data,
        )

        c_hash = None
        n_hash = None
        saved_qid = None

        if is_valid:
            c_hash, n_hash = compute_dual_hashes(q_type, prompt, normalized_data)

            if body.save_to_bank:
                existing_q = (
                    db.query(models.Question)
                    .filter(
                        models.Question.normalized_hash == n_hash,
                        models.Question.visibility == "system",
                    )
                    .first()
                )
                if existing_q:
                    existing_q.usage_count = (existing_q.usage_count or 0) + 1
                    saved_qid = existing_q.id
                else:
                    new_qid = f"q_{uuid.uuid4().hex[:12]}"
                    new_q = models.Question(
                        id=new_qid,
                        engine_code=q_type,
                        grade=body.grade or 2,
                        subject=body.category or "iq",
                        topic=body.topic,
                        skill=f"AI Factory - {body.topic}",
                        difficulty=1,
                        prompt=prompt,
                        data=deepcopy(normalized_data),
                        content_hash=c_hash,
                        normalized_hash=n_hash,
                        creator_id=current_user.id,
                        source_game_id=None,
                        source_game_version=None,
                        visibility="system",
                        status="ready",
                        usage_count=1,
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow(),
                    )
                    db.add(new_q)
                    saved_qid = new_qid
                    saved_count += 1

        items.append(
            schemas.VerifiedQuestionItem(
                index=idx + 1,
                question_type=q_type,
                prompt=prompt,
                data=normalized_data if isinstance(normalized_data, dict) else {},
                is_verified=is_valid,
                error_message=err_msg,
                content_hash=c_hash,
                normalized_hash=n_hash,
                saved_question_id=saved_qid,
            )
        )

    if saved_count > 0:
        db.commit()

    return schemas.AiBatchGenerateQuestionsOut(
        success=True,
        topic=body.topic,
        template_code=body.template_code,
        total_requested=body.count,
        total_generated=len(raw_questions),
        total_verified=sum(1 for it in items if it.is_verified),
        saved_to_bank_count=saved_count,
        items=items,
    )



# ---------- 9. Xoá sạch toàn bộ game custom, về lại seed gốc ----------
@router.post("/games/reset")
def reset_custom_games(
    current_user: models.User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db),
):
    """Chỉ Admin mới có quyền reset toàn bộ game custom về seed gốc."""
    db.query(models.Game).filter(models.Game.is_seed == False).delete()  # noqa: E712
    db.commit()
    return {"success": True, "message": "Đã xóa sạch toàn bộ trò chơi custom & cấp độ thiết chế về mặc định thành công!"}


# ---------- 9. Hàng đợi kiểm duyệt giáo án & Content Quality Gate ----------
@router.get("/games/{game_id}/quality-report", response_model=schemas.QualityReportOut)
def get_game_quality_report(
    game_id: str,
    current_user: models.User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db),
):
    """
    Báo cáo thẩm định chất lượng sư phạm (Content Quality Gate Report) cho Admin:
    - 5 chiều: Hoàn thiện nội dung, Kỹ thuật câu hỏi, Đa dạng, An toàn trẻ em, Cấu trúc sư phạm
    - Điểm số 0-100 & Xếp loại EXCELLENT / GOOD / FAIR / POOR
    - Khuyến nghị cải tiến chi tiết
    """
    game = db.query(models.Game).filter(models.Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Không tìm thấy trò chơi!")

    draft_version = (
        db.query(models.GameVersion)
        .filter(
            models.GameVersion.game_id == game.id,
            models.GameVersion.status.in_(["draft", "pending_review"]),
        )
        .order_by(models.GameVersion.version_num.desc())
        .first()
    )

    levels = draft_version.levels if (draft_version and draft_version.levels) else (game.levels or [])
    meta = {
        "title": (draft_version.title if draft_version else game.title) or "",
        "description": (draft_version.description if draft_version else game.description) or "",
        "detailed_description": (draft_version.detailed_description if draft_version else game.detailed_description) or "",
        "grade_from": game.grade_from,
        "grade_to": game.grade_to,
        "template_code": (draft_version.template_code if draft_version else game.template_code) or "quiz",
        "thumbnail": game.thumbnail or "",
    }

    report = score_game_content(game_levels=levels, game_meta=meta, game_id=game.id)
    return schemas.QualityReportOut(**report)


@router.get("/games/{game_id}/duplicate-check", response_model=schemas.DuplicateCheckOut)
def check_game_duplicates(
    game_id: str,
    threshold: float = 0.60,
    current_user: models.User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db),
):
    """
    Kiểm tra trùng lặp liên trò chơi (Cross-Game Duplicate Check) cho Admin:
    - So khớp tập băm ngữ nghĩa (Dual Hashes) với tất cả các game khác trong CSDL.
    - Phân cấp: LOW (<60%), MEDIUM (60-79%), HIGH (>=80%).
    - Bảo vệ chống xóa nhầm: Chỉ cảnh báo đối soát, không xóa dữ liệu người dùng.
    """
    game = db.query(models.Game).filter(models.Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Không tìm thấy trò chơi!")

    draft_version = (
        db.query(models.GameVersion)
        .filter(
            models.GameVersion.game_id == game.id,
            models.GameVersion.status.in_(["draft", "pending_review"]),
        )
        .order_by(models.GameVersion.version_num.desc())
        .first()
    )

    levels = draft_version.levels if (draft_version and draft_version.levels) else (game.levels or [])
    template_code = (draft_version.template_code if draft_version else game.template_code) or "quiz"

    candidates_raw = find_cross_game_duplicates(
        db=db,
        target_levels=levels,
        template_code=template_code,
        exclude_game_id=game.id,
        threshold=threshold,
    )

    max_sim = candidates_raw[0]["similarity"] if candidates_raw else 0.0
    overall_risk = classify_risk_level(max_sim)
    has_risk = max_sim >= threshold

    return schemas.DuplicateCheckOut(
        game_id=game.id,
        title=game.title,
        has_duplicate_risk=has_risk,
        max_similarity=max_sim,
        max_similarity_percent=int(round(max_sim * 100)),
        overall_risk_level=overall_risk,
        candidates=[schemas.DuplicateCandidateOut(**c) for c in candidates_raw],
    )


@router.get("/review/queue")
def get_review_queue(
    status: str | None = "pending_review",
    current_user: models.User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db),
):
    """Hàng đợi kiểm duyệt: chỉ Admin. Mặc định chỉ game đang chờ duyệt (pending_review)."""
    q = db.query(models.Game).filter(models.Game.is_seed == False)  # noqa: E712
    # Default pending_review so approved/rejected games leave the review queue.
    effective = (status or "pending_review").strip()
    if effective != "all":
        q = q.filter(models.Game.review_status == effective)
    games = q.order_by(models.Game.id.desc()).all()

    queue_list = []
    for g in games:
        draft_version = (
            db.query(models.GameVersion)
            .filter(
                models.GameVersion.game_id == g.id,
                models.GameVersion.status.in_(["draft", "pending_review"]),
            )
            .order_by(models.GameVersion.version_num.desc())
            .first()
        )
        levels = draft_version.levels if (draft_version and draft_version.levels) else (g.levels or [])
        meta = {
            "title": g.title,
            "description": g.description,
            "grade_from": g.grade_from,
            "grade_to": g.grade_to,
            "template_code": g.template_code,
            "thumbnail": g.thumbnail,
        }
        report = score_game_content(game_levels=levels, game_meta=meta, game_id=g.id)

        item = schemas.GameOut.model_validate(g)
        item.quality_score = report["total_score"]
        item.quality_grade = report["grade"]
        queue_list.append(item.model_dump())

    return queue_list


@router.post("/review/decide")
def decide_review(
    body: schemas.ReviewDecideIn,
    current_user: models.User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db),
):
    """Chỉ Admin mới có quyền phê duyệt hoặc từ chối game."""
    game = db.query(models.Game).filter(
        models.Game.id == body.gameId, models.Game.is_seed == False  # noqa: E712
    ).first()
    if not game:
        raise HTTPException(status_code=404, detail="Không tìm thấy trò chơi để kiểm duyệt!")

    draft_version = (
        db.query(models.GameVersion)
        .filter(
            models.GameVersion.game_id == game.id,
            models.GameVersion.status.in_(["draft", "pending_review"]),
        )
        .order_by(models.GameVersion.version_num.desc())
        .first()
    )

    # Chấm điểm chất lượng lưu lại vào snapshot phiên bản
    eval_levels = draft_version.levels if (draft_version and draft_version.levels) else (game.levels or [])
    eval_meta = {
        "title": game.title,
        "description": game.description,
        "grade_from": game.grade_from,
        "grade_to": game.grade_to,
        "template_code": game.template_code,
        "thumbnail": game.thumbnail,
    }
    report = score_game_content(game_levels=eval_levels, game_meta=eval_meta, game_id=game.id)
    quality_score = report["total_score"]

    if body.action == "approve":
        game.review_status = "approved"
        game.is_published = True
        game.review_feedback = body.feedback or "Đã duyệt thông qua chất lượng giáo dục!"

        if draft_version:
            # Lưu trữ (archive) các phiên bản đã xuất bản trước đó
            db.query(models.GameVersion).filter(
                models.GameVersion.game_id == game.id,
                models.GameVersion.status == "published",
            ).update({"status": "archived"})

            draft_version.status = "published"
            draft_version.published_at = datetime.utcnow()
            draft_version.quality_score = quality_score
            game.current_version_num = draft_version.version_num
            if draft_version.levels:
                game.levels = deepcopy(draft_version.levels)
                flag_modified(game, "levels")
        else:
            max_v = (
                db.query(func.max(models.GameVersion.version_num))
                .filter(models.GameVersion.game_id == game.id)
                .scalar()
            ) or 0
            new_v_num = max_v + 1
            gv = models.GameVersion(
                id=f"gv_{uuid.uuid4().hex[:12]}",
                game_id=game.id,
                version_num=new_v_num,
                status="published",
                published_at=datetime.utcnow(),
                quality_score=quality_score,
                changelog=body.feedback or "Phê duyệt giáo án",
                levels=deepcopy(game.levels or []),
                title=game.title,
                description=game.description,
                detailed_description=game.detailed_description,
                price=game.price or 0,
                template_code=game.template_code,
                category=game.category or "iq",
            )
            db.add(gv)
            game.current_version_num = new_v_num

    elif body.action == "reject":
        game.review_status = "rejected"
        if not game.current_version_num:
            game.is_published = False
        game.review_feedback = body.feedback or "Chưa đạt tiêu chí kiểm chuẩn, cần cải tiến thêm."

        if draft_version:
            draft_version.status = "rejected"
            draft_version.quality_score = quality_score
    else:
        raise HTTPException(status_code=400, detail="Thao tác phê duyệt bất hợp lệ!")

    db.commit()
    db.refresh(game)
    action_label = "duyệt" if body.action == "approve" else "từ chối"
    game_data = schemas.GameOut.model_validate(game).model_dump()
    game_data["quality_score"] = quality_score
    game_data["quality_grade"] = report["grade"]
    return {
        "success": True,
        "message": f'Đã {action_label} trò chơi "{game.title}" thành công!',
        "game": game_data,
    }


# ---------- 10. Admin CMS: Quản trị người dùng & kho game ----------
@router.get("/users")
def list_users(
    role: str | None = None,
    search: str | None = None,
    current_user: models.User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db),
):
    q = db.query(models.User)
    if role and role != "all":
        q = q.filter(models.User.role == role)
    if search:
        like = f"%{search.strip()}%"
        q = q.filter(
            (models.User.username.ilike(like))
            | (models.User.name.ilike(like))
            | (models.User.id.ilike(like))
        )
    users = q.order_by(models.User.created_at.desc()).all()
    result = []
    for u in users:
        payload = schemas.UserOut.model_validate(u).model_dump()
        payload["created_at"] = u.created_at.isoformat() if u.created_at else None
        payload["wallet_balance"] = u.wallet.balance if u.wallet else 0
        result.append(payload)
    return result


@router.post("/users")
def admin_create_user(
    body: schemas.AdminCreateUserIn,
    current_user: models.User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db),
):
    """Tạo người dùng mới trực tiếp từ Admin CMS."""
    username_clean = body.username.strip().lower()
    if not username_clean or len(username_clean) < 3:
        raise HTTPException(status_code=400, detail="Tên đăng nhập phải có ít nhất 3 ký tự!")
    existing = db.query(models.User).filter(models.User.username == username_clean).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Tên đăng nhập @{username_clean} đã tồn tại!")
    if not body.password or len(body.password) < 4:
        raise HTTPException(status_code=400, detail="Mật khẩu phải có ít nhất 4 ký tự!")

    user_id = f"u_{int(time.time() * 1000)}_{uuid.uuid4().hex[:4]}"
    role = body.role if body.role in ["student", "teacher", "creator", "admin"] else "student"
    initial_balance = max(0, int(body.initial_balance or 0))

    new_user = models.User(
        id=user_id,
        username=username_clean,
        password_hash=hash_password(body.password),
        name=body.name.strip() or f"Thành viên {username_clean}",
        role=role,
        grade=body.grade if role == "student" else None,
        avatar=body.avatar or "smile_tiger",
        xp=100 if role == "student" else 0,
        level=1,
        streak=1 if role == "student" else 0,
    )
    db.add(new_user)
    db.flush()

    new_wallet = models.Wallet(user_id=user_id, balance=initial_balance)
    db.add(new_wallet)
    if initial_balance > 0:
        db.add(models.WalletTransaction(
            id=f"tx_admin_init_{int(time.time()*1000)}",
            wallet_user_id=user_id,
            amount=initial_balance,
            type="nạp tiền",
            detail=f"Quản trị viên cấp ban đầu (+{initial_balance} Sao IQ)",
        ))

    if role == "student":
        db.add(models.Purchase(user_id=user_id, game_id="g1", purchased_price=0))

    db.commit()
    db.refresh(new_user)
    return {
        "success": True,
        "message": f"Tạo người dùng @{username_clean} thành công!",
        "user": {
            **schemas.UserOut.model_validate(new_user).model_dump(),
            "wallet_balance": initial_balance,
            "created_at": new_user.created_at.isoformat() if new_user.created_at else None,
        },
    }


@router.put("/users/{user_id}")
def admin_update_user(
    user_id: str,
    body: schemas.AdminUpdateUserIn,
    current_user: models.User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db),
):
    """Cập nhật thông tin, đổi mật khẩu và điều chỉnh số dư Sao IQ của người dùng."""
    target_user = db.get(models.User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng!")

    if body.name is not None:
        name_clean = body.name.strip()
        if not name_clean:
            raise HTTPException(status_code=400, detail="Họ tên không được để trống!")
        target_user.name = name_clean

    if body.role is not None and body.role in ["student", "teacher", "creator", "admin"]:
        if target_user.id == current_user.id and body.role != "admin":
            raise HTTPException(status_code=400, detail="Không thể tự hạ quyền Admin của chính bạn!")
        target_user.role = body.role

    if body.grade is not None:
        target_user.grade = body.grade
    if body.avatar is not None:
        target_user.avatar = body.avatar

    # Đổi mật khẩu nếu cung cấp
    if body.password:
        if len(body.password) < 4:
            raise HTTPException(status_code=400, detail="Mật khẩu mới phải có ít nhất 4 ký tự!")
        target_user.password_hash = hash_password(body.password)

    # Điều chỉnh số dư ví Sao IQ
    if body.wallet_balance is not None:
        new_bal = max(0, int(body.wallet_balance))
        wallet = target_user.wallet
        if not wallet:
            wallet = models.Wallet(user_id=target_user.id, balance=new_bal)
            db.add(wallet)
        else:
            diff = new_bal - wallet.balance
            wallet.balance = new_bal
            if diff != 0:
                db.add(models.WalletTransaction(
                    id=f"tx_admin_adj_{int(time.time()*1000)}",
                    wallet_user_id=target_user.id,
                    amount=diff,
                    type="điều chỉnh",
                    detail=f"Quản trị viên điều chỉnh số dư ({'+' if diff > 0 else ''}{diff} Sao IQ)",
                ))

    db.commit()
    db.refresh(target_user)
    return {
        "success": True,
        "message": f"Cập nhật thông tin @{target_user.username} thành công!",
        "user": {
            **schemas.UserOut.model_validate(target_user).model_dump(),
            "wallet_balance": target_user.wallet.balance if target_user.wallet else 0,
            "created_at": target_user.created_at.isoformat() if target_user.created_at else None,
        },
    }


@router.delete("/users/{user_id}")
def admin_delete_user(
    user_id: str,
    current_user: models.User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db),
):
    """Xóa vĩnh viễn người dùng và dữ liệu liên quan."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Không thể xóa tài khoản Admin đang đăng nhập!")

    target_user = db.get(models.User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng để xóa!")

    # Cascade xóa an toàn các bảng phụ thuộc
    db.query(models.WalletTransaction).filter(models.WalletTransaction.wallet_user_id == user_id).delete(synchronize_session=False)
    db.query(models.Wallet).filter(models.Wallet.user_id == user_id).delete(synchronize_session=False)
    db.query(models.Purchase).filter(models.Purchase.user_id == user_id).delete(synchronize_session=False)
    db.query(models.CoursePurchase).filter(models.CoursePurchase.user_id == user_id).delete(synchronize_session=False)
    db.query(models.UserScratchProgress).filter(models.UserScratchProgress.user_id == user_id).delete(synchronize_session=False)
    db.query(models.ScratchProject).filter(models.ScratchProject.user_id == user_id).delete(synchronize_session=False)
    db.query(models.UserDailyQuest).filter(models.UserDailyQuest.user_id == user_id).delete(synchronize_session=False)
    db.query(models.UserAchievement).filter(models.UserAchievement.user_id == user_id).delete(synchronize_session=False)
    db.query(models.UserDailySpin).filter(models.UserDailySpin.user_id == user_id).delete(synchronize_session=False)
    db.query(models.LoginRewardClaim).filter(models.LoginRewardClaim.user_id == user_id).delete(synchronize_session=False)
    db.query(models.Attempt).filter(models.Attempt.user_id == user_id).delete(synchronize_session=False)

    db.delete(target_user)
    db.commit()

    return {
        "success": True,
        "message": f"Đã xóa vĩnh viễn người dùng @{target_user.username} thành công!",
    }


@router.get("/games/inventory")
def list_game_inventory(
    status: str | None = None,
    current_user: models.User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db),
):
    """Danh sách toàn bộ kho game (kể cả chưa publish) cho CMS Admin."""
    q = db.query(models.Game)
    if status and status != "all":
        q = q.filter(models.Game.review_status == status)
    games = q.order_by(models.Game.id.asc()).all()
    return [schemas.GameOut.model_validate(g).model_dump() for g in games]


# ---------- 11. Admin CMS: Quản lý thể loại game ----------
def _normalize_category_code(code: str) -> str:
    return (code or "").strip().lower().replace(" ", "_").replace("-", "_")


@router.get("/categories")
def list_admin_categories(
    current_user: models.User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db),
):
    cats = (
        db.query(models.GameCategory)
        .order_by(models.GameCategory.sort_order.asc(), models.GameCategory.code.asc())
        .all()
    )
    count_rows = db.query(models.Game.category, func.count(models.Game.id)).group_by(models.Game.category).all()
    counts = {code: cnt for code, cnt in count_rows}
    result = []
    for cat in cats:
        payload = schemas.GameCategoryOut.model_validate(cat).model_dump()
        payload["game_count"] = counts.get(cat.code, 0)
        result.append(payload)
    return result


@router.post("/categories")
def create_game_category(
    body: schemas.CreateGameCategoryIn,
    current_user: models.User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db),
):
    code = _normalize_category_code(body.code)
    if not code or not CATEGORY_CODE_RE.match(code):
        raise HTTPException(
            status_code=400,
            detail="Mã thể loại phải là chữ thường, bắt đầu bằng chữ cái (vd: iq, math, tieng_viet).",
        )
    label = (body.label or "").strip()
    if not label:
        raise HTTPException(status_code=400, detail="Tên thể loại không được để trống!")

    if db.get(models.GameCategory, code):
        raise HTTPException(status_code=400, detail=f"Thể loại '{code}' đã tồn tại!")

    cat = models.GameCategory(
        code=code,
        label=label,
        icon=(body.icon or "🎮").strip() or "🎮",
        description=(body.description or "").strip() or None,
        sort_order=int(body.sort_order or 0),
        is_active=bool(body.is_active if body.is_active is not None else True),
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return {
        "success": True,
        "message": f"Đã tạo thể loại “{cat.label}”.",
        "category": schemas.GameCategoryOut.model_validate(cat).model_dump(),
    }


@router.put("/categories/{code}")
def update_game_category(
    code: str,
    body: schemas.UpdateGameCategoryIn,
    current_user: models.User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db),
):
    cat = db.get(models.GameCategory, code)
    if not cat:
        raise HTTPException(status_code=404, detail="Không tìm thấy thể loại!")

    if body.label is not None:
        label = body.label.strip()
        if not label:
            raise HTTPException(status_code=400, detail="Tên thể loại không được để trống!")
        cat.label = label
    if body.icon is not None:
        cat.icon = body.icon.strip() or cat.icon
    if body.description is not None:
        cat.description = body.description.strip() or None
    if body.sort_order is not None:
        cat.sort_order = int(body.sort_order)
    if body.is_active is not None:
        cat.is_active = bool(body.is_active)

    db.commit()
    db.refresh(cat)
    game_count = db.query(models.Game).filter(models.Game.category == cat.code).count()
    payload = schemas.GameCategoryOut.model_validate(cat).model_dump()
    payload["game_count"] = game_count
    return {
        "success": True,
        "message": f"Đã cập nhật thể loại “{cat.label}”.",
        "category": payload,
    }


@router.delete("/categories/{code}")
def delete_game_category(
    code: str,
    current_user: models.User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db),
):
    cat = db.get(models.GameCategory, code)
    if not cat:
        raise HTTPException(status_code=404, detail="Không tìm thấy thể loại!")

    game_count = db.query(models.Game).filter(models.Game.category == code).count()
    if game_count > 0:
        cat.is_active = False
        db.commit()
        return {
            "success": True,
            "deactivated": True,
            "message": (
                f"Thể loại “{cat.label}” đang có {game_count} game — đã ẩn (tắt active) "
                "thay vì xóa."
            ),
        }

    db.delete(cat)
    db.commit()
    return {
        "success": True,
        "deactivated": False,
        "message": f"Đã xóa thể loại “{cat.label}”.",
    }

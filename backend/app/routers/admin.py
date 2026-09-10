import os
import time
import re
import uuid
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
    is_content_safe_for_kids,
    ensure_level_count,
    build_compact_sample_pack,
    shuffle_levels_answers,
)
from ..game_config import (
    DEFAULT_UNLOCK_PRICE,
    DEFAULT_LEVEL_COUNT,
    FREE_LEVEL_COUNT,
    TEXT_PACK_TEMPLATES,
    is_text_pack_template,
)

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


# ---------- 1. Tạo game mới (Form CMS Studio) ----------
@router.post("/games")
def create_game(
    body: schemas.CreateGameIn,
    current_user: models.User = Depends(require_roles(["admin", "teacher", "creator"])),
    db: Session = Depends(get_db),
):
    if not body.title or not body.description or not body.template_code or not body.category:
        raise HTTPException(status_code=400, detail="Vui lòng nhập đầy đủ các trường bắt buộc!")

    creator_id = current_user.id if current_user else (body.creatorId or "system")
    creator_name = current_user.name if current_user else "Nhà Sáng Tạo Nhí"

    ts = int(time.time() * 1000)
    game_id = f"custom_g_{ts}"
    if body.customFirstLevel:
        # Validate data của câu hỏi trong màn đầu tiên nếu có
        q_data = body.customFirstLevel.get("questions", [{}])[0].get("data")
        if q_data:
            schemas.AddLevelQuestionIn.validate_game_data(body.template_code, q_data)
        seed_levels = [{**body.customFirstLevel, "id": f"{game_id}_l1", "level_num": 1}]
    else:
        seed_levels = [build_default_level(body.template_code)]

    levels = ensure_level_count(
        seed_levels,
        topic=body.title,
        template=body.template_code,
        base_id=game_id,
        count=DEFAULT_LEVEL_COUNT,
        pad_to_count=False,
    )
    unlock_price = body.price if body.price and body.price > 0 else DEFAULT_UNLOCK_PRICE

    game = models.Game(
        id=game_id,
        title=body.title,
        description=body.description,
        detailed_description=body.detailed_description or body.description,
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
    )
    db.add(game)
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

    levels = list(game.levels or [])
    lvl_num = body.level_num or (len(levels) + 1)
    ts = int(time.time() * 1000)

    new_level = {
        "id": f"level_{body.gameId}_{ts}",
        "level_num": lvl_num,
        "title": body.title,
        "xp_reward": body.xp_reward or 80,
        "coin_reward": body.coin_reward or 20,
        "questions": [{
            "id": f"q_{body.gameId}_{ts}",
            "question_type": q_type,
            "prompt": body.question.prompt,
            "points": body.question.points or 25,
            "data": body.question.data,
        }],
    }

    existing_idx = next((i for i, l in enumerate(levels) if l.get("level_num") == lvl_num), None)
    if existing_idx is not None:
        levels[existing_idx] = new_level
    else:
        levels.append(new_level)
        levels.sort(key=lambda l: l.get("level_num", 0))

    game.levels = levels
    flag_modified(game, "levels")
    if current_user.role != "admin":
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
    game.levels = levels
    flag_modified(game, "levels")
    if current_user.role != "admin":
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
        title = body.title.strip()
        if not title:
            raise HTTPException(status_code=400, detail="Tên trò chơi không được để trống!")
        game.title = title

    if body.description is not None:
        desc = body.description.strip()
        if not desc:
            raise HTTPException(status_code=400, detail="Mô tả bài học không được để trống!")
        game.description = desc

    if body.detailed_description is not None:
        game.detailed_description = body.detailed_description.strip() or game.description

    if body.price is not None:
        unlock_price = int(body.price)
        game.price = unlock_price if unlock_price > 0 else DEFAULT_UNLOCK_PRICE

    if body.grade_from is not None:
        game.grade_from = int(body.grade_from)
    if body.grade_to is not None:
        game.grade_to = int(body.grade_to)
    if body.category is not None:
        game.category = body.category.strip() or game.category
    if body.thumbnail is not None:
        game.thumbnail = body.thumbnail.strip() or game.thumbnail

    if body.levels is not None:
        if not isinstance(body.levels, list) or len(body.levels) < 1:
            raise HTTPException(status_code=400, detail="Danh sách màn chơi (levels) phải là mảng có ít nhất 1 phần tử!")
        levels = list(body.levels)
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
        game.levels = levels
        flag_modified(game, "levels")

    # Giáo viên / creator sửa game → gửi lại kiểm duyệt; admin giữ trạng thái publish nếu đã duyệt
    if current_user.role != "admin":
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


# ---------- 6b. Upload text-pack (1 câu mẫu hoặc đủ màn — thiếu thì nhân bản) ----------
@router.post("/games/upload")
def upload_games(
    body: schemas.UploadGamesIn,
    current_user: models.User = Depends(require_roles(["admin", "teacher", "creator"])),
    db: Session = Depends(get_db),
):
    if not body.gameObject:
        raise HTTPException(status_code=400, detail="Vui lòng đính kèm cấu hình đóng gói JSON!")

    games_to_import = body.gameObject if isinstance(body.gameObject, list) else [body.gameObject]
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
            # Cho phép pack chỉ có level_template / 1 màn — nhân bản đủ 20 khi import
            if not raw_levels and level_template:
                raw_levels = [level_template]

            target_count = int(g.get("target_level_count") or DEFAULT_LEVEL_COUNT)
            if target_count < 1 or target_count > 50:
                target_count = DEFAULT_LEVEL_COUNT

            levels = ensure_level_count(
                raw_levels,
                topic=title,
                template=template_code,
                base_id=game_id,
                count=target_count,
                level_template=level_template,
                pad_to_count=bool(g.get("level_template") or g.get("target_level_count")),
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
                imported.append(existing.id)
            else:
                db.add(models.Game(id=game_id, **values))
                imported.append(game_id)

        db.commit()
        return {
            "success": True,
            "count": len(imported),
            "gameIds": imported,
            "message": (
                f"Đã import {len(imported)} game — mỗi game được chuẩn hoá "
                f"{DEFAULT_LEVEL_COUNT} màn (nhân bản từ mẫu nếu chỉ gửi 1 câu) "
                f"và đưa vào hàng đợi kiểm duyệt."
            ),
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
        )
        db.add(game)
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


# ---------- 9. Hàng đợi kiểm duyệt giáo án ----------
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
    return [schemas.GameOut.model_validate(g).model_dump() for g in games]


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

    if body.action == "approve":
        game.review_status = "approved"
        game.is_published = True
        game.review_feedback = body.feedback or "Đã duyệt thông qua chất lượng giáo dục!"
    elif body.action == "reject":
        game.review_status = "rejected"
        game.is_published = False
        game.review_feedback = body.feedback or "Chưa đạt tiêu chí kiểm chuẩn, cần cải tiến thêm."
    else:
        raise HTTPException(status_code=400, detail="Thao tác phê duyệt bất hợp lệ!")

    db.commit()
    db.refresh(game)
    action_label = "duyệt" if body.action == "approve" else "từ chối"
    return {
        "success": True,
        "message": f'Đã {action_label} trò chơi "{game.title}" thành công!',
        "game": schemas.GameOut.model_validate(game).model_dump(),
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

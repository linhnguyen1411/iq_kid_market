import os
import time
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..auth_utils import require_roles, get_current_user_optional
from ..default_templates import build_default_level, default_thumbnail
from ..ai_content import generate_fallback_game, generate_game_with_gemini

router = APIRouter(prefix="/api/admin", tags=["admin"])


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
    if body.customFirstLevel:
        # Validate data của câu hỏi trong màn đầu tiên nếu có
        q_data = body.customFirstLevel.get("questions", [{}])[0].get("data")
        if q_data:
            schemas.AddLevelQuestionIn.validate_game_data(body.template_code, q_data)
        levels = [{**body.customFirstLevel, "id": f"custom_g{ts}_l1"}]
    else:
        levels = [build_default_level(body.template_code)]

    game = models.Game(
        id=f"custom_g_{ts}",
        title=body.title,
        description=body.description,
        detailed_description=body.detailed_description or body.description,
        thumbnail=default_thumbnail(body.template_code),
        price=body.price or 0,
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
    return {"success": True, "game": schemas.GameOut.model_validate(game).model_dump()}


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

    if game.creator_id and game.creator_id != current_user.id and current_user.role != "admin" and game.creator_id != "system":
        raise HTTPException(status_code=403, detail="Bạn không có quyền chỉnh sửa màn chơi này!")

    levels = list(game.levels or [])
    target_idx = next((i for i, l in enumerate(levels) if l.get("level_num") == level_num), None)
    if target_idx is None:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy màn chơi số {level_num} trong game này!")

    level_obj = levels[target_idx]
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
    db.commit()
    db.refresh(game)

    return {"success": True, "game": schemas.GameOut.model_validate(game).model_dump()}


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

    if game.is_seed:
        raise HTTPException(status_code=400, detail="Không thể xóa trò chơi gốc mặc định của hệ thống!")

    if game.creator_id and game.creator_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Bạn chỉ có quyền xóa trò chơi do chính mình thiết kế!")

    db.delete(game)
    db.commit()
    return {"success": True, "message": f'Đã xóa trò chơi "{game.title}" thành công!'}


# ---------- 6. Upload game/level đóng gói sẵn (JSON) ----------
@router.post("/games/upload")
def upload_games(
    body: schemas.UploadGamesIn,
    current_user: models.User = Depends(require_roles(["admin", "teacher", "creator"])),
    db: Session = Depends(get_db),
):
    if not body.gameObject:
        raise HTTPException(status_code=400, detail="Vui lòng đính kèm cấu hình đóng gói JSON!")

    games_to_import = body.gameObject if isinstance(body.gameObject, list) else [body.gameObject]

    try:
        for g in games_to_import:
            if not g.get("id") or not g.get("title") or not g.get("template_code"):
                raise HTTPException(
                    status_code=400,
                    detail="Dấu tích đóng gói không hợp lệ. Phải chứa 'id', 'title' và 'template_code'.",
                )

            existing = db.get(models.Game, g["id"])
            values = dict(
                title=g["title"],
                description=g.get("description") or "Trò chơi đóng gói sẵn",
                detailed_description=g.get("detailed_description") or g.get("description") or "Trò chơi đóng gói sẵn",
                thumbnail=g.get("thumbnail") or "🎁",
                price=int(g.get("price") or 0),
                grade_from=int(g.get("grade_from") or 1),
                grade_to=int(g.get("grade_to") or 9),
                template_code=g["template_code"],
                is_published=g.get("is_published") if g.get("is_published") is not None else True,
                rating_avg=float(g.get("rating_avg") or 4.9),
                plays_count=int(g.get("plays_count") or 120),
                category=g.get("category") or "iq",
                levels=g.get("levels") if isinstance(g.get("levels"), list) else [],
                is_seed=False,
            )
            if existing:
                for k, v in values.items():
                    setattr(existing, k, v)
            else:
                db.add(models.Game(id=g["id"], **values))

        db.commit()
        return {"success": True, "count": len(games_to_import)}
    except HTTPException:
        raise
    except Exception as err:  # noqa: BLE001
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Đóng gói không hợp lệ: {err}")


# ---------- 7. Sinh game bằng AI (Gemini) ----------
@router.post("/games/ai-generate")
def ai_generate_game(
    body: schemas.AiGenerateIn,
    current_user: models.User = Depends(require_roles(["admin", "teacher", "creator"])),
    db: Session = Depends(get_db),
):
    if not body.topic or not body.template_code:
        raise HTTPException(status_code=400, detail="Vui lòng điền chủ đề học tập và lựa chọn Game Template!")

    category = body.category or "iq"
    price = body.price or 0
    grade_from = body.grade_from or 1
    grade_to = body.grade_to or 5

    creator_id = current_user.id if current_user else (body.creatorId or "system")
    creator_name = current_user.name if current_user else "Hệ Thống AI"
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        fallback = generate_fallback_game(
            body.topic, body.template_code, grade_from, grade_to, category, price,
            creator_id, creator_name,
        )
        game = models.Game(is_seed=False, **{k: v for k, v in fallback.items()})
        db.add(game)
        db.commit()
        db.refresh(game)
        return {
            "success": True,
            "warning": (
                "Để kích hoạt trí tuệ nhân tạo Gemini thực thụ, vui lòng cài đặt biến GEMINI_API_KEY "
                "trong file .env. Hiện tại đang hiển thị game giáo án sinh tự động chuẩn EdTech!"
            ),
            "game": schemas.GameOut.model_validate(game).model_dump(),
        }

    try:
        generated = generate_game_with_gemini(body.topic, body.template_code, grade_from, grade_to, category)
        creator_name = current_user.name if current_user else "Trí tuệ Nhân tạo Gemini"

        game = models.Game(
            id=generated["id"],
            title=generated["title"],
            description=generated.get("description"),
            detailed_description=generated.get("detailed_description"),
            thumbnail=generated.get("thumbnail"),
            price=int(generated.get("price") or price),
            grade_from=int(generated.get("grade_from") or grade_from),
            grade_to=int(generated.get("grade_to") or grade_to),
            template_code=generated.get("template_code") or body.template_code,
            category=generated.get("category") or category,
            creator_id=creator_id,
            creator_name=creator_name,
            review_status="pending_review",
            is_published=False,
            rating_avg=5.0,
            plays_count=0,
            levels=generated.get("levels") or [],
            is_seed=False,
        )
        db.add(game)
        db.commit()
        db.refresh(game)
        return {"success": True, "game": schemas.GameOut.model_validate(game).model_dump()}
    except Exception as err:  # noqa: BLE001
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi thiết kế từ hệ thống trí tuệ nhân tạo Gemini: {err}")


# ---------- 8. Xoá sạch toàn bộ game custom, về lại seed gốc ----------
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
    status: str | None = None,
    current_user: models.User = Depends(require_roles(["admin", "teacher"])),
    db: Session = Depends(get_db),
):
    """Chỉ Admin hoặc Teacher mới có quyền xem hàng đợi kiểm duyệt."""
    q = db.query(models.Game).filter(models.Game.is_seed == False)  # noqa: E712
    if status and status != "all":
        q = q.filter(models.Game.review_status == status)
    games = q.all()
    return [schemas.GameOut.model_validate(g).model_dump() for g in games]


@router.post("/review/decide")
def decide_review(
    body: schemas.ReviewDecideIn,
    current_user: models.User = Depends(require_roles(["admin", "teacher"])),
    db: Session = Depends(get_db),
):
    """Chỉ Admin hoặc Teacher mới có quyền phê duyệt hoặc từ chối game."""
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
    return {"success": True, "game": schemas.GameOut.model_validate(game).model_dump()}

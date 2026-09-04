"""
Nạp dữ liệu khởi tạo vào Postgres:
  - User demo (học sinh, giáo viên, admin) + ví + giao dịch.
  - 5 game thật (100 màn chơi) + achievements + scratch courses, export nguyên vẹn từ seedData.ts -> seed_data.json,
    KHÔNG chép tay để tránh sai lệch nội dung tiếng Việt.

Chạy tay:  python -m app.seed
Tự chạy:  main.py gọi run_seed() khi khởi động nếu bảng users rỗng.
"""
import os
import sys
import json
from pathlib import Path
from datetime import datetime, timezone

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from sqlalchemy.orm import Session
from . import models
from .auth_utils import hash_password

SEED_JSON_PATH = Path(__file__).parent / "seed_data.json"

DEFAULT_USERS = [
    {"id": "u1", "username": "kid_binh", "password_hash": hash_password("123456"),
     "name": "Thế Bình 🌟", "role": "student", "grade": 2, "avatar": "smile_tiger",
     "xp": 120, "level": 1, "streak": 3},
    {"id": "u2", "username": "giao_vien_lan", "password_hash": hash_password("123456"),
     "name": "Cô Lan Anh 👩‍🏫", "role": "teacher", "grade": None, "avatar": "logic_owl",
     "xp": 450, "level": 5, "streak": 0},
    {"id": "u3", "username": "kid_dung", "password_hash": hash_password("123456"),
     "name": "Minh Dũng 🦊", "role": "student", "grade": 3, "avatar": "cool_fox",
     "xp": 80, "level": 1, "streak": 1},
    {"id": "u_admin", "username": "admin", "password_hash": hash_password("123456"),
     "name": "Ban Quản Trị 🛡️", "role": "admin", "grade": None, "avatar": "brave_dragon",
     "xp": 0, "level": 1, "streak": 0},
]

DEFAULT_WALLETS = {
    "u1": {"balance": 90000, "tx": [("tx_1", 90000, "nạp tiền", "Được tặng ban đầu", "2026-06-22T10:00:00Z")]},
    "u2": {"balance": 500000, "tx": [("tx_2", 500000, "nạp tiền", "Nạp qua QR", "2026-06-22T08:00:00Z")]},
    "u3": {"balance": 1000000, "tx": [("tx_3", 1000000, "nạp tiền", "Được tặng ban đầu", "2026-06-22T07:15:00Z")]},
    "u_admin": {"balance": 0, "tx": []},
}

DEFAULT_PURCHASES = {
    "u1": ["g1"],
    "u2": ["g1", "g2", "g3"],
    "u3": ["g1", "g2"],
}

# Điểm cao mẫu để bảng xếp hạng có dữ liệu ngay từ đầu (username ảo, không gắn user_id thật)
DEMO_LEADERBOARD_ATTEMPTS = [
    {"id": "att_seed_1", "user_id": "u1", "game_id": "g1", "score": 280, "level_num": 5,
     "date": "2026-06-22T12:00:00"},
    {"id": "att_seed_2", "user_id": "u1", "game_id": "g2", "score": 120, "level_num": 2,
     "date": "2026-06-21T11:30:00"},
]


def _parse_dt(iso_str: str) -> datetime:
    return datetime.fromisoformat(iso_str.replace("Z", "+00:00")).replace(tzinfo=None)


def run_seed(db: Session, force: bool = False) -> None:
    if not force and db.query(models.User).count() > 0:
        print("[seed] DB đã có dữ liệu, bỏ qua seed.")
        return

    print("[seed] Đang nạp dữ liệu khởi tạo...")

    # ---- Users + Wallets ----
    for u in DEFAULT_USERS:
        db.merge(models.User(**u))

    for user_id, w in DEFAULT_WALLETS.items():
        db.merge(models.Wallet(user_id=user_id, balance=w["balance"]))
        for tx_id, amount, tx_type, detail, date_str in w["tx"]:
            db.merge(models.WalletTransaction(
                id=tx_id, wallet_user_id=user_id, amount=amount, type=tx_type,
                detail=detail, created_at=_parse_dt(date_str),
            ))

    db.flush()

    # ---- Purchases mặc định ----
    for user_id, game_ids in DEFAULT_PURCHASES.items():
        for game_id in game_ids:
            exists = db.query(models.Purchase).filter_by(user_id=user_id, game_id=game_id).first()
            if not exists:
                db.add(models.Purchase(user_id=user_id, game_id=game_id, purchased_price=0))

    # ---- Games / Achievements / Scratch courses (từ seed_data.json export) ----
    if SEED_JSON_PATH.exists():
        seed = json.loads(SEED_JSON_PATH.read_text(encoding="utf-8"))

        for g in seed["games"]:
            db.merge(models.Game(
                id=g["id"],
                title=g["title"],
                description=g.get("description"),
                detailed_description=g.get("detailed_description"),
                thumbnail=g.get("thumbnail"),
                price=g.get("price", 0),
                grade_from=g.get("grade_from", 1),
                grade_to=g.get("grade_to", 9),
                template_code=g["template_code"],
                category=g.get("category", "iq"),
                creator_id=None,
                creator_name=None,
                review_status="approved",
                is_published=g.get("is_published", True),
                rating_avg=g.get("rating_avg", 4.8),
                plays_count=g.get("plays_count", 0),
                is_seed=True,
                levels=g.get("levels", []),
            ))

        for a in seed["achievements"]:
            db.merge(models.Achievement(
                id=a["id"], title=a["title"], description=a.get("description"),
                badge_code=a.get("badge_code"), xp_bonus=a.get("xp_bonus", 100), icon=a.get("icon"),
            ))

        for c in seed["scratch_courses"]:
            db.merge(models.ScratchCourse(
                id=c["id"], title=c["title"], description=c.get("description"),
                thumbnail=c.get("thumbnail"), difficulty=c.get("difficulty", "Cơ bản"),
                total_lessons=c.get("total_lessons", len(c.get("lessons", []))),
            ))
            db.flush()
            for l in c.get("lessons", []):
                existing = db.query(models.ScratchLesson).filter_by(
                    course_id=c["id"], lesson_num=l["lesson_num"]
                ).first()
                if not existing:
                    db.add(models.ScratchLesson(
                        course_id=c["id"], lesson_num=l["lesson_num"], title=l["title"],
                        content=l.get("content"), target_block_sequence=l.get("target_block_sequence"),
                        start_scene_json=l.get("start_scene_json"), xp_reward=l.get("xp_reward", 30),
                    ))
    else:
        print(f"[seed] CẢNH BÁO: không tìm thấy {SEED_JSON_PATH}, bỏ qua games/achievements/scratch courses.")

    # ---- Demo attempts cho leaderboard có dữ liệu ----
    for att in DEMO_LEADERBOARD_ATTEMPTS:
        exists = db.get(models.Attempt, att["id"])
        if not exists:
            db.add(models.Attempt(
                id=att["id"], user_id=att["user_id"], game_id=att["game_id"],
                level_num=att["level_num"], score=att["score"], completed=True,
                duration_secs=60, created_at=_parse_dt(att["date"]),
            ))

    # ---- Daily Quests mặc định ----
    from .daily_quests import QUEST_DEFINITIONS
    for q in QUEST_DEFINITIONS:
        db.merge(models.DailyQuest(**q))

    db.commit()
    print("[seed] Hoàn tất.")


def ensure_admin_user(db: Session) -> None:
    """Đảm bảo tài khoản admin luôn tồn tại (kể cả khi DB đã seed từ trước)."""
    admin = db.query(models.User).filter(models.User.username == "admin").first()
    if admin:
        if admin.role != "admin":
            admin.role = "admin"
            db.commit()
    else:
        admin_data = next(u for u in DEFAULT_USERS if u["username"] == "admin")
        db.add(models.User(**admin_data))
        db.add(models.Wallet(user_id="u_admin", balance=0))
        db.commit()
        print("[seed] Đã tạo tài khoản admin mặc định (admin / 123456).")

    # Migrate role phụ huynh → học sinh (ví xu thuộc học sinh)
    parents = db.query(models.User).filter(models.User.role == "parent").all()
    if parents:
        for u in parents:
            u.role = "student"
            if u.grade is None:
                u.grade = 1
            if u.username == "phu_huynh_dung":
                u.username = "kid_dung"
                u.name = "Minh Dũng 🦊"
        db.commit()
        print(f"[seed] Đã chuyển {len(parents)} tài khoản phụ huynh → học sinh.")


DEFAULT_GAME_CATEGORIES = [
    {
        "code": "iq",
        "label": "Tư Duy IQ Não Bộ",
        "icon": "🧠",
        "description": "Rèn luyện tư duy logic, nhận biết hình ảnh và giải đố.",
        "sort_order": 1,
    },
    {
        "code": "math",
        "label": "Toán Học Logic",
        "icon": "🔢",
        "description": "Phép tính, dãy số và bài toán tương tác.",
        "sort_order": 2,
    },
    {
        "code": "scratch",
        "label": "Lập Trình Robot Scratch",
        "icon": "🐱",
        "description": "Lập trình kéo thả, robot Scratch và STEM.",
        "sort_order": 3,
    },
    {
        "code": "vietnamese",
        "label": "Tiếng Việt & Ngôn Ngữ",
        "icon": "📖",
        "description": "Từ vựng, đọc hiểu và ngôn ngữ.",
        "sort_order": 4,
    },
]


def ensure_game_categories(db: Session) -> None:
    """Luôn đảm bảo có danh mục thể loại mặc định (upsert nhẹ label/icon)."""
    for row in DEFAULT_GAME_CATEGORIES:
        existing = db.get(models.GameCategory, row["code"])
        if existing:
            existing.label = row["label"]
            existing.icon = row.get("icon") or existing.icon
            if row.get("description"):
                existing.description = row["description"]
            if existing.sort_order is None:
                existing.sort_order = row.get("sort_order", 0)
        else:
            db.add(
                models.GameCategory(
                    code=row["code"],
                    label=row["label"],
                    icon=row.get("icon", "🎮"),
                    description=row.get("description"),
                    sort_order=row.get("sort_order", 0),
                    is_active=True,
                )
            )
    db.commit()


if __name__ == "__main__":
    from .database import SessionLocal, engine, Base
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        run_seed(session, force=True)
        ensure_admin_user(session)

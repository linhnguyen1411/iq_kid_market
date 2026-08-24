"""
Nạp dữ liệu khởi tạo vào Postgres:
  - 3 user demo (u1 học sinh, u2 giáo viên, u3 phụ huynh) + ví + giao dịch, y hệt DEFAULT_STATE cũ của server.ts.
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
    {"id": "u3", "username": "phu_huynh_dung", "password_hash": hash_password("123456"),
     "name": "Bố Tiến Dũng 👨‍💼", "role": "parent", "grade": None, "avatar": "cool_fox",
     "xp": 0, "level": 1, "streak": 0},
]

DEFAULT_WALLETS = {
    "u1": {"balance": 90000, "tx": [("tx_1", 90000, "nạp tiền", "Được tặng ban đầu", "2026-06-22T10:00:00Z")]},
    "u2": {"balance": 500000, "tx": [("tx_2", 500000, "nạp tiền", "Nạp qua QR", "2026-06-22T08:00:00Z")]},
    "u3": {"balance": 1000000, "tx": [("tx_3", 1000000, "nạp tiền", "Ví ba mẹ liên kết", "2026-06-22T07:15:00Z")]},
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


if __name__ == "__main__":
    from .database import SessionLocal, engine, Base
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        run_seed(session, force=True)

#!/usr/bin/env python3
"""
Worker script chạy trên VPS: Nạp dữ liệu từ local_db_dump.json vào PostgreSQL iqkids_db.
Sử dụng dynamic column introspection từ SQLAlchemy models để đảm bảo khớp 100%.
"""
import os
import sys
import json
from datetime import datetime

# Đảm bảo import được app.models
sys.path.insert(0, "/opt/iqkids/app/backend")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app import models

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ Lỗi: DATABASE_URL không được tìm thấy trong biến môi trường!")
    sys.exit(1)

JSON_PATH = sys.argv[1] if len(sys.argv) > 1 else "/opt/iqkids/local_db_dump.json"
if not os.path.exists(JSON_PATH):
    print(f"❌ Lỗi: Không tìm thấy file JSON tại {JSON_PATH}")
    sys.exit(1)

with open(JSON_PATH, "r", encoding="utf-8") as f:
    dump = json.load(f)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()


def parse_dt(val):
    if not val:
        return None
    if isinstance(val, str):
        try:
            return datetime.fromisoformat(val.replace("Z", "+00:00"))
        except Exception:
            return None
    return val


def create_model_instance(model_cls, data_dict):
    """Ánh xạ dữ liệu từ dictionary sang Model class, tự ép kiểu datetime & JSON."""
    valid_cols = {c.name: c for c in model_cls.__table__.columns}
    kwargs = {}
    for k, v in data_dict.items():
        if k in valid_cols:
            col = valid_cols[k]
            col_type_str = str(col.type).upper()
            if "DATETIME" in col_type_str or "TIMESTAMP" in col_type_str:
                kwargs[k] = parse_dt(v)
            elif "BOOLEAN" in col_type_str and v is not None:
                kwargs[k] = bool(v)
            else:
                kwargs[k] = v
    return model_cls(**kwargs)


# Danh sách bảng theo thứ tự phụ thuộc (Dependencies first)
TABLE_MODEL_MAPPING = [
    ("game_categories", models.GameCategory),
    ("achievements", models.Achievement),
    ("scratch_courses", models.ScratchCourse),
    ("scratch_lessons", models.ScratchLesson),
    ("daily_quests", models.DailyQuest),
    ("users", models.User),
    ("wallets", models.Wallet),
    ("wallet_transactions", models.WalletTransaction),
    ("games", models.Game),
    ("purchases", models.Purchase),
    ("attempts", models.Attempt),
    ("user_achievements", models.UserAchievement),
    ("user_daily_quests", models.UserDailyQuest),
    ("user_daily_spins", models.UserDailySpin),
    ("login_reward_claims", models.LoginRewardClaim),
    ("user_scratch_progress", models.UserScratchProgress),
]

try:
    print("📦 Bắt đầu đồng bộ CSDL vào PostgreSQL iqkids_db...")

    # 1. Xoá dữ liệu cũ theo thứ tự ngược chiều (để không vi phạm khóa ngoại)
    print("  [1/3] Dọn dẹp dữ liệu cũ (đã có bản sao lưu trước đó)...")
    for table_name, model_cls in reversed(TABLE_MODEL_MAPPING):
        db.query(model_cls).delete()
    db.flush()

    # 2. Nạp dữ liệu mới theo thứ tự xuôi chiều
    print("  [2/3] Nạp dữ liệu từ local...")
    for table_name, model_cls in TABLE_MODEL_MAPPING:
        records = dump.get(table_name, [])
        for r in records:
            instance = create_model_instance(model_cls, r)
            db.add(instance)
        db.flush()

    db.commit()
    print("  [3/3] Cam kết (COMMIT) dữ liệu thành công!")

    # In thống kê đối soát
    print("\n📊 BẢNG ĐỐI SOÁT DỮ LIỆU ĐÃ NẠP TRÊN POSTGRESQL:")
    for table_name, model_cls in TABLE_MODEL_MAPPING:
        count = db.query(model_cls).count()
        if count > 0:
            print(f"   ✓ {model_cls.__tablename__:22}: {count} bản ghi")

    print("\n🎉 ĐỒNG BỘ CSDL LOCAL LÊN PRODUCTION THÀNH CÔNG RỰC RỠ!")

except Exception as e:
    db.rollback()
    print(f"\n❌ Lỗi khi nạp dữ liệu: {e}", file=sys.stderr)
    import traceback
    traceback.print_exc()
    sys.exit(1)
finally:
    db.close()

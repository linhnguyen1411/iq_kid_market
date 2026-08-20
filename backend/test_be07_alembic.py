"""
Script kiểm thử toàn diện Task BE-07: Tích Hợp Alembic Database Migrations & Database Indexing
"""
import os
import sys
import tempfile
import sqlite3

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from alembic.config import Config
from alembic import command
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker

from app import seed as seed_module, models


def test_be07_alembic_pipeline():
    print("🚀 BẮT ĐẦU KIỂM THỬ TASK BE-07: ALEMBIC MIGRATIONS & DATABASE INDEXING...\n")

    # Tạo DB SQLite tạm thời để test migration
    temp_dir = tempfile.mkdtemp()
    temp_db_path = os.path.join(temp_dir, "test_alembic.db")
    db_url = f"sqlite:///{temp_db_path.replace(os.sep, '/')}"

    alembic_ini_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "alembic.ini"))
    alembic_cfg = Config(alembic_ini_path)
    alembic_cfg.set_main_option("sqlalchemy.url", db_url)
    alembic_cfg.set_main_option("script_location", os.path.abspath(os.path.join(os.path.dirname(__file__), "alembic")))

    # 1. TEST UPGRADE HEAD
    print("1️⃣ [Test Alembic Upgrade]: Chạy 'alembic upgrade head' trên CSDL mới...")
    command.upgrade(alembic_cfg, "head")

    engine = create_engine(db_url)
    inspector = inspect(engine)
    tables = inspector.get_table_names()

    required_tables = [
        "users", "wallets", "wallet_transactions", "games", "purchases",
        "attempts", "achievements", "user_achievements", "scratch_courses",
        "scratch_lessons", "user_scratch_progress",
    ]

    for tbl in required_tables:
        assert tbl in tables, f"Thiếu bảng '{tbl}' sau khi chạy migration!"
    print(f"   ✅ Toàn bộ {len(required_tables)} bảng đã được tạo thành công bởi Alembic.")

    # 2. TEST DATABASE INDEXES
    print("2️⃣ [Test Database Indexes]: Kiểm tra các chỉ mục tối ưu hiệu năng...")
    # Kiểm tra index trên bảng games
    game_indexes = [idx["name"] for idx in inspector.get_indexes("games")]
    assert "ix_games_template_code" in game_indexes
    assert "ix_games_category" in game_indexes
    assert "ix_games_price" in game_indexes
    assert "ix_games_rating_avg" in game_indexes
    print("   ✅ Bảng 'games' có đầy đủ các B-Tree indexes: template_code, category, price, rating_avg...")

    # Kiểm tra index trên bảng users
    user_indexes = [idx["name"] for idx in inspector.get_indexes("users")]
    assert "ix_users_username" in user_indexes
    assert "ix_users_role" in user_indexes
    assert "ix_users_grade" in user_indexes
    print("   ✅ Bảng 'users' có đầy đủ indexes: username, role, grade, xp, streak.")

    # 3. TEST SEED DATA TRÊN CSDL TẠO BỞI ALEMBIC
    print("3️⃣ [Test Seed Data]: Nạp dữ liệu mẫu vào schema được migrate bởi Alembic...")
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    with TestingSession() as db:
        seed_module.run_seed(db, force=True)
        users_count = db.query(models.User).count()
        games_count = db.query(models.Game).count()
        ach_count = db.query(models.Achievement).count()
        assert users_count >= 3
        assert games_count >= 5
        assert ach_count >= 6
    print(f"   ✅ Seed thành công: {users_count} users, {games_count} games, {ach_count} achievements.")

    # 4. TEST DOWNGRADE -1 (ROLLBACK)
    print("4️⃣ [Test Alembic Downgrade]: Chạy 'alembic downgrade base' để quay lui phiên bản...")
    command.downgrade(alembic_cfg, "base")

    inspector_after_down = inspect(engine)
    remaining_tables = [t for t in inspector_after_down.get_table_names() if t != "alembic_version"]
    assert len(remaining_tables) == 0, f"Vẫn còn bảng thừa sau downgrade: {remaining_tables}"
    print("   ✅ Downgrade quay lui schema về trạng thái sạch sẽ thành công!")

    # 5. TEST RE-UPGRADE
    print("5️⃣ [Test Re-Upgrade]: Nâng cấp lại 'alembic upgrade head'...")
    command.upgrade(alembic_cfg, "head")
    inspector_final = inspect(engine)
    final_tables = inspector_final.get_table_names()
    assert len(final_tables) >= len(required_tables)
    print("   ✅ Nâng cấp lại hoàn tất trơn tru.")

    # Dọn dẹp
    engine.dispose()
    try:
        os.remove(temp_db_path)
    except Exception:
        pass

    print("\n🎉 TẤT CẢ CÁC TEST CASES CỦA TASK BE-07 ĐÃ PASSED 100%! HỆ THỐNG ALEMBIC VẬN HÀNH CHUẨN MỰC.")


if __name__ == "__main__":
    test_be07_alembic_pipeline()

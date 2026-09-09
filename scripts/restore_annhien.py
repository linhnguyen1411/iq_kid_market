import gzip
import re
import os
import sys

# Connect to production database using backend environment
from sqlalchemy import create_engine, text

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL not set!")
    sys.exit(1)

engine = create_engine(DATABASE_URL)

backup_path = "/opt/iqkids/backups/iqkids_db_backup_20260908_214541.sql.gz"
user_id = "u_1788843001195_535a"

print(f"Reading backup from {backup_path}...")

with engine.connect() as conn:
    # 1. Insert user if not exists
    user_check = conn.execute(text("SELECT id FROM users WHERE id = :uid OR username = 'kid_annhien'"), {"uid": user_id}).fetchone()
    if not user_check:
        print("Restoring user kid_annhien...")
        conn.execute(text("""
            INSERT INTO users (id, username, password_hash, name, role, grade, avatar, xp, level, streak, last_active_date, created_at)
            VALUES (
                :id, 'kid_annhien', '$2b$12$lkzgEh0ynKLiTP.ZyHaQ7uBJSFQU1gsQAfwOt.Jhp8iI1L/Whx7iC',
                'An Nhiên', 'student', 2, 'smile_tiger', 100, 1, 1,
                '2026-09-08 04:51:17.497483', '2026-09-08 04:50:01.581091'
            )
        """), {"id": user_id})
        conn.commit()
        print("✓ User restored.")
    else:
        print(f"User already exists with id {user_check[0]}")

    # 2. Insert wallet
    wallet_check = conn.execute(text("SELECT user_id FROM wallets WHERE user_id = :uid"), {"uid": user_id}).fetchone()
    if not wallet_check:
        print("Restoring wallet...")
        conn.execute(text("""
            INSERT INTO wallets (user_id, balance, currency)
            VALUES (:uid, 90000, 'VND')
        """), {"uid": user_id})
        conn.commit()
        print("✓ Wallet restored.")

    # 3. Insert wallet transactions
    tx_check = conn.execute(text("SELECT id FROM wallet_transactions WHERE id = 'tx_1788843001586'")).fetchone()
    if not tx_check:
        print("Restoring wallet transaction...")
        conn.execute(text("""
            INSERT INTO wallet_transactions (id, wallet_user_id, amount, type, detail, created_at)
            VALUES ('tx_1788843001586', :uid, 90000, 'nạp tiền', 'Quà tặng khởi tạo tài khoản IQ Kid Market ✨', '2026-09-08 04:50:01.595973')
        """), {"uid": user_id})
        conn.commit()
        print("✓ Wallet transaction restored.")

    # 4. Insert purchase
    purch_check = conn.execute(text("SELECT id FROM purchases WHERE user_id = :uid AND game_id = 'g1'"), {"uid": user_id}).fetchone()
    if not purch_check:
        print("Restoring purchase...")
        conn.execute(text("""
            INSERT INTO purchases (user_id, game_id, purchased_price, purchased_at)
            VALUES (:uid, 'g1', 0, '2026-09-08 04:50:01.589516')
        """), {"uid": user_id})
        conn.commit()
        print("✓ Purchase restored.")

    # 5. Insert attempts
    attempts = [
        ('att_1788843028935', user_id, 'g3', 1, 17, True, 15, '2026-09-08 04:50:28.93515'),
        ('att_1788843068064', user_id, 'g3', 2, 17, True, 15, '2026-09-08 04:51:08.064449'),
        ('att_1788843077497', user_id, 'g3', 3, 17, True, 15, '2026-09-08 04:51:17.497483')
    ]
    for att_id, uid, gid, lvl, score, completed, duration_secs, created_at in attempts:
        att_check = conn.execute(text("SELECT id FROM attempts WHERE id = :aid"), {"aid": att_id}).fetchone()
        if not att_check:
            conn.execute(text("""
                INSERT INTO attempts (id, user_id, game_id, level_num, score, completed, duration_secs, created_at)
                VALUES (:aid, :uid, :gid, :lvl, :score, :completed, :duration_secs, :created_at)
            """), {
                "aid": att_id, "uid": uid, "gid": gid, "lvl": lvl,
                "score": score, "completed": completed, "duration_secs": duration_secs, "created_at": created_at
            })
            conn.commit()
    print("✓ Attempts restored.")

    # 6. Insert user daily quests
    quests = [
        ('udq_u_1788843001195_535a_quest_score_reach_2026-09-08', user_id, 'quest_score_reach', 0, 'IN_PROGRESS', '2026-09-08 00:00:00'),
        ('udq_u_1788843001195_535a_quest_scratch_complete_2026-09-08', user_id, 'quest_scratch_complete', 0, 'IN_PROGRESS', '2026-09-08 00:00:00'),
        ('udq_u_1788843001195_535a_quest_play_count_2026-09-08', user_id, 'quest_play_count', 2, 'COMPLETED', '2026-09-08 00:00:00'),
    ]
    for qid, uid, q_code, prog, stat, q_date in quests:
        q_check = conn.execute(text("SELECT id FROM user_daily_quests WHERE id = :qid"), {"qid": qid}).fetchone()
        if not q_check:
            dq_exists = conn.execute(text("SELECT id FROM daily_quests WHERE id = :qid"), {"qid": q_code}).fetchone()
            if dq_exists:
                conn.execute(text("""
                    INSERT INTO user_daily_quests (id, user_id, quest_id, current_progress, status, quest_date)
                    VALUES (:qid, :uid, :q_code, :prog, :stat, :q_date)
                """), {"qid": qid, "uid": uid, "q_code": q_code, "prog": prog, "stat": stat, "q_date": q_date})
                conn.commit()
    print("✓ Quests restored.")

    # 7. Insert user daily spins
    spin_id = "spin_u_1788843001195_535a_2026-09-08"
    spin_check = conn.execute(text("SELECT id FROM user_daily_spins WHERE id = :sid"), {"sid": spin_id}).fetchone()
    if not spin_check:
        conn.execute(text("""
            INSERT INTO user_daily_spins (id, user_id, spin_date, eligible, spun, reward_code, reward_amount)
            VALUES (:sid, :uid, '2026-09-08 00:00:00', true, false, NULL, 0)
        """), {"sid": spin_id, "uid": user_id})
        conn.commit()
        print("✓ Spin restored.")

print("\n🎉 RESTORE HOÀN TẤT CHO USER kid_annhien!")

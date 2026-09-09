#!/usr/bin/env python3
"""
Trích xuất toàn bộ dữ liệu từ SQLite local (backend/iqkids_dev.db) thành JSON
để đồng bộ lên PostgreSQL production.
"""
import os
import sys
import json
import sqlite3
from datetime import datetime

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DB_PATH = os.path.join(ROOT_DIR, "backend", "iqkids_dev.db")
OUTPUT_PATH = os.path.join(ROOT_DIR, "data", "local_db_dump.json")

if not os.path.exists(DB_PATH):
    print(f"❌ Không tìm thấy database SQLite tại: {DB_PATH}")
    sys.exit(1)

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# Thứ tự bảng cần đồng bộ
TABLES = [
    "game_categories",
    "achievements",
    "scratch_courses",
    "scratch_lessons",
    "daily_quests",
    "users",
    "wallets",
    "wallet_transactions",
    "games",
    "purchases",
    "attempts",
    "user_achievements",
    "user_daily_quests",
    "user_daily_spins",
    "login_reward_claims",
    "user_scratch_progress",
]

dump = {}
total_records = 0

for table in TABLES:
    try:
        cur.execute(f"SELECT * FROM {table}")
        rows = cur.fetchall()
        table_data = []
        for row in rows:
            record = dict(row)
            # Parse json column for games.levels if stored as string
            if table == "games" and "levels" in record and isinstance(record["levels"], str):
                try:
                    record["levels"] = json.loads(record["levels"])
                except Exception:
                    pass
            table_data.append(record)
        dump[table] = table_data
        total_records += len(table_data)
        print(f"  ✓ {table:22}: {len(table_data)} bản ghi")
    except sqlite3.OperationalError as e:
        print(f"  - {table:22}: Bỏ qua ({e})")
        dump[table] = []

os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
    json.dump(dump, f, ensure_ascii=False, indent=2)

print(f"\n✅ Đã trích xuất thành công {total_records} bản ghi vào: {OUTPUT_PATH}")

# PHASE 5 — GAME BLUEPRINT & TEMPLATE PRESETS
## Implementation Report

**Date:** 2026-09-11
**Branch:** feature/change_master_base
**Status:** ✅ COMPLETE

---

## 1. Tóm Tắt Kết Quả

| Hạng Mục | Kết Quả |
|---|---|
| Backend tests | **120/120 passed** (42.07s) |
| Frontend build | **✅ Passed** — 2723 modules, 0 errors |
| Database migration | **✅ `0009_add_game_blueprints_table.py`** — executed |
| Blueprint presets | **5 GDPT presets** seeded |
| API endpoints | **6 endpoints** (list, get, create, update, delete, build-from-blueprint) |
| Blueprint test suite | **5/5 passed** |

---

## 2. Files Thay Đổi

### Backend

| File | Trạng Thái | Mô Tả |
|---|---|---|
| `backend/alembic/versions/0009_add_game_blueprints_table.py` | NEW | Migration: tạo bảng `game_blueprints` |
| `backend/app/models.py` | MODIFIED | Thêm `GameBlueprint(Base)` ORM model |
| `backend/app/schemas.py` | MODIFIED | Thêm `GameBlueprintCreateIn`, `GameBlueprintUpdateIn`, `GameBlueprintOut`, `PaginatedBlueprintsOut`, `BuildGameFromBlueprintIn` |
| `backend/app/seed.py` | MODIFIED | Thêm `DEFAULT_GAME_BLUEPRINTS` + `ensure_game_blueprints()` |
| `backend/app/auth_utils.py` | MODIFIED | Thêm `require_admin = require_roles(["admin"])` |
| `backend/app/routers/blueprints.py` | NEW | Router blueprint: CRUD + build-from-blueprint |
| `backend/app/main.py` | MODIFIED | Include `blueprints.router` + gọi `ensure_game_blueprints()` |
| `backend/tests/test_game_blueprints.py` | NEW | 5 test cases đầy đủ |

### Frontend

| File | Trạng Thái | Mô Tả |
|---|---|---|
| `src/services/api.ts` | MODIFIED | Thêm `api.blueprints` + `api.admin.buildGameFromBlueprint` |
| `src/pages/admin-cms/AdminLevelBuilderTab.tsx` | MODIFIED | Thêm Blueprint browser UI + 1-Click generator |

---

## 3. Database Schema — `game_blueprints`

```sql
CREATE TABLE game_blueprints (
    id          VARCHAR(64) PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT,
    grade       INTEGER NOT NULL,        -- 1–5
    subject     VARCHAR(64) NOT NULL,    -- math, vietnamese, science, logic
    topic       VARCHAR(128),
    target_engine VARCHAR(64) NOT NULL,  -- quiz, matching, math, sequence
    total_questions INTEGER DEFAULT 10,  -- màn chuẩn GDPT
    rule_config JSONB DEFAULT '{}',      -- difficulty_distribution, etc.
    is_active   BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,       -- lần sinh game
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);
```

---

## 4. API Endpoints

### Public (Auth required)
- `GET /api/blueprints/` — Danh sách blueprints (filter: grade, subject, is_active)
- `GET /api/blueprints/{blueprint_id}` — Chi tiết blueprint

### Admin only
- `POST /api/admin/blueprints/` — Tạo blueprint mới
- `PATCH /api/admin/blueprints/{blueprint_id}` — Cập nhật blueprint
- `DELETE /api/admin/blueprints/{blueprint_id}` — Soft delete (is_active=False)
- `POST /api/admin/games/build-from-blueprint/{blueprint_id}` — **1-Click Auto-Assembly**

### Build-From-Blueprint Logic
```
Blueprint → Lấy questions từ Bank (grade/subject/engine filter) 
         → Anti-Theft Isolation (chỉ dùng questions của owner + system)
         → Tạo Game + Levels (snapshot từng câu hỏi)
         → Tạo GameVersion v1 (immutable snapshot)
         → Tăng usage_count
```

---

## 5. Blueprint Presets GDPT Chuẩn (5 mẫu)

| Blueprint ID | Lớp | Môn | Engine | Màn |
|---|---|---|---|---|
| `bp_math_g1_count` | 1 | Toán | quiz | 10 |
| `bp_math_g2_addition` | 2 | Toán | math | 10 |
| `bp_viet_g3_vocab` | 3 | Tiếng Việt | matching | 10 |
| `bp_sci_g4_nature` | 4 | Khoa Học | quiz | 10 |
| `bp_logic_g5_sequence` | 5 | Logic | sequence | 10 |

---

## 6. Frontend UI — Blueprint Browser

Tab **"Ghép Từ Ngân Hàng"** giờ có 2 sub-tab:

### Sub-tab 1: Công Thức GDPT Mẫu (Blueprints)
- Grid hiển thị blueprint cards với badge: Lớp, Môn, Engine, Số màn, Phân bổ độ khó, Lượt đã tạo
- Filter: Khối Lớp + Môn Học
- Button **"🚀 1-Click Sinh Game Từ Công Thức"** → gọi `api.admin.buildGameFromBlueprint(bp.id)` → auto-navigate về tab Level Editor sau khi tạo thành công

### Sub-tab 2: Tự Chọn Câu Hỏi Lẻ (Custom Bank)
- Giao diện Phase 4 giữ nguyên: Question list table + Assembly console (Ghép Game Mới / Bổ Sung Vào Game Có Sẵn)

---

## 7. Test Suite — `test_game_blueprints.py`

| Test | Mô Tả | Kết Quả |
|---|---|---|
| `test_list_blueprints_and_filter` | Liệt kê + filter theo grade/subject | ✅ |
| `test_admin_crud_blueprint` | Admin tạo/cập nhật/xóa blueprint | ✅ |
| `test_build_game_from_blueprint` | 1-Click auto-assembly: game + version | ✅ |
| `test_build_blueprint_anti_theft_isolation` | Chỉ dùng questions của creator + system | ✅ |
| `test_build_blueprint_insufficient_questions` | 422 khi bank không đủ câu hỏi | ✅ |

---

## 8. Kiến Trúc Anti-Theft Isolation

Khi Creator dùng Blueprint để auto-assemble game:
- Hệ thống **CHỈ** lấy questions có `visibility='system'` hoặc questions do chính Creator tạo (`creator_id = caller_id`)
- Không thể "vô tình" lấy questions của Teacher khác → bảo vệ quyền sở hữu nội dung

---

## 9. Snapshot Immutability

Mỗi lần build-from-blueprint:
1. Tạo `Game` record
2. Với mỗi câu hỏi → tạo `Level` với `question.data` được **deep copy** độc lập
3. Tạo `GameVersion(version=1, content_snapshot=...)` — immutable snapshot
4. `usage_count` của blueprint +1

Sau khi game được publish, snapshot không bao giờ thay đổi dù question trong Bank bị sửa.

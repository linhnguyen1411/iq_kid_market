# PHASE 7 — DUPLICATE DETECTION ENGINE (ENGINE-AWARE DUAL HASHES & JACCARD CROSS-GAME MATCHING)
## Implementation Report

**Date:** 2026-09-12  
**Branch:** feature/change_master_base  
**Status:** ✅ COMPLETE  

---

## 1. Tóm Tắt Kết Quả

| Hạng Mục | Kết Quả |
|---|---|
| Backend test suite | **134/134 passed** (43.57s) — 0 regressions |
| Frontend production build | **✅ Passed** — 2723 modules, 0 errors (7.62s) |
| Duplicate Detection Module | `backend/app/duplicate_detector.py` (Engine-aware Jaccard matching) |
| API Endpoints | `GET /api/admin/games/{game_id}/duplicate-check`, import-preview integration |
| Deduplication Test Suite | **7/7 passed** (`tests/test_content_dedup.py`) |

---

## 2. Files Thay Đổi

### Backend

| File | Trạng Thái | Mô Tả |
|---|---|---|
| `backend/app/duplicate_detector.py` | NEW | Module phát hiện trùng lặp chéo: trích xuất hash ngữ nghĩa, tính Jaccard, phân loại rủi ro |
| `backend/app/schemas.py` | MODIFIED | Thêm `DuplicateCandidateOut` và `DuplicateCheckOut` |
| `backend/app/routers/admin.py` | MODIFIED | Thêm endpoint `GET /games/{game_id}/duplicate-check` và tích hợp cảnh báo vào `POST /games/import-preview` |
| `backend/tests/test_content_dedup.py` | NEW | 7 test cases kiểm thử toán học Jaccard, engine normalization, 3 tầng rủi ro, quyền admin |

### Frontend

| File | Trạng Thái | Mô Tả |
|---|---|---|
| `src/types/index.ts` | MODIFIED | Thêm interfaces `DuplicateCandidateOut`, `DuplicateCheckOut` |
| `src/services/api.ts` | MODIFIED | Thêm `api.admin.checkGameDuplicates(gameId, threshold)` |
| `src/pages/AdminPage.tsx` | MODIFIED | Thêm nút "So Khớp Trùng Lặp" & Modal đối soát Jaccard với thanh tương đồng, số câu trùng, nguyên tắc zero auto-deletion |

---

## 3. Kiến Trúc & Thuật Toán Đối Soát Trùng Lặp

### 3.1. Chuẩn Hóa Đặc Thù Engine (Engine-aware Normalization)
- Tận dụng `content_hasher.compute_dual_hashes` cho 10 engine:
  - **Engine không phụ thuộc thứ tự (Quiz, Matching):** Các phương án lựa chọn được sắp xếp bảng chữ cái trước khi băm $ightarrow$ đảo vị trí A/B/C/D không làm đổi hash.
  - **Engine bảo lưu thứ tự nghiêm ngặt (Sequence, Sorting):** Thứ tự chuỗi số hoặc thẻ bài sắp xếp được giữ nguyên vị trí $ightarrow$ xáo trộn thứ tự sẽ sinh hash khác.
  - **Engine toán học (Math):** Chuẩn hóa khoảng trắng và dấu toán học $ightarrow$ `12 + 34` và `  12+34  ` tạo ra cùng một hash.

### 3.2. Thuật Toán Tương Đồng Jaccard
Cho Game đang xét $A$ và Game trong CSDL $B$:
$$J(A, B) = rac{|S_A \cap S_B|}{|S_A \cup S_B|}$$
Trong đó $S_A, S_B$ là tập hợp các `normalized_hash` trích xuất từ tất cả câu hỏi của trò chơi.

### 3.3. Phân Cấp Ngưỡng Cảnh Báo
- **$J < 0.60$ (`LOW`):** An toàn, nội dung độc nhất, không có cảnh báo.
- **$0.60 \le J < 0.80$ (`MEDIUM`):** Cảnh báo trùng lặp một phần (Possible Duplicate). Yêu cầu giáo viên/admin kiểm tra nội dung.
- **$J \ge 0.80$ (`HIGH`):** Nguy cơ clone game cao (Clone Candidate). Hệ thống gắn cờ cảnh báo nổi bật.

### 3.4. Nguyên Tắc An Toàn (Zero Auto-Deletion)
- Hệ thống **TUYỆT ĐỐI KHÔNG TỰ ĐỘNG XÓA BỎ NỘI DUNG** của người dùng.
- Kết quả đối soát phục vụ độc quyền cho công tác cảnh báo trước khi nộp và hỗ trợ quyết định kiểm duyệt của Admin.

---

## 4. Test Suite — `test_content_dedup.py` (7/7 Passed)

| Test Case | Mục Đích | Kết Quả |
|---|---|---|
| `test_jaccard_similarity_math` | Kiểm thử toán học Jaccard cho các tập hợp: 0%, 66.7% (MEDIUM), 81.8% (HIGH), 100% | ✅ |
| `test_engine_aware_normalization` | Đảm bảo quiz không đổi hash khi đảo options; sequence/sorting đổi hash khi đảo thứ tự | ✅ |
| `test_cross_game_low_similarity` | Hai game khác biệt chủ đề không có match nào vượt ngưỡng 60% (`LOW`) | ✅ |
| `test_cross_game_medium_similarity_warning` | Trùng 8/12 câu (66.7%) được phân loại `MEDIUM` rủi ro | ✅ |
| `test_cross_game_high_similarity_clone_alert` | Trùng 9/10 câu (>= 80%) được phân loại `HIGH` rủi ro clone | ✅ |
| `test_duplicate_check_endpoint_admin_and_teacher_perms` | Admin gọi được API (200), Teacher bị chặn (403) | ✅ |
| `test_import_preview_cross_game_duplicate_warning` | Quality Gate preview cảnh báo khi import pack trùng với game đã có trên hệ thống | ✅ |

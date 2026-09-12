import pytest
from app import models
from app.duplicate_detector import (
    calculate_jaccard_similarity,
    classify_risk_level,
    extract_normalized_hashes,
    find_cross_game_duplicates,
)
from app.content_hasher import compute_dual_hashes


def test_jaccard_similarity_math():
    """Kiểm thử tính toán hệ số Jaccard thuần túy theo công thức |A ∩ B| / |A ∪ B|."""
    # 1. Hai tập rời rạc hoàn toàn (0%)
    set_a = {"h1", "h2", "h3"}
    set_b = {"h4", "h5", "h6"}
    assert calculate_jaccard_similarity(set_a, set_b) == 0.0
    assert classify_risk_level(0.0) == "LOW"

    # 2. Hai tập giống hệt nhau (100%)
    assert calculate_jaccard_similarity(set_a, set_a) == 1.0
    assert classify_risk_level(1.0) == "HIGH"

    # 3. Tập rỗng
    assert calculate_jaccard_similarity(set(), set()) == 0.0

    # 4. Ngưỡng MEDIUM (ví dụ: 8 phần tử chung trên tổng hợp 12 phần tử = 8/12 = 0.6667)
    set_c = {"h1", "h2", "h3", "h4", "h5", "h6", "h7", "h8", "a9", "a10"}
    set_d = {"h1", "h2", "h3", "h4", "h5", "h6", "h7", "h8", "b9", "b10"}
    sim_med = calculate_jaccard_similarity(set_c, set_d)
    assert 0.60 <= sim_med < 0.80
    assert classify_risk_level(sim_med) == "MEDIUM"

    # 5. Ngưỡng HIGH (ví dụ: 9 phần tử chung trên tổng hợp 11 phần tử = 9/11 = 0.8182)
    set_e = {"h1", "h2", "h3", "h4", "h5", "h6", "h7", "h8", "h9", "a10"}
    set_f = {"h1", "h2", "h3", "h4", "h5", "h6", "h7", "h8", "h9", "b10"}
    sim_high = calculate_jaccard_similarity(set_e, set_f)
    assert sim_high >= 0.80
    assert classify_risk_level(sim_high) == "HIGH"


def test_engine_aware_normalization():
    """
    Kiểm tra tính nhận biết ngữ nghĩa theo từng loại engine:
    - Quiz: Đảo thứ tự lựa chọn options -> normalized_hash KHÔNG đổi.
    - Sequence: Đảo thứ tự chuỗi -> normalized_hash PHẢI đổi (bảo lưu thứ tự).
    - Sorting: Đảo thứ tự đích -> normalized_hash PHẢI đổi (bảo lưu thứ tự).
    - Math: Bỏ khoảng trắng trong biểu thức -> normalized_hash KHÔNG đổi.
    """
    # 1. Quiz (Order insensitive options)
    _, h_quiz1 = compute_dual_hashes("quiz", "Thủ đô của Việt Nam?", {"options": ["Hà Nội", "Huế"], "answer": "Hà Nội"})
    _, h_quiz2 = compute_dual_hashes("quiz", "  thủ đô của việt nam?  ", {"options": ["Huế", "Hà Nội"], "answer": "Hà Nội"})
    assert h_quiz1 == h_quiz2

    # 2. Sequence (STRICT ORDER PRESERVATION)
    _, h_seq1 = compute_dual_hashes("sequence", "Điền số tiếp theo", {"sequence": [1, 2, 3], "answer": "4"})
    _, h_seq2 = compute_dual_hashes("sequence", "Điền số tiếp theo", {"sequence": [3, 2, 1], "answer": "4"})
    assert h_seq1 != h_seq2

    # 3. Sorting (STRICT ORDER PRESERVATION)
    _, h_sort1 = compute_dual_hashes("sorting", "Sắp xếp từ bé đến lớn", {"correct_order": ["A", "B", "C"]})
    _, h_sort2 = compute_dual_hashes("sorting", "Sắp xếp từ bé đến lớn", {"correct_order": ["C", "B", "A"]})
    assert h_sort1 != h_sort2

    # 4. Math (Whitespace normalization)
    _, h_math1 = compute_dual_hashes("math", "Tính tổng", {"expression": "12 + 34", "answer": "46"})
    _, h_math2 = compute_dual_hashes("math", "Tính tổng", {"expression": "  12+34  ", "answer": "46"})
    assert h_math1 == h_math2


def test_cross_game_low_similarity(db_session, admin_auth):
    """Hai game khác biệt hoàn toàn về nội dung thì độ tương đồng < 0.60 (LOW risk)."""
    game_a_levels = [
        {"level_num": i, "questions": [{"question_type": "math", "prompt": f"Toán {i}: {i} + 1 = ?", "data": {"expression": f"{i}+1", "answer": str(i+1)}}]}
        for i in range(1, 11)
    ]
    game_b_levels = [
        {"level_num": i, "questions": [{"question_type": "quiz", "prompt": f"Hỏi địa lý câu {i}?", "data": {"options": ["Bắc", "Nam"], "answer": "Bắc"}}]}
        for i in range(1, 11)
    ]

    game_a = models.Game(
        id="game_dedup_low_a",
        title="Toán Cộng Phép Tính Lớp 1",
        template_code="math",
        creator_id=admin_auth["user_id"],
        levels=game_a_levels,
        is_seed=False,
    )
    db_session.add(game_a)
    db_session.commit()

    matches = find_cross_game_duplicates(
        db=db_session,
        target_levels=game_b_levels,
        template_code="quiz",
        exclude_game_id="game_dedup_low_b",
        threshold=0.60,
    )
    # Không có match nào vượt ngưỡng 0.60
    assert len(matches) == 0


def test_cross_game_medium_similarity_warning(db_session, admin_auth):
    """Hai game trùng một phần nội dung (8/12 = 66.7% Jaccard) được phân loại MEDIUM."""
    common_levels = [
        {"level_num": i, "questions": [{"question_type": "math", "prompt": f"Phép cộng {i} + 10 = ?", "data": {"expression": f"{i}+10", "answer": str(i+10)}}]}
        for i in range(1, 9)
    ]
    # Game A có 8 chung + 2 câu riêng A
    game_a_levels = common_levels + [
        {"level_num": 9, "questions": [{"question_type": "math", "prompt": "Phép cộng riêng A1", "data": {"expression": "99+1", "answer": "100"}}]},
        {"level_num": 10, "questions": [{"question_type": "math", "prompt": "Phép cộng riêng A2", "data": {"expression": "98+2", "answer": "100"}}]},
    ]
    # Game B có 8 chung + 2 câu riêng B
    game_b_levels = common_levels + [
        {"level_num": 9, "questions": [{"question_type": "math", "prompt": "Phép cộng riêng B1", "data": {"expression": "50+50", "answer": "100"}}]},
        {"level_num": 10, "questions": [{"question_type": "math", "prompt": "Phép cộng riêng B2", "data": {"expression": "40+60", "answer": "100"}}]},
    ]

    game_a = models.Game(
        id="game_dedup_med_a",
        title="Toán Tư Duy Cơ Bản A",
        template_code="math",
        creator_id=admin_auth["user_id"],
        levels=game_a_levels,
        is_seed=False,
    )
    db_session.add(game_a)
    db_session.commit()

    matches = find_cross_game_duplicates(
        db=db_session,
        target_levels=game_b_levels,
        template_code="math",
        exclude_game_id="game_dedup_med_b",
        threshold=0.60,
    )
    assert len(matches) >= 1
    match_a = next(m for m in matches if m["game_id"] == game_a.id)
    assert match_a["risk_level"] == "MEDIUM"
    assert 60 <= match_a["similarity_percent"] < 80
    assert match_a["common_count"] == 8


def test_cross_game_high_similarity_clone_alert(db_session, admin_auth):
    """Hai game giống nhau gần như toàn bộ (>= 80% Jaccard) được phân loại HIGH (nguy cơ clone)."""
    common_levels = [
        {"level_num": i, "questions": [{"question_type": "math", "prompt": f"Bài toán {i}: {i} * 2 = ?", "data": {"expression": f"{i}*2", "answer": str(i*2)}}]}
        for i in range(1, 10)
    ]
    game_orig_levels = common_levels + [
        {"level_num": 10, "questions": [{"question_type": "math", "prompt": "Bài toán 10: 10 * 2 = ?", "data": {"expression": "10*2", "answer": "20"}}]},
    ]
    # Game Clone giữ nguyên 9/10 câu của Game Gốc
    game_clone_levels = common_levels + [
        {"level_num": 10, "questions": [{"question_type": "math", "prompt": "Bài toán riêng 10: 11 * 2 = ?", "data": {"expression": "11*2", "answer": "22"}}]},
    ]

    game_orig = models.Game(
        id="game_dedup_high_orig",
        title="Bảng Nhân 2 Nguyên Bản",
        template_code="math",
        creator_id=admin_auth["user_id"],
        levels=game_orig_levels,
        is_seed=False,
    )
    db_session.add(game_orig)
    db_session.commit()

    matches = find_cross_game_duplicates(
        db=db_session,
        target_levels=game_clone_levels,
        template_code="math",
        exclude_game_id="game_dedup_clone",
        threshold=0.60,
    )
    assert len(matches) >= 1
    match_orig = next(m for m in matches if m["game_id"] == game_orig.id)
    assert match_orig["risk_level"] == "HIGH"
    assert match_orig["similarity_percent"] >= 80
    assert match_orig["common_count"] == 9


def test_duplicate_check_endpoint_admin_and_teacher_perms(client, admin_auth, teacher_auth, db_session):
    """Chỉ Admin mới có quyền gọi GET /api/admin/games/{game_id}/duplicate-check (Teacher bị 403)."""
    game = models.Game(
        id="game_dedup_endpoint_test",
        title="Game Thử Nghiệm Quyền Endpoint",
        template_code="quiz",
        creator_id=admin_auth["user_id"],
        levels=[
            {"level_num": 1, "questions": [{"question_type": "quiz", "prompt": "Câu hỏi test?", "data": {"options": ["A", "B"], "answer": "A"}}]}
        ],
        is_seed=False,
    )
    db_session.add(game)
    db_session.commit()

    # 1. Admin gọi -> 200 OK
    res_admin = client.get(
        f"/api/admin/games/{game.id}/duplicate-check",
        headers=admin_auth["headers"],
    )
    assert res_admin.status_code == 200
    data = res_admin.json()
    assert "has_duplicate_risk" in data
    assert "max_similarity_percent" in data
    assert "candidates" in data

    # 2. Teacher gọi -> 403 Forbidden
    res_teacher = client.get(
        f"/api/admin/games/{game.id}/duplicate-check",
        headers=teacher_auth["headers"],
    )
    assert res_teacher.status_code == 403


def test_import_preview_cross_game_duplicate_warning(client, teacher_auth, db_session):
    """Khi Import JSON pack, nếu trùng lặp cao với game đã có trên hệ thống, Quality Gate trả về cảnh báo."""
    # 1. Tạo game có sẵn trong CSDL
    existing_levels = [
        {"level_num": i, "title": f"Màn {i}", "questions": [{"question_type": "math", "prompt": f"Phép cộng thử nghiệm {i}: {i} + 5 = ?", "data": {"expression": f"{i}+5", "answer": str(i+5)}}]}
        for i in range(1, 10)
    ]
    exist_game = models.Game(
        id="game_exist_for_preview_test",
        title="Game Đã Xuất Bản Trên Chợ",
        template_code="math",
        creator_id="another_teacher",
        levels=existing_levels,
        is_seed=False,
    )
    db_session.add(exist_game)
    db_session.commit()

    # 2. Teacher import JSON pack chứa 9 câu hỏi y hệt
    pack_clone = {
        "title": "Gói Import Trùng Khớp",
        "template_code": "math",
        "levels": existing_levels,
    }

    res = client.post(
        "/api/admin/games/import-preview",
        json={"gameObject": pack_clone},
        headers=teacher_auth["headers"],
    )
    assert res.status_code == 200
    preview_data = res.json()
    assert any("trùng lặp cao" in w.lower() or "tương đồng ngữ nghĩa" in w.lower() for w in preview_data["warnings"])

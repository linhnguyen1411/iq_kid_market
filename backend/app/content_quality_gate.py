"""Content Quality Gate & Pedagogical Scoring Engine (Phase 6).

Đánh giá chất lượng sư phạm và kỹ thuật của nội dung trò chơi theo 5 chiều:
1. Content Completeness (0-25 điểm): Số lượng màn chơi và quy mô nội dung
2. Question Quality (0-25 điểm): Tính hợp lệ schema engine, độ dài prompt, tính toàn vẹn đáp án
3. Content Diversity (0-20 điểm): Tỷ lệ độc nhất ngữ nghĩa (chống duplicate nội bộ)
4. Child Safety (0-20 điểm): Tiêu chuẩn an toàn trẻ em (quét từ khóa cấm/nhạy cảm)
5. Pedagogical Structure (0-10 điểm): Tiêu đề, mô tả giáo dục, phân lớp, hình ảnh minh họa

Thang điểm:
- >= 80: EXCELLENT (Xuất sắc — Auto-recommend approve)
- 60 - 79: GOOD (Tốt — Sẵn sàng kiểm duyệt)
- 40 - 59: FAIR (Đạt yêu cầu cơ bản — Cần hoàn thiện thêm)
- < 40: POOR (Chưa đạt — Recommend reject)
"""

from typing import Any, Optional
from .ai_content import is_content_safe_for_kids
from .content_hasher import compute_dual_hashes
from . import schemas


def score_game_content(
    game_levels: list[dict[str, Any]],
    game_meta: Optional[dict[str, Any]] = None,
    game_id: Optional[str] = None,
) -> dict[str, Any]:
    """
    Thẩm định và chấm điểm chất lượng sư phạm cho toàn bộ nội dung trò chơi.
    Trả về dictionary cấu trúc phù hợp với schemas.QualityReportOut.
    """
    meta = game_meta or {}
    title = (meta.get("title") or "").strip()
    description = (meta.get("description") or meta.get("detailed_description") or "").strip()
    grade_from = meta.get("grade_from")
    grade_to = meta.get("grade_to")
    thumbnail = meta.get("thumbnail") or ""
    template_code = (meta.get("template_code") or "quiz").strip().lower()

    dimensions: list[dict[str, Any]] = []
    recommendations: list[str] = []

    # -------------------------------------------------------------
    # 1. Content Completeness (0 - 25 điểm)
    # -------------------------------------------------------------
    total_levels = len(game_levels) if isinstance(game_levels, list) else 0
    completeness_issues: list[str] = []

    if total_levels >= 10:
        completeness_score = 25
    elif total_levels >= 5:
        completeness_score = 15
        completeness_issues.append(
            f"Trò chơi có {total_levels} màn chơi. Đạt chuẩn Marketplace tối thiểu (>= 5 màn), "
            f"nhưng khuyến nghị nâng lên 10 màn theo chuẩn sư phạm GDPT."
        )
        recommendations.append("Bổ sung thêm màn chơi để đạt chuẩn bộ bài tập 10 màn GDPT.")
    elif total_levels >= 3:
        completeness_score = 8
        completeness_issues.append(
            f"Trò chơi có {total_levels} màn chơi (chưa đạt tối thiểu 5 màn chơi để xuất bản Marketplace)."
        )
        recommendations.append("Cần tạo thêm ít nhất 2 màn chơi nữa để đạt mức tối thiểu 5 màn.")
    elif total_levels >= 1:
        completeness_score = 4
        completeness_issues.append(
            f"Trò chơi chỉ có {total_levels} màn chơi, quy mô quá ngắn cho một bài học hoàn chỉnh."
        )
        recommendations.append("Bổ sung các màn chơi để xây dựng lộ trình rèn luyện cho học sinh.")
    else:
        completeness_score = 0
        completeness_issues.append("Trò chơi chưa có màn chơi nào được thiết lập.")
        recommendations.append("Tạo ít nhất 5 màn chơi để bắt đầu thẩm định chất lượng.")

    comp_status = "pass" if completeness_score >= 15 else ("warning" if completeness_score >= 8 else "fail")
    dimensions.append({
        "name": "Quy Mô & Độ Hoàn Thiện",
        "dimension_key": "completeness",
        "score": completeness_score,
        "max_score": 25,
        "status": comp_status,
        "issues": completeness_issues,
    })

    # -------------------------------------------------------------
    # 2. Question Quality & Technical Schema (0 - 25 điểm)
    # -------------------------------------------------------------
    quality_issues: list[str] = []
    total_questions = 0
    invalid_questions = 0
    short_prompts = 0

    if total_levels == 0:
        question_quality_score = 0
        quality_issues.append("Không có câu hỏi nào để thẩm định kỹ thuật.")
    else:
        for lv_idx, lv in enumerate(game_levels, start=1):
            lv_num = lv.get("level_num") or lv_idx
            questions = lv.get("questions") or []
            if not questions:
                quality_issues.append(f"Màn {lv_num} trống rỗng, không chứa câu hỏi nào.")
                invalid_questions += 1
                continue

            for q_idx, q in enumerate(questions, start=1):
                total_questions += 1
                prompt = (q.get("prompt") or "").strip()
                q_type = (q.get("question_type") or template_code).strip().lower()
                q_data = q.get("data")

                if len(prompt) < 5:
                    short_prompts += 1
                    quality_issues.append(f"Màn {lv_num} (câu {q_idx}): Đề bài quá ngắn ({len(prompt)} ký tự, khuyến nghị >= 5).")
                elif len(prompt) > 500:
                    invalid_questions += 1
                    quality_issues.append(f"Màn {lv_num} (câu {q_idx}): Đề bài quá dài ({len(prompt)} ký tự, tối đa 500).")

                if not q_data or not isinstance(q_data, dict):
                    invalid_questions += 1
                    quality_issues.append(f"Màn {lv_num} (câu {q_idx}): Dữ liệu cấu hình câu hỏi rỗng hoặc không phải JSON object.")
                    continue

                # Kiểm tra hợp đồng dữ liệu engine qua schema validator
                try:
                    schemas.AddLevelQuestionIn.validate_game_data(q_type, q_data)
                except ValueError as err:
                    invalid_questions += 1
                    quality_issues.append(f"Màn {lv_num} (câu {q_idx}, engine {q_type}): {err}")

        # Tính điểm Question Quality
        base_q_score = 25
        deduction = (invalid_questions * 5) + (short_prompts * 1)
        question_quality_score = max(0, base_q_score - deduction)

        if invalid_questions > 0:
            recommendations.append(f"Khắc phục {invalid_questions} lỗi cấu hình câu hỏi hoặc đáp án theo đúng chuẩn engine.")
        if short_prompts > 0:
            recommendations.append("Mô tả câu hỏi chi tiết hơn để học sinh nhỏ tuổi dễ hiểu yêu cầu bài tập.")

    qq_status = "pass" if question_quality_score >= 20 else ("warning" if question_quality_score >= 12 else "fail")
    dimensions.append({
        "name": "Chất Lượng Kỹ Thuật Câu Hỏi",
        "dimension_key": "question_quality",
        "score": question_quality_score,
        "max_score": 25,
        "status": qq_status,
        "issues": quality_issues,
    })

    # -------------------------------------------------------------
    # 3. Content Diversity & Anti-Duplicate (0 - 20 điểm)
    # -------------------------------------------------------------
    diversity_issues: list[str] = []
    seen_hashes: dict[str, int] = {}
    duplicate_count = 0

    for lv_idx, lv in enumerate(game_levels, start=1):
        lv_num = lv.get("level_num") or lv_idx
        questions = lv.get("questions") or []
        for q in questions:
            prompt = (q.get("prompt") or "").strip()
            q_type = (q.get("question_type") or template_code).strip().lower()
            q_data = q.get("data") or {}

            _, n_hash = compute_dual_hashes(q_type, prompt, q_data)
            if n_hash in seen_hashes:
                duplicate_count += 1
                orig_lv = seen_hashes[n_hash]
                diversity_issues.append(
                    f"Màn {lv_num} có câu hỏi trùng ngữ nghĩa với Màn {orig_lv}."
                )
            else:
                seen_hashes[n_hash] = lv_num

    unique_questions = len(seen_hashes)
    if total_questions == 0:
        diversity_score = 0
    elif total_questions < 3:
        diversity_score = 5
        diversity_issues.append("Số lượng câu hỏi quá ít để đánh giá độ phong phú và đa dạng.")
    elif duplicate_count == 0:
        diversity_score = 20
    else:
        unique_ratio = unique_questions / total_questions
        if unique_ratio >= 0.8:
            diversity_score = 14
        elif unique_ratio >= 0.6:
            diversity_score = 8
        else:
            diversity_score = 2

        recommendations.append(
            f"Phát hiện {duplicate_count} câu hỏi trùng lặp nội bộ. Hãy đổi số liệu hoặc chủ đề để nội dung phong phú hơn."
        )

    div_status = "pass" if diversity_score >= 16 else ("warning" if diversity_score >= 8 else "fail")
    dimensions.append({
        "name": "Độ Đa Dạng & Chống Trùng Lặp",
        "dimension_key": "diversity",
        "score": diversity_score,
        "max_score": 20,
        "status": div_status,
        "issues": diversity_issues,
    })

    # -------------------------------------------------------------
    # 4. Child Safety (0 - 20 điểm) — Không dung thứ cho nội dung độc hại
    # -------------------------------------------------------------
    safety_issues: list[str] = []
    safety_violations = 0

    # Quét tiêu đề và mô tả
    if title:
        safe_t, msg_t = is_content_safe_for_kids(title)
        if not safe_t:
            safety_violations += 1
            safety_issues.append(f"Tiêu đề chứa nội dung không phù hợp: {msg_t}")

    if description:
        safe_d, msg_d = is_content_safe_for_kids(description)
        if not safe_d:
            safety_violations += 1
            safety_issues.append(f"Mô tả chứa nội dung không phù hợp: {msg_d}")

    # Quét từng câu hỏi
    for lv_idx, lv in enumerate(game_levels, start=1):
        lv_num = lv.get("level_num") or lv_idx
        for q_idx, q in enumerate(lv.get("questions") or [], start=1):
            p = (q.get("prompt") or "").strip()
            d_str = str(q.get("data") or "")

            safe_p, msg_p = is_content_safe_for_kids(p)
            if not safe_p:
                safety_violations += 1
                safety_issues.append(f"Màn {lv_num} (câu {q_idx}): {msg_p or 'Đề bài vi phạm an toàn trẻ em.'}")

            safe_d, msg_d = is_content_safe_for_kids(d_str)
            if not safe_d:
                safety_violations += 1
                safety_issues.append(f"Màn {lv_num} (câu {q_idx}): {msg_d or 'Dữ liệu chứa từ khóa nhạy cảm.'}")

    child_safety_score = max(0, 20 - (safety_violations * 20))
    if safety_violations > 0:
        recommendations.append("GỠ BỎ NGAY các từ ngữ bạo lực, nhạy cảm hoặc không an toàn cho trẻ em.")

    safe_status = "pass" if child_safety_score == 20 else "fail"
    dimensions.append({
        "name": "An Toàn Cho Trẻ Em (Child Safety)",
        "dimension_key": "child_safety",
        "score": child_safety_score,
        "max_score": 20,
        "status": safe_status,
        "issues": safety_issues,
    })

    # -------------------------------------------------------------
    # 5. Pedagogical Structure (0 - 10 điểm)
    # -------------------------------------------------------------
    structure_issues: list[str] = []
    pedagogical_score = 0

    # Tiêu đề: 2 điểm
    if len(title) >= 5 and not any(w in title.lower() for w in ["test", "demo", "game nháp", "asdf"]):
        pedagogical_score += 2
    else:
        structure_issues.append("Tiêu đề game quá ngắn hoặc có tính chất thử nghiệm tạm thời.")
        recommendations.append("Đặt tiêu đề rõ ràng, thu hút và thể hiện nội dung bài học (ví dụ: 'Toán Tư Duy Phép Cộng Có Nhớ').")

    # Mô tả: 3 điểm
    if len(description) >= 15:
        pedagogical_score += 3
    else:
        structure_issues.append("Chưa có mô tả mục tiêu học tập chi tiết (tối thiểu 15 ký tự).")
        recommendations.append("Bổ sung phần mô tả giải thích học sinh sẽ rèn luyện kỹ năng gì qua trò chơi.")

    # Cấu hình phân lớp: 3 điểm
    if grade_from is not None and grade_to is not None and 1 <= int(grade_from) <= int(grade_to) <= 9:
        pedagogical_score += 3
    else:
        structure_issues.append("Khung lớp học phù hợp (grade_from / grade_to) chưa được thiết lập chuẩn (Lớp 1-9).")
        recommendations.append("Thiết lập khoảng lớp học tương ứng để phụ huynh chọn bài tập đúng lứa tuổi.")

    # Hình ảnh/Thumbnail đại diện: 2 điểm
    if thumbnail and thumbnail.strip():
        pedagogical_score += 2
    else:
        structure_issues.append("Trò chơi chưa có icon hoặc hình đại diện thumbnail.")

    struct_status = "pass" if pedagogical_score >= 8 else ("warning" if pedagogical_score >= 5 else "fail")
    dimensions.append({
        "name": "Cấu Trúc Sư Phạm & Trình Bày",
        "dimension_key": "pedagogical_structure",
        "score": pedagogical_score,
        "max_score": 10,
        "status": struct_status,
        "issues": structure_issues,
    })

    # -------------------------------------------------------------
    # Tổng kết & Xếp loại Sư Phạm
    # -------------------------------------------------------------
    total_score = completeness_score + question_quality_score + diversity_score + child_safety_score + pedagogical_score
    total_score = max(0, min(100, total_score))

    if total_score >= 80:
        grade = "EXCELLENT"
        summary = "Nội dung xuất sắc, đạt chuẩn sư phạm GDPT và chất lượng kỹ thuật cao. Sẵn sàng xuất bản ngay."
    elif total_score >= 60:
        grade = "GOOD"
        summary = "Nội dung tốt, đáp ứng các tiêu chuẩn cơ bản của Marketplace. Có thể duyệt hoặc tinh chỉnh nhẹ."
    elif total_score >= 40:
        grade = "FAIR"
        summary = "Nội dung đạt mức cơ bản nhưng còn thiếu sót về quy mô màn chơi, mô tả hoặc đa dạng câu hỏi."
    else:
        grade = "POOR"
        summary = "Nội dung chưa đạt yêu cầu chất lượng. Cần bổ sung và sửa chữa các lỗi kỹ thuật / an toàn."

    # Điều kiện xuất bản Marketplace
    is_publishable = (
        total_score >= 60
        and child_safety_score == 20
        and total_levels >= 5
        and question_quality_score >= 15
    )

    stats = {
        "total_levels": total_levels,
        "total_questions": total_questions,
        "unique_questions": unique_questions,
        "duplicate_count": duplicate_count,
        "safety_violations": safety_violations,
        "invalid_questions": invalid_questions,
        "short_prompts": short_prompts,
    }

    return {
        "game_id": game_id,
        "title": title,
        "total_score": total_score,
        "max_score": 100,
        "grade": grade,
        "is_publishable": is_publishable,
        "summary": summary,
        "dimensions": dimensions,
        "recommendations": recommendations,
        "stats": stats,
    }

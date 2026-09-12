"""
Question Bank Router (Phase 2).
Provides CRUD, filtering, engine validation, dual-hash generation,
role-based privacy isolation, and safe deletion for the reusable Question Bank.
"""

import math
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth_utils import get_current_user_required
from ..content_hasher import compute_dual_hashes
from ..database import get_db

router = APIRouter(tags=["questions"])


@router.get("/api/questions", response_model=schemas.PaginatedQuestionsOut)
def list_questions(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    grade: Optional[int] = None,
    subject: Optional[str] = None,
    topic: Optional[str] = None,
    difficulty: Optional[int] = None,
    engine_code: Optional[str] = None,
    status_filter: Optional[str] = Query(default=None, alias="status"),
    visibility: Optional[str] = None,
    search: Optional[str] = None,
    current_user: models.User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """
    Lấy danh sách câu hỏi trong Ngân hàng câu hỏi (có phân trang & lọc đa chiều).
    - Học sinh (student): Bị chặn 403.
    - Creator / Teacher: Chỉ xem được câu hỏi của chính mình (creator_id == current_user.id)
      hoặc câu hỏi hệ thống (visibility == 'system').
    - Admin: Xem được toàn bộ câu hỏi trên hệ thống.
    """
    if current_user.role == "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Học sinh không có quyền truy cập ngân hàng câu hỏi",
        )

    query = db.query(models.Question)

    # Phân quyền hiển thị câu hỏi
    if current_user.role != "admin":
        # Creator/Teacher: chỉ thấy của mình + câu hỏi system
        query = query.filter(
            or_(
                models.Question.creator_id == current_user.id,
                models.Question.visibility == "system",
            )
        )
        if visibility == "private":
            query = query.filter(
                models.Question.creator_id == current_user.id,
                models.Question.visibility == "private",
            )
        elif visibility == "system":
            query = query.filter(models.Question.visibility == "system")
    else:
        # Admin có thể lọc theo visibility nếu muốn
        if visibility:
            query = query.filter(models.Question.visibility == visibility)

    # Bộ lọc thuộc tính
    if grade is not None:
        query = query.filter(models.Question.grade == grade)
    if subject:
        query = query.filter(models.Question.subject == subject)
    if topic:
        query = query.filter(models.Question.topic.ilike(f"%{topic}%"))
    if difficulty is not None:
        query = query.filter(models.Question.difficulty == difficulty)
    if engine_code:
        query = query.filter(models.Question.engine_code == engine_code)
    if status_filter:
        query = query.filter(models.Question.status == status_filter)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                models.Question.prompt.ilike(search_pattern),
                models.Question.topic.ilike(search_pattern),
                models.Question.skill.ilike(search_pattern),
            )
        )

    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    items = (
        query.order_by(models.Question.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return schemas.PaginatedQuestionsOut(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("/api/questions", response_model=schemas.QuestionOut, status_code=status.HTTP_201_CREATED)
def create_question(
    payload: schemas.QuestionCreateIn,
    current_user: models.User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """
    Tạo câu hỏi mới trong Ngân hàng câu hỏi.
    - Kiểm tra engine contract validation.
    - Tính toán dual hash (content_hash & normalized_hash).
    - Gán creator_id = current_user.id.
    - Chặn quyền tạo câu hỏi system đối với non-admin.
    """
    if current_user.role == "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Học sinh không có quyền truy cập ngân hàng câu hỏi",
        )

    # Chỉ Admin mới được tạo câu hỏi hệ thống (visibility == 'system')
    vis = payload.visibility or "private"
    if vis == "system" and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ Quản trị viên mới được tạo câu hỏi hệ thống (system)",
        )

    # Validate cấu trúc payload.data theo engine_code
    try:
        schemas.AddLevelQuestionIn.validate_game_data(payload.engine_code, payload.data)
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Dữ liệu câu hỏi không hợp lệ cho engine '{payload.engine_code}': {err}",
        )

    # Tính toán dual hashes
    content_hash, normalized_hash = compute_dual_hashes(
        payload.engine_code, payload.prompt, payload.data
    )

    qid = f"q_{uuid.uuid4().hex[:12]}"

    question = models.Question(
        id=qid,
        engine_code=payload.engine_code,
        grade=payload.grade,
        subject=payload.subject,
        topic=payload.topic,
        skill=payload.skill,
        difficulty=payload.difficulty or 1,
        prompt=payload.prompt,
        data=payload.data,
        content_hash=content_hash,
        normalized_hash=normalized_hash,
        creator_id=current_user.id,
        source_game_id=payload.source_game_id,
        source_game_version=payload.source_game_version,
        visibility=vis,
        status=payload.status or "draft",
        usage_count=0,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    db.add(question)
    db.commit()
    db.refresh(question)

    return question


@router.get("/api/questions/{question_id}", response_model=schemas.QuestionOut)
def get_question(
    question_id: str,
    current_user: models.User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """Lấy chi tiết một câu hỏi theo ID với kiểm tra quyền truy cập."""
    if current_user.role == "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Học sinh không có quyền truy cập ngân hàng câu hỏi",
        )

    q = db.get(models.Question, question_id)
    if not q:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy câu hỏi với ID '{question_id}'",
        )

    # Kiểm tra quyền: Admin được xem tất cả; Creator/Teacher xem câu hỏi của mình hoặc system
    if current_user.role != "admin":
        if q.creator_id != current_user.id and q.visibility != "system":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền truy cập câu hỏi này",
            )

    return q


@router.put("/api/questions/{question_id}", response_model=schemas.QuestionOut)
def update_question(
    question_id: str,
    payload: schemas.QuestionUpdateIn,
    current_user: models.User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """
    Cập nhật thông tin câu hỏi.
    - Creator chỉ được sửa câu hỏi của chính mình.
    - Không ai được sửa câu hỏi system trừ Admin.
    - Nếu prompt / data / engine_code thay đổi -> Validate engine contract & tự động tính lại dual hash.
    """
    if current_user.role == "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Học sinh không có quyền truy cập ngân hàng câu hỏi",
        )

    q = db.get(models.Question, question_id)
    if not q:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy câu hỏi với ID '{question_id}'",
        )

    # Quyền chỉnh sửa
    if current_user.role != "admin":
        if q.creator_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền chỉnh sửa câu hỏi của người khác",
            )
        if q.visibility == "system":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ Quản trị viên mới được chỉnh sửa câu hỏi hệ thống",
            )

    # Chặn nâng cấp lên system nếu không phải admin
    if payload.visibility == "system" and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ Quản trị viên mới được đặt câu hỏi thành system",
        )

    # Tính toán giá trị mới
    target_engine = payload.engine_code if payload.engine_code is not None else q.engine_code
    target_data = payload.data if payload.data is not None else q.data
    target_prompt = payload.prompt if payload.prompt is not None else q.prompt

    # Validate lại engine contract nếu có thay đổi data hoặc engine_code
    if payload.data is not None or payload.engine_code is not None:
        try:
            schemas.AddLevelQuestionIn.validate_game_data(target_engine, target_data)
        except ValueError as err:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Dữ liệu câu hỏi không hợp lệ cho engine '{target_engine}': {err}",
            )

    # Tính lại hashes nếu prompt, data hoặc engine_code thay đổi
    if (
        payload.prompt is not None
        or payload.data is not None
        or payload.engine_code is not None
    ):
        c_hash, n_hash = compute_dual_hashes(target_engine, target_prompt, target_data)
        q.content_hash = c_hash
        q.normalized_hash = n_hash

    # Cập nhật các trường
    if payload.engine_code is not None:
        q.engine_code = payload.engine_code
    if payload.grade is not None:
        q.grade = payload.grade
    if payload.subject is not None:
        q.subject = payload.subject
    if payload.topic is not None:
        q.topic = payload.topic
    if payload.skill is not None:
        q.skill = payload.skill
    if payload.difficulty is not None:
        q.difficulty = payload.difficulty
    if payload.prompt is not None:
        q.prompt = payload.prompt
    if payload.data is not None:
        q.data = payload.data
    if payload.visibility is not None:
        q.visibility = payload.visibility
    if payload.status is not None:
        q.status = payload.status

    q.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(q)

    return q


@router.delete("/api/questions/{question_id}")
def delete_question(
    question_id: str,
    current_user: models.User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """
    Xóa an toàn câu hỏi (Safe Deletion).
    - Nếu câu hỏi đã được dùng trong game (usage_count > 0): Lưu trữ (archived), không xóa cứng.
    - Nếu câu hỏi chưa từng được dùng (usage_count == 0): Xóa vĩnh viễn khỏi CSDL.
    """
    if current_user.role == "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Học sinh không có quyền truy cập ngân hàng câu hỏi",
        )

    q = db.get(models.Question, question_id)
    if not q:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy câu hỏi với ID '{question_id}'",
        )

    if current_user.role != "admin":
        if q.creator_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền xóa câu hỏi của người khác",
            )
        if q.visibility == "system":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ Quản trị viên mới được xóa câu hỏi hệ thống",
            )

    if q.usage_count > 0:
        q.status = "archived"
        q.updated_at = datetime.utcnow()
        db.commit()
        return {
            "message": "Câu hỏi đã được lưu trữ (archived) do đã được sử dụng trong game",
            "id": q.id,
            "status": "archived",
        }

    db.delete(q)
    db.commit()
    return {
        "message": "Xóa câu hỏi thành công",
        "id": question_id,
        "status": "deleted",
    }

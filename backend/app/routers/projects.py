import json
import re
import time
from datetime import datetime
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..auth_utils import get_current_user_required, get_current_user_optional
from ..sb3_serializer import export_sb3_bytes, import_sb3_bytes
from ..daily_quests import update_quest_progress
from .scratch import check_and_unlock_scratch_achievements

router = APIRouter(prefix="/api/scratch/projects", tags=["scratch-projects"])


def _format_project_out(proj: models.ScratchProject) -> dict:
    """Format đối tượng ScratchProject thành dict chuẩn hóa Pydantic out."""
    p_data = proj.project_data
    if isinstance(p_data, str):
        try:
            p_data = json.loads(p_data)
        except Exception:
            pass

    return {
        "id": proj.id,
        "user_id": proj.user_id,
        "title": proj.title,
        "description": proj.description,
        "thumbnail": proj.thumbnail,
        "project_data": p_data,
        "is_public": proj.is_public,
        "created_at": proj.created_at.isoformat() if proj.created_at else datetime.utcnow().isoformat(),
        "updated_at": proj.updated_at.isoformat() if proj.updated_at else datetime.utcnow().isoformat(),
    }


def _format_project_list_out(proj: models.ScratchProject) -> dict:
    return {
        "id": proj.id,
        "user_id": proj.user_id,
        "title": proj.title,
        "description": proj.description,
        "thumbnail": proj.thumbnail,
        "is_public": proj.is_public,
        "created_at": proj.created_at.isoformat() if proj.created_at else datetime.utcnow().isoformat(),
        "updated_at": proj.updated_at.isoformat() if proj.updated_at else datetime.utcnow().isoformat(),
    }


# ---------- 1. Danh sách dự án của người dùng hiện tại ----------
@router.get("", response_model=List[schemas.ScratchProjectListOut])
def list_user_projects(
    is_public: Optional[bool] = None,
    current_user: models.User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """Lấy danh sách các dự án Scratch của người dùng hiện tại (sắp xếp mới nhất trước)."""
    query = db.query(models.ScratchProject).filter(models.ScratchProject.user_id == current_user.id)
    if is_public is not None:
        query = query.filter(models.ScratchProject.is_public == is_public)

    projects = query.order_by(models.ScratchProject.updated_at.desc()).all()
    return [_format_project_list_out(p) for p in projects]


# ---------- 2. Tạo dự án mới ----------
@router.post("", response_model=schemas.ScratchProjectOut)
def create_project(
    payload: schemas.ScratchProjectIn,
    current_user: models.User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """Tạo hoặc lưu một dự án Scratch Studio mới cho học sinh."""
    proj_id = f"sp_{current_user.id}_{int(time.time() * 1000)}"

    p_data_str = (
        json.dumps(payload.project_data, ensure_ascii=False)
        if isinstance(payload.project_data, (dict, list))
        else str(payload.project_data)
    )

    new_project = models.ScratchProject(
        id=proj_id,
        user_id=current_user.id,
        title=payload.title or "Dự Án Scratch Của Bé",
        description=payload.description,
        thumbnail=payload.thumbnail or "🐒",
        project_data=p_data_str,
        is_public=payload.is_public or False,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    # Cập nhật nhiệm vụ ngày và mở khóa huy hiệu Scratch Creator
    update_quest_progress(db, current_user.id, "scratch_project_save", 1)
    check_and_unlock_scratch_achievements(db, current_user)

    return _format_project_out(new_project)


# ---------- 3. Lấy chi tiết dự án (kèm toàn bộ kịch bản blocklyXml + sprite) ----------
@router.get("/{project_id}", response_model=schemas.ScratchProjectOut)
def get_project_detail(
    project_id: str,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Xem chi tiết dự án. Yêu cầu là tác giả hoặc dự án được công khai."""
    proj = db.query(models.ScratchProject).filter(models.ScratchProject.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Không tìm thấy dự án Scratch này.")

    # Kiểm tra quyền truy cập
    is_owner = current_user and current_user.id == proj.user_id
    is_staff = current_user and current_user.role in ("admin", "teacher")
    if not (proj.is_public or is_owner or is_staff):
        raise HTTPException(status_code=403, detail="Dự án này ở chế độ riêng tư của tác giả.")

    return _format_project_out(proj)


# ---------- 4. Cập nhật / Tự động lưu (Autosave) ----------
@router.put("/{project_id}", response_model=schemas.ScratchProjectOut)
def update_or_autosave_project(
    project_id: str,
    payload: schemas.ScratchProjectUpdateIn,
    current_user: models.User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """Cập nhật nội dung dự án / Tự động lưu (Autosave). Chỉ chủ sở hữu mới có quyền."""
    proj = db.query(models.ScratchProject).filter(models.ScratchProject.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Không tìm thấy dự án Scratch cần lưu.")

    if proj.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Bạn không có quyền chỉnh sửa dự án của người khác.")

    if payload.title is not None:
        proj.title = payload.title
    if payload.description is not None:
        proj.description = payload.description
    if payload.thumbnail is not None:
        proj.thumbnail = payload.thumbnail
    if payload.is_public is not None:
        proj.is_public = payload.is_public

    if payload.project_data is not None:
        proj.project_data = (
            json.dumps(payload.project_data, ensure_ascii=False)
            if isinstance(payload.project_data, (dict, list))
            else str(payload.project_data)
        )

    proj.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(proj)

    # Cập nhật nhiệm vụ ngày và mở khóa huy hiệu
    update_quest_progress(db, current_user.id, "scratch_project_save", 1)
    check_and_unlock_scratch_achievements(db, current_user)

    return _format_project_out(proj)


# ---------- 5. Xóa dự án ----------
@router.delete("/{project_id}")
def delete_project(
    project_id: str,
    current_user: models.User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """Xóa vĩnh viễn một dự án Scratch."""
    proj = db.query(models.ScratchProject).filter(models.ScratchProject.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Không tìm thấy dự án Scratch.")

    if proj.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Bạn không có quyền xóa dự án của người khác.")

    db.delete(proj)
    db.commit()
    return {"success": True, "message": f"Đã xóa dự án '{proj.title}' thành công."}


# ---------- 6. Nhân bản dự án (Duplicate / Remix) ----------
@router.post("/{project_id}/duplicate", response_model=schemas.ScratchProjectOut)
def duplicate_project(
    project_id: str,
    current_user: models.User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """Nhân bản một dự án (của chính mình hoặc từ dự án công khai)."""
    proj = db.query(models.ScratchProject).filter(models.ScratchProject.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Không tìm thấy dự án gốc để nhân bản.")

    is_owner = proj.user_id == current_user.id
    if not (proj.is_public or is_owner or current_user.role in ("admin", "teacher")):
        raise HTTPException(status_code=403, detail="Dự án này ở chế độ riêng tư, không thể nhân bản.")

    new_id = f"sp_{current_user.id}_{int(time.time() * 1000)}"
    new_title = f"{proj.title} (Bản sao)"
    if len(new_title) > 200:
        new_title = new_title[:197] + "..."

    cloned_proj = models.ScratchProject(
        id=new_id,
        user_id=current_user.id,
        title=new_title,
        description=proj.description,
        thumbnail=proj.thumbnail,
        project_data=proj.project_data,
        is_public=False,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(cloned_proj)
    db.commit()
    db.refresh(cloned_proj)

    return _format_project_out(cloned_proj)


# ---------- 7. Xuất file MIT Scratch 3.0 (.sb3 package) ----------
@router.post("/export-sb3")
def export_project_sb3(
    payload: schemas.ScratchProjectExportIn,
    project_id: Optional[str] = Query(None),
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    Xuất kịch bản ra định dạng MIT Scratch 3.0 (.sb3).
    Có thể truyền project_id hoặc truyền trực tiếp raw project_data từ client.
    """
    title = payload.title or "Du_An_Scratch"
    data = payload.project_data

    if project_id:
        proj = db.query(models.ScratchProject).filter(models.ScratchProject.id == project_id).first()
        if proj:
            title = proj.title
            try:
                data = json.loads(proj.project_data)
            except Exception:
                data = proj.project_data

    import urllib.parse
    ascii_title = re.sub(r'[^a-zA-Z0-9_\-]', '_', title).strip('_') or "du_an_scratch"
    encoded_title = urllib.parse.quote(f"{title}.sb3")
    content_disposition = f'attachment; filename="{ascii_title}.sb3"; filename*=UTF-8\'\'{encoded_title}'

    sb3_bytes = export_sb3_bytes(title=title, project_data=data)

    return Response(
        content=sb3_bytes,
        media_type="application/x.scratch.sb3",
        headers={
            "Content-Disposition": content_disposition,
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


# ---------- 8. Nhập file MIT Scratch 3.0 (.sb3 package) ----------
@router.post("/import-sb3")
async def import_project_sb3(
    file: UploadFile = File(...),
    save_to_account: bool = Query(False),
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    Tải lên và phân tích file .sb3 từ máy tính để hiển thị trên Scratch Studio.
    Nếu save_to_account=true và đã đăng nhập, tự động lưu thành dự án mới.
    """
    if not file.filename or not file.filename.lower().endswith(".sb3"):
        raise HTTPException(status_code=400, detail="Vui lòng tải lên file định dạng Scratch 3 (.sb3).")

    content = await file.read()
    if len(content) > 25 * 1024 * 1024:  # 25 MB limit
        raise HTTPException(status_code=413, detail="File quá lớn. Giới hạn dung lượng tối đa là 25MB.")

    try:
        parsed_data = import_sb3_bytes(zip_bytes=content, filename=file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi khi đọc file .sb3: {str(e)}")

    saved_project_id = None
    if save_to_account and current_user:
        new_id = f"sp_{current_user.id}_{int(time.time() * 1000)}"
        new_project = models.ScratchProject(
            id=new_id,
            user_id=current_user.id,
            title=parsed_data.get("title") or file.filename.replace(".sb3", ""),
            description="Dự án được nhập từ file Scratch 3.0 (.sb3)",
            thumbnail="🐒",
            project_data=json.dumps(parsed_data, ensure_ascii=False),
            is_public=False,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(new_project)
        db.commit()
        saved_project_id = new_id

    return {
        "success": True,
        "message": "Phân tích file .sb3 thành công!",
        "project": parsed_data,
        "saved_project_id": saved_project_id,
    }

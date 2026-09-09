import io
import json
import zipfile
import pytest

from app.sb3_serializer import export_sb3_bytes, import_sb3_bytes


def test_scratch_project_crud(client, student_auth):
    headers = student_auth["headers"]
    user_id = student_auth["user_id"]

    # 1. Danh sách ban đầu trống
    res = client.get("/api/scratch/projects", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) == 0

    # 2. Tạo dự án mới
    sample_data = {
        "sprite": {"x": 50, "y": 20, "direction": 90, "size": 100, "visible": True},
        "blocklyXml": "<xml><block type=\"scratch_when_flag_clicked\"></block></xml>",
        "blocks": [
            {"id": "b1", "type": "scratch_when_flag_clicked", "fields": {}},
            {"id": "b2", "type": "scratch_move_steps", "fields": {"STEPS": 20}},
        ],
    }

    create_res = client.post(
        "/api/scratch/projects",
        json={
            "title": "Mèo Con Nhảy Múa 🐱",
            "description": "Dự án Scratch đầu tay",
            "thumbnail": "🐱",
            "project_data": sample_data,
            "is_public": False,
        },
        headers=headers,
    )
    assert create_res.status_code == 200
    proj = create_res.json()
    assert proj["title"] == "Mèo Con Nhảy Múa 🐱"
    assert proj["user_id"] == user_id
    assert proj["project_data"]["sprite"]["x"] == 50
    proj_id = proj["id"]

    # 3. Lấy chi tiết dự án
    detail_res = client.get(f"/api/scratch/projects/{proj_id}", headers=headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == proj_id

    # 4. Tự động lưu / Cập nhật dự án (Autosave)
    updated_data = {
        **sample_data,
        "sprite": {"x": 100, "y": 80, "direction": 180, "size": 120, "visible": True},
    }
    update_res = client.put(
        f"/api/scratch/projects/{proj_id}",
        json={
            "title": "Mèo Con Biết Bay 🚀",
            "project_data": updated_data,
        },
        headers=headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["title"] == "Mèo Con Biết Bay 🚀"
    assert update_res.json()["project_data"]["sprite"]["x"] == 100

    # 5. Danh sách hiện 1 dự án
    list_res = client.get("/api/scratch/projects", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1
    assert list_res.json()[0]["title"] == "Mèo Con Biết Bay 🚀"


def test_scratch_project_duplicate_and_delete(client, student_auth):
    headers = student_auth["headers"]

    create_res = client.post(
        "/api/scratch/projects",
        json={
            "title": "Dự án gốc",
            "project_data": {"sprite": {"x": 0, "y": 0}},
        },
        headers=headers,
    )
    assert create_res.status_code == 200
    orig_id = create_res.json()["id"]

    # 1. Nhân bản dự án
    dup_res = client.post(f"/api/scratch/projects/{orig_id}/duplicate", headers=headers)
    assert dup_res.status_code == 200
    dup_proj = dup_res.json()
    assert dup_proj["id"] != orig_id
    assert "Bản sao" in dup_proj["title"]

    # Kiểm tra danh sách có 2 dự án
    list_res = client.get("/api/scratch/projects", headers=headers)
    assert len(list_res.json()) == 2

    # 2. Xóa dự án gốc
    del_res = client.delete(f"/api/scratch/projects/{orig_id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # Dự án gốc không còn, dự án bản sao vẫn còn
    get_res = client.get(f"/api/scratch/projects/{orig_id}", headers=headers)
    assert get_res.status_code == 404

    dup_check = client.get(f"/api/scratch/projects/{dup_proj['id']}", headers=headers)
    assert dup_check.status_code == 200


def test_scratch_project_permissions(client, student_auth, teacher_auth):
    # Học sinh 1 tạo dự án riêng tư
    s1_headers = student_auth["headers"]
    create_res = client.post(
        "/api/scratch/projects",
        json={
            "title": "Bí Mật Của Học Sinh 1",
            "project_data": {"blocks": []},
            "is_public": False,
        },
        headers=s1_headers,
    )
    assert create_res.status_code == 200
    proj_id = create_res.json()["id"]

    # Học sinh 2 (tạo mới)
    res_s2 = client.post("/api/auth/register", json={
        "username": "student_2_test",
        "password": "password123",
        "name": "Bé Hai",
        "role": "student",
    })
    s2_headers = {"Authorization": f"Bearer {res_s2.json()['access_token']}"}

    # Học sinh 2 không được xem dự án riêng tư của học sinh 1
    view_res = client.get(f"/api/scratch/projects/{proj_id}", headers=s2_headers)
    assert view_res.status_code == 403

    # Học sinh 2 không được cập nhật dự án của học sinh 1
    update_res = client.put(
        f"/api/scratch/projects/{proj_id}",
        json={"title": "Hacked"},
        headers=s2_headers,
    )
    assert update_res.status_code == 403

    # Học sinh 2 không được xóa dự án của học sinh 1
    del_res = client.delete(f"/api/scratch/projects/{proj_id}", headers=s2_headers)
    assert del_res.status_code == 403

    # Giáo viên có thể xem dự án của học sinh
    t_headers = teacher_auth["headers"]
    teacher_view = client.get(f"/api/scratch/projects/{proj_id}", headers=t_headers)
    assert teacher_view.status_code == 200


def test_sb3_export_and_import(client, student_auth):
    headers = student_auth["headers"]

    project_payload = {
        "title": "Mèo_Chạy_Nhảy",
        "project_data": {
            "sprite": {"x": 12, "y": 34, "direction": 90, "size": 110, "visible": True},
            "blocklyXml": "<xml><block type=\"scratch_when_flag_clicked\"><next><block type=\"scratch_move_steps\"><field name=\"STEPS\">25</field></block></next></block></xml>",
            "blocks": [
                {"id": "flag1", "type": "scratch_when_flag_clicked", "fields": {}},
                {"id": "move1", "type": "scratch_move_steps", "fields": {"STEPS": 25}, "parentId": "flag1"},
            ],
        },
    }

    # 1. Xuất file .sb3
    export_res = client.post(
        "/api/scratch/projects/export-sb3",
        json=project_payload,
        headers=headers,
    )
    assert export_res.status_code == 200
    assert export_res.headers["content-type"] == "application/x.scratch.sb3"
    sb3_content = export_res.content
    assert len(sb3_content) > 0

    # Kiểm tra tính toàn vẹn của file zip .sb3
    with zipfile.ZipFile(io.BytesIO(sb3_content)) as zf:
        names = zf.namelist()
        assert "project.json" in names
        assert any(n.endswith(".svg") for n in names)

        raw_pj = zf.read("project.json").decode("utf-8")
        pj = json.loads(raw_pj)
        assert pj["meta"]["semver"] == "3.0.0"
        assert len(pj["targets"]) >= 2
        # Target Sprite1
        sprite_target = next(t for t in pj["targets"] if not t["isStage"])
        assert sprite_target["x"] == 12
        assert sprite_target["y"] == 34
        assert "flag1" in sprite_target["blocks"]

    # 2. Nhập lại file .sb3 vừa xuất
    files = {"file": ("Mèo_Chạy_Nhảy.sb3", sb3_content, "application/x.scratch.sb3")}
    import_res = client.post(
        "/api/scratch/projects/import-sb3?save_to_account=true",
        files=files,
        headers=headers,
    )
    assert import_res.status_code == 200
    data = import_res.json()
    assert data["success"] is True
    assert data["saved_project_id"] is not None
    assert data["project"]["sprite"]["x"] == 12
    assert "scratch_when_flag_clicked" in data["project"]["blocklyXml"]


def test_import_external_mit_scratch_3():
    """Kiểm tra khả năng phân tích gói .sb3 gốc của MIT Scratch 3.0 (không có iqkids metadata)."""
    # Xây dựng mock project.json chuẩn MIT Scratch 3.0
    mit_project_json = {
        "targets": [
            {
                "isStage": True,
                "name": "Stage",
                "blocks": {},
            },
            {
                "isStage": False,
                "name": "Sprite1",
                "x": -50,
                "y": 75,
                "size": 90,
                "direction": 180,
                "visible": True,
                "blocks": {
                    "top1": {
                        "opcode": "event_whenflagclicked",
                        "next": "step1",
                        "parent": None,
                        "inputs": {},
                        "fields": {},
                        "topLevel": True,
                        "x": 100,
                        "y": 100,
                    },
                    "step1": {
                        "opcode": "motion_movesteps",
                        "next": None,
                        "parent": "top1",
                        "inputs": {"STEPS": [1, [4, "50"]]},
                        "fields": {},
                        "topLevel": False,
                    },
                },
            },
        ],
        "meta": {"semver": "3.0.0"},
    }

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("project.json", json.dumps(mit_project_json))

    parsed = import_sb3_bytes(buf.getvalue(), filename="mit_cat.sb3")
    assert parsed["sprite"]["x"] == -50
    assert parsed["sprite"]["y"] == 75
    assert parsed["sprite"]["direction"] == 180
    assert "scratch_when_flag_clicked" in parsed["blocklyXml"]
    assert "scratch_move_steps" in parsed["blocklyXml"]
    assert "<field name=\"STEPS\">50</field>" in parsed["blocklyXml"]

import pytest


def test_register_and_login_success(client):
    # Đăng ký
    res = client.post("/api/auth/register", json={
        "username": "auth_user_1",
        "password": "mypassword123",
        "name": "Bé Thử Nghiệm",
        "role": "student",
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["username"] == "auth_user_1"

    # Đăng nhập
    login_res = client.post("/api/auth/login", json={
        "username": "auth_user_1",
        "password": "mypassword123",
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()


def test_rate_limiting_brute_force(client):
    # Đăng ký tài khoản
    client.post("/api/auth/register", json={
        "username": "brute_target",
        "password": "correct_pass",
        "name": "Nạn nhân brute force",
        "role": "student",
    })

    # Nhập sai mật khẩu liên tiếp 5 lần
    for _ in range(5):
        res = client.post("/api/auth/login", json={
            "username": "brute_target",
            "password": "wrong_password",
        })
        assert res.status_code in (401, 429)

    # Lần thứ 6 phải bị chặn bởi mã lỗi 429
    res_blocked = client.post("/api/auth/login", json={
        "username": "brute_target",
        "password": "wrong_password",
    })
    assert res_blocked.status_code == 429
    assert "quá nhiều lần" in res_blocked.json()["detail"].lower()


def test_refresh_token_flow(client):
    reg = client.post("/api/auth/register", json={
        "username": "refresh_user",
        "password": "password123",
        "name": "Người dùng Refresh",
        "role": "student",
    })
    refresh_tok = reg.json()["refresh_token"]

    res = client.post("/api/auth/refresh", json={"refresh_token": refresh_tok})
    assert res.status_code == 200
    assert "access_token" in res.json()
    assert res.json()["token_type"] == "bearer"


def test_reset_password_with_pin(client):
    client.post("/api/auth/register", json={
        "username": "forgot_user",
        "password": "old_password",
        "name": "Bé Quên Mật Khẩu",
        "role": "student",
    })

    # Sai PIN
    res_wrong_pin = client.post("/api/auth/reset-password", json={
        "username": "forgot_user",
        "parent_pin": "999999",  # Sai PIN
        "new_password": "new_password123",
    })
    assert res_wrong_pin.status_code == 400

    # Đúng PIN mặc định 1234
    res_ok = client.post("/api/auth/reset-password", json={
        "username": "forgot_user",
        "parent_pin": "1234",
        "new_password": "new_password123",
    })
    assert res_ok.status_code == 200

    # Đăng nhập với mật khẩu mới
    res_login = client.post("/api/auth/login", json={
        "username": "forgot_user",
        "password": "new_password123",
    })
    assert res_login.status_code == 200


def test_rbac_permissions(client, student_auth, teacher_auth, admin_auth):
    # Học sinh gọi endpoint của Admin -> 403 Forbidden
    res_student = client.get("/api/admin/review/queue", headers=student_auth["headers"])
    assert res_student.status_code == 403

    # Giáo viên gọi endpoint review -> 200 OK
    res_teacher = client.get("/api/admin/review/queue", headers=teacher_auth["headers"])
    assert res_teacher.status_code == 200

    # Học sinh gọi reset custom games -> 403
    res_student_reset = client.post("/api/admin/games/reset", headers=student_auth["headers"])
    assert res_student_reset.status_code == 403

    # Admin gọi reset custom games -> 200
    res_admin_reset = client.post("/api/admin/games/reset", headers=admin_auth["headers"])
    assert res_admin_reset.status_code == 200

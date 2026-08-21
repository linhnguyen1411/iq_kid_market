# [BE-14] Đấu Trường 1v1 Đối Kháng Thời Gian Thực (WebSocket Real-time PvP Rooms)

> **Mô tả nghiệp vụ**: Xây dựng máy chủ **WebSocket Real-time** hỗ trợ tính năng Đấu Trường Trí Tuệ Đối Kháng 1v1 giữa 2 học sinh. Bao gồm: Hệ thống ghép cặp tự động (Matchmaking Queue theo khối lớp và trình độ Elo), phòng thi đấu đối kháng (Battle Room) hiển thị thanh tiến độ giải đố của đối thủ theo thời gian thực (Real-time Progress Bar), và tính điểm xếp hạng Elo Rating sau mỗi trận đấu.

---

## 📌 1. THÔNG TIN TASK
- **Mã Task**: `BE-14`
- **Mảng phụ trách**: Backend (FastAPI WebSockets + Asyncio + In-Memory Room Manager + Elo Rating Engine)
- **Độ ưu tiên**: 🟡 P2 (Tính năng tương tác cao / Điểm nhấn Gamification)
- **Người thực hiện**: Backend Developer
- **Trạng thái**: ⚪ Ready (Sẵn sàng triển khai)
- **Branch làm việc**: `feature/be-14-realtime-pvp`

---

## 📖 2. ĐIỂM LƯU Ý VỀ CÔNG NGHỆ & THUẬT NGỮ CẦN NẮM

1. **FastAPI WebSocket Connections (`WebSocketEndpoint`)**:
   - Quản lý kết nối 2 chiều liên tục giữa Client và Server: `ws://localhost:8000/ws/pvp?token=<jwt_token>`.
2. **Matchmaking Queue & In-Memory Room State**:
   - Khi học sinh bấm "Tìm Trận", đưa vào hàng đợi `_MATCHMAKING_QUEUE[grade]`.
   - Khi có 2 bạn cùng khối lớp ➔ Khởi tạo `BattleRoom` (chứa 3 câu hỏi ngẫu nhiên cùng loại), sinh `room_id`, gửi thông báo `MATCH_FOUND` cho cả 2 client.
3. **Real-time Event Synchronization**:
   - Khi Người chơi A trả lời đúng câu 1 ➔ Server broadcast sự kiện `OPPONENT_PROGRESS` cho Người chơi B để cập nhật thanh tiến độ đối thủ.
   - Khi có người giải xong trước hoặc hết thời gian 60s ➔ Server tính toán kết quả `MATCH_END` (Thắng / Hòa / Thua) và cộng trừ điểm Elo.
4. **Elo Rating System (Hệ số K-Factor)**:
   - Tính toán điểm Elo: Thắng người điểm cao được cộng nhiều, thua người điểm thấp bị trừ nhiều.

---

## 🎯 3. CHI TIẾT TÍNH NĂNG CẦN PHÁT TRIỂN (FEATURE SCOPE)

1. **Module `backend/app/websocket/pvp_manager.py`**:
   - Quản lý danh sách kết nối hoạt động (`active_connections`).
   - Hàng đợi tìm trận (`matchmaking_pool`).
   - Quản lý vòng đời phòng đấu (`BattleRoom`: questions, scores, timer, status).
2. **WebSocket Endpoint (`/ws/pvp`)**:
   - Xác thực người dùng qua JWT Token.
   - Nhận các sự kiện từ client: `FIND_MATCH`, `CANCEL_FIND`, `SUBMIT_ANSWER`, `LEAVE_ROOM`.
   - Gửi các sự kiện tới client: `WAITING_OPPONENT`, `MATCH_FOUND`, `ROUND_START`, `OPPONENT_UPDATE`, `MATCH_RESULT`.
3. **Cập nhật Bảng `users`**:
   - Thêm cột `elo_rating` (Mặc định 1000 điểm), `pvp_wins`, `pvp_losses`.
4. **API Bảng Xếp Hạng Đấu Trường (`GET /api/pvp/leaderboard`)**:
   - Top những cao thủ đấu trường trí tuệ có điểm Elo cao nhất.

---

## 📋 4. DANH SÁCH CÔNG VIỆC CHI TIẾT (CHECKLIST)

- [ ] **1. Thêm trường Elo vào `models.py` & Sinh Migration `0007_add_elo_pvp.py`**.
- [ ] **2. Xây dựng Module WebSocket `backend/app/websocket/`**:
  - [ ] `connection_manager.py`
  - [ ] `pvp_room.py`
  - [ ] `elo_calculator.py`
- [ ] **3. Đăng ký WebSocket route vào `backend/app/main.py`**:
  - [ ] `@app.websocket("/ws/pvp")`
- [ ] **4. Thêm API REST hỗ trợ `backend/app/routers/pvp.py`**:
  - [ ] `GET /api/pvp/leaderboard`
  - [ ] `GET /api/pvp/history`
- [ ] **5. Viết Test WebSocket với Pytest `backend/tests/test_pvp_ws.py`**.

---

## 🧪 5. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)

- [ ] 2 tab trình duyệt cùng bấm Tìm Trận ➔ Tự động ghép cặp thành công trong 2 giây.
- [ ] Tab 1 trả lời câu hỏi ➔ Tab 2 thấy ngay thanh tiến độ của Tab 1 tăng lên tức thì.
- [ ] Kết thúc trận đấu ➔ Người thắng được cộng đúng điểm Elo và nhận thưởng Xu.
- [ ] Mất mạng hoặc đóng tab ➔ Đối thủ tự động được xử thắng do đối phương rời trận.

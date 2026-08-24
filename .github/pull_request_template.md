## Nội dung
- [Mô tả tóm tắt tính năng / fix bug / refactor]

## Đã test
- [ ] tsc --noEmit / build pass
- [ ] Toàn bộ test suite hiện có vẫn pass (không chỉ test mới)
- [ ] Test qua API thật (curl/Postman), không chỉ unit test
- [ ] (nếu có migration) đã chạy `alembic upgrade head` thật trên Postgres

## Review độc lập (Lớp 2)
- [ ] Đã chạy qua 1 session AI khác đóng vai reviewer độc lập
- [ ] Các lỗi tìm được: [dán tóm tắt hoặc link]

## Rủi ro đã biết / chưa xử lý
- [ ] Liệt kê rõ, không giấu. VD: "chưa có auth check ở endpoint X, theo pattern cũ của repo"

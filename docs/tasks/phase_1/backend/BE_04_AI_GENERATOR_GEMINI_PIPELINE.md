# [BE-04] Pipeline Sinh Nội Dung Trò Chơi Tự Động Bằng Google Gemini AI (AI Content Pipeline)

> **Mô tả nghiệp vụ**: Nâng cấp toàn diện bộ tạo nội dung học tập thông minh sử dụng **Google Gemini SDK** (`google-genai`). Đảm bảo kết quả sinh ra luôn là JSON hợp lệ theo đúng cấu trúc của 10 Game Engines, có cơ chế tự động sửa lỗi, Fallback mượt mà khi không có API Key, và tính năng sinh câu hỏi đơn lẻ (Single Question Generator) hỗ trợ giáo viên soạn bài.

---

## 📌 1. THÔNG TIN TASK
- **Mã Task**: `BE-04`
- **Mảng phụ trách**: Backend (FastAPI + Google Gemini API + Pydantic)
- **Độ ưu tiên**: 🟠 P1 (Quan trọng / Nổi bật)
- **Người thực hiện**: Antigravity Assistant
- **Trạng thái**: 🟢 Done (Đã hoàn thành 100%)
- **Branch làm việc**: `feature/be-04-ai-gemini`

---

## 📖 2. ĐIỂM LƯU Ý VỀ CÔNG NGHỆ & THUẬT NGỮ CẦN NẮM

1. **Google GenAI SDK (`google-genai`)**:
   - Thư viện chính thức của Google để gọi các model Gemini thế hệ mới (`gemini-2.0-flash`, `gemini-1.5-flash`).
   - Cài đặt trong `requirements.txt`: `google-genai==0.3.0`.
2. **Structured JSON Output**:
   - Ép model trả về duy nhất chuỗi JSON hợp lệ thông qua tham số `config=types.GenerateContentConfig(response_mime_type="application/json")`.
   - Tránh việc model trả về lời chào rườm rà hoặc markdown tag ````json ... ```` làm vỡ logic `json.loads()`.
3. **Graceful Fallback Mechanism**:
   - Khi chưa cài đặt `GEMINI_API_KEY` trong `.env` hoặc khi API của Google bị lỗi mạng / hết quota ➔ Hệ thống tự động chuyển sang `generate_fallback_game()` để sinh giáo án chuẩn sư phạm dựng sẵn mà không bao giờ báo lỗi crash app cho người dùng.
4. **Prompt Engineering cho Trẻ Em (EdTech Pedagogical Prompts)**:
   - Câu từ phải trong sáng, kích thích tư duy, không bạo lực, phù hợp lứa tuổi từ Lớp 1 đến Lớp 9.

---

## 🎯 3. CHI TIẾT TÍNH NĂNG CẦN PHÁT TRIỂN (FEATURE SCOPE)

1. **Hoàn thiện System Prompt cho 10 loại Game Engine (`backend/app/ai_content.py`)**:
   - `quiz`, `matching`, `sequence`, `memory`, `language`, `observation`, `sorting`, `flashcard`, `scratch`, `coding`.
   - Mỗi thể loại có ví dụ rõ ràng (Few-shot prompting) để AI sinh ra dữ liệu `data` chính xác 100%.
2. **API Sinh Trò Chơi Trọn Gói 3 Màn (`POST /api/admin/games/ai-generate`)**:
   - Nhận đầu vào: `topic` (Chủ đề, VD: "Hệ mặt trời", "Bảng cửu chương 7"), `template_code`, `grade_from`, `grade_to`, `category`.
   - Sinh ra trò chơi hoàn chỉnh gồm 3 màn chơi (Màn 1: Cơ bản, Màn 2: Nâng cao, Màn 3: Thử thách).
3. **API Mới: Sinh 1 Câu Hỏi / Màn Chơi Đơn Lẻ (`POST /api/admin/ai/generate-question`)**:
   - Phục vụ cho Giáo viên đang soạn giáo án muốn AI gợi ý nhanh 1 câu hỏi bổ sung vào game hiện có.
4. **Cơ Chế Retry & Tự Sửa Lỗi JSON**:
   - Nếu `json.loads()` gặp lỗi (do chuỗi cụt), tự động thử lại 1 lần với temperature thấp hơn (0.2).

---

## 📋 4. DANH SÁCH CÔNG VIỆC CHI TIẾT (CHECKLIST)

- [x] **1. Tối ưu Module `backend/app/ai_content.py`**:
  - [x] Nâng cấp prompt theo chuẩn Gemini mới nhất.
  - [x] Thêm hàm `generate_single_question_with_gemini(topic, template_code, grade)`.
  - [x] Bổ sung cơ chế làm sạch chuỗi JSON (xóa markdown block nếu có).
  - [x] Thêm bộ lọc an toàn nội dung cho học sinh `is_content_safe_for_kids`.
- [x] **2. Thêm Endpoint vào `backend/app/routers/admin.py`**:
  - [x] `POST /api/admin/ai/generate-question`.
  - [x] Nâng cấp `POST /api/admin/games/ai-generate`.
- [x] **3. Cập nhật `backend/app/schemas.py`**:
  - [x] Bổ sung schema `AiGenerateQuestionIn`.
- [x] **4. Viết Test & Kiểm thử thực tế**:
  - [x] Viết `backend/test_be04_ai.py` bao phủ 100% các kịch bản và test thành công.

---

## 💡 5. HƯỚNG DẪN CODE MẪU THAM KHẢO

### Chuẩn hóa gọi Gemini với Structured JSON & Fallback:

```python
import os
import json
import re
from google import genai
from google.genai import types

def clean_json_string(raw_text: str) -> str:
    """Xóa bỏ các ký tự bọc markdown nếu model vô tình trả về."""
    cleaned = raw_text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    return cleaned.strip()

def generate_game_with_gemini(topic: str, template_code: str, grade_from: int, grade_to: int, category: str) -> dict:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("Chưa cấu hình GEMINI_API_KEY!")

    client = genai.Client(api_key=api_key)
    prompt = build_gemini_prompt(topic, template_code, grade_from, grade_to, category)

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash", # Hoặc gemini-1.5-flash
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.7,
            ),
        )
        cleaned_text = clean_json_string(response.text or "{}")
        game_data = json.loads(cleaned_text)
        return game_data
    except Exception as e:
        # Nếu lỗi mạng hoặc quota, log lại và ném lỗi rõ ràng để router bắt
        raise RuntimeError(f"Lỗi khi tương tác với Gemini API: {e}") from e
```

---

## 🚫 6. QUY TẮC GIT & TẠO PULL REQUEST (BẮT BUỘC)

1. **Khởi tạo branch**:
   ```bash
   git checkout main && git pull origin main
   git checkout -b feature/be-04-ai-generator
   ```
2. **Tuyệt đối KHÔNG commit trực tiếp vào `main`**.
3. **Commit message chuẩn**:
   ```bash
   git commit -m "backend: hoàn thiện pipeline sinh game AI bằng Gemini và fallback an toàn"
   ```
4. **Quy trình gửi PR**: Push branch lên remote và mở PR trỏ vào `main`.

---

## 🧪 7. TIÊU CHÍ NGHIỆM THU & BƯỚC TEST KỸ TRƯỚC KHI TẠO PR

- [ ] **1. Test Trường hợp Không có API Key (Fallback Mode)**:
  - Để trống `GEMINI_API_KEY=""` trong `backend/.env`.
  - Gửi request `POST /api/admin/games/ai-generate` với topic `"Các hành tinh trong hệ mặt trời"`, template `"matching"`.
  - Kiểm tra API trả về game mẫu 3 màn chơi hoàn chỉnh, có thông báo cảnh báo thân thiện, không bị crash 500.
- [ ] **2. Test Trường hợp Có API Key Thật (Real Gemini Mode)**:
  - Điền `GEMINI_API_KEY` hợp lệ vào `.env`.
  - Gửi request sinh game với các chủ đề: Toán học (`sequence`), Từ vựng tiếng Anh (`flashcard`), Động vật (`memory`).
  - Kiểm tra kết quả trả về đúng chuẩn JSON, các câu hỏi và đáp án logic, chơi được ngay lập tức trên Frontend.
- [ ] **3. Test Tốc độ phản hồi**:
  - Thời gian sinh game trung bình dưới 5-8 giây.

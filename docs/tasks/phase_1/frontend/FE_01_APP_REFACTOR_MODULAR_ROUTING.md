# [FE-01] Tái Cấu Trúc App.tsx (3100+ Dòng) Thành Pages, Layouts & State Store (Modular Refactor)

> **Mô tả nghiệp vụ**: Tách file nguyên khối (Monolithic) `src/App.tsx` (hiện chứa hơn 3.165 dòng code, 171KB) thành kiến trúc module hóa chuyên nghiệp theo tiêu chuẩn React 19 / TypeScript. Tách biệt các Trang (`pages/`), Bố cục giao diện (`layouts/`), Ngữ cảnh toàn cục (`context/`) và Lớp giao tiếp API (`services/api.ts`).

---

## 📌 1. THÔNG TIN TASK
- **Mã Task**: `FE-01`
- **Mảng phụ trách**: Frontend (React 19 + TypeScript + Vite + Tailwind CSS v4)
- **Độ ưu tiên**: 🔴 P0 (Bắt buộc / Nền tảng cho toàn bộ các Task Frontend khác)
- **Người thực hiện**: Antigravity Assistant
- **Trạng thái**: 🟢 Done (Đã hoàn thành 100%)
- **Branch làm việc**: `feature/fe-01-app-refactor`

---

## 📖 2. ĐIỂM LƯU Ý VỀ CÔNG NGHỆ & THUẬT NGỮ CẦN NẮM

1. **Modular Architecture (Kiến Trúc Module Hóa)**:
   - Thay vì dồn toàn bộ state, API call và JSX của 8 màn hình vào 1 file, ta chia dự án thành các thư mục chức năng rõ ràng:
     - `src/pages/`: Mỗi tab giao diện là một Page Component riêng.
     - `src/layouts/`: Header, Navigation Bar, Footer.
     - `src/context/`: Quản lý Auth State, Token, Ví và Cài đặt âm thanh toàn cục.
     - `src/services/api.ts`: Gom toàn bộ các hàm `fetch('/api/...')` vào 1 nơi tập trung.
2. **React 19 Context API**:
   - Sử dụng `createContext`, `useContext` để truyền dữ liệu `currentUser`, `token`, `walletBalance` xuống các component con mà không bị hiện tượng "Prop Drilling" (truyền props qua quá nhiều tầng trung gian).
3. **Vite API Proxy**:
   - Mọi hàm gọi API trong frontend chỉ cần gọi `fetch('/api/...')` tương đối, Vite dev server sẽ tự động chuyển tiếp sang backend FastAPI (`http://localhost:8000`), không cần hardcode domain URL.
4. **Nguyên tắc "No Regression" (Không Làm Hỏng Tính Năng Cũ)**:
   - Quá trình tái cấu trúc code chỉ thay đổi cách tổ chức tệp tin, **tuyệt đối giữ nguyên** 100% giao diện, logic tính điểm, và trải nghiệm người dùng hiện có.

---

## 🎯 3. CHI TIẾT TÍNH NĂNG CẦN PHÁT TRIỂN (FEATURE SCOPE)

1. **Tạo Cấu Trúc Thư Mục Mới trong `src/`**:
   ```
   src/
   ├── context/
   │   └── AuthContext.tsx        # Quản lý user, token, login, logout, refresh session
   ├── services/
   │   └── api.ts                 # Toàn bộ hàm gọi API (Auth, Games, Wallet, Scratch, Admin)
   ├── layouts/
   │   ├── Header.tsx             # Header kèm Logo, Avatar 3D, Badge Level, Ví xu, Menu
   │   ├── NavigationTabs.tsx     # Bộ nút chuyển Tab (Trang chủ, Chợ game, Scratch, Bảng vàng...)
   │   └── Footer.tsx             # Footer thông tin dự án
   ├── pages/
   │   ├── LandingPage.tsx        # Trang chủ giới thiệu
   │   ├── MarketplacePage.tsx    # Chợ game & Chi tiết game
   │   ├── ScratchPage.tsx        # Khóa học Scratch & Làm bài Scratch
   │   ├── LeaderboardPage.tsx    # Bảng xếp hạng & Thành tích
   │   ├── ProfilePage.tsx        # Trang cá nhân & Đổi mật khẩu
   │   ├── WalletPage.tsx         # Trang ví xu & Lịch sử giao dịch
   │   ├── AdminPage.tsx          # Studio sáng tạo & Hàng đợi kiểm duyệt
   │   ├── TechArchPage.tsx       # Sơ đồ kiến trúc kỹ thuật
   │   └── GamePlayPage.tsx       # Màn chơi game (chứa QuestionRenderer)
   └── App.tsx                    # File chính ngắn gọn (~150 dòng)
   ```
2. **Xây dựng `src/services/api.ts`**:
   - Hàm helper `apiRequest(endpoint, options)` tự động lấy Token từ `localStorage` đính kèm vào Header `Authorization: Bearer <token>`.
   - Bắt lỗi mạng thân thiện (Network Error Handler).
3. **Tách `App.tsx`**:
   - Rút ngắn `App.tsx` chỉ còn giữ nhiệm vụ bao bọc `AuthProvider`, render `Header`, `NavigationTabs` và hiển thị Page tương ứng theo `activeTab`.

---

## 📋 4. DANH SÁCH CÔNG VIỆC CHI TIẾT (CHECKLIST)

- [x] **1. Tạo `src/context/AuthContext.tsx`**:
  - [x] State: `user`, `token`, `wallet`, `purchases`, `loadingSession`, `isAuthModalOpen`, `authModalMode`.
  - [x] Functions: `login()`, `logout()`, `register()`, `refreshSession()`, `switchUser()`, `updateUserWallet()`, `updateUserStats()`.
- [x] **2. Tạo `src/services/api.ts`**:
  - [x] Gom toàn bộ các hàm gọi API: `auth`, `session`, `games`, `attempts`, `scores`, `wallet`, `scratch`, `admin`.
- [x] **3. Cắt các khối JSX từ `App.tsx` vào các Page tương ứng**:
  - [x] Tách `LandingPage.tsx`
  - [x] Tách `MarketplacePage.tsx`
  - [x] Tách `GamePlayPage.tsx`
  - [x] Tách `ScratchPage.tsx`
  - [x] Tách `LeaderboardPage.tsx`
  - [x] Tách `ProfilePage.tsx`
  - [x] Tách `WalletPage.tsx`
  - [x] Tách `AdminPage.tsx`
  - [x] Tách `TechArchPage.tsx`
- [x] **4. Tách các component Header & Navigation vào `src/layouts/`**:
  - [x] `Header.tsx`, `NavigationTabs.tsx`, `Footer.tsx`.
- [x] **5. Tái cấu trúc lại `App.tsx` ngắn gọn (~140 dòng), sạch đẹp**.
- [x] **6. Chạy `npx tsc --noEmit` & `npm run build` kiểm tra 0 lỗi TypeScript**.

---

## 💡 5. HƯỚNG DẪN CODE MẪU THAM KHẢO

### Cấu trúc `src/services/api.ts`:

```typescript
const BASE_URL = '/api';

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('iqkids_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Đã có lỗi xảy ra!' }));
    throw new Error(errorData.detail || `Lỗi HTTP ${response.status}`);
  }

  return response.json();
}

// Các hàm API cụ thể
export const api = {
  getGames: (params?: Record<string, any>) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest<any[]>(`/games${query ? `?${query}` : ''}`);
  },
  purchaseGame: (userId: string, gameId: string) => 
    apiRequest<any>('/games/purchase', { method: 'POST', body: JSON.stringify({ userId, gameId }) }),
  submitAttempt: (data: any) => 
    apiRequest<any>('/attempts/submit', { method: 'POST', body: JSON.stringify(data) }),
};
```

### Cấu trúc mới của `src/App.tsx`:

```tsx
import { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import Header from './layouts/Header';
import LandingPage from './pages/LandingPage';
import MarketplacePage from './pages/MarketplacePage';
import ScratchPage from './pages/ScratchPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';
import WalletPage from './pages/WalletPage';
import AdminPage from './pages/AdminPage';
import TechArchPage from './pages/TechArchPage';
import AuthModal from './components/AuthModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'landing' | 'marketplace' | 'scratch' | 'leaderboard' | 'profile' | 'wallet' | 'admin' | 'tech_arch'>('landing');

  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <Header activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
          {activeTab === 'landing' && <LandingPage onExplore={() => setActiveTab('marketplace')} />}
          {activeTab === 'marketplace' && <MarketplacePage />}
          {activeTab === 'scratch' && <ScratchPage />}
          {activeTab === 'leaderboard' && <LeaderboardPage />}
          {activeTab === 'profile' && <ProfilePage />}
          {activeTab === 'wallet' && <WalletPage />}
          {activeTab === 'admin' && <AdminPage />}
          {activeTab === 'tech_arch' && <TechArchPage />}
        </main>

        <AuthModal />
      </div>
    </AuthProvider>
  );
}
```

---

## 🚫 6. QUY TẮC GIT & TẠO PULL REQUEST (BẮT BUỘC)

1. **Khởi tạo branch**:
   ```bash
   git checkout main && git pull origin main
   git checkout -b feature/fe-01-app-refactor
   ```
2. **Tuyệt đối KHÔNG commit trực tiếp vào `main`**.
3. **Commit message chuẩn**:
   ```bash
   git commit -m "frontend: tái cấu trúc App.tsx thành Pages, Layouts và AuthContext"
   ```
4. **Quy trình gửi PR**: Push branch lên remote và mở PR trỏ vào `main`.

---

## 🧪 7. TIÊU CHÍ NGHIỆM THU & BƯỚC TEST KỸ TRƯỚC KHI TẠO PR

- [ ] **1. Kiểm tra biên dịch TypeScript**:
  - Chạy: `npm run lint` (`tsc --noEmit`).
  - Kết quả: Không có bất kỳ cảnh báo hoặc lỗi type nào.
- [ ] **2. Kiểm tra đóng gói Build**:
  - Chạy: `npm run build`.
  - Kết quả: Thư mục `dist/` được tạo thành công, kích thước bundle tối ưu.
- [ ] **3. Kiểm tra trải nghiệm thực tế trên trình duyệt**:
  - Bấm chuyển qua lại giữa tất cả các Tab: Trang chủ ➔ Chợ game ➔ Scratch ➔ Bảng xếp hạng ➔ Ví xu ➔ Admin ➔ Sơ đồ kỹ thuật.
  - Thử mở 1 game bất kỳ để chơi thử và nộp điểm ➔ Trải nghiệm mượt mà, không giật lag, không lỗi trắng trang.

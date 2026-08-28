import { useState } from "react";
import { Database, Link2, Server, Terminal, Copy, Check, Info } from "lucide-react";

export default function TechArchBoard() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopyText = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const erdSchema = `Table users {
  id integer [primary key]
  username varchar(50) [unique]
  email varchar(100) [unique]
  hashed_password varchar(255)
  role varchar(20) # student, teacher, creator, admin
  created_at timestamp
}

Table wallets {
  id integer [primary key]
  user_id integer [ref: > users.id]
  balance integer
  currency varchar(10)
}

Table wallet_transactions {
  id integer [primary key]
  wallet_id integer [ref: > wallets.id]
  amount integer
  transaction_type varchar(50)
  description varchar(255)
  created_at timestamp
}

Table games {
  id varchar(50) [primary key]
  title varchar(200)
  description text
  thumbnail varchar(255)
  price integer
  grade_from integer
  grade_to integer
  template_code varchar(50) # matching, sequence, memory
  plays_count integer
  rating_avg float
}

Table game_levels {
  id varchar(50) [primary key]
  game_id varchar(50) [ref: > games.id]
  level_num integer
  title varchar(200)
  xp_reward integer
}

Table game_questions {
  id varchar(50) [primary key]
  level_id varchar(50) [ref: > game_levels.id]
  question_type varchar(50)
  prompt text
  data_json text
  points integer
}

Table game_attempts {
  id integer [primary key]
  user_id integer [ref: > users.id]
  game_id varchar(50) [ref: > games.id]
  level_reached integer
  score integer
  completed boolean
  date timestamp
}`;

  const apiPaths = `[AUTHENTICATION]
POST /api/session               - Lấy thông tin phiên đăng nhập giả lập hiện hữu.
POST /api/user/profile          - Cập nhật hồ sơ (độ tuổi, avatar, tên hiển thị).

[MARKETPLACE STORE]
GET  /api/games                 - Danh sách game (hỗ trợ lọc theo Lớp, Danh mục, Từ khoá, Free/Premium).
POST /api/games/purchase        - Gửi lệnh mua sắm game (Khấu trừ ví, ghi giao dịch và cấp bản quyền).

[WALLET LEDGER]
POST /api/wallet/topup          - Giả lập nạp tiền vào tài khoản thông qua QR / Thẻ nạp.

[GAME ENGINES GATEWAY]
POST /api/attempts/submit       - Đồng bộ tiến độ màn chơi: cộng XP, nâng Level, kết nạp bảng vàng highscores.
GET  /api/scores/leaderboard    - Lấy danh sách xếp hạng top 10 (Toàn diện hoặc cụ thể cho mỗi game).

[SCRATCH COMPUTATIONAL MODULE]
GET  /api/scratch/courses       - Danh sách bài học lập trình kéo thả.

[ADMIN / CREATOR CONTROL CMS]
POST /api/admin/games           - Tiến hành đăng bản quyền game giáo dục mới vào cơ sở dữ liệu Engine.
GET  /api/admin/stats           - Tổng hợp doanh thu, số lượt chơi, transaction logs của toàn sàn.`;

  const dockerInstruction = `# Tạo thư mục dự án và sao chép cấu hình docker-compose.yml
# Khởi động toàn bộ cụm dịch vụ (FastAPI backend, PostgreSQL, Redis, MinIO)
docker-compose up --build -d

# Xem trạng thái hoạt động các container
docker ps

# Kiểm tra log nếu gặp lỗi kết nối
docker-compose logs -f`;

  return (
    <div className="bg-slate-900 rounded-3xl p-6 text-slate-100 max-w-5xl mx-auto shadow-2xl border-4 border-slate-800">
      
      {/* Title section */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
        <Server className="w-8 h-8 text-kids-blue" />
        <div>
          <h2 className="font-display text-xl md:text-2xl">Bản Thiết Kế Kiến Trúc Hệ Thống (Tech Design Board)</h2>
          <p className="text-slate-400 text-xs md:text-sm">Chi tiết thông số Database ERD, Danh sách API REST và Hướng dẫn triển khai Docker hóa MVP.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Box Left: ERD Schema diagram */}
        <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800/60 relative">
          <div className="flex justify-between items-center mb-3">
            <span className="flex items-center gap-1.5 text-xs font-mono text-kids-yellow font-bold uppercase">
              <Database className="w-3.5 h-3.5" /> Quan hệ Thực thể (ERD Definition)
            </span>
            <button
              id="copy_erd"
              onClick={() => handleCopyText(erdSchema, "erd")}
              className="px-2 py-1 bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-xxs flex items-center gap-1 transition-all"
            >
              {copiedSection === "erd" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copiedSection === "erd" ? "Đã Sao Chép" : "Sao chép"}
            </button>
          </div>
          <pre className="font-mono text-3xs text-slate-300 overflow-x-auto max-h-[350px] leading-relaxed p-2 bg-slate-950 rounded-lg no-scrollbar">
            {erdSchema}
          </pre>
        </div>

        {/* Box Right: API Endpoint Catalog & Docker */}
        <div className="flex flex-col gap-6">
          
          <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800/60 relative">
            <div className="flex justify-between items-center mb-3">
              <span className="flex items-center gap-1.5 text-xs font-mono text-kids-blue font-bold uppercase">
                <Link2 className="w-3.5 h-3.5" /> RESTful Routing Catalog
              </span>
              <button
                id="copy_api"
                onClick={() => handleCopyText(apiPaths, "api")}
                className="px-2 py-1 bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-xxs flex items-center gap-1 transition-all"
              >
                {copiedSection === "api" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedSection === "api" ? "Đã Sao Chép" : "Sao chép"}
              </button>
            </div>
            <pre className="font-mono text-3xs text-slate-300 overflow-x-auto max-h-[220px] leading-relaxed p-2 bg-slate-950 rounded-lg no-scrollbar">
              {apiPaths}
            </pre>
          </div>

          <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800/60 relative">
            <div className="flex justify-between items-center mb-3">
              <span className="flex items-center gap-1.5 text-xs font-mono text-kids-pink font-bold uppercase">
                <Terminal className="w-3.5 h-3.5" /> Triển Khai Thực Tế qua Docker Compose
              </span>
              <button
                id="copy_docker"
                onClick={() => handleCopyText(dockerInstruction, "docker")}
                className="px-2 py-1 bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-xxs flex items-center gap-1 transition-all"
              >
                {copiedSection === "docker" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedSection === "docker" ? "Đã Sao Chép" : "Sao chép"}
              </button>
            </div>
            <pre className="font-mono text-3xs text-slate-300 overflow-x-auto leading-relaxed p-2 bg-slate-950 rounded-lg no-scrollbar">
              {dockerInstruction}
            </pre>
          </div>

        </div>

      </div>

      <div className="mt-5 bg-slate-850 p-4 rounded-xl text-xxs flex items-start gap-2.5 border border-slate-800 text-slate-300 leading-relaxed">
        <Info className="w-5 h-5 text-kids-blue shrink-0 mt-0.5" />
        <div>
          <strong>Tư Duy Kiến Trúc Đa Đối Tượng:</strong> Nền tảng IQ KIDS MARKET được chia tách hoàn chỉnh thành các phân lớp logic: 
          Trình điều khiển trò chơi (Smart Puzzle Renderer) không gắn chặt với mã nguồn. Thay vào đó, nó hoạt động như cấu trúc rỗng 
          đọc cấu hình từ trường <code>data_json</code> trong bảng <code>game_questions</code>. Khi cần tạo 100 game toán hay tiếng Anh mới, 
          Chỉ cần biên soạn cơ sở dữ liệu trên trang Admin mà không cần sửa code. Mô hình này giúp dự án dễ dàng scale-out lên hàng triệu người chơi.
        </div>
      </div>

    </div>
  );
}

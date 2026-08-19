import React, { useState, useEffect, useRef } from "react";
import { 
  Brain, BookOpen, Sparkles, TrendingUp, Coins, LogOut, User, 
  Search, Filter, Lock, Settings, Compass, Trophy, Gamepad2, 
  CreditCard, ArrowRight, ChevronRight, PlusCircle, CheckCircle2, 
  UserCheck, BarChart2, DollarSign, Award, Eye, Code, ThumbsUp, RefreshCw,
  LogIn, UserPlus, KeyRound, ChevronDown, ShieldCheck, GraduationCap, Heart
} from "lucide-react";
import QuestionRenderer from "./components/QuestionRenderer";
import ScratchSimulator from "./components/ScratchSimulator";
import TechArchBoard from "./components/TechArchBoard";
import { AuthModal, AuthSuccessPayload } from "./components/AuthModal";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function App() {
  // Session / Auth States
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem("iqkids_auth_token"));
  const [currentUserId, setCurrentUserId] = useState<string>(() => localStorage.getItem("iqkids_current_user_id") || "u1");
  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Navigations & Tabs
  const [activeTab, setActiveTab] = useState<"landing" | "marketplace" | "leaderboard" | "profile" | "wallet" | "scratch" | "admin" | "tech_arch">("landing");

  // Marketplace states
  const [games, setGames] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedGameDetail, setSelectedGameDetail] = useState<any>(null);

  // Active playing level states
  const [activePlayGame, setActivePlayGame] = useState<any>(null);
  const [activePlayLevel, setActivePlayLevel] = useState<any>(null);
  const [activePlayQuestionIdx, setActivePlayQuestionIdx] = useState<number>(0);

  // Wallet mockup states
  const [topupAmount, setTopupAmount] = useState<number>(50000);
  const [showQRModal, setShowQRModal] = useState<boolean>(false);
  const [walletMessage, setWalletMessage] = useState<string>("");

  // Leaderboard lists
  const [leaderboardList, setLeaderboardList] = useState<any[]>([]);
  const [leaderboardFilter, setLeaderboardFilter] = useState<string>("all");

  // Scratch Courses states
  const [scratchCourses, setScratchCourses] = useState<any[]>([]);
  const [selectedScratchLesson, setSelectedScratchLesson] = useState<any>(null);

  // Admin CRUD / Stats state
  const [adminStats, setAdminStats] = useState<any>(null);
  const [newGameTitle, setNewGameTitle] = useState("");
  const [newGameDesc, setNewGameDesc] = useState("");
  const [newGamePrice, setNewGamePrice] = useState("20000");
  const [newGameCategory, setNewGameCategory] = useState("math");
  const [newGameTemplate, setNewGameTemplate] = useState("matching");
  const [newGameGradeMin, setNewGameGradeMin] = useState("1");
  const [newGameGradeMax, setNewGameGradeMax] = useState("3");
   const [adminMessage, setAdminMessage] = useState("");
 
   // First level builder states inside manual Create Game form
   const [addFirstLevel, setAddFirstLevel] = useState(false);
   const [firstLvlPrompt, setFirstLvlPrompt] = useState("");
   const [firstMatchingPairs, setFirstMatchingPairs] = useState([
     { left: "Apple 🍎", right: "Màu Đỏ" },
     { left: "Banana 🍌", right: "Màu Vàng" },
     { left: "Frog 🐸", right: "Màu Xanh" }
   ]);
   const [firstSeqString, setFirstSeqString] = useState("2, 4, 8, ?");
   const [firstSeqAnswer, setFirstSeqAnswer] = useState("16");
   const [firstSeqOptions, setFirstSeqOptions] = useState("16, 12, 18, 10");
   const [firstSeqExplanation, setFirstSeqExplanation] = useState("Cấp số nhân đôi liên tiếp!");
   const [firstMemEmojis, setFirstMemEmojis] = useState("🍎, 🍌, 🍇, 🍊");
   const [firstScratchStartScene, setFirstScratchStartScene] = useState('{"cat_pos":[0,0],"star_pos":[3,0]}');
   const [firstScratchSequence, setFirstScratchSequence] = useState("move_forward,move_forward,move_forward");
   const [firstScratchExplanation, setFirstScratchExplanation] = useState("Di chuyển 3 khối tiến lên để chạm tới Ngôi sao!");
 
   // Professional Level Creator & Upload Tool States
  const [designGameId, setDesignGameId] = useState("");
  const [designLvlNum, setDesignLvlNum] = useState("");
  const [designLvlTitle, setDesignLvlTitle] = useState("");
  const [designLvlXp, setDesignLvlXp] = useState("100");
  const [designLvlCoin, setDesignLvlCoin] = useState("20");
  const [designPrompt, setDesignPrompt] = useState("");
  const [designMatchingPairs, setDesignMatchingPairs] = useState([
    { left: "", right: "" },
    { left: "", right: "" },
    { left: "", right: "" },
    { left: "", right: "" }
  ]);
  const [designSeqString, setDesignSeqString] = useState("2, 4, 8, ?");
  const [designSeqAnswer, setDesignSeqAnswer] = useState("16");
  const [designSeqExplanation, setDesignSeqExplanation] = useState("Cấp số nhân đôi mốc liên tiếp");
  const [designSeqOptions, setDesignSeqOptions] = useState("16, 12, 18, 10");
  const [designMemTheme, setDesignMemTheme] = useState("trai_cay");
  const [designMemEmojis, setDesignMemEmojis] = useState("🍎, 🍌, watermelon, strawberry, pinapple");
  const [designScratchStartScene, setDesignScratchStartScene] = useState('{"cat_pos":[0,0],"star_pos":[3,0]}');
  const [designScratchSequence, setDesignScratchSequence] = useState("move_forward,move_forward,move_forward");
  const [uploadJsonString, setUploadJsonString] = useState("");
  const [creatorTab, setCreatorTab] = useState<"level" | "package" | "ai" | "my_games" | "create" | "review">("my_games");
  const [reviewQueue, setReviewQueue] = useState<any[]>([]);
  const [reviewFeedbackText, setReviewFeedbackText] = useState<Record<string, string>>({});
  const [creatorGamesList, setCreatorGamesList] = useState<any[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // AI Gemini Game Builder state
  const [aiTopic, setAiTopic] = useState("Khám phá các hành tinh trong Hệ Mặt Trời 🪐");
  const [aiTemplate, setAiTemplate] = useState("quiz");
  const [aiGradeFrom, setAiGradeFrom] = useState("1");
  const [aiGradeTo, setAiGradeTo] = useState("5");
  const [aiCategory, setAiCategory] = useState("science");
  const [aiPrice, setAiPrice] = useState("10000");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiWarnBanner, setAiWarnBanner] = useState("");

  // Profile manager form
  const [editProfileName, setEditProfileName] = useState("");
  const [editProfileAvatar, setEditProfileAvatar] = useState("");
  const [editProfileGrade, setEditProfileGrade] = useState("");
  const [profileSuccessMsg, setProfileSuccessMsg] = useState("");

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load Session Information
  const loadSession = async (overrideUserId?: string, overrideToken?: string) => {
    try {
      const activeUid = overrideUserId || currentUserId;
      const activeTok = overrideToken !== undefined ? overrideToken : authToken;

      const headers: Record<string, string> = {};
      if (activeTok) {
        headers["Authorization"] = `Bearer ${activeTok}`;
      }

      // Gọi endpoint /api/auth/me nếu có token, hoặc /api/session?userId=...
      const url = activeTok ? `/api/auth/me?userId=${activeUid}` : `/api/session?userId=${activeUid}`;
      const r = await fetch(url, { headers });
      if (r.ok) {
        const data = await r.json();
        setSession(data);
        if (data.user) {
          setCurrentUserId(data.user.id);
          localStorage.setItem("iqkids_current_user_id", data.user.id);
          setEditProfileName(data.user.name);
          setEditProfileAvatar(data.user.avatar);
          setEditProfileGrade(String(data.user.grade || 1));
        }
      }
    } catch (e) {
      console.error("Error loading session", e);
    } finally {
      setLoadingSession(false);
    }
  };

  // Callback khi Đăng nhập / Đăng ký thành công từ AuthModal
  const handleAuthSuccess = (data: AuthSuccessPayload) => {
    if (data.access_token) {
      localStorage.setItem("iqkids_auth_token", data.access_token);
      setAuthToken(data.access_token);
    }
    if (data.user) {
      setCurrentUserId(data.user.id);
      localStorage.setItem("iqkids_current_user_id", data.user.id);
      setSession(data);
      setEditProfileName(data.user.name);
      setEditProfileAvatar(data.user.avatar);
      setEditProfileGrade(String(data.user.grade || 1));

      // Điều hướng thông minh theo role
      if (data.user.role === "teacher" || data.user.role === "creator") {
        setActiveTab("admin");
      } else if (data.user.role === "parent") {
        setActiveTab("marketplace");
      } else {
        setActiveTab("landing");
      }
    }
  };

  // Đăng xuất
  const handleLogout = () => {
    localStorage.removeItem("iqkids_auth_token");
    localStorage.removeItem("iqkids_current_user_id");
    setAuthToken(null);
    setCurrentUserId("u1");
    setIsProfileDropdownOpen(false);
    loadSession("u1", "");
    setActiveTab("landing");
  };

  // Load Creator Games
  const loadCreatorGames = async () => {
    try {
      const r = await fetch(`/api/games?creatorId=${currentUserId}&includePending=true`);
      const data = await r.json();
      setCreatorGamesList(data || []);
    } catch (e) {
      console.error("Error loading creator games list", e);
    }
  };

  // Load Games Catalog
  const loadGames = async () => {
    try {
      const q = new URLSearchParams();
      if (selectedCategory !== "all") q.set("category", selectedCategory);
      if (selectedGrade !== "all") q.set("grade", selectedGrade);
      if (selectedType !== "all") q.set("type", selectedType);
      if (searchTerm) q.set("search", searchTerm);

      const r = await fetch(`/api/games?${q.toString()}`);
      const data = await r.json();
      setGames(data);
      await loadCreatorGames();
    } catch (e) {
      console.error("Error loading games list", e);
    }
  };

  // Load global highscores
  const loadHighscores = async () => {
    try {
      const r = await fetch(`/api/scores/leaderboard?gameId=${leaderboardFilter}`);
      const data = await r.json();
      setLeaderboardList(data);
    } catch (e) {
      console.error("Error loading leaderboards", e);
    }
  };

  // Load Scratch courses
  const loadScratchData = async () => {
    try {
      const r = await fetch("/api/scratch/courses");
      const data = await r.json();
      setScratchCourses(data);
    } catch (e) {
      console.error("Error loading scratch data", e);
    }
  };

  // Load Admin metrics
  const loadAdminMetrics = async () => {
    try {
      const r = await fetch("/api/admin/stats");
      const data = await r.json();
      setAdminStats(data);
    } catch (e) {
      console.error("Error loading metrics", e);
    }
  };

  // Load Admin review queue
  const loadReviewQueue = async () => {
    try {
      const r = await fetch("/api/admin/review/queue");
      const data = await r.json();
      setReviewQueue(data || []);
    } catch (e) {
      console.error("Error loading review queue", e);
    }
  };

  // Submit audit review results
  const triggerReviewDecide = async (gameId: string, action: "approve" | "reject") => {
    const feedback = reviewFeedbackText[gameId] || "";
    try {
      const r = await fetch("/api/admin/review/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, action, feedback })
      });
      const data = await r.json();
      if (data.success) {
        setAdminMessage(`Đã ${action === "approve" ? "phê duyệt" : "từ chối"} game thành công! 🎉`);
        setReviewFeedbackText(prev => ({ ...prev, [gameId]: "" }));
        await loadGames();
        await loadReviewQueue();
        await loadAdminMetrics();
        setTimeout(() => setAdminMessage(""), 4000);
      } else {
        setAdminMessage("🚨 Lỗi xử lý duyệt: " + data.error);
      }
    } catch (e) {
      setAdminMessage("🚨 Lỗi kiểm duyệt kết nối hệ thống.");
    }
  };

  // Initial Boot loader
  useEffect(() => {
    loadSession();
    loadCreatorGames();
  }, [currentUserId]);

  useEffect(() => {
    loadGames();
  }, [selectedCategory, selectedGrade, selectedType, searchTerm]);

  useEffect(() => {
    loadHighscores();
  }, [leaderboardFilter, activeTab]);

  useEffect(() => {
    if (activeTab === "scratch") loadScratchData();
    if (activeTab === "admin") {
      loadAdminMetrics();
      loadReviewQueue();
    }
  }, [activeTab]);

  // Handle Purchasing game catalogs
  const triggerBuyGame = async (gameId: string) => {
    try {
      const r = await fetch("/api/games/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, gameId })
      });
      const data = await r.json();
      if (data.error) {
        alert(data.error);
      } else {
        // success! Update state and detail view
        await loadSession();
        await loadGames();
        // Update selection reference safely
        if (selectedGameDetail && selectedGameDetail.id === gameId) {
          setSelectedGameDetail({ ...selectedGameDetail, isBought: true });
        }
        alert("Chúc mừng con! Giao dịch thành công, mở khóa bài học mới! 🎉");
      }
    } catch (e) {
      alert("Nạp tiền hoặc mua game gặp trục trặc, vui lòng thử lại!");
    }
  };

  // Wallet deposit
  const triggerTopupWallet = async () => {
    try {
      const r = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, amount: topupAmount, method: "QR Code chuyển khoản" })
      });
      const data = await r.json();
      if (data.success) {
        setWalletMessage(`Nạp thành công ${topupAmount.toLocaleString()}đ vào Ví Sao Xu!`);
        setShowQRModal(false);
        await loadSession();
        // Clear message shortly
        setTimeout(() => setWalletMessage(""), 4000);
      }
    } catch (e) {
      alert("Chuyển khoản bị ngắt kết nối.");
    }
  };

  // Profile form submission
  const triggerUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const r = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          name: editProfileName,
          avatar: editProfileAvatar,
          grade: Number(editProfileGrade)
        })
      });
      const data = await r.json();
      if (data.success) {
        setProfileSuccessMsg("Đã cập nhật hồ sơ bé thành công! ✨");
        await loadSession();
        setTimeout(() => setProfileSuccessMsg(""), 3000);
      }
    } catch (e) {
      alert("Lỗi cập nhật.");
    }
  };

  // Admin New Game Submission
  const triggerCreateNewGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGameTitle || !newGameDesc) {
      setAdminMessage("Vui lòng nhập tên và mô tả trò chơi!");
      return;
    }

    let customFirstLevel: any = null;
    if (addFirstLevel) {
      let questionData: any = {};
      const actualPrompt = firstLvlPrompt.trim() || (newGameTemplate === "matching" ? "Bé hãy ghép các cặp tương thích dưới đây:" : "Bé hãy giải mã thử thách sau:");
      
      if (newGameTemplate === "matching") {
        const validPairs = firstMatchingPairs.filter(p => p.left && p.right);
        if (validPairs.length === 0) {
          setAdminMessage("🚨 Cần điền ít nhất 1 cặp để tạo câu hỏi ghép cặp đầu tiên!");
          return;
        }
        questionData = { pairs: validPairs };
      } else if (newGameTemplate === "sequence") {
        questionData = {
          sequence: firstSeqString.split(",").map(x => x.trim()),
          options: firstSeqOptions.split(",").map(x => x.trim()),
          answer: firstSeqAnswer.trim(),
          explanation: firstSeqExplanation
        };
      } else if (newGameTemplate === "memory") {
        const items = firstMemEmojis.split(",").map(x => x.trim()).filter(Boolean);
        if (items.length === 0) {
          setAdminMessage("🚨 Vui lòng điền tối thiểu 1 biểu tượng nhớ lật bài!");
          return;
        }
        questionData = {
          theme: "trai_cay", 
          items: items
        };
      } else if (newGameTemplate === "scratch") {
        questionData = {
          cat_pos: [0, 0],
          star_pos: [3, 0],
          start_scene_json: firstScratchStartScene,
          target_block_sequence: firstScratchSequence,
          explanation: firstScratchExplanation
        };
      }

      customFirstLevel = {
        level_num: 1,
        title: `Màn chơi 1: Nhập Môn Trí Tuệ`,
        xp_reward: 100,
        coin_reward: 20,
        questions: [
          {
            id: `custom_q_${Date.now()}_first`,
            question_type: newGameTemplate,
            prompt: actualPrompt,
            points: 50,
            data: questionData
          }
        ]
      };
    }

    try {
      const r = await fetch("/api/admin/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newGameTitle,
          description: newGameDesc,
          detailed_description: newGameDesc,
          price: Number(newGamePrice),
          grade_from: Number(newGameGradeMin),
          grade_to: Number(newGameGradeMax),
          template_code: newGameTemplate,
          category: newGameCategory,
          creatorId: currentUserId,
          customFirstLevel
        })
      });
      const data = await r.json();
      if (data.success) {
        setAdminMessage(`Đăng thành công game "${newGameTitle}"!`);
        setNewGameTitle("");
        setNewGameDesc("");
        setAddFirstLevel(false);
        setFirstLvlPrompt("");
        await loadGames();
        await loadAdminMetrics();
        setTimeout(() => setAdminMessage(""), 4000);
      }
    } catch (e) {
      setAdminMessage("Có lỗi khi kết nối tạo game.");
    }
  };

  // Custom Level / Question Builder submission
  const triggerCreateCustomLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!designGameId || !designLvlTitle || !designPrompt) {
      setAdminMessage("🚨 Vui lòng điền đủ mã game, tiêu đề màn chơi và yêu cầu câu đố!");
      return;
    }

    // Lookup game template
    const selectedGame = creatorGamesList.find(g => g.id === designGameId) || games.find(g => g.id === designGameId);
    const templateCode = selectedGame ? selectedGame.template_code : "matching";

    let questionData: any = {};
    if (templateCode === "matching") {
      const validPairs = designMatchingPairs.filter(p => p.left && p.right);
      if (validPairs.length < 2) {
        setAdminMessage("🚨 Vui lòng nhập tối thiểu 2 cặp ghép đối xứng!");
        return;
      }
      questionData = { pairs: validPairs };
    } else if (templateCode === "sequence") {
      const seqArray = designSeqString.split(",").map(s => s.trim());
      const optArray = designSeqOptions.split(",").map(o => o.trim());
      questionData = {
        sequence: seqArray,
        answer: designSeqAnswer.trim(),
        explanation: designSeqExplanation,
        options: optArray
      };
    } else if (templateCode === "memory") {
      const items = designMemEmojis.split(",").map(e => e.trim());
      questionData = {
        theme: designMemTheme,
        items: items
      };
    } else if (templateCode === "scratch") {
      questionData = {
        start_scene_json: designScratchStartScene,
        target_block_sequence: designScratchSequence
      };
    }

    try {
      const r = await fetch("/api/admin/levels/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: designGameId,
          level_num: Number(designLvlNum) || undefined,
          title: designLvlTitle,
          xp_reward: Number(designLvlXp),
          coin_reward: Number(designLvlCoin),
          creatorId: currentUserId,
          question: {
            question_type: templateCode,
            prompt: designPrompt,
            points: 25,
            data: questionData
          }
        })
      });
      const data = await r.json();
      if (data.success) {
        setAdminMessage(`✨ Thiết kế thành công màn số ${data.newLevel.level_num}: "${designLvlTitle}" vào game!`);
        setDesignLvlTitle("");
        setDesignPrompt("");
        await loadGames();
        await loadAdminMetrics();
        setTimeout(() => setAdminMessage(""), 4000);
      } else {
        setAdminMessage("🚨 Lỗi: " + data.error);
      }
    } catch (err) {
      setAdminMessage("🚨 Lỗi kết nối thiết kế màn chơi custom.");
    }
  };

  // AI Gemini Automatic Game Pack Builder Trigger
  const triggerGenerateAIGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTopic.trim()) {
      setAdminMessage("🚨 Vui lòng điền chủ đề bài học mầm non/học đường cho AI thiết kế!");
      return;
    }
    setAiGenerating(true);
    setAiWarnBanner("");
    setAdminMessage("🤖 Trợ lý AI Gemini đang thụ lý ý tưởng, xây dựng nội dung sư phạm và đóng gói trò chơi... Quá trình có thể mất từ 3-8 giây, bé hãy đợi xíu nhé!");

    try {
      const response = await fetch("/api/admin/games/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: aiTopic,
          template_code: aiTemplate,
          grade_from: aiGradeFrom,
          grade_to: aiGradeTo,
          category: aiCategory,
          price: Number(aiPrice),
          creatorId: currentUserId
        })
      });
      const data = await response.json();
      if (data.success) {
        setAdminMessage(`🎉 Trợ lý AI đã xuất bản thành công trò chơi: "${data.game.title}" mang phong cách '${aiTemplate}'!`);
        if (data.warning) {
          setAiWarnBanner(data.warning);
        }
        await loadGames();
        await loadAdminMetrics();
      } else {
        setAdminMessage("🚨 Lỗi AI: " + (data.error || "Không thể tự động khởi tạo cấu trúc game."));
      }
    } catch (err) {
      setAdminMessage("🚨 Lỗi kết nối hệ thống AI EdTech.");
    } finally {
      setAiGenerating(false);
    }
  };

  // Prepackaged JSON upload/unpack tool
  const triggerUploadGameJson = async (customJsonObj?: any) => {
    let finalObj = customJsonObj;
    if (!finalObj) {
      if (!uploadJsonString.trim()) {
        setAdminMessage("🚨 Vui lòng dán chuỗi JSON đóng gói!");
        return;
      }
      try {
        finalObj = JSON.parse(uploadJsonString);
      } catch (err) {
        setAdminMessage("🚨 Định dạng JSON dán vào không hợp lệ!");
        return;
      }
    }

    try {
      const r = await fetch("/api/admin/games/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameObject: finalObj })
      });
      const data = await r.json();
      if (data.success) {
        setAdminMessage(`🎉 Nhập khẩu thành công! Đã đóng gói & đồng bộ ${data.count} trò chơi mới vào Kids Space.`);
        setUploadJsonString("");
        await loadGames();
        await loadAdminMetrics();
        setTimeout(() => setAdminMessage(""), 4000);
      } else {
        setAdminMessage("🚨 Lỗi nhập khẩu: " + data.error);
      }
    } catch (err) {
      setAdminMessage("🚨 Lỗi kết nối gửi đóng gói trò chơi.");
    }
  };

  // Wipe custom creations button
  const triggerClearDatabase = async () => {
    if (!window.confirm("Bé có chắc chắn muốn làm sạch toàn bộ trò chơi custom & cấp độ tự thiết kế để quay về mặc định ban đầu không?")) {
      return;
    }
    try {
      const r = await fetch("/api/admin/games/reset", {
        method: "POST"
      });
      const data = await r.json();
      if (data.success) {
        setAdminMessage("🧹 Đã phục hồi dữ liệu ban đầu gốc hoàn mĩ!");
        await loadGames();
        await loadAdminMetrics();
        setTimeout(() => setAdminMessage(""), 4000);
      }
    } catch (err) {
      setAdminMessage("🚨 Không dọn sạch được dữ liệu.");
    }
  };

  // Handle solving questions success
  const handleGameLevelSuccess = async (score: number) => {
    try {
      const r = await fetch("/api/attempts/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          gameId: activePlayGame.id,
          levelNum: activePlayLevel.level_num,
          score: score,
          completed: true,
          duration: 35
        })
      });
      const data = await r.json();
      if (data.success) {
        // Alert dynamic levels
        let congratText = `Con đã hoàn thành Màn ${activePlayLevel.level_num} và nhận thêm ${data.xpAwarded} XP!`;
        if (data.levelUp) congratText += `\n🌟 TUYỆT VỜI! Con đã thăng lên Cấp độ ${data.newLevel}! Lớp học thông thái rộng mở!`;
        alert(congratText);

        await loadSession();
        // Go back to details or next levels
        setActivePlayLevel(null);
        setActivePlayGame(null);
      }
    } catch (e) {
      console.error("Failed to commit score", e);
      setActivePlayLevel(null);
    }
  };

  // Fetch Scratch Lesson completion
  const handleScratchLessonComplete = async (xpValue: number) => {
    try {
      const r = await fetch("/api/attempts/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          gameId: "scratch_module",
          levelNum: selectedScratchLesson.lesson_num,
          score: 100,
          completed: true,
          duration: 60
        })
      });
      await r.json();
      await loadSession();
      alert(`Bài lập trình số ${selectedScratchLesson.lesson_num} đã thông qua hoàn mĩ! +${xpValue} XP đã cộng dồn.`);
      setSelectedScratchLesson(null);
    } catch (e) {
      console.error(e);
      setSelectedScratchLesson(null);
    }
  };

  // Quick helper to categorize avatars
  const avatarToEmoji = (avatar: string) => {
    if (avatar === "smile_tiger") return "🐯";
    if (avatar === "cool_fox") return "🦊";
    if (avatar === "logic_owl") return "🦉";
    if (avatar === "tech_cat") return "🐱";
    return "👶";
  };

  // Quick helper for category styles
  const categoryToVietnamese = (cat: string) => {
    if (cat === "math") return "Toán học ➕";
    if (cat === "vietnamese") return "Tiếng Việt 🇻🇳";
    if (cat === "iq") return "Tư duy IQ 🧠";
    if (cat === "scratch") return "Lập trình Scratch 🤖";
    return "Tổng hợp ⭐️";
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none antialiased">
      
      {/* 0. AUTH MODAL COMPONENT */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        initialMode={authModalMode}
      />

      {/* 1. TOP GEOMETRIC BALANCE NAVIGATION */}
      <nav id="navbar" className="bg-white border-b-2 border-slate-100 sticky top-0 z-50 px-4 sm:px-6 py-2.5 shadow-xs backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
          
          {/* Logo brand */}
          <div 
            id="brand_home"
            onClick={() => { setActiveTab("landing"); setSelectedGameDetail(null); }}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-extrabold text-lg shadow-md transition-transform group-hover:scale-105">
              IQ
            </div>
            <div>
              <span className="font-display text-base md:text-lg font-black text-indigo-950 tracking-tight leading-none uppercase">IQ KIDS</span>
              <span className="font-display text-[9px] block tracking-widest text-purple-600 font-extrabold uppercase leading-none mt-0.5">EDTECH MARKET</span>
            </div>
          </div>

          {/* Quick role switch & Techboard trigger (CTO feature) */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="goto_tech_arch"
              onClick={() => setActiveTab("tech_arch")}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1 transition-all ${
                activeTab === "tech_arch" 
                ? "bg-slate-900 text-kids-yellow" 
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Code className="w-3.5 h-3.5" /> Kiến trúc
            </button>

            {/* Role quick selector label */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-100 rounded-xl px-2 py-1 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase px-1">Đổi vai:</span>
              <select
                id="role_switch_select"
                value={currentUserId}
                onChange={(e) => {
                  const uid = e.target.value;
                  setCurrentUserId(uid);
                  localStorage.setItem("iqkids_current_user_id", uid);
                  loadSession(uid, "");
                  setSelectedGameDetail(null);
                }}
                className="bg-transparent text-xs font-bold font-sans text-slate-700 outline-none cursor-pointer pr-1"
              >
                <option value="u1">🐯 Bé Bình (Học sinh Lớp 2)</option>
                <option value="u2">👩‍🏫 Cô Lan (Creator / Teacher)</option>
                <option value="u3">👨‍💼 Bố Dũng (Phụ huynh)</option>
              </select>
            </div>
          </div>

          {/* Wallet, Stats & Auth Section */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            
            {/* 1. Nút Đăng nhập / Đăng ký: CHỈ HIỂN THỊ KHI CHƯA ĐĂNG NHẬP */}
            {!authToken ? (
              <div className="flex items-center gap-1.5 animate-fade-in">
                <button
                  type="button"
                  onClick={() => { setAuthModalMode('login'); setIsAuthModalOpen(true); }}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 border border-slate-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <LogIn className="w-3.5 h-3.5" /> Đăng Nhập
                </button>

                <button
                  type="button"
                  onClick={() => { setAuthModalMode('register'); setIsAuthModalOpen(true); }}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Đăng Ký ✨
                </button>
              </div>
            ) : (
              /* 2. KHI ĐÃ ĐĂNG NHẬP: Hiển thị Profile, Ví, XP, Menu Dropdown (KHÔNG CÒN NÚT ĐĂNG NHẬP/ĐĂNG KÝ) */
              !loadingSession && session && (
                <div className="flex items-center gap-2 sm:gap-3 animate-fade-in">
                  
                  {/* XP Pill */}
                  {session.user.role === 'student' && (
                    <div className="hidden md:flex items-center gap-1.5 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full shadow-xs">
                      <span className="text-orange-600 font-extrabold text-xs">⚡ {session.user.xp.toLocaleString()}</span>
                      <span className="text-[10px] font-bold text-orange-400">XP</span>
                    </div>
                  )}

                  {/* Balance Pill */}
                  <div 
                    id="header_wallet_btn"
                    onClick={() => setActiveTab("wallet")}
                    className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full cursor-pointer hover:bg-emerald-100 transition-colors shadow-xs"
                  >
                    <Coins className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-extrabold text-xs">{session.wallet.balance.toLocaleString()}đ</span>
                  </div>

                  {/* Avatar Indicator & Profile Dropdown */}
                  <div className="relative" ref={profileDropdownRef}>
                    <div 
                      id="header_profile_btn"
                      onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                      className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1 pl-1.5 rounded-full border border-slate-200 transition-all shadow-xs"
                    >
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-xl border border-indigo-200 shadow-xs">
                          {avatarToEmoji(session.user.avatar)}
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-purple-600 text-white font-mono font-extrabold text-[9px] w-4 h-4 rounded-full flex items-center justify-center border border-white shadow-xs">
                          {session.user.level}
                        </div>
                      </div>
                      <div className="hidden lg:block text-left pr-1">
                        <span className="font-display font-bold text-slate-800 text-xs block leading-tight truncate max-w-[100px]">{session.user.name}</span>
                        <span className="text-[9px] block font-semibold text-slate-400">
                          {session.user.grade ? `Lớp ${session.user.grade}` : categoryToVietnamese(session.user.role)}
                        </span>
                      </div>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>

                    {/* Profile Dropdown Menu */}
                    {isProfileDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-fade-in text-left">
                        <div className="p-2.5 border-b border-slate-100 bg-slate-50 rounded-xl mb-1">
                          <div className="font-bold text-xs text-slate-800">{session.user.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">@{session.user.username}</div>
                          <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-md">
                            {session.user.grade ? `🎒 Học sinh Lớp ${session.user.grade}` : (session.user.role === 'teacher' ? '👩‍🏫 Giáo viên / Creator' : '👨‍💼 Phụ huynh')}
                          </div>
                        </div>

                        <button
                          onClick={() => { setActiveTab("profile"); setIsProfileDropdownOpen(false); }}
                          className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-xl flex items-center gap-2 transition-colors text-left cursor-pointer"
                        >
                          <User className="w-4 h-4 text-slate-400" /> Hồ sơ cá nhân & Danh hiệu
                        </button>

                        <button
                          onClick={() => { setActiveTab("wallet"); setIsProfileDropdownOpen(false); }}
                          className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 rounded-xl flex items-center gap-2 transition-colors text-left cursor-pointer"
                        >
                          <CreditCard className="w-4 h-4 text-slate-400" /> Quản lý Ví ({session.wallet.balance.toLocaleString()}đ)
                        </button>

                        {(session.user.role === 'teacher' || session.user.role === 'creator' || session.user.role === 'admin') && (
                          <button
                            onClick={() => { setActiveTab("admin"); setIsProfileDropdownOpen(false); }}
                            className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-purple-50 hover:text-purple-600 rounded-xl flex items-center gap-2 transition-colors text-left cursor-pointer"
                          >
                            <BookOpen className="w-4 h-4 text-purple-400" /> Studio Sáng Tạo Game
                          </button>
                        )}

                        <div className="border-t border-slate-100 my-1" />

                        <button
                          onClick={handleLogout}
                          className="w-full px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2 transition-colors text-left cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 text-rose-400" /> Đăng xuất
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              )
            )}

          </div>

        </div>
      </nav>

      {/* 2. CORE SUB-MENU ROUTINGS THÍCH ỨNG THEO ROLE */}
      <div className="bg-white/90 border-b border-slate-100 px-4 py-2 text-center overflow-x-auto no-scrollbar shadow-2xs">
        <div className="max-w-4xl mx-auto flex items-center justify-center sm:justify-between gap-1">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            
            {/* Tab Trang Chủ */}
            <button
              id="tab_home_btn"
              onClick={() => { setActiveTab("landing"); setSelectedGameDetail(null); }}
              className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-display font-black transition-all ${
                activeTab === "landing" ? "bg-kids-blue text-white kids-btn-shadow-blue" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              🗺️ Bản Đồ IQ
            </button>

            {/* Tab Chợ Game */}
            <button
              id="tab_market_btn"
              onClick={() => { setActiveTab("marketplace"); setSelectedGameDetail(null); }}
              className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-display font-black transition-all ${
                activeTab === "marketplace" ? "bg-kids-pink text-white kids-btn-shadow-pink" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              🛍️ Chợ Game
            </button>

            {/* Tab Học Scratch STEM */}
            <button
              id="tab_scratch_btn"
              onClick={() => { setActiveTab("scratch"); setSelectedGameDetail(null); }}
              className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-display font-black transition-all ${
                activeTab === "scratch" ? "bg-kids-purple text-white kids-btn-shadow-purple" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              🤖 Học Scratch (STEM)
            </button>

            {/* Tab Bảng Vàng */}
            <button
              id="tab_leaderboard_btn"
              onClick={() => { setActiveTab("leaderboard"); setSelectedGameDetail(null); }}
              className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-display font-black transition-all ${
                activeTab === "leaderboard" ? "bg-kids-yellow text-slate-800 kids-btn-shadow-yellow" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              🏆 Bảng Vàng
            </button>
          </div>

          {/* Nút Studio Sáng Tạo / CMS cho Creator hoặc Admin */}
          <div className="flex gap-1">
            <button
              id="tab_creator_btn"
              onClick={() => { setActiveTab("admin"); setSelectedGameDetail(null); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-display font-bold transition-all border flex items-center gap-1.5 ${
                activeTab === "admin" 
                ? "bg-slate-900 text-white border-transparent shadow-xs" 
                : "text-slate-700 bg-slate-50 hover:bg-slate-100 border-slate-200"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Studio Sáng Tạo</span>
            </button>
          </div>
        </div>
      </div>

      {walletMessage && (
        <div className="bg-emerald-500 text-white text-center py-2 px-4 text-xs font-bold animate-pulse">
          🎉 {walletMessage}
        </div>
      )}

      {/* 3. MAIN WEB WORKSPACE STAGE */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 pb-20">

        {/* =========================================================
            A. LANDING / DISCOVER TAB RENDERER
            ========================================================= */}
        {activeTab === "landing" && !selectedGameDetail && (
          <div className="flex flex-col gap-10">
            
            {/* Playful Banner Slider */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-[2.5rem] p-6 md:p-10 flex flex-col md:flex-row items-center gap-6 shadow-xl relative overflow-hidden">
              <div className="flex-1 text-center md:text-left z-2">
                <span className="inline-block bg-white/20 backdrop-blur-md text-white font-display text-xs font-bold px-4.5 py-1.5 rounded-full mb-3 tracking-wide shadow-sm">
                  MINI GAME ĐẠT ĐIỂM CAO 💥
                </span>
                <h1 className="font-display text-2xl md:text-4xl text-white font-black tracking-tight leading-tight mb-2 uppercase">
                  Chinh phục Thử Thách <br/> Nhận Vương Miện Trí Tuệ!
                </h1>
                <p className="text-white/80 text-xs md:text-sm max-w-md mb-6 font-medium leading-relaxed">
                  Marketplace thông minh tập hợp 90+ màn chơi từ lớp 1 đến lớp 3 môn Toán, Tiếng Việt, Tiếng Anh và Scratch kéo thả diệu kỳ.
                </p>
                <button
                  id="cta_landing_discover"
                  onClick={() => setActiveTab("marketplace")}
                  className="px-8 py-3.5 bg-white text-indigo-600 hover:bg-slate-50 font-display font-black text-sm rounded-2xl shadow-xl shadow-indigo-900/10 transition-all transform hover:scale-102 active:scale-95 cursor-pointer"
                >
                  Khám Phá Sàn Game Ngay 🚀
                </button>
              </div>

              {/* Graphical representation for kids visual banner items */}
              <div className="w-56 h-48 md:h-56 shrink-0 relative flex items-center justify-center text-8xl md:text-9xl">
                ⚽
                <div className="absolute top-1 right-2 bg-pink-500 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl shadow animate-bounce">
                  ⚡
                </div>
                <div className="absolute bottom-2 left-1 bg-white/20 backdrop-blur-md text-white rounded-xl px-3 py-1 text-xxs font-bold border border-white/20 transform -rotate-12">
                  Lớp 1-9 🎒
                </div>
              </div>
            </div>

            {/* Games Categories Icons grid selector */}
            <div>
              <h3 className="font-display text-lg md:text-xl text-slate-800 mb-4 font-black">🏛️ DANH MỤC TRÒ CHƠI NỔI BẬT</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { code: "iq", label: "PHÁT TRIỂN IQ COGNITIVE", count: "2 Trò chơi • 40 Màn", color: "from-sky-400 to-blue-500", icon: <Brain className="w-6 h-6" /> },
                  { code: "math", label: "TOÁN HỌC LOGIC STEM", count: "30 MÀN CHƠI", color: "from-amber-400 to-orange-500", icon: <TrendingUp className="w-6 h-6" /> },
                  { code: "scratch", label: "LẬP TRÌNH ROBOT SCRATCH", count: "2 Khóa học • 9 Bài", color: "from-purple-400 to-indigo-500", icon: <Code className="w-6 h-6" /> },
                  { code: "vietnamese", label: "TIẾNG VIỆT & NGOẠI NGỮ", count: "4 loại game", color: "from-emerald-400 to-green-500", icon: <BookOpen className="w-6 h-6" /> },
                ].map((categoryItem) => (
                  <div
                    id={`cat_filter_landing_${categoryItem.code}`}
                    key={categoryItem.code}
                    onClick={() => {
                      setSelectedCategory(categoryItem.code);
                      setActiveTab("marketplace");
                    }}
                    className="bg-white hover:bg-slate-50 rounded-2xl p-4.5 border-3 border-transparent hover:border-slate-150 shadow cursor-pointer transition-all flex flex-col items-center text-center group"
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${categoryItem.color} text-white flex items-center justify-center mb-3 shadow`}>
                      {categoryItem.icon}
                    </div>
                    <span className="font-display text-xs text-slate-700 font-extrabold block group-hover:text-kids-blue transition-all uppercase tracking-wide leading-tight">
                      {categoryItem.label}
                    </span>
                    <span className="text-xxs font-mono text-slate-400 font-bold block mt-1">{categoryItem.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Marketplace top featured row split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Top Free & Premium Games list (8 cols) */}
              <div className="lg:col-span-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-display text-lg md:text-xl text-slate-800 font-black">⭐ THƯ VIỆN GAME KIỂU MÃU</h3>
                  <button
                    id="view_catalog_list"
                    onClick={() => setActiveTab("marketplace")}
                    className="text-xs font-bold text-kids-blue hover:underline flex items-center gap-1"
                  >
                    Xem tất cả ({games.length}) <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {games.slice(0, 4).map((game) => {
                    const isBought = session?.purchases?.includes(game.id) || game.price === 0;
                    
                    return (
                      <div
                        id={`home_game_card_${game.id}`}
                        key={game.id}
                        onClick={() => setSelectedGameDetail(game)}
                        className="bg-white rounded-2xl border-2 border-slate-100 p-4 shadow hover:border-slate-205 cursor-pointer transform hover:-translate-y-1 transition-all flex gap-4 pr-1"
                      >
                        <div className="w-16 h-16 shrink-0 rounded-xl bg-slate-50 flex items-center justify-center text-3xl shadow-sm border border-slate-100">
                          {game.thumbnail}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <span className="text-xxs font-mono font-bold uppercase tracking-wider text-kids-pink block mb-0.5">
                            {categoryToVietnamese(game.category)}
                          </span>
                          <h4 className="font-display text-sm text-slate-800 font-black truncate">{game.title}</h4>
                          <p className="text-xxs font-medium text-slate-500 line-clamp-2 mt-1 mb-2 leading-snug">
                            {game.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xxs font-bold text-slate-400">🔥 Cấp {game.grade_from}-{game.grade_to}</span>
                            <span className="font-bold text-xs">
                              {game.price === 0 ? (
                                <span className="text-emerald-500 font-display">MIỄN PHÍ</span>
                              ) : isBought ? (
                                <span className="text-blue-500 text-xxs bg-blue-50 px-2 py-0.5 rounded-md font-sans font-bold border border-blue-105">ĐÃ CÓ</span>
                              ) : (
                                <span className="text-kids-pink font-mono">{game.price.toLocaleString()}đ</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Highscores preview sidebar (4 cols) */}
              <div className="lg:col-span-4 bg-white rounded-2xl border-2 border-slate-150 p-4.5 shadow-sm text-left">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 mb-3.5">
                  <h4 className="font-display text-sm text-slate-800 font-extrabold flex items-center gap-1.5">
                    <Trophy className="w-4.5 h-4.5 text-yellow-500" /> BẢNG VÀNG TUẦN NÀY
                  </h4>
                  <button
                    id="goto_rankings"
                    onClick={() => setActiveTab("leaderboard")}
                    className="text-xxs font-bold text-kids-blue hover:underline"
                  >
                    Xem tất cả
                  </button>
                </div>

                <div className="flex flex-col gap-2.5">
                  {leaderboardList.slice(0, 5).map((scoreItem, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-5 h-5 font-mono text-xs font-bold rounded-full flex items-center justify-center ${
                          idx === 0 ? "bg-yellow-400 text-slate-900 shadow" :
                          idx === 1 ? "bg-slate-300 text-slate-800" :
                          idx === 2 ? "bg-amber-600 text-white" : "text-slate-400"
                        }`}>
                          {idx + 1}
                        </span>
                        <div className="text-left truncate">
                          <span className="font-display text-xs text-slate-700 font-extrabold block truncate">{scoreItem.username}</span>
                          <span className="text-xxs text-slate-400 font-mono block">Màn {scoreItem.levelNum} | {scoreItem.gameId === 'g1' ? "Ghép cặp" : scoreItem.gameId === 'g2' ? "Quy luật" : "Ghi nhớ"}</span>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-black text-rose-500">{scoreItem.score} đ</span>
                    </div>
                  ))}
                  {leaderboardList.length === 0 && (
                    <div className="text-center py-10 text-slate-400 text-xs font-semibold">
                      Chưa có cao thủ ghi danh!
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* =========================================================
            B. MARKETPLACE EXPLORER TAB
            ========================================================= */}
        {activeTab === "marketplace" && !selectedGameDetail && (
          <div className="flex flex-col gap-6">
            
            {/* Header info bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-left">
              <div>
                <h2 className="font-display text-lg md:text-xl text-slate-800 font-black flex items-center gap-2">
                  <Gamepad2 className="w-6 h-6 text-kids-pink" /> SÀN GAME THÔNG THÁI
                </h2>
                <p className="text-slate-500 text-xs font-medium">Lọc trò chơi dựa trên môn học và lứa tuổi của bé</p>
              </div>

              {/* Dynamic search bar */}
              <div className="relative w-full max-w-xs">
                <Search className="w-4.5 h-4.5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  id="search_game_input"
                  type="text"
                  placeholder="Tìm kiếm trò chơi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-205 focus:border-kids-pink outline-none rounded-xl py-2 pl-9 pr-4 text-xs font-semibold text-slate-800 transition-all font-sans"
                />
              </div>
            </div>

            {/* Layout Filters sidebar + Grid results */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Filters controller block (3 cols) */}
              <div className="lg:col-span-3 bg-white rounded-2xl p-4.5 border border-slate-100 shadow text-left flex flex-col gap-5">
                <div className="flex items-center gap-1 text-slate-800 font-display text-xs font-black pb-2 border-b border-slate-100 uppercase tracking-wide">
                  <Filter className="w-4 h-4" /> BỘ LỌC TÌM KIẾM
                </div>

                {/* Filter 1: Grade buttons */}
                <div>
                  <h4 className="text-xxs font-bold text-slate-400 uppercase tracking-widest mb-2 font-mono">ĐỘ TUỔI / LỚP HỌC</h4>
                  <div className="grid grid-cols-3 gap-1.5">
                    {["all", "1", "2", "3"].map((gradeVal) => (
                      <button
                        id={`filter_grade_${gradeVal}`}
                        key={gradeVal}
                        onClick={() => setSelectedGrade(gradeVal)}
                        className={`py-1.5 rounded-lg text-xxs font-bold font-display border transition-all ${
                          selectedGrade === gradeVal 
                          ? "bg-kids-pink/15 border-kids-pink text-kids-pink" 
                          : "bg-slate-50 border-slate-150 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {gradeVal === "all" ? "TẤT CẢ" : `LỚP ${gradeVal}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter 2: Subject categories */}
                <div>
                  <h4 className="text-xxs font-bold text-slate-400 uppercase tracking-widest mb-2 font-mono">PHÂN PHỐI MÔN HỌC</h4>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { code: "all", label: "Tất cả môn học ⭐️" },
                      { code: "math", label: "Toán học vui nhộn ➕" },
                      { code: "vietnamese", label: "Tiếng Việt diệu kỳ 🇻🇳" },
                      { code: "iq", label: "Phản xạ IQ 🧠" },
                      { code: "scratch", label: "Coding Scratch 🤖" }
                    ].map((subjectItem) => (
                      <button
                        id={`filter_subject_${subjectItem.code}`}
                        key={subjectItem.code}
                        onClick={() => setSelectedCategory(subjectItem.code)}
                        className={`w-full text-left p-2 rounded-xl text-xs font-sans font-bold border transition-all ${
                          selectedCategory === subjectItem.code
                          ? "bg-kids-blue/15 border-kids-blue text-kids-blue"
                          : "bg-slate-50 border-slate-150 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {subjectItem.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter 3: Free / Premium */}
                <div>
                  <h4 className="text-xxs font-bold text-slate-400 uppercase tracking-widest mb-2 font-mono">TRẢ PHÍ / MIỄN PHÍ</h4>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { code: "all", label: "Không giới hạn" },
                      { code: "free", label: "Màn miễn phí 🎁" },
                      { code: "premium", label: "Màn cao cấp 👑" }
                    ].map((costItem) => (
                      <button
                        id={`filter_cost_${costItem.code}`}
                        key={costItem.code}
                        onClick={() => setSelectedType(costItem.code)}
                        className={`w-full text-left p-2 rounded-xl text-xs font-sans font-bold border transition-all ${
                          selectedType === costItem.code
                          ? "bg-purple-150 border-kids-purple text-purple-700 font-semibold"
                          : "bg-slate-50 border-slate-150 text-slate-650 hover:bg-slate-100"
                        }`}
                      >
                        {costItem.label}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Right Marketplace Grid (9 cols) */}
              <div className="lg:col-span-9 flex flex-col gap-4">
                <span className="text-xxs font-mono text-slate-400 font-bold block text-left">
                  TÌM THẤY {games.length} TRÒ CHƠI HOẠT ĐỘNG
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {games.map((game) => {
                    const isBought = session?.purchases?.includes(game.id) || game.price === 0;
                    
                    return (
                      <div
                        id={`market_game_card_${game.id}`}
                        key={game.id}
                        onClick={() => setSelectedGameDetail(game)}
                        className="bg-white rounded-3xl border-3 border-slate-100 hover:border-slate-200 shadow-sm p-4 text-left cursor-pointer transform hover:-translate-y-1 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2 mb-3">
                            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl border border-slate-100">
                              {game.thumbnail}
                            </div>
                            <span className="bg-slate-100 text-slate-600 font-mono text-xxxxs font-bold uppercase tracking-wider px-2 py-1 rounded-lg">
                              LỚP {game.grade_from}-{game.grade_to}
                            </span>
                          </div>

                          <span className="text-xxxxs font-mono font-bold uppercase tracking-wider text-kids-blue block mb-0.5">
                            {categoryToVietnamese(game.category)}
                          </span>
                          <h4 className="font-display text-sm text-slate-800 font-extrabold line-clamp-1 mb-1.5">{game.title}</h4>
                          <p className="text-xxs text-slate-500 font-medium line-clamp-3 leading-snug mb-4">
                            {game.description}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-slate-100/60 flex items-center justify-between">
                          <div className="flex items-center gap-1 text-xxs font-semibold text-slate-400">
                            <span>⭐ {game.rating_avg}</span>
                            <span>•</span>
                            <span>{game.plays_count} lượt chơi</span>
                          </div>
                          <span className="font-display text-xs font-black">
                            {game.price === 0 ? (
                              <span className="text-emerald-500">MIỄN PHÍ</span>
                            ) : isBought ? (
                              <span className="text-blue-500 text-xxs bg-blue-50 px-2 py-0.5 rounded border border-blue-105">ĐÃ CÓ</span>
                            ) : (
                              <span className="text-kids-pink font-mono">{game.price.toLocaleString()}đ</span>
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {games.length === 0 && (
                  <div className="bg-white rounded-2xl p-16 text-center border-2 border-slate-100 font-semibold text-slate-400">
                    📭 Không tìm thấy kết quả phù hợp! Hãy thử đổi từ khoá lọc khác nhé!
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* =========================================================
            C. GAME DETAIL PAGE / GATEWAY
            ========================================================= */}
        {selectedGameDetail && !activePlayLevel && (
          <div className="bg-white rounded-3xl p-5 md:p-8 border-4 border-slate-100 shadow-xl max-w-4xl mx-auto text-left relative">
            <button
              id="back_to_market_btn"
              onClick={() => setSelectedGameDetail(null)}
              className="absolute top-5 right-5 p-2 bg-slate-50 hover:bg-slate-100 rounded-full border transition-all text-sm font-bold"
            >
              ❌ ĐÓNG
            </button>

            {/* upper game info split */}
            <div className="flex flex-col md:flex-row gap-6 items-start pb-6 border-b border-slate-100 mt-4 md:mt-0">
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-3xl bg-slate-50 border shadow-sm flex items-center justify-center text-6xl break-keep shrink-0">
                {selectedGameDetail.thumbnail}
              </div>
              
              <div className="flex-1 min-w-0">
                <span className="bg-kids-pink/10 text-kids-pink text-xxxxs font-mono font-black uppercase px-2.5 py-1 rounded-full tracking-wide">
                  {categoryToVietnamese(selectedGameDetail.category)}
                </span>
                <span className="bg-sky-50 text-kids-blue text-xxxxs font-mono font-black uppercase px-2.5 py-1 rounded-full tracking-wide ml-2">
                  LỚP {selectedGameDetail.grade_from}-{selectedGameDetail.grade_to}
                </span>

                <h3 className="font-display text-xl md:text-2xl text-slate-800 font-black mt-2 mb-1">{selectedGameDetail.title}</h3>
                
                <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-400 mb-4">
                  <span>✨ Bản quyền: Toàn sàn Edtech</span>
                  <span>•</span>
                  <span>⭐ {selectedGameDetail.rating_avg} / 5 điểm</span>
                  <span>•</span>
                  <span>🔥 {selectedGameDetail.plays_count} lượt chơi</span>
                </div>

                {/* Buy Button conditions */}
                <div className="flex items-center gap-3">
                  {(session?.purchases?.includes(selectedGameDetail.id) || selectedGameDetail.price === 0) ? (
                    <span className="text-emerald-500 font-display font-black text-sm md:text-base border border-emerald-250 bg-emerald-50/50 rounded-2xl px-4 py-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4.5 h-4.5 stroke-[2.5]" /> Con đã sẵn sàng chơi!
                    </span>
                  ) : (
                    <button
                      id={`buy_game_${selectedGameDetail.id}`}
                      onClick={() => triggerBuyGame(selectedGameDetail.id)}
                      className="px-6 py-3.5 bg-kids-pink hover:bg-hotpink text-white font-display font-black text-sm rounded-2xl shadow-lg transition-all transform active:translate-y-0.5 kids-btn-shadow-pink"
                    >
                      💳 MUA GAME BẢN QUYỀN VỚI {selectedGameDetail.price.toLocaleString()}đ
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Background Narrative & Levels map */}
            <div className="py-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              
              {/* Left narrative content */}
              <div className="md:col-span-7">
                <h4 className="font-display text-sm text-slate-800 font-black mb-2 uppercase">📖 CÂU CHUYỆN BỐI CẢNH</h4>
                <p className="text-slate-600 text-xs md:text-sm leading-relaxed mb-6 font-medium">
                  {selectedGameDetail.detailed_description}
                </p>

                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-xxs text-slate-600 leading-relaxed">
                  💡 <strong>Gợi ý thông số từ chuyên gia:</strong> Trò chơi này thúc đẩy vùng thị giác quang học lật ngược ký ức hoặc logic suy luận theo chuỗi tiến độ. Ba mẹ có thể cho con trẻ thong thả thử thách 15 phút mỗi tuần để tăng năng lực hoạt động tư duy.
                </div>
              </div>

              {/* Right: Levels visual list selector */}
              <div className="md:col-span-5 bg-slate-50 p-4.5 rounded-2xl border border-slate-100">
                <h4 className="font-display text-sm text-slate-800 font-black mb-3 text-center uppercase">
                  {selectedGameDetail.category === "scratch" ? "LỚP HỌC CODING" : `BẢN ĐỒ MÀN CHƠI (${selectedGameDetail.levels.length})`}
                </h4>

                {selectedGameDetail.category === "scratch" ? (
                  <div className="flex flex-col items-center justify-center text-center py-6 bg-white border border-slate-150 rounded-2xl p-4 gap-4 shadow-xs">
                    <span className="text-4xl animate-pulse">🐱</span>
                    <div>
                      <h5 className="font-display text-sm font-black text-indigo-900">Studio Lập Trình Scratch Robot</h5>
                      <span className="text-xxs font-semibold text-slate-500 block leading-normal mt-1">
                        Khám phá 9 bài toán thuật toán thông minh, từ bẻ lái tránh mây bụi vũ trụ đến giải mã mê cung phức tạp!
                      </span>
                    </div>
                    <button
                      id="launch_scratch_from_detail"
                      onClick={() => {
                        setSelectedGameDetail(null);
                        setActiveTab("scratch");
                      }}
                      className="w-full py-3 bg-indigo-650 hover:bg-indigo-700 text-white font-display font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer transform hover:scale-102"
                    >
                      🚀 Mở Lớp Học Scratch Ngay
                    </button>
                  </div>
                ) : !(session?.purchases?.includes(selectedGameDetail.id) || selectedGameDetail.price === 0) ? (
                  <div className="flex flex-col items-center justify-center text-center py-10 bg-white/70 border border-slate-150/60 rounded-xl relative overflow-hidden backdrop-blur-xxs">
                    <Lock className="w-8 h-8 text-slate-400 mb-2 animate-bounce" />
                    <p className="text-xxs font-sans font-bold text-slate-500 max-w-[200px] leading-relaxed">
                      Vui lòng mua bản quyền trò chơi để mở khóa tiến độ!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 gap-2 h-max max-h-[300px] overflow-y-auto no-scrollbar border-t border-slate-100 pt-2 grid-flow-row">
                    {selectedGameDetail.levels.map((lvl: any, idx: number) => (
                      <button
                        id={`select_level_btn_${lvl.level_num}`}
                        key={lvl.id}
                        onClick={() => {
                          setActivePlayGame(selectedGameDetail);
                          setActivePlayLevel(lvl);
                        }}
                        className="py-3 px-2 bg-white hover:bg-blue-50/60 border border-slate-200 hover:border-kids-blue rounded-xl text-center shadow-xs transition-all flex flex-col items-center justify-center active:scale-95 group"
                      >
                        <span className="font-display text-xs text-slate-700 font-black group-hover:text-kids-blue">Màn {lvl.level_num}</span>
                        <span className="text-xxxxs font-bold text-yellow-600 font-mono">+{lvl.xp_reward || 50} XP</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* =========================================================
            D. MAIN GAMEPLAY CORE ATTEMPT HANDLER
            ========================================================= */}
        {activePlayGame && activePlayLevel && activePlayLevel.questions && activePlayLevel.questions[activePlayQuestionIdx] && (
          <QuestionRenderer
            question={activePlayLevel.questions[activePlayQuestionIdx]}
            levelNum={activePlayLevel.level_num}
            xpReward={activePlayLevel.xp_reward || 50}
            coinReward={activePlayLevel.coin_reward || 10}
            onSuccess={handleGameLevelSuccess}
            onBack={() => {
              setActivePlayLevel(null);
              setActivePlayGame(null);
            }}
          />
        )}

        {/* =========================================================
            E. LEARN SCRATCH ROBOT WORKSPACE
            ========================================================= */}
        {activeTab === "scratch" && !selectedScratchLesson && (
          <div className="flex flex-col gap-6 text-left">
            <div className="bg-white rounded-3xl p-5 border shadow-sm border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h2 className="font-display text-lg md:text-xl text-slate-800 font-black flex items-center gap-2">
                  🤖 LẬP TRÌNH ROBOT SCRATCH (STUDIO)
                </h2>
                <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                  Lắp ráp các khối thuật toán logic tư duy để chỉ huy phi thuyền hoặc chuyển động chú mèo.
                </p>
              </div>
              <div className="bg-purple-50 border border-purple-200 text-purple-700 font-display text-xs p-3 rounded-2xl block font-medium">
                🎯 Định Hướng Giai Đoạn 3: Tư duy Thuật toán & STEM thông thái!
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {scratchCourses.map((course) => (
                <div key={course.id} className="bg-white rounded-3xl p-5 border-2 border-slate-100 shadow flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-12 h-12 rounded-2xl bg-purple-50 border flex items-center justify-center text-3xl">
                        {course.thumbnail}
                      </div>
                      <span className="bg-purple-100 text-purple-700 font-display text-xxs font-extrabold py-1 px-3 rounded-lg">
                        Mức: {course.difficulty}
                      </span>
                    </div>

                    <h3 className="font-display text-base font-black text-slate-800 mb-1">{course.title}</h3>
                    <p className="text-xxs text-slate-500 font-medium mb-6 leading-relaxed">
                      {course.description}
                    </p>
                  </div>

                  <div className="border-t border-slate-100/60 pt-4">
                    <h4 className="text-xxxxs font-mono font-black text-slate-400 uppercase tracking-widest mb-3">Danh sách bài học cốt lõi</h4>
                    <div className="flex flex-col gap-2">
                      {course.lessons.map((lesson: any) => (
                        <div 
                          key={lesson.lesson_num}
                          className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border hover:border-purple-200 transition-all cursor-pointer group"
                          onClick={() => setSelectedScratchLesson(lesson)}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-purple-50 text-purple-700 font-display text-xxs font-extrabold flex items-center justify-center border">
                              {lesson.lesson_num}
                            </span>
                            <span className="font-display text-xs text-slate-700 font-black group-hover:text-purple-700 transition-all">{lesson.title}</span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-350 mr-1 transition-all group-hover:translate-x-1" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Interactive Selected Scratch Lesson Simulator */}
        {activeTab === "scratch" && selectedScratchLesson && (
          <ScratchSimulator
            lesson={selectedScratchLesson}
            onLessonComplete={handleScratchLessonComplete}
            onBack={() => setSelectedScratchLesson(null)}
          />
        )}

        {/* =========================================================
            F. GLOBAL LEADERBOARD PAGE
            ========================================================= */}
        {activeTab === "leaderboard" && (
          <div className="bg-white rounded-3xl p-5 md:p-8 border shadow border-slate-100 max-w-3xl mx-auto text-left flex flex-col gap-6">
            <div className="flex items-center gap-3 border-b pb-4 mb-2 border-slate-150">
              <Trophy className="w-8 h-8 text-yellow-400 animate-bounce" />
              <div>
                <h2 className="font-display text-lg md:text-xl text-slate-800 font-black uppercase">ĐẠI HỘI BẢNG VÀNG TOÀN QUỐC</h2>
                <p className="text-slate-500 text-xs font-semibold">Bé chăm chỉ rèn luyện, ghi công rực rỡ lên Bách khoa trạng nguyên!</p>
              </div>
            </div>

            {/* Filters by Game types */}
            <div className="flex flex-wrap gap-2 justify-center py-2 bg-slate-50 rounded-2xl p-2 border">
              {[
                { code: "all", label: "Tổng Toàn Kho ⭐️" },
                { code: "g1", label: "Ghép Cặp Thần Tốc ⚡" },
                { code: "g2", label: "Truy Tìm Quy Luật 🧩" },
                { code: "g3", label: "Vua Ghi Nhớ 🧠" }
              ].map((filterTab) => (
                <button
                  id={`rank_tab_${filterTab.code}`}
                  key={filterTab.code}
                  onClick={() => setLeaderboardFilter(filterTab.code)}
                  className={`px-4 py-2 rounded-xl text-xs font-display font-bold transition-all ${
                    leaderboardFilter === filterTab.code
                    ? "bg-kids-yellow text-slate-800 shadow scale-102"
                    : "text-slate-600 hover:bg-slate-100/70"
                  }`}
                >
                  {filterTab.label}
                </button>
              ))}
            </div>

            {/* List Table */}
            <div className="flex flex-col gap-2 pt-2">
              <div className="opacity-60 text-xxxxs font-mono font-black text-slate-400 uppercase tracking-widest flex px-4">
                <span className="w-12">Hạng</span>
                <span className="flex-1">Tài năng nhí</span>
                <span className="w-24 text-right">Màn</span>
                <span className="w-32 text-right">Điểm rực rỡ</span>
              </div>

              {leaderboardList.map((sc, idx) => (
                <div 
                  id={`leaderboard_item_${idx}`}
                  key={idx} 
                  className={`flex items-center justify-between p-3 px-4 rounded-xl border border-slate-100 transition-all ${
                    idx === 0 ? "bg-amber-50/50 border-amber-200" :
                    idx === 1 ? "bg-slate-50/80" : "bg-white"
                  }`}
                >
                  <div className="w-12 flex items-center">
                    <span className={`w-6 h-6 font-mono text-xs font-black rounded-lg flex items-center justify-center ${
                      idx === 0 ? "bg-yellow-400 text-slate-900 shadow-xs" :
                      idx === 1 ? "bg-slate-205 text-slate-700" :
                      idx === 2 ? "bg-amber-100 text-amber-800" : "text-slate-400"
                    }`}>
                      {idx + 1}
                    </span>
                  </div>

                  <div className="flex-1 font-display text-sm text-slate-700 font-extrabold">
                    {sc.username} {idx === 0 && "👑"}
                  </div>

                  <div className="w-24 text-right text-xxs font-mono text-slate-400 font-bold">
                    Màn {sc.levelNum}
                  </div>

                  <div className="w-32 text-right font-mono text-sm font-black text-kids-pink">
                    {sc.score} điểm
                  </div>
                </div>
              ))}

              {leaderboardList.length === 0 && (
                <div className="text-center py-10 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 font-medium">
                  Chưa có kết quả leo bảng chơi màn này! Nhanh chân ghi danh đầu tiên con nhé!
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================
            G. USER PROFILE & HISTORY PORTAL
            ========================================================= */}
        {activeTab === "profile" && session && (
          <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
            
            {/* Box Left: Profile Details and badges (8 cols) */}
            <div className="lg:col-span-8 bg-white rounded-3xl p-5 md:p-8 border shadow-sm border-slate-100 flex flex-col gap-6">
              <h3 className="font-display text-base md:text-lg text-slate-800 font-black border-b pb-2 mb-2 uppercase flex items-center gap-1">
                <User className="text-kids-pink w-5 h-5" /> Hồ sơ năng khiếu của Bé
              </h3>

              {/* Editing Form */}
              <form onSubmit={triggerUpdateProfile} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xxs font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">TÊN HIỂN THỊ CỦA CON</label>
                  <input
                    id="profile_name_input"
                    type="text"
                    required
                    value={editProfileName}
                    onChange={(e) => setEditProfileName(e.target.value)}
                    className="w-full bg-slate-50 border-2 rounded-xl py-2 px-3 text-xs md:text-sm font-bold outlines-none focus:border-kids-pink outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xxs font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">LỚP HỌC ĐANG HỌC</label>
                  <select
                    id="profile_grade_select"
                    value={editProfileGrade}
                    onChange={(e) => setEditProfileGrade(e.target.value)}
                    className="w-full bg-slate-50 border-2 rounded-xl py-2 px-3 text-xs md:text-sm font-bold outline-none"
                  >
                    {[1,2,3,4,5,6,7,8,9].map(g => (
                      <option key={g} value={g}>Lớp {g}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xxs font-bold text-slate-400 uppercase tracking-widest mb-2 font-mono">CHỌN NGƯỜI BẠN AVATAR ĐỒNG HÀNH</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: "smile_tiger", emoji: "🐯", label: "Hổ con" },
                      { id: "cool_fox", emoji: "🦊", label: "Cáo tinh lanh" },
                      { id: "logic_owl", emoji: "🦉", label: "Cú thông thái" },
                      { id: "tech_cat", emoji: "🐱", label: "Mèo công nghệ" },
                    ].map((av) => (
                      <div
                        id={`avatar_choice_${av.id}`}
                        key={av.id}
                        onClick={() => setEditProfileAvatar(av.id)}
                        className={`p-2 rounded-2xl border-2 text-center cursor-pointer transition-all flex flex-col items-center ${
                          editProfileAvatar === av.id
                          ? "bg-kids-pink/15 border-kids-pink scale-102"
                          : "bg-slate-50 border-slate-150 hover:bg-slate-100"
                        }`}
                      >
                        <span className="text-3xl">{av.emoji}</span>
                        <span className="text-xxxxs font-bold text-slate-500 uppercase mt-1">{av.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2 pt-2">
                  <button
                    id="save_profile_btn"
                    type="submit"
                    className="px-5 py-3 bg-kids-blue hover:bg-sky-400 text-white font-display font-black text-xs rounded-xl shadow transition-all kids-btn-shadow-blue"
                  >
                    🚀 Cập nhật hồ sơ năng nổ
                  </button>
                  {profileSuccessMsg && <span className="text-emerald-500 font-bold text-xs ml-3">{profileSuccessMsg}</span>}
                </div>
              </form>

              {/* XP progress bars */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex justify-between text-xs font-bold text-slate-500 mb-1 font-mono">
                  <span>KIÊU HÃNH LEVEL {session.user.level}</span>
                  <span>{session.user.xp % 250} / 250 XP</span>
                </div>
                <div className="w-full bg-slate-150 rounded-full h-3 overflow-hidden border">
                  <div 
                    className="bg-kids-yellow h-full rounded-full" 
                    style={{ width: `${Math.min(100, ((session.user.xp % 250) / 250) * 100)}%` }}
                  />
                </div>
                <span className="text-xxxxs font-medium font-sans text-slate-400 block mt-1">Con tích luỹ thêm {250 - (session.user.xp % 250)} XP để bứt phá thăng hạng level tiếp theo!</span>
              </div>
            </div>

            {/* Box Right: Badges display (4 cols) */}
            <div className="lg:col-span-4 bg-white rounded-3xl p-5 border shadow-sm border-slate-100 text-left flex flex-col gap-4">
              <h3 className="font-display text-base text-slate-800 font-black border-b pb-2 mb-1 uppercase flex items-center gap-1.5">
                <Award className="text-kids-purple w-5 h-5" /> HUY HIỆU ĐÃ ĐẠT
              </h3>

              <div className="flex flex-col gap-3.5">
                {[
                  { title: "Nhà Toán Học Nhí", details: "Luyện 30 màn quy luật toán", icon: "🥇" },
                  { title: "Siêu Trí Nhớ", details: "Vượt 30 màn memory", icon: "🧠" },
                  { title: "Vua Logic", details: "Bứt phá ghép cặp thần tốc", icon: "💡" }
                ].map((bg, index) => {
                  const isUnlocked = session.user.xp >= (index * 80 + 40);
                  
                  return (
                    <div 
                      key={index}
                      className={`p-3 rounded-2xl border flex gap-3 items-center transition-all ${
                        isUnlocked
                        ? "bg-amber-50/40 border-amber-205"
                        : "bg-slate-50 border-slate-150 opacity-40 select-none grayscale"
                      }`}
                    >
                      <span className="text-3xl shrink-0">{bg.icon}</span>
                      <div>
                        <span className="font-display text-xs text-slate-700 font-extrabold block leading-tight">{bg.title}</span>
                        <span className="text-xxxxs text-slate-400 font-bold block mt-0.5">{bg.details}</span>
                        {isUnlocked ? (
                          <span className="text-xxxxs font-mono font-bold text-emerald-600 uppercase block mt-1">✓ Đã Mở Khóa</span>
                        ) : (
                          <span className="text-xxxxs font-mono font-bold text-slate-400 uppercase block mt-1">🔒 Chưa đạt ({index*80+40} XP)</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* =========================================================
            H. STATEFUL WALLET LEDGER
            ========================================================= */}
        {activeTab === "wallet" && session && (
          <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
            
            {/* Box Left: Deposit Ledger triggers (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-5 md:p-8 border shadow border-slate-100 flex flex-col gap-5">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="font-display text-base md:text-lg text-slate-800 font-black uppercase flex items-center gap-1.5">
                  <CreditCard className="text-kids-pink w-5 h-5" /> VÍ SAO XU GIẢ LẬP
                </h3>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4.5">
                <span className="text-xxxxs font-mono font-bold text-slate-400 uppercase block tracking-wider">Số dư khả dụng</span>
                <span className="font-mono text-xl md:text-2xl font-black text-slate-800 block mt-1">
                  {session.wallet.balance.toLocaleString()}đ (VND)
                </span>
                <p className="text-xxs text-slate-500 font-medium leading-relaxed mt-2">
                  Kho xu dùng để thanh toán bản quyền các game Toán hay Lập trình kéo thả cao cấp có trên sàn. 
                  Hệ thống giả lập an toàn, tuyệt đối không lấy phí thật của ba mẹ!
                </p>
              </div>

              <h4 className="text-xxs font-mono font-black text-slate-400 uppercase tracking-widest mt-2">Kích hoạt nạp tiền trải nghiệm</h4>
              
              <div className="grid grid-cols-3 gap-2">
                {[20000, 50000, 100000].map((amt) => (
                  <button
                    id={`topup_amt_choice_${amt}`}
                    key={amt}
                    onClick={() => {
                      setTopupAmount(amt);
                      setShowQRModal(true);
                    }}
                    className={`py-3.5 border-2 rounded-2xl text-xs md:text-sm font-black font-mono transition-all ${
                      topupAmount === amt 
                      ? "bg-kids-pink/15 border-kids-pink text-kids-pink scale-102"
                      : "bg-slate-50 border-slate-150 hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    +{amt.toLocaleString()}đ
                  </button>
                ))}
              </div>

              {showQRModal && (
                <div id="qr_mockup_modal" className="bg-amber-50/50 rounded-2xl p-4.5 border-2 border-dashed border-amber-305 text-center flex flex-col items-center">
                  <span className="text-3xl block mb-2">📲 SCAN QR NẠP SAO XU</span>
                  <div className="bg-white p-3 border-2 border-amber-305 w-24 h-24 flex items-center justify-center text-4xl shadow-sm rounded-lg mb-2">
                    📱
                  </div>
                  <span className="text-xxs font-bold text-slate-500 block mb-3 leading-snug">
                    Chuyển khoản giả lập {topupAmount.toLocaleString()}đ vào Kho Sao Xu của con.
                  </span>
                  <button
                    id="mock_transfer_qr"
                    onClick={triggerTopupWallet}
                    className="px-5 py-2.5 bg-kids-green hover:bg-green-400 text-slate-900 font-display font-black text-xs rounded-xl shadow transition-all kids-btn-shadow-green"
                  >
                    ✓ Xác thực đã chuyển thành công!
                  </button>
                </div>
              )}
            </div>

            {/* Box Right: Transaction histories lists (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-5 border shadow border-slate-100 flex flex-col gap-4">
              <h3 className="font-display text-base text-slate-800 font-black border-b pb-2 uppercase text-center">
                📊 NHẬT KÝ CHI TIÊU
              </h3>

              <div className="flex flex-col gap-3.5 max-h-[350px] overflow-y-auto no-scrollbar grid-flow-row">
                {session.wallet.transactions.map((tx: any) => (
                  <div 
                    key={tx.id} 
                    className="p-3 bg-slate-50 rounded-2xl border text-xs flex justify-between items-center transition-all hover:bg-slate-100/70"
                  >
                    <div className="min-w-0 pr-2">
                      <span className="font-display font-extrabold text-slate-700 block text-xxs truncate leading-tight">{tx.detail}</span>
                      <span className="text-xxxxs font-mono text-slate-400 block mt-1">{new Date(tx.date).toLocaleDateString()} {new Date(tx.date).toLocaleTimeString()}</span>
                    </div>
                    <span className={`font-mono text-xs font-black shrink-0 ${
                      tx.amount < 0 ? "text-rose-500" : "text-emerald-600"
                    }`}>
                      {tx.amount < 0 ? "-" : "+"}{Math.abs(tx.amount).toLocaleString()}đ
                    </span>
                  </div>
                ))}

                {session.wallet.transactions.length === 0 && (
                  <div className="text-center py-10 text-slate-400 text-xs font-medium">Chưa phát sinh giao dịch nào.</div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* =========================================================
            I. ADMIN PANEL CMS / CREATOR STUDIO
            ========================================================= */}
        {activeTab === "admin" && (
          <div className="max-w-5xl mx-auto flex flex-col gap-8 text-left">
            
            {/* Visual Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Doanh Thu Sàn 💳", value: adminStats ? `${adminStats.totalRevenue.toLocaleString()}đ` : "---", color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
                { label: "Tổng Dự Án Game 👾", value: adminStats ? adminStats.totalGames : "---", color: "text-blue-600 bg-blue-50 border-blue-105" },
                { label: "Số Người Chơi 👥", value: adminStats ? adminStats.totalUsers : "---", color: "text-amber-600 bg-amber-50 border-amber-103" },
                { label: "Sáng Tạo Custom 🧪", value: adminStats ? adminStats.customGamesCount : "---", color: "text-purple-600 bg-purple-50 border-purple-105" },
              ].map((statItem, idx) => (
                <div key={idx} className={`p-4 rounded-2xl border shadow-xs ${statItem.color}`}>
                  <span className="text-xxs font-bold uppercase tracking-wider block opacity-75">{statItem.label}</span>
                  <span className="font-mono text-lg md:text-xl font-black block mt-1">{statItem.value}</span>
                </div>
              ))}
            </div>

            {/* Split row: Create Custom Game + Stats charts */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Box Left: Pro-grade Designer Studio (7 cols) */}
              <div className="lg:col-span-7 bg-white rounded-3xl p-5 md:p-8 border shadow border-slate-100 flex flex-col gap-5">
                
                {/* Headers with tabs & clear db action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="p-2 bg-purple-50 rounded-xl text-kids-purple">
                      <PlusCircle className="w-5 h-5 animate-pulse" />
                    </span>
                    <div>
                      <h3 className="font-display text-sm md:text-base text-slate-800 font-extrabold uppercase tracking-wide">
                        CREATOR LAB • STUDIO SÁNG TẠO
                      </h3>
                      <p className="text-xxs text-slate-400 font-medium font-mono">Game Content Management Engine</p>
                    </div>
                  </div>
                  
                  {/* Wipe DB Button */}
                  <button
                    id="btn_wipe_custom_data"
                    type="button"
                    onClick={triggerClearDatabase}
                    className="self-start sm:self-auto py-1 px-3 border border-rose-200 hover:bg-rose-50 text-rose-500 font-mono text-xxs font-bold rounded-lg transition-colors flex items-center gap-1"
                  >
                    🧹 Dọn Sạch Data Custom
                  </button>
                </div>

                {/* Tab Switcher */}
                <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
                  {[
                    { key: "my_games", label: "📂 Dự Án Của Tôi" },
                    { key: "create", label: "🆕 Sáng Tạo Game" },
                    { key: "ai", label: "🤖 Thiết Kế AI" },
                    { key: "level", label: "🛠️ Level Builder" },
                    { key: "package", label: "📦 Gói JSON" },
                    { key: "review", label: "⚖️ Phê Duyệt Queue" }
                  ].map((tb) => (
                    <button
                      key={tb.key}
                      id={`tab_creator_${tb.key}`}
                      type="button"
                      onClick={() => {
                        setCreatorTab(tb.key as any);
                        setAdminMessage("");
                        if (tb.key === "review") loadReviewQueue();
                        if (tb.key === "my_games") loadCreatorGames();
                      }}
                      className={`flex-1 min-w-[125px] py-1.5 px-3 text-center text-xs font-black rounded-lg transition-all ${
                        creatorTab === tb.key
                          ? "bg-white text-kids-purple shadow-xs scale-[1.02]"
                          : "text-slate-500 hover:text-slate-800 hover:bg-white/45"
                      }`}
                    >
                      {tb.label}
                    </button>
                  ))}
                </div>

                {creatorTab === "ai" && (
                  /* ====================================
                     SUB-TAB 3: AI GEMINI AUTOPILOT ENGINE
                     ==================================== */
                  <form onSubmit={triggerGenerateAIGame} className="flex flex-col gap-4">
                    <div className="bg-gradient-to-r from-kids-purple/15 to-kids-blue/15 border border-purple-200/50 rounded-2xl p-4 flex gap-3 items-start">
                      <span className="text-2xl animate-bounce">🤖</span>
                      <div>
                        <h4 className="text-xs font-extrabold text-kids-purple">AI GAME DESIGNER ENGINE</h4>
                        <p className="text-[10px] leading-relaxed text-slate-500 mt-1">
                          Chỉ cần đặt đề bài học tập, trợ lý trí tuệ nhân tạo Gemini của Google sẽ tự viết đề và xây dựng toàn bộ giáo án gồm <strong>03 màn chơi lũy tiến</strong> theo đúng định dạng mẫu game bạn yêu cầu!
                        </p>
                      </div>
                    </div>

                    {aiWarnBanner && (
                      <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 text-xxs font-semibold leading-relaxed">
                        ⚠️ <strong>Thông báo:</strong> {aiWarnBanner}
                      </div>
                    )}

                    <div>
                      <label className="block text-xxs font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                        CHỦ ĐỀ BÀI HỌC MUỐN AI THIẾTKẾ (TOPIC)
                      </label>
                      <input
                        id="ai_form_topic"
                        type="text"
                        required
                        placeholder="Ví dụ: Vòng tuần hoàn của nước, Trống đồng Đông Sơn, Động vật dưới đại dương..."
                        value={aiTopic}
                        onChange={(e) => setAiTopic(e.target.value)}
                        className="w-full bg-slate-50 border-2 rounded-xl py-2 px-3 text-xs font-bold outline-none border-slate-100 focus:border-kids-purple"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xxs font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                          MẪU GAME THỂ HIỆN (TEMPLATE)
                        </label>
                        <select
                          id="ai_form_template"
                          required
                          value={aiTemplate}
                          onChange={(e) => setAiTemplate(e.target.value)}
                          className="w-full bg-slate-50 border-2 rounded-xl py-2.5 px-3 text-xs font-semibold outline-none border-slate-100"
                        >
                          <option value="quiz">Trắc Nghiệm ABCD (quiz)</option>
                          <option value="matching">Ghép Cạnh Logic (matching)</option>
                          <option value="sequence">Giải Đố Điền Số (sequence)</option>
                          <option value="memory">Lật Khớp Cặp Memory (memory)</option>
                          <option value="language">Ngôn Ngữ Điền Từ (language)</option>
                          <option value="observation">Tìm Khác Biệt Quan Sát (observation)</option>
                          <option value="sorting">Sắp Xếp Tuần Tự (sorting)</option>
                          <option value="flashcard">Thẻ Học Đa Năng Flashcard (flashcard)</option>
                          <option value="scratch">Lập Trình Mèo Con Scratch (scratch)</option>
                          <option value="coding">Debug Lập Trình Nhí (coding)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xxs font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                          PHÂN LOẠI MÔN HỌC (CATEGORY)
                        </label>
                        <select
                          id="ai_form_category"
                          required
                          value={aiCategory}
                          onChange={(e) => setAiCategory(e.target.value)}
                          className="w-full bg-slate-50 border-2 rounded-xl py-2.5 px-3 text-xs font-semibold outline-none border-slate-100"
                        >
                          <option value="iq">IQ & Trí Tuệ</option>
                          <option value="math">Toán Học Tư Duy</option>
                          <option value="science">Khoa Học Tự Nhiên</option>
                          <option value="vietnamese">Tiếng Việt Bản Sắc</option>
                          <option value="english">Ngoại Ngữ English</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xxs font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                          LỚP TỐI THIỂU
                        </label>
                        <input
                          id="ai_form_grade_from"
                          type="number"
                          min="1"
                          max="9"
                          required
                          value={aiGradeFrom}
                          onChange={(e) => setAiGradeFrom(e.target.value)}
                          className="w-full bg-slate-50 border-2 rounded-xl py-2 px-3 text-xs font-medium outline-none border-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-xxs font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                          LỚP TỐI ĐA
                        </label>
                        <input
                          id="ai_form_grade_to"
                          type="number"
                          min="1"
                          max="9"
                          required
                          value={aiGradeTo}
                          onChange={(e) => setAiGradeTo(e.target.value)}
                          className="w-full bg-slate-50 border-2 rounded-xl py-2 px-3 text-xs font-medium outline-none border-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-xxs font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                          PHÍ CHƠI (Coins / 0=Free)
                        </label>
                        <input
                          id="ai_form_price"
                          type="number"
                          required
                          value={aiPrice}
                          onChange={(e) => setAiPrice(e.target.value)}
                          className="w-full bg-slate-50 border-2 rounded-xl py-2 px-3 text-xs font-medium outline-none border-slate-100"
                        />
                      </div>
                    </div>

                    <button
                      id="btn_ai_generate_now"
                      type="submit"
                      disabled={aiGenerating}
                      className="mt-2 w-full py-3 md:py-4 rounded-xl bg-gradient-to-r from-kids-purple to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-display text-xs font-bold leading-normal transition-all transform active:translate-y-0.5 hover:scale-[1.01] flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                    >
                      {aiGenerating ? (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          Đang Khởi Tạo Thiết Kế...
                        </>
                      ) : (
                        <>
                          <span>🤖 Thiết Kế Tự Động Bằng Trí Tuệ Nhân Tạo Gemini</span>
                        </>
                      )}
                    </button>
                  </form>
                )}

                {creatorTab === "my_games" && (
                  <div className="flex flex-col gap-4 text-left">
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-4 flex gap-3 items-center">
                      <span className="text-2xl">📂</span>
                      <div className="flex-1">
                        <h4 className="text-xs font-extrabold text-emerald-800 uppercase">DỰ ÁN KHỞI TẠO CỦA BẠN</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                          Đây là danh sách tất cả các trò chơi do tài khoản <strong>{session.user?.name}</strong> của bạn tự thiết kế thủ công hoặc phối hợp tạo cùng AI.
                        </p>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <th className="py-2 px-3 text-center w-12">Icon</th>
                            <th className="py-2 px-3">Tên Trò Chơi</th>
                            <th className="py-2 px-3">Thể Loại & Mẫu</th>
                            <th className="py-2 px-3">Màn chơi</th>
                            <th className="py-2 px-3">Kiểm Phê Duyệt</th>
                            <th className="py-2 px-3 text-right">Hành động</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {creatorGamesList.map((g) => {
                            let statusBadge = null;
                            if (g.review_status === "approved") {
                              statusBadge = <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Approved ✅</span>;
                            } else if (g.review_status === "rejected") {
                              statusBadge = (
                                <div className="group relative inline-block">
                                  <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full cursor-help">Rejected ❌</span>
                                  <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-slate-900 text-white font-normal text-[10px] p-2 rounded-xl w-48 shadow-lg hidden group-hover:block z-10 line-clamp-3 leading-normal">
                                    {g.review_feedback || "Chưa đạt chuẩn nội dung."}
                                  </span>
                                </div>
                              );
                            } else {
                              statusBadge = <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Kiểm duyệt ⏳</span>;
                            }

                            return (
                              <tr key={g.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-2.5 px-3 text-center text-lg">{g.thumbnail || "🎮"}</td>
                                <td className="py-2.5 px-3 font-bold text-slate-800">{g.title}</td>
                                <td className="py-2.5 px-3">
                                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">{g.category}</span>
                                  <span className="text-xxs text-kids-purple font-semibold">{g.template_code}</span>
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-600">
                                  {g.levels?.length || 0} màn
                                </td>
                                <td className="py-2.5 px-3">{statusBadge}</td>
                                <td className="py-2.5 px-3 text-right">
                                  <div className="flex gap-1 justify-end">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDesignGameId(g.id);
                                        const nextLvlNum = (g.levels?.length || 0) + 1;
                                        setDesignLvlNum(String(nextLvlNum));
                                        setDesignLvlTitle(`Màn ${nextLvlNum}: Sức Mạnh Trí Tuệ Mới`);
                                        setCreatorTab("level");
                                      }}
                                      className="py-1 px-2.5 bg-purple-50 hover:bg-purple-100 text-kids-purple font-bold text-xxs rounded-lg transition-transform hover:scale-105"
                                    >
                                      + Màn Mới
                                    </button>
                                    {g.levels && g.levels.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActivePlayGame(g);
                                          setActivePlayLevel(g.levels[0]);
                                          setActivePlayQuestionIdx(0);
                                        }}
                                        className="py-1 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xxs rounded-lg transition-transform hover:scale-105"
                                      >
                                        Test 🎮
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}

                          {creatorGamesList.length === 0 && (
                            <tr>
                              <td colSpan={6} className="text-center py-12 text-slate-400 font-medium">
                                Bạn chưa khởi tạo dự án game nào. Hãy chọn tab <strong>Sáng Tạo Game</strong> hoặc <strong>Thiết Kế AI</strong> để bắt đầu nhé!
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {creatorTab === "create" && (
                  <form onSubmit={triggerCreateNewGame} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                    <div className="sm:col-span-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 flex gap-3 items-center">
                      <span className="text-2xl">🆕</span>
                      <div>
                        <h4 className="text-xs font-extrabold text-blue-800 uppercase">SÁNG TẠO TRÒ CHƠI THỦ CÔNG</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                          Tự lập biểu đồ quy định, loại bài toán, độ tuổi, phí chơi. Sau khi tạo thành công bạn có thể nạp cấp độ ở tab "Level Builder"!
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xxs font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                        TÊN TRÒ CHƠI ĐỘC ĐÁO
                      </label>
                      <input
                        id="new_game_title"
                        type="text"
                        required
                        placeholder="Ví dụ: Bé Vui Học Phép Cộng ➕"
                        value={newGameTitle}
                        onChange={(e) => setNewGameTitle(e.target.value)}
                        className="w-full bg-slate-50 border-2 rounded-xl py-2 px-3 text-xs font-bold outline-none border-slate-100 focus:border-kids-purple"
                      />
                    </div>

                    <div>
                      <label className="block text-xxs font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                        MẪU TRÒ CHƠI PHÙ HỢP (TEMPLATE)
                      </label>
                      <select
                        id="new_game_template"
                        required
                        value={newGameTemplate}
                        onChange={(e) => setNewGameTemplate(e.target.value)}
                        className="w-full bg-slate-50 border-2 rounded-xl py-2 px-3 text-xs font-semibold outline-none border-slate-100"
                      >
                        <option value="matching">Ghép Cạnh Học Tập (matching)</option>
                        <option value="sequence">Giải Đố Tìm Quy Luật (sequence)</option>
                        <option value="memory">Nhớ Ảnh Lật Bài (memory)</option>
                        <option value="scratch">Lập Trình Scratch Robot (scratch)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xxs font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                        MÔ TẢ NGẮN KHỞI HÀNH (DESCRIPTION)
                      </label>
                      <textarea
                        id="new_game_desc"
                        required
                        placeholder="Yêu thương gửi học sinh, ví dụ: Hãy giúp khỉ con tìm các nải chuối chín bằng cách giải quyết các bài toán ghép cạnh xuất sắc..."
                        value={newGameDesc}
                        onChange={(e) => setNewGameDesc(e.target.value)}
                        rows={3}
                        className="w-full bg-slate-50 border-2 rounded-xl py-2 px-3 text-xs font-medium outline-none border-slate-100 focus:border-kids-purple"
                      />
                    </div>

                    <div>
                      <label className="block text-xxs font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                        PHÂN KHÚC MÔN HỌC (CATEGORY)
                      </label>
                      <select
                        id="new_game_category"
                        required
                        value={newGameCategory}
                        onChange={(e) => setNewGameCategory(e.target.value)}
                        className="w-full bg-slate-50 border-2 rounded-xl py-2 px-3 text-xs font-semibold outline-none border-slate-100"
                      >
                        <option value="math">Toán Học Tư Duy (math)</option>
                        <option value="iq">IQ & Logic (iq)</option>
                        <option value="science">Khoa Học Thực Tiễn (science)</option>
                        <option value="english">Anh Ngữ Giao Tiếp (english)</option>
                        <option value="vietnamese">Tiếng Việt Bản Sắc (vietnamese)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xxs font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                        PHÍ CHƠI (Coins / 0 = Free)
                      </label>
                      <input
                        id="new_game_price"
                        type="number"
                        required
                        value={newGamePrice}
                        onChange={(e) => setNewGamePrice(e.target.value)}
                        className="w-full bg-slate-50 border-2 rounded-xl py-2 px-3 text-xs font-bold outline-none border-slate-100"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:col-span-2">
                      <div>
                        <label className="block text-xxs font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                          DÀNH CHO HỌC SINH LỚP (GRADE MIN)
                        </label>
                        <input
                          id="new_game_grade_min"
                          type="number"
                          min="1"
                          max="9"
                          required
                          value={newGameGradeMin}
                          onChange={(e) => setNewGameGradeMin(e.target.value)}
                          className="w-full bg-slate-50 border-2 rounded-xl py-2 px-3 text-xs font-bold outline-none border-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-xxs font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                          ĐẾN LỚP (GRADE MAX)
                        </label>
                        <input
                          id="new_game_grade_max"
                          type="number"
                          min="1"
                          max="9"
                          required
                          value={newGameGradeMax}
                          onChange={(e) => setNewGameGradeMax(e.target.value)}
                          className="w-full bg-slate-50 border-2 rounded-xl py-2 px-3 text-xs font-bold outline-none border-slate-100"
                        />
                      </div>
                    </div>

                    {/* Optional First Question Sub-form */}
                    <div className="sm:col-span-2 border-2 border-dashed border-indigo-200 rounded-2xl p-5 bg-indigo-50/40 relative overflow-hidden transition-all">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <input
                            id="toggle_add_first_level"
                            type="checkbox"
                            checked={addFirstLevel}
                            onChange={(e) => setAddFirstLevel(e.target.checked)}
                            className="w-4 h-4 text-kids-purple border-slate-300 rounded focus:ring-kids-purple cursor-pointer focus:ring-2"
                          />
                          <label htmlFor="toggle_add_first_level" className="text-xs font-extrabold text-slate-700 cursor-pointer select-none">
                            ✍️ THÊM NGAY CÂU HỎI (MÀN CHƠI) ĐẦU TIÊN
                          </label>
                        </div>
                        <span className="text-xxs px-2 py-0.5 bg-yellow-100 text-yellow-800 font-bold font-mono rounded-full uppercase">
                          {addFirstLevel ? "Đang mở" : "Đã bỏ qua (Tạo sau ở Builder)"}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
                        Bạn có thể trực tiếp viết câu hỏi, đáp án cho game ngay lúc này để bé chơi thử được luôn! Hoặc bỏ qua để game tự động có màn mẫu của hệ thống và bạn tự lập cấp độ sau bằng công cụ Level Builder.
                      </p>

                      {addFirstLevel && (
                        <div className="space-y-4 border-t border-slate-100 pt-4 animate-fadeIn">
                          <div>
                            <label className="block text-xxs font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">
                              CÂU HỎI / YÊU CẦU CHO BÉ (PROMPT)
                            </label>
                            <input
                              id="first_lvl_prompt"
                              type="text"
                              placeholder={
                                newGameTemplate === "matching" ? "Ví dụ: Ghép từ vựng Tiếng Anh tương thích với ý nghĩa chính xác:" :
                                newGameTemplate === "sequence" ? "Ví dụ: Quy luật dãy số kì diệu, điền vào dấu chấm hỏi:" :
                                newGameTemplate === "memory" ? "Ví dụ: Lật hình các cặp con thú ngộ nghĩnh giống nhau:" :
                                "Ví dụ: Kéo các khối lệnh để đưa chú Mèo máy về Đĩa bay thần kì:"
                              }
                              value={firstLvlPrompt}
                              onChange={(e) => setFirstLvlPrompt(e.target.value)}
                              className="w-full bg-white border-2 rounded-xl py-2 px-3 text-xs font-semibold outline-none border-slate-100 focus:border-kids-purple"
                            />
                          </div>

                          {/* Matching Form */}
                          {newGameTemplate === "matching" && (
                            <div className="space-y-2.5">
                              <label className="block text-xxs font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">
                                THIẾT LẬP CÁC CẶP GHÉP ĐÚNG (CỘT A - CỘT B)
                              </label>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {firstMatchingPairs.map((pair, idx) => (
                                  <div key={idx} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm space-y-2">
                                    <div className="text-[10px] font-bold text-kids-purple">Cặp #{idx + 1}</div>
                                    <input
                                      type="text"
                                      placeholder="Cột A (Trái)"
                                      value={pair.left}
                                      onChange={(e) => {
                                        const next = [...firstMatchingPairs];
                                        next[idx].left = e.target.value;
                                        setFirstMatchingPairs(next);
                                      }}
                                      className="w-full bg-slate-50 border rounded-lg p-1.5 text-xs font-bold outline-none"
                                    />
                                    <input
                                      type="text"
                                      placeholder="Cột B (Phải)"
                                      value={pair.right}
                                      onChange={(e) => {
                                        const next = [...firstMatchingPairs];
                                        next[idx].right = e.target.value;
                                        setFirstMatchingPairs(next);
                                      }}
                                      className="w-full bg-slate-50 border rounded-lg p-1.5 text-xs outline-none"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Sequence Form */}
                          {newGameTemplate === "sequence" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xxs font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">
                                  DÃY SỐ / QUY LUẬT (CÁCH NHAU BẰNG DẤU PHẨY)
                                </label>
                                <input
                                  type="text"
                                  value={firstSeqString}
                                  onChange={(e) => setFirstSeqString(e.target.value)}
                                  className="w-full bg-white border rounded-xl py-1.5 px-3 text-xs font-bold outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-xxs font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">
                                  ĐÁP ÁN ĐÚNG
                                </label>
                                <input
                                  type="text"
                                  value={firstSeqAnswer}
                                  onChange={(e) => setFirstSeqAnswer(e.target.value)}
                                  className="w-full bg-white border rounded-xl py-1.5 px-3 text-xs font-mono font-bold outline-none text-emerald-600"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="block text-xxs font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">
                                  CÁC LỰA CHỌN ĐÁP ÁN (CÁCH NHAU BẰNG PHẨY, CHỨA ĐÁP ÁN ĐÚNG)
                                </label>
                                <input
                                  type="text"
                                  value={firstSeqOptions}
                                  onChange={(e) => setFirstSeqOptions(e.target.value)}
                                  className="w-full bg-white border rounded-xl py-1.5 px-3 text-xs outline-none"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="block text-xxs font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">
                                  GIẢI THÍCH CHO BÉ HIỂU QUY LUẬT
                                </label>
                                <input
                                  type="text"
                                  value={firstSeqExplanation}
                                  onChange={(e) => setFirstSeqExplanation(e.target.value)}
                                  className="w-full bg-white border rounded-xl py-1.5 px-3 text-xs outline-none"
                                />
                              </div>
                            </div>
                          )}

                          {/* Memory Form */}
                          {newGameTemplate === "memory" && (
                            <div>
                              <label className="block text-xxs font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">
                                CÁC KÝ TỰ / BIỂU TƯỢNG ĐỘC ĐÁO ĐỂ LẬT HÌNH (CÁCH NHAU BẰNG PHẨY)
                              </label>
                              <input
                                type="text"
                                value={firstMemEmojis}
                                onChange={(e) => setFirstMemEmojis(e.target.value)}
                                className="w-full bg-white border rounded-xl py-1.5 px-3 text-xs tracking-widest font-bold outline-none"
                              />
                              <p className="text-[10px] text-slate-400 mt-1">Con có thể nhập icon con thú, thực vật như: 🐱, 🐶, 🐻, 🐸</p>
                            </div>
                          )}

                          {/* Scratch Form */}
                          {newGameTemplate === "scratch" && (
                            <div className="space-y-2">
                              <div>
                                <label className="block text-xxs font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">
                                  BẢN ĐỒ KHỞI CHẠY (MẶC ĐỊNH JSON)
                                </label>
                                <input
                                  type="text"
                                  value={firstScratchStartScene}
                                  onChange={(e) => setFirstScratchStartScene(e.target.value)}
                                  className="w-full bg-white border rounded-xl py-1.5 px-3 text-xs font-mono outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-xxs font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">
                                  CHUỖI KHỐI LỆNH ĐÚNG (CÁCH NHAU BẰNG DẤU PHẨY)
                                </label>
                                <input
                                  type="text"
                                  value={firstScratchSequence}
                                  onChange={(e) => setFirstScratchSequence(e.target.value)}
                                  className="w-full bg-white border rounded-xl py-1.5 px-3 text-xs outline-none"
                                />
                                <p className="text-[10px] text-slate-400 mt-1 font-mono">Lệnh hỗ trợ: `move_forward`, `turn_left`, `turn_right`</p>
                              </div>
                              <div>
                                <label className="block text-xxs font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">
                                  GIẢI THÍCH ĐÁP ÁN GỢI Ý MÃ LỆNH
                                </label>
                                <input
                                  type="text"
                                  value={firstScratchExplanation}
                                  onChange={(e) => setFirstScratchExplanation(e.target.value)}
                                  className="w-full bg-white border rounded-xl py-1.5 px-3 text-xs outline-none"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="sm:col-span-2 text-right pt-2">
                      <button
                        id="btn_submit_manual_game"
                        type="submit"
                        className="w-full py-3 bg-kids-purple text-white hover:bg-violet-600 font-display font-black text-xs rounded-xl shadow-lg transition-transform duration-100 active:translate-y-0.5"
                      >
                        🚀 KHỞI TẠO GAME & GỬI DUYỆT KIỂM CHUẨN
                      </button>
                    </div>
                  </form>
                )}

                {creatorTab === "level" && (
                  /* ====================================
                     SUB-TAB 1: DONG PHUC LEVEL DESIGNER 
                     ==================================== */
                  <form onSubmit={triggerCreateCustomLevel} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                    <div className="sm:col-span-2">
                      <label className="block text-xxs font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                        CHỎN TRÒ CHƠI BẠN SỞ HỮU ĐỂ SỬA CẤP ĐỘ
                      </label>
                      <select
                        id="design_game_id"
                        required
                        value={designGameId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDesignGameId(val);
                          const selected = creatorGamesList.find(g => g.id === val);
                          if (selected) {
                            const nextLvlNum = (selected.levels?.length || 0) + 1;
                            setDesignLvlNum(String(nextLvlNum));
                            setDesignLvlTitle(`Màn ${nextLvlNum}: Sức Mạnh Trí Tuệ Mới`);
                            if (selected.template_code === "matching") {
                              setDesignPrompt(`Dọn dẹp & sắp xếp các cặp hình ghép phù hợp logic của bài học "${selected.title}"!`);
                            } else if (selected.template_code === "sequence") {
                              setDesignPrompt(`Tiếp nối nhịp độ quy trình tuần hoàn logic. Tìm phần tử tiếp theo lấp đầy dấu chấm hỏi (?)`);
                            } else if (selected.template_code === "memory") {
                              setDesignPrompt(`Rèn não siêu tốc: Hãy lật mở đúng đôi thẻ trang trí giống nhau tương phản thời gian thực!`);
                            } else if (selected.template_code === "scratch") {
                              setDesignPrompt(`Xếp các khối logic theo trật tự chuẩn để robot mèo vượt núi lửa chạm sao xanh.`);
                            }
                          }
                        }}
                        className="w-full bg-slate-50 border-2 rounded-xl py-2 px-3 text-xs font-bold outline-none border-slate-100 focus:border-kids-purple"
                      >
                        <option value="">-- Click Chọn Trò Chơi Thụ Lý --</option>
                        {creatorGamesList.map(g => (
                          <option key={g.id} value={g.id}>
                            [{g.category.toUpperCase()}] {g.title} ({g.levels?.length || 0} Màn đã có)
                          </option>
                        ))}
                      </select>
                    </div>

                    {designGameId && (
                      <>
                        <div>
                          <label className="block text-xxs font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                            MÀN SỐ (LEVEL NUMBER)
                          </label>
                          <input
                            id="design_lvl_num"
                            type="number"
                            required
                            placeholder="Ví dụ: 11"
                            value={designLvlNum}
                            onChange={(e) => setDesignLvlNum(e.target.value)}
                            className="w-full bg-slate-50 border-2 rounded-xl py-2 px-3 text-xs font-bold outline-none border-slate-100"
                          />
                        </div>

                        <div>
                          <label className="block text-xxs font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                            TIÊU ĐỀ MÀN CHƠI MỚI
                          </label>
                          <input
                            id="design_lvl_title"
                            type="text"
                            required
                            placeholder="Ví dụ: Lát Bánh Cuối Cùng"
                            value={designLvlTitle}
                            onChange={(e) => setDesignLvlTitle(e.target.value)}
                            className="w-full bg-slate-50 border-2 rounded-xl py-2 px-3 text-xs font-bold outline-none border-slate-100"
                          />
                        </div>

                        <div>
                          <label className="block text-xxs font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                            THƯỞNG XP (HOÀN THÀNH)
                          </label>
                          <input
                            id="design_lvl_xp"
                            type="number"
                            required
                            value={designLvlXp}
                            onChange={(e) => setDesignLvlXp(e.target.value)}
                            className="w-full bg-slate-50 border-2 rounded-xl py-2 px-3 text-xs font-bold outline-none border-slate-100"
                          />
                        </div>

                        <div>
                          <label className="block text-xxs font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                            THƯỞNG SAO XU (COIN)
                          </label>
                          <input
                            id="design_lvl_coin"
                            type="number"
                            required
                            value={designLvlCoin}
                            onChange={(e) => setDesignLvlCoin(e.target.value)}
                            className="w-full bg-slate-50 border-2 rounded-xl py-2 px-3 text-xs font-bold outline-none border-slate-100"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xxs font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                            YÊU CẦU DẪN DẮT (QUESTION PROMPT)
                          </label>
                          <input
                            id="design_prompt"
                            type="text"
                            required
                            placeholder="Nhập lời hướng dẫn trực quan sinh động..."
                            value={designPrompt}
                            onChange={(e) => setDesignPrompt(e.target.value)}
                            className="w-full bg-slate-50 border-2 rounded-xl py-2 px-3 text-xs font-semibold outline-none border-slate-100"
                          />
                        </div>

                        {/* TEMPLATE DYNAMICS BASED ON SELECTED GAME */}
                        {creatorGamesList.find(g => g.id === designGameId)?.template_code === "matching" && (
                          <div className="sm:col-span-2 bg-purple-50/50 p-4 rounded-2xl border border-purple-100 flex flex-col gap-3">
                            <span className="text-xxs font-black text-kids-purple uppercase tracking-wider block">
                              🔗 BIÊN SOẠN CẤU HÌNH: 4 CẶP GHÉP ĐỐI XỨNG PHẢN XẠ
                            </span>
                            <div className="grid grid-cols-2 gap-3 text-[10px] font-black text-slate-500 uppercase">
                              <div>VẾ TRÁI TRỰC QUAN</div>
                              <div>VẾ PHẢI KẾT QUẢ</div>
                            </div>
                            {designMatchingPairs.map((pair, idx) => (
                              <div key={idx} className="grid grid-cols-2 gap-3">
                                <input
                                  type="text"
                                  placeholder={`Trái ${idx + 1}`}
                                  value={pair.left}
                                  onChange={(e) => {
                                    const copy = [...designMatchingPairs];
                                    copy[idx].left = e.target.value;
                                    setDesignMatchingPairs(copy);
                                  }}
                                  className="w-full bg-white border outline-none rounded-xl py-2 px-3 text-xs font-bold focus:border-kids-purple"
                                />
                                <input
                                  type="text"
                                  placeholder={`Phải ${idx + 1}`}
                                  value={pair.right}
                                  onChange={(e) => {
                                    const copy = [...designMatchingPairs];
                                    copy[idx].right = e.target.value;
                                    setDesignMatchingPairs(copy);
                                  }}
                                  className="w-full bg-white border outline-none rounded-xl py-2 px-3 text-xs font-bold focus:border-kids-purple"
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {creatorGamesList.find(g => g.id === designGameId)?.template_code === "sequence" && (
                          <div className="sm:col-span-2 bg-amber-50/50 p-4 rounded-2xl border border-amber-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                            <div className="sm:col-span-2">
                              <span className="text-xxs font-black text-amber-700 uppercase tracking-wider block">
                                🧩 BIÊN SOẠN CẤU HÌNH: DÃY QUY LUẬT TUẦN HOÀN
                              </span>
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                DÃY TRƯỚC SẮP ĐẶT (cách nhau bởi phẩy)
                              </label>
                              <input
                                type="text"
                                value={designSeqString}
                                onChange={(e) => setDesignSeqString(e.target.value)}
                                className="w-full bg-white border outline-none rounded-xl py-2 px-3 text-xs font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                KẾT QUẢ ĐÚNG THAY CHO DẤU ?
                              </label>
                              <input
                                type="text"
                                value={designSeqAnswer}
                                onChange={(e) => setDesignSeqAnswer(e.target.value)}
                                className="w-full bg-white border outline-none rounded-xl py-2 px-3 text-xs font-bold"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                4 ĐÁP ÁN ĐỂ BÉ TRẮC NGHIỆM CHI TIẾT (cách nhau bởi phẩy)
                              </label>
                              <input
                                type="text"
                                value={designSeqOptions}
                                onChange={(e) => setDesignSeqOptions(e.target.value)}
                                className="w-full bg-white border outline-none rounded-xl py-2 px-3 text-xs font-bold"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                LỜI GIẢI THÍCH TRỰC QUAN KHI BÉ HOÀN THÀNH
                              </label>
                              <input
                                type="text"
                                value={designSeqExplanation}
                                onChange={(e) => setDesignSeqExplanation(e.target.value)}
                                className="w-full bg-white border outline-none rounded-xl py-2 px-3 text-xs font-medium"
                              />
                            </div>
                          </div>
                        )}

                        {creatorGamesList.find(g => g.id === designGameId)?.template_code === "memory" && (
                          <div className="sm:col-span-2 bg-blue-50/50 p-4 rounded-2xl border border-blue-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                            <div className="sm:col-span-2">
                              <span className="text-xxs font-black text-blue-700 uppercase tracking-wider block">
                                🧠 BIÊN SOẠN CẤU HÌNH: LẬT THẺ TRÍ NHỚ (MEMORY CARD)
                              </span>
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                CHỦ ĐỀ QUY ƯỚC
                              </label>
                              <select
                                value={designMemTheme}
                                onChange={(e) => setDesignMemTheme(e.target.value)}
                                className="w-full bg-white border outline-none rounded-xl py-2 px-3 text-xs font-bold"
                              >
                                <option value="trai_cay">Hoa quả nhiệt đới 🍉</option>
                                <option value="thu_vat">Động vật hoang dã 🦁</option>
                                <option value="phuong_tien">Phương tiện đi lại 🚗</option>
                                <option value="vu_tru">Khám phá vũ trụ 🚀</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                DANH SÁCH 5 - 6 EMOJI MATCHING (cách bởi phẩy)
                              </label>
                              <input
                                type="text"
                                value={designMemEmojis}
                                onChange={(e) => setDesignMemEmojis(e.target.value)}
                                className="w-full bg-white border outline-none rounded-xl py-2 px-3 text-xs font-bold"
                              />
                            </div>
                          </div>
                        )}

                        {creatorGamesList.find(g => g.id === designGameId)?.template_code === "scratch" && (
                          <div className="sm:col-span-2 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-105 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                            <div className="sm:col-span-2">
                              <span className="text-xxs font-black text-emerald-700 uppercase tracking-wider block">
                                🤖 BIÊN SOẠN CẤU HÌNH: ROBOT LẬP TRÌNH SCRATCH (CODE BLOCK)
                              </span>
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                TỌA ĐỘ BAN ĐẦU (JSON CHUẨN)
                              </label>
                              <input
                                type="text"
                                value={designScratchStartScene}
                                onChange={(e) => setDesignScratchStartScene(e.target.value)}
                                className="w-full bg-white border outline-none rounded-xl py-2 px-3 text-xs font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                CHUỖI KHỐI LỆNH ĐÚNG (Ký tự cách bởi phẩy)
                              </label>
                              <input
                                type="text"
                                value={designScratchSequence}
                                onChange={(e) => setDesignScratchSequence(e.target.value)}
                                className="w-full bg-white border outline-none rounded-xl py-2 px-3 text-xs font-mono"
                              />
                            </div>
                          </div>
                        )}

                        <div className="sm:col-span-2 pt-2 text-right">
                          <button
                            id="btn_submit_custom_level"
                            type="submit"
                            className="w-full sm:w-auto py-3 px-8 bg-kids-purple text-white hover:bg-violet-500 font-display font-black text-xs rounded-2xl shadow-md transition-all kids-btn-shadow-purple"
                          >
                            🚀 ĐỒNG BỘ CẬP NHẬT MÀN CHƠI CHUYÊN NGHIỆP
                          </button>
                        </div>
                      </>
                    )}
                  </form>
                )}

                {creatorTab === "package" && (
                  /* ====================================
                     SUB-TAB 2: PACKAGE GAME DUMMY UPLOADER
                     ==================================== */
                  <div className="flex flex-col gap-4 text-left">
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      Lập trình viên và Nhà thiết kế giáo dục có thể đóng gói hàng loạt màn chơi của riêng mình dưới dạng 
                      mật mã <strong>JSON đặc thù</strong> dưới đây rồi tải lên. Hệ thống sẽ giải mã cấu trúc game 
                      tiết kiệm thời gian!
                    </p>

                    {/* Drag-and-drop file receiver area */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragActive(true);
                      }}
                      onDragLeave={() => setDragActive(false)}
                      onDrop={async (e) => {
                        e.preventDefault();
                        setDragActive(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = async (evt) => {
                            try {
                              const json = JSON.parse(evt.target?.result as string);
                              await triggerUploadGameJson(json);
                            } catch (err) {
                              setAdminMessage("🚨 Lỗi phân tích File! Định dạng tệp tin đóng gói không vượt qua tiêu chuẩn JSON.");
                            }
                          };
                          reader.readAsText(file);
                        }
                      }}
                      className={`border-3 border-dashed rounded-3xl p-6 text-center transition-all ${
                        dragActive 
                          ? "border-kids-purple bg-purple-50/50 scale-[0.99]" 
                          : "border-slate-200 bg-slate-50 hover:bg-slate-100/50"
                      }`}
                    >
                      <span className="text-3xl block mb-2">📁</span>
                      <span className="text-xs font-black text-slate-700 block mb-1">
                        Kéo & Thả Tệp Tin JSON Chứa Gói Thiết Kế
                      </span>
                      <span className="text-xxs text-slate-400 block mb-3 font-mono">
                        Hoặc click để chọn một file từ PC của bạn
                      </span>
                      
                      <label className="inline-block py-2 px-4 bg-white border shadow-xs rounded-xl text-xxs font-extrabold text-slate-600 hover:text-slate-900 cursor-pointer transition-transform duration-150 hover:scale-105 select-none font-sans">
                        📁 Chọn Tệp Tin .JSON
                        <input
                          id="file_pack_uploader"
                          type="file"
                          accept=".json"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = async (evt) => {
                                try {
                                  const json = JSON.parse(evt.target?.result as string);
                                  await triggerUploadGameJson(json);
                                } catch (err) {
                                  setAdminMessage("🚨 Định dạng hồ sơ tệp tải lên không hợp lệ hoặc sai cấu trúc JSON.");
                                }
                              };
                              reader.readAsText(file);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="block text-xxs font-bold text-slate-400 uppercase tracking-widest font-mono">
                        HOẶC DÁN CHUỖI MÃ JSON ĐÓNG GÓI SẴN VÀO ĐÂY:
                      </label>
                      <textarea
                        id="text_area_json_upload"
                        rows={5}
                        placeholder={`{
  "id": "g_custom_creative",
  "title": "IQ Nhà Toán Học Trẻ G8",
  "category": "math",
  "template_code": "sequence",
  "price": 0,
  "levels": [...]
}`}
                        value={uploadJsonString}
                        onChange={(e) => setUploadJsonString(e.target.value)}
                        className="w-full font-mono text-xxs bg-slate-50 border-2 rounded-xl p-3 outline-none"
                      />
                      
                      <div className="flex items-center justify-between mt-1">
                        {/* Example fast-insert option */}
                        <button
                          id="btn_sample_json_fill"
                          type="button"
                          onClick={() => {
                            setUploadJsonString(JSON.stringify({
                              id: "g_custom_creative_1",
                              title: "IQ Siêu Động Vật 🦁",
                              category: "iq",
                              template_code: "matching",
                              price: 0,
                              grade_from: 1,
                              grade_to: 5,
                              levels: [
                                {
                                  level_num: 1,
                                  title: "Cặp Ghép Sinh Động",
                                  xp_reward: 120,
                                  coin_reward: 35,
                                  questions: [{
                                    id: "q_import_1",
                                    question_type: "matching",
                                    prompt: "Ghép đúng cặp đôi sở thích thú cưng của bé!",
                                    points: 30,
                                    data: {
                                      pairs: [
                                        { left: "Chuối Thơm 🍌", right: "Khỉ Con 🐒" },
                                        { left: "Mật Thơm 🍯", right: "Gấu Cỏ 🐻" }
                                      ]
                                    }
                                  }]
                                }
                              ]
                            }, null, 2));
                          }}
                          className="text-[10px] text-kids-purple hover:underline font-bold"
                        >
                          📝 Dán mã JSON mẫu thử nghiệm siêu tốc
                        </button>

                        <button
                          id="submit_upload_package"
                          type="button"
                          onClick={() => triggerUploadGameJson()}
                          className="py-2.5 px-6 bg-kids-purple text-white hover:bg-violet-500 font-display font-black text-xs rounded-xl shadow transition-all duration-150"
                        >
                          📦 Giải Mã & Kích Hoạt Game
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {creatorTab === "review" && (
                  <div className="flex flex-col gap-4 text-left">
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl p-4 flex gap-3 items-center">
                      <span className="text-2xl">⚖️</span>
                      <div>
                        <h4 className="text-xs font-extrabold text-indigo-900 uppercase">HỆ THỐNG PHÊ DUYỆT GIÁO TRÌNH (ADMIN PANEL)</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                          Kiểm định tính đúng đắn sư phạm, chất lượng đồ họa và phân khúc lớp học của các game do Giáo viên tự tải lên trước khi mang lên Store.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      {reviewQueue.map((item) => (
                        <div key={item.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-2 border-b border-dashed pb-2">
                            <div>
                              <span className="text-2xs font-mono text-slate-400 uppercase block">MÃ GAME: {item.id}</span>
                              <h5 className="font-display font-extrabold text-slate-800 text-sm flex items-center gap-1.5 font-sans">
                                <span className="text-lg">{item.thumbnail || "🎒"}</span> {item.title}
                              </h5>
                              <p className="text-[10px] text-slate-500 mt-1">
                                Người tạo: <strong className="text-kids-purple">{item.creator_name || "Nhà sáng tạo ẩn danh"}</strong> (ID: {item.creator_id})
                              </p>
                            </div>
                            <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full ${
                              item.review_status === "approved"
                                ? "bg-emerald-100 text-emerald-800"
                                : item.review_status === "rejected"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}>
                              {item.review_status || "Chờ duyệt"}
                            </span>
                          </div>

                          <div className="text-xs text-slate-600 leading-relaxed font-semibold">
                            💬 Mô tả: <span className="font-normal text-slate-500">{item.description}</span>
                          </div>

                          <div className="text-xs font-mono text-slate-500 flex flex-wrap gap-4 bg-white/70 p-2.5 rounded-xl border border-slate-100">
                            <div><strong>Template:</strong> <span className="text-kids-purple font-sans font-semibold">{item.template_code}</span></div>
                            <div><strong>Khoảng lớp:</strong> Lớp {item.grade_from} - Lớp {item.grade_to}</div>
                            <div><strong>Phí tải:</strong> {item.price} Coins</div>
                            <div><strong>Màn chơi hiện có:</strong> {item.levels?.length || 0} màn</div>
                          </div>

                          {/* Approval / Rejection tools */}
                          <div className="flex flex-col gap-2 mt-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                              Ý kiến phê duyệt / Lý do từ chối cải tiến:
                            </label>
                            <input
                              type="text"
                              placeholder="Nhập nhận xét của ban kiểm chuẩn giáo dục..."
                              value={reviewFeedbackText[item.id] || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setReviewFeedbackText(prev => ({ ...prev, [item.id]: val }));
                              }}
                              className="w-full bg-white border outline-none rounded-xl py-2 px-3 text-xs font-medium"
                            />
                            
                            <div className="flex gap-2 justify-end mt-1 font-sans">
                              <button
                                type="button"
                                onClick={() => triggerReviewDecide(item.id, "reject")}
                                className="py-1.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl transition-all"
                              >
                                ❌ Từ Chối Phê Duyệt
                              </button>
                              <button
                                type="button"
                                onClick={() => triggerReviewDecide(item.id, "approve")}
                                className="py-1.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl transition-all"
                              >
                                ✅ Duyệt Cấp Phép & Publish Sàn
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {reviewQueue.length === 0 && (
                        <div className="text-center py-12 text-slate-400 font-medium">
                          Hệ thống hiện tại rỗng không có game nào thuộc hàng chờ phê duyệt.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {adminMessage && (
                  <div className="mt-2 bg-purple-50 text-purple-700 font-bold text-xs p-3 rounded-xl border border-purple-100 text-center animate-pulse">
                    {adminMessage}
                  </div>
                )}
              </div>

              {/* Box Right: Dynamic sales logs chart (5 cols) */}
              <div className="lg:col-span-5 bg-white rounded-3xl p-5 border shadow border-slate-100 flex flex-col gap-4">
                <h3 className="font-display text-base text-slate-800 font-black border-b pb-2 text-center">
                  📈 BIỂU ĐỒ CON DOANH THU CHO DOANH NGHIỆP EdTech
                </h3>

                <div className="h-[220px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={[
                        { name: "20Q4", doanh_thu: 300000 },
                        { name: "21Q1", doanh_thu: 450000 },
                        { name: "21Q2", doanh_thu: 890000 },
                        { name: "21Q3", doanh_thu: 1500000 },
                        { name: "21Q4", doanh_thu: 2600000 }
                      ]}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorDoanhThu" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FF6B8B" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#FF6B8B" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0"/>
                      <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false}/>
                      <YAxis stroke="#94A3B8" fontSize={10} tickLine={false}/>
                      <Tooltip />
                      <Area type="monotone" dataKey="doanh_thu" stroke="#FF6B8B" strokeWidth={3} fillOpacity={1} fill="url(#colorDoanhThu)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border text-xxs leading-relaxed text-slate-500 text-center font-medium">
                  💳 Giao dịch phát sinh tự động tích luỹ dồn khi phụ huynh kích chuột mua bản quyền game cho con trên website.
                </div>
              </div>

            </div>

          </div>
        )}

        {/* =========================================================
            J. TECH STUDY ARCHITECTURE BOARD TAB (CTO SCREEN)
            ========================================================= */}
        {activeTab === "tech_arch" && (
          <TechArchBoard />
        )}

      </main>

      {/* 4. FOOTER CREDITS */}
      <footer className="bg-slate-900 border-t-4 border-slate-950 text-slate-400 text-xs py-8 px-4 text-center mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-left">
            <h5 className="font-display font-extrabold text-sm text-white">IQ KIDS MARKET EdTech Startup</h5>
            <p className="text-xxs text-slate-500 mt-1">Sản phẩm thử nghiệm MVP sáng tạo kết hợp Game Store và Gamification dành riêng cho học sinh Việt Nam.</p>
          </div>
          <span className="text-3xs font-mono text-slate-600 tracking-wider uppercase">
            © 2026 IQ Kids Inc. Powered by Gemini & AI Studio
          </span>
        </div>
      </footer>

    </div>
  );
}

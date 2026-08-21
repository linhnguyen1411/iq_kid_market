export interface QuestionData {
  id: string;
  question_type: 'matching' | 'sequence' | 'memory' | 'multiple_choice';
  prompt: string;
  points: number;
  data: any; // Dynamic depending on game type
}

export interface GameLevel {
  id: string;
  level_num: number;
  title: string;
  xp_reward: number;
  coin_reward: number;
  questions: QuestionData[];
}

export interface Game {
  id: string;
  title: string;
  description: string;
  detailed_description: string;
  thumbnail: string;
  price: number;
  grade_from: number;
  grade_to: number;
  template_code: 'matching' | 'sequence' | 'memory';
  is_published: boolean;
  rating_avg: number;
  plays_count: number;
  category: string; // "math", "vietnamese", "english", "iq", "scratch"
  levels: GameLevel[];
}

export const SEED_GAMES: Game[] = [
  {
    id: "g1",
    title: "Ghép Cặp Thần Tốc",
    description: "Rèn luyện phản xạ nhanh nhạy qua việc nối hình ảnh, phép tính với đáp án đúng.",
    detailed_description: "Chào mừng các nhà thám hiểm nhí! Trong game này, con sẽ được thử thách trí thông minh bằng cách nối các cặp hình ảnh ngộ nghĩnh, từ vựng tiếng Anh bổ ích, và các phép toán diệu kỳ với nhau. Hoàn thành màn chơi thật nhanh để nhận được danh hiệu 'Nhà Toán Học Nhí' và 'Vua Từ Vựng' nhé!",
    thumbnail: "⚡",
    price: 0, // Free
    grade_from: 1,
    grade_to: 3,
    template_code: "matching",
    is_published: true,
    rating_avg: 4.8,
    plays_count: 1250,
    category: "iq",
    levels: Array.from({ length: 30 }, (_, index) => {
      const isGrade1 = index < 10;
      const isGrade2 = index >= 10 && index < 20;
      const grade = isGrade1 ? 1 : isGrade2 ? 2 : 3;
      const levelNum = index + 1;
      
      // Setup various questions
      let prompt = "";
      let pairs: { left: string; right: string }[] = [];
      
      if (isGrade1) {
        if (levelNum % 3 === 0) {
          prompt = `Phép toán cộng trừ cơ bản (Lớp 1 - Màn ${levelNum})`;
          pairs = [
            { left: "1 + 1", right: "2" },
            { left: "2 + 1", right: "3" },
            { left: "3 + 1", right: "4" },
            { left: "3 + 2", right: "5" }
          ];
        } else if (levelNum % 3 === 1) {
          prompt = `Tiếng Anh con vật siêu vui (Lớp 1 - Màn ${levelNum})`;
          pairs = [
            { left: "Cat 🐱", right: "Con mèo" },
            { left: "Dog 🐶", right: "Con chó" },
            { left: "Fish 🐟", right: "Con cá" },
            { left: "Bird 🐦", right: "Con chim" }
          ];
        } else {
          prompt = `Thời tiết & Thiên nhiên (Lớp 1 - Màn ${levelNum})`;
          pairs = [
            { left: "Sun ☀️", right: "Mặt trời" },
            { left: "Rain 🌧️", right: "Cơn mưa" },
            { left: "Wind 💨", right: "Cơn gió" },
            { left: "Snow ❄️", right: "Tuyết rơi" }
          ];
        }
      } else if (isGrade2) {
        if (levelNum % 3 === 0) {
          prompt = `Phép nhân phân chia diệu kỳ (Lớp 2 - Màn ${levelNum})`;
          pairs = [
            { left: "2 x 3", right: "6" },
            { left: "5 x 2", right: "10" },
            { left: "3 x 4", right: "12" },
            { left: "8 : 2", right: "4" }
          ];
        } else if (levelNum % 3 === 1) {
          prompt = `Từ vựng trái cây tiếng Anh (Lớp 2 - Màn ${levelNum})`;
          pairs = [
            { left: "Apple 🍎", right: "Quả táo" },
            { left: "Banana 🍌", right: "Quả chuối" },
            { left: "Orange 🍊", right: "Quả cam" },
            { left: "Strawberry 🍓", right: "Quả dâu" }
          ];
        } else {
          prompt = `Màu sắc vui nhộn (Lớp 2 - Màn ${levelNum})`;
          pairs = [
            { left: "Red 🔴", right: "Màu đỏ" },
            { left: "Blue 🔵", right: "Màu xanh dương" },
            { left: "Green 🟢", right: "Màu xanh lá" },
            { left: "Yellow 🟡", right: "Màu vàng" }
          ];
        }
      } else {
        // Grade 3
        if (levelNum % 3 === 0) {
          prompt = `Hình học & Số học phức tạp (Lớp 3 - Màn ${levelNum})`;
          pairs = [
            { left: "Square ⬜", right: "Hình vuông" },
            { left: "Triangle 🔺", right: "Hình tam giác" },
            { left: "Circle 🔴", right: "Hình tròn" },
            { left: "Cube 🧊", right: "Hình lập phương" }
          ];
        } else if (levelNum % 3 === 1) {
          prompt = `Nghề nghiệp tiếng Anh (Lớp 3 - Màn ${levelNum})`;
          pairs = [
            { left: "Doctor 🧑‍⚕️", right: "Bác sĩ" },
            { left: "Teacher 🧑‍🏫", right: "Giáo viên" },
            { left: "Pilot 🧑‍✈️", right: "Phi công" },
            { left: "Chef 🧑‍🍳", right: "Đầu bếp" }
          ];
        } else {
          prompt = `Từ trái nghĩa (Lớp 3 - Màn ${levelNum})`;
          pairs = [
            { left: "Big (To)", right: "Small (Nhỏ)" },
            { left: "Fast (Nhanh)", right: "Slow (Chậm)" },
            { left: "Happy (Vui)", right: "Sad (Buồn)" },
            { left: "Hot (Nóng)", right: "Cold (Lạnh)" }
          ];
        }
      }

      return {
        id: `matching_l${levelNum}`,
        level_num: levelNum,
        title: `Màn ${levelNum}: ${isGrade1 ? "Khởi đầu" : isGrade2 ? "Thử thách" : "Bản lĩnh"}`,
        xp_reward: 50 + (grade * 10),
        coin_reward: 10 + (grade * 5),
        questions: [
          {
            id: `mq_${levelNum}`,
            question_type: "matching",
            prompt: prompt,
            points: 10 + (grade * 2),
            data: { pairs }
          }
        ]
      };
    })
  },
  {
    id: "g2",
    title: "Truy Tìm Quy Luật",
    description: "Điền số tiếp theo vào chuỗi quy luật logic. Rèn tư duy toán học toàn diện.",
    detailed_description: "Tìm kiếm mối quan hệ ẩn giấu đằng sau những con số đầy mê hoặc! Trò chơi giúp con rèn luyện tư duy logic, nhận diện chuỗi quy luật và dự đoán xu hướng. Từ đó tăng cường kỹ năng phân tích và rèn luyện vượt trội bán cầu não trái.",
    thumbnail: "🧩",
    price: 15000, // 15k VND
    grade_from: 1,
    grade_to: 3,
    template_code: "sequence",
    is_published: true,
    rating_avg: 4.7,
    plays_count: 890,
    category: "math",
    levels: Array.from({ length: 30 }, (_, index) => {
      const isGrade1 = index < 10;
      const isGrade2 = index >= 10 && index < 20;
      const grade = isGrade1 ? 1 : isGrade2 ? 2 : 3;
      const levelNum = index + 1;
      
      let sequence: string[] = [];
      let answer = "";
      let explanation = "";
      
      if (isGrade1) {
        // Grade 1 level sequences: Step +1 or +2
        if (levelNum % 3 === 1) {
          const step = 1;
          const start = levelNum;
          sequence = [String(start), String(start + step), String(start + 2*step), String(start + 3*step), "?"];
          answer = String(start + 4*step);
          explanation = "Cộng thêm 1 vào số đứng trước.";
        } else if (levelNum % 3 === 2) {
          const step = 2;
          const start = levelNum * 2;
          sequence = [String(start), String(start + step), String(start + 2*step), String(start + 3*step), "?"];
          answer = String(start + 4*step);
          explanation = "Cộng thêm 2 (quy luật số chẵn).";
        } else {
          // Backward step
          sequence = ["10", "9", "8", "7", "?"];
          answer = "6";
          explanation = "Bớt đi 1 đơn vị đằng sau.";
        }
      } else if (isGrade2) {
        // Grade 2: Step +5, +10 or multiplying by 2
        if (levelNum % 3 === 1) {
          const step = 5;
          const start = levelNum * 5;
          sequence = [String(start), String(start + step), String(start + 2*step), String(start + 3*step), "?"];
          answer = String(start + 4*step);
          explanation = "Quy luật cộng thêm 5.";
        } else if (levelNum % 3 === 2) {
          const start = 3;
          sequence = [String(start), String(start * 2), String(start * 4), String(start * 8), "?"];
          answer = String(start * 16);
          explanation = "Nhân đôi số phía trước (gấp 2 lần).";
        } else {
          sequence = ["100", "90", "80", "70", "?"];
          answer = "60";
          explanation = "Trừ đi 10 đơn vị ở số đứng trước.";
        }
      } else {
        // Grade 3: More challenging
        if (levelNum % 3 === 1) {
          // Double subtract
          sequence = ["1", "3", "2", "4", "3", "5", "?"];
          answer = "4";
          explanation = "Cộng 2 rồi trừ 1 xen kẽ (+2, -1, +2, -1).";
        } else if (levelNum % 3 === 2) {
          // Fibonacci-like
          sequence = ["1", "2", "3", "5", "8", "13", "?"];
          answer = "21";
          explanation = "Số tiếp theo là tổng của 2 số liền trước.";
        } else {
          // Square sequence
          sequence = ["1", "4", "9", "16", "?"];
          answer = "25";
          explanation = "Dãy số chính phương (1x1, 2x2, 3x3, 4x4, 5x5).";
        }
      }

      return {
        id: `sequence_l${levelNum}`,
        level_num: levelNum,
        title: `Màn ${levelNum}: Quy luật số học`,
        xp_reward: 60 + (grade * 10),
        coin_reward: 12 + (grade * 5),
        questions: [
          {
            id: `sq_${levelNum}`,
            question_type: "sequence",
            prompt: "Tìm con số thích hợp điền vào dấu chấm hỏi (?)",
            points: 12 + (grade * 3),
            data: {
              sequence,
              answer,
              explanation
            }
          }
        ]
      };
    })
  },
  {
    id: "g3",
    title: "Vua Ghi Nhớ",
    description: "Nhớ vị trí lật thẻ hình lộng lẫy để rèn siêu trí tuệ quang học.",
    detailed_description: "Phát triển khả năng tập trung cao độ và rèn lưu giữ trí nhớ ngắn hạn! Trẻ lật các quân bài ngộ nghĩnh, tìm kiếm những cặp hình ảnh giống hệt nhau về chủ đề loài vật, khoa học và trường học. Thử thách tính giờ sinh động thúc đẩy não bộ hoạt động linh hoạt.",
    thumbnail: "🧠",
    price: 25000, // 25k VND
    grade_from: 1,
    grade_to: 3,
    template_code: "memory",
    is_published: true,
    rating_avg: 4.9,
    plays_count: 2100,
    category: "iq",
    levels: Array.from({ length: 30 }, (_, index) => {
      const isGrade1 = index < 10;
      const isGrade2 = index >= 10 && index < 20;
      const grade = isGrade1 ? 1 : isGrade2 ? 2 : 3;
      const levelNum = index + 1;
      
      let items: string[] = [];
      let cardTheme = "animals";
      
      if (isGrade1) {
        cardTheme = "con_vat";
        // 2x2 or 2x3 grids (4 or 6 cards)
        if (levelNum % 2 === 1) {
          items = ["🐱", "🐶"]; // 2 pairs (4 cards)
        } else {
          items = ["🐱", "🐶", "🐻"]; // 3 pairs (6 cards)
        }
      } else if (isGrade2) {
        cardTheme = "trai_cay";
        // 2x4 grid (8 cards) or 3x4 (12 cards - let's keep to 8 or 10 for simplicity on mobile)
        if (levelNum % 2 === 1) {
          items = ["🍎", "🍌", "🍇", "🍊"]; // 4 pairs (8 cards)
        } else {
          items = ["🍎", "🍌", "🍇", "🍊", "🍉"]; // 5 pairs (10 cards)
        }
      } else {
        cardTheme = "truong_hoc";
        // 3x4 grid (12 cards) or 4x4 (16 cards)
        if (levelNum % 2 === 1) {
          items = ["🎒", "✏️", "📐", "📕", "🎨", "🏫"]; // 6 pairs (12 cards)
        } else {
          items = ["🎒", "✏️", "📐", "📕", "🎨", "🏫", "🚀", "🛸"]; // 8 pairs (16 cards)
        }
      }

      return {
        id: `memory_l${levelNum}`,
        level_num: levelNum,
        title: `Màn ${levelNum}: ${cardTheme === "con_vat" ? "Sở thú" : cardTheme === "trai_cay" ? "Khu vườn" : "Khoa học"}`,
        xp_reward: 70 + (grade * 10),
        coin_reward: 15 + (grade * 5),
        questions: [
          {
            id: `mq_${levelNum}`,
            question_type: "memory",
            prompt: "Lật các thẻ bài để tìm toàn bộ cặp trùng khớp với nhau!",
            points: 15 + (grade * 2),
            data: {
              theme: cardTheme,
              items: items
            }
          }
        ]
      };
    })
  },
  {
    id: "g_scratch_studio",
    title: "Lập Trình Robot Scratch",
    description: "Lắp ráp các khối thuật toán logic tư duy để chỉ huy phi thuyền hoặc chuyển động chú mèo.",
    detailed_description: "Chào mừng con đến với Studio Lập Trình Robot Scratch cực đỉnh! Tại đây con sẽ được làm quen với tư duy thuật toán máy tính, học cách lắp ghép các khối lệnh tuần tự, vòng lặp lặp lại, hay xoay góc rẽ hướng linh hoạt để dắt đường chú mèo lập trình và chiếc phi thuyền giải quyết 9 thử thách mê cung từ dễ đến nâng cao. Nhận ngay huy hiệu danh giá và hàng trăm XP thưởng nhé!",
    thumbnail: "🤖",
    price: 0,
    grade_from: 1,
    grade_to: 9,
    template_code: "memory",
    is_published: true,
    rating_avg: 4.9,
    plays_count: 2840,
    category: "scratch",
    levels: []
  },
  {
    id: "g_iq_thuc_te",
    title: "Thử Thách IQ Thực Tế",
    description: "Giải đố các tình huống thực tế đời sống gần gũi giúp phát triển phản xạ nhanh nhạy và tư duy thông thái.",
    detailed_description: "Kho trò chơi thực tế thiết kế riêng để nuôi dưỡng tinh thần khám phá thế giới xung quanh một cách khoa học! Bạn nhỏ sẽ được đặt vào 10 tình huống thực tế sinh động: từ xem giờ đồng hồ bữa cơm gia đình, tính lát bánh cắt sinh nhật, dọn dẹp phân phối đồ ăn thú cưng, đến việc tuân thủ chu kỳ đèn đỏ đèn xanh trên hè phố. Vừa học vừa chơi, tăng tốc phản xạ giải quyết vấn đề!",
    thumbnail: "💡",
    price: 0,
    grade_from: 1,
    grade_to: 5,
    template_code: "sequence",
    is_published: true,
    rating_avg: 4.95,
    plays_count: 1420,
    category: "iq",
    levels: [
      {
        id: "iq_real_l1",
        level_num: 1,
        title: "Dịch chuyển Kim Giờ",
        xp_reward: 80,
        coin_reward: 20,
        questions: [
          {
            id: "iq_real_q1",
            question_type: "sequence",
            prompt: "Sau mỗi tiếng cơm trưa, chiếc kim giờ dịch chuyển thêm 1 nấc mới. Điền mốc tiếp theo hoàn thành quy luật thời gian thực tế!",
            points: 15,
            data: {
              sequence: ["1 giờ", "2 giờ", "3 giờ", "4 giờ", "?"],
              answer: "5 giờ",
              options: ["5 giờ", "6 giờ", "12 giờ", "8 giờ"],
              explanation: "Thời gian trôi xuôi chiều liên tiếp nhau nên sau 4 giờ sẽ đến mốc 5 giờ."
            }
          }
        ]
      },
      {
        id: "iq_real_l2",
        level_num: 2,
        title: "Bánh Ngọt Sinh Nhật",
        xp_reward: 95,
        coin_reward: 25,
        questions: [
          {
            id: "iq_real_q2",
            question_type: "sequence",
            prompt: "Một nhát gập đôi tờ giấy tạo 2 bề bề mặt. Hãy đoán quy luật nhân đôi để biết số phần bánh khi ta dùng 3 đường cắt đối xứng tâm!",
            points: 20,
            data: {
              sequence: ["1 nhát: 2 phần", "2 nhát: 4 phần", "3 nhát: ?"],
              answer: "8 phần",
              options: ["6 phần", "8 phần", "10 phần", "12 phần"],
              explanation: "Mỗi nhát cắt chia đôi không gian vuông góc chéo đối xứng tạo ra cấp số nhân đôi: 2, 4, rồi đến 8 phần bằng nhau."
            }
          }
        ]
      },
      {
        id: "iq_real_l3",
        level_num: 3,
        title: "Bữa Tiệc Thú Cưng",
        xp_reward: 90,
        coin_reward: 20,
        questions: [
          {
            id: "iq_real_q3",
            question_type: "matching",
            prompt: "Bé dọn thức ăn thực tế cho các bạn thú cưng của gia đình. Hãy ghép cặp đúng món ăn được chúng yêu thích nhất!",
            points: 25,
            data: {
              pairs: [
                { left: "Cá 🐟 yêu thích của", right: "Mèo con 🐱" },
                { left: "Khúc xương 🦴 cho", right: "Chó cưng 🐶" },
                { left: "Cà rốt 🥕 cho", right: "Thỏ béo 🐰" },
                { left: "Phô mai thơm 🧀 cho", right: "Chuột Hamster 🐹" }
              ]
            }
          }
        ]
      },
      {
        id: "iq_real_l4",
        level_num: 4,
        title: "Hạ thủy Thuyền Buồm",
        xp_reward: 100,
        coin_reward: 22,
        questions: [
          {
            id: "iq_real_q4",
            question_type: "sequence",
            prompt: "Đoàn thuyền buồm hạ thủy theo hàng sặc sỡ trên nền cát vàng. Bạn nhỏ hãy dự kiến màu của chiếc thuyền thứ năm!",
            points: 15,
            data: {
              sequence: ["⛵ Đỏ", "⛵ Xanh", "⛵ Đỏ", "⛵ Xanh", "?"],
              answer: "⛵ Đỏ",
              options: ["⛵ Đỏ", "⛵ Xanh", "⛵ Vàng", "⛵ Tím"],
              explanation: "Quy luật sắp đặt xen kẽ liên tục hai màu sắc tuần hoàn: Đỏ rồi tới Xanh."
            }
          }
        ]
      },
      {
        id: "iq_real_l5",
        level_num: 5,
        title: "Đèn Giao Thông Đô Thị",
        xp_reward: 100,
        coin_reward: 25,
        questions: [
          {
            id: "iq_real_q5",
            question_type: "sequence",
            prompt: "Đèn báo hiệu tự động xoay chuyển trên đường phố. Hãy tìm tín hiệu tiếp theo để người đi bộ dừng hoặc chuẩn bị!",
            points: 20,
            data: {
              sequence: ["🔴 Đỏ (Dừng)", "🟢 Xanh (Đi)", "🟡 Vàng (Chậm)", "🔴 Đỏ (Dừng)", "?"],
              answer: "🟢 Xanh (Đi)",
              options: ["🟢 Xanh (Đi)", "🔴 Đỏ (Dừng)", "🟡 Vàng (Chậm)", "🔵 Xanh lam"],
              explanation: "Vòng xoay chu kỳ quy chuẩn giao thông luôn là Đỏ chuyển sang Xanh, rồi đến Vàng và lặp lại từ đầu."
            }
          }
        ]
      },
      {
        id: "iq_real_l6",
        level_num: 6,
        title: "Xếp Hàng Đón Xe Bus",
        xp_reward: 110,
        coin_reward: 25,
        questions: [
          {
            id: "iq_real_q6",
            question_type: "sequence",
            prompt: "Bé trai và Bé gái xếp hàng trật tự lên xe dã ngoại. Hãy đoán xem vị trí thứ năm là bạn Nam hay Nữ?",
            points: 22,
            data: {
              sequence: ["1. Bạn Nam", "2. Bạn Nữ", "3. Bạn Nam", "4. Bạn Nữ", "?"],
              answer: "5. Bạn Nam",
              options: ["5. Bạn Nam", "5. Bạn Nữ", "5. Bác Tài Xế", "5. Cô Giáo"],
              explanation: "Đội ngũ xếp hàng xen kẽ nhịp nhàng tuần hoàn liên tục: Nam -> Nữ -> Nam -> Nữ -> Nam."
            }
          }
        ]
      },
      {
        id: "iq_real_l7",
        level_num: 7,
        title: "Dấu tích Lốp Xe trên sân",
        xp_reward: 120,
        coin_reward: 30,
        questions: [
          {
            id: "iq_real_q7",
            question_type: "matching",
            prompt: "Tìm dấu vết lốp xe in hằn trên nền cát ẩm để phá án truy vết phương tiện giao thông đời thường nhé!",
            points: 25,
            data: {
              pairs: [
                { left: "Xe đạp 🚲 tạo", right: "1 vệt lốp mỏng dẹt" },
                { left: "Xe máy điện 🏍️ tạo", right: "1 vệt lốp dày có gai sâu" },
                { left: "Xe ô tô con 🚗 tạo", right: "2 vệt lốp song song cỡ vừa" },
                { left: "Xe máy cày 🚜 tạo", right: "2 vệt lốp khổng lồ gai răng cưa" }
              ]
            }
          }
        ]
      },
      {
        id: "iq_real_l8",
        level_num: 8,
        title: "Tước vị Thờ Gian dã ngoại",
        xp_reward: 115,
        coin_reward: 28,
        questions: [
          {
            id: "iq_real_q8",
            question_type: "sequence",
            prompt: "Các tháng đi dã ngoại của trường cách đều nhau 2 tháng (Tháng lẻ). Hãy tìm kỳ dã ngoại kế tiếp!",
            points: 20,
            data: {
              sequence: ["Tháng 1", "Tháng 3", "Tháng 5", "Tháng 7", "?"],
              answer: "Tháng 9",
              options: ["Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11"],
              explanation: "Cứ cách 2 tháng trường sẽ đi chơi dã ngoại 1 lần (dãy số tăng cách đều +2 đơn vị lẻ)."
            }
          }
        ]
      },
      {
        id: "iq_real_l9",
        level_num: 9,
        title: "Chỉ số Rót Nước ngọt",
        xp_reward: 125,
        coin_reward: 30,
        questions: [
          {
            id: "iq_real_q9",
            question_type: "sequence",
            prompt: "Lượng nước được rót đầy bình tăng tiến đều đặn qua mỗi bữa giải khát. Hãy tìm nấc can nước cuối cùng!",
            points: 25,
            data: {
              sequence: ["250 ml", "500 ml", "750 ml", "?"],
              answer: "1000 ml",
              options: ["800 ml", "900 ml", "1000 ml", "1200 ml"],
              explanation: "Lượng nước tăng dần đều 250ml sau mỗi lần rót dồn (250 -> 500 -> 750 -> 1000ml)."
            }
          }
        ]
      },
      {
        id: "iq_real_l10",
        level_num: 10,
        title: "Nhà thông thái Phân Loại Rác",
        xp_reward: 150,
        coin_reward: 40,
        questions: [
          {
            id: "iq_real_q10",
            question_type: "matching",
            prompt: "Hãy giúp thành phố xanh tươi sạch đẹp bằng cách ghép rác sinh hoạt đời sống vào đúng thùng phân loại!",
            points: 30,
            data: {
              pairs: [
                { left: "Vỏ chuối, rau thừa 🌽 ném vào", right: "Thùng Rác Hữu Cơ 🍏" },
                { left: "Chai nhựa, vỏ lon 🥤 ném vào", right: "Thùng Rác Tái Chế 🔄" },
                { left: "Pin hỏng, bóng đèn 🔋 ném vào", right: "Thùng Rác Nguy Hại ⚠️" },
                { left: "Túi bóng cũ bẩn và sành sứ ném vào", right: "Thùng Rác Còn Lại 🗑️" }
              ]
            }
          }
        ]
      }
    ]
  }
];

export const SEED_ACHIEVEMENTS = [
  { id: "a1", title: "Nhà Toán Học Nhí", description: "Bứt phá toàn bộ 30 màn Truy Tìm Quy Luật", badge_code: "math_pro", xp_bonus: 500, icon: "🥇" },
  { id: "a2", title: "Siêu Trí Nhớ", description: "Vượt qua toàn bộ 30 màn lật thẻ Vua Ghi Nhớ", badge_code: "memory_master", xp_bonus: 500, icon: "🧠" },
  { id: "a3", title: "Vua Logic", description: "Hoàn thiện 30 màn rèn tư duy Ghép Cặp", badge_code: "logic_king", xp_bonus: 500, icon: "💡" },
  { id: "a4", title: "Lập Trình Viên Tương Lai", description: "Hoàn thành khóa học Scratch cơ bản", badge_code: "scratch_wizard", xp_bonus: 600, icon: "🤖" },
  { id: "a5", title: "Thợ Săn Thử Thách", description: "Tham gia giải quyết 3 thử thách liên tiếp hàng ngày", badge_code: "daily_hunter", xp_bonus: 300, icon: "🔥" },
  { id: "a6", title: "Nhà Thông Thái Thực Đời", description: "Vượt qua toàn bộ 10 mốc Thử Thách IQ Thực Tế", badge_code: "real_iq_expert", xp_bonus: 450, icon: "🌟" }
];

export const SEED_SCRATCH_COURSES = [
  {
    id: "sc1",
    title: "Chinh phục Scratch Tinh Vân",
    description: "Nhập môn lập trình kéo thả Scratch bằng cách điều khiển tàu phi thuyền phiêu lưu trong vũ trụ.",
    thumbnail: "🚀",
    difficulty: "Cơ bản",
    total_lessons: 5,
    lessons: [
      {
        lesson_num: 1,
        title: "Khởi Động Động Cơ",
        content: "Giúp chú mèo Scratch tiến về tinh vân lấp lánh bằng cách sử dụng khối lệnh 'Di chuyển'.",
        target_block_sequence: "move_forward,move_forward",
        start_scene_json: "{\"cat_pos\":[0,2],\"star_pos\":[2,2]}",
        xp_reward: 100
      },
      {
        lesson_num: 2,
        title: "Bẻ Lái Tránh Chướng Ngại Vật",
        content: "Để tránh đám mây bụi vũ trụ, hãy điều khiển chú mèo rẽ phải trước khi đi tiếp.",
        target_block_sequence: "move_forward,turn_right,move_forward",
        start_scene_json: "{\"cat_pos\":[0,1],\"star_pos\":[1,2]}",
        xp_reward: 120
      },
      {
        lesson_num: 3,
        title: "Chu Kỳ Lặp Vô Tận",
        content: "Sử dụng khối 'Vòng lặp' để mèo tự động di chuyển 3 bước mà không cần nối nhiều khối.",
        target_block_sequence: "repeat_3[move_forward]",
        start_scene_json: "{\"cat_pos\":[0,0],\"star_pos\":[3,0]}",
        xp_reward: 150
      },
      {
        lesson_num: 4,
        title: "Vượt Trọng Lực Vũ Trụ",
        content: "Hãy xoay người hướng lên trên (Quay trái) và kích hoạt vòng lặp 3 lần di chuyển để tiến đến ngôi sao lấp lánh ở (1,0)!",
        target_block_sequence: "turn_left,repeat_3[move_forward]",
        start_scene_json: "{\"cat_pos\":[1,3],\"star_pos\":[1,0]}",
        xp_reward: 180
      },
      {
        lesson_num: 5,
        title: "Hành Trình Vòng Cung",
        content: "Tiến lên 2 bước, rẽ phải và tiến thêm 2 bước nữa để thu thập ngôi sao năng lượng tại tọa độ tinh vân (2,2)!",
        target_block_sequence: "move_forward,move_forward,turn_right,move_forward,move_forward",
        start_scene_json: "{\"cat_pos\":[0,0],\"star_pos\":[2,2]}",
        xp_reward: 200
      }
    ]
  },
  {
    id: "sc2",
    title: "Khám Phá Mê Cung Thuật Toán",
    description: "Nâng cao tư duy không gian và giải thuật toán rẽ nhánh cơ bản với các mê cung lắt léo hơn.",
    thumbnail: "🌀",
    difficulty: "Nâng cao",
    total_lessons: 4,
    lessons: [
      {
        lesson_num: 1,
        title: "Quay Đầu Đi Tìm Sao",
        content: "Ngôi sao ở ngay phía sau con tại (0,1). Hãy xoay chú mèo quay ngược lại (Quay trái 2 lần) và tiến lên 2 bước!",
        target_block_sequence: "turn_left,turn_left,move_forward,move_forward",
        start_scene_json: "{\"cat_pos\":[2,1],\"star_pos\":[0,1]}",
        xp_reward: 220
      },
      {
        lesson_num: 2,
        title: "Bám Sát Rìa Vũ Trụ",
        content: "Sử dụng vòng lặp 3 lần di chuyển liên tiếp để đi dọc rìa trên cùng đến (3,0), sau đó rẽ phải và tiến thêm 1 bước xuống (3,1)!",
        target_block_sequence: "repeat_3[move_forward],turn_right,move_forward",
        start_scene_json: "{\"cat_pos\":[0,0],\"star_pos\":[3,1]}",
        xp_reward: 250
      },
      {
        lesson_num: 3,
        title: "Đường Đi Zích Zắc",
        content: "Kiểm soát bước đi zích zắc thông minh: Tiến, rẽ trái, tiến, rẽ phải, tiến, rẽ trái, tiến để thu hoạch sao rực rỡ tại tọa độ (2,0)!",
        target_block_sequence: "move_forward,turn_left,move_forward,turn_right,move_forward,turn_left,move_forward",
        start_scene_json: "{\"cat_pos\":[0,2],\"star_pos\":[2,0]}",
        xp_reward: 280
      },
      {
        lesson_num: 4,
        title: "Lùi Lại Về Đích",
        content: "Từ góc phải bên dưới (3,3), hãy quay đầu hoàn toàn sang trái (Quay trái 2 lần) và dùng siêu vòng lặp để lướt thẳng về đích tại (0,3)!",
        target_block_sequence: "turn_left,turn_left,repeat_3[move_forward]",
        start_scene_json: "{\"cat_pos\":[3,3],\"star_pos\":[0,3]}",
        xp_reward: 300
      }
    ]
  }
];

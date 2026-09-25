export const phases = [
  {
    id: 0,
    title: "Kỳ trung gian",
    subtitle: "Chuẩn bị phân chia",
    range: [0.0, 0.2],
    description: "Tế bào chuẩn bị các điều kiện cần thiết trước khi bước vào quá trình phân chia thực sự.",
    events: [
      "Tế bào sinh trưởng mạnh, tăng kích thước và tích lũy năng lượng.",
      "Trung tử nhân đôi thành hai cặp nằm gần nhân.",
      "Nhiễm sắc thể nhân đôi tạo thành nhiễm sắc thể kép (mỗi NST gồm 2 crômatit chị em dính ở tâm động).",
      "Ở kỳ trung gian, ADN quấn quanh protein histone tạo thành chuỗi nucleosome (chuỗi hạt), toàn bộ chuỗi này tiếp tục gấp cuộn và đan xen tạo thành mạng lưới chất nhiễm sắc (chromatin) duỗi xoắn. Dưới kính hiển vi quang học, ta chỉ quan sát thấy một khối chất nhiễm sắc khá đồng đều, không thấy từng nhiễm sắc thể riêng biệt.",
      "Màng nhân và nhân con vẫn nguyên vẹn, bao bọc chất nhân."
    ],
    color: "#a855f7" // Purple
  },
  {
    id: 1,
    title: "Kỳ đầu",
    subtitle: "Co xoắn NST & Hình thành thoi vô sắc",
    range: [0.2, 0.4],
    description: "Các cấu trúc phục vụ phân chia bắt đầu xuất hiện, màng nhân dần biến mất.",
    events: [
      "Các nhiễm sắc thể kép bắt đầu co xoắn ngắn lại và hiện rõ dần dưới dạng hình chữ X.",
      "Hai cặp trung tử di chuyển về hai cực đối diện của tế bào.",
      "Thoi phân bào (các sợi tơ vô sắc) bắt đầu hình thành, tỏa ra từ hai cực và đính vào tâm động của các nhiễm sắc thể.",
      "Màng nhân bắt đầu phân rã và biến mất hoàn toàn, giải phóng các nhiễm sắc thể vào tế bào chất.",
      "Nhân con tiêu biến."
    ],
    color: "#ec4899" // Pink
  },
  {
    id: 2,
    title: "Kỳ giữa",
    subtitle: "Xếp hàng trên mặt phẳng xích đạo",
    range: [0.4, 0.6],
    description: "Thời điểm lý tưởng để quan sát hình thái nhiễm sắc thể.",
    events: [
      "Nhiễm sắc thể kép co xoắn cực đại, đạt độ ngắn và độ dày lớn nhất, biểu hiện rõ hình dạng đặc trưng.",
      "Tất cả các nhiễm sắc thể kép tập trung và xếp thành một hàng phẳng trên mặt phẳng xích đạo của tế bào.",
      "Sợi tơ vô sắc từ mỗi cực tế bào đính vào cả hai phía tâm động của từng nhiễm sắc thể kép.",
      "Trạng thái này chuẩn bị cho sự phân ly đồng đều của vật chất di truyền sang hai tế bào con."
    ],
    color: "#3b82f6" // Blue
  },
  {
    id: 3,
    title: "Kỳ sau",
    subtitle: "Tách đôi và phân ly về hai cực",
    range: [0.6, 0.8],
    description: "Các nhiễm sắc thể di chuyển nhanh chóng về hai cực dưới sức kéo của thoi phân bào.",
    events: [
      "Tâm động của mỗi nhiễm sắc thể kép bị tách đôi.",
      "Hai crômatit chị em tách nhau ra thành hai nhiễm sắc thể đơn độc lập.",
      "Thoi vô sắc co rút ngắn lại, kéo các nhiễm sắc thể đơn di chuyển về hai cực đối diện của tế bào.",
      "Các nhiễm sắc thể di chuyển theo dạng chữ 'V' hoặc chữ 'J' hướng đỉnh về phía cực do lực kéo tác dụng lên tâm động.",
      "Tế bào bắt đầu dài ra dọc theo trục phân chia."
    ],
    color: "#14b8a6" // Teal
  },
  {
    id: 4,
    title: "Kỳ cuối & Phân chia tế bào chất",
    subtitle: "Tái thiết lập nhân mới & Thắt màng tế bào",
    range: [0.8, 1.0],
    description: "Hoàn tất việc chia nhân và ngăn cách tế bào chất để tạo ra hai tế bào con độc lập.",
    events: [
      "Các nhiễm sắc thể đơn đã về tới hai cực tế bào, bắt đầu giãn xoắn dần trở lại dạng sợi mảnh phân tán.",
      "Màng nhân mới và nhân con tái xuất hiện bao bọc lấy các cụm nhiễm sắc thể, hình thành hai nhân con hoàn chỉnh.",
      "Thoi phân bào tiêu biến hoàn toàn.",
      "**Phân chia tế bào chất**: Màng tế bào thắt lại ở vùng xích đạo (cleavage furrow), ăn sâu dần từ ngoài vào trong cho đến khi chia tế bào mẹ thành hai tế bào con riêng biệt, mỗi tế bào có bộ nhiễm sắc thể 2n giống hệt mẹ."
    ],
    color: "#10b981" // Green
  }
];

export const quizQuestions = [
  {
    question: "Trong kỳ nào của quá trình nguyên phân, các nhiễm sắc thể kép co xoắn cực đại và xếp thành một hàng trên mặt phẳng xích đạo?",
    options: [
      "Kỳ đầu (Prophase)",
      "Kỳ giữa (Metaphase)",
      "Kỳ sau (Anaphase)",
      "Kỳ cuối (Telophase)"
    ],
    correctAnswer: 1,
    explanation: "Tại Kỳ giữa, các nhiễm sắc thể kép co xoắn cực đại để chuẩn bị phân tách và xếp thành một hàng phẳng trên mặt phẳng xích đạo, nơi thoi phân bào bám vào tâm động từ hai cực."
  },
  {
    question: "Hiện tượng các crômatit chị em tách nhau ở tâm động và di chuyển về hai cực của tế bào xảy ra ở kỳ nào?",
    options: [
      "Kỳ trung gian (Interphase)",
      "Kỳ đầu (Prophase)",
      "Kỳ giữa (Metaphase)",
      "Kỳ sau (Anaphase)"
    ],
    correctAnswer: 3,
    explanation: "Tại Kỳ sau, lực co rút của sợi tơ vô sắc kéo đứt tâm động, tách hai crômatit chị em thành hai nhiễm sắc thể đơn riêng biệt rồi kéo chúng về hai cực đối diện."
  },
  {
    question: "Thoi phân bào (tơ vô sắc) đính vào bộ phận nào của nhiễm sắc thể kép để định hướng sự di chuyển?",
    options: [
      "Cánh nhiễm sắc thể (Chromatid arms)",
      "Đầu mút nhiễm sắc thể (Telomeres)",
      "Tâm động (Centromere)",
      "Màng nhân"
    ],
    correctAnswer: 2,
    explanation: "Tâm động (Centromere) chứa protein kinetochore là vị trí liên kết đặc hiệu mà các sợi tơ vô sắc bám vào để kéo nhiễm sắc thể trong quá trình phân bào."
  },
  {
    question: "Nếu một tế bào có bộ nhiễm sắc thể lưỡng bội 2n = 8 tiến hành nguyên phân, kết quả thu được ở cuối quá trình sẽ là gì?",
    options: [
      "2 tế bào con, mỗi tế bào chứa 4 nhiễm sắc thể đơn",
      "2 tế bào con, mỗi tế bào chứa 8 nhiễm sắc thể đơn",
      "4 tế bào con, mỗi tế bào chứa 4 nhiễm sắc thể đơn",
      "4 tế bào con, mỗi tế bào chứa 8 nhiễm sắc thể đơn"
    ],
    correctAnswer: 1,
    explanation: "Nguyên phân là quá trình phân bào nguyên vẹn bộ nhiễm sắc thể. Từ 1 tế bào mẹ (2n = 8) tạo ra 2 tế bào con, mỗi tế bào con có bộ nhiễm sắc thể giống hệt mẹ là 2n = 8 nhiễm sắc thể đơn."
  },
  {
    question: "Ở tế bào động vật, sự phân chia tế bào chất ở Kỳ cuối diễn ra bằng cách nào?",
    options: [
      "Hình thành vách ngăn từ trung tâm đi ra ngoài biên",
      "Màng tế bào thắt lại ở vùng xích đạo từ ngoài vào trong",
      "Hai tế bào con đơn giản tự tách rời không cần thắt màng",
      "Nhân con kéo dài ra rồi đứt làm đôi"
    ],
    correctAnswer: 1,
    explanation: "Tế bào động vật phân chia tế bào chất bằng cách thắt màng sinh chất ở vùng xích đạo (cleavage furrow) từ ngoài vào trong nhờ sự co rút của vòng actin-myosin. Ngược lại, tế bào thực vật do có thành xenlulôzơ cứng nên hình thành vách ngăn ở trung tâm lan ra ngoài."
  }
];

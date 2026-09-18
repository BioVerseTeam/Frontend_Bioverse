// ============================================================
// Dữ liệu Vòng đời Cây Mít (Jackfruit Lifecycle Data)
// Phân chia thành 6 giai đoạn phát triển chính từ hạt -> quả chín
// ============================================================

export const plantStages = [
  {
    id: 0,
    title: "Hạt Mít",
    subtitle: "Trạng thái ngủ nghỉ của hạt",
    range: [0.0, 0.15],
    description: "Hạt mít nằm trong quả chín sau khi tách ra sẽ rơi xuống đất, bắt đầu quá trình ngủ nghỉ chờ điều kiện thuận lợi.",
    events: [
      "Hạt mít có kích thước lớn (dài 2-4 cm), hình trứng hoặc bầu dục dẹt.",
      "Lớp vỏ bọc bên ngoài hạt (vỏ hạt mỏng nhưng dai) bảo vệ phôi bên trong khỏi vi khuẩn và nấm mốc.",
      "Nội nhũ giàu chất dinh dưỡng (tinh bột, protein, lipid) tích lũy sẵn để nuôi phôi khi nảy mầm.",
      "Hạt hấp thụ nước từ đất ẩm, bắt đầu trương phồng lên (quá trình hút nước) kích hoạt enzyme phân giải chất dinh dưỡng."
    ],
    color: "#854d0e" // Màu nâu gỗ/hạt giống
  },
  {
    id: 1,
    title: "Nảy mầm",
    subtitle: "Rễ cọc đâm sâu & Nhú chồi mầm",
    range: [0.15, 0.35],
    description: "Nước và nhiệt độ thích hợp kích hoạt sự phân bào của tế bào phôi, hạt nứt vỏ để mọc rễ và chồi.",
    events: [
      "Vỏ hạt mít nứt ra do áp suất trương nở bên trong tăng cao.",
      "Rễ mầm (radicle) đâm thẳng xuống đất trước để tạo thành rễ cọc khỏe mạnh, hút nước và muối khoáng neo giữ cây.",
      "Chồi mầm (plumule) vươn ngược lên trên hướng về phía ánh sáng mặt trời.",
      "Sự sinh trưởng ở giai đoạn này chủ yếu sử dụng nguồn năng lượng dự trữ sẵn trong lá mầm của hạt."
    ],
    color: "#a3e635" // Màu xanh non nhạt
  },
  {
    id: 2,
    title: "Cây mít non",
    subtitle: "Giai đoạn cây con & Phát triển lá mầm",
    range: [0.35, 0.55],
    description: "Cây non xuất hiện trên mặt đất, các lá đầu tiên bắt đầu quang hợp tự lập.",
    events: [
      "Chồi mầm vươn cao khỏi mặt đất, hai lá mầm mở ra và dần teo đi khi chất dinh dưỡng cạn kiệt.",
      "Các lá thật đầu tiên xuất hiện. Lá mít giai đoạn này có hình bầu dục ngược, phiến lá dày màu xanh sáng.",
      "Rễ cọc đâm sâu hơn và bắt đầu phân nhánh thành các rễ con để tăng diện tích tiếp xúc với đất ẩm.",
      "Cây bắt đầu tự quang hợp tạo chất hữu cơ nuôi cơ thể thay vì phụ thuộc vào dinh dưỡng dự trữ của hạt."
    ],
    color: "#22c55e" // Màu xanh lục tươi
  },
  {
    id: 3,
    title: "Cây trưởng thành",
    subtitle: "Phát triển thân gỗ & Tán lá rộng",
    range: [0.55, 0.75],
    description: "Cây phát triển mạnh mẽ về chiều cao, chu vi thân và độ phủ tán lá, hình thành cấu trúc cây thân gỗ.",
    events: [
      "Thân cây hóa gỗ, phát triển mô dẫn truyền mạnh mẽ. Vỏ thân chuyển sang màu xám nâu nhẵn mịn.",
      "Phân cành nhánh tạo thành tán rộng. Nhựa mủ màu trắng đục đặc trưng xuất hiện dồi dào trong mọi bộ phận của cây.",
      "Lá mít trưởng thành dày dặn, mặt trên xanh đậm bóng loáng, mặt dưới nhạt nhám, gân lá nổi rõ rệt.",
      "Hệ thống rễ cọc phát triển cực kỳ cắm sâu, rễ bên lan rộng giúp cây chịu hạn tốt và đứng vững vàng trước bão."
    ],
    color: "#15803d" // Màu xanh lục sẫm
  },
  {
    id: 4,
    title: "Ra hoa thân gỗ",
    subtitle: "Cụm hoa đơn tính (Cauliflory)",
    range: [0.75, 0.90],
    description: "Cây mít ra hoa trực tiếp trên thân chính hoặc cành lớn (hiện tượng Cauliflory độc đáo ở vùng nhiệt đới).",
    events: [
      "Hoa mít xuất hiện dưới dạng các cụm hoa hình trụ màu xanh ngắn, dân gian hay gọi là 'dái mít'.",
      "Cây mít là loại cây đơn tính cùng gốc (monoecious): Hoa đực và hoa cái mọc riêng biệt nhưng chung một cây.",
      "Cụm hoa đực nhỏ hơn, bề mặt mịn có nhiều bao phấn, mọc ở kẽ lá hoặc nhánh nhỏ, có mùi thơm dịu để thu hút côn trùng thụ phấn.",
      "Cụm hoa cái lớn hơn, bề mặt sần sùi mang nhiều noãn, mọc trực tiếp trên các thân cây già vững chãi."
    ],
    color: "#166534" // Màu xanh đậm hoa cỏ
  },
  {
    id: 5,
    title: "Kết quả mít",
    subtitle: "Quả mít gai phát triển & Chín ngọt",
    range: [0.90, 1.0],
    description: "Sau khi thụ phấn thành công, hoa cái phát triển thành quả phức khổng lồ với nhiều múi ngọt ngào.",
    events: [
      "Cụm hoa cái thụ phấn thành quả mít ghép (quả phức). Mỗi noãn thụ phấn sẽ phát triển thành một múi mít màu vàng.",
      "Bề mặt quả bao bọc bởi lớp gai nhọn mịn (do các vòi nhụy hoa cái hóa gỗ tạo thành), bảo vệ quả khỏi sâu bọ.",
      "Quả mít lớn dần nhanh chóng ngay trên thân gỗ chính để được thân chịu đỡ trọng lượng cực lớn (có thể lên tới 10-30kg).",
      "Khi chín, quả mít chuyển dần từ xanh lá sang xanh vàng hoặc nâu xám, gai mít nở phẳng, tỏa ra mùi thơm ngọt ngào nồng nàn."
    ],
    color: "#ca8a04" // Màu vàng mít chín
  }
];

export const plantRegions = [
  {
    id: 'seed',
    name: 'Hạt Mít',
    latin: 'Jackfruit Seed',
    color: '#854d0e',
    description: 'Hạt của quả mít, chứa lá mầm lớn giàu tinh bột giúp cung cấp chất dinh dưỡng ban đầu cho phôi mầm phát triển.',
    function: 'Lưu trữ thông tin di truyền và cung cấp chất dinh dưỡng để hạt nảy mầm.',
    location: 'Nằm dưới lớp đất ở giai đoạn 1, sau đó teo nhỏ dần ở giai đoạn 2.'
  },
  {
    id: 'roots',
    name: 'Hệ rễ cọc',
    latin: 'Taproot System',
    color: '#b45309',
    description: 'Rễ cọc của cây mít phát triển cực khỏe, đâm thẳng đứng sâu vào lòng đất cùng với các rễ phụ lan rộng.',
    function: 'Neo giữ cây gỗ to lớn bám chắc vào đất, hút nước và muối khoáng từ tầng đất sâu.',
    location: 'Nằm bên dưới mặt đất, kéo dài từ hạt mầm đi xuống.'
  },
  {
    id: 'trunk',
    name: 'Thân cây gỗ',
    latin: 'Woody Trunk',
    color: '#78350f',
    description: 'Thân cây mít hóa gỗ cứng cáp, vỏ màu xám nâu chứa hệ thống nhựa mủ trắng sữa dồi dào chảy khắp thân.',
    function: 'Nâng đỡ tán lá, hoa quả to lớn và dẫn truyền nước, muối khoáng, chất hữu cơ nuôi cây.',
    location: 'Trục thẳng đứng nối rễ với nhánh lá.'
  },
  {
    id: 'leaves',
    name: 'Lá Mít',
    latin: 'Jackfruit Leaves',
    color: '#15803d',
    description: 'Lá mít dày, dai, hình bầu dục ngược, xếp so le. Mặt trên xanh đậm nhẵn bóng để tối ưu hóa hấp thụ ánh sáng.',
    function: 'Quang hợp tổng hợp năng lượng và hô hấp, thoát hơi nước giúp điều hòa nhiệt độ cho cây.',
    location: 'Mọc ra từ thân non hoặc các cành nhánh phụ.'
  },
  {
    id: 'flower',
    name: 'Cụm hoa (Dái Mít)',
    latin: 'Jackfruit Inflorescence',
    color: '#16a34a',
    description: 'Cụm hoa mít hình chuỳ/trụ màu xanh mọc ra trực tiếp trên thân cây, chứa hàng nghìn hoa đơn tính nhỏ bé.',
    function: 'Thụ phấn sinh sản. Hoa đực thụ phấn cho hoa cái nhờ gió và các loài côn trùng nhỏ.',
    location: 'Mọc trực tiếp trên vỏ thân cây hoặc nhánh lớn.'
  },
  {
    id: 'fruit',
    name: 'Quả Mít',
    latin: 'Jackfruit Fruit',
    color: '#eab308',
    description: 'Quả phức khổng lồ có vỏ phủ đầy gai nhọn mịn, bên trong chứa xơ mít và nhiều múi mít vàng ngọt lịm.',
    function: 'Chứa hạt giống để phát tán và duy trì nòi giống của loài.',
    location: 'Treo lủng lẳng trực tiếp từ thân cây gỗ chính.'
  }
];

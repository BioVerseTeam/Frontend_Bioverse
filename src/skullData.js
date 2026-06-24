/**
 * Dữ liệu giải phẫu hộp sọ người - khớp theo TÊN MESH trong model 3D.
 *
 * Model: "visible_interactive_human_-_exploding_skull.glb"
 * Mỗi xương là một mesh riêng biệt, tên mesh bắt đầu bằng từ khóa giải phẫu,
 * ví dụ: "Frontal:STL_Output...", "Left_zygomatic:STL_Output...".
 *
 * Vì model đã tách sẵn từng xương, ta xác định vùng bằng cách đọc tên mesh
 * (mạnh & chính xác hơn nhiều so với đoán theo tọa độ va chạm).
 */

export const skullRegions = [
  {
    id: 'frontal',
    name: 'Xương trán',
    latin: 'Os frontale',
    color: '#e74c3c',
    description:
      'Xương trán là xương dẹt lớn tạo nên phần trước vòm sọ (trán) và trần của hai hốc mắt. Gồm phần vảy tạo trán, phần hốc mắt và phần mũi nối với xương mũi.',
    function:
      'Bảo vệ thùy trán của não — vùng tư duy, lập kế hoạch, ra quyết định và kiểm soát vận động. Bên trong có xoang trán giúp làm nhẹ sọ và cộng hưởng âm thanh.',
    location: 'Phần trước - trên hộp sọ, từ chân tóc xuống bờ trên hốc mắt (cung mày).',
  },
  {
    id: 'parietal',
    name: 'Xương đỉnh',
    latin: 'Os parietale',
    color: '#3498db',
    description:
      'Hai xương đỉnh đối xứng tạo nên phần lớn nhất của vòm sọ, nối nhau ở đường giữa bằng khớp dọc và nối xương trán bằng khớp vành.',
    function:
      'Bảo vệ thùy đỉnh của não — xử lý cảm giác xúc giác, nhiệt độ, áp lực và nhận thức không gian.',
    location: 'Phần trên cùng và hai bên vòm sọ, sau xương trán, trước xương chẩm.',
  },
  {
    id: 'occipital',
    name: 'Xương chẩm',
    latin: 'Os occipitale',
    color: '#9b59b6',
    description:
      'Xương đơn tạo phần sau và nền sọ. Đặc trưng bởi lỗ lớn (foramen magnum) nơi tủy sống nối với thân não, hai bên có lồi cầu chẩm khớp với đốt sống C1.',
    function:
      'Bảo vệ thùy chẩm — vùng xử lý thị giác. Lỗ lớn cho phép tủy sống đi qua, kết nối não với hệ thần kinh trung ương.',
    location: 'Phần sau - dưới hộp sọ, từ sau đỉnh đầu xuống nền sọ.',
  },
  {
    id: 'temporal',
    name: 'Xương thái dương',
    latin: 'Os temporale',
    color: '#f39c12',
    description:
      'Hai xương hai bên sọ, cấu trúc phức tạp nhất: phần vảy, phần đá chứa tai trong, và mỏm chũm nhô ra sau tai.',
    function:
      'Bảo vệ thùy thái dương — xử lý thính giác, trí nhớ, ngôn ngữ. Chứa cơ quan thính giác (ốc tai) và tiền đình (thăng bằng).',
    location: 'Hai bên hộp sọ, vùng thái dương phía trên tai.',
  },
  {
    id: 'sphenoid',
    name: 'Xương bướm',
    latin: 'Os sphenoidale',
    color: '#16a085',
    description:
      'Xương đơn hình con bướm nằm ở nền sọ giữa, khớp với hầu hết các xương sọ khác. Có hố yên (sella turcica) chứa tuyến yên.',
    function:
      'Là "viên đá đỉnh vòm" giữ các xương sọ liên kết với nhau, tạo nền sọ, một phần hốc mắt và hố thái dương. Bảo vệ tuyến yên.',
    location: 'Nền sọ giữa, sau hốc mắt, trải ngang hai bên.',
  },
  {
    id: 'ethmoid',
    name: 'Xương sàng',
    latin: 'Os ethmoidale',
    color: '#8e44ad',
    description:
      'Xương đơn nhẹ, xốp như tổ ong, nằm giữa hai hốc mắt. Tạo phần trên khoang mũi, vách ngăn mũi và thành trong hốc mắt. Mảnh sàng có lỗ cho dây thần kinh khứu giác.',
    function:
      'Tạo khung khoang mũi và xoang sàng, nâng đỡ vách mũi. Mảnh sàng cho dây thần kinh khứu giác (I) đi qua — giúp khứu giác.',
    location: 'Trung tâm khối mặt, giữa hai hốc mắt, sau sống mũi.',
  },
  {
    id: 'zygomatic',
    name: 'Xương gò má',
    latin: 'Os zygomaticum',
    color: '#1abc9c',
    description:
      'Hai xương hình kim cương tạo phần nhô của má. Cùng mỏm gò má của xương thái dương tạo nên cung gò má.',
    function:
      'Tạo độ nổi bật của gò má, góp phần bờ ngoài và đáy hốc mắt. Cung gò má là nơi bám của cơ nhai (masseter).',
    location: 'Phần nhô bên ngoài, dưới và ngoài hốc mắt.',
  },
  {
    id: 'maxilla',
    name: 'Xương hàm trên',
    latin: 'Maxilla',
    color: '#e67e22',
    description:
      'Hai xương hợp nhất tạo phần giữa mặt: sàn hốc mắt, hai bên khoang mũi, vòm miệng cứng và mang răng hàm trên. Bên trong có xoang hàm lớn nhất.',
    function:
      'Nâng đỡ răng hàm trên, tạo nền hốc mắt, thành bên khoang mũi và vòm miệng. Xoang hàm làm nhẹ sọ, làm ấm - ẩm không khí.',
    location: 'Giữa mặt, dưới hốc mắt, hai bên mũi, trên vòm miệng.',
  },
  {
    id: 'nasal',
    name: 'Xương mũi',
    latin: 'Os nasale',
    color: '#00bcd4',
    description:
      'Hai xương nhỏ hình chữ nhật nối nhau tạo sống mũi cứng. Phía trên nối xương trán, hai bên nối mỏm trán xương hàm trên; sụn mũi tiếp nối tạo phần dưới mũi.',
    function:
      'Tạo khung xương cho sống mũi, định hình khoang mũi và hỗ trợ lọc - làm ấm - ẩm không khí.',
    location: 'Giữa mặt, giữa hai hốc mắt, ngay trên đỉnh mũi.',
  },
  {
    id: 'lacrimal',
    name: 'Xương lệ',
    latin: 'Os lacrimale',
    color: '#fd79a8',
    description:
      'Xương nhỏ và mỏng manh nhất của mặt, nằm ở thành trong hốc mắt. Có rãnh lệ tạo nên hố túi lệ.',
    function:
      'Tạo ống dẫn lệ mũi — dẫn nước mắt từ mắt xuống khoang mũi, giúp dẫn lưu nước mắt.',
    location: 'Thành trong mỗi hốc mắt, phía trước.',
  },
  {
    id: 'palatine',
    name: 'Xương khẩu cái',
    latin: 'Os palatinum',
    color: '#a29bfe',
    description:
      'Hai xương hình chữ L nằm sau xương hàm trên, tạo phần sau vòm miệng cứng, một phần khoang mũi và sàn hốc mắt.',
    function:
      'Hoàn thiện vòm miệng cứng (ngăn cách khoang miệng và mũi) và góp phần thành khoang mũi.',
    location: 'Phía sau khẩu cái cứng, sâu trong khối mặt.',
  },
  {
    id: 'vomer',
    name: 'Xương lá mía',
    latin: 'Vomer',
    color: '#55efc4',
    description:
      'Xương đơn mỏng hình lưỡi cày tạo nên phần dưới - sau của vách ngăn mũi, cùng mảnh thẳng đứng của xương sàng và sụn vách mũi.',
    function:
      'Chia khoang mũi thành hai bên trái - phải, nâng đỡ vách ngăn mũi.',
    location: 'Đường giữa khoang mũi, dưới vách ngăn.',
  },
  {
    id: 'conchae',
    name: 'Xương xoăn mũi dưới',
    latin: 'Concha nasalis inferior',
    color: '#74b9ff',
    description:
      'Hai xương cuộn xoắn nằm ở thành bên dưới khoang mũi, nhô vào lòng mũi tạo bề mặt cuộn.',
    function:
      'Làm xoáy luồng không khí hít vào để lọc, làm ấm và làm ẩm trước khi vào phổi.',
    location: 'Thành bên dưới của khoang mũi.',
  },
  {
    id: 'mandible',
    name: 'Xương hàm dưới',
    latin: 'Mandibula',
    color: '#2ecc71',
    description:
      'Xương lớn và khỏe nhất của mặt, xương sọ duy nhất cử động được. Gồm thân hình móng ngựa mang răng và hai nhánh khớp với xương thái dương tại khớp thái dương - hàm (TMJ).',
    function:
      'Nhai, nghiền thức ăn, nói và biểu cảm. Khớp TMJ cho phép há, ngậm và đưa hàm sang hai bên.',
    location: 'Phần dưới cùng của mặt, tạo cằm và đường viền hàm.',
  },
  {
    id: 'teeth',
    name: 'Răng',
    latin: 'Dentes',
    color: '#f1f2f6',
    description:
      'Bộ răng người trưởng thành gồm 32 chiếc: răng cửa, răng nanh, răng tiền hàm và răng hàm, cắm trong xương ổ răng của hàm trên và hàm dưới.',
    function:
      'Cắn, xé, nghiền thức ăn (tiêu hóa cơ học), hỗ trợ phát âm và định hình khuôn mặt. Men răng là mô cứng nhất cơ thể.',
    location: 'Cung răng trên (xương hàm trên) và cung răng dưới (xương hàm dưới).',
  },
];

// Bảng tra cứu nhanh theo id
export const regionById = Object.fromEntries(skullRegions.map((r) => [r.id, r]));

/**
 * Bảng từ khóa → id vùng. Kiểm tra theo thứ tự (cụ thể trước, chung sau)
 * để tránh nhầm lẫn (vd "lower_teeth" phải khớp "teeth" trước "mandible").
 */
const KEYWORD_TO_REGION = [
  ['frontal', 'frontal'],
  ['parietal', 'parietal'],
  ['occipital', 'occipital'],
  ['temporal', 'temporal'],
  ['sphenoid', 'sphenoid'],
  ['ethmoid', 'ethmoid'],
  ['zygomatic', 'zygomatic'],
  ['lacrimal', 'lacrimal'],
  ['palatine', 'palatine'],
  ['vomer', 'vomer'],
  ['conchae', 'conchae'],
  ['concha', 'conchae'],
  ['nasal', 'nasal'],
  ['teeth', 'teeth'],
  ['maxilla', 'maxilla'],
  ['max', 'maxilla'], // "Right_max"
  ['mandible', 'mandible'],
];

/**
 * Xác định vùng xương từ tên mesh/node trong GLB.
 * @param {string} meshName
 * @returns {object|null} region
 */
export function identifyRegionByMeshName(meshName) {
  if (!meshName) return null;
  const lower = meshName.toLowerCase();
  for (const [keyword, regionId] of KEYWORD_TO_REGION) {
    if (lower.includes(keyword)) {
      return regionById[regionId] || null;
    }
  }
  return null;
}

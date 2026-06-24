// ============================================================
// Dữ liệu các bộ phận của Trùng giày (Paramecium caudatum)
// Ánh xạ TÊN node/mesh trong trung_giay.glb -> vùng giải phẫu.
//
// Tên mesh trong file GLB:
//   Paramecium_Body            -> Màng & tế bào chất (lớp vỏ ngoài)
//   Macronucleus               -> Nhân lớn
//   Micronucleus               -> Nhân nhỏ
//   ContractileVacuole_*       -> Không bào co bóp (2 cái: trước/sau)
//   FoodVacuole_1..6           -> Không bào tiêu hóa (6 cái)
// ============================================================

export const parameciumRegions = [
  {
    id: 'body',
    name: 'Màng & Tế bào chất',
    latin: 'Pellicle & Cytoplasm',
    color: '#5ad1c4',
    // Đây là lớp vỏ ngoài — mặc định bao trọn con trùng. Khi "xem bên trong"
    // nó sẽ mờ đi để lộ các bào quan. Không nằm trong danh sách click khi đã bổ đôi.
    isShell: true,
    description:
      'Lớp màng phim (pellicle) đàn hồi bao bọc cơ thể, bên trong chứa khối tế bào chất lỏng. Bề mặt phủ dày lông bơi giúp trùng giày di chuyển và lùa thức ăn.',
    function:
      'Bảo vệ cơ thể, giữ hình dạng "chiếc giày" đặc trưng và là môi trường cho mọi hoạt động sống bên trong diễn ra.',
    location: 'Toàn bộ mặt ngoài, bao quanh tất cả các bào quan.',
  },
  {
    id: 'macronucleus',
    name: 'Nhân lớn',
    latin: 'Macronucleus',
    color: '#a855f7',
    description:
      'Nhân lớn hình hạt đậu, đa bội, là nhân dinh dưỡng của trùng giày. Điều khiển toàn bộ hoạt động trao đổi chất và sinh trưởng hằng ngày của tế bào.',
    function:
      'Điều khiển các hoạt động sống thường ngày: trao đổi chất, tổng hợp protein, sinh trưởng.',
    location: 'Nằm gần trung tâm cơ thể.',
  },
  {
    id: 'micronucleus',
    name: 'Nhân nhỏ',
    latin: 'Micronucleus',
    color: '#ec4899',
    description:
      'Nhân nhỏ lưỡng bội nằm áp sát nhân lớn, giữ vai trò là nhân sinh sản. Tham gia vào quá trình sinh sản hữu tính (tiếp hợp) và phân đôi.',
    function:
      'Giữ và truyền thông tin di truyền; tham gia sinh sản (phân đôi và tiếp hợp).',
    location: 'Áp sát một bên nhân lớn.',
  },
  {
    id: 'contractile-vacuole',
    name: 'Không bào co bóp',
    latin: 'Contractile vacuole',
    color: '#3b82f6',
    // Khớp với 2 mesh: ContractileVacuole_Anterior & ContractileVacuole_Posterior
    description:
      'Hai không bào co bóp hình ngôi sao nằm ở hai đầu cơ thể (trước và sau). Chúng co bóp nhịp nhàng để gom và đẩy nước thừa ra ngoài.',
    function:
      'Điều hòa áp suất thẩm thấu — bài tiết nước thừa và chất thải lỏng, giữ tế bào không bị vỡ.',
    location: 'Một ở đầu trước, một ở đầu sau cơ thể.',
  },
  {
    id: 'food-vacuole',
    name: 'Không bào tiêu hóa',
    latin: 'Food vacuole',
    color: '#f59e0b',
    // Khớp với 6 mesh: FoodVacuole_1..6
    description:
      'Các bóng tiêu hóa hình thành khi thức ăn được lùa qua rãnh miệng vào trong. Chúng trôi trong tế bào chất trong khi enzyme phân giải thức ăn.',
    function:
      'Tiêu hóa thức ăn (vi khuẩn, vụn hữu cơ) và hấp thụ chất dinh dưỡng vào tế bào chất.',
    location: 'Rải rác khắp tế bào chất, di chuyển theo dòng tế bào chất.',
  },
];

/**
 * Ánh xạ tên node/mesh trong GLB sang một vùng giải phẫu.
 * Dùng so khớp tiền tố / từ khóa để gộp nhiều mesh cùng loại về một vùng
 * (ví dụ 6 FoodVacuole đều thuộc vùng "food-vacuole").
 */
export function identifyParameciumRegion(name) {
  if (!name) return null;
  const n = name.toLowerCase();

  if (n.includes('contractile')) return getRegion('contractile-vacuole');
  if (n.includes('foodvacuole') || n.includes('food')) return getRegion('food-vacuole');
  if (n.includes('macronucleus')) return getRegion('macronucleus');
  if (n.includes('micronucleus')) return getRegion('micronucleus');
  if (n.includes('paramecium_body') || n === 'sphere' || n.includes('body'))
    return getRegion('body');

  return null;
}

function getRegion(id) {
  return parameciumRegions.find((r) => r.id === id) || null;
}

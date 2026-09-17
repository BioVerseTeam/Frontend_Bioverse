/**
 * ====================================================================
 * DỮ LIỆU GIẢI PHẪU TIM & HỆ TUẦN HOÀN - KHTN LỚP 8 (GDPT 2018)
 * ====================================================================
 * Bám sát Bài 32: Máu và hệ tuần hoàn của cơ thể người.
 * Cấu trúc dữ liệu chuẩn hóa cho tương tác 3D:
 * - position: Tọa độ 3D trung tâm của cấu trúc trên mô hình sau khi căn tâm.
 * - hoverRadius: Bán kính giới hạn cho Safe Surface Hover (không phân vùng tùy tiện).
 * - cameraPosition & cameraTarget: Góc nhìn tối ưu khi chọn cấu trúc.
 * - anatomy.type: 'external' (bề mặt) hoặc 'internal' (cấu trúc bên trong).
 */

export const HEART_STRUCTURES = [
  {
    id: 'aorta',
    number: 1,
    badge: '1',
    name: 'Động mạch chủ',
    shortName: 'ĐM Chủ',
    latin: 'Aorta',
    color: '#ef4444',
    position: { x: 0.012, y: 0.086, z: 0.022 },
    hoverRadius: 0.038,
    cameraPosition: { x: 0.05, y: 0.12, z: 0.35 },
    cameraTarget: { x: 0.01, y: 0.06, z: 0.01 },
    visibility: {
      preferredView: 'front',
    },
    anatomy: {
      type: 'external',
      note: 'Mạch máu lớn nhất',
    },
    structure:
      'Động mạch lớn nhất của cơ thể, xuất phát từ tâm thất trái, uốn cong hình chữ U ngược tạo thành quai động mạch chủ trước khi phân nhánh. Thành động mạch rất dày, có lớp cơ trơn và nhiều sợi đàn hồi giúp chịu đựng được áp lực máu cực lớn tống ra từ thất trái.',
    function:
      'Dẫn dòng máu đỏ tươi giàu oxy (O₂) và dưỡng chất từ tâm thất trái đi nuôi toàn bộ các cơ quan và mô tế bào trong cơ thể (khởi đầu của vòng tuần hoàn lớn).',
    healthNote:
      'Xơ vữa động mạch (do lắng đọng cholesterol, chất béo) làm thành động mạch chủ xơ cứng, giảm tính đàn hồi, dẫn đến huyết áp tăng cao và nguy cơ phình vỡ động mạch chủ.',
  },
  {
    id: 'left_ventricle',
    number: 2,
    badge: '2',
    name: 'Tâm thất trái',
    shortName: 'Thất trái',
    latin: 'Ventriculus sinister',
    color: '#f43f5e',
    position: { x: 0.038, y: -0.045, z: 0.028 },
    hoverRadius: 0.045,
    cameraPosition: { x: 0.15, y: -0.02, z: 0.38 },
    cameraTarget: { x: 0.03, y: -0.04, z: 0.02 },
    visibility: {
      preferredView: 'left',
    },
    anatomy: {
      type: 'external',
      note: 'Buồng cơ tim dày nhất',
    },
    structure:
      'Ngăn tim nằm ở phía dưới bên trái, có lớp cơ tim dày nhất (gấp khoảng 3 lần thành tâm thất phải). Đỉnh tim (mỏm tim) chúc xuống dưới và hơi chếch sang trái lồng ngực. Ngăn cách với tâm nhĩ trái bằng van 2 lá và thông với động mạch chủ bằng van tổ chim.',
    function:
      'Co bóp với lực cực mạnh để tống máu giàu O₂ vào động mạch chủ với áp lực lớn, giúp máu vượt qua sức cản của toàn bộ mạng lưới mạch máu đi khắp cơ thể. Thành thất trái dày nhất chính là sự thích nghi hình thái với chức năng tạo áp lực bơm máu này.',
    healthNote:
      'Tăng huyết áp kéo dài khiến tâm thất trái phải co bóp gắng sức liên tục, lâu ngày dẫn đến biến chứng phì đại cơ tim và suy tim.',
  },
  {
    id: 'right_ventricle',
    number: 3,
    badge: '3',
    name: 'Tâm thất phải',
    shortName: 'Thất phải',
    latin: 'Ventriculus dexter',
    color: '#3b82f6',
    position: { x: -0.035, y: -0.038, z: 0.042 },
    hoverRadius: 0.042,
    cameraPosition: { x: -0.15, y: -0.02, z: 0.38 },
    cameraTarget: { x: -0.03, y: -0.03, z: 0.02 },
    visibility: {
      preferredView: 'right',
    },
    anatomy: {
      type: 'external',
      note: 'Bơm máu tiểu tuần hoàn',
    },
    structure:
      'Ngăn tim nằm ở phía dưới bên phải, thành cơ mỏng hơn tâm thất trái. Nhận máu giàu CO₂ từ tâm nhĩ phải qua van 3 lá và thông với thân động mạch phổi qua van động mạch phổi.',
    function:
      'Co bóp đẩy dòng máu đỏ thẫm giàu CO₂ vào động mạch phổi để đưa máu lên hai lá phổi thực hiện quá trình trao đổi khí (thuộc vòng tuần hoàn nhỏ). Do quãng đường lên phổi ngắn và lực cản nhỏ, thành tâm thất phải không cần quá dày.',
    healthNote:
      'Các bệnh phổi mạn tính (như COPD, hen suyễn kéo dài) làm tăng áp lực động mạch phổi, khiến thất phải phải gắng sức tống máu, dẫn tới bệnh lý "tâm phế mạn".',
  },
  {
    id: 'atria',
    number: 4,
    badge: '4',
    name: 'Tâm nhĩ (Trái & Phải)',
    shortName: 'Tâm nhĩ',
    latin: 'Atrium cordis',
    color: '#a855f7',
    position: { x: -0.042, y: 0.032, z: 0.022 },
    hoverRadius: 0.038,
    cameraPosition: { x: -0.12, y: 0.08, z: 0.38 },
    cameraTarget: { x: -0.03, y: 0.03, z: 0.01 },
    visibility: {
      preferredView: 'front',
    },
    anatomy: {
      type: 'external',
      note: 'Tiếp nhận máu tĩnh mạch',
    },
    structure:
      'Hai buồng tim nằm ở phía trên (đáy tim), thành cơ mỏng hơn tâm thất rất nhiều. Tâm nhĩ phải nhận máu từ tĩnh mạch chủ trên và tĩnh mạch chủ dưới; tâm nhĩ trái nhận máu từ 4 tĩnh mạch phổi.',
    function:
      'Đóng vai trò bể chứa tiếp nhận máu từ các tĩnh mạch trở về tim. Khi tâm nhĩ co (pha co tâm nhĩ kéo dài 0.1 giây), máu được ép đẩy xuống hai tâm thất tương ứng qua hệ thống van nhĩ - thất.',
    healthNote:
      'Rung nhĩ là dạng rối loạn nhịp tim phổ biến, khiến tâm nhĩ run rẩy thay vì co bóp nhịp nhàng, làm ứ trệ máu và dễ tạo huyết khối (cục máu đông) gây tắc mạch não dẫn tới đột quỵ.',
  },
  {
    id: 'valves',
    number: 5,
    badge: '5',
    name: 'Hệ thống van tim',
    shortName: 'Van tim',
    latin: 'Valvae cordis',
    color: '#eab308',
    position: { x: 0.002, y: 0.012, z: 0.032 },
    hoverRadius: 0.025, // Không dùng cho surface hover vì là cấu trúc bên trong
    cameraPosition: { x: 0.0, y: 0.04, z: 0.32 },
    cameraTarget: { x: 0.0, y: 0.01, z: 0.02 },
    visibility: {
      preferredView: 'front',
    },
    anatomy: {
      type: 'internal',
      note: 'Cấu trúc bên trong tim',
      educationalNote: 'Mô hình hiện tại thể hiện chủ yếu cấu trúc ngoài của tim. Van tim là cấu trúc bên trong.',
    },
    structure:
      'Hệ thống van tim nằm bên trong các buồng tim: Gồm van nhĩ - thất (van 3 lá ở tim phải, van 2 lá ở tim trái) ngăn giữa nhĩ và thất; Van động mạch (van tổ chim) nằm ở gốc động mạch chủ và gốc động mạch phổi. Điểm ghim trên bề mặt 3D đóng vai trò dẫn nhập định vị vị trí van.',
    function:
      'Hoạt động như những chiếc van một chiều tuyệt đối: cho phép máu chỉ chảy theo một chiều (từ tâm nhĩ xuống tâm thất, từ tâm thất ra động mạch) và đóng chặt lại để ngăn không cho máu chảy ngược dòng.',
    healthNote:
      'Bệnh hẹp hoặc hở van tim (do thoái hóa, thấp tim) làm van không đóng kín, máu bị phụt ngược trở lại khiến tim phải làm việc tăng tải, lâu dần gây giãn tim và suy tim.',
  },
  {
    id: 'pulmonary_artery',
    number: 6,
    badge: '6',
    name: 'Động mạch phổi',
    shortName: 'ĐM Phổi',
    latin: 'Arteria pulmonalis',
    color: '#06b6d4',
    position: { x: -0.022, y: 0.068, z: 0.036 },
    hoverRadius: 0.036,
    cameraPosition: { x: -0.08, y: 0.1, z: 0.35 },
    cameraTarget: { x: -0.02, y: 0.06, z: 0.02 },
    visibility: {
      preferredView: 'front',
    },
    anatomy: {
      type: 'external',
      note: 'Dẫn máu lên phổi',
    },
    structure:
      'Xuất phát từ tâm thất phải, uốn cong ra phía trước quai động mạch chủ rồi chia đôi thành 2 nhánh: động mạch phổi phải (vào phổi phải) và động mạch phổi trái (vào phổi trái).',
    function:
      'Vận chuyển máu nghèo O₂ (giàu CO₂) từ tâm thất phải lên các phế nang của phổi để nhả khí CO₂ và nhận dưỡng khí O₂. Đây là động mạch duy nhất trong cơ thể chứa máu đỏ thẫm (máu nghèo oxy).',
    healthNote:
      'Thuyên tắc phổi (Pulmonary Embolism) xảy ra khi có cục máu đông di chuyển từ tĩnh mạch chân lên làm tắc động mạch phổi, gây suy hô hấp cấp tính nguy hiểm.',
  },
];

/**
 * Camera Presets chuẩn cho tim
 */
export const HEART_CAMERA_PRESETS = {
  default: { position: { x: 0, y: 0.03, z: 0.46 }, target: { x: 0, y: 0, z: 0 } },
  front: { position: { x: 0, y: 0.03, z: 0.46 }, target: { x: 0, y: 0, z: 0 } },
  back: { position: { x: 0, y: 0.03, z: -0.46 }, target: { x: 0, y: 0, z: 0 } },
  left: { position: { x: 0.46, y: 0.03, z: 0 }, target: { x: 0, y: 0, z: 0 } },
  right: { position: { x: -0.46, y: 0.03, z: 0 }, target: { x: 0, y: 0, z: 0 } },
  top: { position: { x: 0, y: 0.5, z: 0.08 }, target: { x: 0, y: 0, z: 0 } },
};

/**
 * Chu kỳ hoạt động của tim theo SGK Sinh học / KHTN 8:
 * Mỗi chu kỳ tim kéo dài khoảng 0.8 giây (khoảng 75 nhịp/phút) gồm 3 pha:
 */
export const HEART_CYCLE_INFO = {
  duration: '0.8 giây (75 lần/phút)',
  phases: [
    {
      name: 'Pha co tâm nhĩ',
      time: '0.1 giây',
      action: 'Hai tâm nhĩ cùng co, dồn máu từ nhĩ xuống hai tâm thất.',
    },
    {
      name: 'Pha co tâm thất',
      time: '0.3 giây',
      action: 'Hai tâm thất co mạnh, tống máu vào động mạch chủ và động mạch phổi.',
    },
    {
      name: 'Pha dãn chung',
      time: '0.4 giây',
      action: 'Toàn bộ tim dãn nghỉ ngơi, hút máu từ các tĩnh mạch trở về hai tâm nhĩ.',
    },
  ],
  insight:
    'Trong 1 chu kỳ 0.8s, tim co 0.4s và nghỉ ngơi 0.4s. Nhờ thời gian nghỉ xen kẽ này mà cơ tim có thể làm việc bền bỉ suốt cả cuộc đời mà không bị kiệt sức.',
};

export function getHeartStructure(id) {
  return HEART_STRUCTURES.find((s) => s.id === id) || null;
}

/**
 * Cấu hình tính năng & dữ liệu cho từng cơ quan (Organ Capabilities)
 * Sẵn sàng mở rộng cho phổi, dạ dày, não... trong tương lai
 */
export const ORGAN_CONFIGS = {
  heart: {
    id: 'heart',
    name: 'Trái tim người',
    modelKey: 'human_heart',
    features: {
      heartbeat: true,
      heartbeatAudio: true,
      particles: true,
      xray: false, // Tạm hoãn do mô hình hiện tại là hollow shell
    },
    structures: HEART_STRUCTURES,
    cameraPresets: HEART_CAMERA_PRESETS,
    cycleInfo: HEART_CYCLE_INFO,
  },
};


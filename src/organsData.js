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


// ====================================================================
// BỘ DỮ LIỆU GIẢI PHẪU PHỔI NGƯỜI (HỆ HÔ HẤP - KHTN 8)
// ====================================================================
export const LUNGS_STRUCTURES = [
  {
    id: 'trachea',
    number: 1,
    badge: '1',
    name: 'Khí quản',
    shortName: 'Khí quản',
    latin: 'Trachea',
    color: '#38bdf8',
    position: { x: -0.001, y: 0.112, z: 0.010 },
    hoverRadius: 0.045,
    cameraPosition: { x: 0.0, y: 0.12, z: 0.42 },
    cameraTarget: { x: 0.0, y: 0.10, z: 0.0 },
    visibility: {
      preferredView: 'front',
    },
    anatomy: {
      type: 'external',
      note: 'Ống dẫn khí chính',
    },
    structure:
      'Ống dẫn khí hình trụ dài khoảng 11-13 cm, gồm 16-20 vòng sụn khuyết chữ C xếp chồng lên nhau, phía sau là lớp cơ trơn đàn hồi giúp thực quản dễ dàng dãn nở khi nuốt thức ăn. Lớp niêm mạc lót có biểu mô trụ có lông rung và tuyến tiết chất nhầy.',
    function:
      'Dẫn không khí từ thanh quản xuống phế quản; lớp chất nhầy giữ lại bụi bẩn, vi khuẩn và các vi mao lông rung liên tục đẩy dị vật ngược lên hầu họng để ho hoặc khạc ra ngoài, giúp sưởi ấm, làm ẩm và làm sạch luồng không khí hít vào.',
    healthNote:
      'Khói thuốc lá và bụi mịn làm tê liệt, phá hủy hệ thống lông rung của khí quản, khiến đường thở mất khả năng tự làm sạch, dẫn tới viêm khí quản mạn tính và ho khan dai dẳng.',
  },
  {
    id: 'bronchi',
    number: 2,
    badge: '2',
    name: 'Phế quản chính',
    shortName: 'Phế quản',
    latin: 'Bronchi principales',
    color: '#a855f7',
    position: { x: -0.001, y: 0.061, z: 0.008 },
    hoverRadius: 0.038,
    cameraPosition: { x: 0.0, y: 0.07, z: 0.38 },
    cameraTarget: { x: 0.0, y: 0.05, z: 0.0 },
    visibility: {
      preferredView: 'front',
    },
    anatomy: {
      type: 'external',
      note: 'Nhánh phân nhánh vào 2 phổi',
    },
    structure:
      'Nơi khí quản chia đôi (chẽ ba khí quản - Carina) thành hai nhánh: phế quản chính phải (ngắn hơn, đường kính to hơn và dốc đứng hơn) và phế quản chính trái (dài hơn, nhỏ hơn và nằm ngang hơn). Cấu tạo bởi các vòng sụn hoàn chỉnh bao quanh.',
    function:
      'Phân chia và dẫn truyền không khí trực tiếp vào rốn phổi của từng lá phổi tương ứng, sau đó tiếp tục phân nhánh liên tục thành cây phế quản (phế quản thùy, phân thùy và tiểu phế quản tận).',
    healthNote:
      'Do phế quản chính phải to và dốc hơn phế quản trái, các dị vật đường thở (hạt dưa, đồ chơi nhỏ trẻ em vô tình hít phải) có tới hơn 70% trường hợp rơi mắc vào phế quản bên phải.',
  },
  {
    id: 'pulmo_dexter',
    number: 3,
    badge: '3',
    name: 'Phổi phải (3 thùy)',
    shortName: 'Phổi phải',
    latin: 'Pulmo dexter',
    color: '#ef4444',
    position: { x: -0.045, y: 0.020, z: 0.020 },
    hoverRadius: 0.055,
    cameraPosition: { x: -0.16, y: 0.02, z: 0.45 },
    cameraTarget: { x: -0.04, y: 0.01, z: 0.0 },
    visibility: {
      preferredView: 'right',
    },
    anatomy: {
      type: 'external',
      note: 'Lá phổi lớn hơn (3 thùy)',
    },
    structure:
      'Lá phổi nằm ở nửa bên phải khoang ngực, có thể tích và trọng lượng lớn hơn phổi trái (~600g). Được chia thành 3 thùy riêng biệt (thùy trên, thùy giữa, thùy dưới) bởi hai rãnh xẻ sâu: khe chếch và khe ngang.',
    function:
      'Thực hiện trao đổi khí chủ lực của cơ thể: tiếp nhận khí O₂ từ phế nang khuếch tán vào máu và đào thải CO₂ từ mao mạch máu ra ngoài. Đóng góp khoảng 55% tổng dung tích hô hấp của cơ thể.',
    healthNote:
      'Phổi phải nằm ngay phía trên cơ hoành và gan; viêm phổi thùy dưới bên phải có thể gây đau lan tỏa xuống vùng hạ sườn phải dễ nhầm lẫn với các bệnh lý gan mật cấp.',
  },
  {
    id: 'pulmo_sinister',
    number: 4,
    badge: '4',
    name: 'Phổi trái (2 thùy & Khuyết tim)',
    shortName: 'Phổi trái',
    latin: 'Pulmo sinister',
    color: '#3b82f6',
    position: { x: 0.048, y: 0.020, z: 0.020 },
    hoverRadius: 0.055,
    cameraPosition: { x: 0.16, y: 0.02, z: 0.45 },
    cameraTarget: { x: 0.04, y: 0.01, z: 0.0 },
    visibility: {
      preferredView: 'left',
    },
    anatomy: {
      type: 'external',
      note: 'Có khuyết tim đặc trưng',
    },
    structure:
      'Lá phổi nằm ở nửa bên trái lồng ngực, dung tích nhỏ hơn phổi phải (~500g). Chỉ gồm 2 thùy (thùy trên và thùy dưới) ngăn cách bởi khe chếch. Ở bờ trước phía trong có một vết lõm sâu gọi là khuyết tim (Incisura cardiaca) để nhường chỗ cho đỉnh quả tim tựa vào.',
    function:
      'Cùng với phổi phải duy trì thông khí và khuếch tán khí O₂ / CO₂ liên tục giữa cơ thể với môi trường ngoài. Đóng góp khoảng 45% chức năng trao đổi khí toàn cơ thể.',
    healthNote:
      'Khuyết tim trên phổi trái là minh chứng cho sự tối ưu không gian giải phẫu giữa hệ tuần hoàn và hệ hô hấp trong lồng ngực người.',
  },
  {
    id: 'lobi_pulmonis',
    number: 5,
    badge: '5',
    name: 'Các thùy phổi & Màng phổi',
    shortName: 'Màng phổi',
    latin: 'Lobi pulmonis & Pleura',
    color: '#f59e0b',
    position: { x: -0.038, y: 0.075, z: 0.012 },
    hoverRadius: 0.045,
    cameraPosition: { x: -0.10, y: 0.08, z: 0.40 },
    cameraTarget: { x: -0.02, y: 0.06, z: 0.0 },
    visibility: {
      preferredView: 'front',
    },
    anatomy: {
      type: 'external',
      note: 'Bao bọc & bảo vệ phổi',
    },
    structure:
      'Phổi được bao bọc bởi màng phổi gồm 2 lá thanh mạc: lá thành lót mặt trong lồng ngực và lá tạng dính sát mặt ngoài nhu mô phổi. Giữa hai lá là khoang màng phổi kín chứa một lượng dịch nhờn vi lượng giúp hai lá trượt êm ái lên nhau khi thở.',
    function:
      'Khoang màng phổi kín duy trì áp suất âm so với khí quyển, giúp phổi luôn nở ôm sát lồng ngực và dãn nở thụ động dễ dàng theo sự chuyển động của khung xương sườn và cơ hoành.',
    healthNote:
      'Tràn khí hoặc tràn dịch màng phổi làm mất áp suất âm, khiến nhu mô phổi bị co xẹp (xẹp phổi), gây khó thở cấp tính và đau ngực nhói dữ dội khi hít sâu.',
  },
  {
    id: 'alveoli',
    number: 6,
    badge: '6',
    name: 'Phế nang & Mạng mao mạch',
    shortName: 'Phế nang',
    latin: 'Alveoli pulmonis',
    color: '#10b981',
    position: { x: 0.035, y: -0.030, z: 0.015 },
    hoverRadius: 0.040,
    cameraPosition: { x: 0.12, y: -0.04, z: 0.38 },
    cameraTarget: { x: 0.03, y: -0.03, z: 0.0 },
    visibility: {
      preferredView: 'front',
    },
    anatomy: {
      type: 'internal',
      note: 'Đơn vị trao đổi khí vi mô',
      educationalNote: 'Phế nang là cấu trúc vi mô nằm sâu trong nhu mô phổi (300-500 triệu phế nang), điểm ghim đại diện cho đơn vị chức năng trao đổi khí.',
    },
    structure:
      'Đơn vị cấu tạo và chức năng cơ bản của phổi. Ở người có khoảng 300 - 500 triệu phế nang hình túi cầu tí hon, tạo nên tổng diện tích bề mặt trao đổi khí khổng lồ lên tới 70 - 100 m² (gấp 40 - 50 lần diện tích da). Thành phế nang cực mỏng, chỉ gồm một lớp tế bào dẹt tiếp xúc với mạng mao mạch máu dày đặc.',
    function:
      'Là nơi diễn ra sự khuếch tán khí sinh học: O₂ từ lòng phế nang khuếch tán qua màng hô hấp vào hồng cầu máu, đồng thời CO₂ từ máu mao mạch khuếch tán ngược vào lòng phế nang để tống ra ngoài khi thở ra.',
    healthNote:
      'Bụi mịn siêu vi PM2.5 và khói thuốc có thể vượt qua toàn bộ hàng rào bảo vệ, xâm nhập sâu vào tận các phế nang, làm vỡ các vách ngăn phế nang (bệnh khí phế thũng) gây suy hô hấp không hồi phục.',
  },
];

export const LUNGS_CAMERA_PRESETS = {
  front: {
    position: { x: 0, y: 0.02, z: 0.62 },
    target: { x: 0, y: 0.02, z: 0 },
    description: 'Mặt trước: Quan sát khí quản, phế quản và các thùy phổi',
  },
  back: {
    position: { x: 0, y: 0.02, z: -0.62 },
    target: { x: 0, y: 0.02, z: 0 },
    description: 'Mặt sau: Quan sát mặt sau khí quản và rốn phổi',
  },
  left: {
    position: { x: 0.62, y: 0.02, z: 0 },
    target: { x: 0, y: 0.02, z: 0 },
    description: 'Bên trái: Quan sát thùy trên, thùy dưới và khuyết tim phổi trái',
  },
  right: {
    position: { x: -0.62, y: 0.02, z: 0 },
    target: { x: 0, y: 0.02, z: 0 },
    description: 'Bên phải: Quan sát 3 thùy phổi phải và các khe rãnh',
  },
  top: {
    position: { x: 0, y: 0.65, z: 0.05 },
    target: { x: 0, y: 0.02, z: 0 },
    description: 'Góc nhìn từ trên: Quan sát đỉnh phổi và đường vào khí quản',
  },
};

export const LUNGS_CYCLE_INFO = {
  name: 'Cơ chế thông khí phổi',
  duration: '3.5 - 4.0 giây (16-18 nhịp/phút)',
  insight: 'Ở trạng thái nghỉ ngơi, mỗi nhịp thở lưu thông khoảng 500 ml không khí (khí lưu thông). Khi gắng sức, dung tích sống có thể đạt tới 3.5 - 4.5 lít.',
  phases: [
    {
      name: 'Pha hít vào chủ động',
      time: '1.5 giây',
      action: 'Cơ liên sườn ngoài và cơ hoành co, lồng ngực dãn rộng và cơ hoành hạ thấp -> Thể tích khoang ngực tăng -> Áp suất phế nang giảm dưới áp suất khí quyển -> Không khí giàu O₂ ùa vào phổi.',
    },
    {
      name: 'Pha thở ra thụ động',
      time: '2.5 giây',
      action: 'Cơ liên sườn ngoài và cơ hoành dãn, lồng ngực hạ xuống và cơ hoành nhô lên -> Thể tích khoang ngực giảm -> Áp suất phế nang tăng cao hơn khí quyển -> Đẩy không khí giàu CO₂ ra ngoài.',
    },
  ],
};

// ====================================================================
// MASTER DATABASE - 5 CƠ QUAN GIẢI PHẪU (KHTN 8)
// ====================================================================
export const ORGANS_DATA = {
  heart: {
    id: 'heart',
    name: 'Trái tim',
    latin: 'Cor humanum',
    icon: '🫀',
    system: 'Hệ tuần hoàn',
    curriculum: {
      grade: 8,
      topic: 'Hệ tuần hoàn',
    },
    implementationStatus: 'stable',
    available: true,
    statusNote: 'Đã hoàn thiện v1',
    modelKey: 'human_heart',
    features: {
      heartbeat: true,
      heartbeatAudio: true,
      particles: true,
      safeSurfaceHover: true,
      xray: false, // Tạm hoãn do mô hình hiện tại là hollow shell
    },
    interaction: {
      mode: 'hybrid', // Single-mesh kết hợp 3D hotspots + safe surface hover
    },
    normalization: {
      autoCenter: true,
      targetSize: null, // null = giữ nguyên tỉ lệ gốc của mô hình tim 3D
      scaleModifier: 1.0,
    },
    camera: {
      defaultPosition: { x: 0, y: 0.03, z: 0.46 },
      defaultTarget: { x: 0, y: 0, z: 0 },
      minDistance: 0.15,
      maxDistance: 1.2,
      presets: HEART_CAMERA_PRESETS,
    },
    structures: HEART_STRUCTURES,
    cycleInfo: HEART_CYCLE_INFO,
  },

  lungs: {
    id: 'lungs',
    name: 'Phổi',
    latin: 'Pulmones',
    icon: '🫁',
    system: 'Hệ hô hấp',
    curriculum: {
      grade: 8,
      topic: 'Hệ hô hấp',
    },
    implementationStatus: 'stable',
    available: true,
    statusNote: 'Đã hoàn thiện v1',
    modelKey: 'lungs',
    features: {
      heartbeat: false,
      heartbeatAudio: false,
      particles: false,
      safeSurfaceHover: true,
      xray: false,
    },
    interaction: {
      mode: 'hybrid', // 2 mesh (đường dẫn khí + nhu mô phổi) kết hợp 6 3D Hotspots
    },
    normalization: {
      autoCenter: true,
      targetSize: null, // Giữ nguyên kích thước gốc chuẩn của mô hình 0.369m
      scaleModifier: 1.0,
    },
    camera: {
      defaultPosition: { x: 0, y: 0.02, z: 0.62 },
      defaultTarget: { x: 0, y: 0.02, z: 0 },
      minDistance: 0.25,
      maxDistance: 1.8,
      presets: LUNGS_CAMERA_PRESETS,
    },
    structures: LUNGS_STRUCTURES,
    cycleInfo: LUNGS_CYCLE_INFO,
  },

  stomach: {
    id: 'stomach',
    name: 'Dạ dày',
    latin: 'Gaster',
    icon: '🥣',
    system: 'Hệ tiêu hóa',
    curriculum: {
      grade: 8,
      topic: 'Hệ tiêu hóa',
    },
    implementationStatus: 'planned',
    available: false,
    statusNote: 'Đang phát triển (Sắp có)',
    modelKey: null,
    features: {
      heartbeat: false,
      heartbeatAudio: false,
      particles: false,
      safeSurfaceHover: false,
      xray: false,
    },
    interaction: {
      mode: 'hybrid',
    },
    normalization: {
      autoCenter: true,
      targetSize: 0.25,
      scaleModifier: 1.0,
    },
    camera: {
      defaultPosition: { x: 0, y: 0.02, z: 0.45 },
      defaultTarget: { x: 0, y: 0, z: 0 },
      minDistance: 0.18,
      maxDistance: 1.3,
      presets: {},
    },
    structures: [],
    cycleInfo: null,
  },

  kidneys: {
    id: 'kidneys',
    name: 'Thận',
    latin: 'Renes',
    icon: '🫘',
    system: 'Hệ bài tiết',
    curriculum: {
      grade: 8,
      topic: 'Hệ bài tiết',
    },
    implementationStatus: 'planned',
    available: false,
    statusNote: 'Đang phát triển (Sắp có)',
    modelKey: null,
    features: {
      heartbeat: false,
      heartbeatAudio: false,
      particles: false,
      safeSurfaceHover: false,
      xray: false,
    },
    interaction: {
      mode: 'hotspots',
    },
    normalization: {
      autoCenter: true,
      targetSize: 0.25,
      scaleModifier: 1.0,
    },
    camera: {
      defaultPosition: { x: 0, y: 0.02, z: 0.45 },
      defaultTarget: { x: 0, y: 0, z: 0 },
      minDistance: 0.18,
      maxDistance: 1.3,
      presets: {},
    },
    structures: [],
    cycleInfo: null,
  },

  brain: {
    id: 'brain',
    name: 'Não bộ',
    latin: 'Encephalon',
    icon: '🧠',
    system: 'Hệ thần kinh',
    curriculum: {
      grade: 8,
      topic: 'Hệ thần kinh',
    },
    implementationStatus: 'planned',
    available: false,
    statusNote: 'Đang phát triển (Sắp có)',
    modelKey: null,
    features: {
      heartbeat: false,
      heartbeatAudio: false,
      particles: false,
      safeSurfaceHover: false,
      xray: false,
    },
    interaction: {
      mode: 'mesh',
    },
    normalization: {
      autoCenter: true,
      targetSize: 0.26,
      scaleModifier: 1.0,
    },
    camera: {
      defaultPosition: { x: 0, y: 0.04, z: 0.48 },
      defaultTarget: { x: 0, y: 0, z: 0 },
      minDistance: 0.18,
      maxDistance: 1.4,
      presets: {},
    },
    structures: [],
    cycleInfo: null,
  },
};

/** Tương thích ngược */
export const ORGAN_CONFIGS = ORGANS_DATA;

export function getOrganConfig(id) {
  return ORGANS_DATA[id] || null;
}


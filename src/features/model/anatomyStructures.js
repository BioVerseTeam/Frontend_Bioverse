/**
 * Dữ liệu cấu trúc giải phẫu học định hướng giáo dục KHTN 8 (GDPT 2018)
 * Phục vụ cho hệ thống tương tác 3D Hybrid (3D Hotspot Anchors + Surface Hover + Camera Presets)
 * Cho các mô hình:
 * 1. Hệ Tiêu Hóa & Nội Tạng (he-tieu-hoa)
 * 2. Hệ Tuần Hoàn & Tim Mạch (he-tuan-hoan)
 * 3. Phổi & Hệ Hô Hấp Người (phoi-nguoi)
 */

export const CARDIOVASCULAR_STRUCTURES = [
  {
    id: 'aorta',
    number: 1,
    name: 'Động mạch chủ',
    latin: 'Aorta',
    color: '#ef4444',
    isInternal: false,
    position: { x: 0.018, y: 0.070, z: 0.038 },
    hoverRadius: 0.035,
    cameraPosition: { x: 0.45, y: 1.05, z: 3.5 },
    cameraTarget: { x: 0.22, y: 0.86, z: 0.52 },
    description: 'Động mạch lớn nhất của cơ thể, xuất phát từ tâm thất trái, uốn cong hình chữ U ngược tạo thành quai động mạch chủ trước khi phân nhánh. Thành động mạch rất dày, có lớp cơ trơn và nhiều sợi đàn hồi giúp chịu đựng được áp lực máu cực lớn tống ra từ thất trái.',
    function: 'Dẫn dòng máu đỏ tươi giàu oxy (O₂) và dưỡng chất từ tâm thất trái đi nuôi toàn bộ các cơ quan và mô tế bào trong cơ thể (khởi đầu của vòng tuần hoàn lớn).',
    location: 'Xuất phát từ tâm thất trái, uốn cong hình quai màu đỏ tươi phía trên đỉnh tim rồi chạy dọc xuống lồng ngực và khoang bụng.',
    learningNote: 'Xơ vữa động mạch (do lắng đọng cholesterol, chất béo) làm thành động mạch chủ xơ cứng, giảm tính đàn hồi, dẫn đến huyết áp tăng cao và nguy cơ phình vỡ động mạch chủ.'
  },
  {
    id: 'left_ventricle',
    number: 2,
    name: 'Tâm thất trái',
    latin: 'Ventriculus sinister',
    color: '#f43f5e',
    isInternal: false,
    position: { x: 0.032, y: -0.040, z: 0.054 },
    hoverRadius: 0.042,
    cameraPosition: { x: 1.25, y: -0.45, z: 3.4 },
    cameraTarget: { x: 0.40, y: -0.49, z: 0.68 },
    description: 'Ngăn tim nằm ở phía dưới bên trái (bên phải theo góc nhìn của người quan sát), có lớp cơ tim dày nhất (gấp khoảng 3 lần thành tâm thất phải). Đỉnh tim (mỏm tim) chúc xuống dưới và hơi chếch sang trái lồng ngực. Ngăn cách với tâm nhĩ trái bằng van 2 lá và thông với động mạch chủ bằng van tổ chim.',
    function: 'Co bóp với lực cực mạnh để tống máu giàu O₂ vào động mạch chủ với áp lực lớn, giúp máu vượt qua sức cản của toàn bộ mạng lưới mạch máu đi khắp cơ thể.',
    location: 'Nằm ở phần cơ tim dày phía dưới và thành bên trái của quả tim.',
    learningNote: 'Tăng huyết áp kéo dài khiến tâm thất trái phải co bóp gắng sức liên tục, lâu ngày dẫn đến biến chứng phì đại cơ tim và suy tim.'
  },
  {
    id: 'right_ventricle',
    number: 3,
    name: 'Tâm thất phải',
    latin: 'Ventriculus dexter',
    color: '#3b82f6',
    isInternal: false,
    position: { x: -0.022, y: -0.035, z: 0.062 },
    hoverRadius: 0.042,
    cameraPosition: { x: -1.05, y: -0.35, z: 3.5 },
    cameraTarget: { x: -0.27, y: -0.43, z: 0.80 },
    description: 'Ngăn tim nằm ở mặt trước dưới bên phải (bên trái theo góc nhìn trực diện), thành cơ mỏng hơn tâm thất trái. Nhận máu giàu CO₂ từ tâm nhĩ phải qua van 3 lá và thông với thân động mạch phổi qua van động mạch phổi.',
    function: 'Co bóp đẩy dòng máu đỏ thẫm giàu CO₂ vào động mạch phổi để đưa máu lên hai lá phổi thực hiện quá trình trao đổi khí (thuộc vòng tuần hoàn nhỏ).',
    location: 'Nằm ở mặt trước dưới trung tâm của quả tim.',
    learningNote: 'Các bệnh phổi mạn tính (như COPD, hen suyễn kéo dài) làm tăng áp lực động mạch phổi, khiến thất phải phải gắng sức tống máu, dẫn tới bệnh lý "tâm phế mạn".'
  },
  {
    id: 'atria',
    number: 4,
    name: 'Tâm nhĩ (Trái & Phải)',
    latin: 'Atrium cordis',
    color: '#a855f7',
    isInternal: false,
    position: { x: -0.035, y: 0.045, z: 0.032 },
    hoverRadius: 0.040,
    cameraPosition: { x: -1.2, y: 0.85, z: 3.5 },
    cameraTarget: { x: -0.43, y: 0.56, z: 0.39 },
    description: 'Hai buồng tim nằm ở phía trên (đáy tim), thành cơ mỏng hơn tâm thất rất nhiều. Tâm nhĩ phải nhận máu từ tĩnh mạch chủ trên và tĩnh mạch chủ dưới; tâm nhĩ trái nhận máu từ 4 tĩnh mạch phổi.',
    function: 'Đóng vai trò bể chứa tiếp nhận máu từ các tĩnh mạch trở về tim. Khi tâm nhĩ co (pha co tâm nhĩ kéo dài 0.1 giây), máu được ép đẩy xuống hai tâm thất tương ứng qua hệ thống van nhĩ - thất.',
    location: 'Nằm ở tầng trên (đáy tim), phía sau và bên cạnh các thân mạch máu lớn.',
    learningNote: 'Rung nhĩ là dạng rối loạn nhịp tim phổ biến, khiến tâm nhĩ run rẩy thay vì co bóp nhịp nhàng, làm ứ trệ máu và dễ tạo huyết khối (cục máu đông) gây tắc mạch não dẫn tới đột quỵ.'
  },
  {
    id: 'valves',
    number: 5,
    name: 'Hệ thống van tim',
    latin: 'Valvae cordis',
    color: '#eab308',
    isInternal: true,
    position: { x: 0.008, y: -0.005, z: 0.015 },
    hoverRadius: 0.035,
    cameraPosition: { x: 0.35, y: 0.15, z: 3.5 },
    cameraTarget: { x: 0.10, y: -0.06, z: 0.18 },
    description: 'Gồm van 2 lá (giữa nhĩ trái và thất trái), van 3 lá (giữa nhĩ phải và thất phải), và các van tổ chim (gốc động mạch chủ và động mạch phổi). Cấu tạo từ các lá van sợi đàn hồi gắn với cơ nhú qua dây chằng gân.',
    function: 'Hoạt động như những chiếc van một chiều tuyệt đối: cho phép máu chỉ chảy theo một chiều (từ tâm nhĩ xuống tâm thất, từ tâm thất ra động mạch) và đóng chặt lại để ngăn không cho máu chảy ngược dòng.',
    location: 'Cấu trúc giải phẫu bên trong: Nằm tại các lỗ thông nhĩ - thất và tại gốc các động mạch lớn bên trong quả tim.',
    learningNote: 'LƯU Ý HỌC TẬP: Van tim là cấu trúc bên trong tim. Mô hình hiện tại chủ yếu thể hiện bề mặt ngoài, nên điểm đánh dấu này biểu thị vị trí mặt phẳng van bên trong tim để học tập. Bệnh hẹp hoặc hở van tim (do thoái hóa, thấp tim) làm van không đóng kín, máu bị phụt ngược trở lại khiến tim phải làm việc tăng tải, lâu dần gây giãn tim và suy tim.'
  },
  {
    id: 'pulmonary_artery',
    number: 6,
    name: 'Động mạch phổi',
    latin: 'Arteria pulmonalis',
    color: '#06b6d4',
    isInternal: false,
    position: { x: 0.008, y: 0.025, z: 0.068 },
    hoverRadius: 0.038,
    cameraPosition: { x: 0.45, y: 0.55, z: 3.5 },
    cameraTarget: { x: 0.10, y: 0.31, z: 0.88 },
    description: 'Xuất phát từ tâm thất phải, uốn cong ra phía trước quai động mạch chủ rồi chia đôi thành 2 nhánh: động mạch phổi phải (vào phổi phải) và động mạch phổi trái (vào phổi trái).',
    function: 'Vận chuyển máu nghèo O₂ (giàu CO₂) từ tâm thất phải lên các phế nang của phổi để nhả khí CO₂ và nhận dưỡng khí O₂. Đây là động mạch duy nhất trong cơ thể chứa máu đỏ thẫm (máu nghèo oxy).',
    location: 'Xuất phát từ đáy tâm thất phải, vắt ngang mặt trước gốc động mạch chủ rồi chia nhánh sang hai lá phổi.',
    learningNote: 'Thuyên tắc phổi (Pulmonary Embolism) xảy ra khi có cục máu đông di chuyển từ tĩnh mạch chân lên làm tắc động mạch phổi, gây suy hô hấp cấp tính nguy hiểm.'
  }
];

export const RESPIRATORY_STRUCTURES = [
  {
    id: 'trachea',
    number: 1,
    name: 'Khí quản',
    latin: 'Trachea',
    color: '#38bdf8',
    position: { x: -0.001, y: 0.112, z: 0.010 },
    hoverRadius: 0.045,
    cameraPosition: { x: 0.0, y: 0.12, z: 0.42 },
    cameraTarget: { x: 0.0, y: 0.10, z: 0.0 },
    description: 'Ống dẫn khí hình trụ dài khoảng 11-13 cm, gồm 16-20 vòng sụn khuyết chữ C xếp chồng lên nhau, phía sau là lớp cơ trơn đàn hồi giúp thực quản dễ dàng dãn nở khi nuốt thức ăn. Lớp niêm mạc lót có biểu mô trụ có lông rung và tuyến tiết chất nhầy.',
    function: 'Dẫn không khí từ thanh quản xuống phế quản; lớp chất nhầy giữ lại bụi bẩn, vi khuẩn và các vi mao lông rung liên tục đẩy dị vật ngược lên hầu họng để ho hoặc khạc ra ngoài, giúp sưởi ấm, làm ẩm và làm sạch luồng không khí hít vào.',
    location: 'Nằm ở đường giữa phía trước cổ và ngực, ngay đằng trước thực quản.',
    learningNote: 'Khói thuốc lá và bụi mịn làm tê liệt, phá hủy hệ thống lông rung của khí quản, khiến đường thở mất khả năng tự làm sạch, dẫn tới viêm khí quản mạn tính và ho khan dai dẳng.'
  },
  {
    id: 'bronchi',
    number: 2,
    name: 'Phế quản chính',
    latin: 'Bronchi principales',
    color: '#a855f7',
    position: { x: -0.001, y: 0.061, z: 0.008 },
    hoverRadius: 0.040,
    cameraPosition: { x: 0.0, y: 0.07, z: 0.38 },
    cameraTarget: { x: 0.0, y: 0.05, z: 0.0 },
    description: 'Nơi khí quản chia đôi (chẽ ba khí quản - Carina) thành hai nhánh: phế quản chính phải (ngắn hơn, đường kính to hơn và dốc đứng hơn) và phế quản chính trái (dài hơn, nhỏ hơn và nằm ngang hơn). Cấu tạo bởi các vòng sụn hoàn chỉnh bao quanh.',
    function: 'Phân chia và dẫn truyền không khí trực tiếp vào rốn phổi của từng lá phổi tương ứng, sau đó tiếp tục phân nhánh liên tục thành cây phế quản (phế quản thùy, phân thùy và tiểu phế quản tận).',
    location: 'Phân nhánh từ đoạn cuối khí quản ngang mức đốt sống ngực T4-T5 đi vào cuống hai lá phổi.',
    learningNote: 'Do phế quản chính phải to và dốc hơn phế quản trái, các dị vật đường thở (hạt dưa, đồ chơi nhỏ trẻ em vô tình hít phải) có tới hơn 70% trường hợp rơi mắc vào phế quản bên phải.'
  },
  {
    id: 'pulmo_dexter',
    number: 3,
    name: 'Phổi phải (3 thùy)',
    latin: 'Pulmo dexter',
    color: '#ef4444',
    position: { x: -0.045, y: 0.020, z: 0.020 },
    hoverRadius: 0.055,
    cameraPosition: { x: -0.16, y: 0.02, z: 0.45 },
    cameraTarget: { x: -0.04, y: 0.01, z: 0.0 },
    description: 'Lá phổi nằm ở nửa bên phải khoang ngực, có thể tích và trọng lượng lớn hơn phổi trái (~600g). Được chia thành 3 thùy riêng biệt (thùy trên, thùy giữa, thùy dưới) bởi hai rãnh xẻ sâu: khe chếch và khe ngang.',
    function: 'Thực hiện trao đổi khí chủ lực của cơ thể: tiếp nhận khí O₂ từ phế nang khuếch tán vào máu và đào thải CO₂ từ mao mạch máu ra ngoài. Đóng góp khoảng 55% tổng dung tích hô hấp của cơ thể.',
    location: 'Chiếm trọn nửa bên phải khoang lồng ngực, tựa lên vòm cơ hoành phải và được khung sườn bảo vệ.',
    learningNote: 'Phổi phải nằm ngay phía trên cơ hoành và gan; viêm phổi thùy dưới bên phải có thể gây đau lan tỏa xuống vùng hạ sườn phải dễ nhầm lẫn với các bệnh lý gan mật cấp.'
  },
  {
    id: 'pulmo_sinister',
    number: 4,
    name: 'Phổi trái (2 thùy & Khuyết tim)',
    latin: 'Pulmo sinister',
    color: '#3b82f6',
    position: { x: 0.048, y: 0.020, z: 0.020 },
    hoverRadius: 0.055,
    cameraPosition: { x: 0.16, y: 0.02, z: 0.45 },
    cameraTarget: { x: 0.04, y: 0.01, z: 0.0 },
    description: 'Lá phổi nằm ở nửa bên trái lồng ngực, dung tích nhỏ hơn phổi phải (~500g). Chỉ gồm 2 thùy (thùy trên và thùy dưới) ngăn cách bởi khe chếch. Ở bờ trước phía trong có một vết lõm sâu gọi là khuyết tim (Incisura cardiaca) để nhường chỗ cho đỉnh quả tim tựa vào.',
    function: 'Cùng với phổi phải duy trì thông khí và khuếch tán khí O₂ / CO₂ liên tục giữa cơ thể với môi trường ngoài. Đóng góp khoảng 45% chức năng trao đổi khí toàn cơ thể.',
    location: 'Chiếm nửa bên trái khoang lồng ngực, ôm sát bên trái màng tim và đỉnh tim.',
    learningNote: 'Khuyết tim trên phổi trái là minh chứng cho sự tối ưu không gian giải phẫu giữa hệ tuần hoàn và hệ hô hấp trong lồng ngực người.'
  },
  {
    id: 'lobi_pulmonis',
    number: 5,
    name: 'Các thùy phổi & Màng phổi',
    latin: 'Lobi pulmonis & Pleura',
    color: '#f59e0b',
    position: { x: -0.038, y: 0.075, z: 0.012 },
    hoverRadius: 0.048,
    cameraPosition: { x: -0.10, y: 0.08, z: 0.40 },
    cameraTarget: { x: -0.02, y: 0.06, z: 0.0 },
    description: 'Phổi được bao bọc bởi màng phổi gồm 2 lá thanh mạc: lá thành lót mặt trong lồng ngực và lá tạng dính sát mặt ngoài nhu mô phổi. Giữa hai lá là khoang màng phổi kín chứa một lượng dịch nhờn vi lượng giúp hai lá trượt êm ái lên nhau khi thở.',
    function: 'Khoang màng phổi kín duy trì áp suất âm so với khí quyển, giúp phổi luôn nở ôm sát lồng ngực và dãn nở thụ động dễ dàng theo sự chuyển động của khung xương sườn và cơ hoành.',
    location: 'Bao phủ toàn bộ mặt ngoài nhu mô phổi và lót mặt trong khung xương sườn lồng ngực.',
    learningNote: 'Tràn khí hoặc tràn dịch màng phổi làm mất áp suất âm, khiến nhu mô phổi bị co xẹp (xẹp phổi), gây khó thở cấp tính và đau ngực nhói dữ dội khi hít sâu.'
  },
  {
    id: 'alveoli',
    number: 6,
    name: 'Phế nang & Mạng mao mạch',
    latin: 'Alveoli pulmonis',
    color: '#10b981',
    position: { x: 0.035, y: -0.030, z: 0.015 },
    hoverRadius: 0.042,
    cameraPosition: { x: 0.12, y: -0.04, z: 0.38 },
    cameraTarget: { x: 0.03, y: -0.03, z: 0.0 },
    description: 'Đơn vị cấu tạo và chức năng cơ bản của phổi. Ở người có khoảng 300 - 500 triệu phế nang hình túi cầu tí hon, tạo nên tổng diện tích bề mặt trao đổi khí khổng lồ lên tới 70 - 100 m² (gấp 40 - 50 lần diện tích da). Thành phế nang cực mỏng, chỉ gồm một lớp tế bào dẹt tiếp xúc với mạng mao mạch máu dày đặc.',
    function: 'Là nơi diễn ra sự khuếch tán khí sinh học: O₂ từ lòng phế nang khuếch tán qua màng hô hấp vào hồng cầu máu, đồng thời CO₂ từ máu mao mạch khuếch tán ngược vào lòng phế nang để tống ra ngoài khi thở ra.',
    location: 'Phân bố ở tận cùng của cây phế quản, nằm sâu trong toàn bộ nhu mô phổi.',
    learningNote: 'Bụi mịn siêu vi PM2.5 và khói thuốc có thể vượt qua toàn bộ hàng rào bảo vệ, xâm nhập sâu vào tận các phế nang, làm vỡ các vách ngăn phế nang (bệnh khí phế thũng) gây suy hô hấp không hồi phục.'
  }
];

export const DIGESTIVE_STRUCTURES = [
  {
    id: 'thuc-quan',
    number: 1,
    name: 'Thực quản',
    latin: 'Oesophagus',
    color: '#48bb78',
    position: { x: 0.0, y: 0.85, z: 0.05 },
    hoverRadius: 0.045,
    cameraPosition: { x: 0.0, y: 0.75, z: 0.38 },
    cameraTarget: { x: 0.0, y: 0.82, z: 0.0 },
    description: 'Ống dẫn thức ăn thành cơ bắp co bóp theo sóng nhu động giúp đưa viên thức ăn từ miệng xuống dạ dày chỉ trong 4-8 giây.',
    function: 'Vận chuyển thức ăn nhờ sóng nhu động cơ học; cơ vòng thực quản dưới đóng mở kiểm soát dịch vị không trào ngược.',
    location: 'Ống bắp kéo dài từ sau thanh quản xuống qua cơ hoành vào dạ dày.',
    learningNote: 'Thói quen ăn quá nhanh hoặc nằm ngay sau ăn dễ làm cơ vòng thực quản dưới suy yếu gây trào ngược dạ dày thực quản (GERD).'
  },
  {
    id: 'gan',
    number: 2,
    name: 'Gan',
    latin: 'Hepar',
    color: '#ed8936',
    position: { x: -0.28, y: 0.56, z: 0.15 },
    hoverRadius: 0.065,
    cameraPosition: { x: -0.25, y: 0.55, z: 0.42 },
    cameraTarget: { x: -0.20, y: 0.52, z: 0.05 },
    description: 'Tạng lớn nhất cơ thể màu nâu đỏ. Nơi diễn ra hơn 500 chức năng chuyển hóa, lọc máu và tổng hợp protein quan trọng.',
    function: 'Sản xuất dịch mật (0.5-1L/ngày) giúp nhũ hóa chất béo; giải độc hóa chất và dự trữ Glycogen.',
    location: 'Nằm phía hạ sườn phải (bên trái theo góc nhìn phía trước), áp sát dưới cơ hoành.',
    learningNote: 'Gan có khả năng tái sinh kỳ diệu; tuy nhiên rượu bia và mỡ thừa kéo dài có thể gây xơ gan không hồi phục.'
  },
  {
    id: 'da-day',
    number: 3,
    name: 'Dạ dày',
    latin: 'Ventriculus / Gaster',
    color: '#e53e3e',
    position: { x: 0.22, y: 0.54, z: 0.15 },
    hoverRadius: 0.060,
    cameraPosition: { x: 0.22, y: 0.52, z: 0.40 },
    cameraTarget: { x: 0.18, y: 0.50, z: 0.05 },
    description: 'Cơ quan dạng túi co bóp mạnh nhất hệ tiêu hóa. Tiết dịch vị chứa Axit HCl (pH ~ 1.5-2.0) và enzyme Pepsin để biến thức ăn thành dưỡng trác.',
    function: 'Lưu trữ thức ăn (tới 1.5L), nhào trộn cơ học và tiêu hóa hóa học protein trước khi đưa xuống ruột non.',
    location: 'Tầng trên khoang bụng, nằm dưới cơ hoành nghiêng về phía bên trái cơ thể.',
    learningNote: 'Lớp niêm mạc nhầy bảo vệ dạ dày khỏi bị chính axit HCl ăn mòn; vi khuẩn HP và stress có thể làm loét lớp màng bảo vệ này.'
  },
  {
    id: 'tui-mat',
    number: 4,
    name: 'Túi mật',
    latin: 'Vesica fellea',
    color: '#d69e2e',
    position: { x: -0.16, y: 0.48, z: 0.2 },
    hoverRadius: 0.038,
    cameraPosition: { x: -0.15, y: 0.46, z: 0.35 },
    cameraTarget: { x: -0.14, y: 0.45, z: 0.08 },
    description: 'Túi cô đặc mật do gan tiết ra. Khi thức ăn chứa chất béo xuống tá tràng, túi mật co bóp tống mật vào ruột non qua ống mật chủ.',
    function: 'Dự trữ và cô đặc dịch mật; bài tiết mật cô đặc đúng lúc để hỗ trợ tiêu hóa và hấp thụ mỡ.',
    location: 'Túi nhỏ hình quả lê nằm ở mặt dưới của gan.',
    learningNote: 'Rối loạn chuyển hóa cholesterol hoặc muối mật có thể hình thành sỏi mật gây tắc ống dẫn mật.'
  },
  {
    id: 'tuy',
    number: 5,
    name: 'Tuyến tụy',
    latin: 'Pancreas',
    color: '#38b2ac',
    position: { x: 0.02, y: 0.46, z: 0.05 },
    hoverRadius: 0.042,
    cameraPosition: { x: 0.05, y: 0.45, z: 0.35 },
    cameraTarget: { x: 0.02, y: 0.44, z: 0.02 },
    description: 'Tuyến pha vừa ngoại tiết vừa nội tiết. Tuyến ngoại tiết tiết ra dịch tụy giàu enzyme (Amylase, Lipase, Trypsin) tiêu hóa carbohydrate, mỡ và đạm.',
    function: 'Tiết dịch tụy trung hòa axit dạ dày và phân giải chất dinh dưỡng; tiết Hormone Insulin & Glucagon điều hòa đường huyết.',
    location: 'Nằm ngang phía sau dạ dày, đầu tụy ôm lấy quai tá tràng.',
    learningNote: 'Tế bào đảo tụy tiết Insulin giúp đưa đường glucose vào tế bào; suy giảm insulin là nguyên nhân gây bệnh tiểu đường.'
  },
  {
    id: 'ruot-non',
    number: 6,
    name: 'Ruột non',
    latin: 'Intestinum tenue',
    color: '#3182ce',
    position: { x: 0.0, y: 0.32, z: 0.18 },
    hoverRadius: 0.065,
    cameraPosition: { x: 0.0, y: 0.32, z: 0.42 },
    cameraTarget: { x: 0.0, y: 0.30, z: 0.05 },
    description: 'Đoạn ống dài 5-6m gồm Tá tràng, Hỗng tràng và Hồi tràng. Niêm mạc có vô số nếp gấp và lông ruột làm tăng diện tích tiếp xúc lên tới 500m².',
    function: 'Hoàn tất tiêu hóa hóa học toàn bộ chất dinh dưỡng và hấp thụ 90% dưỡng chất vào máu và hệ bạch huyết.',
    location: 'Chiếm phần lớn trung tâm khoang bụng, xếp thành các nếp quai ruột.',
    learningNote: 'Các lông ruột vi mô chứa mạng mao mạch máu và mạch bạch huyết dày đặc, giúp chất dinh dưỡng khuếch tán nhanh chóng vào cơ thể.'
  },
  {
    id: 'ruot-gia',
    number: 7,
    name: 'Ruột già / Đại tràng',
    latin: 'Intestinum crassum / Colon',
    color: '#805ad5',
    position: { x: 0.32, y: 0.3, z: 0.18 },
    hoverRadius: 0.065,
    cameraPosition: { x: 0.28, y: 0.30, z: 0.42 },
    cameraTarget: { x: 0.22, y: 0.28, z: 0.05 },
    description: 'Gồm Manh tràng, Đại tràng (lên, ngang, xuống, xích-ma). Nơi ký sinh của hàng nghìn tỷ vi khuẩn có lợi giúp lên men chất xơ và cô đặc phân.',
    function: 'Tái hấp thu nước, chất điện giải; tổng hợp Vitamin K và nhóm B nhờ hệ vi sinh đường ruột và tạo khuôn phân.',
    location: 'Khung ruột dài khoảng 1.5m bao quanh bên ngoài quai ruột non.',
    learningNote: 'Uống đủ nước và ăn nhiều chất xơ giúp nhu động đại tràng khỏe mạnh, ngăn ngừa táo bón và các bệnh đại tràng.'
  },
  {
    id: 'truc-trang',
    number: 8,
    name: 'Trực tràng & Hậu môn',
    latin: 'Rectum & Anus',
    color: '#2b6cb0',
    position: { x: 0.0, y: 0.05, z: 0.0 },
    hoverRadius: 0.040,
    cameraPosition: { x: 0.0, y: 0.08, z: 0.35 },
    cameraTarget: { x: 0.0, y: 0.05, z: 0.0 },
    description: 'Đoạn ống thẳng dài khoảng 12-15cm tích trữ phân trước khi bài tiết. Khi phân lấp đầy trực tràng sẽ kích thích phản xạ đi cầu.',
    function: 'Lưu trữ phân tạm thời và kiểm soát bài tiết phân ra ngoài cơ thể qua cơ vòng hậu môn.',
    location: 'Phần cuối cùng của ống tiêu hóa, nằm ở vùng chậu hông.',
    learningNote: 'Cơ vòng hậu môn chịu sự điều khiển có ý thức của não bộ, giúp cơ thể chủ động trong việc bài tiết.'
  }
];

export const MODEL_ANATOMY_REGISTRY = {
  'he-tuan-hoan': CARDIOVASCULAR_STRUCTURES,
  'tim-mach': CARDIOVASCULAR_STRUCTURES,
  'heart': CARDIOVASCULAR_STRUCTURES,
  'human_heart': CARDIOVASCULAR_STRUCTURES,

  'phoi-nguoi': RESPIRATORY_STRUCTURES,
  'he-ho-hap': RESPIRATORY_STRUCTURES,
  'lungs': RESPIRATORY_STRUCTURES,
  'realistic_human_lungs': RESPIRATORY_STRUCTURES,

  'he-tieu-hoa': DIGESTIVE_STRUCTURES,
  'digestive': DIGESTIVE_STRUCTURES,
  'stomach': DIGESTIVE_STRUCTURES,
  'digestive_system': DIGESTIVE_STRUCTURES
};

/**
 * Lấy danh sách cấu trúc giải phẫu học chuẩn theo slug hoặc modelKey
 */
export function getAnatomyStructuresForModel(slugOrKey) {
  if (!slugOrKey) return null;
  const clean = String(slugOrKey).toLowerCase().trim().replace(/[^a-z0-9_-]+/g, '');
  if (MODEL_ANATOMY_REGISTRY[clean]) return MODEL_ANATOMY_REGISTRY[clean];

  for (const [key, list] of Object.entries(MODEL_ANATOMY_REGISTRY)) {
    if (clean.includes(key) || key.includes(clean)) {
      return list;
    }
  }
  return null;
}

/**
 * Từ điển giải phẫu học BioVerse (Vietnamese Anatomical Dictionary)
 * Chứa thông tin chuẩn giáo khoa & y học GDPT KHTN 8 cho tất cả các hệ cơ thể:
 * - Hệ Tiêu Hóa & Nội Tạng (Digestive System)
 * - Hệ Tuần Hoàn & Tim Mạch (Circulatory & Cardiovascular System)
 * - Phổi & Hệ Hô Hấp (Respiratory System)
 * - Hệ Thần Kinh & Dây Thần Kinh (Nervous System)
 * - Hệ Xương & Cơ (Skeletal & Muscular Systems)
 */

export const ANATOMY_DICTIONARY = [
  // ============================================
  // HỆ TIÊU HÓA & NỘI TẠNG (DIGESTIVE SYSTEM)
  // ============================================
  {
    keys: ['stomach', 'gaster', 'ventriculus', 'da_day', 'daday', 'gastric', 'fundus of stomach', 'body of stomach', 'pylorus', 'pyloric'],
    name: 'Dạ dày',
    latin: 'Gaster / Ventriculus',
    description: 'Cơ quan hình túi co bóp nằm ở khoang bụng trên trái. Là nơi chứa, nhào trộn và tiêu hóa hóa học thức ăn nhờ axit dịch vị (HCl) và enzym pepsin.',
    function: 'Nhào trộn cơ học thức ăn, tiết dịch vị phân giải protein thành peptit chuỗi ngắn và diệt vi khuẩn trong thức ăn.',
    location: 'Nằm ở thượng vị và hạ sườn trái, ngay dưới cơ hoành.'
  },
  {
    keys: ['liver', 'hepar', 'gan', 'hepatic', 'lobe of liver', 'caudate lobe', 'quadrate lobe'],
    name: 'Gan',
    latin: 'Hepar',
    description: 'Tuyến nội tạng lớn nhất cơ thể con người, có màu nâu đỏ. Gan đóng vai trò như một nhà máy hóa chất kỳ diệu xử lý các chất dinh dưỡng và chất độc.',
    function: 'Tiết dịch mật giúp nhũ hóa chất béo, khử độc máu, dự trữ glycogen, tổng hợp protein huyết tương và điều hòa đường huyết.',
    location: 'Nằm ở hạ sườn phải, ngay bên dưới cơ hoành và đè lên dạ dày.'
  },
  {
    keys: ['small_intestine', 'intestinum_tenue', 'small intestine', 'ruot_non', 'jejunum', 'ileum', 'mesentery'],
    name: 'Ruột non (Hỗng tràng & Hồi tràng)',
    latin: 'Intestinum tenue',
    description: 'Ống tiêu hóa dài nhất (khoảng 6 mét ở người trưởng thành) có niêm mạc chứa hàng triệu lông ruột làm tăng diện tích hấp thụ.',
    function: 'Tiêu hóa hoàn toàn chất bột đường, protein, chất béo nhờ enzym mật và dịch tụy; hấp thụ 90% chất dinh dưỡng vào máu.',
    location: 'Cuộn gọn ở trung tâm khoang bụng, được ruột già bao bọc xung quanh.'
  },
  {
    keys: ['duodenum', 'ta_trang'],
    name: 'Tá tràng (Đoạn đầu ruột non)',
    latin: 'Duodenum',
    description: 'Đoạn đầu tiên dài khoảng 25 cm của ruột non uốn cong hình chữ C ôm lấy đầu tuyến tụy.',
    function: 'Tiếp nhận dịch mật từ gan và dịch tụy từ tuyến tụy để trung hòa axit dịch vị và tiêu hóa mạnh chất béo, protein.',
    location: 'Nằm ngay sau dạ dày, nối từ môn vị dạ dày đến hỗng tràng.'
  },
  {
    keys: ['large_intestine', 'intestinum_crassum', 'colon', 'large intestine', 'ruot_gia', 'ruot_ket', 'cecum', 'ascending colon', 'transverse colon', 'descending colon', 'sigmoid colon'],
    name: 'Ruột già (Ruột kết)',
    latin: 'Intestinum crassum',
    description: 'Đoạn cuối của ống tiêu hóa gồm ruột manh, ruột kết (lên, ngang, xuống, xích ma) và trực tràng.',
    function: 'Hấp thụ lại nước và muối khoáng, lên men chất xơ nhờ hệ vi sinh đường ruột và cô đặc tạo thành phân.',
    location: 'Khung ruột ôm quanh các quai ruột non trong khoang bụng.'
  },
  {
    keys: ['gallbladder', 'vesica_fellea', 'tui_mat', 'bile duct', 'cystic duct', 'common bile duct'],
    name: 'Túi mật & Ống dẫn mật',
    latin: 'Vesica fellea',
    description: 'Túi nhỏ hình quả lê nằm ngay dưới bề mặt gan, có màu xanh đặc trưng.',
    function: 'Dự trữ và cô đặc mật do gan tiết ra, sau đó co bóp đẩy mật vào tá tràng khi có thức ăn chứa chất béo.',
    location: 'Nằm ở mặt dưới thùy gan phải.'
  },
  {
    keys: ['pancreas', 'tuy', 'tuyen_tuy', 'pancreatic', 'pancreatic duct'],
    name: 'Tuyến tụy',
    latin: 'Pancreas',
    description: 'Tuyến mềm hình chiếc lá nằm ngang sau dạ dày. Vừa là tuyến ngoại tiết vừa là tuyến nội tiết quan trọng.',
    function: 'Tiết dịch tụy chứa enzym tiêu hóa (amylase, trypsin, lipase) và tiết hormon insulin / glucagon điều hòa đường huyết.',
    location: 'Nằm vắt ngang sau dạ dày, đầu tụy ôm sát đoạn cong tá tràng.'
  },
  {
    keys: ['esophagus', 'oesophagus', 'thuc_quan', 'cervical part of esophagus', 'thoracic part of esophagus'],
    name: 'Thực quản',
    latin: 'Oesophagus',
    description: 'Ống cơ dài khoảng 25 cm nối từ họng xuống dạ dày.',
    function: 'Vận chuyển viên thức ăn từ họng xuống dạ dày nhờ các nhu động cơ trơn.',
    location: 'Nằm đằng sau khí quản, đi qua lồng ngực và xuyên qua cơ hoành vào dạ dày.'
  },
  {
    keys: ['pharynx', 'hong', 'hau', 'nasopharynx', 'oropharynx', 'laryngopharynx'],
    name: 'Họng (Hầu)',
    latin: 'Pharynx',
    description: 'Ngã tư đường giao nhau giữa đường hô hấp và đường tiêu hóa.',
    function: 'Dẫn khí từ mũi vào khí quản và dẫn thức ăn từ miệng vào thực quản, phản xạ nuốt ngăn thức ăn lọt vào đường thở.',
    location: 'Nằm phía sau khoang miệng và khoang mũi.'
  },
  {
    keys: ['rectum', 'truc_trang', 'anal canal', 'anus'],
    name: 'Trực tràng & Hậu môn',
    latin: 'Rectum',
    description: 'Đoạn thẳng cuối cùng của ruột già dài khoảng 12-15 cm nối với hậu môn.',
    function: 'Lưu trữ phân tạm thời trước khi xuất hiện phản xạ đại tiện.',
    location: 'Nằm ở phần thấp nhất của khoang chậu.'
  },
  {
    keys: ['appendix', 'vermiform appendix', 'ruot_thua'],
    name: 'Ruột thừa',
    latin: 'Appendix vermiformis',
    description: 'Túi nhỏ hình ngón tay dài khoảng 5-10 cm dính vào gốc ruột manh.',
    function: 'Chứa các mô bạch huyết tham gia miễn dịch ruột và lưu trữ vi khuẩn có lợi cho hệ tiêu hóa.',
    location: 'Nằm ở hố chậu phải.'
  },
  {
    keys: ['spleen', 'lien', 'lach', 'la_lach', 'splenic'],
    name: 'Lách (Lá lách)',
    latin: 'Lien / Spleen',
    description: 'Cơ quan bạch huyết lớn nhất cơ thể có màu tía đậm xốp chứa máu.',
    function: 'Lọc máu, tiêu hủy hồng cầu già cỗi, dự trữ máu và tham gia phản ứng miễn dịch tạo kháng thể.',
    location: 'Nằm ở hạ sườn trái, cạnh phía sau dạ dày.'
  },

  // ============================================
  // HỆ TUẦN HOÀN & TIM MẠCH (CIRCULATORY SYSTEM)
  // ============================================
  {
    keys: ['heart', 'cardiac', 'cor', 'tim', 'myocardium', 'pericardium', 'endocardium'],
    name: 'Quả tim & Cơ tim',
    latin: 'Cor / Heart',
    description: 'Cơ quan cơ rỗng gồm 4 buồng đóng vai trò như chiếc bơm sinh học hoạt động liên tục suốt đời.',
    function: 'Co bóp bơm máu mang oxy và dưỡng chất đi nuôi toàn bộ cơ thể và đưa máu chứa CO2 về phổi.',
    location: 'Nằm trong lồng ngực (trung thất giữa), nghiêng nhẹ về bên trái giữa hai phổi.'
  },
  {
    keys: ['left_ventricle', 'ventriculus_sinister', 'tam_that_trai', 'left ventricle'],
    name: 'Tâm thất trái',
    latin: 'Ventriculus sinister',
    description: 'Buồng cơ tim có thành dày nhất trong 4 buồng tim vì phải tạo áp lực lớn nhất.',
    function: 'Bơm máu giàu O2 vừa nhận từ tâm nhĩ trái vào động mạch chủ để đi nuôi toàn thân.',
    location: 'Nằm ở phần dưới và đỉnh trái của tim.'
  },
  {
    keys: ['right_ventricle', 'ventriculus_dexter', 'tam_that_phai', 'right ventricle'],
    name: 'Tâm thất phải',
    latin: 'Ventriculus dexter',
    description: 'Buồng cơ tim nằm phía trước có thành dày vừa phải.',
    function: 'Bơm máu nghèo O2 từ nhĩ phải lên động mạch phổi để thực hiện quá trình trao đổi khí.',
    location: 'Nằm ở mặt trước dưới của tim.'
  },
  {
    keys: ['left_atrium', 'atrium_sinistrum', 'tam_nhi_trai', 'left atrium', 'left auricle'],
    name: 'Tâm nhĩ trái',
    latin: 'Atrium sinistrum',
    description: 'Buồng tim phía trên trái nhận máu giàu oxy qua 4 tĩnh mạch phổi.',
    function: 'Thu nhận máu đỏ tươi từ phổi và co bóp đẩy xuống tâm thất trái qua van hai lá.',
    location: 'Nằm ở phía trên sau của quả tim.'
  },
  {
    keys: ['right_atrium', 'atrium_dextrum', 'tam_nhi_phai', 'right atrium', 'right auricle'],
    name: 'Tâm nhĩ phải',
    latin: 'Atrium dextrum',
    description: 'Buồng tim phía trên phải nhận toàn bộ máu tĩnh mạch nghèo O2 từ tĩnh mạch chủ.',
    function: 'Thu nhận máu nghèo O2 từ toàn thân và co bóp đẩy xuống tâm thất phải qua van ba lá.',
    location: 'Nằm ở bờ phải phía trên của tim.'
  },
  {
    keys: ['aorta', 'aortic_arch', 'dong_mach_chu', 'aortic', 'ascending aorta', 'descending aorta', 'thoracic aorta'],
    name: 'Động mạch chủ',
    latin: 'Aorta',
    description: 'Động mạch lớn nhất và quan trọng nhất trong cơ thể xuất phát từ tâm thất trái.',
    function: 'Dẫn máu giàu O2 dưới áp lực cao phân nhánh đến não, cơ quan nội tạng và chi.',
    location: 'Uốn thành quai động mạch chủ phía trên tim rồi đi dọc xuống sống lưng.'
  },
  {
    keys: ['pulmonary_artery', 'dong_mach_phoi', 'pulmonary artery', 'pulmonary trunk'],
    name: 'Động mạch phổi',
    latin: 'Arteria pulmonalis',
    description: 'Động mạch duy nhất trong cơ thể vận chuyển máu nghèo O2.',
    function: 'Dẫn máu nghèo O2 từ thất phải chia làm 2 nhánh đi vào hai lá phổi.',
    location: 'Xuất phát từ tâm thất phải, đi lên trước động mạch chủ.'
  },
  {
    keys: ['pulmonary_vein', 'tinh_mach_phoi', 'pulmonary vein'],
    name: 'Tĩnh mạch phổi',
    latin: 'Venae pulmonales',
    description: '4 đường tĩnh mạch mang máu vừa được nạp đầy O2 từ phổi trở về tim.',
    function: 'Đưa máu giàu O2 tươi từ phổi về tâm nhĩ trái.',
    location: 'Dẫn từ cuống phổi cắm vào sau tâm nhĩ trái.'
  },
  {
    keys: ['vena_cava', 'superior_vena_cava', 'inferior_vena_cava', 'tinh_mach_chu'],
    name: 'Tĩnh mạch chủ (Trên & Dưới)',
    latin: 'Vena cava',
    description: 'Hai thân tĩnh mạch lớn nhất cơ thể đổ về tâm nhĩ phải.',
    function: 'Thu gom toàn bộ máu nghèo O2 từ nửa trên (đầu, tay) và nửa dưới (bụng, chân) trở về tim.',
    location: 'Chạy dọc bên phải cột sống đổ vào tâm nhĩ phải.'
  },
  {
    keys: ['mitral_valve', 'bicuspid_valve', 'van_hai_la'],
    name: 'Van hai lá',
    latin: 'Valva mitralis / Valva bicuspidalis',
    description: 'Van tim ngăn cách giữa tâm nhĩ trái và tâm thất trái.',
    function: 'Đóng mở một chiều giúp máu chỉ chảy từ nhĩ trái xuống thất trái mà không bị dội ngược lại.',
    location: 'Nằm tại lỗ nhĩ thất trái.'
  },
  {
    keys: ['tricuspid_valve', 'van_ba_la'],
    name: 'Van ba lá',
    latin: 'Valva tricuspidalis',
    description: 'Van tim ngăn cách giữa tâm nhĩ phải và tâm thất phải.',
    function: 'Đảm bảo máu chỉ chảy 1 chiều từ nhĩ phải xuống thất phải.',
    location: 'Nằm tại lỗ nhĩ thất phải.'
  },
  {
    keys: ['aortic_valve', 'van_dong_mach_chu'],
    name: 'Van động mạch chủ',
    latin: 'Valva aortae',
    description: 'Van tổ chim nằm ở gốc động mạch chủ.',
    function: 'Ngăn không cho máu từ động mạch chủ dội ngược về tâm thất trái khi thất trái dãn.',
    location: 'Nằm tại chỗ nối giữa tâm thất trái và động mạch chủ.'
  },
  {
    keys: ['pulmonary_valve', 'van_dong_mach_phoi'],
    name: 'Van động mạch phổi',
    latin: 'Valva trunkus pulmonalis',
    description: 'Van tổ chim ngăn giữa tâm thất phải và động mạch phổi.',
    function: 'Giúp máu chỉ chảy 1 chiều từ thất phải lên phổi.',
    location: 'Nằm ở gốc động mạch phổi.'
  },
  {
    keys: ['coronary_artery', 'dong_mach_vanh', 'coronary'],
    name: 'Động mạch vành tim',
    latin: 'Arteria coronaria',
    description: 'Mạng lưới mạch máu ôm lấy bề mặt ngoài của tim như một chiếc vương miện.',
    function: 'Cung cấp máu chứa O2 và dưỡng chất riêng để nuôi chính cơ tim.',
    location: 'Bao quanh các rãnh ngoài bề mặt tim.'
  },

  // ============================================
  // HỆ HÔ HẤP & PHỔI (RESPIRATORY SYSTEM)
  // ============================================
  {
    keys: ['lung', 'lungs', 'pulmo', 'phoi', 'phoi_nguoi', 'pulmonary'],
    name: 'Lá phổi',
    latin: 'Pulmo / Lungs',
    description: 'Cơ quan hô hấp chính gồm phổi phải (3 thùy) và phổi trái (2 thùy), có cấu trúc xốp và đàn hồi.',
    function: 'Trao đổi khí: Đưa O2 từ không khí vào máu và thải CO2 từ máu ra môi trường.',
    location: 'Nằm gọn bên trong lồng ngực, được bảo vệ bởi xương sườn.'
  },
  {
    keys: ['right_lung', 'pulmo_dexter', 'phoi_phai', 'right lung', 'superior lobe of right lung', 'middle lobe of right lung', 'inferior lobe of right lung'],
    name: 'Phổi phải (Thùy trên, giữa & dưới)',
    latin: 'Pulmo dexter',
    description: 'Lá phổi bên phải có thể tích lớn hơn phổi trái, chia làm 3 thùy (thùy trên, thùy giữa, thùy dưới) bởi hai rãnh xẻ sâu: khe chếch và khe ngang.',
    function: 'Thực hiện 55% tổng dung tích trao đổi khí của hệ hô hấp.',
    location: 'Nằm ở nửa lồng ngực bên phải.'
  },
  {
    keys: ['left_lung', 'pulmo_sinister', 'phoi_trai', 'left lung', 'superior lobe of left lung', 'inferior lobe of left lung', 'cardiac notch'],
    name: 'Phổi trái (Thùy trên & dưới)',
    latin: 'Pulmo sinister',
    description: 'Lá phổi bên trái gồm 2 thùy (thùy trên và thùy dưới), có khuyết tim dành chỗ cho quả tim.',
    function: 'Thực hiện 45% dung tích trao đổi khí hô hấp.',
    location: 'Nằm ở nửa lồng ngực bên trái.'
  },
  {
    keys: ['trachea', 'khi_quan', 'tracheal cartilage'],
    name: 'Khí quản',
    latin: 'Trachea',
    description: 'Ống dẫn khí dài khoảng 11-13 cm gồm 16-20 vòng sụn hình chữ C xếp chồng lên nhau, phía sau là lớp cơ trơn đàn hồi.',
    function: 'Dẫn không khí từ thanh quản xuống phế quản; lớp chất nhầy và lông tơ giúp lọc bụi bẩn và vi khuẩn.',
    location: 'Nằm phía trước thực quản, đi từ cổ xuống giữa ngực.'
  },
  {
    keys: ['bronchus', 'bronchi', 'phe_quan', 'main bronchus', 'lobar bronchus', 'segmental bronchus', 'bronchiole'],
    name: 'Phế quản & Phế quản nhánh',
    latin: 'Bronchi principales',
    description: 'Hai nhánh cây khí quản chính tách ra từ đáy khí quản đi vào hai bên lá phổi, liên tục phân nhánh thành cây phế quản.',
    function: 'Phân chia và dẫn truyền không khí trực tiếp vào rốn phổi của từng lá phổi.',
    location: 'Tách ra ở đốt sống ngực T4-T5 đi vào cuống phổi.'
  },
  {
    keys: ['diaphragm', 'co_hoanh'],
    name: 'Cơ hoành',
    latin: 'Diaphragma',
    description: 'Cơ dẹt hình vòm ngăn cách hoàn toàn giữa khoang ngực và khoang bụng.',
    function: 'Cơ hô hấp chính: Khi co hạ xuống làm ngực mở rộng giúp hít vào, khi giãn vồng lên giúp thở ra.',
    location: 'Nằm ngang đáy lồng ngực.'
  },
  {
    keys: ['larynx', 'thanh_quan', 'thyroid cartilage', 'cricoid cartilage', 'epiglottis', 'vocal cord'],
    name: 'Thanh quản & Nắp thanh quản',
    latin: 'Larynx',
    description: 'Cơ quan phát âm chứa dây thanh âm và sụn nắp thanh quản (khí quản).',
    function: 'Rung động tạo ra tiếng nói và đậy kín khí quản khi nuốt thức ăn.',
    location: 'Nằm ở trước cổ, phía trên khí quản.'
  }
];

/**
 * Tìm thông tin giải phẫu chi tiết dựa vào key hoặc tên mesh GLB
 */
export function lookupAnatomyInfo(meshOrKey) {
  if (!meshOrKey) return null;
  const target = String(meshOrKey).toLowerCase().replace(/[^a-z0-9à-ỹ_]+/g, ' ').trim();

  // 1. Kiểm tra chính xác cụm từ key
  for (const item of ANATOMY_DICTIONARY) {
    for (const key of item.keys) {
      const cleanKey = key.toLowerCase().replace(/[^a-z0-9à-ỹ_]+/g, ' ').trim();
      if (target.includes(cleanKey) || cleanKey.includes(target)) {
        return item;
      }
    }
  }

  // 2. Phân tích theo từng từ đơn nếu không khớp cụm
  const words = target.split(/\s+/).filter((w) => w.length > 2);
  for (const item of ANATOMY_DICTIONARY) {
    for (const key of item.keys) {
      if (words.some((w) => key.toLowerCase().includes(w))) {
        return item;
      }
    }
  }

  return null;
}

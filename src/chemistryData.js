// ============================================================
// Dữ liệu Vật liệu Phòng Thí Nghiệm Hóa học (Synthetica Catalog)
// Phân loại thành Dụng cụ (Tools) và Hóa chất (Chemicals)
// ============================================================

export const chemistryCatalog = {
  chemicals: [
    {
      id: 'h2o',
      symbol: 'H₂O',
      name: 'Nước cất',
      latin: 'Distilled Water',
      category: 'Chemical',
      type: 'Dung môi',
      cost: '100 ml',
      color: '#a5f3fc', // Màu lam nhạt trong suốt
      description: 'Nước cất hoàn toàn tinh khiết, không chứa tạp chất hay ion lạ. Thường dùng làm dung môi hòa tan hoặc làm loãng dung dịch.',
      properties: 'Độ pH: 7.0 (Trung tính). Khối lượng mol: 18.02 g/mol. Không màu, không mùi.',
      hazards: ['An toàn', 'Không độc hại'],
      hazardColor: '#10b981'
    },
    {
      id: 'hcl',
      symbol: 'HCl',
      name: 'Axit Clohidric',
      latin: 'Hydrochloric Acid',
      category: 'Chemical',
      type: 'Axit mạnh',
      cost: '50 ml',
      color: '#fca5a5', // Đỏ nhạt trong suốt
      description: 'Dung dịch axit clohidric đậm đặc, có tính axit cực mạnh và bay hơi tạo khói trong không khí ẩm. Phản ứng mạnh với kim loại và bazơ.',
      properties: 'Độ pH: 1.0 (Axit mạnh). Khối lượng mol: 36.46 g/mol. Ăn mòn mạnh.',
      hazards: ['Ăn mòn', 'Kích ứng hô hấp', 'Độc hại'],
      hazardColor: '#ef4444'
    },
    {
      id: 'naoh',
      symbol: 'NaOH',
      name: 'Natri Hidroxit',
      latin: 'Sodium Hydroxide',
      category: 'Chemical',
      type: 'Bazơ mạnh',
      cost: '50 ml',
      color: '#fed7aa', // Cam nhạt trong suốt
      description: 'Dung dịch kiềm natri hidroxit (xút ăn da). Có tính ăn mòn cực kỳ cao đối với da và các mô hữu cơ, tỏa nhiệt mạnh khi hòa tan.',
      properties: 'Độ pH: 14.0 (Kiềm mạnh). Khối lượng mol: 40.00 g/mol. Trơn nhớt.',
      hazards: ['Ăn mòn nặng', 'Hủy hoại da/mắt'],
      hazardColor: '#f97316'
    },
    {
      id: 'cuso4',
      symbol: 'CuSO₄',
      name: 'Đồng(II) Sunfat',
      latin: 'Copper(II) Sulfate',
      category: 'Chemical',
      type: 'Dung dịch muối',
      cost: '80 ml',
      color: '#3b82f6', // Xanh lam đặc trưng
      description: 'Dung dịch muối đồng màu xanh lam rực rỡ đặc trưng. Dùng rộng rãi trong công nghiệp hóa chất và các phản ứng tạo kết tủa màu.',
      properties: 'Độ pH: 4.0 (Axit yếu). Khối lượng mol: 159.6 g/mol. Có màu xanh đặc trưng của ion Cu2+.',
      hazards: ['Nguy hại môi trường', 'Độc hại nếu nuốt phải'],
      hazardColor: '#3b82f6'
    },
    {
      id: 'na2co3',
      symbol: 'Na₂CO₃',
      name: 'Natri Cacbonat',
      latin: 'Sodium Carbonate',
      category: 'Chemical',
      type: 'Muối kiềm',
      cost: '60 ml',
      color: '#e2e8f0', // Trong suốt ánh xám
      description: 'Dung dịch natri cacbonat (Soda). Là muối của axit yếu cacbonic, dung dịch có tính kiềm vừa phải, phản ứng sinh khí với axit.',
      properties: 'Độ pH: 11.5 (Kiềm vừa). Khối lượng mol: 105.99 g/mol. Phản ứng mạnh với axit sinh CO2.',
      hazards: ['Kích ứng mắt nhẹ'],
      hazardColor: '#eab308'
    },
    {
      id: 'phenol',
      symbol: 'PhPh',
      name: 'Phenolphthalein',
      latin: 'Phenolphthalein Indicator',
      category: 'Chemical',
      type: 'Chỉ thị màu',
      cost: '10 ml',
      color: '#f472b6', // Hồng sen nhạt
      description: 'Dung dịch chỉ thị pH không màu trong môi trường axit/trung tính, nhưng lập tức hóa hồng đậm hoặc đỏ tím trong môi trường kiềm (pH > 8.2).',
      properties: 'Không màu ở pH < 8.2. Hóa hồng đậm ở pH > 10.0.',
      hazards: ['Dễ cháy', 'Kích ứng nhẹ'],
      hazardColor: '#ec4899'
    },
    {
      id: 'zn',
      symbol: 'Zn',
      name: 'Kẽm hạt',
      latin: 'Zinc Granules',
      category: 'Chemical',
      type: 'Kim loại rắn',
      cost: '5 g',
      color: '#94a3b8', // Xám kim loại đục
      description: 'Kẽm kim loại dạng hạt sần sùi màu xám bạc. Phản ứng với các axit mạnh để giải phóng khí Hydro bọt khí nổi lên rất mạnh.',
      properties: 'Kim loại hoạt động trung bình. Khối lượng mol: 65.38 g/mol.',
      hazards: ['Dễ cháy dạng bột', 'Ít độc hại'],
      hazardColor: '#64748b'
    }
  ],
  tools: [
    {
      id: 'beaker',
      symbol: 'Beaker',
      name: 'Cốc thủy tinh',
      latin: 'Glass Beaker 250ml',
      category: 'Tool',
      type: 'Dụng cụ chứa',
      cost: '1 chiếc',
      color: '#cbd5e1',
      description: 'Cốc mỏ thủy tinh chịu nhiệt borosilicate chuyên dụng. Dùng để chứa dung dịch, hòa tan chất rắn và thực hiện pha trộn phản ứng.',
      properties: 'Vạch chia độ rõ ràng, có vòi rót chống tràn dung dịch.',
      hazards: ['Dễ vỡ thủy tinh'],
      hazardColor: '#94a3b8'
    },
    {
      id: 'testtube',
      symbol: 'Tube',
      name: 'Ống nghiệm',
      latin: 'Test Tube & Rack',
      category: 'Tool',
      type: 'Dụng cụ phản ứng',
      cost: '1 bộ',
      color: '#cbd5e1',
      description: 'Ống nghiệm thủy tinh hình trụ thon dài đặt trên giá gỗ. Thích hợp cho các phản ứng quy mô nhỏ, dễ quan sát khí thoát ra hoặc kết tủa.',
      properties: 'Thủy tinh mỏng truyền nhiệt tốt, quan sát trực quan.',
      hazards: ['Dễ vỡ'],
      hazardColor: '#94a3b8'
    },
    {
      id: 'flask',
      symbol: 'Flask',
      name: 'Bình tam giác',
      latin: 'Erlenmeyer Flask 250ml',
      category: 'Tool',
      type: 'Dụng cụ chứa',
      cost: '1 chiếc',
      color: '#cbd5e1',
      description: 'Bình thủy tinh hình nón cổ hẹp. Thiết kế hình tam giác giúp lắc đều dung dịch bên trong cực kỳ hiệu quả mà không sợ bắn chất lỏng ra ngoài.',
      properties: 'Phù hợp cho các thí nghiệm chuẩn độ axit-bazơ.',
      hazards: ['Dễ vỡ'],
      hazardColor: '#94a3b8'
    },
    {
      id: 'burner',
      symbol: 'Burner',
      name: 'Đèn cồn',
      latin: 'Bunsen Alcohol Burner',
      category: 'Tool',
      type: 'Dụng cụ gia nhiệt',
      cost: '1 chiếc',
      color: '#a1a1aa',
      description: 'Đèn cồn đốt nhiệt dung môi. Cung cấp nhiệt lượng trực tiếp cho bình tam giác hoặc cốc phản ứng để đẩy nhanh tốc độ phản ứng hóa học.',
      properties: 'Nhiên liệu cồn Ethanol. Có bấc dẫn và nắp dập lửa an toàn.',
      hazards: ['Nguy cơ hỏa hoạn', 'Tạo nhiệt độ cao'],
      hazardColor: '#ef4444'
    }
  ]
};

// Định nghĩa các phản ứng hóa học tương tác khả thi
export const chemicalReactions = [
  {
    id: 'neutralization_hcl_naoh',
    name: 'Phản ứng trung hòa Axit - Bazơ',
    reactants: ['hcl', 'naoh'],
    equation: 'HCl + NaOH → NaCl + H₂O',
    description: 'Axit clohidric phản ứng với Natri hidroxit sinh ra muối ăn và nước cất. Đây là phản ứng tỏa nhiệt mạnh.',
    hasIndicator: true,
    indicatorId: 'phenol',
    onTrigger: (state) => {
      // Logic xác định kết quả phản ứng dựa trên tỉ lệ chất
      // Nếu có phenolphthalein, màu sẽ thay đổi dựa vào pH.
      // NaOH dư -> pH kiềm (> 10) -> Hồng sen đậm
      // HCl dư hoặc trung hòa -> pH axit/trung tính -> Không màu
      return {
        productColor: '#f1f5f9', // Dung dịch trung hòa NaCl không màu trong suốt
        temperatureIncrease: 15, // Tăng thêm 15 độ C
        gasReleased: false,
        precipitate: false,
        pH: 7.0
      };
    }
  },
  {
    id: 'precipitate_cuso4_naoh',
    name: 'Phản ứng tạo kết tủa xanh lơ',
    reactants: ['cuso4', 'naoh'],
    equation: 'CuSO₄ + 2NaOH → Cu(OH)₂↓ + Na₂SO₄',
    description: 'Đồng(II) sunfat phản ứng với natri hidroxit tạo ra kết tủa Đồng(II) hidroxit xanh lam lơ lửng sền sệt không tan trong nước.',
    hasIndicator: false,
    onTrigger: () => {
      return {
        productColor: '#1e40af', // Dung dịch xanh dương đục đậm của kết tủa Cu(OH)2
        temperatureIncrease: 2,
        gasReleased: false,
        precipitate: {
          color: '#3b82f6', // Hạt kết tủa màu xanh dương sáng
          intensity: 'heavy'
        },
        pH: 10.0
      };
    }
  },
  {
    id: 'gas_hcl_zn',
    name: 'Phản ứng thế giải phóng khí Hydro',
    reactants: ['hcl', 'zn'],
    equation: 'Zn + 2HCl → ZnCl₂ + H₂↑',
    description: 'Kẽm hoạt động mạnh hơn Hydro thế chỗ Hydro trong Axit clohidric tạo ra Kẽm clorua hòa tan và sủi bong bóng khí Hydro thoát ra nhanh chóng.',
    hasIndicator: false,
    onTrigger: () => {
      return {
        productColor: '#f1f5f9', // Trong suốt sau khi kẽm tan
        temperatureIncrease: 8,
        gasReleased: {
          intensity: 'rapid', // Sủi bọt khí cực mạnh
          gasFormula: 'H₂'
        },
        precipitate: false,
        pH: 2.0
      };
    }
  },
  {
    id: 'gas_hcl_na2co3',
    name: 'Phản ứng sủi bọt khí Cacbonic',
    reactants: ['hcl', 'na2co3'],
    equation: 'Na₂CO₃ + 2HCl → 2NaCl + H₂O + CO₂↑',
    description: 'Axit clohidric tác dụng với muối cacbonat giải phóng axit cacbonic yếu lập tức phân hủy thành khí cacbonic sủi bọt cuồn cuộn.',
    hasIndicator: false,
    onTrigger: () => {
      return {
        productColor: '#f1f5f9',
        temperatureIncrease: 4,
        gasReleased: {
          intensity: 'violent', // Sủi bọt khí cực kỳ violent/mạnh
          gasFormula: 'CO₂'
        },
        precipitate: false,
        pH: 5.5
      };
    }
  }
];

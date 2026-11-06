/**
 * Excel & CSV Exporter for BioVerse
 * Hỗ trợ xuất dữ liệu ra file bảng tính Microsoft Excel (.xls / XML Spreadsheet)
 * và định dạng CSV UTF-8 BOM chuẩn Unicode tiếng Việt.
 */

export function exportToExcelFile(data, filename = 'BioVerse_Export.xls', sheetName = 'Danh sách') {
  if (!Array.isArray(data) || data.length === 0) {
    alert('Không có dữ liệu để xuất file');
    return;
  }

  const columns = Object.keys(data[0]);

  // Xây dựng XML Spreadsheet 2003 (Mở trực tiếp trên Microsoft Excel 100% không lỗi font tiếng Việt)
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>BioVerse STEM Administration</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Segoe UI" x:CharSet="163" x:Family="Swiss" ss:Size="10" ss:Color="#1B1C1C"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#2D2D2D"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D0C8B8"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D0C8B8"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#2D2D2D"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#B71422" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataCell">
   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E0D8"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E0D8"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E0D8"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E0D8"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#2D2D2D"/>
  </Style>
  <Style ss:ID="DataCellCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E0D8"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E0D8"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E0D8"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E0D8"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#2D2D2D"/>
  </Style>
  <Style ss:ID="BadgePending">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E0D8"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E0D8"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E0D8"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E0D8"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#B45309" ss:Bold="1"/>
   <Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="BadgeResolved">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E0D8"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E0D8"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E0D8"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E0D8"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#15803D" ss:Bold="1"/>
   <Interior ss:Color="#DCFCE7" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${escapeXml(sheetName)}">
  <Table ss:DefaultRowHeight="24">
`;

  // Estimate column widths
  columns.forEach((col) => {
    let width = 120;
    if (col.includes('Nội dung') || col.includes('Ghi chú')) width = 300;
    else if (col.includes('Tiêu đề') || col.includes('Đường dẫn')) width = 220;
    else if (col.includes('Email') || col.includes('Người')) width = 180;
    else if (col.includes('ID') || col.includes('STT') || col.includes('Sao')) width = 60;
    xml += `   <Column ss:Width="${width}"/>\n`;
  });

  // Header Row
  xml += `   <Row ss:Height="30">\n`;
  columns.forEach((col) => {
    xml += `    <Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(col)}</Data></Cell>\n`;
  });
  xml += `   </Row>\n`;

  // Data Rows
  data.forEach((row) => {
    xml += `   <Row ss:Height="26">\n`;
    columns.forEach((col) => {
      const val = row[col] != null ? String(row[col]) : '';
      let style = 'DataCell';

      if (col.includes('Trạng thái')) {
        if (val.includes('Chờ') || val.includes('PENDING')) style = 'BadgePending';
        else if (val.includes('giải quyết') || val.includes('RESOLVED')) style = 'BadgeResolved';
        else style = 'DataCellCenter';
      } else if (col.includes('ID') || col.includes('STT') || col.includes('Sao') || col.includes('Ngày')) {
        style = 'DataCellCenter';
      }

      xml += `    <Cell ss:StyleID="${style}"><Data ss:Type="String">${escapeXml(val)}</Data></Cell>\n`;
    });
    xml += `   </Row>\n`;
  });

  xml += `  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeXml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function formatFeedbacksForExport(feedbacks = []) {
  return feedbacks.map((f, idx) => ({
    'STT': idx + 1,
    'Ngày gửi': formatDate(f.createdAt),
    'Người gửi': f.userName || 'Khách ẩn danh',
    'Email liên hệ': f.userEmail || '—',
    'Phân loại': f.categoryDisplayName || categoryName(f.category),
    'Đánh giá': `${f.rating || 5} ⭐`,
    'Tiêu đề góp ý': f.title || '—',
    'Nội dung chi tiết': f.content || '',
    'Trang phát sinh': f.pageUrl || '—',
    'Thiết bị & Trình duyệt': f.deviceInfo || '—',
    'Trạng thái': f.statusDisplayName || statusName(f.status),
    'Ghi chú BQT': f.adminNotes || '—',
    'Ngày phản hồi': formatDate(f.respondedAt)
  }));
}

function formatDate(dtStr) {
  if (!dtStr) return '—';
  try {
    const d = new Date(dtStr);
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dtStr;
  }
}

function categoryName(cat) {
  const map = {
    BUG: 'Báo lỗi kỹ thuật',
    CONTENT: 'Nội dung bài học & 3D',
    UI_UX: 'Giao diện & Trải nghiệm',
    FEATURE: 'Đề xuất tính năng',
    GENERAL: 'Góp ý chung'
  };
  return map[cat] || cat;
}

function statusName(st) {
  const map = {
    PENDING: 'Chờ xử lý',
    REVIEWED: 'Đã xem',
    RESOLVED: 'Đã giải quyết',
    DISMISSED: 'Đã bỏ qua'
  };
  return map[st] || st;
}

import fs from 'fs';
import path from 'path';

const API_HOST = 'https://api.tripo3d.ai';

// Simple helper to parse arguments
function parseArgs() {
  const args = {};
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const val = process.argv[i + 1];
      if (val && !val.startsWith('--')) {
        args[key] = val;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

async function run() {
  const args = parseArgs();
  const apiKey = args.key || process.env.TRIPO_API_KEY;
  const prompt = args.prompt;
  const imagePath = args.image;
  const outputPath = args.out || './output.glb';

  if (!apiKey) {
    console.error('❌ Lỗi: Thiếu API Key Tripo3D. Vui lòng cung cấp qua --key hoặc biến môi trường TRIPO_API_KEY.');
    console.log('Sử dụng: node tripo_generator.mjs --key <API_KEY> --prompt "<miêu_tả>" --out <đường_dẫn_lưu>');
    process.exit(1);
  }

  if (!prompt && !imagePath) {
    console.error('❌ Lỗi: Cần cung cấp --prompt (Text-to-3D) hoặc --image (Image-to-3D).');
    process.exit(1);
  }

  try {
    let taskId;

    if (imagePath) {
      console.log(`\n[1/4] Đang đọc tệp hình ảnh: ${imagePath}`);
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Tệp hình ảnh không tồn tại tại: ${imagePath}`);
      }

      const fileData = fs.readFileSync(imagePath);
      const ext = path.extname(imagePath).slice(1).toLowerCase() || 'png';
      
      console.log('[2/4] Đang tải ảnh lên máy chủ Tripo3D...');
      // Build Multipart form data boundary
      const boundary = '----WebKitFormBoundary' + Math.random().toString(36).slice(2);
      const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${path.basename(imagePath)}"\r\nContent-Type: image/${ext}\r\n\r\n`;
      const footer = `\r\n--${boundary}--`;
      
      const payload = Buffer.concat([
        Buffer.from(header, 'utf-8'),
        fileData,
        Buffer.from(footer, 'utf-8')
      ]);

      const uploadRes = await fetch(`${API_HOST}/v2/openapi/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        body: payload
      });

      if (!uploadRes.ok) {
        throw new Error(`Upload ảnh thất bại: ${uploadRes.status} ${await uploadRes.text()}`);
      }

      const uploadJson = await uploadRes.json();
      if (uploadJson.code !== 0) {
        throw new Error(`Tripo3D Upload Error: ${uploadJson.message}`);
      }

      const fileToken = uploadJson.data.image_token || uploadJson.data.file_token;
      console.log(`✔️ Tải ảnh thành công. Token: ${fileToken}`);

      console.log('[3/4] Đang tạo tác vụ Image-to-3D...');
      const taskRes = await fetch(`${API_HOST}/v2/openapi/task`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'image_to_model',
          file: {
            type: ext,
            file_token: fileToken
          }
        })
      });

      if (!taskRes.ok) {
        throw new Error(`Tạo task thất bại: ${taskRes.status} ${await taskRes.text()}`);
      }

      const taskJson = await taskRes.json();
      if (taskJson.code !== 0) {
        throw new Error(`Tripo3D Task Error: ${taskJson.message}`);
      }

      taskId = taskJson.data.task_id;

    } else {
      console.log(`\n[1/3] Đang gửi yêu cầu sinh Text-to-3D: "${prompt}"`);
      const taskRes = await fetch(`${API_HOST}/v2/openapi/task`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'text_to_model',
          prompt: prompt
        })
      });

      if (!taskRes.ok) {
        throw new Error(`Tạo task thất bại: ${taskRes.status} ${await taskRes.text()}`);
      }

      const taskJson = await taskRes.json();
      if (taskJson.code !== 0) {
        throw new Error(`Tripo3D Task Error: ${taskJson.message}`);
      }

      taskId = taskJson.data.task_id;
      console.log(`✔️ Tạo tác vụ thành công. Task ID: ${taskId}`);
    }

    console.log('\n[Xếp hàng / Tạo mô hình] Đang theo dõi tiến độ...');
    let glbUrl = null;
    
    while (true) {
      const statusRes = await fetch(`${API_HOST}/v2/openapi/task/${taskId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });

      if (!statusRes.ok) {
        throw new Error(`Kiểm tra trạng thái thất bại: ${statusRes.status}`);
      }

      const statusJson = await statusRes.json();
      if (statusJson.code !== 0) {
        throw new Error(`Tripo3D Query Error: ${statusJson.message}`);
      }

      const taskData = statusJson.data;
      const progress = taskData.progress || 0;
      const status = taskData.status;

      process.stdout.write(`\rTrạng thái: ${status} | Tiến độ: ${progress}%`);

      if (status === 'success') {
        glbUrl = taskData.result.model.glb || taskData.result.model.gltf;
        console.log('\n\n✔️ Tripo3D sinh mô hình thành công!');
        break;
      } else if (status === 'failed') {
        throw new Error('\n\n❌ Tác vụ thất bại. Tripo3D không thể tạo mô hình cho yêu cầu này.');
      }

      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    console.log(`\n[Tải tệp] Đang tải mô hình xuống: ${outputPath}`);
    const downloadRes = await fetch(glbUrl);
    if (!downloadRes.ok) {
      throw new Error(`Tải GLB thất bại: HTTP ${downloadRes.status}`);
    }

    const glbBuffer = await downloadRes.arrayBuffer();
    
    // Ensure output directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, Buffer.from(glbBuffer));
    console.log(`🎉 HOÀN THÀNH! Đã lưu mô hình 3D thực tế tại: ${outputPath}`);

  } catch (err) {
    console.error(`\n❌ Gặp lỗi: ${err.message}`);
    process.exit(1);
  }
}

run();

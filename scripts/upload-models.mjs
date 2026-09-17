#!/usr/bin/env node

/**
 * Upload .glb models to Cloudflare R2
 *
 * Cách dùng:
 *   1. Copy .env.example → .env và điền R2 credentials
 *   2. npm run upload-models
 *
 * Biến môi trường cần thiết (trong .env hoặc export trực tiếp):
 *   R2_ACCOUNT_ID   - Cloudflare Account ID
 *   R2_ACCESS_KEY_ID - R2 Access Key ID
 *   R2_SECRET_ACCESS_KEY - R2 Secret Access Key
 *   R2_BUCKET_NAME  - Tên bucket (mặc định: bio3d-models)
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readdir, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { config } from 'dotenv';

config();

const ACCOUNT_ID    = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY    = process.env.R2_ACCESS_KEY_ID;
const SECRET_KEY    = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET        = process.env.R2_BUCKET_NAME || 'bio3d-models';

if (!ACCOUNT_ID || !ACCESS_KEY || !SECRET_KEY) {
  console.error('❌ Thiếu biến môi trường. Hãy tạo file .env theo .env.example');
  console.error('   Cần có: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY');
  process.exit(1);
}

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
  },
});

const PUBLIC_DIR = join(process.cwd(), 'public');
const ROOT_DIR   = process.cwd();
const GLB_FILES  = [];

async function collectFiles(dir, prefix = '') {
  try {
    const entries = await readdir(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const s = await stat(fullPath);
      if (s.isFile() && extname(entry).toLowerCase() === '.glb') {
        const key = prefix ? `${prefix}/${entry}` : entry;
        // Do not re-add if key already collected
        if (!GLB_FILES.some(f => f.key === key)) {
          GLB_FILES.push({ path: fullPath, key });
        }
      }
    }
  } catch {}
}

async function upload(file) {
  const s = await stat(file.path);
  const mb = (s.size / 1024 / 1024).toFixed(2);
  try {
    const { Body } = await import('node:fs');
    const stream = (await import('node:fs')).createReadStream(file.path);
    await client.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: file.key,
      Body: stream,
      ContentType: 'model/gltf-binary',
      ContentLength: s.size,
    }));
    console.log(`  ✅ ${file.key} (${mb} MB)`);
  } catch (err) {
    console.error(`  ❌ ${file.key}: ${err.message}`);
  }
}

async function main() {
  console.log(`📦 Upload models to R2 bucket: ${BUCKET}\n`);

  await collectFiles(PUBLIC_DIR);

  const TEMP_DIR = join(process.cwd(), 'temp_models');
  try {
    await collectFiles(TEMP_DIR);
  } catch {}

  const rootEntries = await readdir(ROOT_DIR);
  for (const entry of rootEntries) {
    if (extname(entry).toLowerCase() === '.glb') {
      const fullPath = join(ROOT_DIR, entry);
      const s = await stat(fullPath);
      if (s.isFile()) {
        GLB_FILES.push({ path: fullPath, key: entry });
      }
    }
  }

  if (GLB_FILES.length === 0) {
    console.log('⚠️  Không tìm thấy file .glb nào để upload.');
    return;
  }

  console.log(`Tìm thấy ${GLB_FILES.length} file .glb:\n`);
  for (const f of GLB_FILES) {
    await upload(f);
  }
  console.log('\n🎉 Hoàn thành!');
}

main();

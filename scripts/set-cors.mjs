#!/usr/bin/env node

import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import { config } from 'dotenv';
config();

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID;
const SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET = process.env.R2_BUCKET_NAME || 'bio3d-models';

if (!ACCOUNT_ID || !ACCESS_KEY || !SECRET_KEY) {
  console.error(' Thiếu biến môi trường');
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

console.log(` Setting CORS for: ${BUCKET}`);

try {
  await client.send(new PutBucketCorsCommand({
    Bucket: BUCKET,
    CORSConfiguration: {
      CORSRules: [{
        AllowedOrigins: ['*'],
        AllowedMethods: ['GET', 'HEAD', 'OPTIONS'],
        AllowedHeaders: ['*'],
        MaxAgeSeconds: 86400,
      }],
    },
  }));
  console.log('✅ CORS configured! Reload your page.');
} catch (err) {
  console.error(`❌ ${err.message}`);
}

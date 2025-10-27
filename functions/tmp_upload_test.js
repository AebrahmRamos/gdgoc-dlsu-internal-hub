/* Quick test script to upload a tiny file to DigitalOcean Spaces using the same credentials
   used by the Cloud Functions. This will attach ACL: public-read so we can verify
   a public URL works.

   Run from project root:
     node functions/tmp_upload_test.js
*/

import { config } from 'dotenv';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

config({ path: './.env' });

const BUCKET = process.env.DO_SPACES_BUCKET;
const ENDPOINT = process.env.DO_SPACES_ENDPOINT;
const REGION = process.env.DO_SPACES_REGION || 'sgp1';

if (!BUCKET || !ENDPOINT || !process.env.DO_SPACES_KEY || !process.env.DO_SPACES_SECRET) {
  console.error('Missing DO_SPACES_* env vars in functions/.env');
  process.exit(1);
}

const s3 = new S3Client({
  endpoint: ENDPOINT,
  region: REGION,
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET,
  },
});

(async () => {
  try {
    const ts = Date.now();
    const key = `test-public-${ts}.txt`;
    const body = 'GDG-DLSU test file - public\n';

    const cmd = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: 'text/plain',
      ACL: 'public-read',
    });

    await s3.send(cmd);

    const publicUrl = `${ENDPOINT}/${BUCKET}/${encodeURIComponent(key)}`;
    console.log('Uploaded test object:', { key, publicUrl });
    console.log('You can verify with:');
    console.log(`curl -I "${publicUrl}"`);
  } catch (err) {
    console.error('Upload failed', err);
    process.exit(2);
  }
})();

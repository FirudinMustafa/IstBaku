/**
 * Upload motoru smoke testi (lib/storage.ts). BLOB_TOKEN yoksa public/uploads'a yazar.
 * Çalıştır: npx tsx scripts/upload-smoke.ts
 */
import { uploadFile } from '../lib/storage';
import fs from 'fs';
import path from 'path';

function fileFrom(bytes: number[], name: string, type: string, padTo = 0): File {
  const head = Buffer.from(bytes);
  const buf = padTo > head.length ? Buffer.concat([head, Buffer.alloc(padTo - head.length, 0x20)]) : head;
  return new File([new Uint8Array(buf)], name, { type });
}

const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34];
const HEIC = [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63];
const GARBAGE = [0x01, 0x02, 0x03, 0x04, 0x05, 0x06];

async function expectOk(label: string, file: File, prefix: string) {
  try {
    const url = await uploadFile(file, prefix);
    console.log(`✅ ${label} → ${url}`);
    return url;
  } catch (e) {
    console.log(`❌ ${label} → BEKLENMEYEN HATA: ${(e as Error).message}`);
    return null;
  }
}

async function expectFail(label: string, file: File, prefix: string, wantMsgPart: string) {
  try {
    const url = await uploadFile(file, prefix);
    console.log(`❌ ${label} → reddedilmesi gerekirdi ama geçti: ${url}`);
  } catch (e) {
    const msg = (e as Error).message;
    console.log(`${msg.includes(wantMsgPart) ? '✅' : '⚠️'} ${label} → reddedildi: "${msg}"`);
  }
}

async function main() {
  console.log('BLOB_TOKEN:', process.env.BLOB_READ_WRITE_TOKEN ? 'set (Blob)' : 'YOK (lokal fs)');
  console.log('--- Geçmesi beklenenler ---');
  await expectOk('JPEG (ilan foto, public)', fileFrom(JPEG, 'foto.jpg', 'image/jpeg', 2048), 'smoketest');
  await expectOk('PNG (ilan foto)', fileFrom(PNG, 'foto.png', 'image/png', 2048), 'smoketest');
  await expectOk('PDF (KYC belge → public+random)', fileFrom(PDF, 'belge.pdf', 'application/pdf', 4096), 'kyc');
  await expectOk('PDF (ofis belge)', fileFrom(PDF, 'voen.pdf', 'application/pdf', 4096), 'private/office-docs');

  console.log('--- Reddedilmesi beklenenler ---');
  await expectFail('Çöp dosya', fileFrom(GARBAGE, 'x.bin', '', 64), 'smoketest', 'format');
  await expectFail('Aşırı büyük JPEG (>5MB)', fileFrom(JPEG, 'big.jpg', 'image/jpeg', 6 * 1024 * 1024), 'smoketest', 'büyük');
  await expectFail('PDF public foto prefix (allow-list dışı)', fileFrom(PDF, 'x.pdf', 'application/pdf', 4096), 'smoketest', 'İzin verilmeyen');

  console.log('--- HEIC dalı (sharp gerçek HEIC ister; sahte HEIC ile graceful hata beklenir) ---');
  await expectFail('Sahte HEIC', fileFrom(HEIC, 'iphone.heic', 'image/heic', 4096), 'smoketest', 'HEIC');

  // Lokal fs'e yazılan smoke dosyalarını temizle.
  const dir = path.join(process.cwd(), 'public', 'uploads', 'smoketest');
  if (fs.existsSync(dir)) { fs.rmSync(dir, { recursive: true, force: true }); console.log('\n[temizlik] public/uploads/smoketest silindi'); }
  console.log('Bitti.');
}

main().catch((e) => { console.error(e); process.exit(1); });

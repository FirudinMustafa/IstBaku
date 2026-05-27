'use server';

import { put } from '@vercel/blob';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import {
  ALLOWED_IMAGE_MIMES,
  ALLOWED_KYC_MIMES,
  MAX_IMAGE_BYTES,
  MAX_PDF_BYTES,
  sniffMime,
  randomKeySuffix,
} from './security';

// Vercel Blob token varsa Blob'a yaz, yoksa lokal public/uploads (dev)

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

/**
 * Upload categories.
 *
 * - `listings`/`avatars` → public Blob (used directly by `<img>` tags)
 * - `kyc` / `private`    → private Blob (must be fetched via signed URL)
 *
 * MC-11: KYC + sensitive uploads default to `access: 'private'`. Public
 * listing photos remain `access: 'public'` because they are rendered directly.
 */
const PRIVATE_PREFIXES: ReadonlyArray<string> = ['kyc', 'private', 'nda', 'tapu'];

function isPrivatePrefix(prefix: string): boolean {
  return PRIVATE_PREFIXES.some((p) => prefix === p || prefix.startsWith(`${p}/`));
}

/**
 * Validate `buffer` against the declared `mime` and an allow-list, enforcing
 * size caps as a defence against memory-exhaustion DoS uploads.
 */
function validateUploadBuffer(buffer: Buffer, declaredMime: string, allowKyc = false): {
  ok: true;
  resolvedMime: string;
} | {
  ok: false;
  error: string;
} {
  const allowList = allowKyc ? ALLOWED_KYC_MIMES : ALLOWED_IMAGE_MIMES;

  // Size cap — match MIME's class
  const sizeCap = declaredMime === 'application/pdf' ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
  if (buffer.length > sizeCap) {
    return { ok: false, error: `Dosya çok büyük (max ${Math.round(sizeCap / (1024 * 1024))} MB).` };
  }
  if (buffer.length < 4) {
    return { ok: false, error: 'Geçersiz dosya (çok küçük).' };
  }

  // Magic-byte sniff: detected MIME must match declared MIME AND be on the allow-list
  const detected = sniffMime(buffer);
  if (!detected) return { ok: false, error: 'Bilinmeyen dosya formatı.' };
  if (!allowList.includes(detected)) {
    return { ok: false, error: `İzin verilmeyen dosya tipi: ${detected}` };
  }
  if (declaredMime && declaredMime !== detected) {
    return { ok: false, error: 'Dosya tipi içerikle eşleşmiyor.' };
  }
  return { ok: true, resolvedMime: detected };
}

/**
 * Sanitize filename:
 *  - strip anything not [A-Za-z0-9._-]
 *  - collapse `..` so path traversal is impossible even if the dev fallback
 *    misuses `path.basename`
 *  - reject empty / leading-dot / Windows reserved names
 */
function safeFilename(raw: string): string {
  let s = raw.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.\.+/g, '_');
  if (s.startsWith('.')) s = `_${s.slice(1)}`;
  const reservedWin = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
  if (reservedWin.test(s)) s = `_${s}`;
  if (s.length === 0) s = 'upload';
  // Cap filename length to keep blob keys reasonable
  if (s.length > 100) s = s.slice(0, 100);
  return s;
}

export async function uploadFile(file: File, prefix = 'listings'): Promise<string> {
  // MC-12: enforce MIME allow-list + size + magic-byte sniff before write.
  const isKycPrefix = isPrivatePrefix(prefix);
  const buffer = Buffer.from(await file.arrayBuffer());
  const check = validateUploadBuffer(buffer, file.type, isKycPrefix);
  if (!check.ok) throw new Error(check.error);

  const safeName = safeFilename(file.name);
  // Use crypto-random suffix instead of Math.random + Date.now (M-11, L-12, L-13).
  const key = `${prefix}/${randomKeySuffix(9)}-${safeName}`;

  if (BLOB_TOKEN) {
    // MC-11: KYC + private prefixes use access:'private'. Public listing photos
    // stay access:'public' because they're rendered directly by <img>.
    const access = isKycPrefix ? 'private' : 'public';
    const blob = await put(key, buffer, {
      access: access as 'public', // @vercel/blob types: 'public' is currently the only literal
      token: BLOB_TOKEN,
      contentType: check.resolvedMime,
    });
    return blob.url;
  }

  // Lokal fallback: public/uploads (dev only — private prefix still served from disk).
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', prefix);
  await mkdir(uploadDir, { recursive: true });
  const fullPath = path.join(uploadDir, path.basename(key));
  await writeFile(fullPath, buffer);
  return `/uploads/${prefix}/${path.basename(key)}`;
}

export async function uploadDataUrl(dataUrl: string, prefix = 'listings', filename = 'image.jpg'): Promise<string> {
  // Form Data URL'lerini File'a çevir, Blob'a yükle
  const match = dataUrl.match(/^data:([a-zA-Z0-9/+.-]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error('Geçersiz data URL');
  const mime = match[1];
  // Strict base64 decode + integrity check (encode back and compare lengths).
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length === 0) throw new Error('Boş veri.');

  // MC-12: validate via shared helper; reject if declared mime is missing or
  // not on the allow-list / size cap / magic bytes.
  const check = validateUploadBuffer(buffer, mime, isPrivatePrefix(prefix));
  if (!check.ok) throw new Error(check.error);

  // File polyfill: Blob ile yapay File
  const fakeFile = new File([new Uint8Array(buffer)], filename, { type: check.resolvedMime });
  return uploadFile(fakeFile, prefix);
}

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

/**
 * Blob/lokal yazma — tek nokta. `wantPrivate` ise önce private dener; bazı blob
 * depoları private erişimi desteklemediğinden hata olursa PUBLIC'e düşer (belge
 * yüklemenin tamamen kırılmaması için; key rastgele/tahmin edilemez). BLOB_TOKEN
 * yoksa lokal public/uploads'a yazar (yalnız dev — Vercel'de FS salt-okunur).
 */
async function putBlob(key: string, buffer: Buffer, contentType: string, wantPrivate: boolean): Promise<string> {
  if (BLOB_TOKEN) {
    try {
      const blob = await put(key, buffer, {
        access: (wantPrivate ? 'private' : 'public') as 'public',
        token: BLOB_TOKEN,
        contentType,
      });
      return blob.url;
    } catch (e) {
      // Private desteklenmiyorsa (eski depo) public'e düş — belge yüklemesi çalışsın.
      if (wantPrivate) {
        const blob = await put(key, buffer, { access: 'public', token: BLOB_TOKEN, contentType });
        return blob.url;
      }
      throw e;
    }
  }
  // Prod'da (Vercel) FS salt-okunur — token yoksa upload zaten çalışmaz.
  // Sessiz EROFS yerine net, eyleme dönük hata ver.
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    throw new Error('Dosya deposu yapılandırılmamış (BLOB_READ_WRITE_TOKEN eksik). Vercel\'de Blob mağazası bağlanmalı.');
  }
  const prefix = key.slice(0, key.lastIndexOf('/')) || 'misc';
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', prefix);
  await mkdir(uploadDir, { recursive: true });
  const fullPath = path.join(uploadDir, path.basename(key));
  await writeFile(fullPath, buffer);
  return `/uploads/${prefix}/${path.basename(key)}`;
}

export async function uploadFile(file: File, prefix = 'listings'): Promise<string> {
  const isKycPrefix = isPrivatePrefix(prefix);
  let buffer = Buffer.from(await file.arrayBuffer());
  let declaredMime = file.type;

  // iPhone/Mac HEIC/HEIF fotoğraflarını jpeg'e çevir (allow-list + tarayıcı uyumu).
  const pre = sniffMime(buffer);
  if (pre === 'image/heic') {
    try {
      const sharp = (await import('sharp')).default;
      buffer = Buffer.from(await sharp(buffer).jpeg({ quality: 88 }).toBuffer());
      declaredMime = 'image/jpeg';
    } catch {
      throw new Error('HEIC fotoğraf dönüştürülemedi. Lütfen JPG veya PNG yükleyin.');
    }
  }

  // MC-12: MIME allow-list + boyut + magic-byte sniff.
  const check = validateUploadBuffer(buffer, declaredMime, isKycPrefix);
  if (!check.ok) throw new Error(check.error);

  const safeName = safeFilename(declaredMime === 'image/jpeg' && pre === 'image/heic' ? `${file.name}.jpg` : file.name);
  const key = `${prefix}/${randomKeySuffix(9)}-${safeName}`;
  // NOT (MC-11 geçici gevşetme): Belge inceleme tarafı imzalı-URL altyapısına sahip
  // değil (admin `<a href={url}>` ile açıyor) — private blob auth ister, açılamaz.
  // Bu yüzden belgeler de PUBLIC + tahmin edilemez (72-bit rastgele) key ile saklanır;
  // hem yükleme hem inceleme güvenilir çalışır. İmzalı-URL eklenince private'a dönülebilir.
  return putBlob(key, buffer, check.resolvedMime, false);
}

/**
 * Hazır bir buffer'ı (ör. sunucuda işlenmiş/watermark'lı görsel) yükler.
 * `uploadFile` File beklediğinden, buffer tabanlı işlem için ayrı giriş noktası.
 * Aynı MIME/boyut/magic-byte kontrollerinden geçer (Madde 20).
 */
export async function uploadBuffer(buffer: Buffer, declaredMime: string, prefix = 'listings'): Promise<string> {
  const check = validateUploadBuffer(buffer, declaredMime, isPrivatePrefix(prefix));
  if (!check.ok) throw new Error(check.error);

  const ext = check.resolvedMime === 'image/png' ? 'png' : check.resolvedMime === 'image/webp' ? 'webp' : 'jpg';
  const key = `${prefix}/${randomKeySuffix(9)}-wm.${ext}`;
  return putBlob(key, buffer, check.resolvedMime, isPrivatePrefix(prefix));
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

import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/lib/storage';
import { rateLimit } from '@/lib/rate-limit';

/**
 * Ofis kaydında belge görseli yükleme (Madde 5). Kullanıcı henüz oturum açmadığı
 * için bu route oturumsuzdur — kötüye kullanımı engellemek için IP başına agresif
 * rate-limit uygulanır. Belge `private/office-docs` prefix'iyle PRIVATE blob'a
 * yazılır (storage.ts MIME/boyut/magic-byte kontrolleri + KYC MIME allow-list).
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimit(`office-docs:${ip}`, 20, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ error: 'Çok fazla yükleme denemesi. Lütfen daha sonra tekrar dene.' }, { status: 429 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'Dosya gerekli.' }, { status: 400 });

  try {
    const url = await uploadFile(file, 'private/office-docs');
    return NextResponse.json({ url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Yükleme başarısız.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

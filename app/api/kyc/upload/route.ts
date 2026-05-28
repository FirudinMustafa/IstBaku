import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-actions';
import { uploadFile } from '@/lib/storage';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Giriş yapmalısın.' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'Dosya gerekli.' }, { status: 400 });

  try {
    // 'kyc' prefix → özel (private) erişim + KYC MIME allow-list (storage.ts)
    const url = await uploadFile(file, 'kyc');
    return NextResponse.json({ url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Yükleme başarısız.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

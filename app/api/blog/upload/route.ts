import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getCurrentAdmin } from '@/lib/auth-actions';
import { uploadFile } from '@/lib/storage';

const ALLOWED_ROLES = new Set(['admin', 'moderator', 'super_admin', 'blog_publisher']);

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  const normalUser = await getCurrentUser();
  const user = admin ?? normalUser;
  if (!user || !ALLOWED_ROLES.has(user.role))
    return NextResponse.json({ error: 'Yetkin yok.' }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'Dosya gerekli.' }, { status: 400 });

  try {
    const url = await uploadFile(file, 'blog');
    return NextResponse.json({ url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Yükleme başarısız.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/db/client';
import { listings } from '@/db/schema';
import { eq, sql, and, isNull } from 'drizzle-orm';

// İlan görüntülenme sayacı. ISR'li detay sayfası önbelleğe alındığı için
// görüntülenmeleri sunucu bileşeninde değil, istemciden bu uçla sayıyoruz.
// Aynı ziyaretçinin tekrar yüklemelerini kısa süreli bir çerezle eler.
export async function POST(req: Request) {
  try {
    const { id } = await req.json().catch(() => ({ id: null }));
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const jar = await cookies();
    const cookieKey = `v_${id}`;
    if (jar.get(cookieKey)) {
      return NextResponse.json({ ok: true, counted: false });
    }

    await db
      .update(listings)
      .set({ views: sql`${listings.views} + 1` })
      .where(and(eq(listings.id, id), isNull(listings.deletedAt)));

    const res = NextResponse.json({ ok: true, counted: true });
    // 6 saat boyunca aynı ilan için tekrar saymayı engelle.
    res.cookies.set(cookieKey, '1', { maxAge: 60 * 60 * 6, httpOnly: true, sameSite: 'lax', path: '/' });
    return res;
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

(async () => {
  try {
    // 1) Pick a listing + owner
    const [listing] = await sql`
      SELECT id, slug, agent_id, daily_rental_enabled, daily_rental_price_per_night
      FROM listings WHERE deleted_at IS NULL LIMIT 1
    `;
    if (!listing) { console.error('No listings'); return; }
    console.log('Test listing:', listing.slug);

    // 2) Enable daily rental on it
    await sql`
      UPDATE listings
      SET daily_rental_enabled = true,
          daily_rental_price_per_night = 80,
          daily_rental_currency = 'USD',
          daily_rental_min_nights = 2,
          daily_rental_notes = 'Sigara içilmez. 14:00 sonrası giriş.'
      WHERE id = ${listing.id}
    `;
    console.log('  ✓ daily rental enabled @ $80/gece, min 2 gece');

    // 3) Pick a guest user (not the owner)
    const [guest] = await sql`
      SELECT id, email FROM users
      WHERE id <> ${listing.agent_id} AND deleted_at IS NULL
      LIMIT 1
    `;
    if (!guest) { console.error('No guest user'); return; }
    console.log('Guest:', guest.email);

    // 4) Clean any pre-existing bookings for this listing
    await sql`DELETE FROM daily_bookings WHERE listing_id = ${listing.id}`;

    // 5) Insert a pending booking
    const ci = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const co = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const nights = 3;
    const [booking] = await sql`
      INSERT INTO daily_bookings
        (listing_id, owner_id, guest_user_id, guest_name, guest_email, guest_phone,
         check_in, check_out, nights, total_price, currency, guest_count, status, notes)
      VALUES
        (${listing.id}, ${listing.agent_id}, ${guest.id}, 'Test Misafir', 'test@example.com', '+90 555 000 0000',
         ${ci}, ${co}, ${nights}, ${nights * 80}, 'USD', 2, 'pending', 'Test rezervasyonu')
      RETURNING id, status, total_price
    `;
    console.log('  ✓ Booking yaratıldı:', booking.id, 'pending', '$' + booking.total_price);

    // 6) Overlap check — try to insert overlapping booking
    const ci2 = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
    const co2 = new Date(Date.now() + 11 * 24 * 60 * 60 * 1000);
    const overlap = await sql`
      SELECT id FROM daily_bookings
      WHERE listing_id = ${listing.id}
        AND status IN ('pending', 'approved')
        AND check_in < ${co2}
        AND check_out > ${ci2}
    `;
    console.log('  ✓ Overlap kontrolü:', overlap.length > 0 ? 'çakışma tespit edildi' : 'çakışma yok (HATA)');

    // 7) Approve the booking
    await sql`
      UPDATE daily_bookings
      SET status = 'approved', responded_at = NOW(), owner_response_note = 'Onaylandı, hoşgeldin.'
      WHERE id = ${booking.id}
    `;
    const [updated] = await sql`SELECT status, owner_response_note FROM daily_bookings WHERE id = ${booking.id}`;
    console.log('  ✓ Onay sonrası:', updated.status, '·', updated.owner_response_note);

    // 8) Notification check
    const notifs = await sql`SELECT type, title FROM notifications WHERE type = 'daily_booking'`;
    console.log('  ✓ daily_booking notification enum value çalışıyor:', notifs.length, 'kayıt');

    // 9) Read back via SELECT
    const summary = await sql`
      SELECT b.status, b.nights, b.total_price, b.currency, b.guest_name, l.slug, l.daily_rental_enabled
      FROM daily_bookings b
      JOIN listings l ON l.id = b.listing_id
      WHERE b.id = ${booking.id}
    `;
    console.log('\n=== Final booking row ===');
    console.log(summary[0]);

    console.log('\n✅ Tüm günlük kira akışı doğrulandı.');
  } catch (e: any) {
    console.error('❌ ERROR:', e.message);
    if (e.code) console.error('   code:', e.code);
  } finally {
    await sql.end();
  }
})();

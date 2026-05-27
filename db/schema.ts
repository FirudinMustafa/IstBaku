import {
  pgTable, text, varchar, integer, boolean, timestamp, jsonb, real,
  pgEnum, uuid, primaryKey, index, uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// ============================================================
// ENUMS
// ============================================================

export const userRoleEnum = pgEnum('user_role', ['user', 'agent', 'admin', 'moderator', 'super_admin', 'blog_publisher']);
export const userStatusEnum = pgEnum('user_status', ['active', 'pending', 'suspended']);
export const kycStatusEnum = pgEnum('kyc_status', ['none', 'pending', 'approved', 'rejected']);
// Country artık enum değil — text + master tablo (`countries`). Dinamik genişleme için.
// Eski enum referansları kaldırıldı; varolan satırlar text olarak korunur (migration `USING country::text`).
export const currencyEnum = pgEnum('currency', ['USD', 'EUR', 'TRY', 'AZN']);
export const propertyTypeEnum = pgEnum('property_type', [
  'konut', 'luks_konut', 'villa', 'is_yeri', 'arsa', 'proje', 'bina', 'turistik_tesis', 'devre_mulk',
]);
export const purposeEnum = pgEnum('purpose', ['sale', 'rent']);
export const tierEnum = pgEnum('tier', ['standart', 'guclu', 'premium']);
export const ownerTypeEnum = pgEnum('owner_type', ['sahibi', 'emlakci', 'insaat', 'banka']);
export const statusEnum = pgEnum('listing_status', ['bos', 'kiracili', 'mulk_sahibi']);
export const titleDeedEnum = pgEnum('title_deed', ['kat_mulkiyeti', 'kat_irtifaki', 'arsa_payi', 'cikti_belgesi', 'belirsiz']);
export const parkingEnum = pgEnum('parking', ['kapali', 'acik', 'yok']);
export const approvalStatusEnum = pgEnum('approval_status', ['pending', 'approved', 'rejected']);
export const appointmentStatusEnum = pgEnum('appointment_status', ['pending', 'confirmed', 'cancelled', 'completed']);
export const dailyBookingStatusEnum = pgEnum('daily_booking_status', ['pending', 'approved', 'rejected', 'cancelled', 'completed']);
export const notificationTypeEnum = pgEnum('notification_type', ['match', 'price_drop', 'message', 'system', 'appointment', 'approval', 'kyc', 'payment', 'daily_booking']);
export const abuseReasonEnum = pgEnum('abuse_reason', ['fake', 'spam', 'scam', 'inappropriate', 'duplicate', 'wrong_info']);
export const abuseStatusEnum = pgEnum('abuse_status', ['open', 'reviewing', 'resolved', 'dismissed']);
export const abuseSeverityEnum = pgEnum('abuse_severity', ['low', 'medium', 'high']);
export const paymentTypeEnum = pgEnum('payment_type', ['tier_upgrade', 'premium_membership', 'report_purchase', 'partner_commission', 'date_renewal', 'istbaku_approved']);
export const paymentStatusEnum = pgEnum('payment_status', ['paid', 'refunded', 'failed', 'pending']);
export const coverKindEnum = pgEnum('cover_kind', ['photo', 'video']);
export const languageEnum = pgEnum('language', ['tr', 'az', 'en', 'ru', 'de', 'zh']);

// ============================================================
// USERS
// ============================================================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  phoneDial: varchar('phone_dial', { length: 8 }),
  phone: varchar('phone', { length: 32 }),
  country: varchar('country', { length: 8 }),
  role: userRoleEnum('role').notNull().default('user'),
  status: userStatusEnum('status').notNull().default('active'),
  emailVerified: boolean('email_verified').notNull().default(false),
  premium: boolean('premium').notNull().default(false),
  kycStatus: kycStatusEnum('kyc_status').notNull().default('none'),
  avatar: text('avatar'),
  bio: text('bio'),
  preferredLang: languageEnum('preferred_lang').notNull().default('tr'),
  preferredCurrency: currencyEnum('preferred_currency').notNull().default('USD'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  emailIdx: uniqueIndex('users_email_idx').on(sql`lower(${t.email})`),
  deletedAtIdx: index('users_deleted_at_idx').on(t.deletedAt),
}));

// Agent profile (extends user)
export const agents = pgTable('agents', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  agency: text('agency'),
  rating: real('rating').notNull().default(0),
  reviewsCount: integer('reviews_count').notNull().default(0),
  responseMins: integer('response_mins').notNull().default(15),
  performance: integer('performance').notNull().default(80),
  listingsCount: integer('listings_count').notNull().default(0),
  verified: boolean('verified').notNull().default(false),
  whatsappNumber: text('whatsapp_number'),
  languages: jsonb('languages').$type<string[]>().notNull().default([]),
  memberSince: timestamp('member_since', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// SESSIONS — iron-session zaten cookie tabanlı, ama DB session de tutmak istersek
// ============================================================

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 64 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdx: index('sessions_user_idx').on(t.userId),
}));

// ============================================================
// EMAIL TOKENS (verification + password reset)
// ============================================================

export const emailVerificationTokens = pgTable('email_verification_tokens', {
  token: varchar('token', { length: 96 }).primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  code: varchar('code', { length: 8 }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdx: index('email_verif_user_idx').on(t.userId),
  codeIdx: index('email_verif_code_idx').on(t.code),
}));

export const passwordResetTokens = pgTable('password_reset_tokens', {
  token: varchar('token', { length: 96 }).primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdx: index('password_reset_user_idx').on(t.userId),
}));

// ============================================================
// LISTINGS
// ============================================================

export const listings = pgTable('listings', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 200 }).notNull().unique(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  type: propertyTypeEnum('type').notNull(),
  purpose: purposeEnum('purpose').notNull(),
  tier: tierEnum('tier').notNull().default('standart'),
  country: varchar('country', { length: 8 }).notNull(),
  city: text('city').notNull(),
  district: text('district').notNull(),
  neighborhood: text('neighborhood'),
  address: text('address'),
  lat: real('lat'),
  lng: real('lng'),
  price: integer('price').notNull(),
  currency: currencyEnum('currency').notNull().default('USD'),
  netArea: integer('net_area').notNull(),
  grossArea: integer('gross_area').notNull(),
  rooms: varchar('rooms', { length: 24 }).notNull().default('2+1'),
  bathrooms: integer('bathrooms').notNull().default(1),
  floor: integer('floor').notNull().default(0),
  totalFloors: integer('total_floors').notNull().default(0),
  buildingAge: integer('building_age').notNull().default(0),
  heating: text('heating').notNull().default('Kombi'),
  parking: parkingEnum('parking').notNull().default('yok'),
  balcony: boolean('balcony').notNull().default(false),
  furnished: boolean('furnished').notNull().default(false),
  elevator: boolean('elevator').notNull().default(false),
  pool: boolean('pool').notNull().default(false),
  gym: boolean('gym').notNull().default(false),
  sauna: boolean('sauna').notNull().default(false),
  inSite: boolean('in_site').notNull().default(false),
  status: statusEnum('status').notNull().default('bos'),
  ownerType: ownerTypeEnum('owner_type').notNull().default('sahibi'),
  titleDeed: titleDeedEnum('title_deed').notNull().default('belirsiz'),
  swappable: boolean('swappable').notNull().default(false),
  images: jsonb('images').$type<string[]>().notNull().default([]),
  video: text('video'),
  coverKind: coverKindEnum('cover_kind').notNull().default('photo'),
  coverSrc: text('cover_src'),
  has360: boolean('has_360').notNull().default(false),
  // AI investment score (computed on insert/update or via scheduled job)
  scoreTotal: integer('score_total').notNull().default(70),
  scoreRegion: integer('score_region').notNull().default(70),
  scorePrice: integer('score_price').notNull().default(70),
  scoreRentYield: integer('score_rent_yield').notNull().default(70),
  scoreDemand: integer('score_demand').notNull().default(70),
  scoreReasoning: text('score_reasoning').notNull().default(''),
  // Region profile (set by agent)
  regionProfile: jsonb('region_profile').$type<{ aile: number; memur: number; ogrenci: number; yabanci: number; diger: number }>().notNull().default({ aile: 40, memur: 25, ogrenci: 15, yabanci: 12, diger: 8 }),
  nearby: jsonb('nearby').$type<Record<string, { name: string; minutes: number; km: number } | { name: string; minutes: number; km: number }[]>>().notNull().default({}),
  // Günlük kira (PR5) — ilan sahibi opsiyonel olarak açar
  dailyRentalEnabled: boolean('daily_rental_enabled').notNull().default(false),
  dailyRentalPricePerNight: integer('daily_rental_price_per_night'),
  dailyRentalCurrency: currencyEnum('daily_rental_currency'),
  dailyRentalMinNights: integer('daily_rental_min_nights').notNull().default(1),
  dailyRentalNotes: text('daily_rental_notes'),
  // Moderation
  approvalStatus: approvalStatusEnum('approval_status').notNull().default('pending'),
  istbakuApproved: boolean('istbaku_approved').notNull().default(false),
  approvalLevel: integer('approval_level').notNull().default(0),  // 0/1/2/3
  aiVerified: boolean('ai_verified').notNull().default(false),
  isPrivate: boolean('is_private').notNull().default(false),
  // Counters
  views: integer('views').notNull().default(0),
  favoritesCount: integer('favorites_count').notNull().default(0),
  // FK
  agentId: uuid('agent_id').references(() => users.id, { onDelete: 'set null' }),
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: uuid('deleted_by').references(() => users.id, { onDelete: 'set null' }),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  lastRenewedAt: timestamp('last_renewed_at', { withTimezone: true }),
  renewalCount: integer('renewal_count').notNull().default(0),
}, (t) => ({
  countryIdx: index('listings_country_idx').on(t.country),
  cityIdx: index('listings_city_idx').on(t.city),
  agentIdx: index('listings_agent_idx').on(t.agentId),
  publishedIdx: index('listings_published_idx').on(t.publishedAt),
  approvalIdx: index('listings_approval_idx').on(t.approvalStatus),
  deletedAtIdx: index('listings_deleted_at_idx').on(t.deletedAt),
  // Performance composite indexes (MC-20 / MH-24) — see 0002_perf_indexes.sql
  // TODO: For zero-downtime deploys on a populated table, recreate these as
  // CONCURRENTLY (drizzle does not yet expose .concurrently() on composite
  // index builders; run the SQL migration manually with `psql -f`).
  typePurposeIdx: index('idx_listings_type_purpose').on(t.type, t.purpose),
  purposeCountryPriceIdx: index('idx_listings_purpose_country_price')
    .on(t.purpose, t.country, sql`${t.price} DESC`),
  priceAreaIdx: index('idx_listings_price_area').on(t.price, t.netArea),
  approvalPendingIdx: index('idx_listings_approval_pending')
    .on(t.approvalStatus)
    .where(sql`${t.approvalStatus} = 'pending'`),
}));

// ============================================================
// FAVORITES & SAVED SEARCHES
// ============================================================

export const favorites = pgTable('favorites', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  listingId: uuid('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.listingId] }),
  // MH-24 — FK index on favorites.user_id (the PK starts with user_id so this
  // is technically covered, but we declare it explicitly for visibility and
  // to mirror 0002_perf_indexes.sql).
  userIdx: index('idx_favorites_user').on(t.userId),
}));

export const savedSearches = pgTable('saved_searches', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  filters: jsonb('filters').notNull().default({}),
  newMatches: integer('new_matches').notNull().default(0),
  notifyByEmail: boolean('notify_by_email').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// APPOINTMENTS (paylaşılan takvim)
// ============================================================

export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  listingId: uuid('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  agentId: uuid('agent_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  visitorUserId: uuid('visitor_user_id').references(() => users.id, { onDelete: 'set null' }),
  visitorName: text('visitor_name').notNull(),
  visitorEmail: text('visitor_email').notNull(),
  visitorPhone: text('visitor_phone'),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  status: appointmentStatusEnum('status').notNull().default('confirmed'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  agentScheduleIdx: uniqueIndex('appointments_agent_slot_idx').on(t.agentId, t.scheduledAt),
  listingIdx: index('appointments_listing_idx').on(t.listingId),
  // MH-24 — explicit composite FK index mirroring 0002_perf_indexes.sql.
  // The unique index above already covers this prefix, but we declare it
  // so the planner has a non-unique option for range scans on slot windows.
  agentSlotIdx: index('idx_appointments_agent_slot').on(t.agentId, t.scheduledAt),
}));

// ============================================================
// DAILY BOOKINGS (günlük kiralama)
// ============================================================
// İlan sahibi `listings.dailyRentalEnabled` true ettiğinde misafirler
// tarih aralığı seçip rezervasyon talebi gönderir. Sahip onaylar veya reddeder.
// Çakışma kontrolü application-level (lib/daily-booking-actions.ts).

export const dailyBookings = pgTable('daily_bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  listingId: uuid('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  guestUserId: uuid('guest_user_id').references(() => users.id, { onDelete: 'set null' }),
  guestName: text('guest_name').notNull(),
  guestEmail: text('guest_email').notNull(),
  guestPhone: text('guest_phone'),
  checkIn: timestamp('check_in', { withTimezone: true }).notNull(),
  checkOut: timestamp('check_out', { withTimezone: true }).notNull(),
  nights: integer('nights').notNull(),
  totalPrice: integer('total_price').notNull(),
  currency: currencyEnum('currency').notNull().default('USD'),
  guestCount: integer('guest_count').notNull().default(1),
  status: dailyBookingStatusEnum('status').notNull().default('pending'),
  notes: text('notes'),
  ownerResponseNote: text('owner_response_note'),
  respondedAt: timestamp('responded_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  listingDateIdx: index('daily_bookings_listing_date_idx').on(t.listingId, t.checkIn, t.checkOut),
  ownerIdx: index('daily_bookings_owner_idx').on(t.ownerId),
  statusIdx: index('daily_bookings_status_idx').on(t.status),
}));

// ============================================================
// MESSAGES (alıcı ↔ ajan)
// ============================================================

export const messageThreads = pgTable('message_threads', {
  id: uuid('id').primaryKey().defaultRandom(),
  // listingId FK is SET NULL so deleting the parent listing preserves the conversation history
  listingId: uuid('listing_id').references(() => listings.id, { onDelete: 'set null' }),
  participantA: uuid('participant_a').notNull().references(() => users.id, { onDelete: 'cascade' }),
  participantB: uuid('participant_b').notNull().references(() => users.id, { onDelete: 'cascade' }),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  participantsIdx: index('message_threads_participants_idx').on(t.participantA, t.participantB),
  pairListingIdx: uniqueIndex('message_threads_pair_listing_idx').on(t.participantA, t.participantB, t.listingId),
}));

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  threadId: uuid('thread_id').notNull().references(() => messageThreads.id, { onDelete: 'cascade' }),
  senderId: uuid('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  threadIdx: index('messages_thread_idx').on(t.threadId),
}));

// ============================================================
// NOTIFICATIONS
// ============================================================

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum('type').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  link: text('link'),
  read: boolean('read').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdx: index('notifications_user_idx').on(t.userId),
}));

// ============================================================
// ADMIN: APPROVAL QUEUE / KYC / ABUSE / PAYMENTS / AUDIT
// ============================================================

export const approvalRequests = pgTable('approval_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  listingId: uuid('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  submittedById: uuid('submitted_by_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),                         // new_listing, price_change, photo_update, tier_upgrade
  aiQualityScore: integer('ai_quality_score').notNull().default(0),
  aiFlags: jsonb('ai_flags').$type<string[]>().notNull().default([]),
  status: approvalStatusEnum('status').notNull().default('pending'),
  reviewedById: uuid('reviewed_by_id').references(() => users.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const kycRequests = pgTable('kyc_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),                          // investor, agent_license, title_deed
  documents: jsonb('documents').$type<{ name: string; url: string }[]>().notNull().default([]),
  status: kycStatusEnum('status').notNull().default('pending'),
  aiCheckScore: integer('ai_check_score').notNull().default(0),
  aiCheckNotes: text('ai_check_notes'),
  reviewedById: uuid('reviewed_by_id').references(() => users.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const abuseReports = pgTable('abuse_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  reporterId: uuid('reporter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  targetType: text('target_type').notNull(),             // listing / user / message
  targetId: uuid('target_id').notNull(),
  reason: abuseReasonEnum('reason').notNull(),
  details: text('details').notNull(),
  severity: abuseSeverityEnum('severity').notNull().default('medium'),
  status: abuseStatusEnum('status').notNull().default('open'),
  reviewedById: uuid('reviewed_by_id').references(() => users.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  listingId: uuid('listing_id').references(() => listings.id, { onDelete: 'set null' }),
  amount: integer('amount').notNull(),
  currency: currencyEnum('currency').notNull().default('USD'),
  type: paymentTypeEnum('type').notNull(),
  status: paymentStatusEnum('status').notNull().default('paid'),
  providerRef: text('provider_ref'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
  actorEmail: text('actor_email'),
  action: text('action').notNull(),
  target: text('target').notNull(),
  meta: jsonb('meta').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  createdIdx: index('audit_created_idx').on(t.createdAt),
}));

// ============================================================
// COUNTRY GUIDES (admin yönetir)
// ============================================================

export const countryGuides = pgTable('country_guides', {
  iso: varchar('iso', { length: 2 }).primaryKey(),
  name: text('name').notNull(),
  flag: text('flag').notNull(),
  description: text('description').notNull(),
  pdfUrl: text('pdf_url').notNull(),
  pages: integer('pages').notNull().default(0),
  language: languageEnum('language').notNull().default('tr'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// BLOG POSTS (haber & rehber içerikler)
// ============================================================

export const blogCategoryEnum = pgEnum('blog_category', ['news', 'market', 'guide', 'partner']);

export const blogPosts = pgTable('blog_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 300 }).notNull().unique(),
  title: text('title').notNull(),
  excerpt: text('excerpt').notNull().default(''),
  content: text('content').notNull(),
  coverImage: text('cover_image'),
  authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  authorName: text('author_name').notNull(),
  category: blogCategoryEnum('category').notNull().default('news'),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  language: text('blog_language').notNull().default('tr'),
  published: boolean('published').notNull().default(false),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  slugIdx: uniqueIndex('blog_posts_slug_idx').on(t.slug),
  publishedIdx: index('blog_posts_published_idx').on(t.published, t.publishedAt),
  authorIdx: index('blog_posts_author_idx').on(t.authorId),
}));

// ============================================================
// RELATIONS
// ============================================================

export const usersRelations = relations(users, ({ many, one }) => ({
  agentProfile: one(agents, { fields: [users.id], references: [agents.userId] }),
  listings: many(listings),
  favorites: many(favorites),
  savedSearches: many(savedSearches),
  notifications: many(notifications),
}));

export const listingsRelations = relations(listings, ({ one, many }) => ({
  agent: one(users, { fields: [listings.agentId], references: [users.id] }),
  favorites: many(favorites),
  appointments: many(appointments),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, { fields: [favorites.userId], references: [users.id] }),
  listing: one(listings, { fields: [favorites.listingId], references: [listings.id] }),
}));

// ============================================================
// COUNTRIES (master table — UI dropdowns + curated list)
// ============================================================

export const countries = pgTable('countries', {
  code: varchar('code', { length: 8 }).primaryKey(),       // 'TR', 'AZ', 'GE', ISO-3166 alpha-2
  nameTr: text('name_tr').notNull(),
  nameAz: text('name_az').notNull(),
  nameEn: text('name_en').notNull(),
  nameRu: text('name_ru').notNull().default(''),
  nameDe: text('name_de').notNull().default(''),
  nameZh: text('name_zh').notNull().default(''),
  flagEmoji: text('flag_emoji').notNull().default(''),
  enabled: boolean('enabled').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type DbCountry = typeof countries.$inferSelect;

// ============================================================
// EXPORTED TYPES (inferred)
// ============================================================

export type DbUser = typeof users.$inferSelect;
export type DbListing = typeof listings.$inferSelect;
export type DbAgent = typeof agents.$inferSelect;
export type DbAppointment = typeof appointments.$inferSelect;
export type DbNotification = typeof notifications.$inferSelect;
export type DbApprovalRequest = typeof approvalRequests.$inferSelect;
export type DbKycRequest = typeof kycRequests.$inferSelect;
export type DbAbuseReport = typeof abuseReports.$inferSelect;
export type DbPayment = typeof payments.$inferSelect;
export type DbAuditEntry = typeof auditLog.$inferSelect;
export type DbCountryGuide = typeof countryGuides.$inferSelect;
export type DbDailyBooking = typeof dailyBookings.$inferSelect;
export type DbBlogPost = typeof blogPosts.$inferSelect;

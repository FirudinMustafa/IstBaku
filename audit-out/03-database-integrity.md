# ISTBAKU Database & Data Integrity Audit
**Drizzle ORM + PostgreSQL**  
**Date:** 2026-05-17  
**Scope:** db/schema.ts, db/seed.ts, db/client.ts, db/migrations/**, lib/*-actions.ts, lib/*-queries.ts, drizzle.config.ts

---

## CRITICAL FINDINGS (5 items)

### CRITICAL-001: Race Condition in Appointment Booking (Double-Booking via TOCTOU)
**File:** lib/appointment-actions.ts:19-31  
**Severity:** CRITICAL  
**Issue:**
Between the SELECT check and INSERT, another request can book the same slot.

**Scenario:** User A and User B simultaneously book Agent X at 3pm. Both pass SELECT check, both INSERT → one fails with constraint error instead of "slot taken" message.

**Root Cause:** No transaction wrapping; unique index on (agentId, scheduledAt) not enforced during window.

**Fix:**
`	ypescript
// Option 1: Use ON CONFLICT
await db.insert(appointments).values({...})
  .onConflictDoNothing()
  .returning();

// Option 2: Explicit serializable transaction
await db.transaction(async (tx) => {
  const existing = await tx.select().from(appointments)...
  if (existing.length > 0) throw new Error('Slot taken');
  await tx.insert(appointments).values({...});
});
`

---

### CRITICAL-002: Favorite Double-Click Race Condition
**File:** lib/favorite-actions.ts:10-22  
**Severity:** CRITICAL  
**Issue:**
\onConflictDoNothing()\ silently ignores duplicate insert. If user double-clicks favorite:
1. First click: INSERT succeeds, favoritesCount+1
2. Second click: INSERT ignored (no error), but favoritesCount+1 executes → counter increments twice!
3. Result: 1 favorite, count=2 (CORRUPTION)

**Fix:**
`	ypescript
const [result] = await db.insert(favorites).values({...}).returning();
if (result) {
  await db.update(listings).set({ favoritesCount: sql\\ + 1\ })...
}
`

---

### CRITICAL-003: Cascade Delete Orphans Messages After Listing Deletion
**File:** db/schema.ts:250  
**Severity:** CRITICAL  
**Issue:**
Listings can be deleted (hard delete via listing-actions.ts:223). messageThreads cascades on deletion → all buyer-agent conversations LOST PERMANENTLY. No audit trail, no dispute resolution possible.

**Business Impact:** Regulatory/compliance issue; archive is unrecoverable.

**Fix:**
Implement soft delete:
`	ypescript
listings: {
  ...
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: uuid('deleted_by').references(() => users.id),
}
// Filter: isNull(listings.deletedAt) in all SELECTs
`

---

### CRITICAL-004: Seed Data Contains Hardcoded Passwords & Test Email
**File:** db/seed.ts:60, 94, 186-202  
**Severity:** CRITICAL  
**Issue:**
- Same password ('Agent2026!') for ALL agents
- Test email 'firudin@istbaku.com' hardcoded
- Credentials logged to console
- Seed can run in production if executed

**Fix:**
`	ypescript
// 1. Use env vars
const TEST_AGENT_PASSWORD = process.env.TEST_AGENT_PASSWORD || (throw Error);

// 2. Restrict to dev
if (process.env.NODE_ENV === 'production') {
  console.error('Seed blocked in production');
  process.exit(1);
}

// 3. Random test emails
const safeEmail = \gent-\@internal-test.local\;

// 4. Never log passwords
console.log('Agents created'); // Remove password from output
`

---

### CRITICAL-005: Notifications Enum Drift (Schema vs SQL Migration)
**File:** db/schema.ts:27 vs db/migrations/0000_keen_unicorn.sql:11  
**Severity:** CRITICAL  
**Issue:**
Schema defines: ['match', 'price_drop', 'message', 'system', 'appointment', 'approval', 'kyc', 'payment']
Migration defines: ['match', 'price_drop', 'message', 'system', 'appointment']  
**Missing:** 'approval', 'kyc', 'payment'

Code tries to insert type='kyc' → Postgres enum constraint rejects → RUNTIME ERROR.

**Fix:**
Update migration to match schema enums.

---

## HIGH FINDINGS (8 items)

### HIGH-001: Missing Unique Email Constraint Enforcement
**File:** lib/auth-actions.ts:67-68  
**Severity:** HIGH  
**Issue:**
SELECT check for duplicate email not atomic. Two simultaneous signups with same email both pass check → second INSERT fails with constraint error, not handled gracefully.

**Fix:**
`	ypescript
try {
  const [created] = await db.insert(users).values({...}).returning();
} catch (err) {
  if (err.code === '23505') { // Postgres unique constraint
    return { ok: false, error: 'Email already registered.' };
  }
  throw err;
}
`

---

### HIGH-002: N+1 Query Problem in Message Threads
**File:** lib/message-actions.ts:122-171  
**Severity:** HIGH  
**Issue:**
For each thread, execute 3 separate queries:
- Other user details (SELECT from users)
- Last message (SELECT from messages)
- Unread count (SELECT from messages)

With 20 threads: 1 + 20*3 = 61 queries instead of 2-3.

**Impact:** Timeout on mobile, connection pool exhaustion.

**Fix:**
Combine into single query with JOINs and aggregation.

---

### HIGH-003: Missing Composite Indexes for Search Filters
**File:** db/schema.ts, db-queries.ts:88-130  
**Severity:** HIGH  
**Issue:**
searchListings() filters on (approvalStatus, isPrivate, type, purpose, price, etc.) but only single-column indexes exist. 10k+ listings → full table scan → 500ms+ queries.

**Fix:**
`	ypescript
searchFilterIdx: index('listings_search_filter_idx')
  .on(t.approvalStatus, t.isPrivate, t.type, t.purpose, t.price),
`

---

### HIGH-004: No Soft Delete — Regulatory Risk
**File:** db/schema.ts  
**Severity:** HIGH  
**Issue:**
Hard delete on listings → no audit trail. GDPR/regulatory issue.

**Fix:**
Implement soft delete with deletedAt field.

---

### HIGH-005: Approval Level Column Missing CHECK Constraint
**File:** db/schema.ts:181  
**Severity:** HIGH  
**Issue:**
\pprovalLevel: integer(...)\ allows -1, 100, etc. Type should be 0-3. No DB-level constraint.

**Fix:**
`sql
ALTER TABLE listings ADD CONSTRAINT listings_approval_level_check
  CHECK (approval_level BETWEEN 0 AND 3);
`

---

### HIGH-006: Price Column Ambiguous (Cents vs Dollars)
**File:** db/schema.ts:141-142  
**Severity:** HIGH  
**Issue:**
\price: integer('price')\ — unclear if cents or dollars. Payments also use integer without clear documentation.

**Fix:**
Document clearly with constants:
`	ypescript
// Price always in cents (e.g., .99 = 2999 integer)
const PRICE_SCALE = 100; // cents per unit
`

---

### HIGH-007: Missing Index for Message Read Status
**File:** lib/message-actions.ts:148-154  
**Severity:** HIGH  
**Issue:**
Unread count query (per thread in loop) filters on (threadId, senderId, readAt) but only threadId indexed.

**Fix:**
`	ypescript
unreadIdx: index('messages_unread_idx')
  .on(t.threadId, t.readAt)
  .where(isNull(messages.readAt)),
`

---

### HIGH-008: Abuse Report targetId Not Validated Against targetType
**File:** db/schema.ts:316-328  
**Severity:** HIGH  
**Issue:**
targetType='listing' but targetId can be any UUID (no FK). Can reference non-existent or wrong-type entities.

**Fix:**
Add validation trigger or separate tables per type.

---

## MEDIUM FINDINGS (8 items)

### MEDIUM-001: Agent Profile Cascade Delete Deletes User
**File:** db/schema.ts:65-66  
**Severity:** MEDIUM  
**Issue:**
agents.userId is PRIMARY KEY with CASCADE FK → deleting agent profile also deletes user account. Unintended?

**Fix:**
Add soft deactivation:
`	ypescript
agents: {
  isActive: boolean('is_active').default(true),
}
`

---

### MEDIUM-002: SavedSearch Filters Not Validated (JSON Injection Risk)
**File:** listing-actions.ts:294-304  
**Severity:** MEDIUM  
**Issue:**
No validation of filters structure. Can contain arbitrary JSON, unlimited depth → data bloat, injection risk.

**Fix:**
`	ypescript
const FilterStateSchema = z.object({
  purpose: z.enum(['sale', 'rent']).optional(),
  city: z.string().max(100).optional(),
  // ... validate structure
});
`

---

### MEDIUM-003: DB Pool Size Hardcoded (max: 10)
**File:** db/client.ts:21  
**Severity:** MEDIUM  
**Issue:**
Only 10 connections in pool. 11th concurrent request waits/times out. No monitoring.

**Fix:**
`	ypescript
const maxPool = parseInt(process.env.DB_POOL_SIZE || '20', 10);
// Add pool monitoring
`

---

### MEDIUM-004: Audit Log Redundant actorEmail Field
**File:** db/schema.ts:345  
**Severity:** MEDIUM  
**Issue:**
Both actorId (FK, can be null) and actorEmail (text) identify actor. If actor deleted, email remains → confusion.

**Fix:**
`	ypescript
actorId: uuid('actor_id').references(..., { onDelete: 'restrict' }),
actorEmail: text('actor_email').notNull(), // Immutable capture at time of action
`

---

### MEDIUM-005: Counters (views, favoritesCount) Can Go Negative
**File:** db/schema.ts:185-186  
**Severity:** MEDIUM  
**Issue:**
No CHECK constraint. Concurrent decrements or admin updates can make counts negative.

**Fix:**
`sql
ALTER TABLE listings ADD CONSTRAINT listings_favorites_nonneg
  CHECK (favorites_count >= 0);
`

---

### MEDIUM-006: Timestamp Precision (Microseconds vs Milliseconds)
**File:** db/schema.ts (all timestamps)  
**Severity:** MEDIUM  
**Issue:**
PostgreSQL microseconds, JS milliseconds → precision mismatch. Comparison queries may miss rows.

**Recommendation:**
Document and round to milliseconds:
`	ypescript
const nowMs = () => new Date(Math.floor(Date.now() / 1000) * 1000);
`

---

### MEDIUM-007: No PII Protection in Messages
**File:** lib/message-actions.ts  
**Severity:** MEDIUM  
**Issue:**
Both thread participants can read all messages (correct). But no encryption for sensitive data (credit cards, personal numbers).

**Recommendation:**
Consider E2E encryption for sensitive content:
`	ypescript
messages: {
  encryptedContent: text('encrypted_content'),
  isEncrypted: boolean('is_encrypted').default(false),
}
`

---

### MEDIUM-008: Region Profile Schema Inflexible
**File:** db/schema.ts:176  
**Severity:** MEDIUM  
**Issue:**
Strict 5-field JSON type. Adding new demographic category requires schema migration.

**Fix:**
Use flexible Record<string,number> with validation function.

---

## LOW FINDINGS (7 items)

### LOW-001: Missing Email Verification Timestamp
**File:** db/schema.ts:50  
**Severity:** LOW  
**Issue:**
Only boolean emailVerified flag; can't tell when verification happened.

**Fix:**
Add emailVerifiedAt: timestamp.

---

### LOW-002: No GIN Index for Tags
**File:** db/schema.ts:192  
**Severity:** LOW  
**Issue:**
If future feature filters by tags (e.g., @> operator), no index.

**Fix:**
`	ypescript
tagsIdx: index('listings_tags_idx').on(t.tags).using('gin'),
`

---

### LOW-003: Admin Queries Missing Permission Checks
**File:** lib/admin-queries.ts:5-70  
**Severity:** LOW  
**Issue:**
No getCurrentAdmin() calls; queries leak all users if exposed as API.

**Fix:**
Add auth check to each query function.

---

### LOW-004: Email Delivery Failures Silently Ignored
**File:** lib/appointment-actions.ts:56-84  
**Severity:** LOW  
**Issue:**
\silent: true\ on sendEmail → failures ignored. User won't know if confirmation didn't arrive.

**Recommendation:**
Log failures and optionally queue for retry.

---

### LOW-005: Notification Body Field Size Unlimited
**File:** db/schema.ts:277  
**Severity:** LOW  
**Issue:**
\	ext\ type allows 1MB+. With 100k users, bulk notifications = 100GB table.

**Fix:**
Use \archar('body', { length: 1000 })\.

---

### LOW-006: Seed Uses Placeholder URLs for Documents
**File:** db/seed.ts:236-238  
**Severity:** LOW  
**Issue:**
KYC documents point to '#' URL. Links don't work in testing.

**Fix:**
Use proper demo URLs.

---

### LOW-007: AppointmentStatus 'pending' Never Used
**File:** db/schema.ts:26  
**Severity:** LOW  
**Issue:**
Enum includes 'pending' but always inserted as 'confirmed'. Unused status enum value.

**Recommendation:**
Clarify if approval flow planned, or remove 'pending'.

---

## SUMMARY TABLE

| Severity | Count | Examples |
|----------|-------|----------|
| CRITICAL | 5 | Race conditions, enum drift, cascade orphans, seed passwords |
| HIGH | 8 | N+1 queries, missing indexes, no soft delete, validation gaps |
| MEDIUM | 8 | Pool config, constraints, timestamp precision, JSON schema |
| LOW | 7 | Audit gaps, unused enums, doc strings |
| **TOTAL** | **28** | |

---

## REMEDIATION TIMELINE

**Week 1 (Critical):**
- Fix appointment double-booking race condition
- Fix favorite double-click counter corruption
- Implement soft delete for listings
- Remove hardcoded seed passwords
- Sync notification_type enum

**Week 2 (High):**
- Wrap signup unique constraint in try-catch
- Refactor getMyThreads() to single query
- Add composite indexes for search filters
- Add CHECK constraints to columns
- Validate abuseReports targetType

**Weeks 3-4 (Medium):**
- Implement soft delete schema for full audit compliance
- Make DB pool configurable + monitoring
- Add region profile validation
- Restructure audit log

---

**Audit Date:** 2026-05-17  
**Scope:** 100+ scenarios reviewed  
**Status:** Complete
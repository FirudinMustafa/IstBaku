import { db } from '@/db/client';
import * as s from '@/db/schema';
import { eq, desc, count, sql } from 'drizzle-orm';

export async function getAllUsers() {
  return db.select().from(s.users).orderBy(desc(s.users.createdAt));
}

export async function getAllAgents() {
  return db.select({ user: s.users, agent: s.agents })
    .from(s.users)
    .innerJoin(s.agents, eq(s.users.id, s.agents.userId))
    .orderBy(desc(s.agents.rating));
}

export async function getApprovalQueue(status: 'pending' | 'approved' | 'rejected' = 'pending') {
  return db.select({ request: s.approvalRequests, listing: s.listings, submitter: s.users })
    .from(s.approvalRequests)
    .innerJoin(s.listings, eq(s.approvalRequests.listingId, s.listings.id))
    .innerJoin(s.users, eq(s.approvalRequests.submittedById, s.users.id))
    .where(eq(s.approvalRequests.status, status))
    .orderBy(desc(s.approvalRequests.createdAt));
}

export async function getKycQueue() {
  return db.select({ kyc: s.kycRequests, user: s.users })
    .from(s.kycRequests)
    .innerJoin(s.users, eq(s.kycRequests.userId, s.users.id))
    .orderBy(desc(s.kycRequests.createdAt));
}

export async function getAbuseReports() {
  return db.select({ report: s.abuseReports, reporter: s.users })
    .from(s.abuseReports)
    .innerJoin(s.users, eq(s.abuseReports.reporterId, s.users.id))
    .orderBy(desc(s.abuseReports.createdAt));
}

export async function getAllPayments() {
  return db.select({ payment: s.payments, user: s.users })
    .from(s.payments)
    .innerJoin(s.users, eq(s.payments.userId, s.users.id))
    .orderBy(desc(s.payments.createdAt));
}

export async function getAuditLog(limit = 200) {
  return db.select().from(s.auditLog).orderBy(desc(s.auditLog.createdAt)).limit(limit);
}

export async function getAllCountryGuides() {
  return db.select().from(s.countryGuides).orderBy(s.countryGuides.name);
}

export async function getAdminStats() {
  const [userCount] = await db.select({ c: count() }).from(s.users);
  const [listingCount] = await db.select({ c: count() }).from(s.listings);
  const [pendingApproval] = await db.select({ c: count() }).from(s.approvalRequests).where(eq(s.approvalRequests.status, 'pending'));
  const [pendingKyc] = await db.select({ c: count() }).from(s.kycRequests).where(eq(s.kycRequests.status, 'pending'));
  const [openAbuse] = await db.select({ c: count() }).from(s.abuseReports).where(eq(s.abuseReports.status, 'open'));
  const [paid] = await db.select({ total: sql<number>`COALESCE(SUM(${s.payments.amount}), 0)::int` }).from(s.payments).where(eq(s.payments.status, 'paid'));
  return {
    users: userCount.c,
    listings: listingCount.c,
    pendingApproval: pendingApproval.c,
    pendingKyc: pendingKyc.c,
    openAbuse: openAbuse.c,
    revenueTotal: paid.total ?? 0,
  };
}

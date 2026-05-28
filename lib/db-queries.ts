import { db } from '@/db/client';
import { listings, users, agents } from '@/db/schema';
import { eq, and, or, ilike, gte, lte, inArray, desc, asc, sql, isNull } from 'drizzle-orm';
import { rowToProperty, rowsToAgent } from './db-mappers';
import type { FilterState, Property, Agent } from './types';

// ----------------------------------------------------------------
// LISTINGS
// ----------------------------------------------------------------

// MC-21 — pagination guard. Callers can pass `{ limit, offset }`; if omitted
// we apply a generous cap so a full table is never dumped to the client.
export const LISTINGS_DEFAULT_PAGE_SIZE = 60;
export const LISTINGS_MAX_PAGE_SIZE = 200;

export interface ListingPageOpts {
  limit?: number;
  offset?: number;
}

function clampPage(opts?: ListingPageOpts) {
  const rawLimit = opts?.limit ?? LISTINGS_DEFAULT_PAGE_SIZE;
  const limit = Math.max(1, Math.min(LISTINGS_MAX_PAGE_SIZE, Math.floor(rawLimit)));
  const offset = Math.max(0, Math.floor(opts?.offset ?? 0));
  return { limit, offset };
}

export async function getAllListings(
  includePrivate = false,
  opts?: ListingPageOpts,
): Promise<Property[]> {
  const { limit, offset } = clampPage(opts);
  const rows = await db
    .select()
    .from(listings)
    .where(
      and(
        eq(listings.approvalStatus, 'approved'),
        includePrivate ? sql`TRUE` : eq(listings.isPrivate, false),
        // MC-30: exclude soft-deleted rows from every public query.
        isNull(listings.deletedAt),
      ),
    )
    .orderBy(desc(listings.publishedAt), desc(listings.id))
    .limit(limit)
    .offset(offset);
  return rows.map(rowToProperty);
}

export async function getPublicListings(opts?: ListingPageOpts): Promise<Property[]> {
  return getAllListings(false, opts);
}

export async function getPrivateListings(opts?: ListingPageOpts): Promise<Property[]> {
  const { limit, offset } = clampPage(opts);
  const rows = await db
    .select()
    .from(listings)
    .where(and(
      eq(listings.approvalStatus, 'approved'),
      eq(listings.isPrivate, true),
      isNull(listings.deletedAt),
    ))
    .orderBy(desc(listings.publishedAt), desc(listings.id))
    .limit(limit)
    .offset(offset);
  return rows.map(rowToProperty);
}

export async function getPremiumListings(opts?: ListingPageOpts): Promise<Property[]> {
  const { limit, offset } = clampPage(opts);
  const rows = await db
    .select()
    .from(listings)
    .where(
      and(
        eq(listings.approvalStatus, 'approved'),
        eq(listings.istbakuApproved, true),
        eq(listings.tier, 'premium'),
        eq(listings.isPrivate, false),
        isNull(listings.deletedAt),
      ),
    )
    .orderBy(desc(listings.publishedAt), desc(listings.id))
    .limit(limit)
    .offset(offset);
  return rows.map(rowToProperty);
}

export async function getListingBySlug(
  slug: string,
  { requireApproved = true }: { requireApproved?: boolean } = {},
): Promise<Property | null> {
  const conds = [eq(listings.slug, slug), isNull(listings.deletedAt)];
  if (requireApproved) {
    conds.push(eq(listings.approvalStatus, 'approved'));
  }
  const [row] = await db.select().from(listings)
    .where(and(...conds))
    .limit(1);
  return row ? rowToProperty(row) : null;
}

export async function getListingById(id: string): Promise<Property | null> {
  const [row] = await db.select().from(listings)
    .where(and(eq(listings.id, id), isNull(listings.deletedAt)))
    .limit(1);
  return row ? rowToProperty(row) : null;
}

export async function getAllSlugs(): Promise<string[]> {
  const rows = await db.select({ slug: listings.slug }).from(listings)
    .where(and(eq(listings.approvalStatus, 'approved'), isNull(listings.deletedAt)));
  return rows.map((r) => r.slug);
}

export async function getSimilarListings(p: Property, limit = 3): Promise<Property[]> {
  const rows = await db
    .select()
    .from(listings)
    .where(
      and(
        eq(listings.approvalStatus, 'approved'),
        eq(listings.isPrivate, false),
        eq(listings.city, p.city),
        isNull(listings.deletedAt),
        sql`${listings.id} != ${p.id}`,
      ),
    )
    .orderBy(desc(listings.scoreTotal))
    .limit(limit);
  return rows.map(rowToProperty);
}

// ----------------------------------------------------------------
// AGENTS
// ----------------------------------------------------------------

export async function getAgentById(userId: string): Promise<Agent | null> {
  const [row] = await db
    .select({ user: users, agent: agents })
    .from(users)
    .innerJoin(agents, eq(users.id, agents.userId))
    .where(eq(users.id, userId))
    .limit(1);
  return row ? rowsToAgent(row.user, row.agent) : null;
}

// ----------------------------------------------------------------
// SEARCH / FILTER
// ----------------------------------------------------------------

export async function searchListings(
  filter: FilterState,
  q?: string,
  opts?: ListingPageOpts,
): Promise<Property[]> {
  const { limit, offset } = clampPage(opts);
  const conds = [eq(listings.approvalStatus, 'approved'), eq(listings.isPrivate, false), isNull(listings.deletedAt)];

  if (q?.trim()) {
    const ql = `%${q.trim()}%`;
    conds.push(
      or(
        ilike(listings.title, ql),
        ilike(listings.description, ql),
        ilike(listings.city, ql),
        ilike(listings.district, ql),
      ) as never,
    );
  }
  if (filter.purpose) conds.push(eq(listings.purpose, filter.purpose));
  if (filter.country) conds.push(eq(listings.country, filter.country));
  if (filter.city) conds.push(eq(listings.city, filter.city));
  if (filter.district) conds.push(eq(listings.district, filter.district));
  if (filter.type?.length) conds.push(inArray(listings.type, filter.type));
  if (filter.minPrice) conds.push(gte(listings.price, filter.minPrice));
  if (filter.maxPrice) conds.push(lte(listings.price, filter.maxPrice));
  if (filter.minArea) conds.push(gte(listings.netArea, filter.minArea));
  if (filter.maxArea) conds.push(lte(listings.netArea, filter.maxArea));
  if (filter.rooms?.length) conds.push(inArray(listings.rooms, filter.rooms));
  if (filter.bathrooms) conds.push(gte(listings.bathrooms, filter.bathrooms));
  if (filter.buildingMinAge != null) conds.push(gte(listings.buildingAge, filter.buildingMinAge));
  if (filter.buildingMaxAge != null) conds.push(lte(listings.buildingAge, filter.buildingMaxAge));
  if (filter.istbakuApproved) conds.push(eq(listings.istbakuApproved, true));
  if (filter.with360) conds.push(eq(listings.has360, true));
  if (filter.ownerType?.length) conds.push(inArray(listings.ownerType, filter.ownerType));
  if (filter.status?.length) conds.push(inArray(listings.status, filter.status as never));
  if (filter.housingType?.length) conds.push(inArray(listings.housingType, filter.housingType as never));
  if (filter.energyClass?.length) conds.push(inArray(listings.energyClass, filter.energyClass as never));
  if (filter.buildingStatus?.length) conds.push(inArray(listings.buildingStatus, filter.buildingStatus as never));
  if (filter.structureType?.length) conds.push(inArray(listings.structureType, filter.structureType as never));
  if (filter.facade?.length) conds.push(inArray(listings.facade, filter.facade as never));

  let order;
  switch (filter.sort) {
    case 'price_asc':  order = asc(listings.price); break;
    case 'price_desc': order = desc(listings.price); break;
    case 'score_desc': order = desc(listings.scoreTotal); break;
    default:           order = desc(listings.publishedAt);
  }

  const rows = await db
    .select()
    .from(listings)
    .where(and(...conds))
    .orderBy(order)
    .limit(limit)
    .offset(offset);
  return rows.map(rowToProperty);
}

/**
 * @gamify/shared — types and constants shared by the mobile app and the API.
 *
 * The whole product is one idea: every meaningful action emits an XP event
 * against a user-defined goal. Totals, levels, streaks and leaderboards are all
 * DERIVED from the append-only xp_events ledger — never stored redundantly.
 *
 * These types mirror the Postgres schema (see supabase/migrations). Once the DB
 * exists, prefer generating types with `supabase gen types typescript` and keep
 * only the hand-authored constants (XP curve) here.
 */

// ── Core EXP abstraction ────────────────────────────────────────────────────

export type GoalCategory = "fitness" | "learning" | "mindfulness" | "productivity" | "custom";

/** A user-defined objective. Any goal, exactly the abstraction we're building on. */
export interface Goal {
  id: string;
  user_id: string;
  title: string;
  category: GoalCategory;
  /** Optional link to a marketplace course this goal was adopted from. */
  source_course_id: string | null;
  archived: boolean;
  created_at: string;
}

/** A repeatable/completable unit under a goal (a habit, task, or lesson). */
export interface Activity {
  id: string;
  goal_id: string;
  title: string;
  /** iCal RRULE string, or null for a one-off task. */
  recurrence: string | null;
  base_xp: number;
  created_at: string;
}

/** Append-only ledger row — the single source of truth for all progress. */
export interface XpEvent {
  id: string;
  user_id: string;
  goal_id: string;
  activity_id: string | null;
  amount: number;
  multiplier: number;
  source: XpSource;
  created_at: string;
}

export type XpSource = "activity_complete" | "streak_bonus" | "course_milestone" | "manual" | "adjustment";

export interface Streak {
  user_id: string;
  goal_id: string | null; // null = global streak
  current: number;
  longest: number;
  freezes: number;
  last_active_on: string; // date
}

// ── Marketplace (courses & habits are publicly publishable) ─────────────────

export type ListingStatus = "draft" | "published" | "unlisted" | "removed";
export type ListingKind = "course" | "habit";

/** A publicly shareable course or habit template that others can adopt. */
export interface MarketplaceListing {
  id: string;
  author_id: string;
  kind: ListingKind;
  title: string;
  summary: string;
  category: GoalCategory;
  status: ListingStatus;
  is_paid: boolean;
  price_cents: number | null;
  installs: number;
  rating_avg: number;
  rating_count: number;
  version: number;
  created_at: string;
}

export interface ListingReview {
  id: string;
  listing_id: string;
  user_id: string;
  rating: number; // 1..5
  body: string | null;
  created_at: string;
}

// ── XP curve (config, not hardcoded in the UI) ──────────────────────────────

/** XP required to reach a given level. Quadratic curve — tune freely. */
export function xpForLevel(level: number): number {
  return Math.round(50 * level * level + 50 * level);
}

/** Derive the current level and progress from a running XP total. */
export function levelFromXp(totalXp: number): { level: number; intoLevel: number; span: number } {
  let level = 0;
  while (xpForLevel(level + 1) <= totalXp) level++;
  const floor = xpForLevel(level);
  const ceil = xpForLevel(level + 1);
  return { level, intoLevel: totalXp - floor, span: ceil - floor };
}

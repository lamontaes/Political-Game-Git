/**
 * Each place's recount rule (owner, Nov 10, 2026: "Recount by own states
 * rules"), read from data/research/elections/recount-rules-2026.json by the
 * one count (src/core2/modules/voting.ts, keepCount). Pure: a count's margin
 * against the place's tiers, no world state.
 */
import rules from "../../data/research/elections/recount-rules-2026.json" with { type: "json" };

/** One line of a rule: the first whose `maxCast` is at or over the race's votes applies. */
export interface RecountTier {
  readonly share?: number;
  readonly votes?: number;
  readonly join?: "lesser" | "either";
  readonly minVotes?: number;
  readonly maxCast?: number;
}

export interface RecountRule {
  readonly name: string;
  readonly automatic: readonly RecountTier[] | null;
  readonly request: readonly RecountTier[] | null;
  readonly marginOf: "office" | "top-two" | "winner";
  readonly days: number;
  readonly tag: string;
  readonly source: string;
}

const places = rules.places as unknown as Readonly<Record<string, RecountRule>>;

/** A place's recount rule, by its state key (US-XX); null where the table has none. */
export function recountRuleFor(stateKey: string): RecountRule | null {
  return places[stateKey] ?? null;
}

/** How far the leader is ahead of the runner-up, and the base the rule measures it against. */
export interface CountMargin {
  readonly leaderId: string;
  readonly trailingId: string;
  readonly margin: number;
  readonly base: number;
  readonly cast: number;
}

/** A count's margin between its top two, as the place's rule measures it; null with fewer than two on the count. */
export function countMargin(
  ranked: readonly (readonly [string, number])[],
  rule: Pick<RecountRule, "marginOf">,
): CountMargin | null {
  if (ranked.length < 2) return null;
  const [leaderId, first] = ranked[0]!;
  const [trailingId, second] = ranked[1]!;
  const cast = ranked.reduce((n, [, votes]) => n + votes, 0);
  if (!first) return null;
  const base =
    rule.marginOf === "winner"
      ? first
      : rule.marginOf === "top-two"
        ? first + second
        : cast;
  return { leaderId, trailingId, margin: first - second, base, cast };
}

/** Whether a margin falls inside a rule's tiers (null tiers: never). */
export function insideRecountMargin(
  tiers: readonly RecountTier[] | null,
  margin: Pick<CountMargin, "margin" | "base" | "cast">,
): boolean {
  if (!tiers) return false;
  const tier = tiers.find(
    (t) => t.maxCast === undefined || margin.cast <= t.maxCast,
  );
  if (!tier) return false;
  if (tier.minVotes !== undefined && margin.margin <= tier.minVotes)
    return true;
  const byShare =
    tier.share === undefined ? null : margin.margin <= tier.share * margin.base;
  const byVotes = tier.votes === undefined ? null : margin.margin <= tier.votes;
  if (byShare === null) return byVotes ?? false;
  if (byVotes === null) return byShare;
  return tier.join === "either" ? byShare || byVotes : byShare && byVotes;
}

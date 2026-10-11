// STOPGAP(RULES3-CAM-002): see docs/plans/rules3/campaigns-stopgaps.json.
// Lifted unchanged from src/simulation/living-world/civic-actions.ts; RULES-3, 2026-10-11.
import { addDays, daysBetween } from "./dates";
import type { strongestOfficialStanding } from "../../simulation/official-view-reads";
import type { EntityId, IsoDate, World } from "../../simulation/types";

export const CIVIC_ACTION_EVENTS = {
  contacted: "life.contacted-official",
  attended: "life.attended-public-meeting",
} as const;

export const DAYS_PER_QUARTER = 91;

export const STAKE = {
  adultYears: { full: 50, weight: 0.6 },
  townYears: { full: 20, weight: 0.4 },
  job: 0.25,
  lawCost: 0.5,
  groupMember: 1,
} as const;

export const STRONG_VIEW_POINTS = 20;

export const STRONG_VIEW_FACTOR = 2;

export const MEASURE = { contacted: 14, attended: 13 } as const;

export interface CivicStake {
  /** The day the pull started adding up: adulthood or arrival in town. */
  readonly since: IsoDate;
  readonly pull: { readonly contacted: number; readonly attended: number };
  readonly view: ReturnType<typeof strongestOfficialStanding>;
  /** Record evidence that explains why this contact occurred, if any. */
  readonly reason: {
    readonly kind:
      | "law-cost"
      | "lived-outcome"
      | "official-view"
      | "organized-opposition"
      | "general-opinion";
    readonly sourceRecordIds: readonly EntityId[];
  };
}

export function civicStake(
  personId: EntityId,
  town: EntityId,
  groupMembers: ReadonlySet<EntityId>,
  facts: {
    readonly birthDate: IsoDate;
    readonly today: IsoDate;
    readonly startedAt: IsoDate;
    readonly lawExposures: World["history"]["lawExposures"];
    readonly organizationParticipations: World["history"]["organizationParticipations"];
    readonly organizations: World["history"]["organizations"];
    readonly recordedResidenceSince: IsoDate | null;
    readonly employed: boolean;
    readonly view: ReturnType<typeof strongestOfficialStanding>;
    readonly outcomes: readonly {
      readonly at: IsoDate;
      readonly direction: string;
      readonly sourceRecordId: EntityId;
    }[];
    readonly reactionLens: number;
  },
): CivicStake {
  const today = facts.today;
  const adultOn = addDays(facts.birthDate, Math.round(18 * 365.25));
  // The record of where people lived begins with the world. A resident
  // already in town when it began counts as living there since adulthood (a
  // game assumption: the years before the record are not read).
  const recorded = facts.recordedResidenceSince;
  const arrived =
    recorded === null || recorded <= facts.startedAt ? adultOn : recorded;
  const since = adultOn > arrived ? adultOn : arrived;
  const years = (from: IsoDate) =>
    Math.max(0, daysBetween(from, today) / 365.25);
  const settled =
    STAKE.adultYears.weight *
      Math.min(1, years(adultOn) / STAKE.adultYears.full) +
    STAKE.townYears.weight *
      Math.min(1, years(arrived) / STAKE.townYears.full) +
    (facts.employed ? STAKE.job : 0);
  const view = facts.view;
  const viewFactor =
    view && Math.abs(view.points) >= STRONG_VIEW_POINTS
      ? STRONG_VIEW_FACTOR
      : 1;
  const yearAgo = addDays(today, -365);
  const lawCost = (facts.lawExposures ?? []).some(
    (row) =>
      row.personId === personId &&
      row.relation === "own" &&
      row.direction === "cost" &&
      row.recordedAt > yearAgo &&
      row.recordedAt <= today,
  )
    ? STAKE.lawCost
    : 0;
  const member = groupMembers.has(personId) ? STAKE.groupMember : 0;
  const costExposures = (facts.lawExposures ?? []).filter(
    (row) =>
      row.personId === personId &&
      row.relation === "own" &&
      row.direction === "cost" &&
      row.recordedAt > yearAgo &&
      row.recordedAt <= today,
  );
  const outcomes = facts.outcomes.filter(
    (outcome) =>
      outcome.at > yearAgo &&
      outcome.at <= today &&
      outcome.direction === "cost",
  );
  const oppositionMemberships = facts.organizationParticipations.filter(
    (row) =>
      row.personId === personId &&
      groupMembers.has(personId) &&
      facts.organizations.some(
        (group) =>
          group.id === row.organizationId &&
          group.stableKey.startsWith(`law-interest:${town}:`),
      ),
  );
  const reason =
    costExposures.length > 0
      ? {
          kind: "law-cost" as const,
          sourceRecordIds: costExposures.map((row) => row.id),
        }
      : outcomes.length > 0
        ? {
            kind: "lived-outcome" as const,
            sourceRecordIds: outcomes.map((row) => row.sourceRecordId),
          }
        : view
          ? {
              kind: "official-view" as const,
              sourceRecordIds: [
                ...(view.belief
                  ? [view.belief.id]
                  : view.rows.map((row) => row.id)),
              ],
            }
          : oppositionMemberships.length > 0
            ? {
                kind: "organized-opposition" as const,
                sourceRecordIds: oppositionMemberships.map((row) => row.id),
              }
            : { kind: "general-opinion" as const, sourceRecordIds: [] };
  const base = facts.reactionLens * settled * viewFactor;
  return {
    since,
    reason,
    pull: {
      contacted: base + lawCost + member,
      attended: base + member,
    },
    view,
  };
}

export function passesMeasure(
  stake: CivicStake,
  action: keyof typeof CIVIC_ACTION_EVENTS,
  today: IsoDate,
): boolean {
  const quarters = Math.floor(
    daysBetween(stake.since, today) / DAYS_PER_QUARTER,
  );
  if (quarters < 1) return false;
  const pull = stake.pull[action];
  return (
    Math.floor((quarters * pull) / MEASURE[action]) >
    Math.floor(((quarters - 1) * pull) / MEASURE[action])
  );
}

import { candidacyEligibility } from "../candidacy";
import type { CandidacyBlock } from "../candidacy";
import { makeIsoDate } from "../dates";
import {
  electionContestById,
  electionContestResult,
} from "../election-contests";
import { executiveRulePackForOfficeKey } from "../executive-authority-rule-packs";
import {
  activeElectedExecutiveTermEvidence,
  electedExecutiveTermForRelationship,
  recordedExecutiveQualification,
} from "../executive-work-context";
import {
  planElectedExecutiveOfficeTerm,
  recordElectedExecutiveQualification,
} from "../executive-work-entry";
import { stateJurisdictionForKey } from "../life-places";
import type { EntityId, IsoDate, World } from "../types";
import {
  admittedRuleField,
  resolveNationwideRuleCapability,
  unadmittedRuleFields,
} from "./rule-capability-port";
import type { RuleFieldKey } from "./rule-capability-port";
import { stateExecutiveIdentityForOfficeKey } from "./state-executive-candidacy-packs";
import type { StateExecutiveIdentity } from "./state-executive-candidacy-packs";

/**
 * Ordinary state executive entry after a real contest: result -> dated term ->
 * recorded qualification -> entry on the shared clock, reusing REST37-X's
 * elected executive term chain. No second election engine, no seat on
 * election night, and nothing dated from memory.
 */

const TERM_FIELDS: readonly RuleFieldKey[] = ["term.years", "term.start"];

export type OrdinaryTermDates =
  | {
      readonly kind: "dated";
      readonly startsAt: IsoDate;
      readonly endsAt: IsoDate;
      readonly ruleVersion: string;
    }
  | {
      readonly kind: "unknown";
      readonly unknownFields: readonly RuleFieldKey[];
    };

function wholeYears(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 1
    ? value
    : null;
}

/**
 * When a term won at an election on `electionDate` begins and ends, from the
 * admitted `term.years` and `term.start` of that office only. The first lawful
 * commencement strictly after the election; never the result date.
 */
export function ordinaryStateExecutiveTermDates(
  identity: StateExecutiveIdentity,
  electionDate: IsoDate,
): OrdinaryTermDates {
  const resolution = resolveNationwideRuleCapability({
    scope: { kind: "state", stateUsps: identity.stateUsps },
    officeKey: identity.officeKey,
    action: "enter-office-term",
    onDate: electionDate,
    fields: TERM_FIELDS,
  });
  const unknownFields = unadmittedRuleFields(resolution);
  if (unknownFields.length > 0) return { kind: "unknown", unknownFields };
  const years = admittedRuleField(resolution, "term.years")!;
  const start = admittedRuleField(resolution, "term.start")!;
  const duration = wholeYears(years.value);
  const shape =
    start.value !== null && typeof start.value === "object"
      ? (start.value as {
          kind?: unknown;
          referenceStart?: unknown;
          cycleYears?: unknown;
        })
      : null;
  if (duration === null || shape === null)
    return { kind: "unknown", unknownFields: TERM_FIELDS };
  const electionYear = Number(electionDate.slice(0, 4));
  let startsAt: string | null = null;
  if (shape.kind === "january-first-following-election") {
    startsAt = `${electionYear + 1}-01-01`;
  } else if (shape.kind === "reference-start") {
    const cycle = wholeYears(shape.cycleYears);
    const reference = shape.referenceStart;
    if (
      cycle !== null &&
      typeof reference === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(reference)
    ) {
      const monthDay = reference.slice(4);
      const referenceYear = Number(reference.slice(0, 4));
      let year =
        referenceYear +
        Math.ceil((electionYear - referenceYear) / cycle) * cycle;
      if (`${year}${monthDay}` <= electionDate) year += cycle;
      startsAt = `${year}${monthDay}`;
    }
  }
  if (startsAt === null)
    return { kind: "unknown", unknownFields: ["term.start"] };
  const startYear = Number(startsAt.slice(0, 4));
  return {
    kind: "dated",
    startsAt: makeIsoDate(startsAt),
    endsAt: makeIsoDate(`${startYear + duration}${startsAt.slice(4)}`),
    ruleVersion: `${years.ruleVersion}+${start.ruleVersion}`,
  };
}

/**
 * Called when a state executive contest closes. A recorded winner gets a
 * dated expected term only when the office's term facts are admitted and an
 * accepted executive authority pack exists to govern from; otherwise the
 * result stands and no office work is created. Idempotent.
 */
export function planOrdinaryStateExecutiveTerm(
  world: World,
  contestId: EntityId,
): World {
  const contest = electionContestById(world, contestId);
  const result = electionContestResult(world, contestId);
  const identity = contest
    ? stateExecutiveIdentityForOfficeKey(contest.office.officeKey)
    : null;
  if (!contest || !result || !identity) return world;
  if (!executiveRulePackForOfficeKey(identity.officeKey)) return world;
  const dates = ordinaryStateExecutiveTermDates(identity, contest.electionDate);
  if (dates.kind !== "dated") return world;
  return planElectedExecutiveOfficeTerm(world, {
    contestId,
    startsAt: dates.startsAt,
    endsAt: dates.endsAt,
    termNote: `Ordinary ${identity.displayName} term dated by admitted RULES facts ${dates.ruleVersion}; the election date is the game's authored campaign calendar, not an admitted real election date.`,
  });
}

function executiveSeatFor(world: World, contestId: EntityId) {
  const contest = electionContestById(world, contestId);
  if (!contest) return null;
  return (
    world.history.workRelationships.find(
      (relationship) =>
        relationship.stableKey === `${contest.stableKey}:executive-seat`,
    ) ?? null
  );
}

export type StateExecutiveEntryStatus =
  | { readonly kind: "none" }
  | { readonly kind: "pending-election"; readonly contestId: EntityId }
  | {
      readonly kind: "lost";
      readonly contestId: EntityId;
      readonly winnerPersonId: EntityId;
    }
  | {
      readonly kind: "won-term-unavailable";
      readonly contestId: EntityId;
      readonly reason: string;
      readonly missing: readonly string[];
    }
  | {
      readonly kind: "awaiting-qualification";
      readonly contestId: EntityId;
      readonly startsAt: IsoDate;
      readonly endsAt: IsoDate;
      readonly qualificationBlocks: readonly CandidacyBlock[];
    }
  | {
      readonly kind: "qualified-awaiting-entry";
      readonly contestId: EntityId;
      readonly startsAt: IsoDate;
      readonly endsAt: IsoDate;
    }
  | {
      readonly kind: "in-office";
      readonly contestId: EntityId;
      readonly startsAt: IsoDate;
      readonly endsAt: IsoDate;
    }
  | {
      readonly kind: "term-over-or-not-entered";
      readonly contestId: EntityId;
      readonly startsAt: IsoDate;
      readonly endsAt: IsoDate;
    };

/** Qualification is what RULES admits about the person on that day, not a win. */
function qualificationBlocksFor(
  world: World,
  personId: EntityId,
  identity: StateExecutiveIdentity,
): readonly CandidacyBlock[] {
  const jurisdiction = stateJurisdictionForKey(identity.jurisdictionKey);
  if (!jurisdiction) return [];
  return candidacyEligibility(world, {
    personId,
    jurisdictionId: jurisdiction.id,
    officeKey: identity.officeKey,
    alreadyACandidate: false,
  }).blocks;
}

/** The most recent state executive contest this person stood in, and where it stands. */
export function stateExecutiveEntryStatus(
  world: World,
  personId: EntityId,
): StateExecutiveEntryStatus {
  const contest = [...(world.history.electionContests ?? [])]
    .reverse()
    .find(
      (candidate) =>
        candidate.candidatePersonIds.includes(personId) &&
        stateExecutiveIdentityForOfficeKey(candidate.office.officeKey) !== null,
    );
  if (!contest) return { kind: "none" };
  const identity = stateExecutiveIdentityForOfficeKey(
    contest.office.officeKey,
  )!;
  const result = electionContestResult(world, contest.id);
  if (!result) return { kind: "pending-election", contestId: contest.id };
  if (result.winnerPersonId !== personId)
    return {
      kind: "lost",
      contestId: contest.id,
      winnerPersonId: result.winnerPersonId,
    };
  const seat = executiveSeatFor(world, contest.id);
  const term = seat && electedExecutiveTermForRelationship(world, seat.id);
  if (!seat || !term) {
    if (!executiveRulePackForOfficeKey(identity.officeKey))
      return {
        kind: "won-term-unavailable",
        contestId: contest.id,
        reason: `No accepted executive authority pack governs the ${identity.displayName}, so the office has no work to enter.`,
        missing: [`executive-authority-pack:${identity.jurisdictionKey}`],
      };
    const dates = ordinaryStateExecutiveTermDates(
      identity,
      contest.electionDate,
    );
    return {
      kind: "won-term-unavailable",
      contestId: contest.id,
      reason: `The result stands, but when a term of the ${identity.displayName} begins is not established in this game yet.`,
      missing: dates.kind === "unknown" ? dates.unknownFields : ["term.start"],
    };
  }
  const dated = {
    contestId: contest.id,
    startsAt: term.startsAt,
    endsAt: term.endsAt,
  };
  if (activeElectedExecutiveTermEvidence(world, seat.id))
    return { kind: "in-office", ...dated };
  // Once the start date has passed without entry (no recorded qualification,
  // or the winner could not enter), the term is not taken up late.
  if (world.currentDate >= term.startsAt)
    return { kind: "term-over-or-not-entered", ...dated };
  if (!recordedExecutiveQualification(world, seat.id))
    return {
      kind: "awaiting-qualification",
      ...dated,
      qualificationBlocks: qualificationBlocksFor(world, personId, identity),
    };
  return { kind: "qualified-awaiting-entry", ...dated };
}

/**
 * The winner qualifies for the dated term: the same RULES eligibility read at
 * filing is re-read on the day, and any block refuses without changing the
 * World. A recorded result alone never qualifies anyone.
 */
export function qualifyForStateExecutiveTerm(
  world: World,
  personId: EntityId,
): World {
  const status = stateExecutiveEntryStatus(world, personId);
  if (status.kind === "qualified-awaiting-entry") return world;
  if (status.kind !== "awaiting-qualification")
    throw new Error("There is no planned state executive term to qualify for.");
  if (status.qualificationBlocks.length > 0)
    throw new Error(status.qualificationBlocks[0]!.reason);
  if (world.currentDate >= status.startsAt)
    throw new Error(
      "The term has already begun without a recorded qualification.",
    );
  return recordElectedExecutiveQualification(world, {
    contestId: status.contestId,
    personId,
    qualificationNote:
      "The winner qualified for the dated term: every candidate qualification the game has admitted for this office was met on this day. Unadmitted legal requirements remain unverified, not waived.",
  });
}

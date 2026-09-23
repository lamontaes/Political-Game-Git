import { addDays } from "./dates";
import { scheduleFutureDueItem } from "./future-transitions";
import { stableHash } from "./ids";
import {
  introduceMeasure,
  measurePosition,
  placeMeasureOnCalendar,
} from "./legislation";
import {
  municipalGovernmentByKey,
  municipalRulePackFor,
} from "./municipal-government";
import { recordCouncilReadingVote } from "./municipal-ordinance-procedure";
import {
  municipalGovernmentJurisdictionId,
  municipalMeasureKey,
  municipalMeasures,
  municipalSeats,
} from "./municipal-public-work";
import {
  DC_GOVERNMENT_KEY,
  dcCouncilSeated,
} from "./nationwide-world/district-of-columbia-council-opening";
import { SeededRng } from "./rng";
import type {
  EntityId,
  FutureTransitionHandlerResult,
  LegislativeVoteDisposition,
  PolicyPropositionDefinition,
  World,
} from "./types";

/**
 * The Council of the District of Columbia sitting on its own: members other
 * than the player introduce acts, and each act is read and voted on as the
 * Home Rule Act requires (two readings, 13 days intervening, a majority of
 * those present and voting). Everything after passage (the Mayor, an
 * override, congressional review) is the shared procedure's.
 *
 * PLACEHOLDERS, pending `dc-council-legislative-volume` and
 * `dc-council-rules-of-organization-and-procedure`:
 * - The Council sits every 14 days and one member introduces one act at
 *   each sitting. Neither is the Council's schedule or volume.
 * - A member's ballot is a game-authored stand-in drawn from a stable hash of
 *   the world, the act and the member, so it is the same at both readings.
 *   It is disclosed on the vote, as the player's town-council route does.
 * - An act answers one question from the world's policy catalog that is
 *   decided at the state or municipal level; what the act does beyond being
 *   recorded is not modeled.
 */

export const DC_COUNCIL_SITTING = "civic:dc-council-sitting" as const;
export const DC_COUNCIL_SITTINGS_VERSION = "dc-council-sittings/v1" as const;

export const DC_COUNCIL_SITTING_PROFILE = {
  id: "ocd-dc-council-sitting-placeholder/v1",
  daysBetweenSittings: 14,
  introductionsPerSitting: 1,
} as const;

export const DC_COUNCIL_AUTHORED_BALLOT_NOTE = `${DC_COUNCIL_SITTING_PROFILE.id}: each member's ballot is a game-authored stand-in, not any real Council member's position; how a member decides is not modeled yet.`;

/** A seated member's authored ballot on one act, the same at every reading. */
export function dcCouncilAuthoredBallot(
  world: World,
  measureStableKey: string,
  personId: EntityId,
): "yea" | "nay" {
  const digest = stableHash(
    `${world.id}:${measureStableKey}:authored-ballot:${personId}`,
  );
  return Number.parseInt(digest.slice(-1), 16) % 2 === 0 ? "yea" : "nay";
}

function councilMembers(world: World) {
  return municipalSeats(world, DC_GOVERNMENT_KEY).filter(
    (seat) => seat.role === "member" || seat.role === "presiding-member",
  );
}

/** Schedule the Council's next sitting, once. */
export function scheduleDcCouncilSitting(
  world: World,
  after = world.currentDate,
) {
  const jurisdictionId = municipalGovernmentJurisdictionId(
    world,
    DC_GOVERNMENT_KEY,
  );
  if (!jurisdictionId || !world.jurisdictions[jurisdictionId]) return world;
  const dueAt = addDays(after, DC_COUNCIL_SITTING_PROFILE.daysBetweenSittings);
  const stableKey = `${DC_COUNCIL_SITTINGS_VERSION}:sitting:${dueAt}`;
  if (world.history.futureDueItems.some((item) => item.stableKey === stableKey))
    return world;
  return scheduleFutureDueItem(world, {
    stableKey,
    dueAt,
    transitionKey: DC_COUNCIL_SITTING,
    entityIds: [jurisdictionId],
    jurisdictionId,
    provenance: {
      kind: "authored",
      note: `${DC_COUNCIL_SITTING_PROFILE.id}: a sitting every ${DC_COUNCIL_SITTING_PROFILE.daysBetweenSittings} days, pending dc-council-legislative-volume.`,
    },
  });
}

/** Questions the District decides, as a state and as a city. */
function districtQuestions(
  world: World,
): readonly PolicyPropositionDefinition[] {
  const catalog = world.policyCatalog;
  return catalog.propositionOrder
    .map((id) => catalog.propositions[id])
    .filter(
      (proposition): proposition is PolicyPropositionDefinition =>
        proposition !== undefined &&
        (catalog.issues[proposition.issueId]?.levels ?? []).some(
          (level) => level === "state" || level === "municipality",
        ),
    );
}

/** The game's own label for the next act this year: "Act 26-4". */
export function nextDcCouncilDesignation(world: World): string {
  const year = world.currentDate.slice(2, 4);
  const taken = new Set(
    municipalMeasures(world, DC_GOVERNMENT_KEY).map(
      (measure) => measure.designation,
    ),
  );
  let number = 1;
  while (taken.has(`Act ${year}-${number}`)) number += 1;
  return `Act ${year}-${number}`;
}

function introduceOne(world: World, index: number): World {
  const government = municipalGovernmentByKey(DC_GOVERNMENT_KEY);
  if (!government) return world;
  const rules = municipalRulePackFor(government);
  if (!rules.ok) return world;
  const jurisdictionId = municipalGovernmentJurisdictionId(
    world,
    DC_GOVERNMENT_KEY,
  );
  if (!jurisdictionId) return world;
  const player =
    world.control.kind === "person" ? world.control.personId : null;
  const sponsors = councilMembers(world).filter(
    (seat) => seat.personId !== player,
  );
  const questions = districtQuestions(world);
  if (sponsors.length === 0 || questions.length === 0) return world;
  const rng = new SeededRng(world.seed).fork(
    `${DC_COUNCIL_SITTINGS_VERSION}:${world.currentDate}:${index}`,
  );
  const sponsor = sponsors[rng.integer(0, sponsors.length)]!;
  const question = questions[rng.integer(0, questions.length)]!;
  const answer: "yes" | "no" = rng.integer(0, 2) === 0 ? "yes" : "no";
  const designation = nextDcCouncilDesignation(world);
  const year = world.currentDate.slice(0, 4);
  return introduceMeasure(world, {
    stableKey: municipalMeasureKey(DC_GOVERNMENT_KEY, designation),
    jurisdictionId,
    rulePackId: rules.pack.packId,
    designation,
    shortTitle: dcCouncilActTitle(question.name, year),
    summary: `Answers "${question.question}" with ${answer === "yes" ? "yes" : "no"}.`,
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "council",
    sponsorPersonId: sponsor.personId,
    propositionIds: [question.id],
    propositionAnswers: [{ propositionId: question.id, answer }],
  });
}

/** "Consumer data privacy law" becomes "Consumer Data Privacy Act of 2026". */
export function dcCouncilActTitle(questionName: string, year: string): string {
  const words = questionName
    .replace(/\s+(law|act)$/i, "")
    .split(/\s+/)
    .map((word, index) =>
      index > 0 &&
      /^(a|an|and|as|at|by|for|in|of|on|or|the|to|with)$/i.test(word)
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    );
  return `${words.join(" ")} Act of ${year}`;
}

/** Every act a non-player sponsor carries takes its next lawful step. */
function moveActs(world: World): World {
  const player =
    world.control.kind === "person" ? world.control.personId : null;
  let next = world;
  for (const measure of municipalMeasures(world, DC_GOVERNMENT_KEY)) {
    if (player && measure.sponsorPersonId === player) continue;
    const phase = measurePosition(next, measure.id).phase;
    if (phase === "awaiting-referral") {
      next = placeMeasureOnCalendar(next, {
        stableKey: `${measure.stableKey}:agenda`,
        measureId: measure.id,
        rationale:
          "Placed before the Council for its first reading (no committee stage is modeled; placeholder).",
      });
      continue;
    }
    if (phase !== "on-floor") continue;
    const members = councilMembers(next);
    const dispositions: LegislativeVoteDisposition[] = members.map(
      (seat, index) => ({
        memberKey: `council:${index + 1}`,
        personId: seat.personId,
        disposition:
          seat.personId === player
            ? "absent"
            : dcCouncilAuthoredBallot(next, measure.stableKey, seat.personId),
      }),
    );
    const result = recordCouncilReadingVote(next, {
      governmentKey: DC_GOVERNMENT_KEY,
      measureId: measure.id,
      dispositions,
      provenance: {
        method: "authored-fixture",
        note: DC_COUNCIL_AUTHORED_BALLOT_NOTE,
        sourceEntityIds: [measure.id],
      },
    });
    // A reading that may not be taken yet waits for a later sitting.
    if (result.ok) next = result.world;
  }
  return next;
}

export function dcCouncilSittingHandler(
  world: World,
): FutureTransitionHandlerResult {
  if (!dcCouncilSeated(world)) {
    return {
      world,
      status: "resolved",
      reasonKey: null,
      context: "The Council is not seated.",
      outcomeEventId: null,
    };
  }
  let next = moveActs(world);
  for (
    let index = 0;
    index < DC_COUNCIL_SITTING_PROFILE.introductionsPerSitting;
    index += 1
  )
    next = introduceOne(next, index);
  next = scheduleDcCouncilSitting(next);
  return {
    world: next,
    status: "resolved",
    reasonKey: null,
    context: "The Council sat.",
    outcomeEventId: null,
  };
}

export const DC_COUNCIL_SITTING_HANDLERS = [
  [DC_COUNCIL_SITTING, dcCouncilSittingHandler],
] as const;

import { addDays } from "./dates";
import { scheduleFutureDueItem } from "./future-transitions";
import { decideChamberVote } from "./governing/chamber-votes";
import { lawInForce } from "./governing/law-in-force";
import {
  ensureOfficeholderPrinciples,
  principledLeaning,
} from "./governing/officeholder-principles";
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
 * - The sponsor is the member whose own principles press hardest on a
 *   question the District's law does not already settle their way, as a state
 *   member's agenda bill is (governing/member-agenda.ts). A sitting where no
 *   member leans hard enough on anything open files nothing. FILING_THRESHOLD
 *   is member-agenda's placeholder, repeated here.
 * - Each member decides their ballot through the shared chamber-vote route
 *   (governing/chamber-votes.ts): their principles, their own bill, and the
 *   sponsor's party. No ballot is drawn by chance.
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

/** PLACEHOLDER: the least summed weight that moves a member to file an act. */
const FILING_THRESHOLD = 3;

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
  const members = councilMembers(world);
  const sponsors = members.filter((seat) => seat.personId !== player);
  const questions = districtQuestions(world);
  if (sponsors.length === 0 || questions.length === 0) return world;
  // Every member who will vote on the act holds principles.
  const next = ensureOfficeholderPrinciples(
    world,
    members.map((seat) => seat.personId),
  );
  const rng = new SeededRng(next.seed).fork(
    `${DC_COUNCIL_SITTINGS_VERSION}:${next.currentDate}:${index}`,
  );
  // Who speaks first at a sitting is not modeled; a seeded order stands in.
  const order = [...sponsors];
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = rng.fork(`order:${i}`).integer(0, i + 1);
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  const pending = new Set(
    municipalMeasures(next, DC_GOVERNMENT_KEY)
      .filter((measure) => !measurePosition(next, measure.id).terminal)
      .flatMap((measure) =>
        (measure.propositionAnswers ?? []).map((row) => row.propositionId),
      ),
  );
  const lawAnswers = new Map<EntityId, "yes" | "no" | null>();
  let choice: {
    readonly sponsorPersonId: EntityId;
    readonly question: PolicyPropositionDefinition;
    readonly answer: "yes" | "no";
  } | null = null;
  for (const seat of order) {
    let best: {
      question: PolicyPropositionDefinition;
      answer: "yes" | "no";
      weight: number;
    } | null = null;
    for (const question of questions) {
      if (pending.has(question.id)) continue;
      const leaning = principledLeaning(next, seat.personId, question.id).score;
      if (Math.abs(leaning) < FILING_THRESHOLD) continue;
      if (!lawAnswers.has(question.id))
        lawAnswers.set(
          question.id,
          lawInForce(next, jurisdictionId, question.id)?.answer ?? null,
        );
      const lawAnswer = lawAnswers.get(question.id);
      // Support files an act unless the law already says yes; opposition
      // files only a repeal of a law that says yes.
      const answer: "yes" | "no" | null =
        leaning > 0
          ? lawAnswer === "yes"
            ? null
            : "yes"
          : lawAnswer === "yes"
            ? "no"
            : null;
      if (!answer) continue;
      if (!best || Math.abs(leaning) > best.weight)
        best = { question, answer, weight: Math.abs(leaning) };
    }
    if (best) {
      choice = {
        sponsorPersonId: seat.personId,
        question: best.question,
        answer: best.answer,
      };
      break;
    }
  }
  if (!choice) return next;
  const { question, answer } = choice;
  const designation = nextDcCouncilDesignation(next);
  const year = next.currentDate.slice(0, 4);
  return introduceMeasure(next, {
    stableKey: municipalMeasureKey(DC_GOVERNMENT_KEY, designation),
    jurisdictionId,
    rulePackId: rules.pack.packId,
    designation,
    shortTitle: dcCouncilActTitle(question.name, year),
    summary: `Answers "${question.question}" with ${answer === "yes" ? "yes" : "no"}.`,
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "council",
    sponsorPersonId: choice.sponsorPersonId,
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
    const members = councilMembers(next).map((seat, index) => ({
      memberKey: `council:${index + 1}`,
      name: seat.seatLabel ?? `Seat ${index + 1}`,
      personId: seat.personId,
      caucusLabel: "",
    }));
    const stageKey = measurePosition(next, measure.id).floorStageKey;
    const dispositions = decideChamberVote(next, {
      stableKey: `${measure.stableKey}:${stageKey ?? "passage"}:ballots`,
      question: {
        question: {
          measureId: measure.id,
          purpose: "floor-stage",
          forumKey: "council",
          floorStageKey: stageKey ?? null,
          amendmentStableKey: null,
          provisionKey: null,
        },
        questionLabel: measure.shortTitle,
      },
      members,
      // The player is never voted for: a councilmember who has not cast
      // their own ballot is recorded absent.
      playerPersonId: player,
    });
    const result = recordCouncilReadingVote(next, {
      governmentKey: DC_GOVERNMENT_KEY,
      measureId: measure.id,
      dispositions,
      provenance: {
        method: "member-decisions",
        note: `${DC_COUNCIL_SITTINGS_VERSION}: each member decided their own ballot from their principles, their own bill and the sponsor's party.`,
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

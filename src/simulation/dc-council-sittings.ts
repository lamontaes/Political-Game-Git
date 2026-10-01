import { addDays } from "./dates";
import { fileMemberAgendaBills } from "./governing/member-agenda";
import { scheduleFutureDueItem } from "./future-transitions";
import { mayAnswerQuestion } from "./governing/question-authority";
import {
  COUNCIL_VOTE_NOTE,
  decideCouncilVote,
  ensureCouncilPrinciples,
} from "./governing/council-lawmaking";
import { measurePosition, placeMeasureOnCalendar } from "./legislation";
import {
  municipalGovernmentByKey,
  municipalRulePackFor,
} from "./municipal-government";
import {
  municipalExecutiveHolder,
  recordCouncilReadingVote,
} from "./municipal-ordinance-procedure";
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
 * Members file and vote for their own reasons, as a town council's do
 * (`council-lawmaking.ts`): a member files on the question their principles
 * press hardest where the District's law does not already say what they
 * want, and every member votes through the legislatures' vote engine with
 * the District's voters as their constituents. An act answers one question
 * the District's own law may answer.
 *
 * PLACEHOLDER, pending `dc-council-legislative-volume` and
 * `dc-council-rules-of-organization-and-procedure`: the Council sits every
 * 14 days, which is not its schedule.
 */

export const DC_COUNCIL_SITTING = "civic:dc-council-sitting" as const;
export const DC_COUNCIL_SITTINGS_VERSION = "dc-council-sittings/v1" as const;

export const DC_COUNCIL_SITTING_PROFILE = {
  id: "ocd-dc-council-sitting-placeholder/v1",
  daysBetweenSittings: 14,
} as const;

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

/**
 * Questions the District decides, as a state and as a city: those its own law
 * may answer (`question-authority.ts`).
 */
function districtQuestions(
  world: World,
  jurisdictionId: EntityId,
): readonly PolicyPropositionDefinition[] {
  const catalog = world.policyCatalog;
  return catalog.propositionOrder
    .map((id) => catalog.propositions[id])
    .filter(
      (proposition): proposition is PolicyPropositionDefinition =>
        proposition !== undefined &&
        mayAnswerQuestion(world, jurisdictionId, proposition.id),
    );
}

/** Members other than the player file what their principles press them to. */
function fileActs(world: World): World {
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
  return fileMemberAgendaBills(world, {
    jurisdictionId,
    intakeKey: `${DC_COUNCIL_SITTINGS_VERSION}:${world.currentDate}:filings`,
    chamberKey: "council",
    council: {
      pack: rules.pack,
      members,
      questions: districtQuestions(world, jurisdictionId).map(
        (question) => question.id,
      ),
      measures: municipalMeasures(world, DC_GOVERNMENT_KEY),
      playerPersonId: player,
      measureKey: (numbering) =>
        municipalMeasureKey(DC_GOVERNMENT_KEY, numbering.designation),
    },
  });
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
    const mayor = municipalExecutiveHolder(next, DC_GOVERNMENT_KEY);
    next = ensureCouncilPrinciples(next, [
      ...members,
      ...(mayor ? [{ personId: mayor }] : []),
    ]);
    const dispositions = decideCouncilVote(next, {
      stableKey: `${measure.stableKey}:vote:${next.currentDate}`,
      measureId: measure.id,
      jurisdictionId: measure.jurisdictionId,
      members,
      playerPersonId: player,
      questionLabel: `Pass ${measure.designation}`,
      executivePersonId: mayor,
      // The Council is elected in party primaries, and the Home Rule Act
      // limits how many at-large seats one party may hold (D.C. Code
      // § 1-204.01), so its members' parties are cues.
      nonpartisan: false,
    });
    const result = recordCouncilReadingVote(next, {
      governmentKey: DC_GOVERNMENT_KEY,
      measureId: measure.id,
      dispositions,
      provenance: {
        method: "member-decisions",
        note: COUNCIL_VOTE_NOTE,
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
  next = fileActs(next);
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

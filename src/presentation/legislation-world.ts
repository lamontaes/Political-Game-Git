import {
  AUTHORED_MEASURE_NOTICE,
  applyCharacterHistoryPlan,
  authoredScenarioSeatCount,
  characterHistoryContextPersonId,
  createStableId,
  drawCanonicalName,
  introduceMeasure,
  legislativeBlueprint,
  legislativeScenarioKeysForPlace,
  makeIsoDate,
  personName,
  seatBodyForPack,
  SeededRng,
} from "../simulation";
import type {
  EntityId,
  IsoDate,
  LegislativeBlueprint,
  LegislativeProcedureContext,
  MeasureStepKey,
  SeatedBody,
  World,
} from "../simulation";
import { applyLegislativeStep } from "./legislation-session";

/**
 * Legislative work, inside the player's own save.
 *
 * The workspace used to build a second world of its own and keep it in its own
 * corner of local storage. That meant a bill the player moved through the House
 * was not in their save at all: two different lives in the same state shared
 * one bill's history, and loading a game showed a bill that had nothing to do
 * with it.
 *
 * There is one world. A measure is introduced into it, the same rule packs and
 * state machine from the accepted legislative core act on it, and the result is
 * the player's history — saved, reloaded and continued like everything else.
 * Nothing in this module owns storage, and nothing in it can switch
 * jurisdictions: which legislature a character works in is a fact about their
 * job, not a control on a screen.
 */

/** A bill this character is actually working on, in this world. */
export interface LegislativeAssignment {
  readonly scenarioKey: string;
  readonly label: string;
  readonly measureNotice: typeof AUTHORED_MEASURE_NOTICE;
  /** The measure as it exists in the player's world, not in a scenario's. */
  readonly measureId: EntityId;
  readonly sponsorPersonId: EntityId;
  /** Everything a step needs, resolved against this world. */
  readonly procedure: LegislativeProcedureContext;
}

export interface OpenLegislativeWorkInput {
  readonly scenarioKey: string;
  readonly playerPersonId: EntityId;
  readonly jurisdictionId: EntityId;
}

/** The bills written for the legislature this character works in. */
export function legislativeWorkAvailableIn(
  jurisdictionId: EntityId,
): readonly string[] {
  return legislativeScenarioKeysForPlace(jurisdictionId);
}

/**
 * Puts a bill in front of the player, in their own world.
 *
 * Called again for a world that already has the measure, it returns the same
 * assignment rather than filing a second copy — which is what makes save,
 * reload and carry on work: the bill is found where it was left, at whatever
 * stage it had reached.
 */
export function openLegislativeWork(
  world: World,
  input: OpenLegislativeWorkInput,
): { readonly world: World; readonly assignment: LegislativeAssignment } {
  const blueprint = legislativeBlueprint(input.scenarioKey);
  if (blueprint.context.jurisdiction.id !== input.jurisdictionId) {
    throw new Error(
      `The ${blueprint.designation} scenario does not belong to this character's legislature.`,
    );
  }
  if (!world.jurisdictions[input.jurisdictionId]) {
    throw new Error(
      "This world has no record of the jurisdiction the job sits in.",
    );
  }

  const measureStableKey = `legislative-work:${input.scenarioKey}:measure`;
  const existing = (world.history.legislativeMeasures ?? []).find(
    (record) => record.stableKey === measureStableKey,
  );

  // The member the office serves. A staffer does not sponsor bills, so the
  // sponsor is a legislator this world actually contains rather than the
  // player with a title they do not hold.
  const sponsorKey = `legislative-work:${input.scenarioKey}:member`;
  const sponsorPersonId = characterHistoryContextPersonId(world, sponsorKey);

  if (existing) {
    return {
      world,
      assignment: assignmentFor(world, blueprint, existing.id, sponsorPersonId),
    };
  }

  const rng = new SeededRng(world.seed).fork(
    `legislative-member:${input.scenarioKey}`,
  );
  const name = drawCanonicalName(rng);
  let next = applyCharacterHistoryPlan(world, {
    stableKey: sponsorKey,
    mode: "quick-generated",
    personId: input.playerPersonId,
    transitions: [
      {
        kind: "context-person",
        input: {
          stableKey: sponsorKey,
          givenName: name.givenName,
          familyName: name.familyName,
          birthDate: memberBirthDate(world.currentDate),
          homeJurisdictionId: input.jurisdictionId,
        },
      },
    ],
  }).world;

  next = introduceMeasure(next, {
    stableKey: measureStableKey,
    jurisdictionId: input.jurisdictionId,
    rulePackId: blueprint.pack.packId,
    designation: blueprint.designation,
    shortTitle: blueprint.shortTitle,
    summary: blueprint.summary,
    origin: "member-introduction",
    subjectClass: blueprint.subjectClass,
    sponsorPersonId,
  });

  const measureId = createStableId(
    "legislative-measure",
    `${next.id}:${input.jurisdictionId}:${measureStableKey}`,
  );
  return {
    world: next,
    assignment: assignmentFor(next, blueprint, measureId, sponsorPersonId),
  };
}

/**
 * The only way this surface changes the world.
 *
 * A typed command rather than a free hand on the world: the workspace says
 * which step the player took, and everything else — how the seated members
 * vote, what the governor does — stays where the accepted legislative core
 * already puts it.
 */
export type LegislativeCommand = {
  readonly kind: "take-step";
  readonly step: MeasureStepKey;
};

export interface LegislativeCommandResult {
  readonly world: World;
  readonly message: string;
}

export function applyLegislativeCommand(
  world: World,
  assignment: LegislativeAssignment,
  command: LegislativeCommand,
): LegislativeCommandResult {
  if (command.kind !== "take-step") {
    throw new Error("That is not something this surface can do.");
  }
  const result = applyLegislativeStep(
    assignment.procedure,
    world,
    command.step,
  );
  return { world: result.world, message: result.message };
}

function assignmentFor(
  world: World,
  blueprint: LegislativeBlueprint,
  measureId: EntityId,
  sponsorPersonId: EntityId,
): LegislativeAssignment {
  return {
    scenarioKey: blueprint.scenarioKey,
    label: blueprint.label,
    measureNotice: AUTHORED_MEASURE_NOTICE,
    measureId,
    sponsorPersonId,
    procedure: {
      pack: blueprint.pack,
      measureId,
      bodies: seatBodies(world, blueprint, sponsorPersonId),
      committeeMemberCount:
        blueprint.pack.chambers[0]?.committees[0]?.appointedMembers ?? 7,
      votePlan: blueprint.votePlan,
      governorAction: blueprint.governorAction,
      governorRationale: blueprint.governorRationale,
    },
  };
}

/**
 * Seats the chambers against this world.
 *
 * Only the sponsoring member is a canonical person here, because only the
 * sponsor is somebody this world has actually met. The rest of the seats are
 * authored — a vote record needs a body, not a cast — and the vote writer
 * refuses a disposition naming somebody the world does not contain, which is
 * exactly the check that would have caught a scenario's people being voted in
 * a save they were never part of.
 */
function seatBodies(
  world: World,
  blueprint: LegislativeBlueprint,
  sponsorPersonId: EntityId,
): readonly SeatedBody[] {
  const sponsor = world.people[sponsorPersonId];
  const linked = sponsor
    ? [{ personId: sponsor.id, name: personName(sponsor) }]
    : [];
  return blueprint.pack.chambers.map((chamber, index) =>
    seatBodyForPack(
      chamber.chamberKey,
      chamber.name,
      authoredScenarioSeatCount(blueprint.pack, chamber.chamberKey),
      index === 0 ? linked : [],
      blueprint.nonpartisan,
    ),
  );
}

/** An adult old enough to be seated. No other claim is made about them. */
function memberBirthDate(currentDate: IsoDate): IsoDate {
  return makeIsoDate(
    `${Number(currentDate.slice(0, 4)) - 47}${currentDate.slice(4)}`,
  );
}

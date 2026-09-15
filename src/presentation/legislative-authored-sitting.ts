import {
  authoredScenarioSeatCount,
  characterHistoryContextPersonId,
  createStableId,
  currentMeasureProvisions,
  legislativeBlueprint,
  personName,
  recordWorldEvent,
  seatBodyForPack,
} from "../simulation";
import type {
  AuthoredVoteCounts,
  EntityId,
  LegislativeProcedureContext,
  World,
} from "../simulation";
import { draftLineageForMeasure } from "../simulation/legislation-draft-lineage";
import { readFiledTaxContentIdentity } from "../simulation/legislation-tax-identity";
import { resolveActiveMemberSeat } from "./legislative-member-seat";
import { ensureContextPerson } from "./legislative-context-person";

export const ALASKA_RECORDED_SITTING = "alaska-appropriation-recorded-v1";
export const RECORDED_SITTING_NOTICE =
  "Recorded fictional Alaska sitting. Its member ballots, committee membership and executive response are authored game content, not real officials, forecasts or assessments of this proposal.";

/**
 * A second, bill-bound profile for a filed Alaska revenue measure. The owner
 * accepted this authored content so collected tax can fund supported service;
 * it is not an evaluator and it never admits the appropriation sitting's votes
 * for a tax. Counts fill the authored 40/20 rosters, clear a majority of the
 * membership and end in a signature, so no veto-override threshold is claimed.
 */
export const ALASKA_REVENUE_RECORDED_SITTING = "alaska-revenue-recorded-v1";
export const REVENUE_SITTING_NOTICE =
  "Recorded fictional Alaska revenue sitting. Its committee and floor ballots and the Governor's signature are authored game content bound to this exact filed tax text, not real officials, forecasts or assessments of the tax.";
const ALASKA_REVENUE_SITTING_CONTENT: {
  readonly votePlan: Readonly<Record<string, AuthoredVoteCounts>>;
  readonly governorAction: "signed";
  readonly governorRationale: string;
} = {
  votePlan: {
    "committee:house-transportation": { yea: 4, nay: 3 },
    "committee:senate-transportation": { yea: 4, nay: 3 },
    "floor:house:final-passage": { yea: 22, nay: 17, absent: 1 },
    "floor:senate:final-passage": { yea: 11, nay: 9 },
  },
  governorAction: "signed",
  governorRationale:
    "Recorded fictional sitting's executive signature. This authored response does not describe an actual official or assess the player's tax.",
};

type RecordedSittingProfile =
  typeof ALASKA_RECORDED_SITTING | typeof ALASKA_REVENUE_RECORDED_SITTING;

export interface RecordedSittingInput {
  readonly measureId: EntityId;
  readonly playerPersonId: EntityId;
  readonly memberSeatStableKey?: string;
}
export type RecordedPlayerBallot = "yea" | "nay" | "present-not-voting";
export function hasRecordedLegislativeSitting(
  world: World,
  measureId: EntityId,
): boolean {
  return world.history.events.some(
    (event) =>
      event.type === "legislation.recorded-fictional-sitting-admitted" &&
      event.involvedEntityIds.includes(measureId),
  );
}

function supportedMeasure(world: World, input: RecordedSittingInput) {
  if (
    world.control.kind !== "person" ||
    world.control.personId !== input.playerPersonId ||
    !world.people[input.playerPersonId]
  )
    return null;
  const measure = world.history.legislativeMeasures?.find(
    (entry) => entry.id === input.measureId,
  );
  if (!measure) return null;
  const seat = resolveActiveMemberSeat(world, input.playerPersonId, {
    governingJurisdictionId: measure.jurisdictionId,
    legislativeRulePackId: measure.rulePackId,
    ...(input.memberSeatStableKey !== undefined
      ? { relationshipStableKey: input.memberSeatStableKey }
      : {}),
  });
  if (
    !measure ||
    world.control.kind !== "person" ||
    world.control.personId !== input.playerPersonId ||
    seat.kind !== "seated" ||
    seat.seat.governingJurisdictionId !== measure.jurisdictionId ||
    seat.seat.legislativeRulePackId !== measure.rulePackId
  )
    return null;
  const source = legislativeBlueprint("alaska");
  if (source.pack.packId !== measure.rulePackId) return null;
  const lineage = draftLineageForMeasure(world, measure.id);
  let profile: RecordedSittingProfile;
  let content: {
    readonly votePlan: Readonly<Record<string, AuthoredVoteCounts>>;
    readonly governorAction: "signed" | "vetoed" | null;
    readonly governorRationale: string;
  };
  let identityInput: Record<string, unknown>;
  if (
    measure.subjectClass === "appropriation" &&
    lineage?.familyKey === "appropriations"
  ) {
    profile = ALASKA_RECORDED_SITTING;
    content = {
      votePlan: source.votePlan,
      governorAction: source.governorAction,
      governorRationale:
        "Recorded fictional sitting's executive veto. This authored response does not describe an actual official or assess the player's proposal.",
    };
    // Unchanged identity shape: earlier admitted appropriation sittings match.
    identityInput = {
      profile,
      sourceDecisions: source.votePlan,
      sourceExecutiveAction: source.governorAction,
    };
  } else if (measure.subjectClass === "revenue") {
    // The exact pinned tax proposal/terms/text gate; a revenue label alone
    // grants nothing, and amended or tampered text withholds the sitting.
    const tax = readFiledTaxContentIdentity(world, measure.id);
    if (tax.kind !== "available") return null;
    profile = ALASKA_REVENUE_RECORDED_SITTING;
    content = ALASKA_REVENUE_SITTING_CONTENT;
    identityInput = {
      profile,
      sourceDecisions: content.votePlan,
      sourceExecutiveAction: content.governorAction,
      taxContentKey: tax.identity.contentKey,
    };
  } else return null;
  // Bind the content to this member, seat and exact recorded text. Amending
  // text requires another explicit admission; a reload never creates one.
  const identity = createStableId(
    "event",
    JSON.stringify({
      ...identityInput,
      measureId: measure.id,
      personId: input.playerPersonId,
      seatKey: seat.seat.relationshipStableKey,
      chamberKey: seat.seat.chamberKey,
      provisions: currentMeasureProvisions(world, measure.id),
    }),
  );
  return {
    measure,
    seat: seat.seat,
    source,
    profile,
    content,
    stableKey: `measure:${measure.id}:recorded-sitting:${identity}`,
  };
}

export function recordedSittingAvailable(
  world: World,
  input: RecordedSittingInput,
): boolean {
  return supportedMeasure(world, input) !== null;
}

/** What the admission control must disclose before the player chooses. */
export function recordedSittingOffer(
  world: World,
  input: RecordedSittingInput,
): {
  readonly profile: RecordedSittingProfile;
  readonly notice: string;
  readonly ballotScope: string;
} | null {
  const supported = supportedMeasure(world, input);
  if (!supported) return null;
  return supported.profile === ALASKA_REVENUE_RECORDED_SITTING
    ? {
        profile: supported.profile,
        notice: REVENUE_SITTING_NOTICE,
        ballotScope:
          "Your recorded ballot for the supported questions in your chamber",
      }
    : {
        profile: supported.profile,
        notice: RECORDED_SITTING_NOTICE,
        ballotScope:
          "Your recorded ballot for the supported questions in your chamber and the joint override",
      };
}

/** Explicit content admission, not a vote, election, law or implied office. */
export function prepareRecordedLegislativeSitting(
  world: World,
  input: RecordedSittingInput & { readonly playerBallot: RecordedPlayerBallot },
): World {
  const supported = supportedMeasure(world, input);
  if (!supported)
    throw new Error(
      "No recorded fictional sitting supports this member's filed appropriation.",
    );
  if (!["yea", "nay", "present-not-voting"].includes(input.playerBallot))
    throw new Error(
      "Choose the player's recorded ballot; no ballot is inferred.",
    );
  const prior = world.history.events.find(
    (event) => event.stableKey === supported.stableKey,
  );
  if (prior) {
    if (prior.context.immediateReaction !== input.playerBallot)
      throw new Error(
        "This sitting already records a different player ballot.",
      );
    return world;
  }
  let next = world;
  const colleagues = ["advocate", "guardian", "analyst"].map((role) => {
    const stableKey = `legislative-work:alaska:${role}`;
    next = ensureContextPerson(next, {
      stableKey,
      playerPersonId: input.playerPersonId,
      jurisdictionId: supported.measure.jurisdictionId,
    });
    return characterHistoryContextPersonId(next, stableKey);
  });
  const revenue = supported.profile === ALASKA_REVENUE_RECORDED_SITTING;
  return recordWorldEvent(next, {
    stableKey: supported.stableKey,
    type: "legislation.recorded-fictional-sitting-admitted",
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: supported.measure.jurisdictionId,
    involvedEntityIds: [input.measureId, input.playerPersonId, ...colleagues],
    participants: colleagues.map((personId, index) => ({
      personId,
      role:
        index === 2
          ? "other:fictional-analyst"
          : "other:fictional-legislative-colleague",
      detail:
        "Existing stable fictional Alaska context person; recorded sitting content only.",
    })),
    personFactConstraints: [],
    visibility: "public",
    tags: ["legislation", "legislation.authored-sitting", supported.profile],
    summary: revenue ? REVENUE_SITTING_NOTICE : RECORDED_SITTING_NOTICE,
    context: {
      location: {
        jurisdictionId: supported.measure.jurisdictionId,
        label: "Recorded fictional Alaska legislative sitting",
        setting: null,
      },
      socialContext: revenue
        ? "Authored fictional Alaska revenue decisions recorded for this exact filed tax text."
        : "Existing Alaska Village Transit Support authored decisions, reused explicitly for this filed appropriation.",
      choice: supported.profile,
      pressure: null,
      motivation: null,
      immediateReaction: input.playerBallot,
    },
  });
}

/** Pure read: admission plus exact member/text evidence must already exist. */
export function readRecordedLegislativeSitting(
  world: World,
  input: RecordedSittingInput,
): LegislativeProcedureContext | null {
  const supported = supportedMeasure(world, input);
  if (!supported) return null;
  const event = world.history.events.find(
    (entry) =>
      entry.stableKey === supported.stableKey &&
      entry.type === "legislation.recorded-fictional-sitting-admitted" &&
      entry.context.choice === supported.profile,
  );
  if (!event) return null;
  const expectedColleagues = ["advocate", "guardian", "analyst"].map((role) =>
    characterHistoryContextPersonId(world, `legislative-work:alaska:${role}`),
  );
  if (
    !event.involvedEntityIds.includes(input.measureId) ||
    !event.involvedEntityIds.includes(input.playerPersonId) ||
    event.participants.length !== expectedColleagues.length ||
    event.participants.some(
      (participant) => !expectedColleagues.includes(participant.personId),
    )
  )
    return null;
  const ballot = event.context.immediateReaction;
  if (ballot !== "yea" && ballot !== "nay" && ballot !== "present-not-voting")
    return null;
  const colleagues = expectedColleagues.map(
    (personId) => world.people[personId],
  );
  if (colleagues.some((person) => !person)) return null;
  const bodies = supported.source.pack.chambers.map((chamber) =>
    seatBodyForPack(
      chamber.chamberKey,
      chamber.name,
      authoredScenarioSeatCount(supported.source.pack, chamber.chamberKey),
      chamber.chamberKey === supported.seat.chamberKey
        ? [world.people[input.playerPersonId]!, ...colleagues.slice(0, 2)].map(
            (person) => ({ personId: person!.id, name: personName(person!) }),
          )
        : [],
      false,
    ),
  );
  return {
    pack: supported.source.pack,
    measureId: input.measureId,
    bodies,
    committeeMemberCount: null,
    // These are the recorded content's ballots, not a generated default,
    // political score or prediction. No decision evaluator runs.
    votePlan: supported.content.votePlan,
    governorAction: supported.content.governorAction,
    governorRationale: supported.content.governorRationale,
    recordedSittingEventId: event.id,
    recordedPlayerPersonId: input.playerPersonId,
    recordedPlayerBallot: ballot,
  };
}

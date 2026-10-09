import { researchRuleTable } from "../simulation/research-rule-tables";
const sittingContent = researchRuleTable("recordedSittings");
import {
  authoredScenarioSeatCount,
  characterHistoryContextPersonId,
  createStableId,
  currentMeasureProvisions,
  legislativeBlueprint,
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
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
import { canonicalJson } from "../simulation/canonical-json";
import {
  stateFundedServiceGameProfileForJurisdictionKey,
  type StateFundedServiceGameProfile,
} from "../simulation/state-funded-service-game-profiles";

export const ALASKA_RECORDED_SITTING = sittingContent.ALASKA_RECORDED_SITTING;
export const RECORDED_SITTING_NOTICE = sittingContent.RECORDED_SITTING_NOTICE;

/**
 * A second, bill-bound profile for a filed Alaska revenue measure. The owner
 * accepted this authored content so collected tax can fund supported service;
 * it is not an evaluator and it never admits the appropriation sitting's votes
 * for a tax. Counts fill the authored 40/20 rosters, clear a majority of the
 * membership and end in a signature, so no veto-override threshold is claimed.
 */
export const ALASKA_REVENUE_RECORDED_SITTING =
  sittingContent.ALASKA_REVENUE_RECORDED_SITTING;
export const REVENUE_SITTING_NOTICE = sittingContent.REVENUE_SITTING_NOTICE;
export const ALASKA_REVENUE_SITTING_CONTENT =
  sittingContent.ALASKA_REVENUE_SITTING_CONTENT;

interface AuthoredProfilePanel {
  readonly chamberKey: string;
  readonly panelSize: number;
  readonly sizeBasis: "compiled-formal-seat-count" | "game-profile-stand-in";
  readonly note: string;
}

function authoredPanelForChamber(
  profile: StateFundedServiceGameProfile,
  chamberKey: string,
): AuthoredProfilePanel | null {
  const panel = profile.panelSeatsByChamber[chamberKey];
  return panel
    ? {
        chamberKey,
        panelSize: panel.seats,
        sizeBasis: panel.basis,
        note: panel.note,
      }
    : null;
}

function authoredPanelsFor(
  profile: StateFundedServiceGameProfile,
): readonly AuthoredProfilePanel[] {
  return Object.keys(profile.panelSeatsByChamber).flatMap((chamberKey) => {
    const panel = authoredPanelForChamber(profile, chamberKey);
    return panel ? [panel] : [];
  });
}

function stateProfileSittingContent(
  source: ReturnType<typeof legislativeBlueprint>,
  profile: StateFundedServiceGameProfile,
): {
  readonly votePlan: Readonly<Record<string, AuthoredVoteCounts>>;
  readonly governorAction: "signed";
  readonly governorRationale: string;
  readonly notice: string;
} {
  const votePlan: Record<string, AuthoredVoteCounts> = {};
  for (const chamber of source.pack.chambers) {
    const panel = authoredPanelForChamber(profile, chamber.chamberKey);
    if (!panel || !Number.isSafeInteger(panel.panelSize) || panel.panelSize < 1)
      throw new Error(
        `${profile.profileId} has no valid authored panel for ${chamber.chamberKey}.`,
      );
    for (const committee of chamber.committees) {
      votePlan[votePlanKeyForCommittee(committee.committeeKey)] = {
        yea: committee.appointedMembers,
      };
    }
    for (const stage of chamber.floorStages) {
      votePlan[votePlanKeyForFloor(chamber.chamberKey, stage.stageKey)] = {
        yea: panel.panelSize,
      };
    }
  }
  const state = source.context.jurisdiction.name;
  const authoredPanels = authoredPanelsFor(profile);
  const panelCounts = authoredPanels
    .map((panel) => {
      const chamberName =
        source.pack.chambers.find(
          (chamber) => chamber.chamberKey === panel.chamberKey,
        )?.name ?? panel.chamberKey;
      return `a ${panel.panelSize}-member ${chamberName} panel`;
    })
    .join(" and ");
  const panelDisclosure = authoredPanels.every(
    (panel) => panel.sizeBasis === "compiled-formal-seat-count",
  )
    ? `${panelCounts} use compiled formal seat counts; the votes remain authored.`
    : null;
  return {
    votePlan,
    governorAction: "signed",
    governorRationale: `Fictional ${state} game-profile signature. This authored outcome does not describe an actual official or forecast.`,
    notice: `In ${state}${panelDisclosure ? ` (${panelDisclosure})` : ""}, committee and floor votes and the governor’s signature are authored game outcomes, not forecasts or actual official actions; your ballot is separate, and the profile’s tax, appropriation, and service assumptions are fictional, not current state law or source evidence.`,
  };
}

type RecordedSittingProfile = string;

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
  const authoredSource = legislativeBlueprint(sittingContent.scenarioKey);
  const authoredRoute = authoredSource.pack.packId === measure.rulePackId;
  const source = authoredRoute
    ? authoredSource
    : legislativeBlueprint(`institution:${measure.rulePackId}`);
  if (source.pack.packId !== measure.rulePackId) return null;
  const gameProfile = authoredRoute
    ? null
    : stateFundedServiceGameProfileForJurisdictionKey(
        source.pack.jurisdictionKey,
      );
  if (!authoredRoute && !gameProfile) return null;
  const lineage = draftLineageForMeasure(world, measure.id);
  let profile: RecordedSittingProfile;
  let content: {
    readonly votePlan: Readonly<Record<string, AuthoredVoteCounts>>;
    readonly governorAction: "signed" | "vetoed" | null;
    readonly governorRationale: string;
    readonly notice?: string;
  };
  let identityInput: Record<string, unknown>;
  if (
    measure.subjectClass === "appropriation" &&
    lineage?.familyKey === "appropriations"
  ) {
    if (authoredRoute) {
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
    } else {
      if (
        !gameProfile ||
        lineage.variantKey !== gameProfile.appropriation.variantKey ||
        lineage.authorityKey !== gameProfile.appropriation.authorityKey ||
        currentMeasureProvisions(world, measure.id).find(
          (provision) => provision.provisionKey === "amount-provided",
        )?.fiscalExposureMinorUnits !==
          gameProfile.appropriation.amountMinorUnits
      )
        return null;
      profile = `${gameProfile.profileId}:appropriation:${gameProfile.ref.digest}`;
      content = stateProfileSittingContent(source, gameProfile);
      identityInput = {
        profile,
        profileRef: gameProfile.ref,
        sourceDecisions: content.votePlan,
        sourceExecutiveAction: content.governorAction,
      };
    }
  } else if (measure.subjectClass === "revenue") {
    // The exact pinned tax proposal/terms/text gate; a revenue label alone
    // grants nothing, and amended or tampered text withholds the sitting.
    const tax = readFiledTaxContentIdentity(world, measure.id);
    if (tax.kind !== "available") return null;
    if (authoredRoute) {
      profile = ALASKA_REVENUE_RECORDED_SITTING;
      content = { ...ALASKA_REVENUE_SITTING_CONTENT, governorAction: "signed" };
      identityInput = {
        profile,
        sourceDecisions: content.votePlan,
        sourceExecutiveAction: content.governorAction,
        taxContentKey: tax.identity.contentKey,
      };
    } else {
      const proposal = world.history.taxProposals?.find(
        (row) => row.measureId === measure.id,
      );
      if (
        !gameProfile ||
        !proposal ||
        proposal.power !== null ||
        canonicalJson(proposal.gameProfileRef ?? null) !==
          canonicalJson(gameProfile.ref)
      )
        return null;
      profile = `${gameProfile.profileId}:revenue:${gameProfile.ref.digest}`;
      content = stateProfileSittingContent(source, gameProfile);
      identityInput = {
        profile,
        profileRef: gameProfile.ref,
        sourceDecisions: content.votePlan,
        sourceExecutiveAction: content.governorAction,
        taxContentKey: tax.identity.contentKey,
      };
    }
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
    gameProfile,
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
  if (supported.gameProfile) {
    return {
      profile: supported.profile,
      notice: supported.content.notice ?? supported.gameProfile.note,
      ballotScope:
        "Your recorded ballot for the supported questions in your chamber",
    };
  }
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
      "No recorded fictional sitting supports this member's filed measure.",
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
  const contextNamespace = supported.gameProfile
    ? `legislative-work:${supported.gameProfile.profileId}`
    : sittingContent.workKey;
  const colleagues = ["advocate", "guardian", "analyst"].map((role) => {
    const stableKey = `${contextNamespace}:${role}`;
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
      detail: supported.gameProfile
        ? "Stable fictional context person for this state's recorded game-profile sitting only."
        : "Existing stable fictional Alaska context person; recorded sitting content only.",
    })),
    personFactConstraints: [],
    visibility: "public",
    tags: ["legislation", "legislation.authored-sitting", supported.profile],
    summary:
      supported.content.notice ??
      (revenue ? REVENUE_SITTING_NOTICE : RECORDED_SITTING_NOTICE),
    context: {
      location: {
        jurisdictionId: supported.measure.jurisdictionId,
        label: `Recorded fictional ${supported.source.context.jurisdiction.name} legislative sitting`,
        setting: null,
      },
      socialContext: supported.gameProfile
        ? `Authored ${supported.source.context.jurisdiction.name} game-profile decisions recorded for this exact filed measure.`
        : revenue
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
  const contextNamespace = supported.gameProfile
    ? `legislative-work:${supported.gameProfile.profileId}`
    : sittingContent.workKey;
  const expectedColleagues = ["advocate", "guardian", "analyst"].map((role) =>
    characterHistoryContextPersonId(world, `${contextNamespace}:${role}`),
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
  const bodies = supported.source.pack.chambers.map((chamber) => {
    const profilePanel = supported.gameProfile
      ? authoredPanelForChamber(supported.gameProfile, chamber.chamberKey)
      : null;
    const panelSize = supported.gameProfile
      ? profilePanel?.panelSize
      : authoredScenarioSeatCount(supported.source.pack, chamber.chamberKey);
    if (!panelSize)
      throw new Error(
        `No authored panel size supports ${chamber.chamberKey} in ${supported.profile}.`,
      );
    return seatBodyForPack(
      chamber.chamberKey,
      chamber.name,
      panelSize,
      chamber.chamberKey === supported.seat.chamberKey
        ? [world.people[input.playerPersonId]!, ...colleagues.slice(0, 2)].map(
            (person) => ({ personId: person!.id, name: personName(person!) }),
          )
        : [],
      false,
    );
  });
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

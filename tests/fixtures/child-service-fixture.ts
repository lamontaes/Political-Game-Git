import { smallWorld } from "./small-world";
import { enactThroughDesk } from "./enact-through-desk";
import { drawRandomPlace } from "../support/random-place";
import { makeIsoDate } from "../../src/simulation/dates";
import {
  createHousehold,
  createOrganization,
  recordHouseholdLocation,
  startHouseholdMembership,
} from "../../src/simulation/life";
import { recordFamilyAddition } from "../../src/simulation/people-family";
import { legislativePackForJurisdiction } from "../../src/simulation/legislative-institutions";
import { introduceMeasure } from "../../src/simulation/legislation";
import {
  seatBodyForPack,
  type LegislativeProcedureContext,
} from "../../src/simulation/legislation-scenarios";
import { governorOfficeForJurisdiction } from "../../src/simulation/governing/state-governing";
import {
  commitPublicProgram,
  recordProgramAppropriation,
} from "../../src/simulation/governing/public-program";
import { createResourcePosition, money } from "../../src/simulation/resources";
import {
  playerRequiredWorkIds,
  releasePlayerRequiredWork,
} from "../../src/simulation/time-work";
import { advanceWorld, recordWorldEvent } from "../../src/simulation/world";
import type { EntityId } from "../../src/simulation/types";

/** Canonical child-service setup shared by the contract and slice play script.
 * Amounts, ballots and households are explicit fixture inputs, not forecasts. */
export function childServiceFixture(
  service: {
    readonly question: string;
    readonly name: string;
    readonly age: number;
  },
  seed: string,
) {
  const QUESTION = service.question;
  const SEED = seed;
  const place = drawRandomPlace(SEED);
  const provenance = {
    kind: "authored" as const,
    note: "Explicit child-service test contract; amounts and ballots are fixture inputs.",
  };
  let providerId: EntityId | undefined;
  let accountId: EntityId | undefined;
  const small = smallWorld({
    place: place.key,
    date: "2026-01-05",
    laws: [QUESTION],
    offices: ["governor"],
    seed: SEED,
  });
  let world = small.world;
  const parentId = small.personId;
  world = createHousehold(world, {
    stableKey: "fixture:family-home",
    formedAt: "2020-01-01",
    label: "The recorded family home",
    provenance,
  });
  const householdId = world.history.households.at(-1)!.id;
  world = recordHouseholdLocation(world, {
    stableKey: "fixture:family-location",
    householdId,
    effectiveAt: "2020-01-01",
    jurisdictionId: small.jurisdictionId,
    label: place.displayName,
    kind: "residence:community-base",
    provenance,
    supersedesLocationId: null,
  });
  world = startHouseholdMembership(world, {
    stableKey: "fixture:parent-home",
    personId: parentId,
    householdId,
    startedAt: "2020-01-01",
    residenceRole: "primary",
    kind: "resident:adult",
    provenance,
  });
  const family = recordFamilyAddition(world, {
    kind: "birth",
    stableKey: "fixture:pre-k-child",
    occurredAt: `${2026 - service.age}-01-05`,
    parentPersonIds: [parentId],
    givenName: "Avery",
  });
  world = family.world;
  const childId = family.childPersonId;
  const pack = legislativePackForJurisdiction(small.stateJurisdictionId)!;
  world = introduceMeasure(world, {
    stableKey: "fixture:child-service-law",
    jurisdictionId: small.stateJurisdictionId,
    rulePackId: pack.packId,
    designation: `Fixture ${service.name} act`,
    shortTitle: `${service.name} operating support`,
    summary: "Explicit test contract.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    sponsorPersonId: parentId,
    propositionIds: [small.propositionIds[QUESTION]!],
    propositionAnswers: [
      { propositionId: small.propositionIds[QUESTION]!, answer: "yes" },
    ],
  });
  const measureId = world.history.legislativeMeasures!.at(-1)!.id;
  const bodies = pack.chambers.map((chamber) => {
    if (chamber.seats.kind !== "known")
      throw new Error("Fixture requires this place's recorded chamber size.");
    return seatBodyForPack(
      chamber.chamberKey,
      chamber.name,
      chamber.seats.value,
      [],
      false,
    );
  });
  const votePlan: LegislativeProcedureContext["votePlan"] = Object.fromEntries(
    pack.chambers.flatMap((chamber) => [
      ...chamber.floorStages.map((stage) => [
        `floor:${chamber.chamberKey}:${stage.stageKey}`,
        {
          yea: bodies.find((body) => body.chamberKey === chamber.chamberKey)!
            .members.length,
          nay: 0,
        },
      ]),
      ...chamber.committees.map((committee) => [
        `committee:${committee.committeeKey}`,
        { yea: committee.appointedMembers ?? 7, nay: 0 },
      ]),
    ]),
  );
  const context: LegislativeProcedureContext = {
    pack,
    measureId,
    bodies,
    committeeMemberCount:
      pack.chambers[0]!.committees[0]?.appointedMembers ?? 7,
    votePlan,
    governorAction: "signed",
    governorRationale: "Authored fixture: sign the pre-K act.",
  };
  world = enactThroughDesk(world, measureId, {
    context,
    effectiveAt: world.currentDate,
  });
  const governorId = governorOfficeForJurisdiction(
    world,
    pack.jurisdictionKey,
  )!.holderPersonId!;
  world = { ...world, control: { kind: "person", personId: governorId } };
  world = recordWorldEvent(world, {
    stableKey: "fixture:governor-handoff",
    type: "fixture.control-handoff",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: small.stateJurisdictionId,
    involvedEntityIds: [
      governorId,
      ...playerRequiredWorkIds(world, governorId),
    ],
    participants: [],
    personFactConstraints: [],
    summary: "The fixture returns control to the recorded parent.",
    visibility: "public",
    tags: [],
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  world = releasePlayerRequiredWork(world, {
    personId: governorId,
    stableKeyPrefix: "fixture:governor-handoff",
    outcomeEventId: world.history.events.at(-1)!.id,
  });
  for (const [key, classification] of [
    ["fixture:government", "sector:government"],
    ["fixture:child-service-provider", "service:school"],
  ] as const) {
    world = createOrganization(world, {
      stableKey: key,
      formedAt: world.currentDate,
      provenance,
      initialProfile: {
        name: key,
        classification,
        locationJurisdictionId: small.stateJurisdictionId,
      },
    });
    if (classification === "sector:government")
      accountId = world.history.organizations.at(-1)!.id;
    else providerId = world.history.organizations.at(-1)!.id;
  }
  if (!accountId || !providerId)
    throw new Error(
      "Fixture government account and provider must be recorded.",
    );
  for (const [organizationId, amount] of [
    [accountId, 10000],
    [providerId, 0],
  ] as const)
    world = createResourcePosition(world, {
      stableKey: `fixture:cash:${organizationId}`,
      owner: { kind: "organization", organizationId },
      openedAt: world.currentDate,
      openingBalance: money(amount, "USD"),
      provenance,
    });
  const appropriation = recordProgramAppropriation(world, {
    programKey: "education:child-service",
    jurisdictionId: small.stateJurisdictionId,
    accountOrganizationId: accountId,
    amount: money(10000, "USD"),
    availableFrom: world.currentDate,
    availableThrough: makeIsoDate("2026-12-31"),
    sourceMeasureId: measureId,
    basis: { kind: "authored-fixture", note: provenance.note },
    edition: "fixture",
  });
  const appropriated = appropriation.world;
  const committed = commitPublicProgram(appropriated, {
    appropriationId: appropriation.id,
    alternative: {
      key: "child-service-spots",
      title: "Fund the recorded provider",
      installments: [
        { afterDays: 1, amount: money(10000, "USD"), purpose: "operating" },
      ],
      deliveryLeadDays: null,
    },
    personId: governorId,
    office: { kind: "state-executive" },
    recipientOrganizationId: providerId,
  });
  if (!committed.ok) throw new Error(committed.reason);
  const unpaid = committed.world;
  const commitmentId = committed.recordId;
  const funded = advanceWorld(
    { ...committed.world, control: { kind: "person", personId: parentId } },
    1,
  );
  return {
    funded,
    unpaid,
    parentId,
    childId,
    commitmentId,
    providerId,
    accountId,
    governorId,
    place,
  };
}

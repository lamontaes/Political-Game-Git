import { smallWorld } from "./small-world";
import { enactThroughDesk } from "./enact-through-desk";
import { introduceMeasure } from "../../src/simulation/legislation";
import { legislativePackForJurisdiction } from "../../src/simulation/legislative-institutions";
import {
  authoredScenarioSeatCount,
  seatBodyForPack,
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
} from "../../src/simulation/legislation-scenarios";
import { governorOfficeForJurisdiction } from "../../src/simulation/governing/state-governing";
import {
  playerRequiredWorkIds,
  releasePlayerRequiredWork,
} from "../../src/simulation/time-work";
import { recordLawExposure } from "../../src/simulation/law-exposure";
import { advanceWorld, recordWorldEvent } from "../../src/simulation/world";
import { createCampaignElectionTransitionRegistry } from "../../src/simulation/campaigns";
import {
  ensurePressStateCoverage,
  ensurePressDeskSchedule,
  ensurePressLocalCoverage,
  mediaOutlets,
  recordStoryLead,
  assignStory,
} from "../../src/simulation/press";
import { reportLawEffects } from "../../src/simulation/press/law-effect-news";

const HANDLERS = createCampaignElectionTransitionRegistry();

/** Explicit fictional enactment and non-money service occurrence; the production press owns every subsequent record. */
export function newsStoryWorld(place: string, seed: string) {
  const small = smallWorld({ place, people: 6, seed, offices: ["governor"] });
  const pack = legislativePackForJurisdiction(small.stateJurisdictionId)!;
  if (!pack) throw new Error(`No legislative pack for ${place}.`);
  const filed = introduceMeasure(small.world, {
    stableKey: "story-heard:measure",
    jurisdictionId: small.stateJurisdictionId,
    rulePackId: pack.packId,
    designation: "News fixture bill",
    shortTitle: "Recorded service hours",
    summary: "An expressly authored downstream news fixture.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    sponsorPersonId: small.personId,
  });
  const measureId = filed.history.legislativeMeasures!.at(-1)!.id;
  const bodies = pack.chambers.map((chamber) =>
    seatBodyForPack(
      chamber.chamberKey,
      chamber.name,
      authoredScenarioSeatCount(pack, chamber.chamberKey),
      [],
      false,
    ),
  );
  const votePlan: Record<string, { yea: number }> = {};
  for (const body of bodies) {
    const chamber = pack.chambers.find(
      (c) => c.chamberKey === body.chamberKey,
    )!;
    for (const committee of chamber.committees)
      votePlan[votePlanKeyForCommittee(committee.committeeKey)] = {
        yea: committee.appointedMembers ?? 7,
      };
    for (const stage of chamber.floorStages)
      votePlan[votePlanKeyForFloor(body.chamberKey, stage.stageKey)] = {
        yea: body.members.length,
      };
  }
  const context = {
    pack,
    measureId,
    bodies,
    committeeMemberCount:
      pack.chambers[0]?.committees[0]?.appointedMembers ?? 7,
    votePlan,
    governorAction: "signed" as const,
    governorRationale:
      "Explicit authored signature for downstream newspaper fixture.",
  };
  const seated = filed;
  const governor = governorOfficeForJurisdiction(seated, pack.jurisdictionKey)!;
  // Keep control with the actual signer while their desk work is pending.
  let world = enactThroughDesk(
    {
      ...seated,
      control: { kind: "person", personId: governor.holderPersonId },
    },
    measureId,
    { context },
  );
  world = ensurePressStateCoverage(world, small.stateJurisdictionId);
  world = ensurePressDeskSchedule(world);
  const resident =
    world.people[world.personOrder.find((id) => id !== small.personId)!]!;
  const town = resident.homeJurisdictionId;
  world = ensurePressLocalCoverage(world, resident.id);
  const date = world.currentDate;
  world = recordWorldEvent(world, {
    stableKey: "story-heard:service",
    type: "test.recorded-law-effect",
    occurredAt: date,
    recordedAt: date,
    jurisdictionId: town,
    involvedEntityIds: [resident.id],
    participants: [],
    personFactConstraints: [],
    visibility: "private",
    tags: [],
    summary: "An explicitly authored non-money effect fixture.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  world = recordLawExposure(world, {
    stableKey: "story-heard:own",
    personId: resident.id,
    measureId,
    sectionKey: "hours",
    channel: "public-service",
    direction: "none",
    amount: null,
    cadence: null,
    sourceRecordId: world.history.events.at(-1)!.id,
    includeFamily: false,
  });
  const own = world.history.lawExposures!.at(-1)!;
  world = recordWorldEvent(world, {
    stableKey: "story-heard:leave-desk",
    type: "test.control-moved",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [
      governor.holderPersonId,
      small.personId,
      ...playerRequiredWorkIds(world, governor.holderPersonId),
    ],
    participants: [],
    personFactConstraints: [],
    visibility: "private",
    tags: [],
    summary:
      "The controlled fixture leaves the governor's desk to watch the newspaper.",
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
    personId: governor.holderPersonId,
    stableKeyPrefix: "story-heard:leave-desk",
    outcomeEventId: world.history.events.at(-1)!.id,
  });
  world = { ...world, control: { kind: "person", personId: small.personId } };
  world = reportLawEffects(world, 0);
  const basis = world.history.events.find((e) =>
    e.tags.includes(`law-effect:source:${own.id}`),
  )!;
  const outlet = mediaOutlets(world).find((o) => o.scope === "local")!;
  const lead = recordStoryLead(world, {
    stableKey: "story-heard:editorial-fixture",
    outletId: outlet.id,
    family: "scheduled-beat",
    route: "public-record",
    basisEventIds: [basis.id],
    subjectPersonIds: [resident.id],
    jurisdictionId: town,
    matterId: null,
    followsPublicationId: null,
  });
  world = assignStory(lead.world, lead.lead.id);
  let later = world;
  for (let day = 0; day < 28; day += 1)
    later = advanceWorld(later, 1, HANDLERS);
  return { world: later, resident, measureId, own };
}

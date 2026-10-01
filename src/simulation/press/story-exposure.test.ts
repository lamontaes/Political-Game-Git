import { describe, expect, it } from "vitest";

import {
  advanceWorld,
  createCampaignElectionTransitionRegistry,
  deserializeWorld,
  serializeWorld,
} from "../index";
import { recordLawExposure } from "../law-exposure";
import { enactThroughDesk } from "../../../tests/fixtures/enact-through-desk";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { introduceMeasure } from "../legislation";
import { playerRequiredWorkIds, releasePlayerRequiredWork } from "../time-work";
import {
  KENTUCKY_CONTEXT,
  createLegislativeScenario,
} from "../legislation-scenarios";
import { ensureStateExecutiveIncumbent } from "../nationwide-world/state-executives";
import { governorOfficeForJurisdiction } from "../governing/state-governing";
import { officialViewReflectionEventKey } from "../official-view-reads";
import type { World } from "../types";
import { assertWorldIntegrity, recordWorldEvent } from "../world";
import {
  ensurePressDeskSchedule,
  ensurePressStateCoverage,
  ensurePressLocalCoverage,
  mediaOutlets,
  recordStoryLead,
  assignStory,
  storyLeads,
} from "./index";
import { LAW_EFFECT_MEASURE_TAG, reportLawEffects } from "./law-effect-news";
import { recordStoryHeardExposure } from "./story-exposure";

const KY = KENTUCKY_CONTEXT.jurisdiction.id;
const HANDLERS = createCampaignElectionTransitionRegistry();

/*
 * A small Kentucky world: one enacted law, one resident it reached, the state
 * paper. The paper reports what the law did, and everyone who reads the story
 * hears of the law from the news: one exposure each, no money, no opinion.
 */
function heardWorld() {
  const scenario = createLegislativeScenario("kentucky");
  const small = smallWorld({
    place: "KY",
    people: 6,
    seed: "story-heard-small-world",
  });
  const filed = introduceMeasure(small.world, {
    ...scenario.world.history.legislativeMeasures![0]!,
    stableKey: "story-heard:measure",
    sponsorPersonId: small.personId,
  });
  const measureId = filed.history.legislativeMeasures!.at(-1)!.id;
  const context = {
    ...scenario,
    measureId,
    bodies: scenario.bodies.map((body) => ({
      ...body,
      members: body.members.map((member) => ({
        ...member,
        personId: member.personId
          ? (small.world.personOrder[
              scenario.world.personOrder.indexOf(member.personId)
            ] ?? null)
          : null,
      })),
    })),
  };
  const seated = ensureStateExecutiveIncumbent(filed, small.personId, "KY");
  const governor = governorOfficeForJurisdiction(seated, "US-KY")!;
  // Keep control with the actual signer while their desk work is pending.
  let world = enactThroughDesk(
    {
      ...seated,
      control: { kind: "person", personId: governor.holderPersonId },
    },
    measureId,
    { context },
  );
  world = ensurePressStateCoverage(world, KY);
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

const news = (world: World) =>
  (world.history.lawExposures ?? []).filter((row) => row.relation === "news");

describe("a story about what a law did is heard from the news", () => {
  const { world, resident, measureId, own } = heardWorld();

  it("writes one exposure for each reader, tied to the records it came from", () => {
    const heard = news(world);
    expect(heard.length).toBeGreaterThan(0);
    expect(heard.map((row) => row.personId)).toContain(resident.id);
    expect(new Set(heard.map((row) => row.personId)).size).toBe(heard.length);
    for (const row of heard) {
      expect(row.measureId).toBe(measureId);
      expect(row.channel).toBe("public-service");
      expect(row.sectionKey).toBe("hours");
      expect(row.direction).toBe("none");
      expect(row.amount).toBeNull();
      expect(row.monthlyPay).toBeNull();
      expect(row.viaPersonId).toBeNull();
      const knowledge = world.history.knowledge.find(
        (k) => k.id === row.news!.knowledgeId,
      )!;
      expect(row.sourceRecordId).toBe(knowledge.id);
      expect(knowledge.personId).toBe(row.personId);
      expect(knowledge.source).toMatchObject({
        kind: "media",
        reference: row.news!.publicationId,
      });
      const lead = storyLeads(world).find(
        (l) => l.id === row.news!.storyLeadId,
      )!;
      expect(lead.basisEventIds).toContain(row.news!.basisEventId);
      const basis = world.history.events.find(
        (e) => e.id === row.news!.basisEventId,
      )!;
      expect(basis.tags).toContain(`${LAW_EFFECT_MEASURE_TAG}${measureId}`);
      expect(basis.tags).toContain(`law-effect:source:${own.id}`);
    }
  });

  it("carries no opinion weight", () => {
    for (const row of news(world)) {
      const key = officialViewReflectionEventKey(row);
      expect(world.history.events.some((e) => e.stableKey === key)).toBe(false);
      expect(
        world.history.futureDueItems.some((item) =>
          item.stableKey.includes(row.id),
        ),
      ).toBe(false);
    }
  });

  it("rejects a saved exposure whose story provenance was broken", () => {
    const row = news(world)[0]!;
    const broken: World = {
      ...world,
      history: {
        ...world.history,
        lawExposures: world.history.lawExposures!.map((exposure) =>
          exposure.id === row.id
            ? {
                ...exposure,
                news: { ...row.news!, publicationId: row.news!.knowledgeId },
              }
            : exposure,
        ),
      },
    };
    expect(() => assertWorldIntegrity(broken)).toThrow(
      "provenance does not reconcile",
    );
  });

  it("is idempotent, and survives a save", () => {
    const row = news(world)[0]!;
    const again = recordStoryHeardExposure(world, {
      knowledgeId: row.news!.knowledgeId,
      basisEventId: row.news!.basisEventId,
    });
    expect(again.history.lawExposures).toBe(world.history.lawExposures);
    const loaded = deserializeWorld(serializeWorld(world));
    expect(news(loaded)).toEqual(news(world));
    expect(() => assertWorldIntegrity(loaded)).not.toThrow();
  });
});

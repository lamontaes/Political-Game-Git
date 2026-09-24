import { describe, expect, it } from "vitest";
import {
  currentKnownMatter,
  matterAwareness,
} from "../../presentation/current-matters";
import {
  createScenarioWorld,
  deserializeWorld,
  serializeWorld,
} from "../index";
import { KENTUCKY_CONTEXT } from "../legislation-scenarios";
import { correctPublication, publishPublicEvent } from "../public-information";
import { recordSelectedPublicationRead } from "../publication-reading";
import type { EntityId, World } from "../types";
import { recordPersonDeath } from "../vitality";
import { recordWorldEvent } from "../world";
import { recordStoryLead } from "./desk";
import { editorialParagraphs } from "./editorial";
import {
  ensurePressMediaOpening,
  ensurePressStateCoverage,
  mediaOutlets,
} from "./outlets";
import {
  recordBackgroundDeathReaders,
  recordOrdinaryDeathRead,
} from "./ordinary-readership";

const KY = KENTUCKY_CONTEXT.jurisdiction.id;

function fixture(seed: string) {
  let world: World = createScenarioWorld(seed, KENTUCKY_CONTEXT, {
    peopleCount: 40,
  });
  const deceasedId = world.personOrder[0]!;
  const attackerId = world.personOrder[1]!;
  world = ensurePressMediaOpening(world, deceasedId);
  world = ensurePressStateCoverage(world, KY);
  const outlet = mediaOutlets(world).find((item) => item.scope === "state")!;
  world = recordWorldEvent(world, {
    stableKey: `${seed}:private-cause`,
    type: "crisis.attack-occurred",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: KY,
    involvedEntityIds: [deceasedId, attackerId].sort(),
    participants: [],
    personFactConstraints: [],
    visibility: "private",
    tags: ["crisis"],
    summary: "A concealed attack occurred.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  world = recordPersonDeath(world, {
    stableKey: `${seed}:person-death`,
    personId: deceasedId,
    diedAt: world.currentDate,
    causeKey: "crisis:attack",
    sourceEntityIds: [attackerId],
    summary: "The concealed attack caused this death.",
    provenance: { kind: "authored", note: "Readership fixture private cause." },
  });
  const privateDeath = world.history.events.at(-1)!;
  world = recordWorldEvent(world, {
    stableKey: `${seed}:death`,
    type: "crisis.officeholder-died",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: KY,
    involvedEntityIds: [deceasedId],
    participants: [
      { personId: deceasedId, role: "focus:officeholder", detail: "Governor" },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: ["crisis", "crisis.official-continuity", "continuity:death"],
    summary: "Died while holding office: Governor of Kentucky.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const death = world.history.events.at(-1)!;
  const recorded = recordStoryLead(world, {
    stableKey: `${seed}:lead`,
    outletId: outlet.id,
    family: "breaking-crisis",
    route: "public-record",
    basisEventIds: [death.id],
    subjectPersonIds: [deceasedId],
    jurisdictionId: KY,
    matterId: null,
    followsPublicationId: null,
  });
  world = recorded.world;
  const line = editorialParagraphs(world, death, outlet)[0]!;
  world = recordWorldEvent(world, {
    stableKey: `${seed}:story`,
    type: "press.story-published",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: KY,
    involvedEntityIds: [deceasedId, recorded.lead.id, outlet.id],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [`press.outlet:${outlet.id}`, `press.lead:${recorded.lead.id}`],
    summary: "Governor dies in office",
    context: {
      location: null,
      socialContext: line,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const story = world.history.events.at(-1)!;
  world = publishPublicEvent(world, {
    stableKey: `${seed}:publication`,
    sourceEventId: story.id,
    outletId: outlet.id,
  });
  const publication = world.history.publications!.at(-1)!;
  return {
    world,
    death,
    privateDeath,
    lead: recorded.lead,
    publication,
    deceasedId,
  };
}

describe("ordinary readership of a public officeholder death", () => {
  it("an article selection persists the edition and its public death, while opening News does not", () => {
    const { world, death, privateDeath, publication, deceasedId } = fixture(
      "selected-death-read",
    );
    const reader = world.personOrder.find((id) => id !== deceasedId)!;
    expect(currentKnownMatter(world, reader)).toBeNull();
    const read = recordSelectedPublicationRead(world, {
      personId: reader,
      publicationId: publication.id,
    });
    expect(world.history.knowledge).toHaveLength(0);
    expect(
      read.history.knowledge.find(
        (item) => item.personId === reader && item.eventId === death.id,
      )?.source,
    ).toMatchObject({ kind: "media", reference: publication.id });
    expect(
      read.history.knowledge.some((item) => item.eventId === privateDeath.id),
    ).toBe(false);
    expect(currentKnownMatter(read, reader)?.eventId).toBe(death.id);
    expect(
      recordSelectedPublicationRead(read, {
        personId: reader,
        publicationId: publication.id,
      }),
    ).toBe(read);
    expect(deserializeWorld(serializeWorld(read)).history.knowledge).toEqual(
      read.history.knowledge,
    );
  });

  it("reading a correction records its edition without teaching the old death claim", () => {
    const { world, death, publication, deceasedId } = fixture(
      "corrected-death-read",
    );
    const reader = world.personOrder.find((id) => id !== deceasedId)!;
    const corrected = correctPublication(world, {
      stableKey: "corrected-death-read:correction",
      correctsPublicationId: publication.id,
      headline: "The earlier report was withdrawn",
      body: "The paper has withdrawn its earlier report.",
      correctionNote: "The original notice was withdrawn.",
    });
    const correction = corrected.history.publications!.at(-1)!;
    const read = recordSelectedPublicationRead(corrected, {
      personId: reader,
      publicationId: publication.id,
    });
    expect(read.history.knowledge).toEqual([
      expect.objectContaining({
        eventId: publication.sourceEventId,
        believedSummary: correction.headline,
        accuracy: "unknown",
        source: expect.objectContaining({ reference: correction.id }),
      }),
    ]);
    expect(
      read.history.knowledge.some((item) => item.eventId === death.id),
    ).toBe(false);
  });

  it("publication alone teaches no resident; an explicit read saves exact notice and source", () => {
    const { world, death, privateDeath, publication, deceasedId } =
      fixture("death-read");
    const reader = world.personOrder.find((id) => id !== deceasedId)!;
    expect(
      world.history.knowledge.some((item) => item.eventId === death.id),
    ).toBe(false);
    const learned = recordOrdinaryDeathRead(world, {
      personId: reader,
      publicationId: publication.id,
      deathEventId: death.id,
    });
    const knowledge = learned.history.knowledge.at(-1)!;
    expect(knowledge).toMatchObject({
      personId: reader,
      eventId: death.id,
      learnedAt: world.currentDate,
      believedSummary: death.summary,
      source: {
        kind: "media",
        outlet: publication.outletName,
        reference: publication.id,
      },
    });
    expect(knowledge.believedSummary).not.toMatch(/attack|assassin|murder/i);
    expect(knowledge.eventId).not.toBe(privateDeath.id);
    expect(() =>
      recordOrdinaryDeathRead(world, {
        personId: reader,
        publicationId: publication.id,
        deathEventId: privateDeath.id,
      }),
    ).toThrow(/does not report/);
    expect(
      recordOrdinaryDeathRead(learned, {
        personId: reader,
        publicationId: publication.id,
        deathEventId: death.id,
      }),
    ).toBe(learned);
    expect(
      deserializeWorld(serializeWorld(learned)).history.knowledge.at(-1),
    ).toEqual(knowledge);
  });

  it("selects a deterministic subset in the outlet market and rejects an unrelated notice", () => {
    const { world, death, lead, publication } = fixture("death-reach");
    const reached = recordBackgroundDeathReaders(world, lead, publication);
    const readers = reached.history.knowledge.filter(
      (item) => item.eventId === death.id,
    );
    const eligible = world.personOrder.filter(
      (id) =>
        world.people[id]!.homeJurisdictionId === KY &&
        id !== death.involvedEntityIds[0],
    );
    const exposed = readers[0]!.personId;
    const unexposed = eligible.find(
      (id) => !readers.some((item) => item.personId === id),
    )!;
    expect(unexposed).toBeDefined();
    expect(currentKnownMatter(reached, exposed)?.eventId).toBe(death.id);
    expect(currentKnownMatter(reached, unexposed)).toBeNull();
    expect(matterAwareness(reached, unexposed, death.id)).toBe("uninformed");
    expect(readers.length).toBeGreaterThan(0);
    expect(readers.length).toBeLessThan(eligible.length);
    expect(readers.every((item) => eligible.includes(item.personId))).toBe(
      true,
    );
    expect(recordBackgroundDeathReaders(reached, lead, publication)).toBe(
      reached,
    );
    expect(() =>
      recordOrdinaryDeathRead(world, {
        personId: world.personOrder[1]!,
        publicationId: publication.id,
        deathEventId: "event_missing" as EntityId,
      }),
    ).toThrow(/does not report/);
  });
});

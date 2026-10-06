import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { recordWorldEvent } from "../simulation/world";
import { recordEventKnowledge } from "../simulation/records";
import { createStableId, personName } from "../simulation";
import { projectWorld39Journal } from "./world39-journal";
import { projectLifeSoFarJournal } from "./life-so-far-english";

const seed = "session7-life-record-boundary";
const place = drawRandomPlace(seed);

describe(`life chapters read records (${place.displayName}, ${seed})`, () => {
  it("excludes scene placement from ordinary and loading chapters, including learned summaries", () => {
    const fixture = smallWorld({ seed, place: place.key, household: true });
    let world = recordWorldEvent(fixture.world, {
      stableKey: "fixture:scene-status",
      type: "life.scene.arrived",
      occurredAt: fixture.world.currentDate,
      recordedAt: fixture.world.currentDate,
      jurisdictionId: fixture.jurisdictionId,
      involvedEntityIds: [fixture.personId],
      participants: [
        {
          personId: fixture.personId,
          role: "presence:participant",
          detail: null,
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: [],
      summary: "You are home; your work schedule has no shift at this hour.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const event = world.history.events.at(-1)!;
    world = recordEventKnowledge(world, {
      stableKey: "fixture:heard-status",
      personId: fixture.personId,
      eventId: event.id,
      learnedAt: world.currentDate,
      source: { kind: "direct" },
      accuracy: "accurate",
      confidence: "high",
      believedSummary: event.summary,
    });
    expect(
      projectWorld39Journal(world, fixture.personId).entries.some(
        (entry) => entry.sourceId === event.id,
      ),
    ).toBe(false);
    expect(
      projectLifeSoFarJournal(world, fixture.personId).some((line) =>
        /no shift at this hour/.test(line.text),
      ),
    ).toBe(false);
  });

  it("keeps a family fact's recorded date instead of dating a household snapshot today", () => {
    const fixture = smallWorld({ seed, place: place.key, household: true });
    const person = fixture.world.people[fixture.personId]!;
    const relative = Object.values(fixture.world.people).find(
      (row) => row.id !== person.id,
    )!;
    const id = createStableId("fact", "fixture:family-record");
    const fact = {
      id,
      stableKey: "fixture:family-record",
      kind: "family-relationship" as const,
      occurredAt: person.birthDate,
      jurisdictionId: null,
      relatedPersonId: relative.id,
      relationship: "lineal:parent" as const,
      endedAt: null,
      summary: `${personName(relative)} is your parent.`,
      provenance: {
        method: "manual" as const,
        sourceEventId: null,
        note: "Explicit life-record fixture",
      },
    };
    const world = {
      ...fixture.world,
      people: {
        ...fixture.world.people,
        [person.id]: {
          ...person,
          establishedFacts: [...person.establishedFacts, fact],
        },
      },
    };
    const before = JSON.stringify(world);
    const line = projectLifeSoFarJournal(world, person.id).find((row) =>
      row.sourceRecordIds.includes(id),
    );
    expect(line?.date).toBe(fact.occurredAt);
    expect(line?.text).toContain("my parent");
    expect(
      projectLifeSoFarJournal(world, person.id).some((row) =>
        row.text.startsWith("I live with"),
      ),
    ).toBe(false);
    expect(JSON.stringify(world)).toBe(before);
  });
});

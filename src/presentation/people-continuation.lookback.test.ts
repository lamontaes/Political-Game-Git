import { describe, expect, it } from "vitest";

import {
  addDays,
  makeIsoDate,
  recordPersonDeath,
  recordMemory,
  recordWorldEvent,
  type EntityId,
  type ExecutiveDispositionRecord,
  type LegislativeEnactmentRecord,
  type LegislativeMeasureRecord,
} from "../simulation";
import {
  recordedTermFixture,
  enterSupportedTerm,
} from "../../tests/fixtures/recorded-legislative-term";
import { projectLookBack } from "./people-continuation";
import { ownElectionResultsDecided } from "./own-election";

function die(
  world: ReturnType<typeof recordedTermFixture>["world"],
  personId: ReturnType<typeof recordedTermFixture>["personId"],
) {
  return recordPersonDeath(world, {
    stableKey: `lookback:death:${personId}`,
    personId,
    diedAt: world.currentDate,
    causeKey: "cause:external-fixture",
    sourceEntityIds: [world.id],
    summary: "The character died in this test fixture.",
    provenance: { kind: "authored", note: "B19 projection test." },
  });
}

describe("B19 life look-back projection", () => {
  it("reads an office, a sponsored law and a signed law from a seeded life", () => {
    const fixture = recordedTermFixture("player");
    const witness = Object.values(fixture.world.people).find(
      (person) => person.id !== fixture.personId,
    );
    expect(witness).toBeDefined();
    const officeWorld = enterSupportedTerm(fixture.world, fixture.personId);
    const eventWorld = recordWorldEvent(officeWorld, {
      stableKey: "b19:bridge-act-event",
      type: "legislation.measure.enacted",
      occurredAt: officeWorld.currentDate,
      recordedAt: officeWorld.currentDate,
      jurisdictionId: officeWorld.people[fixture.personId]!.homeJurisdictionId,
      involvedEntityIds: [fixture.personId],
      participants: [
        {
          personId: fixture.personId,
          role: "focus:sponsor",
          detail: "Sponsored a county bridge repair law.",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [],
      summary: "The Bridge Repairs Act became law.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const event = eventWorld.history.events.at(-1)!;
    const measureId = "legislative-measure_b19-bridge" as EntityId;
    const measure: LegislativeMeasureRecord = {
      id: measureId,
      stableKey: "b19:bridge-act",
      sequence: eventWorld.history.nextSequence,
      jurisdictionId: eventWorld.people[fixture.personId]!.homeJurisdictionId,
      rulePackId: "us-ky-general-assembly-v1",
      designation: "HB 2",
      shortTitle: "HB 2",
      summary: "Repairs the county bridge.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "house",
      sponsorPersonId: fixture.personId,
      introducedAt: makeIsoDate(
        `${Number(eventWorld.currentDate.slice(0, 4)) - 1}-01-01`,
      ),
      sourceDocumentKey: null,
      policyAlternativeIds: [],
      propositionIds: [],
      propositionAnswers: [],
    };
    const signedMeasureId = "legislative-measure_b19-walkway" as EntityId;
    const signedMeasure: LegislativeMeasureRecord = {
      ...measure,
      id: signedMeasureId,
      stableKey: "b19:walkway-act",
      sequence: eventWorld.history.nextSequence + 1,
      designation: "HB 4",
      shortTitle: "HB 4",
      summary: "Builds a safe walkway over the road.",
      sponsorPersonId: witness!.id,
    };
    const dispositionId = "executive-disposition_b19-walkway" as EntityId;
    const disposition: ExecutiveDispositionRecord = {
      id: dispositionId,
      stableKey: "b19:walkway:signed",
      sequence: eventWorld.history.nextSequence + 2,
      measureId: signedMeasureId,
      actedAt: eventWorld.currentDate,
      action: "signed",
      actorLabel: "Governor",
      rationale: "The test fixture records the player's signature.",
    };
    const withLegislationRecords = {
      ...eventWorld,
      history: {
        ...eventWorld.history,
        nextSequence: eventWorld.history.nextSequence + 3,
        legislativeMeasures: [
          ...(eventWorld.history.legislativeMeasures ?? []),
          measure,
          signedMeasure,
        ],
        executiveDispositions: [
          ...(eventWorld.history.executiveDispositions ?? []),
          disposition,
        ],
      },
    };
    const signedEventWorld = recordWorldEvent(withLegislationRecords, {
      stableKey: "b19:walkway-signature-event",
      type: "legislation.measure-signed",
      occurredAt: eventWorld.currentDate,
      recordedAt: eventWorld.currentDate,
      jurisdictionId: eventWorld.people[fixture.personId]!.homeJurisdictionId,
      involvedEntityIds: [dispositionId, fixture.personId],
      participants: [
        {
          personId: fixture.personId,
          role: "focus:subject",
          detail: "Governor",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: ["legislation.signed"],
      summary: "The governor signed HB 4.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const enactedEventWorld = recordWorldEvent(signedEventWorld, {
      stableKey: "b19:walkway-enacted-event",
      type: "legislation.measure-enacted",
      occurredAt: eventWorld.currentDate,
      recordedAt: eventWorld.currentDate,
      jurisdictionId: eventWorld.people[fixture.personId]!.homeJurisdictionId,
      involvedEntityIds: [signedMeasureId],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: ["legislation.enacted"],
      summary: "The Safe Walkway Act became law.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const signedOutcome = enactedEventWorld.history.events.at(-1)!;
    const enactments: readonly LegislativeEnactmentRecord[] = [
      {
        id: "legislative-enactment_b19-bridge" as EntityId,
        stableKey: "b19:bridge-act:enacted",
        sequence: enactedEventWorld.history.nextSequence,
        measureId,
        resolvedAt: eventWorld.currentDate,
        outcome: "enacted",
        actDesignation: null,
        effectiveAt: eventWorld.currentDate,
        outcomeEventId: event.id,
      },
      {
        id: "legislative-enactment_b19-walkway" as EntityId,
        stableKey: "b19:walkway-act:enacted",
        sequence: enactedEventWorld.history.nextSequence + 1,
        measureId: signedMeasureId,
        resolvedAt: eventWorld.currentDate,
        outcome: "enacted",
        actDesignation: null,
        effectiveAt: eventWorld.currentDate,
        outcomeEventId: signedOutcome.id,
      },
    ];
    const recorded = {
      ...enactedEventWorld,
      history: {
        ...enactedEventWorld.history,
        nextSequence:
          enactedEventWorld.history.nextSequence + enactments.length,
        legislativeEnactments: [
          ...(enactedEventWorld.history.legislativeEnactments ?? []),
          ...enactments,
        ],
      },
    };
    const view = projectLookBack(
      recorded,
      fixture.personId,
      recorded.currentDate,
    );
    expect(
      view.record.offices.some((line) =>
        line.includes(fixture.contest.office.title),
      ),
    ).toBe(true);
    expect(view.record.laws).toContain(
      `Repairs the county bridge. (${recorded.currentDate.slice(0, 4)})`,
    );
    expect(view.record.laws).toContain(
      `Builds a safe walkway over the road. (${recorded.currentDate.slice(0, 4)})`,
    );
    expect(view.through).toBe(recorded.currentDate);
    expect(view.chapters.length).toBeGreaterThan(0);
    expect(
      view.chapters.flatMap((chapter) => chapter.paragraphs).join(" "),
    ).not.toMatch(
      /\b(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}\b/,
    );
  });

  it("omits an office section when no office term is recorded", () => {
    const fixture = recordedTermFixture("rival");
    const dead = die(fixture.world, fixture.personId);
    const view = projectLookBack(dead, fixture.personId);
    expect(view.record.offices).toEqual([]);
  });

  it("surfaces a recorded memory from more than ten years before death", () => {
    const fixture = recordedTermFixture("player");
    const at = makeIsoDate(
      `${Number(fixture.world.currentDate.slice(0, 4)) - 15}-01-01`,
    );
    const witness = Object.values(fixture.world.people).find(
      (person) => person.id !== fixture.personId,
    );
    expect(witness).toBeDefined();
    const happened = recordWorldEvent(fixture.world, {
      stableKey: "b19:old-remembered-event",
      type: "life.social-occasion-attended",
      occurredAt: at,
      recordedAt: fixture.world.currentDate,
      jurisdictionId:
        fixture.world.people[fixture.personId]!.homeJurisdictionId,
      involvedEntityIds: [fixture.personId, witness!.id],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: ["choice.social"],
      summary: "You and Ana worked together on the school fundraiser.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const event = happened.history.events.at(-1)!;
    const remembered = recordMemory(happened, {
      stableKey: "b19:old-player-memory",
      personId: fixture.personId,
      eventId: event.id,
      formedAt: at,
      rememberedSummary: "I helped Ana with the school fundraiser.",
      interpretation: "A day we were proud of.",
      strength: "strong",
      relevanceTags: ["community"],
      supersedesMemoryId: null,
    });
    const died = die(remembered, fixture.personId);
    const view = projectLookBack(died, fixture.personId);
    expect(
      view.remembered.some(
        (line) =>
          line.text.includes("school fundraiser") &&
          Number(view.through.slice(0, 4)) - Number(line.at.slice(0, 4)) > 10 &&
          line.sourceRecordIds.length > 0,
      ),
    ).toBe(true);
  });

  it("uses only life entries at or before its cutoff and avoids player facing technical terms", () => {
    const fixture = recordedTermFixture("rival");
    const through = addDays(fixture.world.currentDate, -1);
    const view = projectLookBack(fixture.world, fixture.personId, through);
    expect(view.chapters.length).toBeGreaterThan(0);
    expect(
      view.chapters.every((chapter) =>
        /^\d{4}(?: to \d{4})?$/.test(chapter.title.replace(/^In /, "")),
      ),
    ).toBe(true);
    const composed = [
      ...view.chapters.flatMap((chapter) => [
        chapter.title,
        ...chapter.paragraphs,
      ]),
      ...view.remembered.map((entry) => entry.text),
      ...view.record.offices,
      ...view.record.races,
      ...view.record.laws,
      ...view.record.family,
      view.record.causeOfDeath ?? "",
    ].join(" ");
    expect(composed).not.toMatch(
      /estimated|\b(?:dev|debug|statute|section)\b|\b(?:HB|H\.B\.|SB|S\.B\.)\s*\d/i,
    );
    expect(view.record.races).toHaveLength(
      ownElectionResultsDecided(fixture.world, fixture.personId, null, through)
        .length,
    );
  });

  it("clamps a future request to the saved World's current date", () => {
    const fixture = recordedTermFixture("rival");
    const view = projectLookBack(
      fixture.world,
      fixture.personId,
      addDays(fixture.world.currentDate, 30),
    );

    expect(view.through).toBe(fixture.world.currentDate);
    expect(
      view.chapters
        .flatMap((chapter) => chapter.paragraphs)
        .every((paragraph) => paragraph.length > 0),
    ).toBe(true);
  });
});

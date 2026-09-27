import { describe, expect, it } from "vitest";
import { createDemoWorld } from "../demo";
import { makeIsoDate } from "../dates";
import { recordWorldEvent } from "../world";
import { buildOpeningCourtCatalog } from "./courts";
import { recordJudicialPhilosophy } from "./philosophy";
import type { JudicialPhilosophyEvidence } from "./types";

function fixture() {
  let world = buildOpeningCourtCatalog(createDemoWorld("judicial-philosophy"));
  const personId = world.personOrder[0]!;
  world = recordWorldEvent(world, {
    stableKey: "judicial-philosophy:stated-reading",
    type: "judiciary.view-articulated",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: world.people[personId]!.homeJurisdictionId,
    involvedEntityIds: [personId],
    participants: [{ personId, role: "agency:speaker", detail: null }],
    personFactConstraints: [],
    visibility: "limited",
    tags: ["judiciary.interpretation"],
    summary: "The person said judges should begin with the statute's text.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: "Begin with the statute's text when deciding a case.",
      motivation: null,
      immediateReaction: null,
    },
  });
  return { world, personId, eventId: world.history.events.at(-1)!.id };
}

describe("judicial philosophy from life evidence", () => {
  it("writes only the evidenced axis, retains its source, and is idempotent", () => {
    const { world, personId, eventId } = fixture();
    expect(world.judiciary!.philosophies).toHaveLength(0);
    const input = {
      stableKey: "stated-reading",
      personId,
      formedAt: world.currentDate,
      dimensions: {
        reading: {
          strength: -1 as const,
          evidence: [{ kind: "historical-event" as const, id: eventId }],
          reason: "The person's recorded statement favors text first.",
        },
      },
      reason: "Recorded interpretation of a stated judicial view.",
    };
    const next = recordJudicialPhilosophy(world, input);
    const philosophy = next.judiciary!.philosophies[0]!;
    expect(philosophy.dimensions).toEqual({
      reading: -1,
      deference: null,
      federalism: null,
      rights: null,
      precedent: null,
    });
    expect(Object.values(philosophy.rightsBySubject)).toEqual(
      Array(7).fill(null),
    );
    expect(philosophy.dimensionEvidence?.reading).toEqual([
      { kind: "historical-event", id: eventId },
    ]);
    expect(philosophy.lifeEvidenceIds).toEqual([eventId]);
    expect(recordJudicialPhilosophy(next, input)).toBe(next);
    expect(world.judiciary!.philosophies).toHaveLength(0);
  });

  it("refuses absent, unrelated, future and rapid unsupported views", () => {
    const { world, personId, eventId } = fixture();
    const base = {
      stableKey: "rejected-reading",
      personId,
      formedAt: world.currentDate,
      reason: "A recorded statement supports the interpretation.",
    };
    expect(() =>
      recordJudicialPhilosophy(world, {
        ...base,
        dimensions: {
          reading: { strength: -1, evidence: [], reason: "No source." },
        },
      }),
    ).toThrow(/without life evidence/);
    expect(() =>
      recordJudicialPhilosophy(world, {
        ...base,
        dimensions: {
          reading: {
            strength: -1,
            evidence: [{ kind: "historical-event", id: eventId }],
            reason: "A future view.",
          },
        },
        formedAt: makeIsoDate("2020-01-01"),
      }),
    ).toThrow(/later than formation/);
    const otherPersonId = world.personOrder[1]!;
    expect(() =>
      recordJudicialPhilosophy(world, {
        ...base,
        personId: otherPersonId,
        dimensions: {
          reading: {
            strength: -1,
            evidence: [{ kind: "historical-event", id: eventId }],
            reason: "Someone else's statement.",
          },
        },
      }),
    ).toThrow(/unrelated/);
    expect(() =>
      recordJudicialPhilosophy(world, {
        ...base,
        dimensions: {
          reading: {
            strength: -1,
            evidence: [
              {
                kind: "party-affiliation",
                id: eventId,
              } as unknown as JudicialPhilosophyEvidence,
            ],
            reason: "A party label is not a judicial view.",
          },
        },
      }),
    ).toThrow(/missing, unrelated/);
    expect(() =>
      recordJudicialPhilosophy(world, {
        ...base,
        rightsBySubject: {
          speech: {
            strength: 1,
            evidence: [{ kind: "historical-event", id: eventId }],
            reason: "A rights subject alone cannot stand for an axis.",
          },
        },
      }),
    ).toThrow(/requires a recorded rights dimension/);
    const recorded = recordJudicialPhilosophy(world, {
      ...base,
      dimensions: {
        reading: {
          strength: -1,
          evidence: [{ kind: "historical-event", id: eventId }],
          reason: "The person's recorded statement favors text first.",
        },
      },
    });
    expect(() =>
      recordJudicialPhilosophy(recorded, {
        ...base,
        stableKey: "next-day-reversal",
        dimensions: {
          reading: {
            strength: 2,
            evidence: [{ kind: "historical-event", id: eventId }],
            reason: "A sudden reversal without a new record.",
          },
        },
      }),
    ).toThrow(/too soon/);
  });

  it("revises one step after dated experience without erasing earlier evidence", () => {
    let world = buildOpeningCourtCatalog(
      createDemoWorld("judicial-philosophy-revision"),
    );
    const personId = world.personOrder[0]!;
    const priorDate = makeIsoDate(
      `${Number(world.currentDate.slice(0, 4)) - 4}${world.currentDate.slice(4)}`,
    );
    world = recordWorldEvent(world, {
      stableKey: "judicial-philosophy:earlier-statement",
      type: "judiciary.view-articulated",
      occurredAt: priorDate,
      recordedAt: world.currentDate,
      jurisdictionId: world.people[personId]!.homeJurisdictionId,
      involvedEntityIds: [personId],
      participants: [{ personId, role: "agency:speaker", detail: null }],
      personFactConstraints: [],
      visibility: "limited",
      tags: ["judiciary.interpretation"],
      summary: "The person stated a text-first approach to statutes.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: "Favor a text-first approach.",
        motivation: null,
        immediateReaction: null,
      },
    });
    const earlierEventId = world.history.events.at(-1)!.id;
    const earlierInput = {
      stableKey: "earlier-reading",
      personId,
      formedAt: priorDate,
      dimensions: {
        reading: {
          strength: -1 as const,
          evidence: [{ kind: "historical-event" as const, id: earlierEventId }],
          reason: "The recorded statement favors text first.",
        },
      },
      reason: "An earlier stated judicial view.",
    };
    world = recordJudicialPhilosophy(world, earlierInput);
    world = recordWorldEvent(world, {
      stableKey: "judicial-philosophy:later-statement",
      type: "judiciary.view-articulated",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: world.people[personId]!.homeJurisdictionId,
      involvedEntityIds: [personId],
      participants: [{ personId, role: "agency:speaker", detail: null }],
      personFactConstraints: [],
      visibility: "limited",
      tags: ["judiciary.interpretation"],
      summary: "The person reconsidered the earlier text-first approach.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: "Reconsider the earlier approach.",
        motivation: null,
        immediateReaction: null,
      },
    });
    const laterEventId = world.history.events.at(-1)!.id;
    world = recordJudicialPhilosophy(world, {
      stableKey: "later-reading",
      personId,
      formedAt: world.currentDate,
      dimensions: {
        reading: {
          strength: 0,
          evidence: [{ kind: "historical-event", id: laterEventId }],
          reason: "The later statement records a moderate revision.",
        },
      },
      reason: "A later stated judicial view.",
    });
    expect(
      world.judiciary!.philosophies.map((item) => item.dimensions.reading),
    ).toEqual([-1, 0]);
    expect(world.judiciary!.philosophies[1]!.lifeEvidenceIds).toEqual([
      earlierEventId,
      laterEventId,
    ]);
    expect(recordJudicialPhilosophy(world, earlierInput)).toBe(world);
  });
});

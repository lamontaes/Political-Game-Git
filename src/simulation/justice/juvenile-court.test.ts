import { describe, expect, it, vi } from "vitest";

// Authored numeric-term fixture using the already-cited LA/TX/VT ceilings.
// Coordinator integration into the shared production rows is a separate gate.
vi.mock(
  "../../../data/research/laws/starting-law-2026.json",
  async (original) => {
    const module = await original<{ default: Record<string, unknown> }>();
    const data = structuredClone(module.default) as {
      questions: Record<
        string,
        { answers: Record<string, Record<string, unknown>> }
      >;
    };
    const questionKey =
      "us-policy-positions:justice-public-safety.raise-juvenile-court-age";
    for (const [place, age] of [
      ["US-LA", 16],
      ["US-TX", 16],
      ["US-VT", 18],
    ] as const) {
      data.questions[questionKey]!.answers[place]!.lawTerms = [
        { questionKey, key: "age", value: age, unit: "years" },
      ];
    }
    return { default: data };
  },
);

import { smallWorld } from "../../../tests/fixtures/small-world";
import { makeIsoDate } from "../dates";
import { deserializeWorld, serializeWorld } from "../serialization";
import { offenderForVictims } from "../crime/offenders";
import { adultCourtAgeAt } from "./juvenile-court";
import type {
  EntityId,
  LegislativeMeasureRecord,
  LegislativeEnactmentRecord,
} from "../types";

describe("general adult age comes from the dated numeric juvenile ceiling", () => {
  it("does not turn a later enacted Boolean answer into an age", () => {
    const small = smallWorld({
      place: "US-LA",
      seed: "team9-a25-boolean-act",
    });
    const proposition = Object.values(
      small.world.policyCatalog.propositions,
    ).find(
      (row) =>
        row.stableKey ===
        "us-policy-positions:justice-public-safety.raise-juvenile-court-age",
    )!;
    const measureId = "measure_a25_boolean_fixture" as EntityId;
    const measure = {
      id: measureId,
      stableKey: "fixture:a25:boolean",
      sequence: 1,
      jurisdictionId: small.stateJurisdictionId,
      propositionIds: [proposition.id],
      propositionAnswers: [{ propositionId: proposition.id, answer: "yes" }],
      rulePackId: "fixture",
      designation: "HB fixture",
      shortTitle: "Authored Boolean reader fixture",
      summary: "No numeric age provision supplied.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "house",
      sponsorPersonId: null,
      sourceDocumentKey: null,
      policyAlternativeIds: [],
      introducedAt: makeIsoDate("2026-01-01"),
    } satisfies LegislativeMeasureRecord;
    const enactment = {
      id: "enactment_a25_boolean_fixture" as EntityId,
      stableKey: "fixture:a25:boolean:enacted",
      sequence: 2,
      measureId,
      resolvedAt: makeIsoDate("2026-01-02"),
      outcome: "enacted",
      actDesignation: null,
      outcomeEventId: "event_a25_authored_enactment" as EntityId,
      effectiveAt: makeIsoDate("2026-01-04"),
    } satisfies LegislativeEnactmentRecord;
    // Authored records isolate a reader boundary; they are not canonical enactment proof.
    const world = {
      ...small.world,
      history: {
        ...small.world.history,
        legislativeMeasures: [
          ...(small.world.history.legislativeMeasures ?? []),
          measure,
        ],
        legislativeEnactments: [
          ...(small.world.history.legislativeEnactments ?? []),
          enactment,
        ],
      },
    };
    expect(
      adultCourtAgeAt(world, small.jurisdictionId, makeIsoDate("2026-01-03")),
    ).toBe(17);
    expect(
      adultCourtAgeAt(world, small.jurisdictionId, makeIsoDate("2026-01-04")),
    ).toBeNull();
  });
  it.each([
    ["US-LA", 17],
    ["US-TX", 17],
    ["US-VT", 19],
  ] as const)("reads the sourced fixture ceiling in %s", (place, adultAge) => {
    const small = smallWorld({ place, seed: `team9-a25-numeric:${place}` });
    expect(adultCourtAgeAt(small.world, small.jurisdictionId)).toBe(adultAge);
    const restored = deserializeWorld(serializeWorld(small.world));
    expect(adultCourtAgeAt(restored, small.jurisdictionId)).toBe(adultAge);
    // Future-law lookup cannot be admitted by a present-world record.
    expect(
      adultCourtAgeAt(
        restored,
        small.jurisdictionId,
        makeIsoDate("2030-01-01"),
      ),
    ).toBeNull();
  });

  it("does not read Louisiana's later operative ceiling before its saved date", () => {
    const small = smallWorld({ place: "US-LA", seed: "team9-a25-dated" });
    expect(
      adultCourtAgeAt(
        small.world,
        small.jurisdictionId,
        makeIsoDate("2024-04-18"),
      ),
    ).toBeNull();
    expect(
      adultCourtAgeAt(
        small.world,
        small.jurisdictionId,
        makeIsoDate("2024-04-19"),
      ),
    ).toBe(17);
  });

  it.each(["US-AS", "US-VI", "US-AK"])(
    "refuses a Boolean-only row and adult offender admission in %s",
    (place) => {
      const small = smallWorld({ place, seed: `team9-a25-unknown:${place}` });
      expect(adultCourtAgeAt(small.world, small.jurisdictionId)).toBeNull();
      expect(
        offenderForVictims(
          small.world,
          {
            jurisdictionId: small.jurisdictionId,
            occurredAt: small.world.currentDate,
            victimPersonIds: [],
          },
          "burglary",
        ),
      ).toBeNull();
    },
  );
});

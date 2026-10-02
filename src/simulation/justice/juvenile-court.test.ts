import { describe, expect, it } from "vitest";

import { smallWorld } from "../../../tests/fixtures/small-world";
import { makeIsoDate } from "../dates";
import { deserializeWorld, serializeWorld } from "../serialization";
import { offenderForVictims } from "../crime/offenders";
import { adultCourtAgeAt } from "./juvenile-court";
import { lifePlaceStateIdentities } from "../life-places";
import { pickDistinct, SeededRng } from "../rng";
import startingLaw from "../../../data/research/laws/starting-law-2026.json" with { type: "json" };
import type {
  EntityId,
  LegislativeMeasureRecord,
  LegislativeEnactmentRecord,
} from "../types";

const QUESTION =
  "us-policy-positions:justice-public-safety.raise-juvenile-court-age";
const sampledPlaces = pickDistinct(
  new SeededRng("team9-a25-production-ceilings-all56"),
  lifePlaceStateIdentities().map((place) => place.jurisdictionKey),
  5,
);

describe("different state adult ages come from the dated numeric juvenile ceiling", () => {
  it.each(sampledPlaces)(
    "reads the production term and preserves it on reload in sampled %s",
    (place) => {
      const small = smallWorld({ place, seed: `team9-a25-sampled:${place}` });
      const rows = startingLaw.questions[QUESTION].answers as Record<
        string,
        { lawTerms?: readonly { key: string; value: number; unit: string }[] }
      >;
      const term = rows[place]?.lawTerms?.find(
        (entry) => entry.key === "age" && entry.unit === "years",
      );
      const expected = term ? term.value + 1 : null;
      expect(adultCourtAgeAt(small.world, small.jurisdictionId)).toBe(expected);
      const restored = deserializeWorld(serializeWorld(small.world));
      expect(adultCourtAgeAt(restored, small.jurisdictionId)).toBe(expected);
    },
  );
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
    ["US-AK", 18],
  ] as const)(
    "reads the production sourced ceiling in %s",
    (place, adultAge) => {
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
    },
  );

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

  it.each(["US-AS", "US-VI"])(
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

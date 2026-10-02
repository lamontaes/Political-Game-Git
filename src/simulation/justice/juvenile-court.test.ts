import { describe, expect, it } from "vitest";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { assertWorldIntegrity } from "../world";

import { smallWorld } from "../../../tests/fixtures/small-world";
import { makeIsoDate } from "../dates";
import { deserializeWorld, serializeWorld } from "../serialization";
import { eligibleOffenders } from "../crime/offenders";
import { adultCourtAgeAt, juvenileCourtAgeRuleAt } from "./juvenile-court";
import { recordJuvenileAgeBillTerm } from "./juvenile-law-term";
import type {
  EntityId,
  LegislativeMeasureRecord,
  LegislativeEnactmentRecord,
} from "../types";

describe("general adult age comes from the dated numeric juvenile ceiling", () => {
  it("two states differ with their sourced starting law and no enacted law", () => {
    const a = smallWorld({ place: "US-TX", seed: "a25:starting:tx" });
    const b = smallWorld({ place: "US-VT", seed: "a25:starting:vt" });
    expect(adultCourtAgeAt(a.world, a.jurisdictionId)).toBe(17);
    expect(adultCourtAgeAt(b.world, b.jurisdictionId)).toBe(19);
  });
  it("opens a new game in a sampled place without inventing transfer authority", () => {
    const seed = "a25:sampled-opening:20261002";
    const place = drawRandomPlace(seed);
    const opened = smallWorld({ place: place.key, seed, people: 3 });
    assertWorldIntegrity(opened.world);
    const restored = deserializeWorld(serializeWorld(opened.world));
    expect(restored.seed).toBe(seed);
    expect(adultCourtAgeAt(restored, opened.jurisdictionId)).toBe(
      adultCourtAgeAt(opened.world, opened.jurisdictionId),
    );
    console.info(`A25 new game ${place.key}; seed ${seed}`);
  });
  it("labels the peer-mode estimate for an enacted law without a numeric age", () => {
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
    const rule = juvenileCourtAgeRuleAt(
      world,
      small.jurisdictionId,
      makeIsoDate("2026-01-04"),
    );
    expect(rule?.estimated).toBe(true);
    expect(rule!.contributors.length).toBeGreaterThan(0);
    expect(
      adultCourtAgeAt(world, small.jurisdictionId, makeIsoDate("2026-01-04")),
    ).toBe(rule!.juvenileCeiling + 1);
    // The ordinary filing adapter persists the amount before enactment.
    const sponsorPersonId = Object.values(small.world.people)[0]!.id;
    const filingWorld = {
      ...world,
      history: {
        ...world.history,
        nextSequence: Math.max(
          world.history.nextSequence,
          measure.sequence + 1,
        ),
        legislativeMeasures: [{ ...measure, sponsorPersonId }],
        legislativeEnactments: small.world.history.legislativeEnactments,
      },
    };
    const filed = recordJuvenileAgeBillTerm(filingWorld, measureId);
    const provision = filed.history.legislativeProvisions!.at(-1)!;
    expect(provision.lawTerms?.[0]?.key).toBe("age");
    expect(provision.lawTerms?.[0]?.value).toBe(rule!.juvenileCeiling);
    expect(provision.text).toContain(
      "Estimated from the current same-answer peer rule mode",
    );
    expect(recordJuvenileAgeBillTerm(filed, measureId)).toBe(filed);
    const enacted = {
      ...filed,
      history: {
        ...filed.history,
        nextSequence: filed.history.nextSequence + 1,
        legislativeEnactments: [
          {
            ...enactment,
            sequence: filed.history.nextSequence,
            resolvedAt: filed.currentDate,
            effectiveAt: filed.currentDate,
          },
        ],
      },
    };
    const exact = juvenileCourtAgeRuleAt(enacted, small.jurisdictionId);
    expect(exact?.estimated).toBe(false);
    expect(exact?.juvenileCeiling).toBe(provision.lawTerms![0]!.value);
    // The authored enactment isolates final-term selection; ordinary
    // territory openings above and below cover canonical save/reload.
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
    "keeps adult offender admission using the observed peer mode in %s",
    (place) => {
      const small = smallWorld({ place, seed: `team9-a25-unknown:${place}` });
      const rule = juvenileCourtAgeRuleAt(small.world, small.jurisdictionId);
      expect(rule?.estimated).toBe(true);
      expect(rule!.contributors.length).toBeGreaterThan(0);
      const candidates = eligibleOffenders(
        small.world,
        small.jurisdictionId,
        small.world.currentDate,
      );
      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates.every((person) => person.age >= rule!.adultAge)).toBe(
        true,
      );
      const restored = deserializeWorld(serializeWorld(small.world));
      expect(
        eligibleOffenders(restored, small.jurisdictionId, restored.currentDate),
      ).toEqual(candidates);
    },
  );
});

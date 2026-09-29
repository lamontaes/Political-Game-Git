import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PlaceConditionsPanel } from "../player/PlaceConditions";
import { makeIsoDate } from "../simulation/dates";
import { lawInForceAtStart } from "../simulation/governing/law-in-force";
import { stateJurisdictionForKey } from "../simulation/life-places";
import {
  OUTCOME_LINKS,
  OUTCOME_WEB_CALIBRATED_AT,
  outcomeLinkStatus,
} from "../simulation/outcome-web";
import {
  PLACE_OUTCOME_BASES,
  PLACE_OUTCOME_MEASURES,
  type PlaceOutcomeRecord,
} from "../simulation/outcome-web/place-outcome-store";
import { STATES } from "../simulation/state-reference";
import type {
  EntityId,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../simulation/types";
import {
  lawConditionSentences,
  projectPlaceConditions,
  sponsoredLaws,
} from "./place-conditions";

/**
 * A law that moves one of a state's conditions shows on two screens: the
 * law's own page says what it is doing, and the state's conditions name it
 * beside what it moved. Each case draws its state from all 56 by its seed;
 * a state the conditions record holds no data for is skipped to the next.
 *
 * The world here is the records these screens read and nothing else, so the
 * reading is checked apart from the months that write them; the watched run
 * in the pull request shows the same screens on a world that ran.
 */

const MEASURE_ID = "legislative-measure_conditions" as EntityId;
const PERSON_ID = "person_reader" as EntityId;
const SPONSOR_ID = "person_sponsor" as EntityId;

function hash(text: string): number {
  let value = 2166136261;
  for (const char of text)
    value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return value >>> 0;
}

/** A state drawn by the seed, and a law on it that changes a kept condition. */
function worldWithLaw(seed: string) {
  const keys = Object.keys(STATES);
  for (let step = 0; step < keys.length; step += 1) {
    const usps = keys[(hash(seed) + step) % keys.length]!;
    const stateKey = `US-${usps}`;
    const state = stateJurisdictionForKey(stateKey)?.id;
    if (!state) continue;
    const link = OUTCOME_LINKS.find(
      (row) =>
        row.from.startsWith("law:") &&
        row.lagMonths === 0 &&
        outcomeLinkStatus(row) === "built" &&
        PLACE_OUTCOME_BASES[row.to]?.places[stateKey] !== undefined,
    );
    if (!link) continue;
    const stableKey = link.from.slice("law:".length);
    const questionId = `proposition:${stableKey}` as EntityId;
    const skeleton = {
      seed,
      currentDate: makeIsoDate("2028-03-01"),
      policyCatalog: {
        propositionOrder: [questionId],
        propositions: {
          [questionId]: {
            id: questionId,
            stableKey,
            name: "The question at hand",
          },
        },
      },
      history: {},
    } as unknown as World;
    const started = lawInForceAtStart(
      skeleton,
      state,
      questionId,
      OUTCOME_WEB_CALIBRATED_AT,
    );
    const answer = started === "yes" ? "no" : "yes";
    const measure: LegislativeMeasureRecord = {
      id: MEASURE_ID,
      stableKey: "test:conditions",
      sequence: 1,
      jurisdictionId: state,
      rulePackId: "test",
      designation: "H.B. 7",
      shortTitle: "The Conditions Act",
      summary: "A law on one question.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "house",
      sponsorPersonId: SPONSOR_ID,
      introducedAt: makeIsoDate("2026-02-01"),
      sourceDocumentKey: null,
      policyAlternativeIds: [],
      propositionIds: [questionId],
      propositionAnswers: [{ propositionId: questionId, answer }],
    };
    const enactment: LegislativeEnactmentRecord = {
      id: "legislative-enactment_conditions" as EntityId,
      stableKey: "test:conditions:enactment",
      sequence: 2,
      measureId: MEASURE_ID,
      resolvedAt: makeIsoDate("2026-06-01"),
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: makeIsoDate("2027-01-01"),
      outcomeEventId: "event_conditions" as EntityId,
    };
    const definition = PLACE_OUTCOME_BASES[link.to]!;
    const base = definition.places[stateKey]!;
    // Every kept condition for the state: flat, except the one the law moves.
    const month = (iso: string, moved: boolean) => ({
      month: makeIsoDate(iso),
      records: PLACE_OUTCOME_MEASURES.flatMap((key): PlaceOutcomeRecord[] => {
        const start = PLACE_OUTCOME_BASES[key]!.places[stateKey];
        if (start === undefined) return [];
        const factor = key === link.to && moved ? 0.8 : 1;
        return [
          {
            measure: key,
            placeKey: stateKey,
            jurisdictionId: state,
            month: makeIsoDate(iso),
            base: start,
            structural: start,
            multiplier: factor,
            value: start * factor,
            causes: factor === 1 ? [] : [{ key: link.key, factor }],
          },
        ];
      }),
    });
    const world = {
      ...skeleton,
      jurisdictions: {
        [state]: { id: state, name: STATES[usps]!.name },
      },
      people: {
        [PERSON_ID]: { id: PERSON_ID, homeJurisdictionId: state },
      },
      history: {
        legislativeMeasures: [measure],
        legislativeEnactments: [enactment],
      },
      placeOutcomes: {
        months: [
          month("2026-01-01", false),
          month("2027-01-01", false),
          month("2028-03-01", true),
        ],
      },
    } as unknown as World;
    return { world, link, state, stateKey, base, name: STATES[usps]!.name };
  }
  throw new Error("No state has a condition a law moves at once.");
}

describe("what a law does to the state, on screen", () => {
  for (const seed of ["place-conditions-1", "place-conditions-2"]) {
    const drawn = worldWithLaw(seed);
    const where = `${drawn.stateKey}, seed ${seed}`;

    it(`the law's page says what it did to the condition (${where})`, () => {
      const sentences = lawConditionSentences(drawn.world, MEASURE_ID, null);
      const name = PLACE_OUTCOME_BASES[drawn.link.to]!.name;
      const sentence = sentences.find((line) =>
        line.startsWith(`${name} in ${drawn.name}: `),
      );
      expect(sentence, sentences.join("\n")).toMatch(
        / when the law took effect, .* now\. This law (raises|lowers) it by about /,
      );
    });

    it(`the state's conditions name the law beside what it moved (${where})`, () => {
      const conditions = projectPlaceConditions(drawn.world, drawn.state)!;
      expect(conditions.placeName).toBe(drawn.name);
      // What a law moves comes first.
      const first = conditions.rows[0]!;
      expect(first.measure).toBe(drawn.link.to);
      expect(first.change).toBe("down");
      expect(first.causes).toEqual([
        {
          label: "The Conditions Act (H.B. 7)",
          direction: "lowered",
          size:
            PLACE_OUTCOME_BASES[drawn.link.to]!.scale === "level"
              ? expect.stringMatching(/^about 0\.2/)
              : "about 20%",
          law: true,
        },
      ]);
      // A condition nothing moved reads the same as it began.
      expect(conditions.rows.at(-1)!.change).toBe("steady");

      const html = renderToStaticMarkup(
        <PlaceConditionsPanel world={drawn.world} personId={PERSON_ID} />,
      );
      expect(html).toContain(`How ${drawn.name} is doing`);
      expect(html).toContain("by The Conditions Act (H.B. 7)");
    });
  }

  it("a lawmaker's record lists the law they wrote and what it is doing", () => {
    const drawn = worldWithLaw("place-conditions-1");
    const laws = sponsoredLaws(drawn.world, SPONSOR_ID, null);
    expect(laws).toHaveLength(1);
    expect(laws[0]).toMatchObject({
      measureId: MEASURE_ID,
      title: "The Conditions Act",
      designation: "H.B. 7",
      enactedLabel: "June 1, 2026",
    });
    expect(laws[0]!.effects.join(" ")).toMatch(/This law (raises|lowers) it by about/);
    // Someone who wrote no law has none listed.
    expect(sponsoredLaws(drawn.world, PERSON_ID, null)).toEqual([]);
  });

  it("a bill that is not law says nothing about conditions", () => {
    const { world } = worldWithLaw("place-conditions-1");
    expect(
      lawConditionSentences(
        world,
        "legislative-measure_none" as EntityId,
        null,
      ),
    ).toEqual([]);
  });
});

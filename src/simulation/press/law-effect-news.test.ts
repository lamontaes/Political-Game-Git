import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { searchLifePlaces } from "../life-places";
import {
  localOutcomeKey,
  placeOutcomeAt,
  placeOutcomesForMonth,
  type PlaceOutcomeRecord,
} from "../outcome-web/place-outcomes";
import { STATES } from "../state-reference";
import type {
  EntityId,
  IsoDate,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../types";
import { lawOutcomeFindings } from "./law-effect-news";

/*
 * A law that moves a place's outcome is news a year after it took effect,
 * and so is its repeal. One rule for all 56 places: a town in every state,
 * D.C. and territory passes the same ordinance. The world is partial and
 * unseeded, as in the outcome web's own city test, so nothing drifts and the
 * law acts at its central size.
 */

const OVERSIGHT = "proposition_civilian_oversight" as EntityId;
const OVERSIGHT_KEY =
  "us-policy-positions:justice-public-safety.civilian-oversight-of-police";
const CRIME = "crime.violent";

function ordinance(
  jurisdictionId: EntityId,
  tag: string,
  answer: "yes" | "no",
  effectiveAt: string,
  sequence: number,
): {
  measure: LegislativeMeasureRecord;
  enactment: LegislativeEnactmentRecord;
} {
  const id = `measure_${tag}_${sequence}` as EntityId;
  return {
    measure: {
      id,
      stableKey: `test:${tag}:${sequence}`,
      sequence,
      jurisdictionId,
      rulePackId: "test",
      designation: `ORD ${sequence}`,
      shortTitle: "Civilian Oversight of Police Ordinance",
      summary: "A test ordinance.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "council",
      sponsorPersonId: null,
      introducedAt: makeIsoDate("2026-01-10"),
      sourceDocumentKey: null,
      policyAlternativeIds: [],
      propositionIds: [OVERSIGHT],
      propositionAnswers: [{ propositionId: OVERSIGHT, answer }],
    },
    enactment: {
      id: `enactment_${tag}_${sequence}` as EntityId,
      stableKey: `test:${tag}:${sequence}:enactment`,
      sequence: 1000 + sequence,
      measureId: id,
      resolvedAt: makeIsoDate("2026-02-16"),
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: makeIsoDate(effectiveAt),
      outcomeEventId: `event_${tag}_${sequence}` as EntityId,
    },
  };
}

type Law = ReturnType<typeof ordinance>;

function worldWith(
  laws: readonly Law[],
  currentDate: string,
  months: readonly {
    month: IsoDate;
    records: readonly PlaceOutcomeRecord[];
  }[] = [],
): World {
  return {
    currentDate: makeIsoDate(currentDate),
    policyCatalog: {
      propositions: {
        [OVERSIGHT]: {
          id: OVERSIGHT,
          stableKey: OVERSIGHT_KEY,
          name: "Civilian oversight of police",
        },
      },
    },
    history: {
      legislativeMeasures: laws.map((law) => law.measure),
      legislativeEnactments: laws.map((law) => law.enactment),
    },
    placeOutcomes: { months },
  } as unknown as World;
}

/** The world on `on`, after its monthly passes from January 2026. */
function run(laws: readonly Law[], through: string, on: string): World {
  let world = worldWith(laws, on);
  let month = makeIsoDate("2026-01-01");
  while (month <= through) {
    const records = placeOutcomesForMonth(world, month);
    world = worldWith(laws, on, [
      ...(world.placeOutcomes?.months ?? []),
      { month, records },
    ]);
    const date = new Date(`${month}T00:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + 1);
    month = makeIsoDate(date.toISOString().slice(0, 10));
  }
  return world;
}

/** A town in each of the 56 places. */
const TOWNS = Object.keys(STATES).map((usps) => {
  const key = `US-${usps}`;
  const town = searchLifePlaces("", 5, {
    stateJurisdictionKey: key,
    scope: "locality",
  })[0]!;
  return { key, jurisdictionId: town.context.jurisdiction.id };
});

/**
 * Whether the outcome web itself shows the ordinance acting in the town that
 * month: its own record, moved. A town whose state keeps no crime base, D.C.
 * (no city under it), or a town the state does not let answer the question
 * has none.
 */
function actsIn(world: World, jurisdictionId: EntityId, on: string): boolean {
  const record = placeOutcomeAt(world, CRIME, jurisdictionId, makeIsoDate(on));
  return (
    record !== null &&
    record.placeKey === localOutcomeKey(jurisdictionId) &&
    record.multiplier !== 1
  );
}

describe("a law that moves a place's outcome is news a year on", () => {
  it("in every one of the 56 places, the ordinance's first year is reported, and its repeal's", () => {
    expect(TOWNS).toHaveLength(56);
    const enacted = TOWNS.map((town, index) =>
      ordinance(town.jurisdictionId, town.key, "yes", "2026-03-01", index + 1),
    );
    const repealed = TOWNS.map((town, index) =>
      ordinance(town.jurisdictionId, town.key, "no", "2027-09-01", index + 101),
    );
    const places = TOWNS.map((town) => town.jurisdictionId);

    // Before its anniversary, nothing.
    const early = run(enacted, "2027-02-01", "2027-02-20");
    expect(lawOutcomeFindings(early, places)).toEqual([]);

    const yearOn = run([...enacted, ...repealed], "2027-03-01", "2027-03-10");
    const found = lawOutcomeFindings(yearOn, places).filter(
      (finding) => finding.outcome === CRIME,
    );
    const acting = TOWNS.filter((town) =>
      actsIn(yearOn, town.jurisdictionId, "2027-03-01"),
    );
    for (const town of TOWNS) {
      const finding = found.find((row) => row.place === town.jurisdictionId);
      if (!acting.includes(town)) {
        expect(finding, town.key).toBeUndefined();
        continue;
      }
      expect(finding, town.key).toBeDefined();
      expect(finding!.answer).toBe("yes");
      expect(finding!.question).toBe("Civilian oversight of police");
      // Civilian oversight acts after 12 months: 2% less violent crime.
      expect(finding!.after / finding!.before).toBeCloseTo(0.98, 3);
    }
    expect(found.length).toBe(acting.length);
    // 32 of 56 towns may pass it and keep a crime record of their own.
    expect(found.length).toBeGreaterThan(20);

    // A year after the repeal took effect, the other way.
    const repealYear = run(
      [...enacted, ...repealed],
      "2028-09-01",
      "2028-09-10",
    );
    const undone = lawOutcomeFindings(repealYear, places).filter(
      (finding) => finding.outcome === CRIME,
    );
    expect(undone.length).toBe(found.length);
    for (const finding of undone) {
      expect(finding.answer).toBe("no");
      expect(finding.enactment.effectiveAt).toBe("2027-09-01");
      expect(finding.after / finding.before).toBeCloseTo(1 / 0.98, 3);
    }
  });

  it("a late sweep still finds it within the window, and not after", () => {
    const town = TOWNS.find((row) =>
      actsIn(
        run(
          [ordinance(row.jurisdictionId, row.key, "yes", "2026-03-01", 1)],
          "2027-03-01",
          "2027-03-10",
        ),
        row.jurisdictionId,
        "2027-03-01",
      ),
    )!;
    const law = ordinance(
      town.jurisdictionId,
      town.key,
      "yes",
      "2026-03-01",
      1,
    );
    const late = run([law], "2027-03-01", "2027-03-30");
    expect(lawOutcomeFindings(late, [town.jurisdictionId])).not.toEqual([]);
    const tooLate = run([law], "2027-04-01", "2027-04-05");
    expect(lawOutcomeFindings(tooLate, [town.jurisdictionId])).toEqual([]);
  });
});

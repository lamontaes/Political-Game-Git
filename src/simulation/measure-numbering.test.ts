import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  stateBillNumberingStyle,
  stateChamberStyle,
  templatePrefix,
} from "./bill-numbering-styles";
import {
  deriveStateBillNumberingStyle,
  type BillNumberingPeriodRow,
  type BillNumberingStartRow,
  type BillSampleRow,
} from "./bill-numbering-derivation";
import { STATE_BILL_NUMBERING_STYLES } from "./bill-numbering-styles.generated";
import { createStableId } from "./ids";
import { US_CONGRESS_PACK_ID, federalRulePackById } from "./congress-rule-pack";
import { introduceMeasure } from "./legislation";
import { legislatureForState } from "./legislature-game-profile";
import { rulePackById } from "./legislature-rule-packs";
import type { ChamberRule, LegislativeRulePack } from "./legislature-rules";
import {
  measureFullDesignation,
  nextMeasureNumbering,
  openingBillNumber,
} from "./measure-numbering";
import { STATES } from "./state-reference";
import type { IsoDate, Jurisdiction, World } from "./types";
import { makeIsoDate } from "./dates";
import { createWorld } from "./world";

/**
 * Decision OCD-LEG-NUM-001: bills are numbered the way they are in real life.
 * Every state, the District and Congress go through the one numbering path,
 * and these tests loop all of them.
 */

const OPENED_ON = makeIsoDate("2026-03-02");

function worldIn(slug: string, seed = "numbering-seed"): World {
  const id = createStableId("jurisdiction", slug);
  const jurisdiction: Jurisdiction = {
    id,
    slug,
    name: slug,
    kind: "state",
    parentName: null,
    provenance: {
      asOf: OPENED_ON,
      source: "Authored numbering fixture",
      jurisdiction: id,
      status: "placeholder",
    },
  };
  return createWorld({
    seed,
    currentDate: OPENED_ON,
    people: [],
    jurisdictions: [jurisdiction],
  });
}

let filed = 0;
function file(
  world: World,
  pack: LegislativeRulePack,
  chamber: ChamberRule,
): { world: World; designation: string; full: string; session: string } {
  const jurisdictionId = world.jurisdictionOrder[0]!;
  const numbering = nextMeasureNumbering(world, {
    jurisdictionId,
    originChamber: chamber,
    rulePackId: pack.packId,
  });
  filed += 1;
  const next = introduceMeasure(world, {
    stableKey: `numbering-test:${filed}`,
    jurisdictionId,
    rulePackId: pack.packId,
    ...numbering,
    shortTitle: "Numbering fixture",
    summary: "A bill filed only to take a number.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: chamber.chamberKey,
  });
  return {
    world: next,
    designation: numbering.designation,
    full: measureFullDesignation(next.history.legislativeMeasures!.at(-1)!),
    session: numbering.numberingSession.label,
  };
}

function on(world: World, date: string): World {
  return { ...world, currentDate: makeIsoDate(date) as IsoDate };
}

function numberOf(designation: string): number {
  // The last run of digits is the bill's own number ("HB25-7" is bill 7).
  return Number(/(\d+)$/.exec(designation)![1]);
}

// The fifty states: the ones the recorded samples and chamber corpus cover.
// The District and the territories number through their own bodies.
const STATE_KEYS = STATE_BILL_NUMBERING_STYLES.map(
  (style) => style.jurisdictionKey,
);

describe("the numbering style table", () => {
  it("is exactly what the recorded research says", () => {
    // Re-read the research the generator reads, through the same derivation,
    // and compare. A drifted table means the export needs rerunning.
    const root = resolve(import.meta.dirname, "../..");
    const corpus = JSON.parse(
      readFileSync(
        resolve(root, "data/source/state-legislatures/corpus.json"),
        "utf8",
      ),
    ) as {
      stateName: string;
      stateUsps: string;
      chambers?: {
        chamberKey: string;
        name?: { state?: string; value?: unknown };
      }[];
    }[];
    const research = JSON.parse(
      readFileSync(
        resolve(root, "data/research/bill-numbering-starts.json"),
        "utf8",
      ),
    ) as {
      starts: BillNumberingStartRow[];
      periods: BillNumberingPeriodRow[];
    };
    const derived = corpus
      .map((record) =>
        deriveStateBillNumberingStyle(
          `US-${record.stateUsps}`,
          JSON.parse(
            readFileSync(
              resolve(
                root,
                "data/research/bill-samples/state",
                `${record.stateName.toLowerCase().replace(/\s+/g, "-")}.json`,
              ),
              "utf8",
            ),
          ) as BillSampleRow[],
          (record.chambers ?? []).flatMap((chamber) =>
            chamber.name?.state === "KNOWN" &&
            typeof chamber.name.value === "string" &&
            chamber.chamberKey !== "legislature"
              ? [
                  {
                    role:
                      chamber.chamberKey === "senate"
                        ? ("upper" as const)
                        : ("lower" as const),
                    name: chamber.name.value,
                  },
                ]
              : [],
          ),
          research.starts,
          research.periods,
        ),
      )
      .sort((a, b) => a.jurisdictionKey.localeCompare(b.jurisdictionKey));
    expect(STATE_BILL_NUMBERING_STYLES).toEqual(derived);
  });

  it("covers all fifty states", () => {
    expect(STATE_KEYS).toHaveLength(50);
    for (const key of STATE_KEYS)
      expect(STATES[key.slice(3)], key).toBeDefined();
  });

  it("uses a prefix that appears in every state's recorded samples", () => {
    const dir = resolve(
      import.meta.dirname,
      "../../data/research/bill-samples/state",
    );
    const files = readdirSync(dir);
    for (const key of STATE_KEYS) {
      const usps = key.slice(3);
      const file = `${STATES[usps]!.name.toLowerCase().replace(/\s+/g, "-")}.json`;
      expect(files, key).toContain(file);
      const numbers = (
        JSON.parse(readFileSync(resolve(dir, file), "utf8")) as {
          bill_number: string;
        }[]
      ).map((row) => row.bill_number);
      const style = stateBillNumberingStyle(key);
      for (const chamber of [style.lower, style.upper]) {
        if (chamber.templateBasis !== "recorded") continue;
        const prefix = templatePrefix(chamber.template);
        expect(
          numbers.some((number) => number.includes(prefix)),
          `${key} ${chamber.template}`,
        ).toBe(true);
      }
    }
  });

  it("gives the named examples their real prefixes and chamber names", () => {
    const ca = stateBillNumberingStyle("US-CA");
    expect([ca.lower.template, ca.lower.name]).toEqual(["AB {n}", "Assembly"]);
    expect(stateBillNumberingStyle("US-MN").lower.template).toBe("HF {n}");
    expect(stateBillNumberingStyle("US-IA").upper.template).toBe("SF {n}");
    expect(stateBillNumberingStyle("US-NY").lower.template).toBe("A{n}");
    expect(stateBillNumberingStyle("US-NE").lower.template).toBe("LB {n}");
    for (const key of ["US-VA", "US-WV"])
      expect(stateBillNumberingStyle(key).lower.name).toBe(
        "House of Delegates",
      );
  });
});

describe("bill numbers restart every session, in every state", () => {
  for (const key of STATE_KEYS) {
    it(`${key} numbers by its own session`, () => {
      const pack = legislatureForState(key)!;
      expect(pack, key).not.toBeNull();
      const style = stateBillNumberingStyle(key);
      for (const chamber of pack.chambers) {
        let world = worldIn(key.toLowerCase());
        const chamberStyle = stateChamberStyle(style, chamber.chamberKey);
        const expectedPrefix = templatePrefix(chamberStyle.template);
        // OCD-LEG-NUM-002: a regular session starts at the chamber's recorded
        // first number, or at 1 where none is recorded.
        const startOf = (openingYear: number) =>
          openingYear % 2 === 0
            ? (chamberStyle.evenYearFirstNumber ?? chamberStyle.firstNumber)
            : chamberStyle.firstNumber;
        const openingOf = (year: number) =>
          style.period === "biennial" &&
          (year % 2 === 0) !== (style.biennialOpensIn === "even")
            ? year - 1
            : year;
        // The pack names its chambers the way the numbering does.
        expect(chamber.billDesignationPrefix, key).toBe(expectedPrefix);

        // The opening session starts partway up and counts on from there.
        const first = file(world, pack, chamber);
        world = first.world;
        const second = file(world, pack, chamber);
        world = second.world;
        expect(first.designation.startsWith(expectedPrefix), key).toBe(true);
        expect(numberOf(first.designation)).toBeGreaterThanOrEqual(
          startOf(openingOf(2026)) + 11,
        );
        expect(numberOf(second.designation)).toBe(
          numberOf(first.designation) + 1,
        );
        expect(first.full).toContain(first.session);

        // A biennial legislature's second year keeps counting; an annual one
        // starts over.
        const nextYear = file(on(world, "2027-01-15"), pack, chamber);
        const opening =
          style.period === "biennial" && style.biennialOpensIn === "even";
        if (opening) {
          expect(numberOf(nextYear.designation), key).toBe(
            numberOf(second.designation) + 1,
          );
        } else {
          expect(numberOf(nextYear.designation), key).toBe(startOf(2027));
          expect(nextYear.session, key).not.toBe(first.session);
        }

        // Every later session starts at its first number, and the new
        // session is in the name.
        const later = file(on(nextYear.world, "2029-01-15"), pack, chamber);
        const laterStart = startOf(openingOf(2029));
        expect(numberOf(later.designation), key).toBe(laterStart);
        expect(later.full).toMatch(/\(20\d\d(-20\d\d)? Regular Session\)$/);
        const followed = file(later.world, pack, chamber);
        expect(numberOf(followed.designation), key).toBe(laterStart + 1);

        // A filed bill keeps its designation.
        expect(
          followed.world.history.legislativeMeasures!.map(
            (measure) => measure.designation,
          ),
        ).toEqual([
          first.designation,
          second.designation,
          nextYear.designation,
          later.designation,
          followed.designation,
        ]);
      }
    });
  }

  it("names the session the way the decision shows", () => {
    const pack = legislatureForState("US-KY")!;
    const house = pack.chambers.find(
      (chamber) => chamber.chamberKey === "house",
    )!;
    const later = file(on(worldIn("us-ky"), "2027-01-06"), pack, house);
    expect(later.full).toBe("HB 1 (2027 Regular Session)");
  });

  it("carries Colorado's session year inside the number", () => {
    const pack = legislatureForState("US-CO")!;
    const house = pack.chambers.find(
      (chamber) => chamber.chamberKey === "house",
    )!;
    const later = file(on(worldIn("us-co"), "2027-01-13"), pack, house);
    expect(later.designation).toBe("HB27-1001");
  });

  it("starts where the state's rules say and keeps counting through a stated biennium", () => {
    const wa = legislatureForState("US-WA")!;
    const senate = wa.chambers.find(
      (chamber) => chamber.chamberKey === "senate",
    )!;
    const opened = file(on(worldIn("us-wa"), "2027-01-11"), wa, senate);
    expect(opened.designation).toBe("SB 5000");
    // Washington numbers by the biennium, so 2028 continues 2027's run.
    const secondYear = file(on(opened.world, "2028-01-12"), wa, senate);
    expect(secondYear.designation).toBe("SB 5001");

    const ks = legislatureForState("US-KS")!;
    const house = ks.chambers.find(
      (chamber) => chamber.chamberKey === "house",
    )!;
    const kansas = file(on(worldIn("us-ks"), "2027-01-11"), ks, house);
    expect(kansas.designation).toBe("HB 2001");
    const kansasNext = file(on(kansas.world, "2028-01-08"), ks, house);
    expect(kansasNext.designation).toBe("HB 2002");

    // A start that was only inferred stays at 1.
    const ri = legislatureForState("US-RI")!;
    const riHouse = ri.chambers.find(
      (chamber) => chamber.chamberKey === "house",
    )!;
    expect(
      numberOf(
        file(on(worldIn("us-ri"), "2027-01-05"), ri, riHouse).designation,
      ),
    ).toBe(1);
  });

  it("opens where the legislature's own filing pace has reached, whatever the seed", () => {
    const pack = legislatureForState("US-OH")!;
    const house = pack.chambers[0]!;
    // The seed plays no part: the count is Ohio's, not a draw.
    expect(file(worldIn("us-oh", "a"), pack, house).designation).toBe(
      file(worldIn("us-oh", "b"), pack, house).designation,
    );
    // Ohio introduced 317 bills in its 2022 session (The Book of the
    // States 2023, Table 3.19), half to each chamber.
    expect(openingBillNumber("US-OH", 2, "2026-01-01")).toBe(1);
    expect(openingBillNumber("US-OH", 2, "2026-07-02")).toBe(
      1 + Math.floor((317 / 2) * (182 / 365)),
    );
    // A legislature the table does not count takes the middle state's pace.
    expect(openingBillNumber(null, 1, "2026-07-02")).toBeGreaterThan(1);
  });

  it("continues an opening session from its own highest number", () => {
    const pack = legislatureForState("US-OH")!;
    const house = pack.chambers[0]!;
    const first = file(worldIn("us-oh"), pack, house);
    const [measure] = first.world.history.legislativeMeasures!;
    // A bill filed under an earlier opening rule, numbered far up.
    const earlier = { ...measure!, designation: "HB 412" };
    const next = file(
      {
        ...first.world,
        history: { ...first.world.history, legislativeMeasures: [earlier] },
      },
      pack,
      house,
    );
    expect(next.designation).toBe("HB 413");
  });

  it("places a bill saved before sessions were recorded in its own session", () => {
    const pack = legislatureForState("US-KY")!;
    const house = pack.chambers[0]!;
    const first = file(worldIn("us-ky"), pack, house);
    const [measure] = first.world.history.legislativeMeasures!;
    const legacy = { ...measure! };
    delete (legacy as { numberingSession?: unknown }).numberingSession;
    const legacyWorld: World = {
      ...first.world,
      history: { ...first.world.history, legislativeMeasures: [legacy] },
    };
    expect(measureFullDesignation(legacy)).toBe(legacy.designation);
    const next = file(legacyWorld, pack, house);
    expect(numberOf(next.designation)).toBe(numberOf(first.designation) + 1);
  });
});

describe("Congress and the District number within their own terms", () => {
  it("restarts with each Congress and names it", () => {
    const pack = federalRulePackById(US_CONGRESS_PACK_ID)!;
    const house = pack.chambers.find(
      (chamber) => chamber.chamberKey === "house",
    )!;
    const senate = pack.chambers.find(
      (chamber) => chamber.chamberKey === "senate",
    )!;
    let world = worldIn("united-states");
    const opening = file(world, pack, house);
    expect(opening.full).toMatch(/^H\.R\. \d+, 119th Congress$/);
    world = on(opening.world, "2027-01-04");
    const hr = file(world, pack, house);
    expect(hr.full).toBe("H.R. 1, 120th Congress");
    expect(file(hr.world, pack, senate).full).toBe("S. 1, 120th Congress");
  });

  it("numbers the District's bills by council period", () => {
    const pack = rulePackById("us-dc-washington-council-v1");
    const council = pack.chambers[0]!;
    const later = file(
      on(worldIn("district-of-columbia"), "2027-01-05"),
      pack,
      council,
    );
    expect(later.designation).toBe("B27-0001");
    expect(later.full).toBe("B27-0001");
    const opening = file(worldIn("district-of-columbia"), pack, council);
    expect(opening.designation).toMatch(/^B26-0\d{3}$/);
  });
});

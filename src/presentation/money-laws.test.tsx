import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MoneyLawsPanel } from "../player/MoneyLaws";
import { makeIsoDate } from "../simulation/dates";
import { stateJurisdictionForKey } from "../simulation/life-places";
import { STATES } from "../simulation/state-reference";
import type {
  EntityId,
  LawExposureRecord,
  LegislativeMeasureRecord,
  World,
} from "../simulation/types";
import { projectMoneyLaws } from "./money-laws";

/**
 * Money and property reads the law exposures a law wrote when it reached
 * someone's money. The world here is those records and nothing else, so the
 * reading is checked apart from the paydays that write them; the watched run
 * in the pull request shows the same lines on a world that ran. The place is
 * drawn from all 56 by the seed.
 */

const id = (text: string) => text as EntityId;
const PLAYER = id("person_player");
const MEASURE = id("measure_wage");

function hash(text: string): number {
  let value = 2166136261;
  for (const char of text)
    value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return value >>> 0;
}

function drawnState(seed: string) {
  const keys = Object.keys(STATES);
  for (let step = 0; step < keys.length; step += 1) {
    const usps = keys[(hash(seed) + step) % keys.length]!;
    const state = stateJurisdictionForKey(`US-${usps}`);
    if (state) return { id: state.id, name: STATES[usps]!.name, usps };
  }
  throw new Error("No state jurisdiction on file.");
}

let sequence = 0;
function exposure(
  personId: EntityId,
  minorUnits: number | null,
  overrides: Partial<LawExposureRecord> = {},
): LawExposureRecord {
  sequence += 1;
  return {
    id: id(`exposure_${sequence}`),
    stableKey: `test:exposure:${sequence}`,
    sequence,
    recordedAt: makeIsoDate("2027-05-07"),
    personId,
    measureId: MEASURE,
    sectionKey: null,
    channel: "paycheck",
    relation: "own",
    viaPersonId: null,
    direction: minorUnits === null ? "none" : "gain",
    amount: minorUnits === null ? null : { minorUnits, currency: "USD" },
    cadence: minorUnits === null ? null : "monthly",
    monthlyPay: { minorUnits: 250_000, currency: "USD" },
    sourceRecordId: id(`source_${sequence}`),
    ...overrides,
  } as LawExposureRecord;
}

function world(seed: string, exposures: readonly LawExposureRecord[]) {
  const home = drawnState(seed);
  const elsewhere = id("jurisdiction_elsewhere");
  const person = (personId: EntityId, where: EntityId, givenName: string) => ({
    id: personId,
    givenName,
    homeJurisdictionId: where,
  });
  const measure: Partial<LegislativeMeasureRecord> = {
    id: MEASURE,
    shortTitle: "Raise the Wage Act",
    designation: "H.R. 3",
  };
  return {
    home,
    world: {
      currentDate: makeIsoDate("2028-01-01"),
      jurisdictions: {
        [home.id]: { id: home.id, name: home.name },
        [elsewhere]: { id: elsewhere, name: "Elsewhere" },
      },
      people: {
        [PLAYER]: person(PLAYER, home.id, "Pat"),
        [id("person_a")]: person(id("person_a"), home.id, "Ana"),
        [id("person_b")]: person(id("person_b"), home.id, "Ben"),
        [id("person_far")]: person(id("person_far"), elsewhere, "Far"),
      },
      history: {
        legislativeMeasures: [measure],
        lawExposures: exposures,
      },
    } as unknown as World,
  };
}

describe("Money and property says what new laws did to money", () => {
  it("preserves a recorded candidacy cost without inventing a monetary sum", () => {
    const { world: drawn, home } = world("election-law-summary", [
      exposure(id("person_a"), null, {
        channel: "election-rule",
        direction: "cost",
      }),
    ]);
    const electionWorld = {
      ...drawn,
      history: {
        ...drawn.history,
        legislativeMeasures: drawn.history.legislativeMeasures!.map(
          (measure) => ({
            ...measure,
            shortTitle: "Council Term Limits",
            designation: "Ordinance 3",
          }),
        ),
      },
    };
    const summary = projectMoneyLaws(electionWorld, PLAYER)!;
    expect(summary.town.map((line) => line.text)).toEqual([
      `The Council Term Limits (Ordinance 3) prevented 1 person in ${home.name} from seeking another term.`,
    ]);
  });

  for (const seed of ["money-laws-1", "money-laws-2"]) {
    it(`sums each resident once, leaves out other places, and lists the player's own (seed ${seed})`, () => {
      const { world: drawn, home } = world(seed, [
        exposure(PLAYER, 22_880),
        exposure(id("person_a"), 10_000),
        // The same worker reached twice counts once, at the latest amount.
        exposure(id("person_b"), 5_000),
        exposure(id("person_b"), 6_000, {
          recordedAt: makeIsoDate("2027-05-14"),
        }),
        // A family copy of Ana's raise is not a second person.
        exposure(PLAYER, 10_000, {
          relation: "family",
          viaPersonId: id("person_a"),
        }),
        exposure(id("person_far"), 99_900),
        // Not yet happened on the date read.
        exposure(id("person_a"), 1, { recordedAt: makeIsoDate("2029-01-01") }),
      ]);
      const laws = projectMoneyLaws(drawn, PLAYER)!;
      expect(laws.placeName).toBe(home.name);
      expect(laws.empty).toBeNull();
      expect(laws.town.map((line) => line.text)).toEqual([
        `The Raise the Wage Act (H.R. 3) added $388.80 a month to the pay of 3 people in ${home.name}.`,
      ]);
      expect(laws.yours.map((line) => line.text)).toEqual([
        // Newest first; on one day, the later record first.
        "The Raise the Wage Act added $100 a month to Ana's paycheck, about 4% of a month's pay.",
        "The Raise the Wage Act added $228.80 a month to your paycheck, about 9% of a month's pay.",
      ]);
      expect(laws.yours[0]!.dateLabel).toBe("May 7, 2027");

      const html = renderToStaticMarkup(
        <MoneyLawsPanel
          world={drawn}
          personId={PLAYER}
          onOpenMeasure={() => {}}
        />,
      );
      expect(html).toContain("What new laws did to money");
      expect(html).toContain(`In ${home.name}`);
      expect(html).toContain(`data-testid="money-law-${MEASURE}"`);
    });
  }

  it("claims no sum when amounts are missing, and says so when nothing reached anyone", () => {
    const { world: mixed, home } = world("money-laws-3", [
      exposure(id("person_a"), 10_000),
      exposure(id("person_b"), null, { direction: "gain" }),
    ]);
    const town = projectMoneyLaws(mixed, PLAYER)!.town.map((line) => line.text);
    expect(town).toContain(
      `The Raise the Wage Act (H.R. 3) added $100 a month to the pay of 1 person in ${home.name}.`,
    );
    expect(town).toContain(
      `The Raise the Wage Act (H.R. 3) changed the pay of 1 person in ${home.name}.`,
    );

    const { world: quiet } = world("money-laws-3", []);
    expect(projectMoneyLaws(quiet, PLAYER)!.empty).toBe(
      `No new law has reached anyone's money in ${home.name} yet.`,
    );
  });
});

import { describe, expect, it } from "vitest";
import { TOWN_PAY_PERCENTILES } from "../../simulation/living-world/town-pay.generated";
import {
  townJobRate as legacyTownJobRate,
  townPayAreas,
  townPayPercentile as legacyTownPayPercentile,
  townMinimumHourly,
} from "../../simulation/living-world/town-pay";
import { TOWN_JOB_SOC } from "../../simulation/living-world/town-job-soc";
import { stateJurisdictionForKey } from "../../simulation/life-places";
import { STATES } from "../../simulation/state-reference";
import {
  interpolateAnnualWage,
  townJobRate,
  townPayPercentile,
  type WageAreaRow,
} from "./town-pay";

const occupation = "occupation:office-clerk";

function wageRowsForAreas(areas: readonly string[]): readonly WageAreaRow[] {
  const soc = TOWN_JOB_SOC[occupation];
  const entry = TOWN_PAY_PERCENTILES.split(";").find((row) =>
    row.startsWith(`${soc}=`),
  );
  if (!entry) return [];
  const byArea = new Map(
    entry
      .slice(soc.length + 1)
      .split(",")
      .map((cell) => {
        const [area, values] = cell.split(":") as [string, string];
        return [
          area,
          values
            .split("/")
            .map((value) => (value === "" ? null : Number(value))),
        ] as const;
      }),
  );
  return areas.flatMap((area) => {
    const annualWageByPercentile = byArea.get(area);
    return annualWageByPercentile ? [{ area, annualWageByPercentile }] : [];
  });
}

describe("standalone town pay rules", () => {
  it.each([-1, 0, 5, 10, 20, 40])(
    "matches legacy tenure percentile at %s years",
    (tenureYears) => {
      expect(townPayPercentile(tenureYears)).toBe(
        legacyTownPayPercentile(tenureYears, 0.93),
      );
    },
  );

  it.each(Object.keys(STATES).map((usps) => `US-${usps}`))(
    "matches legacy occupation pay in %s",
    (key) => {
      const place = stateJurisdictionForKey(key)!;
      const areas = townPayAreas(place.id);
      const minimumHourly = townMinimumHourly(place.id);
      const wageRows = wageRowsForAreas(areas);
      for (const tenureYears of [0, 10, 20]) {
        const percentile = townPayPercentile(tenureYears);
        expect(
          townJobRate({
            soc: TOWN_JOB_SOC[occupation] ?? null,
            orderedAreas: areas,
            wageRows,
            percentile,
            minimumHourly,
          }),
          `${key}, ${tenureYears} years`,
        ).toEqual(
          legacyTownJobRate(occupation, place.id, percentile, minimumHourly),
        );
      }
    },
  );

  it("keeps withheld adjacent percentiles unavailable", () => {
    expect(interpolateAnnualWage([100, null, 300, 400, 500], 35)).toBeNull();
    expect(interpolateAnnualWage([100, 200, 300, 400, 500], 35)).toBe(240);
  });
});

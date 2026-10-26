/**
 * Personality in the daily chooser (life family): whether a person spends
 * part of a day seeing someone they know. A place drawn from all 56 from a
 * fresh seed, every resident a full person, played the 60 days around its
 * next race. Each pick that offered a visit is read with and without the
 * trait term; the third leaning most toward a visit chooses one at the odds
 * Newton et al. (2018) give extraversion over the third leaning least, net of
 * the picks with temperament left out.
 */
import { drawPlace } from "../../tests/golden-path/place";
import { beforeAll, describe, expect, it } from "vitest";
import { drawnRaceWorld, RUN_SEED, studyLogOdds } from "./trait-test-kit";
import type { ChooserProbeRow } from "./trait-probe";

const SEED = `${RUN_SEED}:life-daily-act`;
const VISIT = "contact-known-person";
const DAYS = 60;
// Fewer picks than this leave the thirds' gap mostly noise: at the weight,
// four drawn towns with 697 to 1,223 picks sat at 0.42 to 0.60 against the
// study's 0.43, while two with 204 and 332 sat at 0.33 and 1.03 (Franktown,
// Virginia and Hartland Colony, Montana).
const MIN_PICKS = 600;

const picks: { lean: number; chose: number; flat: number }[] = [];

beforeAll(() => {
  drawnRaceWorld(
    (attempt) => {
      picks.length = 0;
      const seed = `${SEED}:${attempt}`;
      return { seed, place: drawPlace(seed, "trait-wiring") };
    },
    DAYS,
    undefined,
    2,
    // A town whose days offered nobody a visit leaves nothing to read.
    () =>
      picks.length > MIN_PICKS ? null : `${picks.length} picks offered a visit`,
    undefined,
    (row: ChooserProbeRow) => {
      const i = row.actionIds.indexOf(VISIT);
      if (i < 0) return;
      picks.push({
        lean: row.leans[i]!,
        chose: row.chosen.startsWith(VISIT) ? 1 : 0,
        flat: row.withoutTrait.startsWith(VISIT) ? 1 : 0,
      });
    },
  );
  // Reason for the hook's time: every resident of the drawn place is a full person, played two months around its next race, 1 to 4 minutes on a shared machine.
}, 900_000);

describe("life.daily-act reads extraversion at the study's size", () => {
  it("the third leaning most toward a visit sees someone at the study's odds over the third leaning least, net of the picks with temperament left out", () => {
    expect(picks.length, "picks that offered a visit").toBeGreaterThan(
      MIN_PICKS,
    );
    const sorted = [...picks].sort((a, b) => a.lean - b.lean);
    const third = Math.floor(sorted.length / 3);
    const logOdds = (part: typeof sorted, key: "chose" | "flat") => {
      const rate =
        (part.reduce((n, row) => n + row[key], 0) + 0.5) / (part.length + 1);
      return Math.log(rate / (1 - rate));
    };
    const low = sorted.slice(0, third),
      high = sorted.slice(-third);
    const net =
      logOdds(high, "chose") -
      logOdds(low, "chose") -
      (logOdds(high, "flat") - logOdds(low, "flat"));
    const target = studyLogOdds("life.daily-act", "extraversion")!;
    console.log(
      `life.daily-act: ${picks.length} picks offering a visit; net log odds ${net.toFixed(3)} against the study's ${target.toFixed(3)}`,
    );
    expect(net).toBeGreaterThan(target / 2);
    expect(net).toBeLessThan(target * 2);
  });
});

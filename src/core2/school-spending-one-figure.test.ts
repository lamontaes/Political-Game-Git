/**
 * One spending-per-student figure (docs/design/output-numbers.md, build
 * order 6). The school engine writes it once a school year
 * (recordSchoolSpending); the outcome web keeps none of its own; the
 * registry's year row (`school.spending-per-student`) holds the same value
 * with the students and the money behind it, and `school.students` the same
 * count. Played in the bench world for a year in two places drawn from all 56
 * on a seed nobody chose; a drawn place with no city or county schools line
 * is passed over, by name, for the next draw.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { budgetsOf, governments } from "./modules/budgets";
import { placeOutcome } from "./modules/outcome-web";
import { OUTPUT_NUMBERS_MODULE_ID, yearRowId } from "./output-numbers";
import type { OutputYearRow } from "./output-numbers";
import { SCHOOL_MODULE_ID, type SchoolMeasureRow } from "./school-measures";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed = process.env.SCHOOL_FIGURE_SEED || randomBytes(8).toString("hex");
const MEASURE = "school.spending-per-student";
const PLACES = 2;
const ATTEMPTS = 8;

function play(drawn: ReturnType<typeof drawPlace>) {
  const opening = gameStartDate();
  const built = buildBenchWorld(drawn.seed, opening, {
    twoLevel: true,
    placeKey: drawn.key,
  });
  const core = built.core as CoreState;
  const api = coreAPI(core);
  const hasLine = governments(api)
    .filter((g) => g.level === "city" || g.level === "county")
    .flatMap((g) => budgetsOf(api, g.id))
    .some((b) => b.spendingMinor["schools"]);
  if (!hasLine) return { skip: "no city or county schools line" as const };
  let day = makeIsoDate(opening);
  const end = addDays(day, 365);
  while (day < end) {
    day = addDays(day, 1);
    advanceCore(core, day);
  }
  return { core, placeId: built.placeId };
}

describe(`one school spending figure (seed ${seed})`, () => {
  it("is one row the registry and the web agree on", () => {
    const passedOver: string[] = [];
    let shown = 0;
    for (let i = 0; i < ATTEMPTS && shown < PLACES; i += 1) {
      const drawn = drawPlace(`${seed}:${i}`, "school-one-figure");
      const where = `${drawn.name} (${drawn.key}), seed ${drawn.seed}`;
      const played = play(drawn);
      if ("skip" in played) {
        passedOver.push(`${where}: ${played.skip}`);
        continue;
      }
      const { core, placeId } = played;
      const api = coreAPI(core);
      const row = (
        api
          .moduleState(SCHOOL_MODULE_ID)
          .table("measures")
          .rows() as unknown as SchoolMeasureRow[]
      ).find((m) => m.measure === MEASURE);
      if (!row) {
        passedOver.push(`${where}: no spending row in the year played`);
        continue;
      }
      shown += 1;
      // The web keeps no spending figure of its own.
      expect(placeOutcome(api, row.placeId, MEASURE), where).toBeUndefined();
      // The registry's year row holds the school row's value and its students.
      const years = api.moduleState(OUTPUT_NUMBERS_MODULE_ID).table("years");
      const kept = years.get(
        yearRowId(row.placeId, Number(row.date.slice(0, 4))),
      ) as OutputYearRow | undefined;
      expect(kept, `${where}: year row`).toBeDefined();
      expect(kept!.schoolSpendingPerStudent, where).toBe(row.value);
      expect(kept!.schoolStudents, where).toBe(row.students);
      // Trace: the money over the people behind the figure.
      const inputs = kept!.inputs?.[MEASURE];
      expect(inputs, `${where}: trace inputs`).toBeDefined();
      expect(inputs!.measureId, where).toBe(row.id);
      expect(inputs!.students, where).toBe(Math.round(row.students));
      const rebuilt =
        ((inputs!.schoolsPerResident as number) *
          (inputs!.residents as number)) /
        (inputs!.students as number);
      expect(
        Math.abs(rebuilt - row.value) / row.value,
        `${where}: figure = money per resident x residents / students`,
      ).toBeLessThan(0.02);
      console.log(
        `one figure: ${where}: $${Math.round(row.value)} a student over ${Math.round(row.students)} students and ${Math.round(inputs!.residents as number)} residents (place ${placeId})`,
      );
    }
    expect(
      shown,
      `places with a spending row; passed over: ${passedOver.join("; ")}`,
    ).toBe(PLACES);
  }, 900_000);
});

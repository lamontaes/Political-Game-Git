import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import termStarts from "./data/elections/term-starts.json" with { type: "json" };
import { gameStartDate } from "./game-start";
import { OFFICES_MODULE_ID } from "./modules/offices";
import { placeLocalities } from "./places";
import { coreAPI } from "./state";

// A governor's past terms start on the state's own clause day, each in its
// own year, and each ends the day the next begins (gov-past-term-starts-by-rule).
// The place is drawn from the states whose clause is read, the only ones with
// a clause day to check.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
type Rule = { month: number; weekday: number; offsetDays: number };
const read = Object.entries(
  termStarts.states as Record<string, { statewideExecutive?: { rule: Rule } }>,
)
  .filter(([, rows]) => rows.statewideExecutive)
  .sort(([a], [b]) => a.localeCompare(b));
const hash = createHash("sha256")
  .update(`${seed}:term-start-history`)
  .digest("hex");
const [state, rows] = read[parseInt(hash.slice(0, 8), 16) % read.length]!;
const localities = [...placeLocalities(state)].sort((a, b) =>
  a.key.localeCompare(b.key),
);
const locality =
  localities[parseInt(hash.slice(8, 16), 16) % localities.length]!;

it(`a governor's terms in ${locality.displayName}, ${state} chain on the state's clause day, seed ${seed}`, () => {
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: locality.key,
  });
  const where = `${locality.displayName} [${locality.key}], seed ${seed}`;
  const rule = rows.statewideExecutive!.rule;
  const terms = (
    coreAPI(core)
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .rows() as unknown as {
      id: string;
      startDate: string;
      endDate: string | null;
    }[]
  )
    .filter((t) => /:governor:/.test(t.id) && t.endDate)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  expect(terms.length, where).toBeGreaterThan(0);
  for (const [i, term] of terms.entries()) {
    const day = new Date(`${term.startDate}T00:00:00Z`);
    expect(day.getUTCMonth() + 1, `${term.id} in ${where}`).toBe(rule.month);
    expect(day.getUTCDay(), `${term.id} in ${where}`).toBe(
      (rule.weekday + rule.offsetDays) % 7,
    );
    if (i > 0)
      expect(terms[i - 1]!.endDate, `${term.id} in ${where}`).toBe(
        term.startDate,
      );
  }
  // 600 s: the test builds one full world (about 43 s of its 86 s run on Oct 20); the rest of the margin is for the slowest drawn state.
}, 600000);

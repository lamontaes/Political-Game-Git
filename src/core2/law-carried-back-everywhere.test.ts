// @vitest-environment node
/**
 * A law recorded only from a later date is in force from the world's first day at that phase's
 * terms, in every state, by one rule. Before Nov 10, 2026 the rule ran for the played town's own
 * state alone: every other state went through 2025 with no unemployment insurance (53 of them),
 * no corporate income tax (50), no minimum wage of its own (23) and, in the five territories, no
 * income or sales tax, and got them all on January 1, 2026. The country tier then saw a
 * territory's revenue nearly double in a year.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { startingLawReader } from "./country-law";
import startingLaw from "./data/laws/starting-law.json" with { type: "json" };
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import type { LawInForceAnswer } from "./laws-in-force";
import { lawChain, stateLawInForce } from "./modules/laws";
import { coreAPI } from "./state";

const SERIES = [
  "income-tax",
  "sales-tax",
  "minimum-wage",
  "corporate-income-tax",
  "unemployment-insurance",
];
const STATES = Object.keys(
  (startingLaw as unknown as { jurisdictions: Record<string, unknown> })
    .jurisdictions,
).filter((key) => /^US-[A-Z]{2}$/.test(key));
const start = gameStartDate();
/** Well after every first phase the research records has begun. */
const later = addDays(makeIsoDate(start), 540);
const stateRow = (answer: LawInForceAnswer) => {
  const found = answer.levels.find((row) => row.level === "state");
  return found?.row && !found.setAside ? found.row : null;
};

/** The states and series with a state law later and none on the first day. */
function missingAtStart(
  first: (stateKey: string, series: string) => LawInForceAnswer,
  then: (stateKey: string, series: string) => LawInForceAnswer,
): string[] {
  const out: string[] = [];
  for (const key of STATES)
    for (const series of SERIES)
      if (stateRow(then(key, series)) && !stateRow(first(key, series)))
        out.push(`${key} ${series}`);
  return out;
}

describe("a law recorded from a later date is in force from the first day, in every state", () => {
  it("holds all 56 jurisdictions", () => {
    expect(STATES).toHaveLength(56);
  });

  it("in the starting law a world without the laws engine reads", () => {
    const missing = missingAtStart(
      startingLawReader(start, start),
      startingLawReader(later, start),
    );
    expect(missing, `${missing.length} missing on ${start}`).toEqual([]);
    // The rule is what closes the gap: without the first day given, the gap is there.
    expect(
      missingAtStart(startingLawReader(start, later), startingLawReader(later))
        .length,
    ).toBeGreaterThan(100);
  });

  const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
  const place = drawPlace(replay, "law-carried-back-everywhere");
  it(
    `in a played world, for the states that are not the town's own: ${place.name}, replay ${replay}`,
    { timeout: 600_000 },
    () => {
      const bookkeeping = setBookkeeping(false);
      try {
        const world = buildBenchWorld(place.seed, gameStartDate(), {
          placeKey: place.key,
          twoLevel: true,
        });
        const api = coreAPI(world.core);
        const home = lawChain(api).stateKey;
        const where = `${place.name} (${place.key}), seed ${place.seed}, home ${home}`;
        const missing = missingAtStart(
          (key, series) => stateLawInForce(api, key, series, api.state.date),
          (key, series) => stateLawInForce(api, key, series, later),
        );
        expect(missing, `${where}: ${missing.length} missing`).toEqual([]);
        // The first day's terms are the first recorded phase's own.
        const other = STATES.find((key) => key !== home && key !== "US-TX")!;
        for (const series of SERIES) {
          const first = stateRow(stateLawInForce(api, other, series));
          const then = stateRow(stateLawInForce(api, other, series, later));
          if (first && then && first.id !== then.id)
            process.stdout.write(
              `LAW-FROM-START ${where}: ${other} ${series} reads ${JSON.stringify(first.value)} on the first day (${first.id}) and ${JSON.stringify(then.value)} later (${then.id})\n`,
            );
        }
      } finally {
        setBookkeeping(bookkeeping);
      }
    },
  );
});

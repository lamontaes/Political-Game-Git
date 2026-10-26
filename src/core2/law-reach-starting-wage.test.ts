/**
 * A state whose researched answer to "raise the minimum wage" is yes at the
 * opening already has the wage it researched: the answer describes the law
 * in force, so the opening raises nothing (audit, Maine and South Dakota: a
 * $15 wage took effect the day after the opening with no bill).
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { placeLocalities } from "./places";
import { LAWS_MODULE_ID, lawInForce } from "./modules/laws";
import { POLICY_QUESTIONS } from "./policy-answers";
import { addDays, makeIsoDate } from "./kernel/dates";
import type { LawRowInput } from "./laws-starting";

const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`starting-wage:${Date.now()}`).digest("hex");
const KEY = "us-policy-positions:labor-workforce.raise-minimum-wage";
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}

describe("the opening's researched minimum wage", () => {
  it("stands: a researched yes on raising it raises nothing at the opening", () => {
    const states = Object.entries(POLICY_QUESTIONS[KEY]!.answers)
      .filter(([, a]) => a?.answer === "yes")
      .map(([state]) => state)
      .filter((state) => [...placeLocalities(state)].length)
      .sort();
    const state = pick(states, "state");
    const places = [...placeLocalities(state)].sort((a, b) =>
      a.key.localeCompare(b.key),
    );
    const key = pick(places, "place").key;
    const where = `seed ${seed}, ${state} place ${key}`;
    const core = buildBenchWorld(seed, gameStartDate(), {
      twoLevel: true,
      placeKey: key,
    }).core;
    const api = coreAPI(core);
    const opening = lawInForce(api, "minimum-wage").levels.find(
      (l) => l.level === "state",
    )?.row?.value;
    advanceCore(core, addDays(makeIsoDate(core.date), 3));
    const enacted = (
      api
        .moduleState(LAWS_MODULE_ID)
        .table("laws")
        .query("bySeries", [state, "minimum-wage"]) as unknown as LawRowInput[]
    ).filter((r) => String(r.terms?.enactedBy ?? "").endsWith(":starting"));
    expect(
      enacted.map((r) => r.id),
      where,
    ).toEqual([]);
    expect(
      lawInForce(api, "minimum-wage").levels.find((l) => l.level === "state")
        ?.row?.value,
      where,
    ).toBe(opening);
  }, 600_000);
});

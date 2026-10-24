/**
 * The integrity family in play: a place drawn from all 56, built as the game
 * builds it (`buildBenchWorld`, two-level, every module), plays its first
 * four months (integrity decisions come a few hundred a season). Two
 * residents who faced about the same case for an integrity decision
 * (bringing a problem to an official, an official helping with it, an
 * official hiring or keeping staff, a staffer seeing a case through, tipping
 * a reporter), one leaning toward it and one away, decided differently; the
 * test names both, and the case the yes side opened when it was bringing one.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { CASES_MODULE_ID } from "./modules/constituent-cases";
import { coreAPI } from "./state";
import { describePair, playedPairs } from "./trait-pairs";

/** One seed per run, or GOLDEN_PATH_SEED to replay one. */
const RUN_SEED =
  process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

/** The integrity decisions a played window weighs for named actors (all formula decisions). */
const INTEGRITY = {
  "constituent-cases.bring-case": null,
  "constituent-cases.handle-case": null,
  "staff.follow-through": null,
  "staff.hire": null,
  "staff.dismiss": null,
  "press.tip": null,
} as const;

describe("integrity decisions in a played window", () => {
  it("two residents in the same case who lean opposite ways decide differently, by record", () => {
    const { world, calls, pairs, label, tried } = playedPairs(
      (attempt) => {
        const seed = `${RUN_SEED}:integrity-played:${attempt}`;
        return { seed, place: drawPlace(seed, "trait-wiring") };
      },
      120,
      INTEGRITY,
    );
    const cases = Object.values(
      coreAPI(world.core).moduleState(CASES_MODULE_ID).snapshot().tables,
    ).flatMap((rows) => rows as unknown as { id: string }[]);
    const opened = (actorId: string, date: string) =>
      cases.find((r) => r.id === `case:${actorId}:${date}`)?.id;
    console.log(
      `integrity pairs at ${label}, ${calls.length} weighed calls:\n${pairs
        .map((pair) =>
          describePair(
            pair,
            pair.decisionId === "constituent-cases.bring-case"
              ? opened(pair.yes.actorId, pair.yes.date)
              : undefined,
          ),
        )
        .join("\n")}`,
    );
    expect(pairs.length, `places tried: ${tried.join("; ")}`).toBeGreaterThan(
      0,
    );
    const bring = pairs.find(
      (p) => p.decisionId === "constituent-cases.bring-case",
    );
    if (bring)
      expect(
        opened(bring.yes.actorId, bring.yes.date),
        `the case ${bring.yes.actorId} brought at ${label}`,
      ).toBeDefined();
  }, 900_000);
});

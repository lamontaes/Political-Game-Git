/**
 * The integrity family in play: a place drawn from all 56, built as the game
 * builds it (`buildBenchWorld`, two-level, every module), plays its first
 * four months (integrity decisions come a few hundred a season). Two
 * residents who faced about the same case for an integrity decision
 * (bringing a problem to an official, an official helping with it, an
 * official hiring or keeping staff, a staffer seeing a case through, tipping
 * a reporter), one leaning toward it and one away, decided differently; the
 * test names both by the `person.weighed` record each decision kept in the
 * log (the person, the decision, the day, the answer and its reasons, the
 * decline's among them), and the case the yes side opened when it was
 * bringing one.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { CASES_MODULE_ID } from "./modules/constituent-cases";
import { coreAPI } from "./state";
import { decisionTraitWeight } from "./trait-decisions";
import { describePair, playedPairs, type PlayedCall } from "./trait-pairs";

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
    // The record a side's decision kept: the person, the decision, the day,
    // the answer, and as its reasons the case and the pull of temperament
    // (turned around for a decline: the case against, the pull away).
    // A circle member's weighed choice is detail the log forgets after
    // circleDecisionDetailDays (decision-detail.ts): a record still kept is
    // read from the log, an older one as it was kept the day it was made.
    const weighed = (decisionId: string, call: PlayedCall) => {
      const record = world.core.durableLog.get(call.recordId!) ?? call.record;
      const where = `${decisionId}: ${call.recordId} at ${label}`;
      expect(record?.kind, where).toBe("person.weighed");
      expect(record!.actorId, where).toBe(call.actorId);
      expect(record!.reasonKey, where).toBe(decisionId);
      expect(record!.date, where).toBe(call.date);
      expect(record!.actionId, where).toBe(
        `${decisionId}:${call.yes ? "yes" : "no"}`,
      );
      const sign = call.yes ? 1 : -1;
      const reasons = record!.decision!.selectedReasons;
      expect(reasons.module, where).toBeCloseTo(sign * call.bare, 9);
      expect(reasons.trait, where).toBeCloseTo(
        sign * call.lean * decisionTraitWeight(world.core, decisionId),
        9,
      );
      return `${record!.id} (${record!.actionId}: case ${reasons.module.toFixed(3)}, temperament ${reasons.trait.toFixed(3)})`;
    };
    expect(pairs.length, `places tried: ${tried.join("; ")}`).toBeGreaterThan(
      0,
    );
    console.log(
      `integrity pairs at ${label}, ${calls.length} weighed calls:\n${pairs
        .map(
          (pair) =>
            `${describePair(
              pair,
              pair.decisionId === "constituent-cases.bring-case"
                ? opened(pair.yes.actorId, pair.yes.date)
                : undefined,
            )}\n  kept: ${weighed(pair.decisionId, pair.yes)}; ${weighed(pair.decisionId, pair.no)}`,
        )
        .join("\n")}`,
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

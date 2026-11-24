// @vitest-environment node
/** Law levels: a state's bar on its places is a dated state law a bill can grant or take away. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { amountWords } from "../english/bill-sections";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  enactLaw,
  lawChain,
  localPowerBarred,
  LOCAL_POWER_PREFIX,
} from "./modules/laws";
import { policyAuthority } from "./policy-authority";
import { POLICY_QUESTIONS } from "./policy-answers";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const QUESTION = "us-policy-positions:housing-land-use.rent-stabilization";
const drawn = drawPlace(replay, "local-power-bar");

it(`a state bill that grants or bars the power moves the town's authority on its date: ${drawn.name} (${drawn.key}), replay ${replay}`, () => {
  setBookkeeping(false);
  try {
    const world = buildBenchWorld(drawn.seed, gameStartDate(), {
      placeKey: drawn.key,
      twoLevel: true,
    });
    const api = coreAPI(world.core);
    const chain = lawChain(api);
    const startsBarred =
      POLICY_QUESTIONS[QUESTION]!.answers[chain.stateKey]?.preempts === true;
    expect(localPowerBarred(api, QUESTION), "the researched start").toBe(
      startsBarred,
    );
    const at = (value: number, measure: string) => {
      enactLaw(api, {
        jurisdiction: chain.stateKey,
        level: "state",
        series: `${LOCAL_POWER_PREFIX}${QUESTION}`,
        value,
        effectiveDate: addDays(makeIsoDate(api.state.date), 1),
        measureId: measure,
        citation: `Test measure ${measure}`,
      });
      advanceCore(world.core, addDays(makeIsoDate(api.state.date), 2));
    };
    at(1, "TEST-GRANT");
    expect(localPowerBarred(api, QUESTION), "after the grant").toBe(false);
    expect(policyAuthority(api, QUESTION, "city").reason).not.toBe(
      "state-preempts-question",
    );
    at(0, "TEST-BAR");
    expect(localPowerBarred(api, QUESTION), "after the bar").toBe(true);
    expect(policyAuthority(api, QUESTION, "city").reason).toBe(
      "state-preempts-question",
    );
  } finally {
    setBookkeeping(true);
  }
}, 600_000);

it("the bar is worded from the question's own subject, never as a number", () => {
  const words = amountWords(`${LOCAL_POWER_PREFIX}${QUESTION}`)!;
  expect(words.grant).toContain("may make its own rules on");
  expect(words.withdraw).toContain("shall make its own rule on");
  for (const text of Object.values(words))
    expect(text).not.toMatch(/[{}]|undefined|NaN/);
});

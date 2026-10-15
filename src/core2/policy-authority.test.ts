import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { coreAPI } from "./state";
import { gameStartDate } from "./game-start";
import { enactLaw, lawChain } from "./modules/laws";
import { policyAuthority } from "./policy-authority";
import { POLICY_QUESTIONS } from "./policy-answers";
import catalog from "../../data/research/powers-catalog/catalog.json" with { type: "json" };
import mapping from "../../data/research/powers-catalog/question-powers.json" with { type: "json" };
import type { CoreAPI } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "policy-authority-test");
let api: CoreAPI;
beforeAll(() => {
  api = coreAPI(
    buildBenchWorld(place.seed, gameStartDate(), {
      placeKey: place.key,
      twoLevel: true,
    }).core,
  );
}, 600_000);

describe("recorded policy powers", () => {
  it("does not give Congress a question reserved to state law", () => {
    const result = policyAuthority(
      api,
      "us-policy-positions:fiscal.adopt-income-tax",
      "federal",
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("level-lacks-power");
    expect(result.source).toContain("question-powers.json");
  });
  it("does not turn a missing mapping into permission", () => {
    expect(
      policyAuthority(api, "fixture:unmapped-power", "state"),
    ).toMatchObject({ allowed: false, warning: "disputed" });
  });
  it("reads a home-rule grant and its same-day repeal from law records", () => {
    const state = lawChain(api).stateKey;
    const rows = mapping.questions as Record<
      string,
      { dial: string; levels: string[]; gate?: unknown }
    >;
    const question = Object.entries(rows).find(
      ([key, row]) =>
        row.levels.includes("city") &&
        !row.gate &&
        !POLICY_QUESTIONS[key]?.answers[state]?.preempts &&
        catalog.dials.some(
          (d) => d.id === row.dial && d.levels.city.may === "UNKNOWN",
        ),
    )?.[0];
    expect(question, `${place.name}; seed ${seed}`).toBeDefined();
    // Use a county even in the federal district only when its catalog column
    // is local: the district's combined powers are already explicit grants.
    const homeRule =
      "us-policy-positions:government-operations.broaden-local-authority";
    const grant = enactLaw(api, {
      jurisdiction: state,
      level: "state",
      series: homeRule,
      value: 1,
      effectiveDate: api.state.date,
      measureId: "authority-fixture-grant",
      citation: "Authority-reader regression fixture",
    });
    const granted = policyAuthority(api, question!, "city");
    if (granted.source === grant.id) {
      expect(granted.allowed).toBe(true);
      const repeal = enactLaw(api, {
        jurisdiction: state,
        level: "state",
        series: homeRule,
        value: 0,
        effectiveDate: api.state.date,
        measureId: "authority-fixture-repeal",
        citation: "Authority-reader regression fixture",
      });
      expect(policyAuthority(api, question!, "city")).toMatchObject({
        allowed: false,
        source: repeal.id,
      });
    } else {
      expect(granted.source).toContain("/dc");
    }
  });
});

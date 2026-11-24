/**
 * A state's home-rule grant is read where a town council decides whether it
 * may legislate: the same ordinance is blocked before the grant and drafted
 * after it, and blocked again once the state takes the grant back.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { enactLaw, lawChain } from "./modules/laws";
import { townSeats } from "./modules/offices";
import { draftBill } from "./modules/legislature";
import { policyAuthority } from "./policy-authority";
import { POLICY_QUESTIONS } from "./policy-answers";
import catalog from "../../data/research/powers-catalog/catalog.json" with { type: "json" };
import mapping from "../../data/research/powers-catalog/question-powers.json" with { type: "json" };

const homeRule =
  "us-policy-positions:government-operations.broaden-local-authority";

describe("home rule reaches the council's decision", () => {
  it("lets a council draft what the state's grant covers, and blocks it again on repeal", () => {
    let tried = 0;
    for (; tried < 8; tried += 1) {
      const draw = drawPlace(randomBytes(32).toString("hex"), "home-rule");
      const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const api = coreAPI(core);
      const where = `seed ${draw.seed}, place ${draw.key}`;
      const state = lawChain(api).stateKey;
      const seat = townSeats(api).find(
        (s) => s.office.kind === "council" && s.holder?.personId,
      );
      const question = Object.entries(
        mapping.questions as Record<
          string,
          { dial: string; levels: string[]; gate?: unknown }
        >,
      ).find(
        ([key, row]) =>
          row.levels.includes("city") &&
          !row.gate &&
          !POLICY_QUESTIONS[key]?.answers[state]?.preempts &&
          catalog.dials.some(
            (d) => d.id === row.dial && d.levels.city.may === "UNKNOWN",
          ),
      )?.[0];
      if (!seat || !question) continue;
      const setHomeRule = (value: number) => {
        const row = enactLaw(api, {
          jurisdiction: state,
          level: "state",
          series: homeRule,
          value,
          effectiveDate: core.date,
          measureId: `test:home-rule:${value}`,
          citation: "Controlled state law in a generated town.",
        });
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
        return row;
      };
      const draft = () =>
        draftBill(api, {
          bodyOfficeId: seat.office.id,
          sponsorId: seat.holder!.personId!,
          provisions: [{ kind: "policy-question", question, value: 1 }],
        });
      const repeal = setHomeRule(0);
      const refused = draft();
      // The federal district's powers are explicit grants: nothing to read.
      if (policyAuthority(api, question, "city").source !== repeal.id) continue;
      expect(refused.status, `${where}: ${refused.id}`).toBe("blocked");
      const grant = setHomeRule(1);
      const allowed = draft();
      expect(allowed.status, `${where}: ${allowed.id}`).toBe("drafted");
      expect(allowed.authority[0]!.source).toBe(grant.id);
      const taken = setHomeRule(0);
      const again = draft();
      expect(again.status, `${where}: ${again.id}`).toBe("blocked");
      expect(again.authority[0]!.source).toBe(taken.id);
      return;
    }
    throw new Error(`no council with an open power question in ${tried} tries`);
  }, 900_000);
});

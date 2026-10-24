/**
 * The state's researched yes/no policy answers are law at the opening (BOARD
 * "next" item 4): each is a state law row in force on the first day, marked an
 * estimate where the research estimated it, and every policy already in force
 * reaches the town's people through its engine from the first day.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { govReport } from "./gov-test-report";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import { LAWS_MODULE_ID, openLaws } from "./modules/laws";
import { openBudgets } from "./modules/budgets";
import { inForceHere, openLawReach } from "./law-reach/host";
import { answerIn } from "./modules/legislature";
import { POLICY_QUESTIONS } from "./policy-answers";
import { REACH_A_MODULE_ID } from "./law-reach/group-a-records";
import { REACH_B_MODULE_ID } from "./law-reach/group-b-store";
import type { LawRowInput } from "./laws-starting";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`starting-law:${Date.now()}`).digest("hex");
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
const answered = (state: string) =>
  Object.entries(POLICY_QUESTIONS).filter(([, q]) => {
    const a = q.answers[state]?.answer;
    return a === "yes" || a === "no";
  });
// Every place, but a state with no researched answer has nothing to load.
const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .filter((k) => answered(k).some(([, q]) => q.answers[k]!.answer === "yes"))
  .sort();

describe("starting policy answers are law at the opening", () => {
  it("each answer is a state law row in force on day one, and policies in force reach people", () => {
    const state = pick(states, "state");
    const places = [
      ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: state,
        scope: "locality",
      }),
    ].sort((a, b) => a.key.localeCompare(b.key));
    const key = pick(places, "place").key;
    const where = `seed ${seed}, ${state} place ${key}`;
    const core = createLifeCore(
      buildPopulation({
        seed,
        placeKey: key,
        startedAt: START,
        minimumPeople: 200,
      }),
    );
    openLaws(core);
    openBudgets(core);
    openLawReach(core);
    const api = coreAPI(core);
    const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
    const yes: string[] = [];
    for (const [question, entry] of answered(state)) {
      const rows = (
        laws.query("bySeries", [state, question]) as unknown as LawRowInput[]
      ).filter((r) => r.id.endsWith(":starting"));
      expect(rows, `${where}: ${question}`).toHaveLength(1);
      const row = rows[0]!;
      const answer = entry.answers[state]!;
      expect(row.level).toBe("state");
      expect(row.effectiveDate <= api.state.date).toBe(true);
      expect(row.value).toBe(answer.answer === "yes" ? 1 : 0);
      expect(row.estimate).toBe(answer.estimated !== undefined);
      expect(answerIn(api, state, question)).toBe(
        answer.answer === "yes" ? 1 : -1,
      );
      expect(inForceHere(api, question), `${where}: ${question}`).toBe(
        answer.answer === "yes",
      );
      if (answer.answer === "yes") yes.push(question);
    }
    // The policies in force reach people, businesses or groups from day one.
    const reachedKeys = new Set<string>();
    if (core.modules.has(REACH_A_MODULE_ID))
      for (const r of api
        .moduleState(REACH_A_MODULE_ID)
        .table("reach")
        .rows() as unknown as { key: string; endedOn: string | null }[])
        if (r.endedOn === null) reachedKeys.add(r.key);
    if (core.modules.has(REACH_B_MODULE_ID))
      for (const name of ["people", "organizations", "groups"])
        for (const r of api
          .moduleState(REACH_B_MODULE_ID)
          .table(name)
          .rows() as unknown as { key: string }[])
          reachedKeys.add(r.key);
    const reached = yes.filter((q) => reachedKeys.has(q));
    expect(
      reached.length,
      `${where}: nothing in force reached anyone`,
    ).toBeGreaterThan(0);
    // Nothing answered "no" reaches anyone.
    for (const [question, entry] of answered(state))
      if (entry.answers[state]!.answer === "no")
        expect(reachedKeys.has(question), `${where}: ${question}`).toBe(false);
    govReport(
      "starting-policy-law",
      JSON.stringify({
        seed,
        state,
        place: key,
        answered: answered(state).length,
        inForce: yes.length,
        reached: reached.length,
        notReached: yes.filter((q) => !reachedKeys.has(q)),
      }),
    );
  }, 300_000);
});

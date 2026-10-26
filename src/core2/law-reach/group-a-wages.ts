/**
 * Law reach, group A: minimum-wage policies. The wage engine (wage-floor.ts)
 * writes the wage a "yes" on raising the minimum wage sets at the level that
 * passed it and raises every job under the floor; these handlers hand it the
 * change. Local minimum-wage authority is the state's enacted answer the laws
 * engine reads.
 */
import type { Source } from "../types";
import type { ModuleRow } from "../module-data";
import { lawChain, lawInForce, LAWS_MODULE_ID } from "../modules/laws";
import { holdFederalWage, holdRaisedWage } from "../question-wages";
import { raiseToFloor } from "../wage-floor";
import { BUDGETS_MODULE_ID, governments } from "../modules/budgets";
import { lawApplied } from "./applied";
import type { PolicyHandler } from "./host";
import { ensureReachA, putMechanic, yesLevels } from "./group-a-records";

const AUTHORITY_KEY =
  "us-policy-positions:labor-workforce.local-minimum-wage-authority";
const AUTHORITY_SERIES = "local-minimum-wage-authority";

export const federalMinimumWage: PolicyHandler = (api, change) => {
  ensureReachA(api);
  holdFederalWage(api, change);
};

export const raiseMinimumWage: PolicyHandler = (api, change) => {
  ensureReachA(api);
  holdRaisedWage(api, change);
};

/**
 * The state lets its places set a minimum wage (or takes the power back):
 * an enacted authority answer the laws engine reads from today. Jobs under a
 * city wage the state had set aside rise to it the same day.
 */
export const localWageAuthority: PolicyHandler = (api, change) => {
  ensureReachA(api);
  const chain = lawChain(api);
  const stateYes = yesLevels(api, AUTHORITY_KEY).some(
    (l) => l.level === "state",
  );
  const enactments = api.moduleState(LAWS_MODULE_ID).table("enactments");
  const answer = stateYes ? "yes" : "no";
  const latest = (
    enactments.query("bySeries", [AUTHORITY_SERIES]) as unknown as {
      answer: string;
      sequence: number;
    }[]
  )
    .slice()
    .sort((a, b) => b.sequence - a.sequence)[0];
  if (latest?.answer === answer) return;
  if (!latest && !stateYes) return;
  enactments.put({
    id: `authority:${change.lawId}:${api.state.date}`,
    series: AUTHORITY_SERIES,
    jurisdiction: chain.stateKey,
    answer,
    measureId: change.lawId,
    operativeAt: api.state.date,
    sequence: enactments.size + 1,
  } as unknown as ModuleRow);
  putMechanic(api, {
    id: AUTHORITY_KEY,
    key: AUTHORITY_KEY,
    active: stateYes,
    since: api.state.date,
    facts: { answer, lawId: change.lawId },
  });
  if (!stateYes) return;
  // The state's grant reaches the town's own government: it may now set a
  // wage the state's floor does not (the council's bills read it).
  const local = api.state.modules.has(BUDGETS_MODULE_ID)
    ? (governments(api).find((g) => g.level === "city") ??
      governments(api).find((g) => g.level === "county"))
    : undefined;
  if (local)
    lawApplied(api, {
      key: AUTHORITY_KEY,
      lawId: change.lawId,
      targetId: local.id,
      target: "government",
      engine: LAWS_MODULE_ID,
      what: "local-minimum-wage-granted",
    });
  const source: Source = {
    tag: "SOURCED",
    citation: `Local minimum wage authority granted by ${change.lawId}`,
    asOf: api.state.date,
  };
  // Pay rises under the grant only where the wage in force is a place's own,
  // which the state had set aside until now; a worker raised to the state's
  // or the nation's floor is that floor's, not the grant's.
  const governing = lawInForce(api, "minimum-wage").governing;
  const ownWage = governing?.level === "city" || governing?.level === "county";
  raiseToFloor(
    api,
    source,
    ownWage ? { key: AUTHORITY_KEY, lawId: change.lawId } : undefined,
  );
};

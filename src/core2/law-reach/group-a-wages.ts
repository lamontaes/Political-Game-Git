/**
 * Law reach, group A: minimum-wage policies through the laws engine. A "yes"
 * on raising the minimum wage writes the new wage as law at the level that
 * passed it, effective the next day, so the laws engine raises every job
 * under the floor; a repeal writes the old wage back (pay already raised
 * stays: a repeal lowers the floor, not anyone's pay). Local minimum-wage
 * authority is the state's enacted answer the laws engine reads.
 */
import type { CoreAPI, Source } from "../types";
import type { ModuleRow } from "../module-data";
import {
  enactLaw,
  lawChain,
  lawInForce,
  LAWS_MODULE_ID,
  raiseToFloor,
} from "../modules/laws";
import { BUDGETS_MODULE_ID, governments } from "../modules/budgets";
import { lawApplied } from "./applied";
import type { PolicyHandler } from "./host";
import {
  ensureReachA,
  mechanicRow,
  putMechanic,
  reachTable,
  type MechanicRow,
  reachParameter,
  tomorrow,
  yesLevels,
} from "./group-a-records";

const FEDERAL_KEY =
  "us-federal-positions:labor-commerce.raise-federal-minimum-wage";
const RAISE_KEY = "us-policy-positions:labor-workforce.raise-minimum-wage";
const AUTHORITY_KEY =
  "us-policy-positions:labor-workforce.local-minimum-wage-authority";
const AUTHORITY_SERIES = "local-minimum-wage-authority";

/** The minimum wage recorded at one level today (null where none is). */
function levelWage(api: CoreAPI, jurisdiction: string): number | null {
  const level = lawInForce(api, "minimum-wage").levels.find(
    (l) => l.jurisdiction === jurisdiction,
  );
  return level?.row?.value ?? null;
}

/** Set the wage at one level from tomorrow, remembering what it was. */
function setLevelWage(
  api: CoreAPI,
  key: string,
  level: { level: string; jurisdiction: string },
  target: number,
  lawId: string,
): void {
  const id = `${key}:${level.jurisdiction}`;
  const held = mechanicRow(api, id);
  if (held?.active) return;
  const prior = levelWage(api, level.jurisdiction);
  if (prior !== null && prior >= target) return;
  enactLaw(api, {
    jurisdiction: level.jurisdiction,
    level: level.level as Parameters<typeof enactLaw>[1]["level"],
    series: "minimum-wage",
    value: target,
    unit: "minor/hour",
    effectiveDate: tomorrow(api.state.date),
    measureId: lawId,
    citation: `Minimum wage set by ${lawId}`,
  });
  putMechanic(api, {
    id,
    key,
    active: true,
    since: api.state.date,
    facts: {
      jurisdiction: level.jurisdiction,
      level: level.level,
      priorMinor: prior ?? -1,
      targetMinor: target,
      lawId,
    },
  });
}

/** Write the remembered wage back at each level this policy raised. */
function restoreWages(
  api: CoreAPI,
  key: string,
  lawId: string,
  keep: ReadonlySet<string> = new Set(),
): void {
  const rows = reachTable(api, "mechanics").query("byKey", [
    key,
  ]) as unknown as MechanicRow[];
  for (const row of rows) {
    if (!row.active || keep.has(String(row.facts.jurisdiction))) continue;
    const prior = Number(row.facts.priorMinor);
    if (prior > 0)
      enactLaw(api, {
        jurisdiction: String(row.facts.jurisdiction),
        level: String(row.facts.level) as Parameters<
          typeof enactLaw
        >[1]["level"],
        series: "minimum-wage",
        value: prior,
        unit: "minor/hour",
        effectiveDate: tomorrow(api.state.date),
        measureId: lawId,
        citation: `Minimum wage restored by ${lawId}`,
      });
    putMechanic(api, {
      id: row.id,
      key,
      active: false,
      since: api.state.date,
      facts: { ...row.facts, repealedBy: lawId },
    });
  }
}

export const federalMinimumWage: PolicyHandler = (api, change) => {
  ensureReachA(api);
  const federal = lawChain(api).levels.find((l) => l.level === "federal");
  if (!federal) return;
  // The opening's researched answer is the federal floor already in force.
  if (change.inForce && change.lawId.endsWith(":starting")) return;
  if (change.inForce)
    setLevelWage(
      api,
      FEDERAL_KEY,
      federal,
      reachParameter("federalMinimumWageTargetMinor"),
      change.lawId,
    );
  else restoreWages(api, FEDERAL_KEY, change.lawId);
};

export const raiseMinimumWage: PolicyHandler = (api, change) => {
  ensureReachA(api);
  const yes = change.inForce
    ? yesLevels(api, RAISE_KEY).filter((l) => l.level !== "federal")
    : [];
  restoreWages(
    api,
    RAISE_KEY,
    change.lawId,
    new Set(yes.map((l) => l.jurisdiction)),
  );
  for (const level of yes) {
    // A state whose researched answer at the opening is yes already has the
    // raised wage it researched (the minimum-wage series): that answer
    // describes the law in force, not a new raise (audit, Maine and South
    // Dakota: a $15 wage took effect the day after the opening with no bill).
    if (level.lawId.endsWith(":starting")) continue;
    // The $15 standard, or where the floor in force already meets it, the
    // next step above that floor: a raise always raises.
    const floor = governingWage(api, level.jurisdiction);
    const step =
      Math.ceil(
        (floor * (1 + reachParameter("minimumWageNextStepShare"))) / 25,
      ) * 25;
    setLevelWage(
      api,
      RAISE_KEY,
      level,
      Math.max(reachParameter("stateMinimumWageTargetMinor"), step),
      level.lawId,
    );
  }
};

/**
 * The minimum wage that governs at a level today: the highest floor of that
 * level and every level above it in the town's chain (a city's own, its
 * county's, its state's, the federal).
 */
function governingWage(api: CoreAPI, jurisdiction: string): number {
  const levels = lawChain(api).levels;
  const at = levels.findIndex((l) => l.jurisdiction === jurisdiction);
  return Math.max(
    0,
    ...levels
      .slice(0, at < 0 ? levels.length : at + 1)
      .map((l) => levelWage(api, l.jurisdiction) ?? 0),
  );
}

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
  raiseToFloor(api, source, { key: AUTHORITY_KEY, lawId: change.lawId });
};

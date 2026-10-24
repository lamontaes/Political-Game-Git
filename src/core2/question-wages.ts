/**
 * The wage a policy question sets: a "yes" on raising the minimum wage writes
 * the new wage as law at the level that passed it, effective the next day, and
 * the wage engine (wage-floor.ts) raises every job under it; a repeal writes
 * the old wage back (pay already raised stays: a repeal lowers the floor, not
 * anyone's pay). The engine reads where each question stands each time it
 * decides, level by level.
 */
import {
  mechanicRow,
  putMechanic,
  reachParameter,
  reachTable,
  tomorrow,
  yesLevels,
  type MechanicRow,
} from "./law-reach/group-a-records";
import { enactLaw, lawChain, lawInForce } from "./modules/laws";
import type { CoreAPI } from "./types";

export const FEDERAL_KEY =
  "us-federal-positions:labor-commerce.raise-federal-minimum-wage";
export const RAISE_KEY =
  "us-policy-positions:labor-workforce.raise-minimum-wage";

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

/** The nation's question: the floor it names is written at the federal level while it stands. */
export function holdFederalWage(
  api: CoreAPI,
  change: { readonly lawId: string },
): void {
  const federal = lawChain(api).levels.find((l) => l.level === "federal");
  if (!federal) return;
  const standing = yesLevels(api, FEDERAL_KEY).length > 0;
  // The opening's researched answer is the federal floor already in force.
  if (standing && change.lawId.endsWith(":starting")) return;
  if (standing)
    setLevelWage(
      api,
      FEDERAL_KEY,
      federal,
      reachParameter("federalMinimumWageTargetMinor"),
      change.lawId,
    );
  else restoreWages(api, FEDERAL_KEY, change.lawId);
}

/** The states' question: each level that says yes writes its raised wage; the others are restored. */
export function holdRaisedWage(
  api: CoreAPI,
  change: { readonly lawId: string },
): void {
  const yes = yesLevels(api, RAISE_KEY).filter((l) => l.level !== "federal");
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
}

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

/**
 * Who each law in force reached (PW-4 step 3): for every law row in force for
 * the town, the named people, counted residents, businesses, officeholders,
 * governments and budget lines it reached, read from the records the engines
 * left (law effects, law reach A and B, payments, withholding, sales tax,
 * property tax, unemployment claims, budgets). A law that reached nothing
 * gets a `no-local-effect` record naming the place fact that makes it so; one
 * with no such fact is listed as unreached, which is a bug to report.
 *
 * Run monthly by the law effects module, and on demand for the "who it
 * reaches" panel and the played-world check.
 */
import classes from "../data/laws/law-reach-classes.json" with { type: "json" };
import type { CoreAPI, CoreState } from "../types";
import type { ModuleRow } from "../module-data";
import type { LawRowInput } from "../laws-starting";
import { lawChain, LAWS_MODULE_ID } from "../modules/laws";
import {
  BUDGETS_MODULE_ID,
  budgetInForce,
  governments,
  salesTaxesCollected,
} from "../modules/budgets";
import { allLawRecords, putLawRecord } from "./law-records";
import { snapAllotmentMinor } from "./law-payments";
import { townFacts } from "./group-b-people";
import { jobsAt } from "./group-b-money";

const LAW_EFFECTS = "core2-law-effects-v1";
const REACH_A = "core2-law-reach-a-v1";
const REACH_B = "core2-law-reach-b-v1";

interface LawClass {
  readonly who: readonly string[];
  readonly how: string;
  readonly often: string;
  readonly evidence: readonly string[];
  readonly engine: string;
  readonly mechanic?: string;
  readonly organizations?: readonly string[];
  readonly what?: string;
}
const CLASSES = (classes as unknown as { classes: Record<string, LawClass> })
  .classes;

/** How many named ids a reach row keeps to show (the counts are whole). */
const SAMPLE = 12;

export interface LawReachRow {
  readonly id: string;
  readonly lawId: string;
  readonly key: string;
  readonly level: string;
  readonly jurisdiction: string;
  readonly date: string;
  readonly who: readonly string[];
  readonly how: string;
  readonly often: string;
  readonly namedPeople: number;
  readonly namedSample: readonly string[];
  readonly countedPeople: number;
  readonly businesses: number;
  readonly businessSample: readonly string[];
  readonly officeholders: number;
  readonly governments: readonly string[];
  readonly budgetLines: readonly string[];
  readonly payments: number;
  readonly paidMinor: number;
  readonly services: number;
  readonly reached: boolean;
  /** The place fact behind a law that reaches nothing here. */
  readonly noLocalEffect: string | null;
}

type Row = Record<string, unknown>;
function rows(api: CoreAPI, moduleId: string, name: string): Row[] {
  const core = api.state as CoreState;
  if (!core.modules.has(moduleId)) return [];
  return api.moduleState(moduleId).table(name).rows() as unknown as Row[];
}

/** Every law row in force for the town today: policy answers that say yes, and each series' rows. */
export function lawsInForceHere(api: CoreAPI): LawRowInput[] {
  const date = api.state.date;
  const chain = lawChain(api);
  const jurisdictions = new Set(chain.levels.map((l) => l.jurisdiction));
  const all = api
    .moduleState(LAWS_MODULE_ID)
    .table("laws")
    .rows() as unknown as LawRowInput[];
  const latest = new Map<string, LawRowInput>();
  for (const row of all) {
    if (!jurisdictions.has(row.jurisdiction)) continue;
    if (row.effectiveDate > date) continue;
    if (row.endDate !== null && row.endDate <= date) continue;
    const id = `${row.jurisdiction}|${row.series}|${row.tier}`;
    const prior = latest.get(id);
    if (!prior || prior.effectiveDate < row.effectiveDate) latest.set(id, row);
  }
  return [...latest.values()]
    .filter((row) =>
      row.series.includes("-positions:")
        ? row.value === 1
        : row.value !== null && CLASSES[row.series] !== undefined,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
}

interface Reached {
  named: Set<string>;
  counted: number;
  businesses: Set<string>;
  officeholders: number;
  governments: Set<string>;
  lines: Set<string>;
  payments: number;
  paidMinor: number;
  services: number;
}
const empty = (): Reached => ({
  named: new Set(),
  counted: 0,
  businesses: new Set(),
  officeholders: 0,
  governments: new Set(),
  lines: new Set(),
  payments: 0,
  paidMinor: 0,
  services: 0,
});

/** The records every engine left, gathered once per audit by law id and by key. */
function gather(api: CoreAPI) {
  const core = api.state as CoreState;
  const town = lawChain(api).townPlaceId;
  const byLaw = new Map<string, Reached>();
  const byKey = new Map<string, Reached>();
  const at = (map: Map<string, Reached>, id: string) => {
    let r = map.get(id);
    if (!r) map.set(id, (r = empty()));
    return r;
  };
  const isPerson = (id: string) => core.people.has(id);
  const isOrg = (id: string) => core.organizations.has(id);

  for (const row of rows(api, LAW_EFFECTS, "applied"))
    if (row.endedOn === null && isPerson(String(row.personId)))
      at(byLaw, String(row.lawId)).named.add(String(row.personId));

  for (const row of rows(api, REACH_A, "reach")) {
    if (row.endedOn !== null) continue;
    const r = at(byKey, String(row.key));
    const id = String(row.targetId);
    const target = String(row.target);
    if (target === "officeholders") r.officeholders += 1;
    else if (target === "counted" || target === "estimated")
      r.counted += Number(row.count ?? 0);
    else if (isPerson(id)) r.named.add(id);
    else if (isOrg(id)) r.businesses.add(id);
  }
  for (const row of rows(api, REACH_B, "people"))
    if (row.endedOn === null)
      at(byKey, String(row.key)).named.add(String(row.personId));
  for (const row of rows(api, REACH_B, "organizations"))
    if (row.endedOn === null)
      at(byKey, String(row.key)).businesses.add(String(row.organizationId));
  for (const row of rows(api, REACH_B, "groups"))
    if (row.endedOn === null)
      at(byKey, String(row.key)).counted += Number(row.reached ?? 0);
  for (const row of rows(api, REACH_B, "taken")) {
    const key = String(row.key ?? "");
    if (row.line) at(byKey, key).lines.add(`${row.governmentId}:${row.line}`);
    else if (row.governmentId)
      at(byKey, key).governments.add(String(row.governmentId));
  }
  for (const row of rows(api, REACH_A, "staffing"))
    at(byKey, String(row.key)).businesses.add(String(row.organizationId));

  // Counted households a law paid: the most on any one day, not a sum of months.
  const countedByDay = new Map<string, Map<string, number>>();
  for (const record of allLawRecords(api)) {
    const r = at(byLaw, record.lawId);
    if (record.kind === "payment") {
      r.payments += 1;
      r.paidMinor += record.amountMinor;
      if (record.named) r.named.add(record.recipientId);
      else {
        const days =
          countedByDay.get(record.lawId) ?? new Map<string, number>();
        days.set(record.date, (days.get(record.date) ?? 0) + record.households);
        countedByDay.set(record.lawId, days);
      }
    } else if (record.kind === "service") {
      r.services += 1;
      if (record.named) r.named.add(record.recipientId);
    }
  }

  for (const [lawId, days] of countedByDay)
    at(byLaw, lawId).counted += Math.max(...days.values());

  // Taxes withheld from pay, by the law row each line cites.
  for (const row of rows(api, BUDGETS_MODULE_ID, "withholding"))
    for (const line of (row.lines as { lawId: string; minor: number }[]) ?? [])
      if (line.minor > 0) at(byLaw, line.lawId).named.add(String(row.personId));

  // Sellers collect the sales tax: every business that sells in the town.
  const sellers = [...core.finance.businesses.values()]
    .map((b) => b.organizationId)
    .filter((id) => core.organizations.get(id)?.placeId === town);
  for (const tax of salesTaxesCollected(api))
    if (tax.collectedMinor > 0)
      for (const id of sellers) at(byLaw, tax.lawId).businesses.add(id);

  // Employers bound by a wage floor: every organization in the town with a job.
  const employers = new Set<string>();
  for (const job of core.jobs.values())
    if (
      job.endsAt === undefined &&
      core.organizations.get(job.organizationId)?.placeId === town
    )
      employers.add(job.organizationId);

  // Homes billed the property tax.
  const billed = rows(api, "housing", "assessments").length;
  const dwellings = rows(api, "housing", "stock").length;
  // Unemployment claims filed by the town's people.
  const claims = rows(api, "jobs", "claims");
  return { byLaw, byKey, employers, billed, dwellings, claims, sellers };
}

/** The place fact that leaves a law with nothing to act on, or null. */
function placeFact(
  api: CoreAPI,
  cls: LawClass | undefined,
  row: LawRowInput,
  facts: ReturnType<typeof gather>,
): string | null {
  const core = api.state as CoreState;
  const town = lawChain(api).townPlaceId;
  if (!cls) return null;
  if (
    row.series === "unemployment-insurance" ||
    row.series.startsWith("unemployment-weekly")
  )
    return facts.claims.length
      ? null
      : "no worker in the town has filed an unemployment claim";
  if (row.series === "snap-maximum") {
    const town = lawChain(api).townPlaceId;
    const stateKey = lawChain(api).stateKey;
    const eligible = [...townFacts(api, town).households.values()].some(
      (h) => snapAllotmentMinor(row, h, stateKey) > 0,
    );
    return eligible
      ? null
      : "no household in the town has income under the program's gross income limit";
  }
  if (row.series === "property-tax")
    return facts.billed || facts.dwellings
      ? null
      : "the town's records hold no home to assess";
  if (row.value === 0 && !row.series.includes("-positions:"))
    return `the ${row.level} rate in force here is zero`;
  if (cls.mechanic === "teacher-floor")
    return jobsAt(
      api,
      ["service:school", "service:private-school"],
      "profession:teacher",
    ).length
      ? null
      : "the town's records hold no school teacher";
  const orgKinds = cls.organizations ?? [];
  if (orgKinds.length && !cls.who.includes("people")) {
    const any = [...core.organizations.values()].some(
      (o) => o.placeId === town && orgKinds.includes(o.classification ?? ""),
    );
    if (!any)
      return `the town's records hold no business classified ${orgKinds.join(", ")}`;
  }
  if (cls.who.includes("officeholders") && cls.who.length === 1)
    return "no officeholder in the town's records holds an office the law limits";
  return null;
}

/** Who each law in force reached today; writes the reach rows and any no-local-effect records. */
export function auditLawReach(api: CoreAPI): LawReachRow[] {
  const date = api.state.date;
  const facts = gather(api);
  const govs = (api.state as CoreState).modules.has(BUDGETS_MODULE_ID)
    ? governments(api)
    : [];
  const out: LawReachRow[] = [];
  for (const row of lawsInForceHere(api)) {
    const cls = CLASSES[row.series];
    const r = empty();
    for (const source of [
      facts.byLaw.get(row.id),
      facts.byKey.get(row.series),
    ]) {
      if (!source) continue;
      for (const id of source.named) r.named.add(id);
      for (const id of source.businesses) r.businesses.add(id);
      for (const id of source.governments) r.governments.add(id);
      for (const id of source.lines) r.lines.add(id);
      r.counted += source.counted;
      r.officeholders += source.officeholders;
      r.payments += source.payments;
      r.paidMinor += source.paidMinor;
      r.services += source.services;
    }
    const gov = govs.find((g) => g.level === row.level);
    for (const evidence of cls?.evidence ?? []) {
      if (evidence === "employers")
        for (const id of facts.employers) r.businesses.add(id);
      if (evidence === "local-government") {
        const local =
          govs.find((g) => g.level === "city") ??
          govs.find((g) => g.level === "county");
        if (local) r.governments.add(local.id);
      }
      if (evidence === "property-tax") r.counted += facts.billed;
      if (evidence === "claims")
        for (const claim of facts.claims) {
          const id = String(claim.personId);
          if ((api.state as CoreState).people.has(id)) r.named.add(id);
          else r.counted += 1;
        }
      if (evidence.startsWith("state-line:")) {
        const state = govs.find((g) => g.level === "state");
        const line = evidence.slice("state-line:".length);
        const budget = state ? budgetInForce(api, state.id) : undefined;
        if (state && (budget?.spendingMinor[line] ?? 0) > 0)
          r.lines.add(`${state.id}:${line}`);
      }
    }
    // A budget rule constrains its government's budget in force.
    const mechanic = cls?.mechanic;
    if (gov && (mechanic === "balanced-budget" || mechanic === "reserve")) {
      const budget = budgetInForce(api, gov.id);
      if (budget) r.lines.add(`${gov.id}:all lines`);
    }
    if (gov && mechanic === "pension-funding") {
      const budget = budgetInForce(api, gov.id);
      if (budget && "retirementContributions" in budget.spendingMinor)
        r.lines.add(`${gov.id}:retirementContributions`);
    }
    const reached =
      r.named.size > 0 ||
      r.counted > 0 ||
      r.businesses.size > 0 ||
      r.officeholders > 0 ||
      r.governments.size > 0 ||
      r.lines.size > 0;
    const fact = reached ? null : placeFact(api, cls, row, facts);
    if (fact)
      putLawRecord(api, {
        id: `no-local-effect:${row.id}`,
        kind: "no-local-effect",
        lawId: row.id,
        key: row.series,
        date,
        recipientId: lawChain(api).townPlaceId,
        fact,
        why: `${cls?.what ?? row.series}: ${fact}`,
      });
    const reach: LawReachRow = {
      id: row.id,
      lawId: row.id,
      key: row.series,
      level: row.level,
      jurisdiction: row.jurisdiction,
      date,
      who: cls?.who ?? [],
      how: cls?.how ?? "rule",
      often: cls?.often ?? "while in force",
      namedPeople: r.named.size,
      namedSample: [...r.named].sort().slice(0, SAMPLE),
      countedPeople: r.counted,
      businesses: r.businesses.size,
      businessSample: [...r.businesses].sort().slice(0, SAMPLE),
      officeholders: r.officeholders,
      governments: [...r.governments].sort(),
      budgetLines: [...r.lines].sort(),
      payments: r.payments,
      paidMinor: r.paidMinor,
      services: r.services,
      reached,
      noLocalEffect: fact,
    };
    api
      .moduleState(LAW_EFFECTS)
      .table("reach")
      .put(reach as unknown as ModuleRow);
    out.push(reach);
  }
  return out;
}

/**
 * Law reach, group B (audit item 13): infrastructure, healthcare, education,
 * taxes and finance, assistance, energy and environment, agriculture, parks.
 *
 * Each policy in `data/laws/reach-group-b.json`, once law for the town,
 * reaches the named people and counted residents its selector picks from
 * their records, and the employers it binds, as records with its terms
 * (group-b-store.ts). Where an engine owns the effect it runs through it:
 * pay through rerateJob, money through the accounts journal, budgets through
 * amendBudget, taxes through a law row payroll withholding collects
 * (group-b-money.ts). Where the real effect needs another session's engine,
 * the record is the law side and the policy's registered stopgap names the
 * API that engine must provide.
 *
 * Budget lines ("budget-line:<line>"): a line's change against its base
 * reaches what it pays for: public staff pay (schools, health), a monthly
 * assistance benefit from the treasury (welfare), and a service level on the
 * people it serves.
 */
import reach from "../data/laws/reach-group-b.json" with { type: "json" };
import type { CoreAPI, JobInput } from "../types";
import { registerPolicyHandler } from "../modules/law-effects";
import { lawChain, lawInForce, LAWS_MODULE_ID } from "../modules/laws";
import type { LawRowInput } from "../laws-starting";
import {
  reachParameter,
  selectResidents,
  forgetTownFacts,
  townFacts,
  type PeopleSelector,
  type ResidentFacts,
} from "./group-b-people";
import {
  reconcile,
  rowsOf,
  putRow,
  setActive,
  setReachReview,
  type ActiveRow,
  type Reach,
} from "./group-b-store";
import {
  balancePlan,
  holdReserve,
  incomeTaxAct,
  jobsAt,
  modeledShare,
  moveBudget,
  payBenefits,
  raiseToSalaryFloor,
  residentsOf,
  scalePayroll,
  serviceLevel,
} from "./group-b-money";

type Mechanic =
  | "records"
  | "transit-fares"
  | "highway-shift"
  | "teacher-floor"
  | "income-tax-adopt"
  | "income-tax-graduated"
  | "income-tax-rate"
  | "balanced-budget"
  | "pension-funding"
  | "reserve";

interface PolicyDef {
  readonly mechanic: Mechanic;
  readonly effect: string;
  readonly kind: string;
  readonly people?: PeopleSelector;
  readonly organizations?: readonly string[];
  readonly terms?: Readonly<Record<string, string>>;
  readonly enforcer: string;
  readonly source: string;
  readonly stopgapId?: string;
}

interface LineDef {
  readonly effect: string;
  readonly people?: PeopleSelector;
  readonly organizations?: readonly string[];
  readonly publicWorkers?: boolean;
  readonly payroll?: {
    readonly classifications: readonly string[];
    readonly standIn?: readonly string[];
    readonly compensationShare: string;
  };
  readonly benefit?: boolean;
  readonly stopgapId?: string;
}

const data = reach as unknown as {
  policies: Record<string, PolicyDef>;
  budgetLines: Record<string, LineDef>;
};

/** Every key group B registers a handler for: policies, then budget lines. */
export const GROUP_B_KEYS: readonly string[] = [
  ...Object.keys(data.policies),
  ...Object.keys(data.budgetLines).map((line) => `budget-line:${line}`),
];

export function groupBPolicy(key: string): PolicyDef | undefined {
  return data.policies[key];
}

const termsOf = (def: { terms?: Readonly<Record<string, string>> }) =>
  Object.fromEntries(
    Object.entries(def.terms ?? {}).map(([name, key]) => [
      name,
      reachParameter(key),
    ]),
  ) as Record<string, number>;

/** Employers in the town of these classifications. */
function employers(api: CoreAPI, classifications: readonly string[]): string[] {
  const town = lawChain(api).townPlaceId;
  const out: string[] = [];
  for (const org of api.state.organizations.values())
    if (
      org.placeId === town &&
      classifications.includes(org.classification ?? "")
    )
      out.push(org.id);
  return out.sort();
}

/** What a selector reaches today, with the policy's terms on each record. */
function reachOf(
  api: CoreAPI,
  input: {
    readonly people?: PeopleSelector;
    readonly organizations?: readonly string[];
    readonly terms: Record<string, number>;
    readonly personTerms?: ReadonlyMap<string, Record<string, number>>;
    readonly selected?: readonly ResidentFacts[];
    /** Counted residents reached, where the selection doesn't list them (jobs). */
    readonly counted?: number;
    readonly countedOf?: number;
  },
): Reach {
  const chain = lawChain(api);
  const facts = townFacts(api, chain.townPlaceId);
  const selected =
    input.selected ??
    (input.people ? selectResidents(facts, input.people, chain.stateKey) : []);
  const named = new Map<string, Record<string, number>>();
  let counted = 0;
  for (const r of selected) {
    if (r.named)
      named.set(r.id, { ...input.terms, ...input.personTerms?.get(r.id) });
    else counted += r.weight ?? 1;
  }
  const perHousehold = input.people?.householdHead === true;
  const countedOf =
    input.countedOf ??
    (perHousehold
      ? [...facts.households.values()].filter((h) => !h.named).length
      : facts.residents.filter((r) => !r.named).length);
  return {
    named,
    organizations: new Map(
      employers(api, input.organizations ?? []).map((id) => [
        id,
        { ...input.terms },
      ]),
    ),
    counted: Math.round(counted) + (input.counted ?? 0),
    countedOf,
    terms: input.terms,
  };
}

function lawRow(api: CoreAPI, lawId: string): LawRowInput | undefined {
  return api.moduleState(LAWS_MODULE_ID).table("laws").get(lawId) as unknown as
    LawRowInput | undefined;
}

/** A policy question is law for the town at some level (latest row says yes). */
function questionInForce(api: CoreAPI, key: string): boolean {
  const date = api.state.date;
  const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
  return lawChain(api).levels.some(({ jurisdiction }) => {
    const latest = (
      laws.query("bySeries", [jurisdiction, key]) as unknown as LawRowInput[]
    )
      .filter((r) => r.effectiveDate <= date)
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
    return latest?.value === 1;
  });
}

/** Teachers the salary floor covers: public school teachers (see the stand-in). */
function coveredTeachers(api: CoreAPI): JobInput[] {
  const teacher = "profession:teacher";
  const jobs = jobsAt(api, ["service:school"], teacher);
  if (jobs.length) return jobs;
  // stopgapId: SG-GOV-REACH-B-public-school-staff
  api.stopgap("SG-GOV-REACH-B-public-school-staff");
  return jobsAt(api, ["service:private-school"], teacher);
}

function workersOf(api: CoreAPI, jobs: readonly JobInput[]) {
  const named = new Set<string>();
  let counted = 0;
  for (const job of jobs)
    if (api.state.people.has(job.personId)) named.add(job.personId);
    else counted += 1;
  return { named, counted };
}

/** Run one policy for the town: its engine mechanic at the law's level, then its records. */
function runPolicy(
  api: CoreAPI,
  key: string,
  input: {
    readonly lawId: string;
    readonly level: string;
    readonly inForce: boolean;
    readonly enacting: boolean;
    readonly value: number | null;
  },
): void {
  const def = data.policies[key]!;
  const chain = lawChain(api);
  const facts = townFacts(api, chain.townPlaceId);
  const share = modeledShare(api, facts);
  const terms = termsOf(def);
  const level = input.level;
  let inForce = input.inForce;
  let personTerms: Map<string, Record<string, number>> | undefined;
  switch (def.mechanic) {
    case "transit-fares":
      moveBudget(api, {
        key,
        level,
        inForce: input.enacting,
        lawId: input.lawId,
        plan: (gov) => ({
          transit: Math.round(
            terms.fareboxPerResidentDollars! *
              reachParameter("centsPerDollar") *
              residentsOf(api, gov),
          ),
        }),
      });
      break;
    case "highway-shift": {
      const moved = moveBudget(api, {
        key,
        level,
        inForce: input.enacting,
        lawId: input.lawId,
        plan: (_gov, budget) => {
          const amount = Math.round(
            (budget.spendingMinor.highways ?? 0) * terms.share!,
          );
          return { highways: -amount, transit: amount };
        },
      });
      terms.movedMinor =
        moved && !moved.undone ? (moved.moves.transit ?? 0) : 0;
      break;
    }
    case "pension-funding":
      moveBudget(api, {
        key,
        level,
        inForce: input.enacting,
        lawId: input.lawId,
        plan: (gov) => ({
          retirementContributions: Math.round(
            terms.perResidentDollars! *
              reachParameter("centsPerDollar") *
              residentsOf(api, gov),
          ),
        }),
      });
      break;
    case "balanced-budget": {
      // Applied once a fiscal year while the act stands; a repeal restores
      // the lines it cut this year.
      const moved = moveBudget(api, {
        key,
        level,
        inForce: input.enacting,
        lawId: `${input.lawId}#balance`,
        plan: (_gov, budget) => balancePlan(budget),
      });
      const cut = -Object.values(moved?.moves ?? {}).reduce((a, b) => a + b, 0);
      if (input.enacting && moved && cut)
        putRow(api, "taken", {
          id: `balance|${moved.governmentId}|${api.state.date}`,
          key,
          governmentId: moved.governmentId,
          cutMinor: cut,
        });
      break;
    }
    case "reserve": {
      const held = holdReserve(api, {
        key,
        level,
        inForce: input.enacting,
        modeledShare: share,
      });
      if (held) {
        terms.heldMinor = held.held;
        terms.targetMinor = held.target;
      }
      break;
    }
    case "income-tax-adopt":
    case "income-tax-graduated": {
      const act = incomeTaxAct(api, {
        key,
        level,
        lawId: input.lawId,
        enacting: input.enacting,
        graduated: def.mechanic === "income-tax-graduated",
      });
      terms.wroteLaw = act?.lawRowId && !act.undone ? 1 : 0;
      break;
    }
    case "income-tax-rate": {
      const answer = lawInForce(api, "income-tax");
      inForce = answer.levels.some((l) => (l.row?.value ?? 0) > 0);
      // Each level's rate in force (its top rate where it has a schedule).
      for (const l of answer.levels)
        if (l.row && !l.setAside) terms[`${l.level}Rate`] = l.row.value ?? 0;
      break;
    }
    case "teacher-floor": {
      const jobs = coveredTeachers(api);
      const raised =
        input.enacting && inForce
          ? raiseToSalaryFloor(api, jobs, terms.floorDollars!, input.lawId)
          : new Map<string, { fromMinor: number; toMinor: number }>();
      const workers = workersOf(api, jobs);
      for (const [jobId, r] of raised)
        putRow(api, "taken", { id: `floor|${jobId}`, key, jobId, ...r });
      // Every raise the floor made while law, on the teacher's record.
      const raises = new Map(
        rowsOf<{
          key: string;
          jobId: string;
          fromMinor: number;
          toMinor: number;
        }>(api, "taken")
          .filter((row) => row.key === key)
          .map((row) => [row.jobId, row]),
      );
      personTerms = new Map();
      for (const job of jobs) {
        const r = raises.get(job.id);
        if (r && workers.named.has(job.personId))
          personTerms.set(job.personId, {
            fromMinor: r.fromMinor,
            toMinor: r.toMinor,
          });
      }
      terms.raised = jobs.filter((job) => raises.has(job.id)).length;
      const orgs = new Set(jobs.map((j) => j.organizationId));
      const reachRow = reachOf(api, {
        terms,
        personTerms,
        selected: facts.residents.filter((r) => workers.named.has(r.id)),
        counted: workers.counted,
        countedOf: workers.counted,
      });
      finish(api, key, def, input, inForce, {
        ...reachRow,
        organizations: new Map([...orgs].map((id) => [id, { ...terms }])),
      });
      return;
    }
    case "records":
      if (key === "sales-tax") {
        const answer = lawInForce(api, "sales-tax");
        terms.ratePercent = answer.value ?? 0;
        inForce = (answer.value ?? 0) > 0;
      }
      break;
  }
  finish(
    api,
    key,
    def,
    input,
    inForce,
    inForce
      ? reachOf(api, {
          people: def.people,
          organizations: def.organizations,
          terms,
          personTerms,
        })
      : null,
  );
}

function finish(
  api: CoreAPI,
  key: string,
  def: PolicyDef,
  input: { readonly lawId: string; readonly level: string },
  inForce: boolean,
  reachNow: Reach | null,
): void {
  if (inForce && def.stopgapId) api.stopgap(def.stopgapId);
  reconcile(api, {
    key,
    effect: def.effect,
    kind: def.kind,
    lawId: input.lawId,
    placeId: lawChain(api).townPlaceId,
    reach: inForce ? reachNow : null,
  });
  setActive(
    api,
    inForce
      ? ({
          id: key,
          lawId: input.lawId,
          level: input.level,
          since: api.state.date,
        } satisfies ActiveRow)
      : null,
    key,
  );
}

const PUBLIC_EMPLOYERS = [
  "sector:local-government-office",
  "sector:state-government-office",
  "sector:federal-government-office",
  "service:municipal-government",
  "service:police",
  "service:fire",
  "service:school",
  "service:public-health",
];

/** A budget line's change against its base reaches what the line pays for. */
function runBudgetLine(api: CoreAPI, line: string, lawId: string): void {
  const def = data.budgetLines[line]!;
  const key = `budget-line:${line}`;
  const chain = lawChain(api);
  const facts = townFacts(api, chain.townPlaceId);
  const share = modeledShare(api, facts);
  const service = serviceLevel(api, line);
  const inForce = service.deltaTownMinor !== 0;
  const terms: Record<string, number> = {
    level: service.level,
    townDeltaMinor: service.deltaTownMinor,
  };
  let personTerms: Map<string, Record<string, number>> | undefined;
  let selected: ResidentFacts[] | undefined;
  const orgs = new Set(employers(api, def.organizations ?? []));
  if (def.payroll) {
    let jobs = jobsAt(api, def.payroll.classifications);
    if (!jobs.length && def.payroll.standIn) {
      // stopgapId: SG-GOV-REACH-B-public-school-staff
      api.stopgap("SG-GOV-REACH-B-public-school-staff");
      jobs = jobsAt(api, def.payroll.standIn);
    }
    const rates = scalePayroll(api, {
      key,
      jobs,
      townDeltaMinor: service.deltaTownMinor,
      compensationShare: reachParameter(def.payroll.compensationShare),
      modeledShare: share,
    });
    for (const job of jobs) orgs.add(job.organizationId);
    terms.staffRerated = rates.size;
  }
  if (def.publicWorkers) {
    const jobs = jobsAt(api, PUBLIC_EMPLOYERS);
    const ids = new Set(jobs.map((j) => j.personId));
    selected = facts.residents.filter((r) => ids.has(r.id));
    for (const job of jobs) orgs.add(job.organizationId);
  }
  if (def.benefit && def.people) {
    selected = selectResidents(facts, def.people, chain.stateKey);
    personTerms = payBenefits(api, {
      key,
      service,
      heads: selected,
      modeledShare: share,
    });
  }
  if (inForce && def.stopgapId) api.stopgap(def.stopgapId);
  const reachNow = reachOf(api, {
    people: def.people,
    terms,
    personTerms,
    selected,
  });
  reconcile(api, {
    key,
    effect: def.effect,
    kind: "service",
    lawId,
    placeId: chain.townPlaceId,
    reach: inForce
      ? {
          ...reachNow,
          organizations: new Map([...orgs].map((id) => [id, { ...terms }])),
        }
      : null,
  });
  setActive(
    api,
    inForce ? { id: key, lawId, level: "", since: api.state.date } : null,
    key,
  );
}

/** Re-run every policy in force: reach follows people's records month to month. */
function review(api: CoreAPI): void {
  forgetTownFacts(api);
  for (const row of rowsOf<ActiveRow>(api, "active")) {
    if (row.id.startsWith("budget-line:"))
      runBudgetLine(api, row.id.slice("budget-line:".length), row.lawId);
    else if (data.policies[row.id]) {
      const law = lawRow(api, row.lawId);
      const inForce = row.id.includes(":")
        ? questionInForce(api, row.id)
        : true;
      runPolicy(api, row.id, {
        lawId: row.lawId,
        level: row.level,
        inForce,
        enacting: inForce,
        value: law?.value ?? null,
      });
    }
  }
}

let registered = false;
/** Law reach, group B (see index.ts). */
export function registerGroupB(): void {
  if (registered) return;
  registered = true;
  setReachReview(review);
  for (const key of Object.keys(data.policies))
    registerPolicyHandler(key, (api, change) => {
      forgetTownFacts(api);
      const row = lawRow(api, change.lawId);
      const enacting = key.includes(":")
        ? row?.value === 1
        : (row?.value ?? 0) > 0;
      runPolicy(api, key, {
        lawId: change.lawId,
        level: change.level || row?.level || "",
        inForce: change.inForce,
        enacting,
        value: change.value,
      });
    });
  for (const line of Object.keys(data.budgetLines))
    registerPolicyHandler(`budget-line:${line}`, (api, change) => {
      forgetTownFacts(api);
      runBudgetLine(api, line, change.lawId);
    });
}

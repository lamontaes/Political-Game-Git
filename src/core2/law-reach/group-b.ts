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
import { registerPolicyHandler } from "./host";
import { lawChain, lawInForce, LAWS_MODULE_ID } from "../modules/laws";
import type { LawRowInput } from "../laws-starting";
import {
  reachParameter,
  selectResidents,
  forgetTownFacts,
  townFacts,
  type PeopleSelector,
  type ResidentFacts,
  type TownFacts,
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
  type AssistanceTimeLimit,
  balancePlan,
  budgetGap,
  type BalanceRule,
  holdReserve,
  incomeTaxAct,
  jobsAt,
  modeledShare,
  moveBudget,
  payBenefits,
  payCoverage,
  payPreschool,
  payVouchers,
  raiseToSalaryFloor,
  residentsOf,
  scalePayroll,
  serviceLevel,
} from "./group-b-money";

type Mechanic =
  | "records"
  | "medicaid-coverage"
  | "preschool-payment"
  | "compliance-cost"
  | "assistance-time-limit"
  | "school-voucher"
  | "farm-output"
  | "property-assessment"
  | "price-payment"
  | "housing-construction"
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
  /** The employers it binds gain by it (it pays them or exempts their sales), so they don't organize against it. */
  readonly employersGain?: boolean;
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

/** The balanced-budget law's rule for how a gap is closed at this level (data, cited). */
function balanceRule(def: unknown, level: string): BalanceRule {
  const rules = (def as { sequestration: Record<string, BalanceRule> })
    .sequestration;
  return rules[level] ?? rules.default!;
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
      classifications.includes(org.classification ?? "") &&
      // A closed organization is no longer bound; the review must not re-add it.
      !api.state.finance.businesses.get(org.id)?.closedAt
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
    else counted += (r.weight ?? 1) * (r.scale ?? 1);
  }
  const perHousehold = input.people?.householdHead === true;
  const countedOf =
    input.countedOf ??
    (perHousehold
      ? [...facts.households.values()]
          .filter((h) => !h.named)
          .reduce((n, h) => n + (h.scale ?? 1), 0)
      : facts.residents
          .filter((r) => !r.named)
          .reduce((n, r) => n + (r.scale ?? 1), 0));
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

/** The row that makes a policy question law for the town at some level (the latest row there says yes). */
function questionRow(api: CoreAPI, key: string): LawRowInput | undefined {
  const date = api.state.date;
  const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
  for (const { jurisdiction } of lawChain(api).levels) {
    const latest = (
      laws.query("bySeries", [jurisdiction, key]) as unknown as LawRowInput[]
    )
      .filter((r) => r.effectiveDate <= date)
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
    if (latest?.value === 1) return latest;
  }
  return undefined;
}

/** A policy question is law for the town at some level (latest row says yes). */
function questionInForce(api: CoreAPI, key: string): boolean {
  return questionRow(api, key) !== undefined;
}

const ASSISTANCE_WORK =
  "us-policy-positions:health-human-services.work-requirement-for-assistance";

/**
 * The assistance work requirement as the benefit reads it: while it is law, the
 * adults it reaches (by age, hours, income and young children) draw only for
 * its time limit. Null while it is not law.
 */
function assistanceTimeLimit(
  api: CoreAPI,
  facts: TownFacts,
  stateKey: string,
): AssistanceTimeLimit | null {
  const row = questionRow(api, ASSISTANCE_WORK);
  const people = data.policies[ASSISTANCE_WORK]?.people;
  if (!row || !people) return null;
  return {
    lawId: row.id,
    since: row.effectiveDate,
    reachedIds: new Set(
      selectResidents(facts, people, stateKey).map((r) => r.id),
    ),
  };
}

const MEDICAID_EXPAND =
  "us-policy-positions:health-human-services.expand-medicaid-eligibility";
const MEDICAID_WORK =
  "us-policy-positions:health-human-services.medicaid-work-requirement";

/**
 * Who Medicaid expansion covers as the payment reads it: the adults the
 * expansion reaches, less those the work requirement ends coverage for (its
 * hours, income and young-child terms) while that requirement is law.
 */
function medicaidCovered(
  api: CoreAPI,
  facts: TownFacts,
  stateKey: string,
): ResidentFacts[] {
  const people = data.policies[MEDICAID_EXPAND]?.people;
  if (!people) return [];
  const covered = selectResidents(facts, people, stateKey);
  const workPeople = data.policies[MEDICAID_WORK]?.people;
  if (!workPeople || !questionInForce(api, MEDICAID_WORK)) return covered;
  const ended = new Set(
    selectResidents(facts, workPeople, stateKey).map((r) => r.id),
  );
  return covered.filter((r) => !ended.has(r.id));
}

/** Teachers the salary floor covers: those the town's public school district employs. */
function coveredTeachers(api: CoreAPI): JobInput[] {
  return jobsAt(api, ["service:school"], "profession:teacher");
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
    // The price engine reads these laws at monthly settlement and records
    // each household, counted group and seller it charged or paid
    // (place-prices.ts); the housing engine reads its laws at its existing
    // construction decision. A blanket eligibility row is neither a payment,
    // a received notice nor a decision.
    case "price-payment":
    case "housing-construction":
      return;
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
      return;
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
      // Set when this call balances a budget (not on a later review of one
      // already balanced).
      let firstGap: number | null = null;
      // Applied once a fiscal year while the act stands; a repeal restores
      // the lines it cut this year.
      const moved = moveBudget(api, {
        key,
        level,
        inForce: input.enacting,
        lawId: `${input.lawId}#balance`,
        plan: (gov, budget) => {
          const years = rowsOf<{ id: string; firstGapMinor: number }>(
            api,
            "taken",
          ).filter((r) => r.id.startsWith(`balance|${gov.id}|`));
          firstGap = years[0]?.firstGapMinor ?? budgetGap(budget);
          return balancePlan(
            budget,
            balanceRule(def, gov.level),
            years.length,
            firstGap,
          );
        },
      });
      const cut = -Object.values(moved?.moves ?? {}).reduce((a, b) => a + b, 0);
      if (input.enacting && moved && cut && firstGap !== null)
        putRow(api, "taken", {
          // One record per fiscal year's budget the law has balanced; the
          // phase-in counts them.
          id: `balance|${moved.governmentId}|${moved.budgetId}`,
          // The gap the law first met: its phase-in steps down from it.
          firstGapMinor: firstGap,
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
      // The act reaches people only through the tax it wrote. Where the level
      // already had a tax (or this act was undone), it changed no paycheck.
      inForce = terms.wroteLaw === 1;
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
    case "compliance-cost":
      return; // The business engine reads the law when it charges a nonattainment county's emitters.
    case "assistance-time-limit":
      // The welfare line's benefit reads this law when it picks who is paid;
      // run that line again now so a change takes hold today.
      for (const row of rowsOf<ActiveRow>(api, "active"))
        if (row.id === "budget-line:welfareAndMedicaid")
          runBudgetLine(api, "welfareAndMedicaid", row.lawId);
      return;
    case "school-voucher": {
      // The state treasury pays its share of the tuition the town's
      // households pay the private school; the records are the households paid.
      const paid = payVouchers(api, { key, inForce });
      const heads = facts.residents.filter(
        (r) => r.named && paid.named.has(r.id),
      );
      finish(
        api,
        key,
        def,
        input,
        inForce,
        inForce
          ? reachOf(api, {
              organizations: def.organizations,
              terms,
              personTerms: paid.named,
              selected: heads,
              counted: paid.counted,
              countedOf: paid.counted,
            })
          : null,
      );
      return;
    }
    case "medicaid-coverage": {
      const paid = payCoverage(api, {
        key,
        inForce,
        covered: inForce ? medicaidCovered(api, facts, chain.stateKey) : [],
      });
      finish(
        api,
        key,
        def,
        input,
        inForce,
        inForce
          ? reachOf(api, {
              organizations: def.organizations,
              terms,
              personTerms: paid.named,
              selected: facts.residents.filter(
                (r) => r.named && paid.named.has(r.id),
              ),
              counted: paid.counted,
              countedOf: facts.residents
                .filter((r) => !r.named)
                .reduce((n, r) => n + (r.scale ?? 1), 0),
            })
          : null,
      );
      return;
    }
    case "preschool-payment": {
      const children =
        inForce && def.people
          ? selectResidents(facts, def.people, chain.stateKey)
          : [];
      const paid = payPreschool(api, {
        key,
        inForce,
        children,
        residents: facts.residents,
      });
      finish(
        api,
        key,
        def,
        input,
        inForce,
        inForce
          ? reachOf(api, {
              organizations: def.organizations,
              terms,
              personTerms: paid.named,
              selected: children.filter((c) => c.named),
              counted: paid.counted,
              countedOf: facts.residents
                .filter((r) => !r.named)
                .reduce((n, r) => n + (r.scale ?? 1), 0),
            })
          : null,
      );
      return;
    }
    case "farm-output":
      return; // The business engine reads the law when setting production limits.
    case "property-assessment":
      return; // The housing assessment reads the cap through budgets when billing.
    case "records":
      // The expansion's payment reads this requirement; run it again now.
      if (key === MEDICAID_WORK)
        for (const row of rowsOf<ActiveRow>(api, "active"))
          if (row.id === MEDICAID_EXPAND)
            runPolicy(api, MEDICAID_EXPAND, {
              lawId: row.lawId,
              level: row.level,
              inForce: questionInForce(api, MEDICAID_EXPAND),
              enacting: questionInForce(api, MEDICAID_EXPAND),
              value: lawRow(api, row.lawId)?.value ?? null,
            });
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
    const jobs = jobsAt(api, def.payroll.classifications);
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
      timeLimit: assistanceTimeLimit(api, facts, chain.stateKey),
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

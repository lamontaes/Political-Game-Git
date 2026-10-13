/**
 * Legislating (golden path steps 6 to 8, first slice): write an ordinance,
 * negotiate, the body votes, the executive acts, the law takes effect.
 *
 * - A bill changes law in force with real amounts (a local minimum wage, a
 *   local income or sales tax, starting from the amount in force) or answers a
 *   recorded policy question for the town. It gets a number and a cost
 *   estimate as it's drafted.
 * - Authority: a provision the state rules out for its places is blocked; one
 *   the state hasn't settled gets the city attorney's warning
 *   (`authorityFor`), both read from the recorded law, never a city name.
 * - Members vote for their own recorded reasons: their views on the questions
 *   the bill speaks to, how their constituents lean, how they stand with the
 *   sponsor, and any deal they've made. Every vote goes on the record that
 *   the next election reads.
 * - The executive signs or vetoes where the form of government gives a veto;
 *   the body may override by its rule. An enacted provision takes effect on
 *   its date through the laws module (and a minimum wage raises pay that day).
 *
 * Meeting scenes, committee hearings and the bill paper's screens are
 * OPUS-PEOPLE's and OPUS-PLAY's; these are the engine calls they drive.
 */
import powers from "../data/legislature/series-powers.json" with { type: "json" };
import ties from "../../../data/research/elections/tie-rules-2026.json" with { type: "json" };
import provisionQuestions from "../../../data/research/legislature/provision-questions.json" with { type: "json" };
import { POLICY_QUESTIONS } from "../policy-answers";
import { registerModule } from "../state";
import type { CoreAPI, CoreModule, CoreState, PersonState } from "../types";
import type { ModuleRow } from "../module-data";
import type { ModuleCalendarWork } from "../module-calendar";
import { campaignParameter, personLean, personStance } from "../campaign-views";
import { governmentUnitsForPlace } from "../../simulation/government-units";
import { enactLaw, lawChain, lawInForce, LAWS_MODULE_ID } from "./laws";
import { localAuthority, type EnactedAuthority } from "../laws-in-force";
import type { LawRowInput } from "../laws-starting";
import { OFFICES_MODULE_ID, type TermRow } from "./offices";
import { recordVote } from "./record";
import {
  BUDGETS_MODULE_ID,
  amendBudget,
  budgetPriorities,
  proposedBudget,
  putBudget,
  setBudgetPriorities,
  registerBudgetVote,
  type BudgetRow,
  type GovernmentRow,
} from "./budgets";
import { partyName, partySide } from "../appointments";
import mayorVetoData from "../../../data/research/local-government/mayor-veto-2026.json" with { type: "json" };
import { stateActEffectiveDate } from "../state-effective-date";
import partyCounts from "../../../data/research/offices/legislature-party-counts-2026.json" with { type: "json" };

export const LEGISLATURE_MODULE_ID = "core2-legislature-v1";

export interface Provision {
  /** A law-in-force series the bill changes, or a policy question it answers. */
  readonly kind: "law-amount" | "policy-question" | "budget-line";
  /** For a budget line: the spending function (as in the budget's lines). */
  readonly line?: string;
  readonly series?: string;
  readonly question?: string;
  readonly value: number;
  readonly unit?: string;
  readonly effectiveDate?: string;
}

export interface Authority {
  readonly allowed: boolean;
  readonly warning: "none" | "disputed" | "preempted";
  readonly reason: string;
  readonly source: string;
}

export interface BillRow {
  readonly id: string;
  readonly number: string;
  readonly bodyOfficeId: string;
  readonly sponsorId: string;
  readonly introduced: string;
  readonly provisions: readonly Provision[];
  readonly costEstimate: {
    readonly workersRaised: number;
    readonly annualPayMinor: number;
    readonly note: string;
  };
  readonly authority: readonly Authority[];
  readonly status:
    | "drafted"
    | "passed"
    | "failed"
    | "signed"
    | "vetoed"
    | "overridden"
    | "enacted"
    | "blocked"
    /** Passed, on the desk of an executive who decides for themselves (the player). */
    | "awaiting-signature";
  readonly deals: readonly {
    readonly memberId: string;
    readonly kind: string;
    readonly terms: string;
    readonly date: string;
    /** A declined offer is on the record but moves no one. */
    readonly status?: "accepted" | "declined";
  }[];
}

/** One member's reasons on one bill. */
export interface MemberPosition {
  readonly memberId: string;
  readonly views: number;
  readonly constituents: number;
  readonly sponsor: number;
  readonly deal: number;
  /** What organized interests that met the member pressed on them. */
  readonly lobby: number;
  readonly total: number;
}

export const LEGISLATURE_MODULE: CoreModule = {
  id: LEGISLATURE_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      bills: {},
      votes: { indexes: { byBill: { fields: ["billId"] } } },
      committees: {},
      counters: {},
      obligations: {},
      choices: {},
    },
  },
  onCalendarWork: legislatureCalendar,
};

function table(api: CoreAPI, name: string) {
  return api.moduleState(LEGISLATURE_MODULE_ID).table(name);
}

type PositionTerm = (api: CoreAPI, bill: BillRow, memberId: string) => number;
const positionTerms: PositionTerm[] = [];
const beforeVoteHooks: ((api: CoreAPI, billId: string) => void)[] = [];
/**
 * Other engines add to a member's reasons (organized interests lobbying) and
 * act on a bill before its votes (groups forming from its fiscal note).
 */
export function registerLegislatureHooks(input: {
  readonly positionTerm?: PositionTerm;
  readonly beforeVote?: (api: CoreAPI, billId: string) => void;
}): void {
  if (input.positionTerm && !positionTerms.includes(input.positionTerm))
    positionTerms.push(input.positionTerm);
  if (input.beforeVote && !beforeVoteHooks.includes(input.beforeVote))
    beforeVoteHooks.push(input.beforeVote);
}

type RosterProvider = (
  api: CoreAPI,
  chamber: string,
  committee: string,
) => { memberIds: readonly string[]; chairId: string } | null;
let rosterProvider: RosterProvider | null = null;
/** The leadership engine seats committees and their chairs (`leadership.ts`). */
export function registerCommitteeRosterProvider(fn: RosterProvider): void {
  rosterProvider = fn;
}

/** Each employer's added yearly pay under a minimum-wage provision: the fiscal note, employer by employer. */
export function employerCosts(
  api: CoreAPI,
  bill: BillRow,
): ReadonlyMap<string, { workers: number; annualMinor: number }> {
  const wage = bill.provisions.find(
    (p) => p.kind === "law-amount" && p.series === "minimum-wage",
  );
  const out = new Map<string, { workers: number; annualMinor: number }>();
  if (!wage) return out;
  for (const c of (api.state as CoreState).work.commitments.values())
    if (c.endsAt === undefined && c.hourlyMinor < wage.value) {
      const row = out.get(c.organizationId) ?? { workers: 0, annualMinor: 0 };
      out.set(c.organizationId, {
        workers: row.workers + 1,
        annualMinor: Math.round(
          row.annualMinor +
            (wage.value - c.hourlyMinor) * (c.expectedWeeklyMinutes / 60) * 52,
        ),
      });
    }
  return out;
}

export function openLegislature(core: CoreState): void {
  if (!core.modules.has(LEGISLATURE_MODULE_ID))
    registerModule(core, LEGISLATURE_MODULE);
  registerBudgetVote(councilBudget);
}

/**
 * Each government's legislature votes its budget at the fiscal year's start
 * (the town council, the county board, the state's chambers, Congress): the
 * executive's proposal (this year's lines with their priorities applied).
 * Each member weighs the proposal's changes by their own views, and their
 * duty to keep the government funded (a budget must be adopted); a budget
 * that fails is carried forward as last year's (a charter's carry-forward, a
 * state's continuing appropriation, Congress's continuing resolution).
 */
function councilBudget(
  api: CoreAPI,
  gov: GovernmentRow,
  fy: number,
): BudgetRow | null {
  const chambers = budgetChambers(api, gov);
  if (!chambers || !chambers.chambers.every((c) => members(api, c).length))
    return null;
  const priorities =
    budgetPriorities(api, gov.id) ?? executivePriorities(api, gov, fy);
  const provisions: Provision[] = Object.entries(priorities?.changes ?? {}).map(
    ([line, delta]) => ({
      kind: "budget-line",
      line,
      value: delta,
    }),
  );
  const sponsor =
    priorities?.setBy ?? memberKey(members(api, chambers.chambers[0]!)[0]!);
  const bill = draftBill(api, {
    bodyOfficeId: chambers.introducedIn,
    sponsorId: sponsor,
    provisions,
  });
  // Each member's duty to adopt a budget sits beside their views on its
  // changes; every chamber must pass it (the U.S. Senate by cloture first).
  const roll = (kept: readonly Provision[]) => {
    const trial = { ...bill, provisions: kept } as BillRow;
    const tallies: string[] = [];
    const rows: ModuleRow[] = [];
    for (const chamber of chambers.chambers) {
      let yes = 0;
      let no = 0;
      const against: string[] = [];
      for (const member of members(api, chamber)) {
        const key = memberKey(member);
        const position = positionOn(api, trial, key);
        const total =
          position.total -
          position.sponsor +
          campaignParameter("budgetAdoptionDuty");
        if (total > 0) yes += 1;
        else if (total < 0) {
          no += 1;
          against.push(key);
        }
        rows.push({
          id: `vote:${bill.id}:${key}`,
          billId: bill.id,
          memberId: key,
          chamber,
          vote: total > 0 ? "yes" : total < 0 ? "no" : "abstain",
          position: { ...position, total },
        } as unknown as ModuleRow);
      }
      tallies.push(`${yes}-${no}`);
      const cloture =
        chamber === FEDERAL_SENATE &&
        yes <
          Math.ceil(
            members(api, chamber).length *
              campaignParameter("senateClotureShare"),
          );
      if (yes <= no || cloture)
        return { adopted: false, tallies, rows, against };
    }
    return { adopted: true, tallies, rows, against: [] as string[] };
  };
  // A rejected budget is negotiated, not abandoned: the leaders drop the
  // change its opponents in the failing chamber object to most and vote
  // again, until it passes or no change is left (then last year's carries).
  let kept: readonly Provision[] = provisions;
  let result = roll(kept);
  const dropped: string[] = [];
  while (!result.adopted && kept.length) {
    const objection = (p: Provision) =>
      result.against.reduce((sum, key) => {
        const one = positionOn(
          api,
          { ...bill, provisions: [p] } as BillRow,
          key,
        );
        return sum + one.views + one.constituents;
      }, 0);
    const worst = [...kept]
      .map((p) => ({ p, o: objection(p) }))
      .sort(
        (a, b) =>
          a.o - b.o ||
          String((a.p as { line?: string }).line).localeCompare(
            String((b.p as { line?: string }).line),
          ),
      )[0]!.p;
    dropped.push(String((worst as { line?: string }).line));
    kept = kept.filter((p) => p !== worst);
    result = roll(kept);
  }
  for (const row of result.rows) table(api, "votes").put(row);
  const tallies = result.tallies;
  const adopted = result.adopted;
  // The adopted changes: a stored priority is amended to what passed; the
  // executive's own (unstored) changes are applied to the proposal below.
  const passed = Object.fromEntries(
    kept.map((p) => {
      const line = p as unknown as { line: string; value: number };
      return [line.line, line.value];
    }),
  );
  const stored = budgetPriorities(api, gov.id);
  if (stored && dropped.length)
    setBudgetPriorities(api, {
      governmentId: gov.id,
      setBy: stored.setBy,
      changes: passed,
    });
  const votes = tallies.join(", ");
  const drafted = proposedBudget(
    api,
    gov,
    fy,
    `${chambers.body} vote ${votes}, ${bill.number}${dropped.length ? ` (amended: ${dropped.join(", ")} dropped)` : ""}`,
  );
  const spending = { ...drafted.spendingMinor };
  if (!stored)
    for (const [line, delta] of Object.entries(passed))
      spending[line] = Math.max(0, (spending[line] ?? 0) + delta);
  const proposal = { ...drafted, spendingMinor: spending };
  const budget: BudgetRow = adopted
    ? proposal
    : {
        ...proposal,
        spendingMinor: (budgetCarry(api, gov, fy) ?? proposal).spendingMinor,
        adoptedBy: `carried forward after ${chambers.body} rejected ${bill.number} ${votes}`,
      };
  putBudget(api, budget);
  table(api, "bills").put({
    ...bill,
    provisions: kept,
    kind: "budget",
    status: adopted ? "enacted" : "failed",
  } as unknown as ModuleRow);
  return budget;
}

/**
 * What each member of the bodies that vote a government's budget thinks of
 * one proposed line change on its own: their views and their constituents'
 * on that change (the budget's other terms are the same for every line).
 * For staff advice on budget priorities; null where no body votes it.
 */
export function budgetLineStakes(
  api: CoreAPI,
  governmentId: string,
  line: string,
  delta: number,
): { chamber: string; memberId: string; stake: number }[] | null {
  const gov = api
    .moduleState(BUDGETS_MODULE_ID)
    .table("governments")
    .get(governmentId) as unknown as GovernmentRow | undefined;
  const chambers = gov ? budgetChambers(api, gov) : null;
  if (!chambers) return null;
  const trial = {
    id: `trial:${governmentId}:${line}`,
    number: "",
    bodyOfficeId: chambers.introducedIn,
    sponsorId: "",
    introduced: api.state.date,
    provisions: [{ kind: "budget-line", line, value: delta }],
    costEstimate: { workersRaised: 0, annualPayMinor: 0, note: "" },
    authority: [],
    status: "drafted",
    deals: [],
  } as unknown as BillRow;
  return chambers.chambers.flatMap((chamber) =>
    members(api, chamber).map((m) => {
      const memberId = memberKey(m);
      const p = positionOn(api, trial, memberId);
      return { chamber, memberId, stake: p.views + p.constituents };
    }),
  );
}

/**
 * Where no one has set the year's priorities, the government's elected
 * executive (mayor, county executive, governor, president) proposes them from
 * their own lean: more for the lines their side wants more spent on, less
 * for the others, each moved by up to a tunable share of the line.
 */
function executivePriorities(
  api: CoreAPI,
  gov: GovernmentRow,
  fy: number,
): { setBy: string; changes: Record<string, number> } | null {
  const kind = {
    federal: "president",
    state: "governor",
    county: "county-executive",
    city: "mayor",
  }[gov.level];
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const office = (
    offices.table("offices").rows() as unknown as {
      id: string;
      kind: string;
      level: string;
    }[]
  ).find(
    (o) => o.kind === kind && (gov.level !== "state" || o.level === "state"),
  );
  if (!office) return null;
  const holder = (
    offices.table("seats").query("byOffice", [office.id]) as unknown as {
      id: string;
    }[]
  )
    .flatMap(
      (seat) =>
        offices
          .table("terms")
          .query("bySeatStatus", [seat.id, "serving"]) as unknown as TermRow[],
    )
    .sort((a, b) => a.id.localeCompare(b.id))[0];
  const base = budgetCarry(api, gov, fy);
  if (!holder || !base) return null;
  const key = memberKey(holder);
  const lean = leanOf(api, key);
  const share = campaignParameter("executivePriorityShare");
  const changes: Record<string, number> = {};
  for (const [line, amount] of Object.entries(base.spendingMinor)) {
    const change = Math.round(
      amount * share * personStance(lean, `budget-line:${line}`),
    );
    if (change !== 0) changes[line] = change;
  }
  return { setBy: key, changes };
}

/**
 * The bodies that vote a government's budget, in order, and where the bill
 * is introduced: the town council, the county board, the state's chambers,
 * or Congress (through the town's own House seat).
 */
function budgetChambers(
  api: CoreAPI,
  gov: GovernmentRow,
): {
  chambers: readonly string[];
  introducedIn: string;
  body: string;
} | null {
  const offices = api
    .moduleState(OFFICES_MODULE_ID)
    .table("offices")
    .rows() as unknown as {
    id: string;
    kind: string;
    level: string;
    jurisdiction: string;
  }[];
  if (gov.level === "federal") {
    const house = offices.find((o) => o.kind.startsWith("us-house"));
    return house
      ? {
          chambers: [FEDERAL_HOUSE, FEDERAL_SENATE],
          introducedIn: house.id,
          body: "Congress",
        }
      : null;
  }
  if (gov.level === "state") {
    const state = offices
      .filter(
        (o) => o.kind.startsWith("legislature-") && o.jurisdiction === gov.id,
      )
      .map((o) => o.id)
      .sort();
    return state.length
      ? { chambers: state, introducedIn: state[0]!, body: "the legislature" }
      : null;
  }
  const kind = gov.level === "county" ? "county-board" : "council";
  const body = offices.find((o) => o.kind === kind && o.level === gov.level);
  return body
    ? {
        chambers: [body.id],
        introducedIn: body.id,
        body: gov.level === "county" ? "the county board" : "the council",
      }
    : null;
}

/** Last year's adopted lines, for a budget the council rejects. */
function budgetCarry(
  api: CoreAPI,
  gov: GovernmentRow,
  fy: number,
): BudgetRow | null {
  return (
    (api
      .moduleState("core2-budgets-v1")
      .table("budgets")
      .get(`budget:${gov.id}:${fy - 1}`) as unknown as BudgetRow | undefined) ??
    null
  );
}

/** Every recorded starting-law policy question, by key (`policy-answers.ts`). */
export { POLICY_QUESTIONS };

const seriesQuestion = (
  provisionQuestions as unknown as {
    series: Record<string, { question: string; raiseIs: number }>;
  }
).series;

/** The policy question a provision speaks to, and which way the provision points on it. */
export function provisionStance(
  api: CoreAPI,
  provision: Provision,
  level: LawLevel = "city",
): { question: string; position: number } | null {
  if (provision.kind === "policy-question" && provision.question)
    return {
      question: provision.question,
      position: provision.value > 0 ? 1 : -1,
    };
  // Spending more or less on a line: read by who wants more spent on it.
  if (provision.kind === "budget-line" && provision.line)
    return provision.value === 0
      ? null
      : {
          question: `budget-line:${provision.line}`,
          position: Math.sign(provision.value),
        };
  const map = provision.series ? seriesQuestion[provision.series] : undefined;
  if (!map || !provision.series) return null;
  const current = currentAmount(api, provision.series, level);
  const direction = current === null ? 1 : Math.sign(provision.value - current);
  return direction === 0
    ? null
    : { question: map.question, position: direction * map.raiseIs };
}

type LawLevel = "federal" | "state" | "city";

/**
 * The amount a bill at this level changes: its own level's amount in force
 * (a federal bill against the federal floor, a state bill against the
 * state's), and for a town, the floor that governs there (a local minimum
 * wage only matters above it) or its own local rate.
 */
export function currentAmount(
  api: CoreAPI,
  series: string,
  level: LawLevel = "city",
): number | null {
  const answer = lawInForce(api, series);
  const at = (name: string) =>
    answer.levels.find((l) => l.level === name)?.row?.value ?? null;
  if (level === "federal") return at("federal") ?? 0;
  if (level === "state") return at("state") ?? at("federal") ?? 0;
  return series === "minimum-wage" ? answer.value : (at("city") ?? 0);
}

/** The level a bill legislates at. */
function billLevel(api: CoreAPI, bill: BillRow): LawLevel {
  const chambers = chambersOf(api, bill);
  if (chambers.includes(FEDERAL_HOUSE)) return "federal";
  return chambers.length > 1 || bill.bodyOfficeId.includes(":legislature-")
    ? "state"
    : "city";
}

/**
 * Whether the town may pass a provision: a minimum wage needs the state's
 * local-minimum-wage authority (read through the lifted law-in-force rule);
 * a local income or sales tax needs the state's recorded permission; a policy
 * question the state has answered for its places with preemption is closed,
 * one the state answered without is disputed (the city attorney warns).
 */
export function authorityFor(api: CoreAPI, provision: Provision): Authority {
  const chain = lawChain(api);
  const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
  if (provision.kind === "law-amount" && provision.series === "minimum-wage") {
    const rows = laws.query("bySeriesOnly", [
      "local-minimum-wage-authority",
    ]) as unknown as LawRowInput[];
    // A state's grant of authority enacted in play counts too.
    const enacted = api
      .moduleState(LAWS_MODULE_ID)
      .table("enactments")
      .query("bySeries", [
        "local-minimum-wage-authority",
      ]) as unknown as EnactedAuthority[];
    const authority = localAuthority(rows, enacted, chain, api.state.date);
    return authority.allowed
      ? {
          allowed: true,
          warning: "none",
          reason: "state lets its places set a minimum wage",
          source: rows[0]?.id ?? "",
        }
      : {
          allowed: false,
          warning: "preempted",
          reason: authority.preempts
            ? "state law preempts local minimum wages"
            : "state law gives its places no minimum-wage power",
          source: rows[0]?.id ?? "",
        };
  }
  if (
    provision.kind === "law-amount" &&
    (provision.series === "income-tax" || provision.series === "sales-tax")
  ) {
    const key =
      provision.series === "income-tax"
        ? "local-income-tax-authority"
        : "local-sales-tax-average";
    const rows = (
      laws.query("bySeriesOnly", [key]) as unknown as LawRowInput[]
    ).filter((r) => r.jurisdiction === chain.stateKey);
    const allowed =
      provision.series === "income-tax"
        ? rows.some((r) => r.value === 1)
        : rows.length > 0;
    return allowed
      ? {
          allowed: true,
          warning: "none",
          reason: `state law lets its places levy a local ${provision.series}`,
          source: rows[0]?.id ?? "",
        }
      : {
          allowed: false,
          warning: "preempted",
          reason: `state law gives its places no local ${provision.series}`,
          source: rows[0]?.id ?? "",
        };
  }
  if (provision.kind === "policy-question" && provision.question) {
    const answer =
      POLICY_QUESTIONS[provision.question]?.answers[chain.stateKey];
    if (answer?.preempts)
      return {
        allowed: false,
        warning: "preempted",
        reason: "state law rules this out for its places",
        source: provision.question,
      };
    return {
      allowed: true,
      warning: answer ? "disputed" : "none",
      reason: answer
        ? "the state has its own law on this; the city attorney expects a challenge"
        : "no state law on this",
      source: provision.question,
    };
  }
  return {
    allowed: true,
    warning: "none",
    reason: "no state limit recorded",
    source: "",
  };
}

function nextNumber(api: CoreAPI, officeId: string): string {
  const year = api.state.date.slice(0, 4);
  const key = `${officeId}:${year}`;
  const n =
    ((table(api, "counters").get(key) as unknown as { n: number } | undefined)
      ?.n ?? 0) + 1;
  table(api, "counters").put({ id: key, n } as unknown as ModuleRow);
  return `${year}-${String(n).padStart(3, "0")}`;
}

/** Workers in town paid under a proposed minimum wage, and what raising them costs a year. */
function costOf(api: CoreAPI, provisions: readonly Provision[]) {
  const wage = provisions.find(
    (p) => p.kind === "law-amount" && p.series === "minimum-wage",
  );
  if (!wage)
    return { workersRaised: 0, annualPayMinor: 0, note: "no pay effect" };
  const state = api.state as CoreState;
  let workers = 0;
  let cost = 0;
  for (const c of state.work.commitments.values())
    if (c.endsAt === undefined && c.hourlyMinor < wage.value) {
      workers += 1;
      cost +=
        (wage.value - c.hourlyMinor) * (c.expectedWeeklyMinutes / 60) * 52;
    }
  return {
    workersRaised: workers,
    annualPayMinor: Math.round(cost),
    note: "town jobs paid under the new floor, at their scheduled hours",
  };
}

const seriesPowers = (
  powers as unknown as {
    series: Record<string, { levels: string[]; source: string }>;
  }
).series;

/** A law amount this level has no power to set, with the law that says so; null when it may. */
function beyondPower(
  provision: Provision,
  level: "federal" | "state" | "local",
): Authority | null {
  if (provision.kind !== "law-amount" || !provision.series) return null;
  const power = seriesPowers[provision.series];
  if (!power || power.levels.includes(level)) return null;
  return {
    allowed: false,
    warning: "preempted",
    reason: `only ${power.levels.join(" or ")} government sets ${provision.series}`,
    source: power.source,
  };
}

/** Draft a bill: numbered, with its cost estimate and authority check. */
export function draftBill(
  api: CoreAPI,
  input: {
    readonly bodyOfficeId: string;
    readonly sponsorId: string;
    readonly provisions: readonly Provision[];
  },
): BillRow {
  // A state chamber legislates within the state's own power; a town's body
  // within what the state allows it.
  const stateBody = /:(legislature-|us-house|us-senate)/.test(
    input.bodyOfficeId,
  );
  const level = /:(us-house|us-senate)/.test(input.bodyOfficeId)
    ? "federal"
    : stateBody
      ? "state"
      : "local";
  const authority = input.provisions.map(
    (p) =>
      // A level may only set the amounts the law gives it (no council sets
      // SNAP or the Medicare tax; audit 3).
      beyondPower(p, level) ??
      (stateBody
        ? ({
            allowed: true,
            warning: "none",
            reason: "within the state's own power",
            source: "",
          } as Authority)
        : authorityFor(api, p)),
  );
  const bill: BillRow = {
    id: `bill:${input.bodyOfficeId}:${api.state.date}:${input.sponsorId}:${table(api, "bills").size}`,
    number: nextNumber(api, input.bodyOfficeId),
    bodyOfficeId: input.bodyOfficeId,
    sponsorId: input.sponsorId,
    introduced: api.state.date,
    provisions: input.provisions,
    costEstimate: costOf(api, input.provisions),
    authority,
    status: authority.some((a) => !a.allowed) ? "blocked" : "drafted",
    deals: [],
  };
  table(api, "bills").put(bill as unknown as ModuleRow);
  return bill;
}

/** Everyone serving in a body: every seat of the office, the town's or not. */
export function members(api: CoreAPI, officeId: string): readonly TermRow[] {
  if (officeId === FEDERAL_HOUSE || officeId === FEDERAL_SENATE)
    return congressMembers(api, officeId);
  const offices = api.moduleState(OFFICES_MODULE_ID);
  return (
    offices.table("seats").query("byOffice", [officeId]) as unknown as {
      id: string;
    }[]
  ).flatMap(
    (seat) =>
      offices
        .table("terms")
        .query("bySeatStatus", [seat.id, "serving"]) as unknown as TermRow[],
  );
}

const NON_VOTING = new Set([
  "US-DC",
  "US-PR",
  "US-GU",
  "US-VI",
  "US-AS",
  "US-MP",
]);
export const FEDERAL_HOUSE = "federal:us-house";
export const FEDERAL_SENATE = "federal:us-senate";

/**
 * Every member of Congress, seat by seat with the party that holds it (public
 * roster). The town's own members are its named officials (their terms in
 * the offices module); every other seat is a named official the world hasn't
 * built yet, voting by its party (SG-GOV-official-identity-only).
 */
/** The party a seat's coarse race elected, once its winner is seated (world-races). */
function worldSeatParty(api: CoreAPI, seatId: string): string | null {
  if (!api.state.modules.has("core2-world-races-v1")) return null;
  const row = api
    .moduleState("core2-world-races-v1")
    .table("seats")
    .get(seatId) as unknown as { party: string; since: string } | undefined;
  return row && row.since <= api.state.date ? row.party : null;
}

function congressMembers(api: CoreAPI, chamber: string): readonly TermRow[] {
  const congress = (
    partyCounts as unknown as {
      congress: Record<string, Record<string, string[]>>;
    }
  ).congress;
  const terms = api.moduleState(OFFICES_MODULE_ID).table("terms");
  const out: TermRow[] = [];
  for (const [state, seats] of Object.entries(congress))
    for (const [seat, parties] of Object.entries(seats)) {
      const senate = seat === "senate";
      if (senate !== (chamber === FEDERAL_SENATE)) continue;
      // Delegates and the Resident Commissioner don't vote on final passage
      // (House Rule III); a place with no senators has no senate rows.
      if (!senate && NON_VOTING.has(state)) continue;
      parties.forEach((party, index) => {
        const seatId = senate
          ? `seat:${state}:us-senate:${index}`
          : `seat:${state}:us-house:${seat.padStart(2, "0")}`;
        const real = (
          terms.query("bySeatStatus", [
            seatId,
            "serving",
          ]) as unknown as TermRow[]
        )[0];
        out.push(
          real ??
            ({
              id: `congress:${seatId}`,
              seatId,
              officeId: chamber,
              personId: null,
              identity: {
                givenName: "",
                familyName: "",
                gender: "",
                birthDate: "",
                homeState: state,
              },
              party: partyName(worldSeatParty(api, seatId) ?? party),
              startDate: api.state.date,
              endDate: null,
              endEstimated: true,
              reached: "in office at the opening",
              status: "serving",
            } as TermRow),
        );
      });
    }
  return out;
}

/** A member's key: their person id, or the named official's id until they're filled in. */
export function memberKey(term: TermRow): string {
  return term.personId ?? `official:${term.id}`;
}

/**
 * A member's lean: a full person's own, or, for a named official not filled
 * in yet, their seat's party side at the identity scale (stand-in until
 * CORE's fill-in gives them a life: SG-GOV-official-identity-only).
 */
export function leanOf(api: CoreAPI, memberId: string): number {
  const person = api.state.people.get(memberId);
  if (person) return personLean(api.state.people, person, townLean(api));
  const id = memberId.slice("official:".length);
  const term =
    (api.moduleState(OFFICES_MODULE_ID).table("terms").get(id) as unknown as
      TermRow | undefined) ??
    (id.startsWith("congress:")
      ? congressMembers(
          api,
          id.includes(":us-senate:") ? FEDERAL_SENATE : FEDERAL_HOUSE,
        ).find((t) => t.id === id)
      : undefined);
  return partySide(term?.party) * campaignParameter("identityLeanScale");
}

function townLean(api: CoreAPI): number {
  return (
    (
      api
        .moduleState("core2-campaigns-v1")
        .table("town")
        .get("town") as unknown as { lean: number } | undefined
    )?.lean ?? 0
  );
}

/** One member's position on a bill, part by part. */
export function memberPosition(
  api: CoreAPI,
  billId: string,
  memberId: string,
): MemberPosition {
  return positionOn(
    api,
    table(api, "bills").get(billId) as unknown as BillRow,
    memberId,
  );
}

const tieRules = (
  ties as unknown as {
    states: Record<string, { stateSenateTieBreaker?: { who: string } }>;
  }
).states;

/**
 * Who breaks a tie in a chamber: the Vice President in the U.S. Senate
 * (U.S. Const. art. I, § 3, cl. 4); in a state senate, the lieutenant
 * governor where the state's law gives them the vote
 * (`data/research/elections/tie-rules-2026.json`). Null where no one does.
 */
function tieBreaker(api: CoreAPI, chamber: string): string | null {
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const serving = (seatId: string) =>
    (
      offices
        .table("terms")
        .query("bySeatStatus", [seatId, "serving"]) as unknown as TermRow[]
    )[0];
  if (chamber === FEDERAL_SENATE) {
    const vp = serving("seat:US:vice-president");
    return vp ? memberKey(vp) : null;
  }
  const office = offices.table("offices").get(chamber) as unknown as
    { kind: string; jurisdiction: string } | undefined;
  if (office?.kind !== "legislature-upper") return null;
  if (
    tieRules[office.jurisdiction]?.stateSenateTieBreaker?.who !==
    "lieutenant governor"
  )
    return null;
  const lg = (
    offices
      .table("offices")
      .query("byJurisdiction", [office.jurisdiction]) as unknown as {
      id: string;
      kind: string;
    }[]
  ).find((o) => o.kind === "lieutenant-governor");
  if (!lg) return null;
  const seat = (
    offices.table("seats").query("byOffice", [lg.id]) as unknown as {
      id: string;
    }[]
  )[0];
  const term = seat ? serving(seat.id) : undefined;
  return term ? memberKey(term) : null;
}

/** A member's position on a bill's terms (the bill as recorded, or as an offer would leave it). */
function positionOn(
  api: CoreAPI,
  bill: BillRow,
  memberId: string,
): MemberPosition {
  const lean = leanOf(api, memberId);
  // A town member answers to the town; a state member to their district,
  // read as their own seat's lean until district views are modeled.
  const home = api.state.people.has(memberId) ? townLean(api) : lean;
  let views = 0;
  let constituents = 0;
  for (const provision of bill.provisions) {
    const stance = provisionStance(api, provision, billLevel(api, bill));
    if (!stance) continue;
    views += personStance(lean, stance.question) * stance.position;
    constituents += personStance(home, stance.question) * stance.position;
  }
  const relationship = (api.state as CoreState).relationships.get(
    [memberId, bill.sponsorId].sort().join(":"),
  );
  const sponsor =
    memberId === bill.sponsorId
      ? 1
      : campaignParameter("sponsorRelationshipWeight") *
        (relationship?.level ?? 0);
  // Only a deal the member took moves them: what the sponsor now owes them.
  const deal = bill.deals
    .filter((d) => d.memberId === memberId && d.status !== "declined")
    .reduce(
      (sum, d) => sum + dealValue(api, d.kind, memberId, bill.sponsorId),
      0,
    );
  const c = campaignParameter("constituentWeight");
  const lobby = positionTerms.reduce(
    (sum, term) => sum + term(api, bill, memberId),
    0,
  );
  return {
    memberId,
    views,
    constituents: c * constituents,
    sponsor,
    deal,
    lobby,
    total: views + c * constituents + sponsor + deal + lobby,
  };
}

/**
 * Learn a member's stake the way the character could: by asking them (a
 * conversation), from their voting record, or from what they've said. Returns
 * their position's parts.
 */
export function learnStake(
  api: CoreAPI,
  billId: string,
  memberId: string,
  route: "conversation" | "record" | "news",
): MemberPosition {
  const bill = table(api, "bills").get(billId) as unknown as BillRow;
  if (
    route === "conversation" &&
    api.state.people.has(memberId) &&
    memberId !== bill.sponsorId
  )
    api.relationship(bill.sponsorId, memberId, "contact", 0.05);
  return memberPosition(api, billId, memberId);
}

/**
 * Offer a member a deal: amend the bill's amount, back their own item (a
 * promise on the record), or a favor owed. The deal is recorded whether or
 * not it moves them; an amendment changes the bill's real terms.
 */
export function offerDeal(
  api: CoreAPI,
  input: {
    readonly billId: string;
    readonly memberId: string;
    readonly kind: "amend" | "back-their-item" | "favor";
    readonly amend?: { readonly index: number; readonly value: number };
  },
): {
  readonly accepted: boolean;
  readonly before: MemberPosition;
  readonly after: MemberPosition;
} {
  const bill = table(api, "bills").get(input.billId) as unknown as BillRow;
  const before = positionOn(api, bill, input.memberId);
  const provisions =
    input.kind === "amend" && input.amend
      ? bill.provisions.map((p, i) =>
          i === input.amend!.index ? { ...p, value: input.amend!.value } : p,
        )
      : bill.provisions;
  const terms =
    input.kind === "amend"
      ? `amend provision ${input.amend?.index} to ${input.amend?.value}`
      : input.kind;
  const deal = {
    memberId: input.memberId,
    kind: input.kind,
    terms,
    date: api.state.date,
  };
  // The member weighs the bill as the offer would leave it.
  const offered: BillRow = {
    ...bill,
    provisions,
    costEstimate: costOf(api, provisions),
    deals: [...bill.deals, { ...deal, status: "accepted" }],
  };
  const after = positionOn(api, offered, input.memberId);
  const accepted = after.total > 0 && before.total <= 0;
  // Accepted, the terms are real (an amendment changes the bill for
  // everyone) and the sponsor owes what they gave; declined, nothing changes
  // but the offer is on the record.
  const next: BillRow = accepted
    ? offered
    : { ...bill, deals: [...bill.deals, { ...deal, status: "declined" }] };
  table(api, "bills").put(next as unknown as ModuleRow);
  if (accepted && input.kind !== "amend")
    table(api, "obligations").put({
      id: `obligation:${bill.id}:${input.memberId}:${bill.deals.length}`,
      owedBy: bill.sponsorId,
      owedTo: input.memberId,
      kind: input.kind,
      billId: bill.id,
      measure: bill.number,
      date: api.state.date,
      settled: false,
    } as unknown as ModuleRow);
  if (
    api.state.people.has(input.memberId) &&
    api.state.people.has(bill.sponsorId)
  )
    api.relationship(bill.sponsorId, input.memberId, "contact", 0.05);
  return {
    accepted,
    before,
    after: accepted ? after : before,
  };
}

/**
 * What a deal is worth to a member: a favor owed counts for more the closer
 * they are to the sponsor; backing their own item counts as much as their
 * strongest view; an amendment's worth is in the bill's changed terms.
 */
function dealValue(
  api: CoreAPI,
  kind: string,
  memberId: string,
  sponsorId?: string,
): number {
  const weight = campaignParameter("dealWeight");
  if (kind === "amend") return 0;
  if (kind === "back-their-item") {
    const lean = leanOf(api, memberId);
    const strongest = Math.max(
      0,
      ...[...Object.keys(POLICY_QUESTIONS)].map((q) =>
        Math.abs(personStance(lean, q)),
      ),
    );
    return weight * strongest * 2;
  }
  const tie = sponsorId
    ? ((api.state as CoreState).relationships.get(
        [memberId, sponsorId].sort().join(":"),
      )?.level ?? 0)
    : 0;
  return weight * (1 + Math.max(0, tie));
}

/** What a sponsor owes the members who took their deals (favors, backing their items). */
export function obligationsOf(
  api: CoreAPI,
  personId: string,
): readonly {
  owedTo: string;
  kind: string;
  measure: string;
  settled: boolean;
}[] {
  return (
    table(api, "obligations").rows() as unknown as {
      owedBy: string;
      owedTo: string;
      kind: string;
      measure: string;
      settled: boolean;
    }[]
  ).filter((o) => o.owedBy === personId);
}

/** The bill's chambers, in order: the town's body, or the state's chambers starting where it was introduced. */
function chambersOf(api: CoreAPI, bill: BillRow): readonly string[] {
  const office = api
    .moduleState(OFFICES_MODULE_ID)
    .table("offices")
    .get(bill.bodyOfficeId) as unknown as
    { kind: string; jurisdiction: string } | undefined;
  if (office?.kind.startsWith("us-house") || office?.kind === "us-senate")
    return office.kind === "us-senate"
      ? [FEDERAL_SENATE, FEDERAL_HOUSE]
      : [FEDERAL_HOUSE, FEDERAL_SENATE];
  if (!office?.kind.startsWith("legislature-")) return [bill.bodyOfficeId];
  const others = (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("offices")
      .query("byJurisdiction", [office.jurisdiction]) as unknown as {
      id: string;
      kind: string;
    }[]
  )
    .filter(
      (o) => o.kind.startsWith("legislature-") && o.id !== bill.bodyOfficeId,
    )
    .map((o) => o.id)
    .sort();
  return [bill.bodyOfficeId, ...others];
}

function isState(api: CoreAPI, bill: BillRow): boolean {
  return (
    chambersOf(api, bill).length > 1 ||
    bill.bodyOfficeId.includes(":legislature-")
  );
}

/** One chamber's vote: each member yes for a positive position, no for a negative one, abstaining with nothing either way. */
function chamberVote(
  api: CoreAPI,
  bill: BillRow,
  officeId: string,
): { yes: number; no: number } {
  let yes = 0;
  let no = 0;
  for (const member of members(api, officeId)) {
    const key = memberKey(member);
    const position = memberPosition(api, bill.id, key);
    // A member who chose their vote (the player) votes as they chose; the
    // player is never voted for, so with no choice they abstain.
    const chosen = table(api, "choices").get(`${bill.id}|${key}`) as unknown as
      { vote: "yes" | "no" | "abstain" } | undefined;
    const vote =
      chosen?.vote ??
      (key === (api.state as CoreState).playerId
        ? "abstain"
        : position.total > 0
          ? "yes"
          : position.total < 0
            ? "no"
            : "abstain");
    if (vote === "yes") yes += 1;
    if (vote === "no") no += 1;
    table(api, "votes").put({
      id: `vote:${bill.id}:${key}`,
      billId: bill.id,
      memberId: key,
      chamber: officeId,
      vote,
      position,
    } as unknown as ModuleRow);
    for (const provision of bill.provisions) {
      const stance = provisionStance(api, provision, billLevel(api, bill));
      if (stance && vote !== "abstain")
        recordVote(api, {
          personId: key,
          body: officeId,
          measureId: bill.number,
          stance: {
            question: stance.question,
            position: vote === "yes" ? stance.position : -stance.position,
          },
          passed: null,
        });
    }
  }
  api.emit({
    id: `bill-vote:${bill.id}:${officeId}`,
    date: api.state.date,
    kind: "legislative-vote",
    personIds: members(api, officeId).flatMap((m) =>
      m.personId ? [m.personId] : [],
    ),
    placeId: lawChain(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `Vote on ${bill.number}`,
      asOf: api.state.date,
    },
    publicRecord: true,
    news: true,
    facts: {
      billId: bill.id,
      number: bill.number,
      chamber: officeId,
      yes: String(yes),
      no: String(no),
    },
  });
  return { yes, no };
}

export interface CommitteeRecord {
  readonly id: string;
  readonly billId: string;
  readonly chamber: string;
  readonly committee: string;
  readonly chairId: string;
  readonly memberIds: readonly string[];
  readonly heard: boolean;
  readonly witnesses: readonly {
    readonly personId: string;
    readonly stake: string;
  }[];
  readonly yes: number;
  readonly no: number;
  readonly reported: boolean;
}

/** The subject committee a bill goes to, by what its first provision touches. */
function committeeFor(bill: BillRow): string {
  const p = bill.provisions[0];
  if (
    p?.kind === "budget-line" ||
    p?.series === "income-tax" ||
    p?.series === "sales-tax"
  )
    return "finance";
  if (p?.series === "minimum-wage") return "labor";
  return "general";
}

/**
 * Committee: a body larger than the committee-of-the-whole size refers the
 * bill to its subject committee. The committee is the body's most senior
 * members (longest serving; generation order breaks ties) up to its size,
 * chaired by the most senior member of the majority side. The chair holds a
 * hearing only on a bill they don't oppose; witnesses are the town's people
 * the bill touches most (for a minimum wage, workers paid under the new
 * floor), heard on the record; then the committee votes. The size is the
 * typical standing committee's (`committeeSize`); seats go by seniority
 * until leadership appoints them (SG-GOV-committee-structure).
 */
function committeeStage(
  api: CoreAPI,
  bill: BillRow,
  chamber: string,
): CommitteeRecord | null {
  const all = members(api, chamber);
  if (all.length <= campaignParameter("committeeOfTheWholeMaximum"))
    return null;
  // stopgapId: SG-GOV-committee-structure
  api.stopgap("SG-GOV-committee-structure");
  const ranked = [...all].sort(
    (a, b) =>
      (a.serviceStart ?? a.startDate).localeCompare(
        b.serviceStart ?? b.startDate,
      ) || memberKey(a).localeCompare(memberKey(b)),
  );
  const size = Math.min(
    all.length,
    Math.max(
      campaignParameter("committeeSizeMinimum"),
      Math.min(
        campaignParameter("committeeSizeMaximum"),
        campaignParameter("committeeSize"),
      ),
    ),
  );
  // Committee seats follow the chamber's party ratio, the majority holding a
  // majority of them; each side seats its most senior members.
  const majority = Math.sign(
    all.reduce((sum, t) => sum + partySide(t.party), 0),
  );
  const bySide = new Map<number, TermRow[]>();
  for (const t of ranked) {
    const side = partySide(t.party);
    bySide.set(side, [...(bySide.get(side) ?? []), t]);
  }
  const seatsFor = new Map<number, number>();
  for (const [side, list] of bySide)
    seatsFor.set(side, Math.round((size * list.length) / all.length));
  if (majority !== 0 && bySide.has(majority))
    seatsFor.set(
      majority,
      Math.min(
        bySide.get(majority)!.length,
        Math.max(seatsFor.get(majority)!, Math.floor(size / 2) + 1),
      ),
    );
  const roster = [...bySide.entries()]
    .flatMap(([side, list]) => list.slice(0, seatsFor.get(side)))
    .sort(
      (a, b) =>
        (a.serviceStart ?? a.startDate).localeCompare(
          b.serviceStart ?? b.startDate,
        ) || memberKey(a).localeCompare(memberKey(b)),
    );
  let chair = roster.find((t) => partySide(t.party) === majority) ?? roster[0]!;
  // Where the chamber's leadership has seated the committee, its members and
  // chair stand in place of seniority.
  const seated = rosterProvider?.(api, chamber, committeeFor(bill));
  if (seated?.memberIds.length) {
    const byKey = new Map(all.map((t) => [memberKey(t), t]));
    const members = seated.memberIds
      .map((id) => byKey.get(id))
      .filter((t): t is TermRow => t !== undefined);
    if (members.length) {
      roster.splice(0, roster.length, ...members);
      chair = byKey.get(seated.chairId) ?? members[0]!;
    }
  }
  const chairPosition = memberPosition(api, bill.id, memberKey(chair));
  const heard = chairPosition.total >= 0;
  const witnesses: { personId: string; stake: string }[] = [];
  if (heard) {
    const wage = bill.provisions.find((p) => p.series === "minimum-wage");
    if (wage) {
      const state = api.state as CoreState;
      for (const c of [...state.work.commitments.values()]
        .filter((c) => c.endsAt === undefined && c.hourlyMinor < wage.value)
        .sort(
          (a, b) => a.hourlyMinor - b.hourlyMinor || a.id.localeCompare(b.id),
        )
        .slice(0, campaignParameter("hearingWitnesses")))
        witnesses.push({
          personId: c.personId,
          stake: `paid ${c.hourlyMinor} an hour, under the proposed floor`,
        });
    }
  }
  let yes = 0;
  let no = 0;
  if (heard)
    for (const member of roster) {
      const total = memberPosition(api, bill.id, memberKey(member)).total;
      if (total > 0) yes += 1;
      if (total < 0) no += 1;
    }
  const record: CommitteeRecord = {
    id: `committee:${bill.id}:${chamber}`,
    billId: bill.id,
    chamber,
    committee: committeeFor(bill),
    chairId: memberKey(chair),
    memberIds: roster.map(memberKey),
    heard,
    witnesses,
    yes,
    no,
    reported: heard && yes > no,
  };
  table(api, "committees").put(record as unknown as ModuleRow);
  api.emit({
    id: `committee:${bill.id}:${chamber}`,
    date: api.state.date,
    kind: heard ? "committee-hearing" : "bill-held-in-committee",
    personIds: witnesses
      .map((w) => w.personId)
      .filter((id) => api.state.people.has(id)),
    placeId: lawChain(api).townPlaceId,
    source: {
      tag: "ESTIMATED",
      citation: `Committee on ${bill.number}`,
      asOf: api.state.date,
      estimatedFrom: "SG-GOV-committee-structure",
    },
    publicRecord: true,
    news: heard,
    facts: {
      billId: bill.id,
      committee: record.committee,
      chair: record.chairId,
      yes: String(yes),
      no: String(no),
    },
  });
  return record;
}

export function committeeRecords(
  api: CoreAPI,
  billId: string,
): readonly CommitteeRecord[] {
  return (
    table(api, "committees").rows() as unknown as CommitteeRecord[]
  ).filter((c) => c.billId === billId);
}

/**
 * The bill's votes: each chamber in turn (a town has one body); a majority of
 * those voting passes it in each, and in the U.S. Senate only after three
 * fifths of its members vote to end debate. Every vote is on the record.
 */
export function holdVote(api: CoreAPI, billId: string): BillRow {
  if (
    (table(api, "bills").get(billId) as unknown as BillRow).status === "drafted"
  )
    for (const hook of beforeVoteHooks) hook(api, billId);
  const bill = table(api, "bills").get(billId) as unknown as BillRow;
  if (bill.status !== "drafted") return bill;
  const tallies: { yes: number; no: number; members: number }[] = [];
  for (const chamber of chambersOf(api, bill)) {
    const committee = committeeStage(api, bill, chamber);
    if (committee && !committee.reported) {
      const held: BillRow = { ...bill, status: "failed" };
      table(api, "bills").put(held as unknown as ModuleRow);
      return held;
    }
    const counted = chamberVote(api, bill, chamber);
    // A tie: the presiding officer who may break one does (the Vice President
    // in the U.S. Senate, a lieutenant governor where the state's law says);
    // otherwise a tied vote fails.
    const breaker =
      counted.yes === counted.no ? tieBreaker(api, chamber) : null;
    const breakerYes =
      breaker !== null && memberPosition(api, bill.id, breaker).total > 0;
    const tally =
      breaker === null
        ? counted
        : {
            yes: counted.yes + (breakerYes ? 1 : 0),
            no: counted.no + (breakerYes ? 0 : 1),
          };
    if (breaker !== null)
      table(api, "votes").put({
        id: `vote:${bill.id}:${breaker}:tie`,
        billId: bill.id,
        memberId: breaker,
        chamber,
        vote: breakerYes ? "yes" : "no",
        position: memberPosition(api, bill.id, breaker),
        tieBreak: true,
      } as unknown as ModuleRow);
    tallies.push({ ...tally, members: members(api, chamber).length });
    // The Senate first needs three fifths of its sworn members to end debate.
    const cloture =
      chamber === FEDERAL_SENATE &&
      tally.yes <
        Math.ceil(
          members(api, chamber).length *
            campaignParameter("senateClotureShare"),
        );
    if (tally.yes <= tally.no || cloture) {
      const failed: BillRow = { ...bill, status: "failed" };
      table(api, "bills").put(failed as unknown as ModuleRow);
      return failed;
    }
  }
  const passed: BillRow = { ...bill, status: "passed" };
  table(api, "bills").put(passed as unknown as ModuleRow);
  return executiveAction(api, passed, tallies);
}

/**
 * The executive's turn: a governor, or a directly elected mayor (or other
 * chief executive with a veto), signs or vetoes from their own position;
 * where the form of government gives no veto, a passed bill is law. An
 * override needs two thirds of every chamber's whole membership (the modal
 * rule, counted against all members; `vetoOverrideShare`).
 */
function executiveAction(
  api: CoreAPI,
  bill: BillRow,
  tallies: readonly { yes: number; no: number; members: number }[],
): BillRow {
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const body = offices.table("offices").get(bill.bodyOfficeId) as unknown as {
    jurisdiction: string;
    kind: string;
  };
  const federal = body.kind.startsWith("us-house") || body.kind === "us-senate";
  const executiveOffice = (
    offices
      .table("offices")
      .query("byJurisdiction", [
        federal ? "US" : body.jurisdiction,
      ]) as unknown as {
      id: string;
      kind: string;
      elected: boolean;
    }[]
  ).find(
    (o) =>
      o.elected && /^(mayor|governor|county-executive|president)$/.test(o.kind),
  );
  const executive = executiveOffice
    ? (
        offices
          .table("seats")
          .query("byOffice", [executiveOffice.id]) as unknown as {
          id: string;
        }[]
      ).flatMap(
        (seat) =>
          offices
            .table("terms")
            .query("bySeatStatus", [
              seat.id,
              "serving",
            ]) as unknown as TermRow[],
      )[0]
    : undefined;
  let status: BillRow["status"] = "enacted";
  // A mayor vetoes only where the state's law gives the office a veto (and
  // above any population line), overridden by the state's own share.
  const mayorRule = executiveOffice?.kind === "mayor" ? mayorVeto(api) : null;
  if (executive && (!mayorRule || mayorRule.veto)) {
    const key = memberKey(executive);
    const position = memberPosition(api, bill.id, key);
    const decided = table(api, "choices").get(
      `${bill.id}|executive`,
    ) as unknown as { sign: boolean } | undefined;
    // The player decides for themselves: the bill waits on their desk.
    if (!decided && key === (api.state as CoreState).playerId) {
      const waiting: BillRow = { ...bill, status: "awaiting-signature" };
      table(api, "bills").put({
        ...waiting,
        tallies,
      } as unknown as ModuleRow);
      return waiting;
    }
    const vetoes = decided ? !decided.sign : position.total < 0;
    if (vetoes) {
      // Two thirds of each body's whole membership (not of those voting).
      const share =
        mayorRule?.overrideShare ?? campaignParameter("vetoOverrideShare");
      status = tallies.every(
        (t) =>
          t.yes >=
          (mayorRule?.plusOne
            ? Math.floor(t.members * share) + 1
            : Math.ceil(t.members * share - 1e-9)),
      )
        ? "overridden"
        : "vetoed";
    } else status = "signed";
    table(api, "votes").put({
      id: `vote:${bill.id}:${key}`,
      billId: bill.id,
      memberId: key,
      vote: status === "signed" ? "sign" : "veto",
      position,
    } as unknown as ModuleRow);
  }
  const next: BillRow = { ...bill, status };
  table(api, "bills").put(next as unknown as ModuleRow);
  if (status === "vetoed") return next;
  return enact(api, next);
}

const MAYOR_VETO = (
  mayorVetoData as unknown as {
    states: Record<
      string,
      {
        mayorCouncil: {
          veto: boolean;
          minPopulation: number | null;
          overrideShare: number;
          overridePlusOne?: boolean;
        };
      }
    >;
  }
).states;

/**
 * Whether the town's mayor holds a veto under the state's law for its
 * mayor-council cities (`data/research/local-government/mayor-veto-2026.json`,
 * from the state baselines' statute notes), and the override it takes.
 */
export function mayorVeto(api: CoreAPI): {
  veto: boolean;
  overrideShare: number;
  plusOne: boolean;
} {
  const rule = MAYOR_VETO[lawChain(api).stateKey]?.mayorCouncil;
  const population = Number(api.state.placeMetadata.referencePopulation) || 0;
  return {
    veto:
      (rule?.veto ?? true) &&
      (rule?.minPopulation == null || population >= rule.minPopulation),
    overrideShare:
      rule?.overrideShare ?? campaignParameter("vetoOverrideShare"),
    plusOne: rule?.overridePlusOne ?? false,
  };
}

/** A member's own vote on a bill, cast before the vote is held (the player's). */
export function castMemberVote(
  api: CoreAPI,
  billId: string,
  memberId: string,
  vote: "yes" | "no" | "abstain",
): void {
  table(api, "choices").put({
    id: `${billId}|${memberId}`,
    vote,
  } as unknown as ModuleRow);
}

/**
 * The executive's own decision on a passed bill: sign it, or veto it (the
 * body may then override by two thirds). Completes a bill waiting on the
 * player's desk; for another executive, it's recorded for their next turn.
 */
export function executiveDecision(
  api: CoreAPI,
  billId: string,
  sign: boolean,
): BillRow {
  table(api, "choices").put({
    id: `${billId}|executive`,
    sign,
  } as unknown as ModuleRow);
  const bill = table(api, "bills").get(billId) as unknown as BillRow & {
    tallies?: { yes: number; no: number; members: number }[];
  };
  if (bill.status !== "awaiting-signature") return bill;
  return executiveAction(api, bill, bill.tallies ?? []);
}

/** A county board's ordinances are county law: the county the board governs, in the town's chain. */
function countyOfBody(api: CoreAPI, bill: BillRow): string | null {
  const office = api
    .moduleState(OFFICES_MODULE_ID)
    .table("offices")
    .get(bill.bodyOfficeId) as unknown as
    { kind: string; jurisdiction: string } | undefined;
  if (office?.kind !== "county-board") return null;
  const chain = lawChain(api);
  const unit = governmentUnitsForPlace(
    chain.levels[chain.levels.length - 1]!.jurisdiction.slice("place:".length),
  ).find((u) => u.id === office.jurisdiction);
  const geoid = unit?.countyGeoid ?? chain.countyGeoids[0];
  return geoid ? `county:${geoid}` : null;
}

/**
 * Put each provision into law on its effective date: an ordinance thirty days
 * after enactment unless it names a date; a state act by its state's default
 * rule.
 */
function enact(api: CoreAPI, bill: BillRow): BillRow {
  const chain = lawChain(api);
  // A federal act takes effect when it becomes law unless it names a date
  // (the general rule: Gozlon-Peretz v. United States, 498 U.S. 395 (1991)).
  const federal = chambersOf(api, bill).includes(FEDERAL_HOUSE);
  const state = !federal && isState(api, bill);
  const county = !federal && !state ? countyOfBody(api, bill) : null;
  const jurisdiction = federal
    ? "US"
    : state
      ? chain.stateKey
      : (county ?? chain.levels[chain.levels.length - 1]!.jurisdiction);
  const level = federal
    ? "federal"
    : state
      ? "state"
      : county
        ? "county"
        : "city";
  const stateDate = state
    ? stateActEffectiveDate(chain.stateKey, api.state.date)
    : null;
  const defaultDate =
    (federal ? api.state.date : null) ??
    stateDate?.date ??
    new Date(
      Date.parse(`${api.state.date}T00:00:00Z`) +
        campaignParameter("ordinanceEffectiveDays") * 86_400_000,
    )
      .toISOString()
      .slice(0, 10);
  const citation = federal
    ? `Public Law (bill ${bill.number})`
    : state
      ? `Act ${bill.number}${stateDate ? ` (effective by ${stateDate.cite})` : ""}`
      : `Ordinance ${bill.number}`;
  for (const provision of bill.provisions) {
    const effectiveDate = provision.effectiveDate ?? defaultDate;
    if (provision.kind === "law-amount" && provision.series)
      enactLaw(api, {
        jurisdiction,
        level,
        series: provision.series,
        value: provision.value,
        unit:
          provision.unit ??
          (provision.series === "minimum-wage" ? "minor/hour" : "percent"),
        effectiveDate,
        measureId: bill.number,
        citation,
      });
    if (provision.kind === "budget-line" && provision.line)
      amendBudget(api, {
        governmentId: jurisdiction,
        line: provision.line,
        deltaMinor: provision.value,
        measureId: bill.number,
      });
    if (provision.kind === "policy-question" && provision.question)
      enactLaw(api, {
        jurisdiction,
        level,
        series: provision.question,
        value: provision.value > 0 ? 1 : 0,
        effectiveDate,
        measureId: bill.number,
        citation,
      });
  }
  const next: BillRow = {
    ...bill,
    status: bill.status === "overridden" ? "overridden" : "enacted",
  };
  table(api, "bills").put(next as unknown as ModuleRow);
  return next;
}

function legislatureCalendar(
  api: CoreAPI,
  work: Readonly<ModuleCalendarWork>,
): void {
  if (work.kind === "council-meeting") holdVote(api, work.sourceRecordIds[0]!);
}

/** Put a bill on the body's next meeting (stand-in: two weeks out until meeting calendars are read). */
export function scheduleVote(api: CoreAPI, billId: string): string {
  const date = new Date(
    Date.parse(`${api.state.date}T00:00:00Z`) + 14 * 86_400_000,
  )
    .toISOString()
    .slice(0, 10);
  api.moduleCalendar(LEGISLATURE_MODULE_ID).schedule({
    key: `meeting:${billId}`,
    date,
    kind: "council-meeting",
    source: {
      tag: "ESTIMATED",
      citation: "Two weeks to the next regular meeting",
      asOf: api.state.date,
      estimatedFrom:
        "Most councils meet twice a month (ICMA municipal form of government survey)",
    },
    sourceRecordIds: [billId],
  });
  return date;
}

export function billOf(api: CoreAPI, billId: string): BillRow {
  return table(api, "bills").get(billId) as unknown as BillRow;
}

export function votesOn(
  api: CoreAPI,
  billId: string,
): readonly { memberId: string; vote: string; position: MemberPosition }[] {
  return table(api, "votes").query("byBill", [billId]) as unknown as {
    memberId: string;
    vote: string;
    position: MemberPosition;
  }[];
}

export type { PersonState };
export { OFFICES_MODULE_ID };

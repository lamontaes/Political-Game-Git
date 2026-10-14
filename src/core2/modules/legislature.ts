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
import {
  enactLaw,
  lastEnactment,
  lawChain,
  lawInForce,
  LAWS_MODULE_ID,
} from "./laws";
import { localAuthority, type EnactedAuthority } from "../laws-in-force";
import type { LawRowInput } from "../laws-starting";
import { OFFICES_MODULE_ID, type TermRow } from "./offices";
import { recordVote, votesOf } from "./record";
import { viewOn } from "./views";
import { closenessBetween } from "../closeness";
import { bribePull } from "./corruption";
import { deliverSpeech, SPEECH_MODULE_ID } from "./speech";
import {
  BUDGETS_MODULE_ID,
  amendBudget,
  budgetPriorities,
  carriedBudget,
  clearBudgetPriorities,
  enactBudget,
  registerBudgetVote,
  type BudgetRow,
  type GovernmentRow,
} from "./budgets";
import { partyName, partySide } from "../appointments";
import {
  atLarge,
  currentOfficial,
  executivePull,
  holderOf,
  officialLean,
  officialOf,
  officialParts,
  openOfficials,
  OFFICIALS_MODULE_ID,
  seatOfficial,
} from "./officials";
import mayorVetoData from "../../../data/research/local-government/mayor-veto-2026.json" with { type: "json" };
import { parameter } from "../parameters";
import { decisionLean } from "../trait-decisions";
import { stateActEffectiveDate } from "../state-effective-date";
import representation from "../data/offices/federal-representation.json" with { type: "json" };
import proposalData from "../data/legislature/executive-proposal.json" with { type: "json" };
import vetoWindowData from "../../../data/research/laws/veto-windows-2023.json" with { type: "json" };
import type { Source } from "../types";
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
  /** The catalog policy the section was drafted from, and what it does to it. */
  readonly policyId?: string;
  readonly operation?: string;
}

export interface Authority {
  readonly allowed: boolean;
  readonly warning: "none" | "disputed" | "preempted";
  /** Why, as a record code the English engine words (never player text). */
  readonly reason: AuthorityReason;
  /** The law row, question or statute the reason rests on. */
  readonly source: string;
}

export type AuthorityReason =
  | "state-grants-local-minimum-wage"
  | "state-preempts-local-minimum-wage"
  | "state-gives-no-local-minimum-wage"
  | "state-allows-local-tax"
  | "state-gives-no-local-tax"
  | "state-preempts-question"
  | "state-has-own-law"
  | "no-state-law"
  | "no-state-limit"
  | "within-own-power"
  | "level-lacks-power";

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
  /** Where the member stands on the bill's questions today. */
  readonly views: number;
  /** Where they stood at the opening, before any case was made to them. */
  readonly openingViews: number;
  readonly constituents: number;
  readonly sponsor: number;
  readonly deal: number;
  /** What organized interests that met the member pressed on them. */
  readonly lobby: number;
  /**
   * A state or federal official's further reasons (OPUS-OFFICIALS): their
   * party's leadership (or caucus), their wing, ambition and the next
   * election, and press attention. Zero for a town member.
   */
  readonly party?: number;
  readonly wing?: number;
  readonly ambition?: number;
  readonly press?: number;
  /** What the member's traits add: every trait's lean toward yes over no. */
  readonly trait: number;
  /** Their own last vote on the question, while the law is fresh: for a bill that keeps it, against one that undoes it. */
  readonly consistency: number;
  /** What a bribe they took on this bill pulls them toward (the payer's side). */
  readonly bribe: number;
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
      carryRequests: {},
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
/** What the executive did with a passed bill on their desk, and why. */
export interface DeskAction {
  readonly bill: BillRow;
  readonly executiveId: string;
  readonly status:
    "signed" | "vetoed" | "overridden" | "awaiting" | "unsigned" | "died";
  readonly position: number;
  readonly temperament: number;
  /** For a bill waiting on the desk: the last day to act. */
  readonly signBy?: string;
}
const deskHooks: ((api: CoreAPI, action: DeskAction) => void)[] = [];
/**
 * Other engines add to a member's reasons (organized interests lobbying), act
 * on a bill before its votes (groups forming from its fiscal note) and keep
 * the executive's desk (what they signed or vetoed).
 */
export function registerLegislatureHooks(input: {
  readonly positionTerm?: PositionTerm;
  readonly beforeVote?: (api: CoreAPI, billId: string) => void;
  readonly onDesk?: (api: CoreAPI, action: DeskAction) => void;
}): void {
  if (input.positionTerm && !positionTerms.includes(input.positionTerm))
    positionTerms.push(input.positionTerm);
  if (input.beforeVote && !beforeVoteHooks.includes(input.beforeVote))
    beforeVoteHooks.push(input.beforeVote);
  if (input.onDesk && !deskHooks.includes(input.onDesk))
    deskHooks.push(input.onDesk);
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
  // Every body's members are people with reasons of their own (OPUS-OFFICIALS).
  if (core.modules.has(OFFICES_MODULE_ID)) openOfficials(core);
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
  // The changes that passed, after any the negotiation dropped.
  const passed = Object.fromEntries(
    kept.map((p) => {
      const line = p as unknown as { line: string; value: number };
      return [line.line, line.value];
    }),
  );
  const votes = tallies.join(", ");
  // A passed bill's line changes become the government's enacted lines; a
  // failed one leaves last year's enacted lines in force.
  const budget = adopted
    ? enactBudget(
        api,
        gov,
        fy,
        `${chambers.body} vote ${votes}${dropped.length ? ` (amended: ${dropped.join(", ")} dropped)` : ""}, ${bill.number}`,
        passed,
      )
    : carriedBudget(
        api,
        gov,
        fy,
        `carried forward after ${chambers.body} rejected ${bill.number} ${votes}`,
      );
  clearBudgetPriorities(api, gov.id);
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
  const share =
    campaignParameter("executivePriorityShare") *
    Math.max(
      0,
      1 +
        traitLean(api, key, "legislature.budget-priorities", ["move", "hold"]),
    );
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
          reason: "state-grants-local-minimum-wage",
          source: rows[0]?.id ?? "",
        }
      : {
          allowed: false,
          warning: "preempted",
          reason: authority.preempts
            ? "state-preempts-local-minimum-wage"
            : "state-gives-no-local-minimum-wage",
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
          reason: "state-allows-local-tax",
          source: rows[0]?.id ?? "",
        }
      : {
          allowed: false,
          warning: "preempted",
          reason: "state-gives-no-local-tax",
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
        reason: "state-preempts-question",
        source: provision.question,
      };
    return {
      allowed: true,
      warning: answer ? "disputed" : "none",
      reason: answer ? "state-has-own-law" : "no-state-law",
      source: provision.question,
    };
  }
  return {
    allowed: true,
    warning: "none",
    reason: "no-state-limit",
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

const { series: seriesPowers, questions: questionPowers } =
  powers as unknown as {
    series: Record<string, { levels: string[]; source: string }>;
    questions: Record<string, { levels: string[]; source: string }>;
  };

/** A law amount this level has no power to set, with the law that says so; null when it may. */
export function beyondPower(
  provision: Provision,
  level: "federal" | "state" | "local",
): Authority | null {
  const power =
    provision.kind === "law-amount" && provision.series
      ? seriesPowers[provision.series]
      : provision.kind === "policy-question" && provision.question
        ? questionPowers[provision.question]
        : undefined;
  if (!power || power.levels.includes(level)) return null;
  return {
    allowed: false,
    warning: "preempted",
    reason: "level-lacks-power",
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
  const bill: BillRow = {
    id: `bill:${input.bodyOfficeId}:${api.state.date}:${input.sponsorId}:${table(api, "bills").size}`,
    number: nextNumber(api, input.bodyOfficeId),
    bodyOfficeId: input.bodyOfficeId,
    sponsorId: input.sponsorId,
    introduced: api.state.date,
    deals: [],
    ...checkedText(api, input.bodyOfficeId, input.provisions),
  };
  table(api, "bills").put(bill as unknown as ModuleRow);
  return bill;
}

/**
 * A bill's text checked: each section's authority (a state chamber
 * legislates within the state's own power, a town's body within what the
 * state allows it) and what it costs; blocked while any section is beyond
 * the body's power.
 */
function checkedText(
  api: CoreAPI,
  bodyOfficeId: string,
  provisions: readonly Provision[],
): Pick<BillRow, "provisions" | "costEstimate" | "authority" | "status"> {
  const stateBody = /:(legislature-|us-house|us-senate)/.test(bodyOfficeId);
  const level = /:(us-house|us-senate)/.test(bodyOfficeId)
    ? "federal"
    : stateBody
      ? "state"
      : "local";
  const authority = provisions.map(
    (p) =>
      // A level may only set the amounts the law gives it (no council sets
      // SNAP or the Medicare tax; audit 3).
      beyondPower(p, level) ??
      (stateBody
        ? ({
            allowed: true,
            warning: "none",
            reason: "within-own-power",
            source: "",
          } as Authority)
        : authorityFor(api, p)),
  );
  return {
    provisions,
    costEstimate: costOf(api, provisions),
    authority,
    status: authority.some((a) => !a.allowed) ? "blocked" : "drafted",
  };
}

/**
 * The sponsor edits the bill on paper before its vote (the owner's
 * bill-on-paper workflow, September 25, 2026): add a section, replace one or
 * strike one. The paper is the one record of the bill: each edit rewrites
 * its sections and checks them again. A bill already voted on is not edited.
 */
export function reviseBill(
  api: CoreAPI,
  billId: string,
  edit:
    | { readonly add: Provision }
    | { readonly replace: number; readonly with: Provision }
    | { readonly strike: number },
): BillRow {
  const bill = table(api, "bills").get(billId) as unknown as BillRow;
  if (!bill) throw new Error(`No such bill: ${billId}`);
  if (bill.status !== "drafted" && bill.status !== "blocked")
    throw new Error(`Bill ${bill.number} is ${bill.status}, past editing.`);
  const at =
    "add" in edit ? -1 : "replace" in edit ? edit.replace : edit.strike;
  if (!("add" in edit) && !bill.provisions[at])
    throw new Error(`Bill ${bill.number} has no section ${at + 1}.`);
  const provisions =
    "add" in edit
      ? [...bill.provisions, edit.add]
      : "replace" in edit
        ? bill.provisions.map((p, i) => (i === at ? edit.with : p))
        : bill.provisions.filter((_, i) => i !== at);
  const next: BillRow = {
    ...bill,
    ...checkedText(api, bill.bodyOfficeId, provisions),
  };
  table(api, "bills").put(next as unknown as ModuleRow);
  return next;
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
  ).flatMap((seat) =>
    (
      offices
        .table("terms")
        .query("bySeatStatus", [seat.id, "serving"]) as unknown as TermRow[]
    ).map((term) => holderOf(api, term)),
  );
}

/** Places whose House member does not vote on final passage (House Rule III), from data. */
const NON_VOTING = new Set(
  Object.keys(
    (representation as unknown as { places: Record<string, unknown> }).places,
  ),
);
export const FEDERAL_HOUSE = "federal:us-house";
export const FEDERAL_SENATE = "federal:us-senate";

/**
 * Every member of Congress, seat by seat with the party that holds it (public
 * roster), each a person (OPUS-OFFICIALS): the town's state's members hold
 * terms in the offices module; every other seat's holder is an official
 * seated at the opening, or, once a race elsewhere changes the seat's party,
 * the winner, seated as a person the first time the seat is read.
 */
/** The party a seat's coarse race elected, once its winner is seated (world-races). */
function worldSeatParty(
  api: CoreAPI,
  seatId: string,
): { party: string; since: string } | null {
  if (!api.state.modules.has("core2-world-races-v1")) return null;
  const row = api
    .moduleState("core2-world-races-v1")
    .table("seats")
    .get(seatId) as unknown as { party: string; since: string } | undefined;
  return row && row.since <= api.state.date ? row : null;
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
      parties.forEach((rosterParty, index) => {
        const seatId = senate
          ? `seat:${state}:us-senate:${index}`
          : `seat:${state}:us-house:${seat.padStart(2, "0")}`;
        // The offices engine files a state's single House seat as "at-large".
        const real = [seatId, atLarge(seatId)]
          .map(
            (id) =>
              (
                terms.query("bySeatStatus", [
                  id,
                  "serving",
                ]) as unknown as TermRow[]
              )[0],
          )
          .find(Boolean);
        if (real) {
          out.push(holderOf(api, real));
          return;
        }
        const won = worldSeatParty(api, seatId);
        const party = partyName(won?.party ?? rosterParty);
        // A world without the officials engine has seats, not people.
        if (!api.state.modules.has(OFFICIALS_MODULE_ID)) {
          out.push({
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
            party,
            startDate: api.state.date,
            endDate: null,
            endEstimated: true,
            reached: "in office at the opening",
            status: "serving",
          } as TermRow);
          return;
        }
        // The opening's holder serves until a race hands the seat to the
        // other party; the winner is then a new person.
        const holder = currentOfficial(api, seatId);
        const official =
          holder && partyName(holder.party) === party
            ? holder
            : seatOfficial(api, {
                key: `${seatId}:${won?.since ?? api.state.date}`,
                seatId,
                term: null,
                body: senate ? "US:us-senate" : "US:us-house",
                officeKind: senate ? "us-senate" : "us-house",
                stateKey: state,
                district: senate ? null : seat,
                party,
                termYears: senate ? 6 : 2,
              });
        const changed = official !== holder;
        const person = api.state.people.get(official.id)!;
        out.push({
          id: `congress:${official.id.slice("official:".length)}`,
          seatId,
          officeId: chamber,
          personId: official.id,
          identity: {
            givenName: person.givenName,
            familyName: person.familyName,
            gender: person.looks?.gender ?? "",
            birthDate: person.birthDate,
            homeState: state,
          },
          party,
          startDate: official.serviceStart,
          serviceStart: official.serviceStart,
          endDate: null,
          endEstimated: true,
          reached: changed ? "elected" : "in office at the opening",
          status: "serving",
        } as TermRow);
      });
    }
  return out;
}

/** A member's key: their person id, or the named official's id until they're filled in. */
export function memberKey(term: TermRow): string {
  return term.personId ?? `official:${term.id}`;
}

/**
 * A member's lean: a state or federal official's own position (their ideal
 * point, OPUS-OFFICIALS), or a town resident's own lean.
 */
export function leanOf(api: CoreAPI, memberId: string): number {
  const official = officialOf(api, memberId);
  if (official) return officialLean(official);
  const person = api.state.people.get(memberId);
  if (person) return personLean(api.state.people, person, townLean(api));
  // A holder the officials engine hasn't seated (a world without it) leans
  // with nothing: no party line stands in for a person.
  return 0;
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

/**
 * A full person's traits' lean between two options of a registered decision,
 * at the shared weight; a named official not filled in yet adds nothing.
 */
function traitLean(
  api: CoreAPI,
  memberId: string,
  decisionId: string,
  [toward, over]: readonly [string, string],
): number {
  const person = api.state.people.get(memberId);
  return person
    ? parameter("traitDecisionWeight") *
        decisionLean(api.state, person, decisionId, toward, over)
    : 0;
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
  const serving = (seatId: string) => {
    const term = (
      offices
        .table("terms")
        .query("bySeatStatus", [seatId, "serving"]) as unknown as TermRow[]
    )[0];
    return term ? holderOf(api, term) : undefined;
  };
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

/** The series a provision changes in the law table (none for a budget line). */
function provisionSeries(provision: Provision): string | undefined {
  if (provision.kind === "policy-question") return provision.question;
  if (provision.kind === "law-amount") return provision.series;
  return undefined;
}

/**
 * How settled the law a change would move is, from -1 (passed today) to 1
 * (long standing): (age - H) / (age + H), where age is the days since the
 * last law enacted on it passed and H is `settledLawDays`. A law nothing has
 * changed since the opening is fully settled.
 */
export function settledness(api: CoreAPI, series: string | undefined): number {
  const last = series ? lastEnactment(api, series) : null;
  if (!last) return 1;
  const age = Math.max(
    0,
    (Date.parse(`${api.state.date}T00:00:00Z`) -
      Date.parse(`${last.passedOn}T00:00:00Z`)) /
      86_400_000,
  );
  const half = campaignParameter("settledLawDays");
  return (age - half) / (age + half);
}

/**
 * A trait's lean toward change, read against how settled the law is: one who
 * likes change backs changing settled law and resists undoing fresh law (the
 * lean times settledness); one who keeps things as they are resists any
 * change to the law in force, fresh or settled.
 */
export function tasteForChange(lean: number, settled: number): number {
  return lean > 0 ? lean * settled : lean;
}

/**
 * How a member's own last vote on a bill's questions weighs on this one,
 * while the law is fresh: plus for a bill that goes the way they voted, minus
 * for one that undoes it, by `reversalReluctance` times freshness.
 */
function recordConsistency(
  api: CoreAPI,
  memberId: string,
  bill: BillRow,
): number {
  let sum = 0;
  for (const p of bill.provisions) {
    const series = provisionSeries(p);
    const stance = provisionStance(api, p, billLevel(api, bill));
    if (!series || !stance) continue;
    const last = votesOf(api, memberId)
      .filter((v) => v.stance.question === stance.question)
      .at(-1);
    if (!last) continue;
    const freshness = (1 - settledness(api, series)) / 2;
    sum +=
      campaignParameter("reversalReluctance") *
      freshness *
      Math.sign(last.stance.position * stance.position);
  }
  return sum;
}

/** A bill's settledness: the least settled law any of its provisions moves. */
function billSettledness(api: CoreAPI, bill: BillRow): number {
  return bill.provisions.reduce(
    (least, p) => Math.min(least, settledness(api, provisionSeries(p))),
    1,
  );
}

/** A member's position on a bill's terms (the bill as recorded, or as an offer would leave it). */
function positionOn(
  api: CoreAPI,
  bill: BillRow,
  memberId: string,
): MemberPosition {
  const official = officialOf(api, memberId);
  const stances = bill.provisions.flatMap((provision) => {
    const stance = provisionStance(api, provision, billLevel(api, bill));
    return stance ? [stance] : [];
  });
  // A state or federal official weighs their own reasons (OPUS-OFFICIALS);
  // a town member their own views and the town's lean.
  const parts = official ? officialParts(api, official, stances) : null;
  const lean = leanOf(api, memberId);
  const home = townLean(api);
  let views = parts?.views ?? 0;
  let openingViews = views;
  let constituents = 0;
  // A town member's views are where they stand on each question today: the
  // opening lean plus every case made to them since (the views engine).
  if (!parts)
    for (const stance of stances) {
      views += viewOn(api, memberId, stance.question, lean) * stance.position;
      openingViews += personStance(lean, stance.question) * stance.position;
      constituents += personStance(home, stance.question) * stance.position;
    }
  const sponsor =
    memberId === bill.sponsorId
      ? 1
      : campaignParameter("sponsorRelationshipWeight") *
        closenessBetween(api.state as CoreState, memberId, bill.sponsorId);
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
  const answersHome = parts ? parts.constituents : c * constituents;
  const further = parts
    ? {
        party: parts.party,
        wing: parts.wing,
        ambition: parts.ambition,
        press: parts.press,
      }
    : null;
  // A taste for change backs changing a settled law and resists reversing
  // a fresh one: the trait part reads the bill against the law in force.
  const trait = tasteForChange(
    traitLean(api, memberId, "legislature.member-position", ["yes", "no"]),
    billSettledness(api, bill),
  );
  // A member's own record: undoing what they just voted for, or redoing what
  // they just voted against, weighs against them while the law is fresh.
  const consistency = recordConsistency(api, memberId, bill);
  // A bribe they took on this bill, as far as it moves them.
  const bribe = bribePull(api, memberId, bill.id);
  return {
    memberId,
    views,
    openingViews,
    constituents: answersHome,
    sponsor,
    deal,
    lobby,
    ...(further ?? {}),
    trait,
    consistency,
    bribe,
    total:
      views +
      answersHome +
      sponsor +
      deal +
      lobby +
      trait +
      consistency +
      bribe +
      (further
        ? further.party + further.wing + further.ambition + further.press
        : 0),
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

/** A request that a member carry a bill, the member's answer and why. */
export interface CarryRequest {
  readonly id: string;
  readonly askerId: string;
  readonly memberId: string;
  readonly bodyOfficeId: string;
  readonly date: string;
  readonly provisions: readonly Provision[];
  /** The member's position on the bill as the asker's, part by part. */
  readonly position: MemberPosition;
  /** The asker's standing in town, as a reason. */
  readonly standing: number;
  readonly carried: boolean;
  /** The bill the member filed, when they carried it. */
  readonly billId: string | null;
}

/**
 * Someone without a seat (a resident, or the player after losing a race)
 * asks a member they know to carry a bill, in conversation. The member weighs
 * the bill as the asker's: their own views, their district, their record, a
 * taste for change read against the law in force, and how close they are to
 * the asker; the asker's standing in town counts too. If the sum is for it,
 * the member files the bill as its sponsor, and the request stays on record.
 */
export function askToCarry(
  api: CoreAPI,
  input: {
    readonly askerId: string;
    readonly memberId: string;
    readonly bodyOfficeId: string;
    readonly provisions: readonly Provision[];
  },
): CarryRequest {
  const asker = api.state.people.get(input.askerId);
  const executive = executiveOf(api, input.bodyOfficeId).term;
  // The sitting executive is known to every member; anyone else by the
  // share of the town they know.
  const isExecutive = !!executive && memberKey(executive) === input.askerId;
  if (!asker && !isExecutive)
    throw new Error(`No such person: ${input.askerId}`);
  if (
    !members(api, input.bodyOfficeId).some(
      (t) => memberKey(t) === input.memberId,
    )
  )
    throw new Error(
      `${input.memberId} holds no seat on ${input.bodyOfficeId}.`,
    );
  // Asked in person: the conversation brings the two closer.
  if (asker && api.state.people.has(input.memberId))
    api.relationship(input.askerId, input.memberId, "contact", 0.05);
  const asked = {
    id: `ask:${input.bodyOfficeId}:${api.state.date}:${input.askerId}`,
    number: "",
    bodyOfficeId: input.bodyOfficeId,
    sponsorId: input.askerId,
    introduced: api.state.date,
    provisions: input.provisions,
    costEstimate: { workersRaised: 0, annualPayMinor: 0, note: "" },
    authority: [],
    status: "drafted",
    deals: [],
  } as unknown as BillRow;
  const position = positionOn(api, asked, input.memberId);
  const standing =
    campaignParameter("carryStandingWeight") *
    (isExecutive
      ? 1
      : Math.min(
          1,
          asker!.knownIds.size / campaignParameter("carryStandingCircle"),
        ));
  const carried = position.total + standing > 0;
  const bill = carried
    ? draftBill(api, {
        bodyOfficeId: input.bodyOfficeId,
        sponsorId: input.memberId,
        provisions: input.provisions,
      })
    : null;
  if (bill)
    table(api, "bills").put({
      ...bill,
      requestedBy: input.askerId,
    } as unknown as ModuleRow);
  const row: CarryRequest = {
    id: `carry:${input.bodyOfficeId}:${api.state.date}:${input.askerId}:${input.memberId}`,
    askerId: input.askerId,
    memberId: input.memberId,
    bodyOfficeId: input.bodyOfficeId,
    date: api.state.date,
    provisions: input.provisions,
    position,
    standing,
    carried,
    billId: bill?.id ?? null,
  };
  table(api, "carryRequests").put(row as unknown as ModuleRow);
  return row;
}

/** How an executive brings a bill of their own to the body, by office (data). */
export function proposalRight(
  api: CoreAPI,
  kind: string,
): { readonly mode: "by-request" | "none"; readonly source: string } {
  const row = (
    proposalData.kinds as Record<
      string,
      { mode: "by-request"; tag: string; citation: string } | undefined
    >
  )[kind];
  if (!row) return { mode: "none", source: "" };
  // stopgapId: SG-GOV-local-executive-proposal (one national rule for every charter)
  if (row.tag === "ESTIMATED") api.stopgap("SG-GOV-local-executive-proposal");
  return { mode: row.mode, source: row.citation };
}

/**
 * The executive brings a bill of their own: no executive may introduce one
 * in their own name, so they ask the member most inclined to carry it (their
 * own position on the bill as the executive's, closeness to the executive
 * among it), and that member decides as anyone asked would.
 */
export function proposeAsExecutive(
  api: CoreAPI,
  input: {
    readonly bodyOfficeId: string;
    readonly provisions: readonly Provision[];
  },
): CarryRequest | null {
  const { office, term } = executiveOf(api, input.bodyOfficeId);
  if (!office || !term) return null;
  if (proposalRight(api, office.kind).mode !== "by-request") return null;
  const executiveId = memberKey(term);
  const trial = {
    id: `propose:${input.bodyOfficeId}:${api.state.date}:${executiveId}`,
    number: "",
    bodyOfficeId: input.bodyOfficeId,
    sponsorId: executiveId,
    introduced: api.state.date,
    provisions: input.provisions,
    costEstimate: { workersRaised: 0, annualPayMinor: 0, note: "" },
    authority: [],
    status: "drafted",
    deals: [],
  } as unknown as BillRow;
  let best: { key: string; total: number } | null = null;
  for (const member of members(api, input.bodyOfficeId)) {
    const key = memberKey(member);
    if (key === executiveId) continue;
    const total = positionOn(api, trial, key).total;
    if (!best || total > best.total || (total === best.total && key < best.key))
      best = { key, total };
  }
  if (!best) return null;
  return askToCarry(api, {
    askerId: executiveId,
    memberId: best.key,
    bodyOfficeId: input.bodyOfficeId,
    provisions: input.provisions,
  });
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
    ? closenessBetween(api.state as CoreState, memberId, sponsorId)
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
  const heard =
    chairPosition.total +
      traitLean(api, memberKey(chair), "legislature.hold-hearing", [
        "hear",
        "bury",
      ]) >=
    0;
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
  // Each witness makes their case to the committee's members who are people
  // (the speech engine moves each by the witness's standing with them), and
  // the committee then votes on where its members stand after hearing it.
  const question = bill.provisions
    .map((p) => provisionStance(api, p, billLevel(api, bill)))
    .find((row) => row !== null);
  if (heard && question && api.state.modules.has(SPEECH_MODULE_ID)) {
    const room = roster.flatMap((t) =>
      t.personId && api.state.people.get(t.personId)?.alive ? [t.personId] : [],
    );
    for (const w of witnesses)
      if (api.state.people.get(w.personId)?.alive && room.length)
        deliverSpeech(api, {
          id: `speech:hearing:${bill.id}:${chamber}:${w.personId}`,
          speakerId: w.personId,
          placeId: lawChain(api).townPlaceId,
          topic: question.question,
          // A witness paid under the proposed floor speaks for the raise.
          desiredChange: question.position > 0 ? "enact" : "repeal",
          audienceIds: room.filter((id) => id !== w.personId),
        });
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
 * The elected executive over a body's bills (the mayor, county executive,
 * governor or President), the office whether or not anyone holds it.
 */
export function executiveOf(
  api: CoreAPI,
  bodyOfficeId: string,
): {
  readonly office: { readonly id: string; readonly kind: string } | undefined;
  readonly term: TermRow | undefined;
  readonly federal: boolean;
} {
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const body = offices.table("offices").get(bodyOfficeId) as unknown as {
    jurisdiction: string;
    kind: string;
  };
  const federal = body.kind.startsWith("us-house") || body.kind === "us-senate";
  const office = (
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
  const seated = office
    ? (
        offices.table("seats").query("byOffice", [office.id]) as unknown as {
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
  return { office, term: seated ? holderOf(api, seated) : undefined, federal };
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
  const {
    office: executiveOffice,
    term: executive,
    federal,
  } = executiveOf(api, bill.bodyOfficeId);
  let status: BillRow["status"] = "enacted";
  let decision: { executiveId: string; action: string } | undefined;
  // A mayor vetoes only where the state's law gives the office a veto (and
  // above any population line), overridden by the state's own share.
  const mayorRule = executiveOffice?.kind === "mayor" ? mayorVeto(api) : null;
  if (executive && (!mayorRule || mayorRule.veto)) {
    const key = memberKey(executive);
    const position = memberPosition(api, bill.id, key);
    const decided = table(api, "choices").get(
      `${bill.id}|executive`,
    ) as unknown as { sign: boolean } | undefined;
    // The player decides for themselves: the bill waits on their desk until
    // the deadline their office's law sets, when inaction decides it.
    if (!decided && key === (api.state as CoreState).playerId) {
      const waiting: BillRow = { ...bill, status: "awaiting-signature" };
      const deadline = signingDeadline(api, executiveOffice!.kind, federal);
      table(api, "bills").put({
        ...waiting,
        tallies,
        signBy: deadline.date,
        inaction: deadline.inaction,
      } as unknown as ModuleRow);
      api.moduleCalendar(LEGISLATURE_MODULE_ID).schedule({
        key: `signing-deadline:${bill.id}`,
        date: deadline.date,
        kind: "signing-deadline",
        source: deadline.source,
        sourceRecordIds: [bill.id],
      });
      for (const hook of deskHooks)
        hook(api, {
          bill: waiting,
          executiveId: key,
          status: "awaiting",
          position: position.total,
          temperament: 0,
          signBy: deadline.date,
        });
      return waiting;
    }
    const signLean = tasteForChange(
      traitLean(api, key, "legislature.sign-or-veto", ["sign", "veto"]),
      billSettledness(api, bill),
    );
    const vetoes = decided ? !decided.sign : position.total + signLean < 0;
    if (vetoes) {
      // Two thirds of each body's whole membership (not of those voting).
      const share =
        mayorRule?.overrideShare ?? campaignParameter("vetoOverrideShare");
      status = overrideVote(
        api,
        bill,
        memberSide(api, key, executive.party),
        (n) =>
          mayorRule?.plusOne
            ? Math.floor(n * share) + 1
            : Math.ceil(n * share - 1e-9),
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
    for (const hook of deskHooks)
      hook(api, {
        bill,
        executiveId: key,
        status: status as DeskAction["status"],
        position: position.total,
        temperament: decided ? 0 : signLean,
      });
    decision = { executiveId: key, action: status };
  }
  const next: BillRow = { ...bill, status };
  table(api, "bills").put(next as unknown as ModuleRow);
  if (status === "vetoed") return next;
  return enact(api, next, tallies, decision);
}

/**
 * The vote to override a veto, chamber by chamber: each member decides again
 * from their own position on the bill, and a member of the executive's own
 * party also weighs standing with them (OPUS-OFFICIALS: the executive-party
 * pull, `data/officials/officials.json`). Every vote is on the record; the
 * override needs the share of each chamber's whole membership.
 */
function overrideVote(
  api: CoreAPI,
  bill: BillRow,
  executiveSide: number,
  needed: (members: number) => number,
): boolean {
  for (const chamber of chambersOf(api, bill)) {
    const roster = members(api, chamber);
    let yes = 0;
    for (const member of roster) {
      const key = memberKey(member);
      const position = memberPosition(api, bill.id, key);
      const executive =
        executiveSide !== 0 &&
        memberSide(api, key, member.party) === executiveSide
          ? -executivePull(api, key)
          : 0;
      const chosen = table(api, "choices").get(
        `${bill.id}|${key}|override`,
      ) as unknown as { vote: "yes" | "no" | "abstain" } | undefined;
      const total = position.total + executive;
      const vote =
        chosen?.vote ??
        (key === (api.state as CoreState).playerId
          ? "abstain"
          : total > 0
            ? "yes"
            : total < 0
              ? "no"
              : "abstain");
      if (vote === "yes") yes += 1;
      table(api, "votes").put({
        id: `vote:${bill.id}:${key}:override`,
        billId: bill.id,
        memberId: key,
        chamber,
        vote,
        override: true,
        position: { ...position, executive, total },
      } as unknown as ModuleRow);
    }
    if (yes < needed(roster.length)) return false;
  }
  return true;
}

/** A member's party side: an official's caucus or party, else their term's. */
function memberSide(
  api: CoreAPI,
  memberId: string,
  termParty: string | null | undefined,
): number {
  const official = officialOf(api, memberId);
  return partySide(
    official ? (official.independent?.caucus ?? official.party) : termParty,
  );
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
function enact(
  api: CoreAPI,
  bill: BillRow,
  tallies: readonly { yes: number; no: number; members: number }[] = [],
  /** What the executive did with it: signed, overridden, or let it become law unsigned. */
  decision?: { executiveId: string; action: string },
): BillRow {
  // How widely it passed: the narrowest chamber's yes minus no, over its
  // members (a later move to undo it reads this).
  const margin = tallies.length
    ? Math.min(...tallies.map((t) => (t.yes - t.no) / Math.max(1, t.members)))
    : null;
  const recorded = {
    ...(margin === null ? {} : { margin }),
    ...(decision
      ? { decidedBy: decision.executiveId, decision: decision.action }
      : {}),
  };
  const terms = Object.keys(recorded).length ? recorded : undefined;
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
  // Every state's rule is data; a state act with no rule is a data gap to
  // fix, never a silent ordinance delay.
  if (state && !stateDate)
    throw new Error(
      `No effective-date rule for ${chain.stateKey} acts (state-effective-dates.json).`,
    );
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
        ...(terms ? { terms } : {}),
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
        ...(terms ? { terms } : {}),
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
  if (work.kind === "signing-deadline")
    deadlinePassed(api, work.sourceRecordIds[0]!);
}

const vetoWindows = new Map(
  (
    vetoWindowData as unknown as {
      rows: {
        usps: string;
        inSessionDays: number | null;
      }[];
    }
  ).rows.map((row) => [row.usps, row]),
);

/**
 * How long an executive has to act on a bill on their desk, and what doing
 * nothing means: the President has ten days, Sundays excepted, and the bill
 * becomes law (U.S. Const. art. I, sec. 7); a governor has their state's
 * in-session window, after which it becomes law (Book of the States 2023,
 * Table 3.16); a mayor or county executive has the modal charter window
 * (`localSigningDays`).
 */
function signingDeadline(
  api: CoreAPI,
  officeKind: string,
  federal: boolean,
): {
  date: string;
  inaction: "becomes-law";
  source: Source;
} {
  const start = Date.parse(`${api.state.date}T00:00:00Z`);
  if (federal) {
    let day = start;
    for (let counted = 0; counted < 10;) {
      day += 86_400_000;
      if (new Date(day).getUTCDay() !== 0) counted += 1;
    }
    return {
      date: new Date(day).toISOString().slice(0, 10),
      inaction: "becomes-law",
      source: {
        tag: "SOURCED",
        citation: "U.S. Const. art. I, sec. 7, cl. 2",
        asOf: api.state.date,
      },
    };
  }
  const window =
    officeKind === "governor"
      ? vetoWindows.get(lawChain(api).stateKey.slice("US-".length))
          ?.inSessionDays
      : undefined;
  const days = window ?? campaignParameter("localSigningDays");
  return {
    date: new Date(start + days * 86_400_000).toISOString().slice(0, 10),
    inaction: "becomes-law",
    source:
      window !== undefined && window !== null
        ? {
            tag: "SOURCED",
            citation:
              "Book of the States 2023, Table 3.16 (data/research/laws/veto-windows-2023.json)",
            asOf: api.state.date,
          }
        : {
            tag: "ESTIMATED",
            citation: "The executive's window to act on a passed bill",
            asOf: api.state.date,
            estimatedFrom: "localSigningDays",
          },
  };
}

/** The deadline passed with the bill still on the desk: it becomes law unsigned. */
function deadlinePassed(api: CoreAPI, billId: string): void {
  const bill = table(api, "bills").get(billId) as unknown as
    | (BillRow & {
        tallies?: { yes: number; no: number; members: number }[];
      })
    | undefined;
  if (bill?.status !== "awaiting-signature") return;
  const unsigned: BillRow = { ...bill, status: "enacted" };
  table(api, "bills").put(unsigned as unknown as ModuleRow);
  const executiveId = (api.state as CoreState).playerId;
  if (executiveId)
    for (const hook of deskHooks)
      hook(api, {
        bill: unsigned,
        executiveId,
        status: "unsigned",
        position: memberPosition(api, billId, executiveId).total,
        temperament: 0,
      });
  enact(api, unsigned, bill.tallies ?? [], {
    executiveId: executiveId ?? "",
    action: "unsigned",
  });
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

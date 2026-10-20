import { lawApplied } from "../law-reach/applied";
import type { OfficeInput } from "../offices-local";
import { snapshotExplicitControlV1 } from "../player-control-state-v1";
import {
  lineItemVetoOf,
  itemOverrideNeeded,
  type ItemVetoSelection,
} from "../state-item-veto";
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
import { policyAuthority } from "../policy-authority";
import powers from "../data/legislature/series-powers.json" with { type: "json" };
import ties from "../../../data/research/elections/tie-rules-2026.json" with { type: "json" };
import provisionQuestions from "../../../data/research/legislature/provision-questions.json" with { type: "json" };
import { POLICY_QUESTIONS } from "../policy-answers";
import { registerModule } from "../state";
import type {
  ActionDefinition,
  ActOffer,
  CoreAPI,
  CoreModule,
  CoreState,
  PersonState,
} from "../types";
import type { ModuleRow } from "../module-data";
import type { ModuleCalendarWork } from "../module-calendar";
import { campaignParameter, personLean, personStance } from "../campaign-views";
import { governmentUnitsForPlace } from "../reference/government-units";
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
import { ownStance } from "../officials-roster";
import { closenessBetween } from "../closeness";
import { bribePull } from "./corruption";
import { deliverSpeech, SPEECH_MODULE_ID } from "./speech";
import {
  BUDGETS_MODULE_ID,
  amendBudget,
  budgetPriorities,
  carriedBudget,
  clearBudgetPriorities,
  departmentRequests,
  enactBudget,
  governments,
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
import {
  decisionLean,
  decisionTraitWeight,
  leanedTerm,
  leanedYes,
} from "../trait-decisions";
import { stateActEffectiveDate } from "../state-effective-date";
import representation from "../data/offices/federal-representation.json" with { type: "json" };
import proposalData from "../data/legislature/executive-proposal.json" with { type: "json" };
import vetoWindowData from "../../../data/research/laws/veto-windows-2023.json" with { type: "json" };
import type { Source } from "../types";
import { decisionFromScores, scoreOffers } from "../choice";
import { decisionKinds } from "../trait-decisions";
import { discretionaryHours } from "./work";
import { COMMITTEES, committeeForSection } from "../legislature-committees";
import { addDays, makeIsoDate } from "../kernel/dates";
import {
  bodyNumbering,
  designation,
  type BillFormKind,
} from "../legislature-bill-form";
import partyCounts from "../../../data/research/offices/legislature-party-counts-2026.json" with { type: "json" };

export const LEGISLATURE_MODULE_ID = "core2-legislature-v1";

/** A trial bill, read for members' positions and never put on the record, has no form. */
const TRIAL_FORM = {
  kind: "act",
  enactingClause: "",
  enactingSource: "",
} as const;

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
  /** For a budget line: the line's amount the change is made to, so a stance weighs its size. */
  readonly of?: number;
  /** The catalog policy the section was drafted from, and what it does to it. */
  readonly policyId?: string;
  readonly operation?: string;
  /**
   * For a rate with a schedule (income tax): a flat rate, or a graduated
   * schedule whose top rate is `value`. Left out, the shape in force stays.
   */
  readonly shape?: "flat" | "graduated";
  /** For an estate tax: the new exemption, in dollars. Left out, the exemption in force stays. */
  readonly exemption?: number;
  /** For a budget line: the government whose treasury the money is granted to, and the member's request it carries. */
  readonly recipientId?: string;
  readonly requestId?: string;
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
  /** The body's own designation: "LB 12", "H.R. 25", "S. 3", "2025-12". */
  readonly number: string;
  /** Structured title at introduction; English renders these record parts. */
  readonly title?: BillTitle;
  /**
   * What the bill is in its body (a bill for an act, or an ordinance) and the
   * enacting clause the law prescribes for it, with that law's citation.
   */
  readonly form: {
    readonly kind: BillFormKind;
    readonly enactingClause: string;
    readonly enactingSource: string;
  };
  readonly bodyOfficeId: string;
  readonly sponsorId: string;
  readonly introduced: string;
  /** The committee record that reported the bill to the floor of its first chamber, where its body has committees. */
  readonly committeeId?: string;
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
    /** Where a trade was made: the committee's markup or the floor. */
    readonly stage?: "committee" | "floor";
    readonly chamber?: string;
    /**
     * Both sides' reasons, from their positions on the bill before and after
     * the section went in: the member's, the sponsor's (who gives it only
     * while still backing the bill with it) and the count of members for it.
     */
    readonly reasons?: {
      readonly member: { readonly before: number; readonly after: number };
      readonly sponsor: { readonly before: number; readonly after: number };
      readonly support: { readonly before: number; readonly after: number };
    };
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
  /** A member of Congress's state's stake in the bill's budget lines, within `constituents`. */
  readonly stateStake?: number;
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
      itemVetoes: {},
      projectRequests: {},
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
const afterVoteHooks: ((api: CoreAPI, billId: string) => void)[] = [];
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
  /** After a bill's votes are counted: whoever settled something on how members voted. */
  readonly afterVote?: (api: CoreAPI, billId: string) => void;
  readonly onDesk?: (api: CoreAPI, action: DeskAction) => void;
}): void {
  if (input.positionTerm && !positionTerms.includes(input.positionTerm))
    positionTerms.push(input.positionTerm);
  if (input.beforeVote && !beforeVoteHooks.includes(input.beforeVote))
    beforeVoteHooks.push(input.beforeVote);
  if (input.afterVote && !afterVoteHooks.includes(input.afterVote))
    afterVoteHooks.push(input.afterVote);
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

/** Everyone who sits in a government's governing body: the members who vote its budget. */
export function governingMembers(
  api: CoreAPI,
  gov: GovernmentRow,
): readonly TermRow[] {
  const chambers = budgetChambers(api, gov);
  return chambers ? chambers.chambers.flatMap((c) => members(api, c)) : [];
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
  const carried = budgetCarry(api, gov, fy);
  // The executive's proposed changes, else the departments' requests at the
  // funding already enacted. A proposal that changes nothing is the
  // requests: a bill needs at least one section to be named (batch 11).
  const proposed: Provision[] = Object.entries(priorities?.changes ?? {}).map(
    ([line, delta]) => ({
      kind: "budget-line",
      line,
      value: delta,
      ...(carried?.spendingMinor[line]
        ? { of: carried.spendingMinor[line] }
        : {}),
    }),
  );
  const provisions: Provision[] = proposed.length
    ? proposed
    : Object.entries(departmentRequests(api, gov, fy)).map(
        ([line, amount]) => ({
          kind: "budget-line",
          line,
          // Requests carry the enacted funding, not an addition to that funding.
          value: 0,
          of: amount,
        }),
      );
  // No section to vote on: the budget carries by rule, no bill is filed.
  if (!provisions.length) return null;
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
  // A rejected budget is negotiated, not abandoned: the leaders meet its
  // opponents in the failing chamber halfway on the change they object to
  // most, halving it, and vote again; a change halved as far as the
  // negotiation goes is dropped. It ends when the budget passes or no change
  // is left (then last year's carries).
  let kept: readonly Provision[] = provisions;
  let result = roll(kept);
  const halved = new Map<string, number>();
  const dropped: string[] = [];
  const lineOf = (p: Provision) => String((p as { line?: string }).line);
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
      .sort((a, b) => a.o - b.o || lineOf(a.p).localeCompare(lineOf(b.p)))[0]!
      .p;
    const line = lineOf(worst);
    const times = halved.get(line) ?? 0;
    if (times >= campaignParameter("budgetCompromiseRounds")) {
      dropped.push(line);
      kept = kept.filter((p) => p !== worst);
    } else {
      halved.set(line, times + 1);
      kept = kept.map((p) =>
        p === worst ? { ...p, value: Math.round(p.value / 2) } : p,
      );
    }
    result = roll(kept);
  }
  if (!kept.length) result = { ...result, adopted: false };
  for (const row of result.rows) table(api, "votes").put(row);
  // Each chamber's roll call on the budget is public record the press reads,
  // like any bill's.
  for (const chamber of chambers.chambers) {
    const rows = result.rows.filter(
      (r) => (r as unknown as { chamber: string }).chamber === chamber,
    ) as unknown as { memberId: string; vote: string }[];
    api.emit({
      id: `bill-vote:${bill.id}:${chamber}`,
      date: api.state.date,
      kind: "legislative-vote",
      personIds: rows
        .map((r) => r.memberId)
        .filter((id) => api.state.people.has(id)),
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
        level: billReach(api, bill).level,
        form: bill.form.kind,
        motion: "pass",
        subjects: "budget",
        chamber,
        yes: String(rows.filter((r) => r.vote === "yes").length),
        no: String(rows.filter((r) => r.vote === "no").length),
      },
    });
  }
  const tallies = result.tallies;
  // A budget both chambers pass goes to the executive's desk like any bill:
  // the signature or veto is public record, and a veto the body cannot
  // override leaves last year's budget in force.
  const desk = result.adopted
    ? budgetDesk(api, { ...bill, provisions: kept } as BillRow)
    : null;
  const adopted = result.adopted && desk !== "vetoed";
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
        `${chambers.body} vote ${votes}${
          halved.size || dropped.length
            ? ` (amended: ${[
                ...[...halved.entries()]
                  .filter(([line]) => !dropped.includes(line))
                  .map(([line, n]) => `${line} cut to 1/${2 ** n}`),
                ...dropped.map((line) => `${line} dropped`),
              ].join(", ")})`
            : ""
        }, ${bill.number}`,
        passed,
      )
    : carriedBudget(
        api,
        gov,
        fy,
        desk === "vetoed"
          ? `carried forward after the executive vetoed ${bill.number} ${votes}`
          : `carried forward after ${chambers.body} rejected ${bill.number} ${votes}`,
      );
  clearBudgetPriorities(api, gov.id);
  table(api, "bills").put({
    ...bill,
    provisions: kept.length ? kept : provisions,
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
    form: TRIAL_FORM,
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
  if (gov.level === "federal")
    return {
      chambers: [FEDERAL_HOUSE, FEDERAL_SENATE],
      introducedIn: FEDERAL_HOUSE,
      body: "Congress",
    };
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
  // A county's board, a city's council, or a township's board where the
  // town's own government is its township.
  const body =
    gov.level === "county"
      ? offices.find((o) => o.kind === "county-board" && o.level === "county")
      : (offices.find((o) => o.kind === "council" && o.level === "city") ??
        offices.find((o) => o.kind === "township-board"));
  return body
    ? {
        chambers: [body.id],
        introducedIn: body.id,
        body:
          body.kind === "county-board"
            ? "the county board"
            : body.kind === "township-board"
              ? "the township board"
              : "the council",
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
  // A change's size counts: against the line it's made to, a change of a
  // tunable share is a full stance, a smaller one less (a sliding scale).
  if (provision.kind === "budget-line" && provision.line)
    return provision.value === 0
      ? null
      : {
          question: `budget-line:${provision.line}`,
          position: provision.of
            ? Math.max(
                -1,
                Math.min(
                  1,
                  provision.value /
                    (provision.of * campaignParameter("budgetFullStanceShare")),
                ),
              )
            : Math.sign(provision.value),
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
  if (provision.kind === "policy-question" && provision.question)
    return policyAuthority(api, provision.question, "city");

  return {
    allowed: true,
    warning: "none",
    reason: "no-state-limit",
    source: "",
  };
}

/** The body's numbering for a bill drafted today, and the bill's form in it. */
function numberAndForm(
  api: CoreAPI,
  officeId: string,
): Pick<BillRow, "number" | "form"> {
  const body = bodyOf(api, officeId)!;
  const numbering = bodyNumbering(body, api.state.date);
  if (numbering.kind === "ordinance") {
    // stopgapId: SG-GOV-local-bill-numbering (one national ordinance numbering for every town)
    api.stopgap("SG-GOV-local-bill-numbering");
  }
  const counter = table(api, "counters").get(numbering.runKey) as unknown as
    { n: number } | undefined;
  const n = counter ? counter.n + 1 : numbering.firstNumber;
  table(api, "counters").put({
    id: numbering.runKey,
    n,
  } as unknown as ModuleRow);
  return {
    number: designation(numbering, n),
    form: {
      kind: numbering.kind,
      enactingClause: numbering.enactingClause.replace(
        "{body}",
        body.bodyName ?? body.governmentName,
      ),
      enactingSource: numbering.enactingSource,
    },
  };
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

/**
 * What a bill's title says, as record parts the English engine words: its
 * form ("A bill for an act" or "An ordinance"), its designation, and what each
 * section does, by the catalog policy, question, series or budget line it was
 * drafted from ("To shift highway funds to transit, and for other purposes").
 */
export interface BillTitle {
  readonly kind: BillFormKind;
  readonly designation: string;
  readonly subjects: readonly {
    readonly key: string;
    readonly operation: string | null;
  }[];
}
export function billTitle(bill: BillRow): BillTitle {
  return {
    kind: bill.form.kind,
    designation: bill.number,
    subjects: bill.provisions.map((p) => ({
      key: subjectKey(p),
      operation: p.operation ?? null,
    })),
  };
}
function subjectKey(p: Provision): string {
  return (
    p.policyId ??
    p.question ??
    p.series ??
    (p.line ? `budget-line:${p.line}` : p.kind)
  );
}

/**
 * The motion a body votes a bill on: a council adopts an ordinance, a chamber
 * passes a bill for an act.
 */
export function motionOn(bill: BillRow): "adopt" | "pass" {
  return bill.form.kind === "ordinance" ? "adopt" : "pass";
}

/**
 * A rate's shape as enacted: a schedule in force carries over, its every
 * bracket's rate scaled so the top rate is the bill's (a graduated tax stays
 * graduated unless the section says flat); a flat section sets one rate.
 * Null for a series with no schedule.
 */
export function shapedRate(
  current: LawRowInput | null,
  provision: Provision,
): { unit: string; terms: Record<string, unknown> } | null {
  const schedules = current?.terms?.schedules as
    Record<string, { brackets?: { over: number; rate: number }[] }> | undefined;
  const shape = provision.shape ?? (schedules ? "graduated" : null);
  if (shape === "flat")
    return { unit: "percent-flat", terms: { system: "flat" } };
  // A death tax's schedule (an exemption and a rate that slides to the top,
  // per heir's relation for an inheritance tax) keeps its shape: its rates
  // scale to the new top rate, and a bill may set a new exemption.
  const terms = current?.terms as Record<string, unknown> | undefined;
  if (!schedules && terms && ("minRate" in terms || "classes" in terms)) {
    const top = typeof current?.value === "number" ? current.value : 0;
    const k = top > 0 ? provision.value / top : 1;
    const scaled = (s: Record<string, unknown>) => ({
      ...s,
      minRate: Math.round(Number(s.minRate) * k * 1000) / 1000,
      ...(typeof s.maxRate === "number"
        ? { maxRate: Math.round(s.maxRate * k * 1000) / 1000 }
        : {}),
    });
    const classes = terms.classes as
      Record<string, Record<string, unknown>> | undefined;
    return {
      unit: current?.unit ?? "percent-top-rate",
      terms: {
        ...terms,
        ...("minRate" in terms ? scaled(terms) : {}),
        ...(classes
          ? {
              classes: Object.fromEntries(
                Object.entries(classes).map(([c, s]) => [c, scaled(s)]),
              ),
              others: scaled(terms.others as Record<string, unknown>),
            }
          : {}),
        ...(provision.exemption !== undefined
          ? { exemption: provision.exemption }
          : {}),
      },
    };
  }
  if (shape !== "graduated" || !schedules) return null;
  // A filer's schedule is a list of brackets with numeric rates; anything
  // else kept beside them (a note on a later change) is carried as it is.
  const rated = (s: { brackets?: { over: number; rate: number }[] }) =>
    Array.isArray(s.brackets) &&
    s.brackets.length > 0 &&
    s.brackets.every((b) => typeof b.rate === "number");
  const top = Math.max(
    0,
    ...Object.values(schedules)
      .filter(rated)
      .flatMap((s) => s.brackets!.map((b) => b.rate)),
  );
  const scale = top > 0 ? provision.value / top : 1;
  return {
    unit: current?.unit ?? "percent-top-rate",
    terms: {
      ...(current?.terms ?? {}),
      system: "graduated",
      schedules: Object.fromEntries(
        Object.entries(schedules).map(([filer, schedule]) => [
          filer,
          rated(schedule)
            ? {
                ...schedule,
                brackets: schedule.brackets!.map((b) => ({
                  ...b,
                  rate: Math.round(b.rate * scale * 1000) / 1000,
                })),
              }
            : schedule,
        ]),
      ),
    },
  };
}

/**
 * One section of a bill as the record holds it, for the paper to word: what
 * it changes (the series, question or budget line), the law in force before
 * (its value, shape and the statute it cites), what the section makes it, and
 * the terms the player may edit (the number, the date, the shape).
 */
export interface BillSection {
  readonly index: number;
  readonly kind: Provision["kind"];
  readonly subject: string;
  readonly before: {
    readonly value: number | null;
    readonly unit: string | null;
    readonly shape: "flat" | "graduated" | null;
    readonly lawId: string | null;
    readonly statute: string | null;
  };
  readonly after: {
    readonly value: number;
    readonly unit: string | null;
    readonly shape: "flat" | "graduated" | null;
    readonly effectiveDate: string | null;
  };
  readonly editable: readonly (
    "value" | "effectiveDate" | "shape" | "exemption"
  )[];
}

export function billSections(
  api: CoreAPI,
  bill: BillRow,
): readonly BillSection[] {
  return bill.provisions.map((p, index) => {
    const series =
      p.kind === "law-amount"
        ? p.series
        : p.kind === "policy-question"
          ? p.question
          : undefined;
    const answer = series ? lawInForce(api, series) : null;
    const row = answer ? (answer.levels.find((l) => l.row)?.row ?? null) : null;
    const schedules = row?.terms?.schedules;
    const shapeBefore: BillSection["before"]["shape"] = row
      ? schedules
        ? "graduated"
        : row.unit === "percent-flat"
          ? "flat"
          : null
      : null;
    const before: BillSection["before"] =
      p.kind === "budget-line"
        ? {
            value: p.of ?? null,
            unit: "minor",
            shape: null,
            lawId: null,
            statute: null,
          }
        : {
            value: row?.value ?? null,
            unit: row?.unit ?? null,
            shape: shapeBefore,
            lawId: row?.id ?? null,
            statute: row
              ? Array.isArray(row.source)
                ? row.source.join("; ")
                : String(row.source)
              : null,
          };
    return {
      index,
      kind: p.kind,
      subject: subjectKey(p),
      before,
      after: {
        value: p.kind === "budget-line" ? (p.of ?? 0) + p.value : p.value,
        unit: p.unit ?? before.unit,
        shape: p.shape ?? before.shape,
        effectiveDate: p.effectiveDate ?? null,
      },
      editable: [
        ...(p.kind === "policy-question" ? [] : (["value"] as const)),
        "effectiveDate" as const,
        ...(shapeBefore ? (["shape"] as const) : []),
        ...(typeof row?.terms?.exemption === "number"
          ? (["exemption"] as const)
          : []),
      ],
    };
  });
}

/**
 * Which government a bill is before: Congress, the state's legislature, a
 * county's board, or the town's council. The press files a vote or a
 * signature at this level, so a president's act reaches the national outlets
 * and a governor's the state's.
 */
export function billReach(
  api: CoreAPI,
  bill: BillRow,
): {
  readonly federal: boolean;
  readonly state: boolean;
  readonly county: string | null;
  readonly level: "federal" | "state" | "county" | "city";
} {
  const federal = chambersOf(api, bill).includes(FEDERAL_HOUSE);
  const state = !federal && isState(api, bill);
  const county = !federal && !state ? countyOfBody(api, bill) : null;
  const level = federal
    ? "federal"
    : state
      ? "state"
      : county
        ? "county"
        : "city";
  return { federal, state, county, level };
}

/**
 * Which government a body belongs to, for a story that is not about one bill
 * (a chamber organizing itself): Congress's chambers are federal, a state's
 * legislature state, a county board county, and anything else the town's.
 */
export function bodyReach(
  api: CoreAPI,
  officeId: string,
): "federal" | "state" | "county" | "city" {
  const kind = bodyOf(api, officeId)?.kind ?? "";
  if (kind.startsWith("us-house") || kind === "us-senate") return "federal";
  if (kind.startsWith("legislature-")) return "state";
  return kind === "county-board" ? "county" : "city";
}

/**
 * When a bill takes effect if it became law today and named no date of its
 * own: a federal act on enactment (the general rule: Gozlon-Peretz v. United
 * States, 498 U.S. 395 (1991)), a state act by its state's researched rule,
 * and an ordinance a set number of days after adoption.
 */
export function effectiveRule(
  api: CoreAPI,
  bill: BillRow,
): {
  readonly jurisdiction: string;
  readonly level: "federal" | "state" | "county" | "city";
  readonly federal: boolean;
  readonly state: boolean;
  readonly kind: "on-enactment" | "state-rule" | "days-after-adoption";
  readonly days: number | null;
  readonly date: string;
  readonly cite: string;
} {
  const chain = lawChain(api);
  const { federal, state, county, level } = billReach(api, bill);
  const jurisdiction = federal
    ? "US"
    : state
      ? chain.stateKey
      : (county ?? chain.levels[chain.levels.length - 1]!.jurisdiction);
  const base = { jurisdiction, level, federal, state } as const;
  if (federal)
    return {
      ...base,
      kind: "on-enactment",
      days: null,
      date: api.state.date,
      cite: "Gozlon-Peretz v. United States, 498 U.S. 395 (1991)",
    };
  if (state) {
    const stateDate = stateActEffectiveDate(chain.stateKey, api.state.date);
    // Every state's rule is data; a state act with no rule is a data gap to
    // fix, never a silent ordinance delay.
    if (!stateDate)
      throw new Error(
        `No effective-date rule for ${chain.stateKey} acts (state-effective-dates.json).`,
      );
    return {
      ...base,
      kind: "state-rule",
      days: null,
      date: stateDate.date,
      cite: stateDate.cite,
    };
  }
  const days = campaignParameter("ordinanceEffectiveDays");
  return {
    ...base,
    kind: "days-after-adoption",
    days,
    date: new Date(
      Date.parse(`${api.state.date}T00:00:00Z`) + days * 86_400_000,
    )
      .toISOString()
      .slice(0, 10),
    cite: "campaigns parameter ordinanceEffectiveDays",
  };
}

/**
 * A bill as its body writes it, for the paper to word: its number, the
 * enacting clause, its sections, and, for an ordinance, the closing section
 * on when it takes effect (an ordinance states it; an act falls back on its
 * government's rule). Never the federal short-title form for a local measure.
 */
export function billForm(
  api: CoreAPI,
  bill: BillRow,
): {
  readonly number: string;
  readonly kind: BillFormKind;
  readonly enactingClause: string;
  readonly enactingSource: string;
  readonly sections: readonly BillSection[];
  readonly effectiveSection: {
    readonly kind: "on-enactment" | "state-rule" | "days-after-adoption";
    readonly days: number | null;
    /** A date every section names, or null when they fall back on the rule. */
    readonly date: string | null;
    readonly cite: string;
  } | null;
} {
  const sections = billSections(api, bill);
  const dates = new Set(bill.provisions.map((p) => p.effectiveDate ?? null));
  const named = dates.size === 1 ? [...dates][0]! : null;
  const rule =
    bill.form.kind === "ordinance" || named ? effectiveRule(api, bill) : null;
  return {
    number: bill.number,
    kind: bill.form.kind,
    enactingClause: bill.form.enactingClause,
    enactingSource: bill.form.enactingSource,
    sections,
    effectiveSection: rule
      ? {
          kind: rule.kind,
          days: named ? null : rule.days,
          date: named,
          cite: rule.cite,
        }
      : null,
  };
}

/**
 * A bill is not introduced without a section: its title is what its sections
 * do, so a bill with none cannot be named (owner, batch 11).
 */
function requireSection(provisions: readonly Provision[]): void {
  if (!provisions.length)
    throw new Error("A bill needs at least one section to be introduced.");
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
  requireSection(input.provisions);
  const bill: BillRow = {
    id: `bill:${input.bodyOfficeId}:${api.state.date}:${input.sponsorId}:${table(api, "bills").size}`,
    ...numberAndForm(api, input.bodyOfficeId),
    bodyOfficeId: input.bodyOfficeId,
    sponsorId: input.sponsorId,
    introduced: api.state.date,
    deals: [],
    ...checkedText(api, input.bodyOfficeId, input.provisions),
  };
  const titled = { ...bill, title: billTitle(bill) };
  table(api, "bills").put(titled as unknown as ModuleRow);
  // A sponsor who is a full person introduced it: a record their journal reads.
  const sponsor = api.state.people.get(input.sponsorId);
  if (sponsor)
    api.emit({
      id: `office.introduced:${titled.id}`,
      date: api.state.date,
      kind: "office.introduced",
      personIds: [input.sponsorId],
      placeId: sponsor.placeId,
      source: {
        tag: "SOURCED",
        citation: `Introduction of ${titled.number}`,
        asOf: api.state.date,
      },
      publicRecord: true,
      facts: { billId: titled.id, number: titled.number },
    });
  return titled;
}

/**
 * A member's request that a bill carry money to a named government (community
 * project funding): the request is a record the bill's line and the grant
 * both point back to.
 */
export interface ProjectRequestRow {
  readonly id: string;
  readonly memberId: string;
  readonly bodyOfficeId: string;
  readonly recipientId: string;
  readonly line: string;
  readonly amountMinor: number;
  readonly requestedOn: string;
  readonly status: "requested" | "included" | "dropped" | "paid";
  /** Why it was included or dropped: record codes the English engine words. */
  readonly reasons: readonly string[];
  readonly billId?: string;
  readonly grantId?: string;
  readonly paidMinor?: number;
  readonly shortMinor?: number;
}

export function projectRequestOf(
  api: CoreAPI,
  id: string,
): ProjectRequestRow | null {
  return (
    (table(api, "projectRequests").get(id) as unknown as
      ProjectRequestRow | undefined) ?? null
  );
}

export function requestProject(
  api: CoreAPI,
  input: {
    readonly bodyOfficeId: string;
    readonly memberId: string;
    readonly recipientId: string;
    readonly line: string;
    readonly amountMinor: number;
  },
): ProjectRequestRow {
  if (!(input.amountMinor > 0))
    throw new Error("A project request names an amount.");
  if (!governments(api).some((g) => g.id === input.recipientId))
    throw new Error(`No government ${input.recipientId} to receive a grant.`);
  const row: ProjectRequestRow = {
    id: `project-request:${input.bodyOfficeId}:${api.state.date}:${input.memberId}:${table(api, "projectRequests").size}`,
    memberId: input.memberId,
    bodyOfficeId: input.bodyOfficeId,
    recipientId: input.recipientId,
    line: input.line,
    amountMinor: input.amountMinor,
    requestedOn: api.state.date,
    status: "requested",
    reasons: [],
  };
  table(api, "projectRequests").put(row as unknown as ModuleRow);
  return row;
}

/**
 * The appropriations bill the sponsor carries: each open request is read by
 * the officials who can act on it (the sponsor who drafts the bill and the
 * members seated on the committee for budget lines), each on their own
 * reasons for the line as a bill they would weigh (`positionOn`), with the
 * requesting member as its sponsor, or because backing the item wins the
 * requester's vote on the bill. Never a roll; either way the read is kept on
 * the request.
 */
export function appropriationsWithProjects(
  api: CoreAPI,
  input: { readonly bodyOfficeId: string; readonly sponsorId: string },
): BillRow | null {
  const terms = members(api, input.bodyOfficeId);
  const seated = rosterProvider?.(
    api,
    input.bodyOfficeId,
    committeeForSection({ kind: "budget-line" }),
  );
  const provisions: Provision[] = [];
  for (const row of table(
    api,
    "projectRequests",
  ).rows() as unknown as ProjectRequestRow[]) {
    if (row.status !== "requested" || row.bodyOfficeId !== input.bodyOfficeId)
      continue;
    const term = terms.find((t) => memberKey(t) === row.memberId);
    const provision: Provision = {
      kind: "budget-line",
      line: row.line,
      value: row.amountMinor,
      recipientId: row.recipientId,
      requestId: row.id,
    };
    const asked = {
      id: `probe:${row.id}`,
      bodyOfficeId: row.bodyOfficeId,
      sponsorId: row.memberId,
      introduced: api.state.date,
      provisions: [provision],
      deals: [],
      status: "drafted",
    } as unknown as BillRow;
    // The officials who can act read the project as the requester's proposal:
    // their tie to the requester counts in each read.
    const officials = [
      ...new Set([input.sponsorId, ...(seated?.memberIds ?? [])]),
    ].filter((id) => id !== row.memberId);
    const read = officials.reduce(
      (sum, id) => sum + positionOn(api, asked, id).total,
      0,
    );
    // Or the sponsor wins the requester's vote by backing their item.
    const theirs = { ...asked, sponsorId: input.sponsorId } as BillRow;
    const backed = {
      ...theirs,
      deals: [
        {
          memberId: row.memberId,
          kind: "back-their-item",
          terms: row.id,
          date: api.state.date,
          status: "accepted",
        },
      ],
    } as BillRow;
    const wins =
      row.memberId !== input.sponsorId &&
      positionOn(api, theirs, row.memberId).total <= 0 &&
      positionOn(api, backed, row.memberId).total > 0;
    const included = !!term && (read > 0 || wins);
    table(api, "projectRequests").put({
      ...row,
      status: included ? "included" : "dropped",
      reasons: [
        read > 0 ? "officials-favor" : "officials-oppose",
        wins ? "requester-vote-won" : "requester-vote-unchanged",
      ],
    } as unknown as ModuleRow);
    if (included) provisions.push(provision);
  }
  if (!provisions.length) return null;
  const bill = draftBill(api, { ...input, provisions });
  for (const p of provisions) {
    const row = projectRequestOf(api, p.requestId!)!;
    table(api, "projectRequests").put({
      ...row,
      billId: bill.id,
    } as unknown as ModuleRow);
  }
  return bill;
}

/** A passed request's grant: the enacting treasury pays the recipient's, on the journal. */
function payProjectGrant(
  api: CoreAPI,
  input: {
    readonly requestId: string;
    readonly fromGovernmentId: string;
    readonly amountMinor: number;
    readonly measureId: string;
  },
): void {
  const row = projectRequestOf(api, input.requestId);
  if (!row || row.status === "paid" || input.amountMinor <= 0) return;
  const all = governments(api);
  const from = all.find((g) => g.id === input.fromGovernmentId);
  const to = all.find((g) => g.id === row.recipientId);
  if (!from || !to) return;
  const accounts = api.accounts();
  const receipt = accounts.transfer({
    id: `project-grant:${row.id}`,
    from: accounts.main(from.organizationId),
    to: accounts.main(to.organizationId),
    amountMinor: input.amountMinor,
    reasonKey: "project-grant",
    partial: true,
    source: {
      tag: "SOURCED",
      citation: `Project funding in ${input.measureId}`,
      asOf: api.state.date,
    },
  });
  table(api, "projectRequests").put({
    ...row,
    status: "paid",
    grantId: receipt.id,
    paidMinor: receipt.paidMinor,
    shortMinor: receipt.shortMinor,
  } as unknown as ModuleRow);
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
  if (!provisions.length)
    throw new Error("A bill must have at least one provision.");
  if (provisions.some((p) => !subjectKey(p).trim()))
    throw new Error("Every bill provision must name its subject.");
  const body = bodyOf(api, bodyOfficeId);
  const level =
    body?.kind === "us-house" || body?.kind === "us-senate"
      ? "federal"
      : body?.kind.startsWith("legislature-")
        ? "state"
        : body?.kind === "county-board"
          ? "county"
          : "city";
  const stateBody = level === "state" || level === "federal";
  const authority = provisions.map((p) =>
    p.kind === "policy-question" && p.question
      ? policyAuthority(api, p.question, level)
      : (beyondPower(p, stateBody ? level : "local") ??
        (stateBody
          ? ({
              allowed: true,
              warning: "none",
              reason: "within-own-power",
              source: "",
            } as Authority)
          : authorityFor(api, p))),
  );
  // The state's grant (or refusal) of local income-tax authority was read for
  // this body: it is the body the law lets tax, or keeps from taxing.
  if (!stateBody) {
    // stopgapId: SG-LAW-local-income-tax-authority-change
    api.stopgap("SG-LAW-local-income-tax-authority-change");
  }
  if (!stateBody)
    for (const [index, p] of provisions.entries()) {
      const read = authority[index]!;
      if (p.kind === "law-amount" && p.series === "income-tax" && read.source)
        lawApplied(api, {
          key: "local-income-tax-authority",
          lawId: read.source,
          targetId: bodyOfficeId,
          target: "organization",
          engine: LEGISLATURE_MODULE_ID,
          what: read.allowed ? "local-tax-allowed" : "local-tax-barred",
        });
    }
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
  requireSection(provisions);
  const next: BillRow = {
    ...bill,
    ...checkedText(api, bill.bodyOfficeId, provisions),
  };
  const titled = { ...next, title: billTitle(next) };
  table(api, "bills").put(titled as unknown as ModuleRow);
  return titled;
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
 * A bill's body: its office row, or for Congress, the one national chamber
 * (the House or the Senate, the same in every world), not any state's seat.
 */
export function bodyOf(
  api: CoreAPI,
  officeId: string,
):
  | {
      readonly id: string;
      readonly kind: string;
      readonly jurisdiction: string;
      readonly governmentName: string;
      readonly bodyName?: string;
    }
  | undefined {
  if (officeId === FEDERAL_HOUSE || officeId === FEDERAL_SENATE) {
    const kind = officeId === FEDERAL_HOUSE ? "us-house" : "us-senate";
    const row = (
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("offices")
        .rows() as unknown as OfficeInput[]
    ).find((office) =>
      kind === "us-house" ? office.kind.startsWith(kind) : office.kind === kind,
    );
    // The body is the chamber, whatever kind its first office row is: in the
    // District of Columbia and the territories that row is the delegate's.
    // A world whose state has no senators (a territory) still has a Senate
    // that sits, so its body takes the House's row for its name and source.
    const named =
      row ??
      (
        api
          .moduleState(OFFICES_MODULE_ID)
          .table("offices")
          .rows() as unknown as OfficeInput[]
      ).find((office) => office.kind.startsWith("us-house"));
    return named
      ? { ...named, id: officeId, kind, jurisdiction: "US" }
      : undefined;
  }
  return api
    .moduleState(OFFICES_MODULE_ID)
    .table("offices")
    .get(officeId) as unknown as
    | {
        id: string;
        kind: string;
        jurisdiction: string;
        governmentName: string;
      }
    | undefined;
}

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
    ? decisionTraitWeight(api.state, decisionId) *
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
        stateStake: parts.stateStake,
      }
    : null;
  // A member's own record: undoing what they just voted for, or redoing what
  // they just voted against, weighs against them while the law is fresh.
  const consistency = recordConsistency(api, memberId, bill);
  // A bribe they took on this bill, as far as it moves them.
  const bribe = bribePull(api, memberId, bill.id);
  // Everything that decides the vote but personality: where they stand, home,
  // the sponsor, deals, lobbying, party, their record and any bribe.
  const bare =
    views +
    answersHome +
    sponsor +
    deal +
    lobby +
    consistency +
    bribe +
    (further
      ? further.party + further.wing + further.ambition + further.press
      : 0);
  // A taste for change backs changing a settled law and resists reversing
  // a fresh one: the trait part reads the bill against the law in force.
  const settled = billSettledness(api, bill);
  const member = api.state.people.get(memberId);
  const trait = member
    ? leanedTerm(
        api.state,
        member,
        "legislature.member-position",
        "yes",
        "no",
        bare,
        (lean) => tasteForChange(lean, settled),
      )
    : 0;
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
    total: bare + trait,
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
 * the member files the bill as its sponsor, which carries who asked
 * (`requestedBy`); the returned row is the whole record of the ask.
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
  requireSection(input.provisions);
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
    form: TRIAL_FORM,
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
    form: TRIAL_FORM,
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
  // An amendment's worth, traded or forced, is in the bill's changed terms.
  if (kind === "amend" || kind === "trade-amendment" || kind === "poison-pill")
    return 0;
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
export function chambersOf(api: CoreAPI, bill: BillRow): readonly string[] {
  const office = bodyOf(api, bill.bodyOfficeId);
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

/**
 * Whether a committee's chair holds a hearing on a bill: the chair's own
 * position on it (`position`) plus their temperament, at the decision's
 * calibrated weight, is not against it. A chair who is a name not filled in
 * yet weighs the position alone.
 */
export function chairHearsBill(
  api: CoreAPI,
  chairId: string,
  position: number,
): boolean {
  const chair = api.state.people.get(chairId);
  return (
    position +
      (chair
        ? leanedTerm(
            api.state,
            chair,
            "legislature.hold-hearing",
            "hear",
            "bury",
            position,
          )
        : 0) >=
    0
  );
}

/**
 * How near an even split a chamber's own positions put a vote: 1 for a tie,
 * 0 when every member who leans at all leans the same way.
 */
function voteCloseness(totals: readonly number[]): number {
  let yes = 0;
  let no = 0;
  for (const total of totals) {
    if (total > 0) yes += 1;
    else if (total < 0) no += 1;
  }
  return yes + no === 0 ? 0 : 1 - Math.abs(yes - no) / (yes + no);
}

/**
 * Whether a member misses the sitting: on a bill they care little about,
 * they decide as they decide whether to go to work (the core chooser), from
 * the hours they have for it against the sitting's length and the member's
 * own duty reasons: holding the seat, a legislature's session, and how close
 * the vote is (`closeness`, from the chamber's positions). Their traits add
 * to those at the decision's calibrated weight; the circumstances settle
 * most sittings. A member with no living person record cannot attend: a seat
 * whose holder has died, or was never seated as a person, casts no vote.
 */
export function missesSitting(
  api: CoreAPI,
  memberId: string,
  billId: string,
  officeId: string,
  stake: number,
  closeness: number,
): boolean {
  const person = api.state.people.get(memberId);
  if (!person?.alive) return true;
  // A member never misses a vote they care about: only a bill they stand
  // near even on leaves room for the rest of their day to win.
  if (Math.abs(stake) >= campaignParameter("sittingIndifference")) return false;
  const hours = campaignParameter("sittingHours");
  // A legislature's or Congress's session days are the member's working
  // days, planned around (states protect a legislator's job during session);
  // a town body's evening meeting comes out of the member's own free hours.
  const legislative = /^federal:|:(legislature-|us-house|us-senate)/.test(
    officeId,
  );
  const available = legislative
    ? api.parameter("hoursPerDay")
    : discretionaryHours(api, memberId);
  // Serving is the member's work: attending meets that goal, as going to
  // work does. How strongly the sitting calls on the member comes from the
  // records: the seat, the session and how close the vote stands.
  const duty =
    campaignParameter("sittingSeatDuty") +
    (legislative ? campaignParameter("sittingSessionDuty") : 0) +
    campaignParameter("sittingCloseDuty") * closeness;
  const action = (id: string): ActionDefinition => ({
    id,
    actKinds: decisionKinds("legislature.attend-sitting", id),
    goalKinds: id === "sitting-attend" ? ["fulfil-work"] : [],
    need: "time",
    effortParameter: "zero",
    effectParameter: "one",
    targetKind: "bill",
    effect: id,
  });
  const offers: ActOffer[] = [
    {
      definition: action("sitting-miss"),
      targetId: billId,
      availableHours: available,
      effortHours: api.parameter("zero"),
    },
    ...(hours <= available
      ? [
          {
            definition: action("sitting-attend"),
            targetId: billId,
            availableHours: available,
            effortHours: hours,
          },
        ]
      : []),
  ];
  const decision = decisionFromScores(
    api.state,
    memberId,
    scoreOffers(api.state, memberId, offers, {
      goalRows: [
        {
          id: `sitting-duty:${billId}`,
          kind: "fulfil-work",
          urgency: duty,
        },
      ],
    }),
  );
  return decision.selected?.definition.id !== "sitting-attend";
}

/** One chamber's vote: each member yes for a positive position, no for a negative one, abstaining with nothing either way. */
function chamberVote(
  api: CoreAPI,
  bill: BillRow,
  officeId: string,
): { yes: number; no: number } {
  let yes = 0;
  let no = 0;
  const seated = members(api, officeId);
  const positions = seated.map((member) =>
    memberPosition(api, bill.id, memberKey(member)),
  );
  const closeness = voteCloseness(positions.map((position) => position.total));
  for (const [index, member] of seated.entries()) {
    const key = memberKey(member);
    const position = positions[index]!;
    // A member who chose their vote (the player) votes as they chose; the
    // player is never voted for, so with no choice they abstain.
    const chosen = table(api, "choices").get(`${bill.id}|${key}`) as unknown as
      { vote: "yes" | "no" | "abstain" } | undefined;
    const vote =
      chosen?.vote ??
      (key ===
      (snapshotExplicitControlV1(api.state).personId ??
        (api.state as CoreState).playerId)
        ? "abstain"
        : missesSitting(api, key, bill.id, officeId, position.total, closeness)
          ? "absent"
          : position.total > 0
            ? "yes"
            : position.total < 0
              ? "no"
              : "abstain");
    if (vote === "yes") yes += 1;
    if (vote === "no") no += 1;
    // A member who is a full person has cast a vote of their own: a record
    // their journal and the director read. Named officials not filled in have none.
    const resident = api.state.people.get(key);
    if (resident && (vote === "yes" || vote === "no"))
      api.emit({
        id: `office.voted:${bill.id}:${key}`,
        date: api.state.date,
        kind: "office.voted",
        personIds: [key],
        placeId: resident.placeId,
        source: {
          tag: "SOURCED",
          citation: `Vote on ${bill.number}`,
          asOf: api.state.date,
        },
        publicRecord: true,
        facts: { billId: bill.id, number: bill.number, vote },
      });
    table(api, "votes").put({
      id: `vote:${bill.id}:${key}`,
      billId: bill.id,
      memberId: key,
      chamber: officeId,
      vote,
      position,
      // The trades the member took on this bill (their section is in its text
      // now, so it is in their views), which their vote cites.
      traded: bill.deals
        .filter((d) => d.memberId === key && d.status !== "declined")
        .map((d) => ({
          kind: d.kind,
          terms: d.terms,
          // Module rows hold no undefined: a trade with no stage names none.
          ...(d.stage === undefined ? {} : { stage: d.stage }),
        })),
    } as unknown as ModuleRow);
    for (const provision of bill.provisions) {
      const stance = provisionStance(api, provision, billLevel(api, bill));
      if (stance && vote !== "abstain" && vote !== "absent")
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
      level: billReach(api, bill).level,
      form: bill.form.kind,
      motion: motionOn(bill),
      subjects: billTitle(bill)
        .subjects.map((t) => t.key)
        .join(","),
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
  /** The day the committee met on the bill. */
  readonly date: string;
  readonly committee: string;
  readonly chairId: string;
  readonly memberIds: readonly string[];
  readonly heard: boolean;
  readonly votes: readonly {
    readonly memberId: string;
    readonly vote: "yes" | "no" | "abstain";
    readonly position: MemberPosition;
  }[];
  readonly witnesses: readonly {
    readonly personId: string;
    readonly stake: string;
  }[];
  readonly yes: number;
  readonly no: number;
  readonly reported: boolean;
}

/** The subject committee a bill goes to, by what its first section touches (data). */
function committeeFor(bill: BillRow): string {
  const p = bill.provisions[0];
  return p ? committeeForSection(p) : COMMITTEES[COMMITTEES.length - 1]!;
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
  // A committee that already met on the bill (on its own day, ahead of the floor) is not convened again.
  const met = table(api, "committees").get(
    `committee:${bill.id}:${chamber}`,
  ) as unknown as CommitteeRecord | undefined;
  if (met) return met;
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
  const heard = chairHearsBill(api, memberKey(chair), chairPosition.total);
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
  // Markup: the committee's holdouts trade for sections of their own, and
  // its most opposed member may move a pill, as on the floor.
  if (heard)
    floorAmendments(api, bill, chamber, "committee", roster.map(memberKey));
  const votes: CommitteeRecord["votes"][number][] = [];
  if (heard)
    for (const member of roster) {
      const memberId = memberKey(member);
      const position = memberPosition(api, bill.id, memberId);
      const chosen = table(api, "choices").get(
        `${bill.id}|${memberId}`,
      ) as unknown as { vote: "yes" | "no" | "abstain" } | undefined;
      const vote =
        chosen?.vote ??
        (memberId === (api.state as CoreState).playerId
          ? "abstain"
          : position.total > 0
            ? "yes"
            : position.total < 0
              ? "no"
              : "abstain");
      votes.push({ memberId, vote, position });
    }
  const yes = votes.filter((v) => v.vote === "yes").length;
  const no = votes.filter((v) => v.vote === "no").length;
  const record: CommitteeRecord = {
    id: `committee:${bill.id}:${chamber}`,
    billId: bill.id,
    chamber,
    date: api.state.date,
    committee: committeeFor(bill),
    chairId: memberKey(chair),
    memberIds: roster.map(memberKey),
    heard,
    votes,
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
      level: billReach(api, bill).level,
      committee: record.committee,
      chair: record.chairId,
      yes: String(yes),
      no: String(no),
    },
  });
  return record;
}

/** The hearings a body's committee held on a day, each with its witnesses, chair and vote. */
export function committeeHearingsOn(
  api: CoreAPI,
  chamber: string,
  committee: string,
  date: string,
): readonly CommitteeRecord[] {
  return (
    table(api, "committees").rows() as unknown as CommitteeRecord[]
  ).filter(
    (c) =>
      c.chamber === chamber && c.committee === committee && c.date === date,
  );
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
/**
 * The sections a member would add to a bill: the questions they care most
 * about that the bill doesn't touch and its body may answer, each in the
 * member's own direction, strongest first.
 */
function ownSections(
  api: CoreAPI,
  bill: BillRow,
  memberId: string,
  count: number,
): readonly Provision[] {
  const level = billLevel(api, bill);
  const touched = new Set(
    bill.provisions.flatMap((p) => {
      const stance = provisionStance(api, p, level);
      return stance ? [stance.question] : [];
    }),
  );
  // An official's own stance is their record and causes; a town member's,
  // where they stand today.
  const official = officialOf(api, memberId);
  const lean = leanOf(api, memberId);
  const stanceOn = (q: string) =>
    official
      ? ownStance(official.ideal, official.signature, q)
      : viewOn(api, memberId, q, lean);
  return Object.keys(POLICY_QUESTIONS)
    .filter((q) => !touched.has(q))
    .map((q) => ({ q, stance: stanceOn(q) }))
    .filter(({ stance }) => stance !== 0)
    .sort(
      (a, b) =>
        Math.abs(b.stance) - Math.abs(a.stance) || a.q.localeCompare(b.q),
    )
    .map(({ q, stance }): Provision => ({
      kind: "policy-question",
      question: q,
      value: Math.sign(stance),
    }))
    .filter((p) =>
      checkedText(api, bill.bodyOfficeId, [p]).authority.every(
        (a) => a.allowed,
      ),
    )
    .slice(0, count);
}

/**
 * The floor before a chamber votes, and a committee's markup before it
 * reports (the owner's ruling, Oct 14, 2026, afternoon). A sponsor short of a majority works the holdouts nearest even:
 * each asks for a section of their own in return for their vote, and the
 * sponsor gives it where they still back the bill with it. Then the member
 * most against a bill that would pass may move a poison pill: a section of
 * their own the bill's backers dislike, adopted by the opponents and those
 * who like it, that leaves the bill short. Whether they play it that way is
 * their own temperament. Each adopted section is the bill's for good.
 */
function floorAmendments(
  api: CoreAPI,
  bill: BillRow,
  chamber: string,
  stage: "committee" | "floor" = "floor",
  seats: readonly string[] = members(api, chamber).map(memberKey),
): BillRow {
  const playerId =
    snapshotExplicitControlV1(api.state).personId ??
    (api.state as CoreState).playerId;
  const roll = seats.filter((k) => k !== playerId);
  // The bill as the last stage left it (a markup may have amended it).
  const start =
    (table(api, "bills").get(bill.id) as unknown as BillRow | undefined) ??
    bill;
  if (roll.length < 3) return start;
  const need = Math.floor(roll.length / 2) + 1;
  let current = start;
  const totals = new Map<string, number>();
  const recount = () => {
    for (const k of roll) totals.set(k, positionOn(api, current, k).total);
    return [...totals.values()].filter((t) => t > 0).length;
  };
  let yes = recount();
  const adopt = (
    section: Provision,
    memberId: string,
    kind: "trade-amendment" | "poison-pill",
  ) => {
    const supportBefore = yes;
    const memberBefore = totals.get(memberId)!;
    const sponsorBefore = positionOn(api, current, current.sponsorId).total;
    current = {
      ...current,
      ...checkedText(api, current.bodyOfficeId, [
        ...current.provisions,
        section,
      ]),
      deals: [
        ...current.deals,
        {
          memberId,
          kind,
          terms: `add ${section.question} ${section.value > 0 ? "yes" : "no"}`,
          date: api.state.date,
          status: "accepted",
          stage,
          chamber,
        },
      ],
    };
    yes = recount();
    // Both sides' reasons, now that the section is in.
    current = {
      ...current,
      deals: current.deals.map((d, i) =>
        i === current.deals.length - 1
          ? {
              ...d,
              reasons: {
                member: { before: memberBefore, after: totals.get(memberId)! },
                sponsor: {
                  before: sponsorBefore,
                  after: positionOn(api, current, current.sponsorId).total,
                },
                support: { before: supportBefore, after: yes },
              },
            }
          : d,
      ),
    };
    api.emit({
      id: `bill-amendment:${current.id}:${chamber}:${stage}:${current.provisions.length - 1}`,
      date: api.state.date,
      kind: "bill-amendment",
      personIds: [memberId, current.sponsorId].filter((id) =>
        api.state.people.has(id),
      ),
      placeId: lawChain(api).townPlaceId,
      source: {
        tag: "SOURCED",
        citation: `Amendment to ${current.number}`,
        asOf: api.state.date,
      },
      publicRecord: true,
      news: true,
      facts: {
        billId: current.id,
        number: current.number,
        level: billReach(api, current).level,
        chamber,
        stage,
        supportBefore: String(supportBefore),
        supportAfter: String(yes),
        memberBefore: String(memberBefore),
        memberAfter: String(totals.get(memberId)!),
        movedBy: memberId,
        kind,
        question: section.question!,
        direction: section.value > 0 ? "yes" : "no",
      },
    });
  };
  // A trade: the sponsor (the player deals for themselves) gives a holdout
  // their own section for their vote.
  if (yes < need && current.sponsorId !== playerId) {
    const holdouts = roll
      .filter((k) => k !== current.sponsorId && totals.get(k)! <= 0)
      .sort((a, b) => totals.get(b)! - totals.get(a)! || a.localeCompare(b));
    for (const k of holdouts) {
      if (yes >= need) break;
      // An earlier section may already have won this member over.
      if (totals.get(k)! > 0) continue;
      const [section] = ownSections(api, current, k, 1);
      if (!section) continue;
      const amended: BillRow = {
        ...current,
        provisions: [...current.provisions, section],
      };
      // The sponsor gives it only while they, and everyone they have
      // already traded with, still back the bill with it.
      const bound = [
        current.sponsorId,
        ...current.deals
          .filter((d) => d.kind === "trade-amendment")
          .map((d) => d.memberId),
      ];
      if (bound.some((m) => positionOn(api, amended, m).total <= 0)) continue;
      if (positionOn(api, amended, k).total <= 0) continue;
      // A section others dislike can cost the bill more votes than the
      // holdout brings: the sponsor trades only to end with more support.
      const backing = roll.filter(
        (m) => positionOn(api, amended, m).total > 0,
      ).length;
      if (backing <= yes) continue;
      adopt(section, k, "trade-amendment");
    }
  }
  // A poison pill, from the member most against a bill that would pass.
  if (yes >= need) {
    const proposer = roll
      .filter((k) => totals.get(k)! < 0)
      .sort((a, b) => totals.get(a)! - totals.get(b)! || a.localeCompare(b))[0];
    if (proposer) {
      let best: { section: Provision; left: number } | null = null;
      for (const section of ownSections(
        api,
        current,
        proposer,
        campaignParameter("pillCandidates"),
      )) {
        const amended: BillRow = {
          ...current,
          provisions: [...current.provisions, section],
        };
        // A section that would win the mover over isn't a pill: it's a
        // bill they'd back.
        if (positionOn(api, amended, proposer).total > 0) continue;
        let forIt = 0;
        let left = 0;
        for (const k of roll) {
          const after = positionOn(api, amended, k).total;
          // Opponents back what sinks the bill; backers vote the section
          // on whether it leaves them liking the bill as much.
          if (totals.get(k)! <= 0 || after >= totals.get(k)!) forIt += 1;
          if (after > 0) left += 1;
        }
        if (
          forIt * 2 > roll.length &&
          left < need &&
          (!best || left < best.left)
        )
          best = { section, left };
      }
      if (best && movesPill(api, proposer, -totals.get(proposer)!)) {
        adopt(best.section, proposer, "poison-pill");
      }
    }
  }
  if (current !== start)
    table(api, "bills").put(current as unknown as ModuleRow);
  return current;
}

/**
 * Whether a member moves a pill that would sink a bill: how far against it
 * they stand (`opposition`, the size of their negative position) past the
 * bar at which bending the rules is worth the standing it costs, and their
 * own temperament at the decision's calibrated weight.
 */
export function movesPill(
  api: CoreAPI,
  memberId: string,
  opposition: number,
): boolean {
  const member = api.state.people.get(memberId);
  // Only a living member moves a pill.
  if (!member?.alive) return false;
  return leanedYes(
    api.state,
    member,
    "legislature.poison-pill",
    "pill-move",
    "pill-hold",
    opposition - campaignParameter("pillOppositionBar"),
  );
}

export function holdVote(api: CoreAPI, billId: string): BillRow {
  const result = countVote(api, billId);
  // Votes are on the record once a bill is anything but unvoted or blocked.
  if (result.status !== "drafted" && result.status !== "blocked")
    for (const hook of afterVoteHooks) hook(api, billId);
  return result;
}

function countVote(api: CoreAPI, billId: string): BillRow {
  let bill = table(api, "bills").get(billId) as unknown as BillRow;
  if (bill.status !== "drafted" && bill.status !== "blocked") return bill;
  bill = { ...bill, ...checkedText(api, bill.bodyOfficeId, bill.provisions) };
  table(api, "bills").put(bill as unknown as ModuleRow);
  if (bill.status === "blocked") return bill;
  for (const hook of beforeVoteHooks) hook(api, billId);
  bill = table(api, "bills").get(billId) as unknown as BillRow;
  if (bill.status !== "drafted") return bill;
  bill = { ...bill, ...checkedText(api, bill.bodyOfficeId, bill.provisions) };
  table(api, "bills").put(bill as unknown as ModuleRow);
  if (bill.status === "blocked") return bill;
  const tallies: { yes: number; no: number; members: number }[] = [];
  for (const chamber of chambersOf(api, bill)) {
    const committee = committeeStage(api, bill, chamber);
    // The bill as its markup left it.
    bill = table(api, "bills").get(bill.id) as unknown as BillRow;
    if (committee && !committee.reported) {
      const held: BillRow = { ...bill, status: "failed" };
      table(api, "bills").put(held as unknown as ModuleRow);
      return held;
    }
    // The floor's vote cites the report that sent the bill to it.
    if (committee && !bill.committeeId) {
      bill = { ...bill, committeeId: committee.id };
      table(api, "bills").put(bill as unknown as ModuleRow);
    }
    bill = floorAmendments(api, bill, chamber);
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
  const body = bodyOf(api, bodyOfficeId)!;
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
 * An executive's lean on a bill they may sign: their own position on its
 * terms plus their temperament, scaled by how settled the law it moves is.
 * Below zero they veto. The one rule every executive's choice follows, the
 * character of a player who leaves the desk included.
 */
function executiveLeanOn(
  api: CoreAPI,
  bill: BillRow,
  executiveId: string,
): { position: number; temperament: number; lean: number } {
  const position = memberPosition(api, bill.id, executiveId).total;
  const settled = billSettledness(api, bill);
  const executive = api.state.people.get(executiveId);
  const temperament = executive
    ? leanedTerm(
        api.state,
        executive,
        "legislature.sign-or-veto",
        "sign",
        "veto",
        position,
        (lean) => tasteForChange(lean, settled),
      )
    : 0;
  return { position, temperament, lean: position + temperament };
}

/** The same lean for a bill by its id (the character signs or vetoes by it). */
export function executiveLean(
  api: CoreAPI,
  billId: string,
  executiveId: string,
): { position: number; temperament: number; lean: number } {
  return executiveLeanOn(api, billOf(api, billId), executiveId);
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
    if (
      !decided &&
      key ===
        (snapshotExplicitControlV1(api.state).personId ??
          (api.state as CoreState).playerId)
    ) {
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
    ({ status, decision } = decideAtDesk(api, bill, {
      key,
      executive,
      position,
      decided,
      mayorRule,
    }));
  }
  const next: BillRow = { ...bill, status };
  table(api, "bills").put(next as unknown as ModuleRow);
  if (status === "vetoed") return next;
  return enact(api, next, tallies, decision);
}

/**
 * The executive's turn on a budget the legislature passed: a chief executive
 * with a veto signs or vetoes from their own position (the owner, Oct 14:
 * the executive signs or vetoes everywhere), recorded as an executive-action
 * the press reads. Null where there is no such executive, or where the
 * person the player controls holds the office: their budget proposal is
 * their own act, and a desk for it is a separate piece of work.
 */
function budgetDesk(
  api: CoreAPI,
  bill: BillRow,
): "signed" | "vetoed" | "overridden" | null {
  const { office, term: executive } = executiveOf(api, bill.bodyOfficeId);
  const mayorRule = office?.kind === "mayor" ? mayorVeto(api) : null;
  if (!executive || (mayorRule && !mayorRule.veto)) return null;
  const key = memberKey(executive);
  if (
    key ===
    (snapshotExplicitControlV1(api.state).personId ??
      (api.state as CoreState).playerId)
  )
    return null;
  const out = decideAtDesk(api, bill, {
    key,
    executive,
    position: positionOn(api, bill, key),
    decided: undefined,
    mayorRule,
  });
  return out.status === "signed" || out.status === "vetoed"
    ? out.status
    : "overridden";
}

/**
 * The executive's signature or veto on a passed bill or budget, from their
 * own position and taste for change; a veto goes to the override vote. The
 * decision is public record the press reads, like the floor's roll call.
 */
function decideAtDesk(
  api: CoreAPI,
  bill: BillRow,
  desk: {
    readonly key: string;
    readonly executive: NonNullable<ReturnType<typeof executiveOf>["term"]>;
    readonly position: MemberPosition;
    readonly decided: { sign: boolean } | undefined;
    readonly mayorRule: ReturnType<typeof mayorVeto> | null;
  },
): {
  status: BillRow["status"];
  decision: { executiveId: string; action: string };
  override: ReturnType<typeof overrideVote> | null;
} {
  const { key, executive, position, decided, mayorRule } = desk;
  let status: BillRow["status"] = "enacted";
  let override: ReturnType<typeof overrideVote> | null = null;
  const { temperament: signLean, lean } = executiveLeanOn(api, bill, key);
  const vetoes = decided ? !decided.sign : lean < 0;
  if (vetoes) {
    // Two thirds of each body's whole membership (not of those voting).
    const share =
      mayorRule?.overrideShare ?? campaignParameter("vetoOverrideShare");
    override = overrideVote(
      api,
      bill,
      memberSide(api, key, executive.party),
      (n) =>
        mayorRule?.plusOne
          ? Math.floor(n * share) + 1
          : Math.ceil(n * share - 1e-9),
    );
    status = override.passed ? "overridden" : "vetoed";
    // The override vote is a public record of its own, beside the veto's.
    api.emit({
      id: `veto-override:${bill.id}`,
      date: api.state.date,
      kind: "veto-override",
      personIds: [
        ...(executive.personId ? [executive.personId] : []),
        ...(api.state.people.has(bill.sponsorId) ? [bill.sponsorId] : []),
      ],
      placeId: lawChain(api).townPlaceId,
      source: {
        tag: "SOURCED",
        citation: `Vote to override the veto of ${bill.number}`,
        asOf: api.state.date,
      },
      publicRecord: true,
      news: true,
      facts: {
        billId: bill.id,
        number: bill.number,
        passed: String(override.passed),
        sponsorId: bill.sponsorId,
        executiveId: executive.personId ?? "",
        tallies: override.tallies
          .map((t) => `${t.chamber}:${t.yes}/${t.needed}/${t.members}`)
          .join(","),
      },
    });
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
  // The signature, the veto and any override vote are public record the
  // press reads, like the floor's roll call.
  api.emit({
    id: `executive-action:${bill.id}`,
    date: api.state.date,
    kind: "executive-action",
    personIds: [
      ...(executive.personId ? [executive.personId] : []),
      ...(api.state.people.has(bill.sponsorId) ? [bill.sponsorId] : []),
    ],
    placeId: lawChain(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `${status === "signed" ? "Signing" : "Veto"} of ${bill.number}`,
      asOf: api.state.date,
    },
    publicRecord: true,
    news: true,
    facts: {
      billId: bill.id,
      number: bill.number,
      level: billReach(api, bill).level,
      executiveId: key,
      action: status,
      ...(override
        ? {
            override: override.tallies
              .map((t) => `${t.chamber}:${t.yes}/${t.needed}/${t.members}`)
              .join(","),
          }
        : {}),
    },
  });
  return { status, decision: { executiveId: key, action: status }, override };
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
  needed: (
    members: number,
    voting: number,
    present: number,
    entitled: number,
  ) => number,
  itemIndex?: number,
  joint = false,
): {
  readonly passed: boolean;
  readonly tallies: readonly {
    chamber: string;
    yes: number;
    needed: number;
    members: number;
  }[];
} {
  const tallies: {
    chamber: string;
    yes: number;
    needed: number;
    members: number;
  }[] = [];
  let totalVoting = 0;
  let totalPresent = 0;
  let totalEntitled = 0;
  for (const chamber of chambersOf(api, bill)) {
    const roster = members(api, chamber);
    let yes = 0;
    let voting = 0;
    let present = 0;
    const entitled =
      itemIndex === undefined
        ? roster.length
        : Math.max(
            roster.length,
            api
              .moduleState(OFFICES_MODULE_ID)
              .table("seats")
              .query("byOffice", [chamber]).length,
          );
    const positions = roster.map((member) => {
      const key = memberKey(member);
      const position = positionOn(api, bill, key);
      const executive =
        executiveSide !== 0 &&
        memberSide(api, key, member.party) === executiveSide
          ? -executivePull(api, key)
          : 0;
      return { position, executive };
    });
    const closeness = voteCloseness(
      positions.map((row) => row.position.total + row.executive),
    );
    for (const [index, member] of roster.entries()) {
      const key = memberKey(member);
      const { position, executive } = positions[index]!;
      const chosen = table(api, "choices").get(
        `${bill.id}|${key}|override${itemIndex === undefined ? "" : `:item:${itemIndex}`}`,
      ) as unknown as { vote: "yes" | "no" | "abstain" } | undefined;
      const total = position.total + executive;
      const vote =
        chosen?.vote ??
        (key ===
        (snapshotExplicitControlV1(api.state).personId ??
          (api.state as CoreState).playerId)
          ? "abstain"
          : itemIndex !== undefined &&
              missesSitting(api, key, bill.id, chamber, total, closeness)
            ? "absent"
            : total > 0
              ? "yes"
              : total < 0
                ? "no"
                : "abstain");
      if (vote !== "absent") present += 1;
      if (vote === "yes" || vote === "no") voting += 1;
      if (vote === "yes") yes += 1;
      table(api, "votes").put({
        id: `vote:${bill.id}:${key}:override${itemIndex === undefined ? "" : `:item:${itemIndex}`}`,
        billId: bill.id,
        memberId: key,
        chamber,
        vote,
        override: true,
        ...(itemIndex === undefined ? {} : { itemIndex }),
        position: { ...position, executive, total },
      } as unknown as ModuleRow);
    }
    tallies.push({
      chamber,
      yes,
      needed: needed(roster.length, voting, present, entitled),
      members: roster.length,
    });
    totalVoting += voting;
    totalPresent += present;
    totalEntitled += entitled;
    if (!joint && yes < needed(roster.length, voting, present, entitled))
      return { passed: false, tallies };
  }
  if (joint) {
    const yes = tallies.reduce((sum, row) => sum + row.yes, 0);
    const members = tallies.reduce((sum, row) => sum + row.members, 0);
    const required = needed(members, totalVoting, totalPresent, totalEntitled);
    return {
      passed: yes >= required,
      tallies: [{ chamber: "joint", yes, members, needed: required }],
    };
  }
  return { passed: true, tallies };
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

/** Strike appropriation items under the place's veto law; each override is voted and recorded separately. */
export function executiveItemVeto(
  api: CoreAPI,
  billId: string,
  executiveId: string,
  itemIndices: readonly (number | ItemVetoSelection)[],
): BillRow {
  const bill = billOf(api, billId);
  const executive = executiveOf(api, bill.bodyOfficeId);
  // stopgapId: SG-STATE-line-item-veto-engine — remaining source and played-proof gaps.
  api.stopgap("SG-STATE-line-item-veto-engine");
  const law = lineItemVetoOf(lawChain(api).stateKey);
  if (
    bill.status !== "awaiting-signature" ||
    executive.office?.kind !== "governor" ||
    !executive.term ||
    memberKey(executive.term) !== executiveId ||
    !law?.lineItem
  )
    throw new Error("This bill is not awaiting an item veto by this governor.");
  const selected = itemIndices.map((item) =>
    typeof item === "number" ? { index: item, remainingMinor: 0 } : item,
  );
  if (new Set(selected.map((item) => item.index)).size !== selected.length)
    throw new Error("Each appropriation item may be selected only once.");
  if (
    !selected.length ||
    selected.some(
      ({ index, remainingMinor }) =>
        !Number.isInteger(index) ||
        bill.provisions[index]?.kind !== "budget-line" ||
        bill.provisions[index]!.value <= 0 ||
        !Number.isSafeInteger(remainingMinor) ||
        remainingMinor < 0 ||
        remainingMinor >= bill.provisions[index]!.value ||
        law.excludedLines?.includes(bill.provisions[index]!.line ?? "") ||
        (remainingMinor > 0 &&
          (!law.reduce ||
            law.reductionExcludedLines?.includes(
              bill.provisions[index]!.line ?? "",
            ))),
    )
  )
    throw new Error(
      "An item veto must name an appropriation increase in the passed bill.",
    );
  if (
    law.scope === "appropriations-only" &&
    bill.provisions.some((p) => p.kind !== "budget-line")
  )
    throw new Error(
      "The place permits item vetoes only on appropriation bills.",
    );
  const decisions = selected.map(({ index, remainingMinor }) => {
    const provision = bill.provisions[index]!;
    const item = {
      ...bill,
      provisions: [{ ...provision, value: provision.value - remainingMinor }],
      costEstimate: costOf(api, [
        { ...provision, value: provision.value - remainingMinor },
      ]),
    };
    const override = overrideVote(
      api,
      item,
      partySide(executive.term!.party),
      (count, voting, present, entitled) =>
        itemOverrideNeeded(
          remainingMinor > 0
            ? (law.reductionOverride ?? law.override)
            : law.override,
          count,
          voting,
          present,
          entitled,
        ),
      index,
      law.chamberMode === "joint",
    );
    return {
      index,
      remainingMinor,
      overridden: override.passed,
      tallies: override.tallies,
    };
  });
  table(api, "itemVetoes").put({
    id: bill.id,
    billId: bill.id,
    executiveId,
    date: api.state.date,
    citation: law.citation,
    decisions,
    struck: decisions
      .filter((d) => !d.overridden && d.remainingMinor === 0)
      .map((d) => d.index),
  } as unknown as ModuleRow);
  api.emit({
    id: `item-veto:${bill.id}`,
    date: api.state.date,
    kind: "item-veto",
    personIds: [executiveId],
    placeId: lawChain(api).townPlaceId,
    source: {
      tag: law.detailTag,
      citation: law.citation,
      asOf: api.state.date,
      estimatedFrom: "state-line-item-veto.json",
    },
    publicRecord: true,
    news: true,
    facts: {
      billId,
      items: selected.map((item) => item.index).join(","),
      remainingMinor: JSON.stringify(selected),
    },
  });
  return executiveDecision(api, billId, true);
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
  const rule = effectiveRule(api, bill);
  const { jurisdiction, level, federal, state } = rule;
  const defaultDate = rule.date;
  const citation = federal
    ? `Public Law (bill ${bill.number})`
    : state
      ? `${bill.number}, enacted (effective by ${rule.cite})`
      : `Ordinance ${bill.number}, effective ${rule.days} days after adoption (the tunable ordinanceEffectiveDays, not a place's recorded rule)`;
  // An ordinance's date rests on that delay, so its row is an estimate; a
  // federal act and a state act take their dates from law.
  const estimate = rule.kind === "days-after-adoption";
  const itemVeto = table(api, "itemVetoes").get(bill.id) as unknown as
    | {
        struck: number[];
        decisions: {
          index: number;
          remainingMinor: number;
          overridden: boolean;
        }[];
      }
    | undefined;
  for (const [index, provision] of bill.provisions.entries()) {
    if (itemVeto?.struck.includes(index)) continue;
    const itemDecision = itemVeto?.decisions.find(
      (item) => item.index === index,
    );
    const enactedValue =
      itemDecision && !itemDecision.overridden
        ? itemDecision.remainingMinor
        : provision.value;
    const effectiveDate = provision.effectiveDate ?? defaultDate;
    if (provision.kind === "law-amount" && provision.series) {
      const shaped = shapedRate(
        lawInForce(api, provision.series).levels.find(
          (l) => l.jurisdiction === jurisdiction,
        )?.row ?? null,
        provision,
      );
      enactLaw(api, {
        jurisdiction,
        level,
        series: provision.series,
        value: provision.value,
        unit:
          shaped?.unit ??
          provision.unit ??
          (provision.series === "minimum-wage" ? "minor/hour" : "percent"),
        effectiveDate,
        measureId: bill.number,
        citation,
        estimate,
        // The bill itself, not only its number: numbers repeat across bodies
        // and sessions, and a recall or the record finds the bill by this.
        terms: {
          ...(shaped?.terms ?? {}),
          ...(terms ?? {}),
          enactedByBill: bill.id,
        },
      });
    }
    if (provision.kind === "budget-line" && provision.line) {
      amendBudget(api, {
        governmentId: jurisdiction,
        line: provision.line,
        deltaMinor: enactedValue,
        measureId: bill.number,
      });
      if (provision.requestId && provision.recipientId)
        payProjectGrant(api, {
          requestId: provision.requestId,
          fromGovernmentId: jurisdiction,
          amountMinor: enactedValue,
          measureId: bill.number,
        });
    }
    if (provision.kind === "policy-question" && provision.question)
      enactLaw(api, {
        jurisdiction,
        level,
        series: provision.question,
        value: provision.value > 0 ? 1 : 0,
        effectiveDate,
        measureId: bill.number,
        citation,
        estimate,
        // The bill itself, not only its number: numbers repeat across bodies
        // and sessions, and a recall or the record finds the bill by this.
        terms: { ...(terms ?? {}), enactedByBill: bill.id },
      });
  }
  const next: BillRow = {
    ...bill,
    status: bill.status === "overridden" ? "overridden" : "enacted",
  };
  table(api, "bills").put(next as unknown as ModuleRow);
  return next;
}

/**
 * A body with committees takes a scheduled bill to its committee on a day of
 * its own, ahead of the floor: the committee hears it, marks it up and
 * reports it or holds it, and a held bill never reaches the floor's agenda.
 * Only the bill's first chamber meets this way; a later chamber's committee
 * sits when the bill reaches it. Where the date was not scheduled (a vote
 * held at once) the committee still meets inside the vote, as it did.
 * Returns the record, or null where the body has no committee.
 */
// stopgapId: SG-GOV-committee-day-hooks
export function holdCommittee(
  api: CoreAPI,
  billId: string,
): CommitteeRecord | null {
  const bill = table(api, "bills").get(billId) as unknown as BillRow;
  if (bill.status !== "drafted") return null;
  api.stopgap("SG-GOV-committee-day-hooks");
  const record = committeeStage(api, bill, chambersOf(api, bill)[0]!);
  if (record && !record.reported) {
    const held = table(api, "bills").get(billId) as unknown as BillRow;
    table(api, "bills").put({
      ...held,
      status: "failed",
    } as unknown as ModuleRow);
    // The bill's fate is on the record as it is when a vote ends it.
    for (const hook of afterVoteHooks) hook(api, billId);
  }
  return record;
}

function legislatureCalendar(
  api: CoreAPI,
  work: Readonly<ModuleCalendarWork>,
): void {
  if (work.kind === "committee-meeting")
    holdCommittee(api, work.sourceRecordIds[0]!);
  if (work.kind === "council-meeting") {
    const billId = work.sourceRecordIds[0]!;
    const bill = table(api, "bills").get(billId) as unknown as
      BillRow | undefined;
    // A bill its committee held never reaches the floor.
    const held = bill
      ? committeeRecords(api, billId).some((c) => !c.reported)
      : false;
    if (!held) holdVote(api, billId);
  }
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
  const executiveId =
    snapshotExplicitControlV1(api.state).personId ??
    (api.state as CoreState).playerId;
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

/** The body's next sitting day after today, with where its date comes from. */
export interface Sitting {
  readonly date: string;
  readonly source: Source;
}
let sittingReader:
  ((api: CoreAPI, bodyOfficeId: string) => Sitting | null) | null = null;
/** The engine that keeps the bodies' calendars says when each sits next. */
export function registerSittingReader(
  reader: (api: CoreAPI, bodyOfficeId: string) => Sitting | null,
): void {
  sittingReader = reader;
}

/**
 * Put a bill on the body's next sitting: a town body's next regular meeting,
 * a legislature's next floor week in session (or its next session's first),
 * Congress's likewise, from the calendars the world keeps.
 */
/** Whether the body has a sitting on its calendar to put a bill before. */
export function hasSitting(api: CoreAPI, bodyOfficeId: string): boolean {
  return (sittingReader?.(api, bodyOfficeId) ?? null) !== null;
}

export function scheduleVote(api: CoreAPI, billId: string): string {
  const bill = table(api, "bills").get(billId) as unknown as BillRow;
  const sitting = sittingReader?.(api, bill.bodyOfficeId) ?? null;
  if (!sitting)
    throw new Error(`No sitting of ${bill.bodyOfficeId} is on the calendar.`);
  api.moduleCalendar(LEGISLATURE_MODULE_ID).schedule({
    key: `meeting:${billId}`,
    date: sitting.date,
    kind: "council-meeting",
    source: sitting.source,
    sourceRecordIds: [billId],
  });
  // A body with committees takes the bill to its committee a week ahead of
  // the floor, when the sitting is far enough off to leave a day before it.
  const first = chambersOf(api, bill)[0]!;
  if (
    members(api, first).length > campaignParameter("committeeOfTheWholeMaximum")
  ) {
    const tomorrow = addDays(makeIsoDate(api.state.date), 1);
    const ahead = addDays(
      makeIsoDate(sitting.date),
      -campaignParameter("committeeLeadDays"),
    );
    const date = ahead > tomorrow ? ahead : tomorrow;
    if (date < sitting.date)
      api.moduleCalendar(LEGISLATURE_MODULE_ID).schedule({
        key: `committee:${billId}`,
        date,
        kind: "committee-meeting",
        source: sitting.source,
        sourceRecordIds: [billId],
      });
  }
  return sitting.date;
}

/**
 * The floor's agenda for a date: the drafted bills whose vote is scheduled
 * for it, in id order. A member reads what the floor takes up ahead of the
 * vote here, not from the calendar's keys.
 */
export function floorAgendaOn(api: CoreAPI, date: string): readonly BillRow[] {
  const calendar = api.moduleCalendar(LEGISLATURE_MODULE_ID);
  return (table(api, "bills").rows() as unknown as BillRow[])
    .filter(
      (b) =>
        b.status === "drafted" &&
        calendar.get(`meeting:${b.id}`)?.date === date,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function billOf(api: CoreAPI, billId: string): BillRow {
  return table(api, "bills").get(billId) as unknown as BillRow;
}

export function votesOn(
  api: CoreAPI,
  billId: string,
): readonly {
  memberId: string;
  vote: string;
  position: MemberPosition;
  /** The trades the member took on the bill, which the vote cites. */
  traded?: readonly { kind: string; terms: string; stage?: string }[];
}[] {
  return table(api, "votes").query("byBill", [billId]) as unknown as {
    memberId: string;
    vote: string;
    position: MemberPosition;
    traded?: readonly { kind: string; terms: string; stage?: string }[];
  }[];
}

export type { PersonState };
export { OFFICES_MODULE_ID };

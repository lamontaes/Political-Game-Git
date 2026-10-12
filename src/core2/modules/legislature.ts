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
import provisionQuestions from "../../../data/research/legislature/provision-questions.json" with { type: "json" };
import lawAgricultureNaturalResources from "../../../data/research/laws/starting-law-2026/agriculture-natural-resources.json" with { type: "json" };
import lawBusinessCommerce from "../../../data/research/laws/starting-law-2026/business-commerce.json" with { type: "json" };
import lawCivilFamilyCommunity from "../../../data/research/laws/starting-law-2026/civil-family-community.json" with { type: "json" };
import lawEducation from "../../../data/research/laws/starting-law-2026/education.json" with { type: "json" };
import lawEnvironmentEnergy from "../../../data/research/laws/starting-law-2026/environment-energy.json" with { type: "json" };
import lawFiscal from "../../../data/research/laws/starting-law-2026/fiscal.json" with { type: "json" };
import lawGovernmentOperations from "../../../data/research/laws/starting-law-2026/government-operations.json" with { type: "json" };
import lawHealthHumanServices from "../../../data/research/laws/starting-law-2026/health-human-services.json" with { type: "json" };
import lawHousingLandUse from "../../../data/research/laws/starting-law-2026/housing-land-use.json" with { type: "json" };
import lawJusticePublicSafety from "../../../data/research/laws/starting-law-2026/justice-public-safety.json" with { type: "json" };
import lawLaborCommerce from "../../../data/research/laws/starting-law-2026/labor-commerce.json" with { type: "json" };
import lawLaborWorkforce from "../../../data/research/laws/starting-law-2026/labor-workforce.json" with { type: "json" };
import lawTechnologyPrivacy from "../../../data/research/laws/starting-law-2026/technology-privacy.json" with { type: "json" };
import lawTransportationInfrastructure from "../../../data/research/laws/starting-law-2026/transportation-infrastructure.json" with { type: "json" };
import { registerModule } from "../state";
import type { CoreAPI, CoreModule, CoreState, PersonState } from "../types";
import type { ModuleRow } from "../module-data";
import type { ModuleCalendarWork } from "../module-calendar";
import { campaignParameter, personLean, personStance } from "../campaign-views";
import { governmentUnitsForPlace } from "../../simulation/government-units";
import { enactLaw, lawChain, lawInForce, LAWS_MODULE_ID } from "./laws";
import { localAuthority } from "../laws-in-force";
import type { LawRowInput } from "../laws-starting";
import { OFFICES_MODULE_ID, type TermRow } from "./offices";
import { recordVote } from "./record";
import {
  amendBudget,
  budgetPriorities,
  proposedBudget,
  putBudget,
  registerBudgetVote,
  type BudgetRow,
  type GovernmentRow,
} from "./budgets";
import { partySide } from "../appointments";
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
    | "blocked";
  readonly deals: readonly {
    readonly memberId: string;
    readonly kind: string;
    readonly terms: string;
    readonly date: string;
  }[];
}

/** One member's reasons on one bill. */
export interface MemberPosition {
  readonly memberId: string;
  readonly views: number;
  readonly constituents: number;
  readonly sponsor: number;
  readonly deal: number;
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
    },
  },
  onCalendarWork: legislatureCalendar,
};

function table(api: CoreAPI, name: string) {
  return api.moduleState(LEGISLATURE_MODULE_ID).table(name);
}

export function openLegislature(core: CoreState): void {
  if (!core.modules.has(LEGISLATURE_MODULE_ID))
    registerModule(core, LEGISLATURE_MODULE);
  registerBudgetVote(councilBudget);
}

/**
 * The council votes the town's budget at its fiscal year's start: the
 * executive's proposal (this year's lines with their priorities applied).
 * Each member weighs the proposal's changes by their own views, and their
 * duty to keep the government funded (a budget must be adopted); a budget
 * the council rejects is carried forward as last year's, as most charters
 * provide. Only the town's own government votes here; other levels' budgets
 * stay on the budget rule until their legislatures vote them.
 */
function councilBudget(
  api: CoreAPI,
  gov: GovernmentRow,
  fy: number,
): BudgetRow | null {
  if (gov.level !== "city") return null;
  const council = (
    api.moduleState(OFFICES_MODULE_ID).table("offices").rows() as unknown as {
      id: string;
      kind: string;
      level: string;
    }[]
  ).find((o) => o.kind === "council" && o.level === "city");
  if (!council || !members(api, council.id).length) return null;
  const priorities = budgetPriorities(api, gov.id);
  const provisions: Provision[] = Object.entries(priorities?.changes ?? {}).map(
    ([line, delta]) => ({
      kind: "budget-line",
      line,
      value: delta,
    }),
  );
  const sponsor = priorities?.setBy ?? memberKey(members(api, council.id)[0]!);
  const bill = draftBill(api, {
    bodyOfficeId: council.id,
    sponsorId: sponsor,
    provisions,
  });
  // Each member's duty to adopt a budget sits beside their views on its changes.
  let yes = 0;
  let no = 0;
  for (const member of members(api, council.id)) {
    const key = memberKey(member);
    const position = memberPosition(api, bill.id, key);
    const total =
      position.total -
      position.sponsor +
      campaignParameter("budgetAdoptionDuty");
    if (total > 0) yes += 1;
    else if (total < 0) no += 1;
    table(api, "votes").put({
      id: `vote:${bill.id}:${key}`,
      billId: bill.id,
      memberId: key,
      vote: total > 0 ? "yes" : total < 0 ? "no" : "abstain",
      position: { ...position, total },
    } as unknown as ModuleRow);
  }
  const adopted = yes > no;
  const proposal = proposedBudget(
    api,
    gov,
    fy,
    `council vote ${yes}-${no}, Ordinance ${bill.number}`,
  );
  const budget: BudgetRow = adopted
    ? proposal
    : {
        ...proposal,
        spendingMinor: (budgetCarry(api, gov, fy) ?? proposal).spendingMinor,
        adoptedBy: `carried forward after the council rejected Ordinance ${bill.number} ${yes}-${no}`,
      };
  putBudget(api, budget);
  table(api, "bills").put({
    ...bill,
    kind: "budget",
    status: adopted ? "enacted" : "failed",
  } as unknown as ModuleRow);
  return budget;
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

type StartingAnswers = Record<
  string,
  { answers: Record<string, { preempts?: boolean; answer?: string }> }
>;
/** Every recorded starting-law policy question, by key. */
export const POLICY_QUESTIONS: StartingAnswers = Object.assign(
  {},
  ...[
    lawAgricultureNaturalResources,
    lawBusinessCommerce,
    lawCivilFamilyCommunity,
    lawEducation,
    lawEnvironmentEnergy,
    lawFiscal,
    lawGovernmentOperations,
    lawHealthHumanServices,
    lawHousingLandUse,
    lawJusticePublicSafety,
    lawLaborCommerce,
    lawLaborWorkforce,
    lawTechnologyPrivacy,
    lawTransportationInfrastructure,
  ].map(
    (file) => (file as unknown as { questions: StartingAnswers }).questions,
  ),
);

const budgetQuestion = (
  provisionQuestions as unknown as {
    budget: { question: string; raiseIs: number };
  }
).budget;
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
  if (provision.kind === "budget-line") {
    const budget = budgetQuestion;
    return provision.value === 0
      ? null
      : {
          question: budget.question,
          position: Math.sign(provision.value) * budget.raiseIs,
        };
  }
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
    const authority = localAuthority(rows, [], chain, api.state.date);
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
  const authority = input.provisions.map((p) =>
    stateBody
      ? ({
          allowed: true,
          warning: "none",
          reason: "within the state's own power",
          source: "",
        } as Authority)
      : authorityFor(api, p),
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
              party,
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
  const bill = table(api, "bills").get(billId) as unknown as BillRow;
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
  const deal =
    bill.deals.filter((d) => d.memberId === memberId).length *
    campaignParameter("dealWeight");
  const c = campaignParameter("constituentWeight");
  return {
    memberId,
    views,
    constituents: c * constituents,
    sponsor,
    deal,
    total: views + c * constituents + sponsor + deal,
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
  const before = memberPosition(api, input.billId, input.memberId);
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
  const next: BillRow = {
    ...bill,
    provisions,
    costEstimate: costOf(api, provisions),
    deals: [
      ...bill.deals,
      {
        memberId: input.memberId,
        kind: input.kind,
        terms,
        date: api.state.date,
      },
    ],
  };
  table(api, "bills").put(next as unknown as ModuleRow);
  const after = memberPosition(api, input.billId, input.memberId);
  return { accepted: after.total > 0 && before.total <= 0, before, after };
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
    const vote =
      position.total > 0 ? "yes" : position.total < 0 ? "no" : "abstain";
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
 * floor), heard on the record; then the committee votes. Sizes and the
 * seniority rule are estimates until each body's rules are read
 * (SG-GOV-committee-structure).
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
      a.startDate.localeCompare(b.startDate) ||
      memberKey(a).localeCompare(memberKey(b)),
  );
  const size = Math.max(
    3,
    Math.round(all.length * campaignParameter("committeeShareOfBody")),
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
        a.startDate.localeCompare(b.startDate) ||
        memberKey(a).localeCompare(memberKey(b)),
    );
  const chair =
    roster.find((t) => partySide(t.party) === majority) ?? roster[0]!;
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
  const bill = table(api, "bills").get(billId) as unknown as BillRow;
  if (bill.status !== "drafted") return bill;
  const tallies: { yes: number; no: number }[] = [];
  for (const chamber of chambersOf(api, bill)) {
    const committee = committeeStage(api, bill, chamber);
    if (committee && !committee.reported) {
      const held: BillRow = { ...bill, status: "failed" };
      table(api, "bills").put(held as unknown as ModuleRow);
      return held;
    }
    const tally = chamberVote(api, bill, chamber);
    tallies.push(tally);
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
 * override needs two thirds of those voting in every chamber (the common
 * rule; estimated: SG-GOV-veto-override-rule).
 */
function executiveAction(
  api: CoreAPI,
  bill: BillRow,
  tallies: readonly { yes: number; no: number }[],
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
  if (executive) {
    const key = memberKey(executive);
    const position = memberPosition(api, bill.id, key);
    if (position.total < 0) {
      // stopgapId: SG-GOV-veto-override-rule
      api.stopgap("SG-GOV-veto-override-rule");
      status = tallies.every((t) => t.yes * 3 >= (t.yes + t.no) * 2)
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

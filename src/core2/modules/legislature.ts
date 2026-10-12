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
import { enactLaw, lawChain, lawInForce, LAWS_MODULE_ID } from "./laws";
import { localAuthority } from "../laws-in-force";
import type { LawRowInput } from "../laws-starting";
import { OFFICES_MODULE_ID, townSeats, type TermRow } from "./offices";
import { recordVote } from "./record";

export const LEGISLATURE_MODULE_ID = "core2-legislature-v1";

export interface Provision {
  /** A law-in-force series the bill changes, or a policy question it answers. */
  readonly kind: "law-amount" | "policy-question";
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
}

type StartingAnswers = Record<
  string,
  { answers: Record<string, { preempts?: boolean; answer?: string }> }
>;
/** Every recorded starting-law policy question, by key. */
const POLICY_QUESTIONS: StartingAnswers = Object.assign(
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

const seriesQuestion = (
  provisionQuestions as unknown as {
    series: Record<string, { question: string; raiseIs: number }>;
  }
).series;

/** The policy question a provision speaks to, and which way the provision points on it. */
export function provisionStance(
  api: CoreAPI,
  provision: Provision,
): { question: string; position: number } | null {
  if (provision.kind === "policy-question" && provision.question)
    return {
      question: provision.question,
      position: provision.value > 0 ? 1 : -1,
    };
  const map = provision.series ? seriesQuestion[provision.series] : undefined;
  if (!map || !provision.series) return null;
  const current = currentAmount(api, provision.series);
  const direction = current === null ? 1 : Math.sign(provision.value - current);
  return direction === 0
    ? null
    : { question: map.question, position: direction * map.raiseIs };
}

/** The amount in force today at the town's own level for a series, or the governing amount. */
export function currentAmount(api: CoreAPI, series: string): number | null {
  const answer = lawInForce(api, series);
  const city =
    answer.levels.find((l) => l.level === "city")?.row?.value ?? null;
  return series === "minimum-wage" ? answer.value : (city ?? 0);
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
  const authority = input.provisions.map((p) => authorityFor(api, p));
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

function members(api: CoreAPI, officeId: string): readonly TermRow[] {
  return townSeats(api)
    .filter((s) => s.office.id === officeId && s.holder?.personId)
    .map((s) => s.holder!);
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
  const member = api.state.people.get(memberId)!;
  const lean = personLean(api.state.people, member, townLean(api));
  let views = 0;
  let constituents = 0;
  for (const provision of bill.provisions) {
    const stance = provisionStance(api, provision);
    if (!stance) continue;
    views += personStance(lean, stance.question) * stance.position;
    constituents +=
      personStance(townLean(api), stance.question) * stance.position;
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

/**
 * The body votes: each member yes for a positive position, no for a
 * negative one, abstaining with nothing either way; a majority of those
 * voting passes it. Every vote is on the record.
 */
export function holdVote(api: CoreAPI, billId: string): BillRow {
  const bill = table(api, "bills").get(billId) as unknown as BillRow;
  if (bill.status !== "drafted") return bill;
  let yes = 0;
  let no = 0;
  for (const member of members(api, bill.bodyOfficeId)) {
    const position = memberPosition(api, billId, member.personId!);
    const vote =
      position.total > 0 ? "yes" : position.total < 0 ? "no" : "abstain";
    if (vote === "yes") yes += 1;
    if (vote === "no") no += 1;
    table(api, "votes").put({
      id: `vote:${billId}:${member.personId}`,
      billId,
      memberId: member.personId,
      vote,
      position,
    } as unknown as ModuleRow);
    for (const provision of bill.provisions) {
      const stance = provisionStance(api, provision);
      if (stance && vote !== "abstain")
        recordVote(api, {
          personId: member.personId!,
          body: bill.bodyOfficeId,
          measureId: bill.number,
          stance: {
            question: stance.question,
            position: vote === "yes" ? stance.position : -stance.position,
          },
          passed: null,
        });
    }
  }
  const passed = yes > no;
  const next: BillRow = { ...bill, status: passed ? "passed" : "failed" };
  table(api, "bills").put(next as unknown as ModuleRow);
  api.emit({
    id: `bill-vote:${billId}`,
    date: api.state.date,
    kind: "council-vote",
    personIds: members(api, bill.bodyOfficeId).map((m) => m.personId!),
    placeId: lawChain(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `Vote on ${bill.number}`,
      asOf: api.state.date,
    },
    publicRecord: true,
    news: true,
    facts: {
      billId,
      number: bill.number,
      yes: String(yes),
      no: String(no),
      passed: String(passed),
    },
  });
  return passed ? executiveAction(api, next, yes, no) : next;
}

/**
 * The executive's turn: a directly elected mayor (or other chief executive
 * with a veto) signs or vetoes from their own position; where the form of
 * government gives no veto, a passed bill is law. An override needs two
 * thirds of the members (the common rule; estimated: SG-GOV-veto-override-rule).
 */
function executiveAction(
  api: CoreAPI,
  bill: BillRow,
  yes: number,
  no: number,
): BillRow {
  const executive = townSeats(api).find(
    (s) =>
      s.office.jurisdiction ===
        townSeats(api).find((t) => t.office.id === bill.bodyOfficeId)?.office
          .jurisdiction &&
      /mayor|executive/.test(s.office.kind) &&
      s.office.elected,
  );
  let status: BillRow["status"] = "enacted";
  if (executive?.holder?.personId) {
    const position = memberPosition(api, bill.id, executive.holder.personId);
    if (position.total < 0) {
      // stopgapId: SG-GOV-veto-override-rule
      api.stopgap("SG-GOV-veto-override-rule");
      status = yes * 3 >= (yes + no) * 2 ? "overridden" : "vetoed";
    } else status = "signed";
    table(api, "votes").put({
      id: `vote:${bill.id}:${executive.holder.personId}`,
      billId: bill.id,
      memberId: executive.holder.personId,
      vote: status === "signed" ? "sign" : "veto",
      position,
    } as unknown as ModuleRow);
  }
  const next: BillRow = { ...bill, status };
  table(api, "bills").put(next as unknown as ModuleRow);
  if (status === "vetoed") return next;
  return enact(api, next);
}

/** Put each provision into law on its effective date (thirty days after enactment by default). */
function enact(api: CoreAPI, bill: BillRow): BillRow {
  const chain = lawChain(api);
  const city = chain.levels[chain.levels.length - 1]!.jurisdiction;
  const defaultDate = new Date(
    Date.parse(`${api.state.date}T00:00:00Z`) +
      campaignParameter("ordinanceEffectiveDays") * 86_400_000,
  )
    .toISOString()
    .slice(0, 10);
  for (const provision of bill.provisions) {
    const effectiveDate = provision.effectiveDate ?? defaultDate;
    if (provision.kind === "law-amount" && provision.series)
      enactLaw(api, {
        jurisdiction: city,
        level: "city",
        series: provision.series,
        value: provision.value,
        unit:
          provision.unit ??
          (provision.series === "minimum-wage" ? "minor/hour" : "percent"),
        effectiveDate,
        measureId: bill.number,
        citation: `Ordinance ${bill.number}`,
      });
    if (provision.kind === "policy-question" && provision.question)
      enactLaw(api, {
        jurisdiction: city,
        level: "city",
        series: provision.question,
        value: provision.value > 0 ? 1 : 0,
        effectiveDate,
        measureId: bill.number,
        citation: `Ordinance ${bill.number}`,
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

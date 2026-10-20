/**
 * Recalls (M3-10): voters removing a local official before the term ends,
 * only where the state's law gives its places a recall (the lifted municipal
 * recall rules: doctrine, signature threshold and circulation window).
 *
 * A cause starts one, never a chance: when a town or county ordinance takes
 * effect, each resident weighs how the members voted against their own view
 * of it. The most aggrieved resident starts a petition against a member when
 * their grievance, sense of duty and readiness for a fight outweigh the effort. Neighbors sign
 * for their own reasons (they oppose how that member voted); the town's
 * counted residents sign by the same rule, each record counting as many
 * voters as its household stands for. With enough signatures by the window's
 * end a recall vote is held; each voter, named or counted, decides by the same
 * grievance, and a majority to remove ends the member's term, the seat then
 * filling by its vacancy rule.
 */
import { coreAPI, registerModule } from "../state";
import { closenessBetween } from "../closeness";
import { decisionLean } from "../trait-decisions";
import { parameter } from "../parameters";
import type {
  CoreAPI,
  CoreEventInput,
  CoreModule,
  CoreState,
  PersonState,
} from "../types";
import type { ModuleCalendarWork } from "../module-calendar";
import type { ModuleRow } from "../module-data";
import {
  campaignParameter,
  personLean,
  publicSupport,
} from "../campaign-views";
import { lawChain, LAWS_MODULE_ID } from "./laws";
import type { LawRowInput } from "../laws-starting";
import { LEGISLATURE_MODULE_ID, votesOn, type BillRow } from "./legislature";
import { OFFICES_MODULE_ID, vacateSeat, type TermRow } from "./offices";
import { VOTING_MODULE_ID, turnoutOn, type ResultRow } from "./voting";
import { ELECTIONS_MODULE_ID, type ContestRow } from "./elections";
import { countedResidents } from "../electorate";
import { citizenShareOf } from "../electorate-places";
import { electorateChange } from "../electorate-inputs";
import recallBarData from "../data/campaigns/recall-bars.json" with { type: "json" };
import { resolveMunicipalRecallRule } from "../gov-rules/municipal-ballot-rules";
import type { PetitionSignatureBase } from "../gov-rules/municipal-election-rules";
import { resolveRequiredSignatures } from "../gov-rules/municipal-election-rules";

const daysBetween = (from: string, to: string) =>
  (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
  86_400_000;

export const RECALLS_MODULE_ID = "core2-recalls-v1";

export interface RecallRow {
  readonly id: string;
  readonly termId: string;
  readonly seatId: string;
  readonly memberId: string;
  readonly organizerId: string;
  readonly lawId: string;
  readonly question: string;
  readonly started: string;
  readonly due: string;
  readonly required: number;
  /** The base the required signatures are a percentage of, and where it was read or sized from. */
  readonly base: SignatureBase;
  readonly signatures: number;
  readonly namedSigners: readonly string[];
  readonly status: "circulating" | "failed" | "on-ballot" | "kept" | "removed";
  readonly vote: { readonly remove: number; readonly keep: number } | null;
}

export const RECALLS_MODULE: CoreModule = {
  id: RECALLS_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      recalls: { indexes: { byTerm: { fields: ["termId"] } } },
    },
  },
  eventKinds: ["law-took-effect"],
  onEvent: (api, event) => weighOrdinance(api, event),
  onCalendarWork: (api, work) => recallWork(api, work),
};

export function openRecalls(core: CoreState): void {
  if (!core.modules.has(RECALLS_MODULE_ID))
    registerModule(core, RECALLS_MODULE);
}

const table = (api: CoreAPI) =>
  api.moduleState(RECALLS_MODULE_ID).table("recalls");

const ageOn = (p: Readonly<Pick<PersonState, "birthDate">>, date: string) =>
  Number(date.slice(0, 4)) -
  Number(p.birthDate.slice(0, 4)) -
  (date.slice(5) < p.birthDate.slice(5) ? 1 : 0);

const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);

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

function adults(api: CoreAPI): readonly Readonly<PersonState>[] {
  const town = lawChain(api).townPlaceId;
  return [...api.state.people.values()]
    .filter(
      (p) => p.alive && p.placeId === town && ageOn(p, api.state.date) >= 18,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** A voter of the town the recall weighs: a named adult, or a counted resident standing for their household's weight. */
interface TownVoter {
  readonly id: string;
  readonly traits: PersonState["traits"];
  readonly placeId: string;
  readonly weight: number;
  readonly counted: boolean;
}

/** Every adult of the town on the one rule: the named, and the counted groups' members. */
function townVoters(api: CoreAPI): readonly TownVoter[] {
  const town = lawChain(api).townPlaceId,
    date = api.state.date;
  return [
    ...adults(api).map((p) => ({
      id: p.id,
      traits: p.traits,
      placeId: p.placeId,
      weight: 1,
      counted: false,
    })),
    ...countedResidents(api.state as CoreState)
      .filter((c) => c.placeId === town && ageOn(c, date) >= 18)
      .map((c) => ({
        id: c.id,
        traits: c.traits,
        placeId: c.placeId,
        weight: c.weight,
        counted: true,
      })),
  ];
}

/** How aggrieved a resident is by a member's vote: their view of the law against the member's side of it. */
function grievance(
  api: CoreAPI,
  person: Readonly<Pick<PersonState, "id" | "traits">>,
  question: string,
  enacted: number,
  memberVote: number,
): number {
  const stance = publicSupport(
    personLean(api.state.people, person, townLean(api)),
    question,
  );
  return -stance * enacted * memberVote;
}

function termOf(api: CoreAPI, memberId: string): TermRow | undefined {
  const terms = api.moduleState(OFFICES_MODULE_ID).table("terms");
  if (memberId.startsWith("official:"))
    return terms.get(memberId.slice("official:".length)) as unknown as
      TermRow | undefined;
  return (terms.rows() as unknown as TermRow[]).find(
    (t) => t.personId === memberId && t.status === "serving",
  );
}

function stateUsps(api: CoreAPI): string {
  return lawChain(api).stateKey.slice(3);
}

interface RecallBarRow {
  readonly openingDays: number;
  readonly longTermOpeningDays?: number;
  readonly longTermAboveYears?: number;
  readonly closingDays?: number;
  readonly longTermClosingDays?: number;
}

/**
 * The state's bars on when a petition may be filed against a member whose
 * term is `termYears` long: days into the term before one may be, and days
 * before its end after which none may be. Null where the state's statute is
 * not read (SG-GOV-recall-bars-national): the national estimate stands.
 */
export function recallBarsFor(
  stateUsps: string,
  termYears: number | undefined,
): { openingDays: number; closingDays: number } | null {
  const row = (recallBarData.states as Record<string, RecallBarRow>)[stateUsps];
  if (!row) return null;
  const long =
    termYears !== undefined &&
    row.longTermAboveYears !== undefined &&
    termYears > row.longTermAboveYears;
  return {
    openingDays: long
      ? (row.longTermOpeningDays ?? row.openingDays)
      : row.openingDays,
    closingDays: long
      ? (row.longTermClosingDays ?? row.closingDays ?? 0)
      : (row.closingDays ?? 0),
  };
}

/** The signature base a petition's percentage applies to, as a whole count of voters, and where it came from. */
export interface SignatureBase {
  readonly kind: PetitionSignatureBase;
  readonly count: number;
  /** "recorded" where a record in the world holds it; "estimated" where it is sized from the real averages. */
  readonly basis: "recorded" | "estimated";
  /** The result record a recorded count was read from. */
  readonly recordId?: string;
}

/**
 * The eligible voters of the town as a whole count: the named and counted
 * adults, each counted record for as many voters as its household stands for,
 * less non-citizens and those barred. Fitted household weights are fractions,
 * so the sum is rounded to a whole number of voters before any rule sees it.
 */
function eligibleVoters(api: CoreAPI, voters: readonly TownVoter[]): number {
  const placeKey = api.state.placeMetadata.placeKey as string | undefined;
  const eligibleShare =
    citizenShareOf(placeKey, stateUsps(api)) *
    (1 - electorateChange(api).barred);
  return Math.round(voters.reduce((n, p) => n + p.weight, 0) * eligibleShare);
}

/** Votes cast at the world's recorded elections: each result's totals, with the contest it was for. */
function recordedCounts(
  api: CoreAPI,
): { result: ResultRow; contest: ContestRow; votes: number }[] {
  if (!api.state.modules.has(VOTING_MODULE_ID)) return [];
  const contests = api.moduleState(ELECTIONS_MODULE_ID).table("contests");
  return (
    api
      .moduleState(VOTING_MODULE_ID)
      .table("results")
      .rows() as unknown as ResultRow[]
  ).flatMap((result) => {
    const contest = contests.get(result.contestId) as unknown as
      ContestRow | undefined;
    const votes = Object.values(result.totals).reduce((n, v) => n + v, 0);
    return contest && votes > 0 ? [{ result, contest, votes }] : [];
  });
}

/**
 * What a state's rule says a petition's percentage is a percentage of, read
 * from the world's own records: votes cast for the office at its last
 * election, or at the town's last election of that level. Where the world
 * holds no such record (it keeps no voter rolls, and a statewide race's
 * votes are not kept by town), the base is sized from the real averages.
 */
export function signatureBase(
  api: CoreAPI,
  kind: PetitionSignatureBase,
  term: Readonly<Pick<TermRow, "officeId">>,
  voters: readonly TownVoter[],
): SignatureBase {
  const records = recordedCounts(api).sort(
    (a, b) =>
      b.result.date.localeCompare(a.result.date) ||
      a.result.id.localeCompare(b.result.id),
  );
  if (kind === "votes-cast-for-office") {
    const last = records.find((r) => r.contest.officeId === term.officeId);
    if (last)
      return {
        kind,
        count: Math.round(last.votes),
        basis: "recorded",
        recordId: last.result.id,
      };
  }
  if (kind === "votes-cast-last-election") {
    const office = api
      .moduleState(OFFICES_MODULE_ID)
      .table("offices")
      .get(term.officeId) as unknown as { level?: string } | undefined;
    const sameLevel = records.filter((r) => r.contest.level === office?.level);
    const date = sameLevel[0]?.result.date;
    // The election's votes: the most cast in any one of its contests that day.
    const top = sameLevel
      .filter((r) => r.result.date === date)
      .sort((a, b) => b.votes - a.votes)[0];
    if (top)
      return {
        kind,
        count: Math.round(top.votes),
        basis: "recorded",
        recordId: top.result.id,
      };
  }
  // stopgapId: SG-GOV-recall-signature-groups (registered voters, and votes with no record yet, are sized from the real averages)
  api.stopgap("SG-GOV-recall-signature-groups");
  const population = Number(api.state.placeMetadata.referencePopulation);
  const count =
    kind === "registered-voters"
      ? Math.round(
          eligibleVoters(api, voters) *
            campaignParameter("registeredShareOfEligible"),
        )
      : population > 0
        ? Math.round(
            population *
              campaignParameter("localElectorateShareOfPopulation") *
              (kind === "last-gubernatorial-vote"
                ? campaignParameter("midtermShareOfPresidential")
                : 1),
          )
        : eligibleVoters(api, voters);
  return { kind, count, basis: "estimated" };
}
/**
 * The town's recall rule, where its state gives places one: the read
 * threshold, or the read rules' median where recall exists but its
 * threshold isn't read (an estimate).
 */
export function recallRule(api: CoreAPI) {
  const rule = resolveMunicipalRecallRule(stateUsps(api));
  if (!rule.circulationDays) return null;
  return {
    ...rule,
    circulationDays: rule.circulationDays,
    threshold: rule.threshold ?? {
      percent: campaignParameter("recallThresholdEstimate"),
      base: "votes-cast-for-office" as const,
    },
  };
}

function weighOrdinance(api: CoreAPI, event: Readonly<CoreEventInput>): void {
  const facts = event.facts ?? {};
  if (facts.level !== "city" && facts.level !== "county") return;
  const row = api
    .moduleState(LAWS_MODULE_ID)
    .table("laws")
    .get(facts.lawId ?? "") as unknown as LawRowInput | undefined;
  const billId = row?.terms?.enactedByBill;
  if (!row || typeof billId !== "string") return;
  const rule = recallRule(api);
  if (!rule) return;
  const bill = api
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("bills")
    .get(billId) as unknown as BillRow | undefined;
  if (!bill) return;
  const enacted = row.value === 1 ? 1 : -1;
  // Where the state's law lets a place recall only for cause (misconduct, a
  // crime in office), a vote on an ordinance is no ground for one.
  if (rule.groundsRequired === true) return;
  const people = adults(api);
  // The members open to a recall: serving, past the term's opening months,
  // with no petition against them now and none that failed this term.
  const seen = new Set<string>();
  const targets = votesOn(api, bill.id).flatMap((vote) => {
    const side = vote.vote === "yes" ? 1 : vote.vote === "no" ? -1 : 0;
    const term = side ? termOf(api, vote.memberId) : undefined;
    // A member's committee and floor votes are one member to hold to account.
    if (!term || term.status !== "serving" || seen.has(term.id)) return [];
    seen.add(term.id);
    // stopgapId: SG-GOV-recall-bars-national (states with no row in recall-bars.json take one national bar)
    if (!recallBarsFor(stateUsps(api), undefined))
      api.stopgap("SG-GOV-recall-bars-national");
    // The term began one term's length before it ends (a term held at the
    // opening records the opening as its start).
    const years = (
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("offices")
        .get(term.officeId) as unknown as { termYears?: number } | undefined
    )?.termYears;
    const since =
      term.endDate && years
        ? `${Number(term.endDate.slice(0, 4)) - years}${term.endDate.slice(4)}`
        : term.startDate;
    const bars = recallBarsFor(stateUsps(api), years) ?? {
      openingDays: campaignParameter("recallTermOpeningDays"),
      closingDays: 0,
    };
    if (daysBetween(since, api.state.date) < bars.openingDays) return [];
    // Some statutes also bar a petition in the last months of the term.
    if (
      bars.closingDays &&
      term.endDate &&
      daysBetween(api.state.date, term.endDate) <= bars.closingDays
    )
      return [];
    const prior = table(api).query("byTerm", [
      term.id,
    ]) as unknown as RecallRow[];
    if (
      prior.some(
        (r) =>
          r.status === "circulating" ||
          r.status === "on-ballot" ||
          r.status === "failed" ||
          r.status === "kept",
      )
    )
      return [];
    return [{ vote, side, term }];
  });
  // Each resident moved enough to organize brings one petition, against the
  // member they hold most to account: the bill's sponsor, else the one they
  // are least close to. Another member needs another organizer.
  const organizers = people
    .map((p) => {
      const duty =
        parameter("traitDecisionWeight") *
        decisionLean(api.state, p, "recalls.organize", "organize", "leave-it");
      return { p, duty };
    })
    .sort((a, b) => a.p.id.localeCompare(b.p.id));
  const used = new Set<string>();
  const open = [...targets];
  while (open.length) {
    let best: {
      p: Readonly<PersonState>;
      drive: number;
      target: (typeof open)[number];
    } | null = null;
    for (const o of organizers) {
      if (used.has(o.p.id)) continue;
      for (const t of open) {
        if (o.p.id === t.term.personId) continue;
        const drive = grievance(api, o.p, row.series, enacted, t.side) + o.duty;
        if (drive <= campaignParameter("recallOrganizerEffort")) continue;
        const account =
          (t.vote.memberId === bill.sponsorId ? 1 : 0) -
          closenessBetween(api.state as CoreState, o.p.id, t.vote.memberId);
        const bestAccount = best
          ? (best.target.vote.memberId === bill.sponsorId ? 1 : 0) -
            closenessBetween(
              api.state as CoreState,
              best.p.id,
              best.target.vote.memberId,
            )
          : -Infinity;
        if (
          !best ||
          drive > best.drive ||
          (drive === best.drive && account > bestAccount)
        )
          best = { p: o.p, drive, target: t };
      }
    }
    if (!best) break;
    used.add(best.p.id);
    open.splice(open.indexOf(best.target), 1);
    startRecall(api, {
      organizer: best.p,
      term: best.target.term,
      memberId: best.target.vote.memberId,
      side: best.target.side,
      row,
      enacted,
      rule,
    });
  }
}

function startRecall(
  api: CoreAPI,
  input: {
    readonly organizer: Readonly<PersonState>;
    readonly term: TermRow;
    readonly memberId: string;
    readonly side: number;
    readonly row: LawRowInput;
    readonly enacted: number;
    readonly rule: NonNullable<ReturnType<typeof recallRule>>;
  },
): void {
  const { organizer, term, row, enacted, side, rule } = input;
  // Neighbors sign for their own reasons: they oppose how the member voted.
  // The counted residents sign by the same rule, each record for as many
  // voters as its household stands for.
  const voters = townVoters(api);
  const signers = voters.filter(
    (p) =>
      p.id !== term.personId &&
      grievance(api, p, row.series, enacted, side) +
        parameter("traitDecisionWeight") *
          decisionLean(api.state, p, "recalls.sign", "sign", "pass") >
        0,
  );
  // The petition's base is the one the state's rule names, a whole count of
  // voters (household weights are fitted fractions; see `eligibleVoters`).
  const base = signatureBase(api, rule.threshold.base, term, voters);
  const signatures = Math.round(signers.reduce((n, p) => n + p.weight, 0));
  const recall: RecallRow = {
    id: `recall:${term.id}:${api.state.date}`,
    termId: term.id,
    seatId: term.seatId,
    memberId: input.memberId,
    organizerId: organizer.id,
    lawId: row.id,
    question: row.series,
    started: api.state.date,
    due: addDays(api.state.date, rule.circulationDays),
    required: resolveRequiredSignatures(rule.threshold, base.count),
    base,
    signatures,
    namedSigners: signers.filter((p) => !p.counted).map((p) => p.id),
    status: "circulating",
    vote: null,
  };
  table(api).put(recall as unknown as ModuleRow);
  api.emit({
    id: `recall-petition:${recall.id}`,
    date: api.state.date,
    kind: "recall-petition",
    // The organizer, and the member the petition is against when they are a
    // person: both are reached by it.
    personIds: [
      organizer.id,
      ...(api.state.people.has(input.memberId) ? [input.memberId] : []),
    ],
    placeId: lawChain(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `Recall petition against ${input.memberId}`,
      asOf: api.state.date,
    },
    publicRecord: true,
    news: true,
    facts: {
      recallId: recall.id,
      termId: term.id,
      lawId: row.id,
      memberId: input.memberId,
    },
  });
  api.moduleCalendar(RECALLS_MODULE_ID).schedule({
    key: `petition-due:${recall.id}`,
    date: recall.due,
    kind: "petition-due",
    source: {
      tag: "SOURCED",
      citation: `${stateUsps(api)} municipal recall rule (${rule.doctrineBasis})`,
      asOf: api.state.date,
    },
    sourceRecordIds: [recall.id],
  });
}

function recallWork(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  const recall = table(api).get(work.sourceRecordIds[0]!) as unknown as
    RecallRow | undefined;
  if (!recall) return;
  if (work.kind === "petition-due" && recall.status === "circulating") {
    const enough = recall.signatures >= recall.required;
    table(api).put({
      ...recall,
      status: enough ? "on-ballot" : "failed",
    } as unknown as ModuleRow);
    announce(api, recall, enough ? "on-ballot" : "failed", {
      signatures: String(recall.signatures),
      required: String(recall.required),
    });
    if (enough)
      api.moduleCalendar(RECALLS_MODULE_ID).schedule({
        key: `recall-vote:${recall.id}`,
        date: addDays(api.state.date, campaignParameter("recallElectionDays")),
        kind: "recall-vote",
        source: {
          tag: "ESTIMATED",
          citation: "recall election after certification",
          asOf: api.state.date,
          estimatedFrom: "recallElectionDays",
        },
        sourceRecordIds: [recall.id],
      });
    return;
  }
  if (work.kind !== "recall-vote" || recall.status !== "on-ballot") return;
  const law = api
    .moduleState(LAWS_MODULE_ID)
    .table("laws")
    .get(recall.lawId) as unknown as LawRowInput | undefined;
  const enacted = law?.value === 1 ? 1 : -1;
  // The member's own vote on the law, from the record.
  const side =
    (
      votesOn(api, billIdFor(law)) as unknown as {
        memberId: string;
        vote: string;
      }[]
    ).find((v) => v.memberId === recall.memberId)?.vote === "no"
      ? -1
      : 1;
  let remove = 0;
  let keep = 0;
  for (const p of townVoters(api)) {
    const g =
      grievance(api, p, recall.question, enacted, side) +
      parameter("traitDecisionWeight") *
        decisionLean(api.state, p, "recalls.vote", "remove", "keep");
    const t = turnoutOn(api, p, { remove: { total: g }, keep: { total: -g } });
    // A named voter goes or stays home; a counted one votes at their propensity.
    const votes = p.counted ? t.propensity * p.weight : t.votes ? 1 : 0;
    if (g > 0) remove += votes;
    if (g < 0) keep += votes;
  }
  const result = {
    remove: Math.round(remove),
    keep: Math.round(keep),
  };
  const removed = result.remove > result.keep;
  table(api).put({
    ...recall,
    status: removed ? "removed" : "kept",
    vote: result,
  } as unknown as ModuleRow);
  announce(api, recall, removed ? "removed" : "kept", {
    remove: String(result.remove),
    keep: String(result.keep),
  });
  if (removed) vacateSeat(api, recall.seatId, "recalled");
}

/** A recall step's outcome as a public record the press and the director read, by the recall's id. */
function announce(
  api: CoreAPI,
  recall: RecallRow,
  outcome: "failed" | "on-ballot" | "removed" | "kept",
  counts: Readonly<Record<string, string>>,
): void {
  api.emit({
    id: `recall-outcome:${recall.id}:${outcome}`,
    date: api.state.date,
    kind: "recall-outcome",
    personIds: [recall.organizerId],
    placeId: lawChain(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `Recall of ${recall.memberId}: ${outcome}`,
      asOf: api.state.date,
    },
    publicRecord: true,
    news: true,
    facts: {
      recallId: recall.id,
      termId: recall.termId,
      memberId: recall.memberId,
      outcome,
      ...counts,
    },
  });
}

function billIdFor(law: LawRowInput | undefined): string {
  const billId = law?.terms?.enactedByBill;
  return typeof billId === "string" ? billId : "";
}

export function recallsOf(api: CoreAPI): readonly RecallRow[] {
  return table(api).rows() as unknown as RecallRow[];
}

export { coreAPI };

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
 * unnamed voters sign in the named people's proportion. With enough
 * signatures by the window's end a recall vote is held; each voter decides by
 * the same grievance, and a majority to remove ends the member's term, the
 * seat then filling by its vacancy rule.
 */
import { coreAPI, registerModule } from "../state";
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
import { turnout } from "./voting";
import { resolveMunicipalRecallRule } from "../gov-rules/municipal-ballot-rules";
import { resolveRequiredSignatures } from "../gov-rules/municipal-election-rules";

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

const ageOn = (p: Readonly<PersonState>, date: string) =>
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

/** How aggrieved a resident is by a member's vote: their view of the law against the member's side of it. */
function grievance(
  api: CoreAPI,
  person: Readonly<PersonState>,
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

function townElectorate(api: CoreAPI, named: number): number {
  const population = Number(api.state.placeMetadata.referencePopulation);
  return Number.isFinite(population) && population > 0
    ? Math.round(
        population * campaignParameter("localElectorateShareOfPopulation"),
      )
    : named;
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
  const measure = row?.terms?.enactedBy;
  if (!row || typeof measure !== "string") return;
  const rule = recallRule(api);
  if (!rule) return;
  const bill = (
    api
      .moduleState(LEGISLATURE_MODULE_ID)
      .table("bills")
      .rows() as unknown as BillRow[]
  ).find(
    (b) =>
      b.number === measure &&
      b.provisions.some(
        (p) => p.question === row.series || p.series === row.series,
      ),
  );
  if (!bill) return;
  const enacted = row.value === 1 ? 1 : -1;
  const people = adults(api);
  for (const vote of votesOn(api, bill.id)) {
    const side = vote.vote === "yes" ? 1 : vote.vote === "no" ? -1 : 0;
    if (!side) continue;
    const term = termOf(api, vote.memberId);
    if (!term || term.status !== "serving") continue;
    if (
      (table(api).query("byTerm", [term.id]) as unknown as RecallRow[]).some(
        (r) => r.status === "circulating" || r.status === "on-ballot",
      )
    )
      continue;
    // The organizer: the resident most moved to act, if anyone is moved
    // enough to take on a petition drive.
    const organizer = people
      .filter((p) => p.id !== term.personId)
      .map((p) => {
        const g = grievance(api, p, row.series, enacted, side);
        const duty =
          (p.traits["personality-v1:facet-duty-bound"] ?? 0) +
          (p.traits["people-mind-v1:conflict"] ?? 0);
        return { p, drive: g + duty / 2 };
      })
      .filter((x) => x.drive > campaignParameter("recallOrganizerEffort"))
      .sort((a, b) => b.drive - a.drive || a.p.id.localeCompare(b.p.id))[0];
    if (!organizer) continue;
    const signers = people.filter(
      (p) =>
        p.id !== term.personId &&
        grievance(api, p, row.series, enacted, side) > 0,
    );
    const electorate = townElectorate(api, people.length);
    // stopgapId: SG-GOV-recall-signature-groups
    api.stopgap("SG-GOV-recall-signature-groups");
    const signatures = Math.round(
      (electorate * signers.length) / Math.max(1, people.length),
    );
    const recall: RecallRow = {
      id: `recall:${term.id}:${api.state.date}`,
      termId: term.id,
      seatId: term.seatId,
      memberId: vote.memberId,
      organizerId: organizer.p.id,
      lawId: row.id,
      question: row.series,
      started: api.state.date,
      due: addDays(api.state.date, rule.circulationDays),
      required: resolveRequiredSignatures(rule.threshold, electorate),
      signatures,
      namedSigners: signers.map((p) => p.id),
      status: "circulating",
      vote: null,
    };
    table(api).put(recall as unknown as ModuleRow);
    api.emit({
      id: `recall-petition:${recall.id}`,
      date: api.state.date,
      kind: "recall-petition",
      personIds: [organizer.p.id],
      placeId: lawChain(api).townPlaceId,
      source: {
        tag: "SOURCED",
        citation: `Recall petition against ${vote.memberId}`,
        asOf: api.state.date,
      },
      publicRecord: true,
      news: true,
      facts: { recallId: recall.id, termId: term.id, lawId: row.id },
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
      votesOn(api, billIdFor(api, law)) as unknown as {
        memberId: string;
        vote: string;
      }[]
    ).find((v) => v.memberId === recall.memberId)?.vote === "no"
      ? -1
      : 1;
  const people = adults(api);
  let remove = 0;
  let keep = 0;
  for (const p of people) {
    const g = grievance(api, p, recall.question, enacted, side);
    const t = turnout(api, p, { remove: { total: g }, keep: { total: -g } });
    if (!t.votes) continue;
    if (g > 0) remove += 1;
    if (g < 0) keep += 1;
  }
  const scale = townElectorate(api, people.length) / Math.max(1, people.length);
  const result = {
    remove: Math.round(remove * scale),
    keep: Math.round(keep * scale),
  };
  const removed = result.remove > result.keep;
  table(api).put({
    ...recall,
    status: removed ? "removed" : "kept",
    vote: result,
  } as unknown as ModuleRow);
  if (removed) vacateSeat(api, recall.seatId, "recalled");
}

function billIdFor(api: CoreAPI, law: LawRowInput | undefined): string {
  const measure = law?.terms?.enactedBy;
  return (
    (
      api
        .moduleState(LEGISLATURE_MODULE_ID)
        .table("bills")
        .rows() as unknown as BillRow[]
    ).find(
      (b) =>
        b.number === measure &&
        b.provisions.some((p) => p.question === law?.series),
    )?.id ?? ""
  );
}

export function recallsOf(api: CoreAPI): readonly RecallRow[] {
  return table(api).rows() as unknown as RecallRow[];
}

export { coreAPI };

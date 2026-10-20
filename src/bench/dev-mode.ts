/**
 * Dev mode (owner, Oct 14, 2026): change any law, make any person or body
 * decide, jump time, trace any record, watch the town by month and run a
 * saved "what if". Every write goes through the core's own calls (`enactLaw`,
 * the chooser's controller hook, `castMemberVote`, `holdVote`,
 * `executiveDecision`, `rerateJob`) and leaves a dev-mode record on the core,
 * so every engine reads it the normal way and a release save can refuse it.
 * Read-only views spend no game time and write nothing. Words come from the
 * English engine; this returns record data and ids only.
 */
import { moneySince, watchMoney } from "../core2/tooling/money-watch";
import { bookkeeping } from "../core2/bookkeeping";
import { journalCheckCounts } from "../core2/journal";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { coreAPI, personOrFillIn } from "../core2/state";
import { advanceCore, availableActs, type Controller } from "../core2/life";
import {
  enactLaw,
  lawChain,
  lawInForce,
  LAWS_MODULE_ID,
} from "../core2/modules/laws";
import { inForceOn, LAW_SERIES } from "../core2/laws-in-force";
import type { LawRowInput } from "../core2/laws-starting";
import { POLICY_QUESTIONS } from "../core2/policy-answers";
import { POLICIES as REACH_A_POLICIES } from "../core2/law-reach/group-a-records";
import { GROUP_B_KEYS } from "../core2/law-reach/group-b";
import { jobsAt } from "../core2/law-reach/group-b-money";
import {
  PUBLIC_EMPLOYER_CLASSES,
  PUBLIC_PAY_FLOOR,
  PUBLIC_PAY_FLOOR_UNIT,
} from "../core2/public-pay-floor";
import {
  castMemberVote,
  executiveDecision,
  holdVote,
  LEGISLATURE_MODULE_ID,
  members,
  memberKey,
} from "../core2/modules/legislature";
import { OFFICES_MODULE_ID } from "../core2/modules/offices";
import { metricsPanel } from "../core2/modules/world-panels";
import { nationalPanel } from "../core2/modules/macro";
import { residentsRuntime } from "../core2/modules/residents";
import { healthReport } from "../core2/modules/health";
import { snapshotExplicitControlV1 } from "../core2/player-control-state-v1";
import type { CoreAPI, CoreState } from "../core2/types";
import type { Director } from "../director/ledger";
import type { BenchPlayer } from "./player";
import { budgetView } from "./budget";
import { newsItems } from "./calendar";
import experiments from "./data/dev-experiments.json" with { type: "json" };

/** The mark every dev-mode write carries. */
export const DEV_MODE = "dev-mode";
/** The core record kind each dev-mode change leaves. */
export const DEV_MODE_RECORD = "dev-mode-change";

export type LawLevel = "federal" | "state" | "county" | "city";

/** One step of a change set: the same controls the page offers. */
export type DevStep = {
  readonly control: "law";
  readonly level: LawLevel;
  readonly series: string;
  readonly value?: number;
  readonly unit?: string;
  readonly repeal?: boolean;
  /** Days after the step is applied; 0 or absent is now. */
  readonly effectiveInDays?: number;
};

export interface Experiment {
  readonly id: string;
  readonly steps: readonly DevStep[];
  readonly runMonths: number;
}

export interface DevMark {
  readonly id: string;
  readonly date: string;
  readonly control: string;
  readonly recordIds: readonly string[];
  readonly facts: Readonly<Record<string, string>>;
}

/** One month of the town as dev mode watched it. */
export interface WatchRow {
  readonly date: string;
  readonly pay: PaySplit;
  readonly marks: readonly string[];
}

interface PaySplit {
  readonly publicJobs: number;
  readonly publicMedianHourlyMinor: number;
  readonly privateJobs: number;
  readonly privateMedianHourlyMinor: number;
}

const DATA = experiments as unknown as {
  experiments: readonly Experiment[];
};

const median = (values: number[]) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
};

const has = (core: CoreState, id: string) => core.modules.has(id);
// A screen length, not a model value.
const BODIES_SHOWN = 30;

/** A person's health case, if the health engine has one for them. */
function healthCase(core: CoreState, personId: string) {
  const report = healthReport(core);
  if (!report.initialized) return null;
  return (
    report.cases.find(
      (row) => (row as { personId?: string }).personId === personId,
    ) ?? null
  );
}

/** Every dev-mode record the world carries: law rows and change records. */
export function devModeMarks(core: CoreState): readonly string[] {
  const out: string[] = [];
  for (const row of core.durableLog.values())
    if (row.kind === DEV_MODE_RECORD) out.push(row.id);
  if (has(core, LAWS_MODULE_ID))
    for (const row of coreAPI(core)
      .moduleState(LAWS_MODULE_ID)
      .table("laws")
      .rows() as unknown as LawRowInput[])
      if (row.terms?.provenance === DEV_MODE) out.push(row.id);
  return out;
}

/** Every law series the law data knows: in force here, or in a catalog. */
export function lawSeriesCatalog(api: CoreAPI): readonly string[] {
  const out = new Set<string>([
    ...Object.keys(LAW_SERIES),
    PUBLIC_PAY_FLOOR,
    ...Object.keys(POLICY_QUESTIONS),
    ...Object.keys(REACH_A_POLICIES),
    ...GROUP_B_KEYS.filter((key) => !key.startsWith("budget-line:")),
  ]);
  for (const row of api
    .moduleState(LAWS_MODULE_ID)
    .table("laws")
    .rows() as unknown as LawRowInput[])
    out.add(row.series);
  return [...out].sort();
}

/** The row a level has in force on a series: an enacted one first, else the latest. */
function levelRow(rows: readonly LawRowInput[], date: string) {
  const live = rows.filter((row) => inForceOn(row, date));
  const latest = (list: LawRowInput[]) =>
    list.sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
  return (
    latest(live.filter((row) => row.terms?.enactedBy !== undefined)) ??
    latest(live.filter((row) => row.tier === "general")) ??
    latest(live)
  );
}

export class DevMode {
  /** People whose next decision dev mode has picked (an act key the core offered). */
  readonly pending = new Map<string, string>();
  readonly watch: WatchRow[] = [];
  private readonly applied: { personId: string; key: string }[] = [];
  private readonly dropped: { personId: string; key: string }[] = [];
  private sequence = 0;

  constructor(
    readonly core: CoreState,
    readonly director: Director | undefined,
    readonly player: BenchPlayer | undefined,
    readonly placeId: string,
  ) {
    this.sequence = devModeMarks(core).length;
    if (core.playerId) watchMoney(core, [core.playerId]);
  }

  /** Start adding up these people's money from today (the player's is watched from the start). */
  watchMoney(personIds: readonly string[]) {
    watchMoney(this.core, personIds);
  }

  /**
   * A watched person's money since the watch opened, by kind: pay, taxes,
   * rent or mortgage, purchases, benefits, each in and out, with the latest
   * entry of each to trace; their cash then and now, their job, and what
   * they did since by act kind.
   */
  money(personId: string) {
    const person = this.core.people.get(personId);
    const job = person?.jobId ? this.core.jobs.get(person.jobId) : undefined;
    return {
      ...moneySince(this.core, personId),
      job: job
        ? {
            id: job.id,
            title: job.title,
            employerId: job.organizationId,
            wageDailyMinor: job.wageDailyMinor,
            hoursDaily: job.hoursDaily,
            endsAt: job.endsAt,
          }
        : null,
    };
  }

  private get api() {
    return coreAPI(this.core);
  }

  private townId() {
    return has(this.core, LAWS_MODULE_ID)
      ? lawChain(this.api).townPlaceId
      : this.placeId;
  }

  /** A dev-mode change record on the core, dated today. */
  private mark(
    control: string,
    recordIds: readonly string[],
    facts: Record<string, string>,
  ): DevMark {
    // Another DevMode on the same core may have marked since this one began.
    this.sequence = Math.max(this.sequence, devModeMarks(this.core).length) + 1;
    const id = `${DEV_MODE}:${this.sequence}:${control}:${this.core.date}`;
    this.api.emit({
      id,
      date: this.core.date,
      kind: DEV_MODE_RECORD,
      personIds: [],
      placeId: this.townId(),
      source: { tag: "SOURCED", citation: DEV_MODE, asOf: this.core.date },
      publicRecord: true,
      facts: {
        ...facts,
        control,
        provenance: DEV_MODE,
        recordIds: recordIds.join(" "),
      },
    });
    return { id, date: this.core.date, control, recordIds, facts };
  }

  /**
   * A line or scene the player marked as a gap while playing: one record that
   * names the scene and the line. It spends no game time and changes nothing
   * else, so words sessions can read the list from the bench.
   */
  markGap(sceneId: string, line: string, text: string): DevMark {
    return this.mark("gap", [sceneId], { sceneId, line, text });
  }

  /** Every gap the player marked, oldest first. */
  gaps(): readonly DevMark[] {
    return this.marks().filter((mark) => mark.control === "gap");
  }

  /** Every dev-mode change so far, oldest first. */
  marks(): readonly DevMark[] {
    return [...this.core.durableLog.values()]
      .filter((row) => row.kind === DEV_MODE_RECORD)
      .map((row) => {
        const facts = (row.facts ?? {}) as Record<string, string>;
        return {
          id: row.id,
          date: row.date,
          control: facts.control ?? "",
          recordIds: (facts.recordIds ?? "").split(" ").filter(Boolean),
          facts,
        };
      });
  }

  /** Whether the cash journal's structural checks ran, and how to turn them on for a disputed result. */
  journalChecks() {
    return { checking: bookkeeping(), ...journalCheckCounts() };
  }

  // 1. Laws ---------------------------------------------------------------

  /** Every series at every level of the place: the row in force, pending rows and the combined value. */
  laws() {
    const api = this.api;
    const chain = lawChain(api);
    const table = api.moduleState(LAWS_MODULE_ID).table("laws");
    const date = this.core.date;
    return {
      date,
      levels: chain.levels,
      series: lawSeriesCatalog(api).map((series) => {
        const answer = LAW_SERIES[series]
          ? lawInForce(api, series, date)
          : undefined;
        return {
          series,
          doctrine: LAW_SERIES[series] ?? null,
          combined: answer?.value ?? null,
          levels: chain.levels.map(({ level, jurisdiction }) => {
            const rows = table.query("bySeries", [
              jurisdiction,
              series,
            ]) as unknown as LawRowInput[];
            const row = levelRow(rows, date);
            return {
              level,
              jurisdiction,
              row: row && {
                id: row.id,
                value: row.value,
                unit: row.unit ?? null,
                effectiveDate: row.effectiveDate,
                estimate: row.estimate,
                devMode: row.terms?.provenance === DEV_MODE,
              },
              pending: rows
                .filter((r) => r.effectiveDate > date)
                .map((r) => ({
                  id: r.id,
                  value: r.value,
                  effectiveDate: r.effectiveDate,
                })),
              // Why the law engine sets this level's law aside, when it does.
              setAside:
                answer?.levels.find((l) => l.jurisdiction === jurisdiction)
                  ?.setAside ?? null,
            };
          }),
        };
      }),
    };
  }

  /** Set a law's value at a level (or repeal it), now or on a date: a real law row. */
  setLaw(input: {
    level: LawLevel;
    series: string;
    value?: number;
    unit?: string;
    repeal?: boolean;
    effectiveDate?: string;
  }) {
    const api = this.api;
    const chain = lawChain(api);
    const level = chain.levels.find((l) => l.level === input.level);
    if (!level) throw new Error(`This place has no ${input.level} level.`);
    if (!lawSeriesCatalog(api).includes(input.series))
      throw new Error(`Unknown law series: ${input.series}`);
    const value = input.repeal ? 0 : Number(input.value);
    if (!Number.isFinite(value)) throw new Error("A law needs a value.");
    const effectiveDate = makeIsoDate(input.effectiveDate ?? this.core.date);
    if (effectiveDate < this.core.date)
      throw new Error("A law can't take effect in the past.");
    const unit =
      input.unit ??
      (
        api
          .moduleState(LAWS_MODULE_ID)
          .table("laws")
          .query("bySeriesOnly", [input.series]) as unknown as LawRowInput[]
      ).find((row) => row.unit)?.unit ??
      (input.series === PUBLIC_PAY_FLOOR ? PUBLIC_PAY_FLOOR_UNIT : undefined);
    const measureId = `${DEV_MODE}-${this.sequence + 1}`;
    const row = enactLaw(api, {
      jurisdiction: level.jurisdiction,
      level: level.level,
      series: input.series,
      value,
      ...(unit ? { unit } : {}),
      effectiveDate,
      measureId,
      citation: DEV_MODE,
      terms: {
        provenance: DEV_MODE,
        ...(input.repeal ? { repeal: true } : {}),
      },
    });
    const mark = this.mark("law", [row.id], {
      series: row.series,
      level: row.level,
      jurisdiction: row.jurisdiction,
      value: String(row.value),
      unit: row.unit ?? "",
      effectiveDate,
    });
    return { mark, law: row, reach: this.reach(row.id) };
  }

  /**
   * Who a law reached: the law-reach and raise records naming it.
   * stopgapId: SG-PLAY-dev-law-reach-full-only
   */
  reach(lawId: string) {
    const people = new Set<string>();
    let records = 0;
    let counted = 0;
    for (const moduleId of [
      LAWS_MODULE_ID,
      "core2-law-reach-a-v1",
      "core2-law-reach-b-v1",
    ]) {
      if (!has(this.core, moduleId)) continue;
      const tables = this.api.moduleState(moduleId).snapshot().tables;
      for (const rows of Object.values(tables))
        for (const row of rows as readonly Readonly<
          Record<string, unknown>
        >[]) {
          if (row.lawId !== lawId) continue;
          records += 1;
          // A record naming someone still in the counts reaches a counted person.
          if (typeof row.personId === "string")
            if (this.core.people.has(row.personId)) people.add(row.personId);
            else counted += 1;
          if (typeof row.counted === "number") counted += row.counted;
        }
    }
    return { lawId, records, fullPeople: people.size, counted };
  }

  // 2. Decisions ----------------------------------------------------------

  /** The choices the core offers a person today (a counted person is filled in). */
  offers(personId: string) {
    const person = personOrFillIn(this.core, personId);
    if (!person) throw new Error("No such person.");
    return {
      personId,
      name: `${person.givenName} ${person.familyName}`,
      pending: this.pending.get(personId) ?? null,
      offers: availableActs(this.core, personId).map((offer) => {
        const target =
          this.core.people.get(offer.targetId) ??
          this.core.organizations.get(offer.targetId);
        return {
          key: `${offer.definition.id}:${offer.targetId}`,
          actionId: offer.definition.id,
          effect: offer.definition.effect,
          need: offer.definition.need,
          targetId: offer.targetId,
          targetName: target
            ? "givenName" in target
              ? `${target.givenName} ${target.familyName}`
              : target.name
            : null,
        };
      }),
    };
  }

  /** Make an offered choice the person's next decision (the core's controller hook). */
  choose(personId: string, key: string) {
    if (!this.offers(personId).offers.some((offer) => offer.key === key))
      throw new Error(
        "The core does not offer that choice to this person today.",
      );
    this.pending.set(personId, key);
    return this.mark("decision-picked", [personId], { personId, key });
  }

  /** The bills before every body, with each member and any vote cast for them. */
  bodies() {
    if (!has(this.core, LEGISLATURE_MODULE_ID)) return [];
    const api = this.api;
    const offices = api.moduleState(OFFICES_MODULE_ID).table("offices");
    const choices = api.moduleState(LEGISLATURE_MODULE_ID).table("choices");
    return (
      (
        api
          .moduleState(LEGISLATURE_MODULE_ID)
          .table("bills")
          .rows() as unknown as {
          id: string;
          number: string;
          bodyOfficeId: string;
          status: string;
          introduced: string;
          provisions: unknown[];
        }[]
      )
        // Open bills first, then the latest decided ones (their votes trace).
        .map((bill) => ({
          bill,
          open: ["drafted", "passed", "awaiting-signature"].includes(
            bill.status,
          ),
        }))
        .sort(
          (a, b) =>
            Number(b.open) - Number(a.open) ||
            b.bill.introduced.localeCompare(a.bill.introduced),
        )
        .slice(0, BODIES_SHOWN)
        .map(({ bill, open }) => ({
          open,
          ...bill,
          office: offices.get(bill.bodyOfficeId) ?? null,
          members: members(api, bill.bodyOfficeId).map((term) => {
            const key = memberKey(term);
            return {
              key,
              personId: term.personId,
              givenName: term.identity.givenName,
              familyName: term.identity.familyName,
              vote:
                (
                  choices.get(`${bill.id}|${key}`) as
                    { vote?: string } | undefined
                )?.vote ?? null,
            };
          }),
        }))
    );
  }

  /** Cast a member's vote on a bill before the vote is held. */
  vote(billId: string, memberId: string, vote: "yes" | "no" | "abstain") {
    castMemberVote(this.api, billId, memberId, vote);
    return this.mark("vote", [billId], { billId, memberId, vote });
  }

  /** The body holds its vote today. */
  holdVote(billId: string) {
    const bill = holdVote(this.api, billId);
    return {
      mark: this.mark("hold-vote", [billId], { billId, status: bill.status }),
      bill,
    };
  }

  /** The executive signs or vetoes a passed bill. */
  sign(billId: string, sign: boolean) {
    const bill = executiveDecision(this.api, billId, sign);
    return {
      mark: this.mark("executive", [billId], { billId, sign: String(sign) }),
      bill,
    };
  }

  // 3. Time ---------------------------------------------------------------

  /** Run the world to a date on its own clock; dev-mode picks apply at each person's next decision. */
  advance(to: string) {
    const target = makeIsoDate(to);
    if (target <= this.core.date) throw new Error("Pick a later date.");
    // The played character finishes its day and the world takes the clock.
    this.player?.release();
    if (snapshotExplicitControlV1(this.core).personId !== undefined)
      throw new Error("A person is still under control.");
    const started = Date.now();
    const from = this.core.date;
    const controller: Controller = (decision, offers) => {
      const key = this.pending.get(decision.actorId);
      if (!key) return undefined;
      this.pending.delete(decision.actorId);
      const offered = offers.some(
        (offer) => `${offer.definition.id}:${offer.targetId}` === key,
      );
      (offered ? this.applied : this.dropped).push({
        personId: decision.actorId,
        key,
      });
      return offered ? key : undefined;
    };
    if (!this.watch.length) this.snapshot();
    while (this.core.date < target) {
      const month = this.core.date.slice(0, 7);
      const next = addDays(makeIsoDate(this.core.date), 1);
      advanceCore(this.core, next, this.pending.size ? { controller } : {});
      for (const row of this.applied.splice(0))
        this.mark("decision", [row.personId], { ...row });
      for (const row of this.dropped.splice(0))
        this.mark("decision-not-offered", [row.personId], { ...row });
      if (this.core.date.slice(0, 7) !== month) this.snapshot();
    }
    return { from, to: this.core.date, ms: Date.now() - started };
  }

  // 4. Trace --------------------------------------------------------------

  /** A record's causes as the core's saved-trace resolver (and the director) know them. */
  trace(id: string) {
    if (!this.player) throw new Error("Generate a town first.");
    const law = has(this.core, LAWS_MODULE_ID)
      ? this.api.moduleState(LAWS_MODULE_ID).table("laws").get(id)
      : undefined;
    return {
      ...this.player.trace(id),
      record: this.core.durableLog.get(id) ?? law ?? null,
    };
  }

  /** A person's records: money, job, views, drives, health, relationships and the director's ledger. */
  person(personId: string) {
    const core = this.core;
    const person = personOrFillIn(core, personId);
    if (!person) throw new Error("No such person.");
    const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
    const ownRows = (moduleId: string) =>
      core.modules.get(moduleId)?.state
        ? Object.fromEntries(
            Object.entries(this.api.moduleState(moduleId).snapshot().tables)
              .map(([name, rows]) => [
                name,
                (rows as readonly Readonly<Record<string, unknown>>[]).filter(
                  (row) => row.personId === personId,
                ),
              ])
              .filter(([, rows]) => (rows as unknown[]).length),
          )
        : {};
    return {
      person,
      household: core.households.get(person.householdId),
      job,
      payChanges: job ? (core.work.payChanges.get(job.id) ?? []) : [],
      views: ownRows("views"),
      health: {
        conditions: healthReport(core).conditionsByPerson.get(personId) ?? null,
        resilience: healthReport(core).resilienceLines.get(personId) ?? null,
        case: healthCase(core, personId),
      },
      drives: [...person.drives.values()],
      relationships: [...(core.relationshipsByPerson.get(personId) ?? [])]
        .map((id) => core.relationships.get(id))
        .filter((row) => row !== undefined),
      payments: [...(core.cashJournal.detailedByOwner.get(personId) ?? [])]
        .slice(-50)
        .map((id) => core.cashJournal.detailedReceipts.get(id))
        .filter((row) => row !== undefined),
      director: this.director?.ledger.people.get(personId) ?? null,
      records: [...(core.logByPerson.get(personId) ?? [])]
        .slice(-100)
        .map((id) => core.durableLog.get(id))
        .filter((row) => row !== undefined),
      pending: this.pending.get(personId) ?? null,
    };
  }

  // 5. Watch --------------------------------------------------------------

  /** Public and private pay in town today (full and counted jobs). */
  paySplit(): PaySplit {
    const api = this.api;
    const town = this.townId();
    const publicIds = new Set(
      jobsAt(api, PUBLIC_EMPLOYER_CLASSES).map((job) => job.id),
    );
    const pub: number[] = [];
    const priv: number[] = [];
    const add = (id: string, organizationId: string, hourly?: number) => {
      if (!hourly) return;
      if (this.core.organizations.get(organizationId)?.placeId !== town) return;
      (publicIds.has(id) ? pub : priv).push(hourly);
    };
    for (const job of this.core.jobs.values())
      if (job.endsAt === undefined)
        add(job.id, job.organizationId, job.hourlyMinor);
    const rt = residentsRuntime(this.core);
    for (const [jobId, flow] of rt?.wageFlowByJob ?? []) {
      const job = rt!.jobs.get(jobId);
      if (!job || job.endsAt !== undefined || flow.endedAt) continue;
      if (this.core.jobs.has(jobId)) continue;
      add(jobId, job.organizationId, job.hourlyMinor);
    }
    return {
      publicJobs: pub.length,
      publicMedianHourlyMinor: median(pub),
      privateJobs: priv.length,
      privateMedianHourlyMinor: median(priv),
    };
  }

  private snapshot() {
    const date = this.core.date;
    const last = this.watch.at(-1)?.date ?? "";
    this.watch.push({
      date,
      pay: this.paySplit(),
      marks: this.marks()
        .filter((m) => m.date > last && m.date <= date)
        .map((m) => m.id),
    });
  }

  /** The town by month: measures, budgets, prices, the nation, news and dev-mode marks. */
  watchView(since?: string) {
    const api = this.api;
    const from = since ?? "";
    return {
      date: this.core.date,
      pay: this.paySplit(),
      watched: this.watch.filter((row) => row.date >= from),
      metrics: metricsPanel(api, this.townId()).filter(
        (row) => String(row.date) >= from,
      ),
      nation: has(this.core, "macro")
        ? nationalPanel(api).months.filter(
            (row) =>
              String((row as { month?: string }).month ?? "") >=
              from.slice(0, 7),
          )
        : [],
      budgets: budgetView(this.core, this.player?.personId ?? "").governments,
      prices: has(this.core, "place-prices")
        ? api.moduleState("place-prices").table("rules").rows()
        : [],
      news: newsItems(this.core)
        .filter((row) => row.date >= from)
        .slice(0, 200),
      marks: this.marks(),
    };
  }

  // 6. Experiments --------------------------------------------------------

  static experiments(): readonly Experiment[] {
    return DATA.experiments;
  }

  /** Apply a change set's steps today, through the same controls. */
  applySteps(experimentId: string, steps: readonly DevStep[]) {
    const out: unknown[] = [];
    for (const step of steps) {
      out.push(
        this.setLaw({
          level: step.level,
          series: step.series,
          ...(step.value !== undefined ? { value: step.value } : {}),
          ...(step.unit ? { unit: step.unit } : {}),
          ...(step.repeal ? { repeal: true } : {}),
          effectiveDate: addDays(
            makeIsoDate(this.core.date),
            step.effectiveInDays ?? 0,
          ),
        }),
      );
    }
    const mark = this.mark("experiment", [experimentId], {
      experimentId,
      steps: JSON.stringify(steps),
    });
    return { mark, results: out };
  }
}

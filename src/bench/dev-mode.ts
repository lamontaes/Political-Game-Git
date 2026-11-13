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
import type { GovernmentLevel } from "../core2/government-level";
import billCatalogData from "../core2/data/legislature/bill-catalog.json" with { type: "json" };
import { moneySince, watchMoney } from "../core2/tooling/money-watch";
import { bookkeeping } from "../core2/bookkeeping";
import { journalCheckCounts } from "../core2/journal";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { parameter } from "../core2/parameters";
import { coreAPI, personOrFillIn } from "../core2/state";
import { isForgetDay } from "../core2/knowledge-retention";
import { advanceCore, availableActs, type Controller } from "../core2/life";
import { STOPGAPS } from "../core2/stopgaps";
import {
  considerBribe,
  bribeRefusal,
  CORRUPTION_MODULE_ID,
  enactLaw,
  lawChain,
  lawInForce,
  LAWS_MODULE_ID,
} from "../core2/modules/laws";
import { inForceOn, inTownChain, LAW_SERIES } from "../core2/laws-in-force";
import type { LawRowInput } from "../core2/laws-starting";
import { POLICY_QUESTIONS } from "../core2/policy-answers";
import { POLICIES as REACH_A_POLICIES } from "../core2/law-reach/group-a-records";
import { GROUP_B_KEYS } from "../core2/law-reach/group-b";
import { jobsAt } from "../core2/law-reach/group-b-money";
import { lawReach } from "../core2/law-reach/applied";
import {
  PUBLIC_EMPLOYER_CLASSES,
  PUBLIC_PAY_FLOOR,
  PUBLIC_PAY_FLOOR_UNIT,
} from "../core2/public-pay-floor";
import {
  billEnding,
  billJurisdiction,
  bodyOf,
  bodyRow,
  castMemberVote,
  castOwnPositionVote,
  chambersOf,
  signDischarge,
  castChairHearing,
  committeeMemberKeys,
  committeeRecords,
  draftBill,
  scheduleVote,
  executiveDecision,
  executiveOf,
  FEDERAL_HOUSE,
  FEDERAL_SENATE,
  holdVote,
  learnStake,
  sectionsAddedTo,
  type BillRow,
  type Provision,
  LEGISLATURE_MODULE_ID,
  mayorVeto,
  members,
  memberKey,
} from "../core2/modules/legislature";
import { isOutsideOffice, OFFICES_MODULE_ID } from "../core2/modules/offices";
import {
  ELECTIONS_MODULE_ID,
  playerContests,
} from "../core2/modules/elections";
import {
  campaignFor,
  castVolunteer,
  volunteerReason,
} from "../core2/modules/campaigns";
import { campaignDay, campaignView } from "./campaign";
import { metricsPanel } from "../core2/modules/world-panels";
import {
  countryOpened,
  countryTierProblems,
  countryOutlook,
  nationalPanel,
} from "../core2/modules/macro";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import type { EntityId } from "../core2/kernel/brands";
import { isDemoted, residentsRuntime } from "../core2/modules/residents";
import { layOffWorker } from "../core2/modules/jobs";
import {
  beginSeriousIllness,
  HEALTH_MODULE,
  healthReport,
} from "../core2/modules/health";
import { snapshotExplicitControlV1 } from "../core2/player-control-state-v1";
import type { CoreAPI, CoreState } from "../core2/types";
import type { Director } from "../director/ledger";
import { buildBenchWorld, buildRecipeOf } from "./world";
import type { BenchPlayer } from "./player";
import { budgetView } from "./budget";
import { decisionPanels, type WhyPanel } from "./dev-why";
import { traceNode, type TraceNode } from "./dev-trace";
import { newsItems } from "./calendar";
import experiments from "./data/dev-experiments.json" with { type: "json" };
import { causeMatches, SITUATION_LIBRARY } from "../director/scheduling";

/** The mark every dev-mode write carries. */
/** The events a run can stop on, each as the record kinds the game logs when it happens. */
export const RUN_EVENTS = {
  "bill-passes": ["bill-presented"],
  "bill-fails": ["bill-failed"],
  election: ["election-result"],
  death: ["life.death"],
  "law-takes-effect": ["law-took-effect"],
  "job-lost": ["work.job-lost"],
  scene: [],
  /** A seat the player qualifies for opens its filing window (the game's own `playerContests`). */
  "may-file": [],
} as const;
export type RunEvent = keyof typeof RUN_EVENTS;

/** The way a dev control brings about a cause record kind through the game's own code. */
const SCENE_RECIPES: Readonly<Record<string, string>> = {
  "life.death": "death",
  "work.job-lost": "layoff",
  "health.serious-illness": "illness",
};

export const DEV_MODE = "dev-mode";
/** The core record kind each dev-mode change leaves. */
export const DEV_MODE_RECORD = "dev-mode-change";

export type LawLevel = GovernmentLevel;

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

/**
 * Residents dev mode put in focus, per world, so "stop following" takes back
 * only what dev mode added and never someone the player deals with.
 */
const devFollowed = new WeakMap<CoreState, Set<string>>();

/** How a person comes to be in focus: dev mode followed them, the player deals with them, or neither. */
export type FollowStatus = "dev-mode" | "player-circle" | "none";

export interface FollowView {
  readonly personId: string;
  readonly name: string;
  readonly status: FollowStatus;
  /** The person's schedule tier; a followed person acts daily whatever it is (calendar.ts). */
  readonly tier: string;
}

/** The player, and the people the player is related to, knows or lives with. */
function inPlayersCircle(core: CoreState, personId: string): boolean {
  const player = core.playerId ? core.people.get(core.playerId) : undefined;
  if (!player) return false;
  return (
    player.id === personId ||
    player.familyIds.has(personId) ||
    player.knownIds.has(personId) ||
    (core.households.get(player.householdId)?.memberIds ?? []).includes(
      personId,
    )
  );
}
// A screen length, not a model value.
const BODIES_SHOWN = 30;
// The holders the money check lists (a list length, not a model value).
const TWIN_HOLDERS = 40;
/** Who holds cash, in the order the money check shows them. */
const CASH_CLASSES = [
  "player-household",
  "people-in-town",
  "people-elsewhere",
  "people-returned-to-counts",
  "counted-in-town",
  "counted-elsewhere",
  "businesses",
  "banks",
  "governments",
  "public-employers",
  "other-organizations",
] as const;
/** The same order, for sorting rows whose class is read from a map's keys. */
const CLASS_ORDER: readonly string[] = CASH_CLASSES;

/**
 * Every dollar of cash in a world by who holds it: each person and each
 * organization once, by the balance the core keeps for them. Counted
 * households' money is their place's residents account (their group funds
 * are its accounts).
 */
function cashByHolder(core: CoreState, town: string) {
  const classes = new Map<string, number>();
  const holders = new Map<
    string,
    { name: string; class: string; minor: number }
  >();
  const add = (id: string, name: string, kind: string, minor: number) => {
    classes.set(kind, (classes.get(kind) ?? 0) + minor);
    holders.set(id, { name, class: kind, minor });
  };
  const player = core.playerId ? core.people.get(core.playerId) : undefined;
  const household = new Set(
    player ? (core.households.get(player.householdId)?.memberIds ?? []) : [],
  );
  for (const person of core.people.values())
    add(
      person.id,
      `${person.givenName} ${person.familyName}`,
      household.has(person.id)
        ? "player-household"
        : isDemoted(person)
          ? "people-returned-to-counts"
          : person.placeId === town
            ? "people-in-town"
            : "people-elsewhere",
      person.liquidMinor,
    );
  for (const org of core.organizations.values()) {
    const government =
      (org as { governmentFacts?: unknown }).governmentFacts !== undefined;
    add(
      org.id,
      org.name,
      org.kind === "residents"
        ? org.placeId === town
          ? "counted-in-town"
          : "counted-elsewhere"
        : org.kind === "government-treasury" ||
            org.kind === "public-institution"
          ? "governments"
          : org.kind === "bank"
            ? "banks"
            : org.kind === "employer" || org.kind === "media"
              ? government
                ? "public-employers"
                : "businesses"
              : "other-organizations",
      org.liquidMinor,
    );
  }
  return { classes, holders };
}

// The people a reach names on a screen (a list length, not a model value).
const REACH_NAMED = 40;

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

/** Every law series and question the bill paper offers a body to pass, from the one catalog the bill paper reads. */
const BILL_CATALOG_SERIES: readonly string[] = (
  billCatalogData as unknown as {
    subjects: {
      topics: {
        policies: { kind: string; series?: string; question?: string }[];
      }[];
    }[];
  }
).subjects.flatMap((subject) =>
  subject.topics.flatMap((topic) =>
    topic.policies.flatMap((policy) =>
      policy.kind === "law-amount" && policy.series
        ? [policy.series]
        : policy.kind === "policy-question" && policy.question
          ? [policy.question]
          : [],
    ),
  ),
);

/** Every law series the law data knows: in force here, or in a catalog. */
export function lawSeriesCatalog(api: CoreAPI): readonly string[] {
  const out = new Set<string>([
    ...BILL_CATALOG_SERIES,
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

/** Money in a law is whole cents: a wage floor of 1001 is $10.01 an hour, and 10.01 is not an amount. */
function wholeMoney(unit: string | undefined, value: number): void {
  if (unit?.startsWith("minor") && !Number.isSafeInteger(value))
    throw new Error("An amount of money in a law is in whole cents.");
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
      /** The series that are a yes or no the law answers, which a bill answers with 1 or 0. */
      questions: Object.keys(POLICY_QUESTIONS),
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
    /** Another state's law ("US-XX"), set at the state level under that state's key; the town's own state keeps its chain's level. */
    stateKey?: string;
  }) {
    const api = this.api;
    const chain = lawChain(api);
    const other = input.stateKey;
    if (other !== undefined) {
      if (!/^US-[A-Z]{2}$/.test(other))
        throw new Error(`Not a state key: ${other}`);
      if (other === chain.stateKey)
        throw new Error("The town's own state is set by its own level.");
      if (input.level !== "state")
        throw new Error("Another state's law is set at the state level.");
    }
    const level = other
      ? { level: "state" as LawLevel, jurisdiction: other }
      : chain.levels.find((l) => l.level === input.level);
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
    wholeMoney(unit, value);
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
   * Who a law reached: the core's one reader over every store that records a
   * law applied to someone (`lawReach`, law-reach/applied.ts), with the names of
   * the full people it reached, the most money first. It reads only.
   */
  reach(lawId: string) {
    const { people, ...reach } = lawReach(this.api, lawId, this.townId());
    return {
      ...reach,
      /** The first of the full people it named; a screen lists these. */
      named: people.slice(0, REACH_NAMED).map((row) => {
        const person = this.core.people.get(row.personId)!;
        return { ...row, name: `${person.givenName} ${person.familyName}` };
      }),
    };
  }

  /**
   * A bill's whole account for a check: how it ended and why (the legislature's
   * own `billEnding`), the sections a trade added to it, and each law row it
   * made with the reach of that row. Reads only.
   */
  billOutcome(billId: string) {
    const api = this.api;
    const bill = api
      .moduleState(LEGISLATURE_MODULE_ID)
      .table("bills")
      .get(billId) as unknown as BillRow | undefined;
    if (!bill) throw new Error("No such bill.");
    const laws = has(this.core, LAWS_MODULE_ID)
      ? (
          api
            .moduleState(LAWS_MODULE_ID)
            .table("laws")
            .rows() as unknown as LawRowInput[]
        ).filter((row) =>
          // The bill's own id where the law row keeps it; else the body's designation.
          row.terms?.enactedByBill !== undefined
            ? row.terms.enactedByBill === bill.id
            : row.terms?.enactedBy === bill.number &&
              row.effectiveDate >= bill.introduced,
        )
      : [];
    const ending = billEnding(api, bill.id);
    const nameOf = (id: string) => {
      const person = this.core.people.get(id);
      return person ? `${person.givenName} ${person.familyName}` : "";
    };
    return {
      bill: { id: bill.id, number: bill.number, status: bill.status },
      ending,
      /** The names a screen needs beside the ending's ids: the chamber's own name and the chair's. */
      endingNames: {
        chamber:
          "chamber" in ending
            ? (bodyOf(api, ending.chamber)?.bodyName ?? "")
            : "",
        chair: "chairId" in ending ? nameOf(ending.chairId) : "",
      },
      addedSections: sectionsAddedTo(bill),
      sections: bill.provisions.length,
      laws: laws.map((row) => ({
        id: row.id,
        series: row.series,
        level: row.level,
        jurisdiction: row.jurisdiction,
        value: row.value,
        unit: row.unit ?? "",
        effectiveDate: row.effectiveDate,
        inForce: row.effectiveDate <= this.core.date,
        reach: this.reach(row.id),
      })),
    };
  }

  /**
   * The money check: this world against the same world left alone. Builds the
   * twin from this world's own recipe (seed, place, start date, the choices
   * of the New game screen), runs it to today with nobody played and nothing
   * changed, and adds up the cash in both by who holds it: the player's
   * household, full people in the town and elsewhere, the counted households
   * of each place, businesses, each government's treasury, and everything
   * outside the books (what the rest sums to, with its sign turned). The
   * difference is what was done in this world: the laws dev mode passed and
   * whatever the player did. It also names the holders whose cash moved most.
   * This is how the Fable audit followed every law's dollars (Nov 9, 2026);
   * it is here so a second session can run the same check from the game.
   * Run the world with dev mode's Run, not Day and Week, so the only
   * difference is the change being checked. Read-only for this world; the
   * twin is built, read and dropped.
   */
  twinMoney() {
    const recipe = buildRecipeOf(this.core);
    if (!recipe)
      throw new Error(
        "This world was not built in this session, so it has no recipe to build a twin from.",
      );
    const started = Date.now();
    const twin = buildBenchWorld(recipe.seed, recipe.date, recipe.options).core;
    if (twin.date < this.core.date)
      advanceCore(twin, makeIsoDate(this.core.date));
    const here = cashByHolder(this.core, this.townId());
    const there = cashByHolder(
      twin,
      has(twin, LAWS_MODULE_ID) ? lawChain(coreAPI(twin)).townPlaceId : "",
    );
    const keys = [
      ...new Set([...here.classes.keys(), ...there.classes.keys()]),
    ];
    const classes = keys
      .map((key) => {
        const hereMinor = here.classes.get(key) ?? 0;
        const twinMinor = there.classes.get(key) ?? 0;
        return { key, hereMinor, twinMinor, diffMinor: hereMinor - twinMinor };
      })
      .sort((a, b) => CLASS_ORDER.indexOf(a.key) - CLASS_ORDER.indexOf(b.key));
    // Money that left every book in the world went outside it; the difference in what is left is its mirror.
    const inside = classes.reduce((sum, row) => sum + row.diffMinor, 0);
    const holderIds = new Set([
      ...here.holders.keys(),
      ...there.holders.keys(),
    ]);
    const holders = [...holderIds]
      .map((id) => {
        const a = here.holders.get(id);
        const b = there.holders.get(id);
        return {
          id,
          name: (a ?? b)!.name,
          class: (a ?? b)!.class,
          hereMinor: a?.minor ?? 0,
          twinMinor: b?.minor ?? 0,
          diffMinor: (a?.minor ?? 0) - (b?.minor ?? 0),
        };
      })
      .filter((row) => row.diffMinor !== 0);
    const byMove = (
      a: { diffMinor: number; id: string },
      b: { diffMinor: number; id: string },
    ) =>
      Math.abs(b.diffMinor) - Math.abs(a.diffMinor) || a.id.localeCompare(b.id);
    const marks = this.marks();
    return {
      seed: recipe.seed,
      placeKey: recipe.options.placeKey ?? "",
      from: recipe.date,
      to: this.core.date,
      /** What dev mode did in this world and not in the twin, by control. */
      changes: [...new Set(marks.map((m) => m.control))]
        .sort()
        .map((control) => ({
          control,
          count: marks.filter((m) => m.control === control).length,
        })),
      classes: [
        ...classes,
        {
          key: "outside",
          hereMinor: 0,
          twinMinor: 0,
          diffMinor: -inside,
        },
      ],
      governments: holders
        .filter((row) => row.class === "governments")
        .sort(byMove),
      /** The holders whose cash differs most, people and organizations alike. */
      holders: holders.sort(byMove).slice(0, TWIN_HOLDERS),
      holdersMoved: holders.length,
      twinMs: Date.now() - started,
    };
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

  /**
   * Where a person stands: followed by dev mode, in the player's circle, or
   * neither. Reads only; it fills in no one and writes nothing.
   */
  followStatus(personId: string): FollowView {
    const person = this.core.people.get(personId);
    if (!person) throw new Error("No such person.");
    const added = devFollowed.get(this.core)?.has(personId) === true;
    const inFocus =
      this.core.focusPersonIds.has(personId) || personId === this.core.playerId;
    return {
      personId,
      name: `${person.givenName} ${person.familyName}`,
      tier: person.tier,
      status: !inFocus ? "none" : added ? "dev-mode" : "player-circle",
    };
  }

  /**
   * Put a resident in focus, as the people a player deals with are, so each
   * act from now on keeps every option's reasons (why-kept). Focus also
   * gives a person the daily schedule the player's circle has; nothing here
   * picks, scores or changes any decision, spends game time or writes a
   * record.
   */
  follow(personId: string): FollowView {
    if (!personOrFillIn(this.core, personId))
      throw new Error("No such person.");
    if (!this.core.focusPersonIds.has(personId)) {
      this.core.focusPersonIds.add(personId);
      const added = devFollowed.get(this.core) ?? new Set<string>();
      added.add(personId);
      devFollowed.set(this.core, added);
    }
    return this.followStatus(personId);
  }

  /**
   * Take a resident dev mode followed out of focus. Someone the player now
   * deals with stays in focus: their reasons are the player's to read.
   */
  unfollow(personId: string): FollowView {
    const added = devFollowed.get(this.core);
    if (added?.delete(personId) && !inPlayersCircle(this.core, personId))
      this.core.focusPersonIds.delete(personId);
    return this.followStatus(personId);
  }

  /** The residents dev mode follows, each with their decisions panel. */
  followed(): { view: FollowView; decisions: WhyPanel }[] {
    return [...(devFollowed.get(this.core) ?? [])]
      .filter((id) => this.core.people.has(id))
      .map((id) => ({
        view: this.followStatus(id),
        decisions: decisionPanels(this.core, id)[0]!,
      }));
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

  /** Every body that makes law in this world: its office, level and members. */
  lawmakingBodies() {
    if (!has(this.core, LEGISLATURE_MODULE_ID)) return [];
    const api = this.api;
    const offices = api
      .moduleState(OFFICES_MODULE_ID)
      .table("offices")
      .rows() as unknown as { id: string; kind: string }[];
    const ids = [
      ...offices.filter((o) => bodyRow(o.kind)).map((o) => o.id),
      FEDERAL_HOUSE,
      FEDERAL_SENATE,
    ];
    return [...new Set(ids)].flatMap((id) => {
      const office = bodyOf(api, id);
      if (!office) return [];
      const roster = members(api, id);
      return [
        {
          id,
          kind: office.kind,
          level: bodyRow(office.kind)?.level ?? null,
          name: office.bodyName ?? office.governmentName,
          members: roster.map((term) => ({
            key: memberKey(term),
            personId: term.personId,
            givenName: term.identity.givenName,
            familyName: term.identity.familyName,
            party: term.party,
          })),
        },
      ];
    });
  }

  /**
   * A member introduces a bill at a body: the game's own draftBill. Either one law-amount section
   * named by `series` and `value`, or a shown bill (`billId`) brought to this body with its own
   * sections and its own sponsor (the sponsor sits in this body, else its first member sponsors).
   */
  introduce(input: {
    bodyOfficeId: string;
    sponsorId?: string;
    series?: string;
    value?: number;
    unit?: string;
    /** Repeal the body's own law on an amount series: its level holds what it held before, including nothing. */
    repeal?: boolean;
    billId?: string;
    /** Put the bill on the body's next sitting, as its sponsor's calendar would (a floor day the member is held for). */
    schedule?: boolean;
  }) {
    let provisions: Provision[];
    let sponsorId = input.sponsorId;
    if (input.billId) {
      const shown = this.api
        .moduleState(LEGISLATURE_MODULE_ID)
        .table("bills")
        .get(input.billId) as unknown as BillRow | undefined;
      if (!shown) throw new Error("No such bill.");
      provisions = shown.provisions.map((p) => ({ ...p }));
      const roster = members(this.api, input.bodyOfficeId);
      if (!roster.length) throw new Error("That body has no members.");
      sponsorId ??= roster.some((term) => memberKey(term) === shown.sponsorId)
        ? shown.sponsorId
        : memberKey(roster[0]!);
    } else {
      const { series, value } = input;
      if (!series || !lawSeriesCatalog(this.api).includes(series))
        throw new Error(`Unknown law series: ${series}`);
      if (value === undefined || !Number.isFinite(value))
        throw new Error("A bill needs a value.");
      if (!sponsorId) throw new Error("A bill needs a sponsor.");
      wholeMoney(
        input.unit ??
          (
            this.api
              .moduleState(LAWS_MODULE_ID)
              .table("laws")
              .query("bySeriesOnly", [series]) as unknown as LawRowInput[]
          ).find((row) => row.unit)?.unit,
        value,
      );
      // A policy question (a yes or no the law answers) is a section of its own kind.
      provisions = [
        POLICY_QUESTIONS[series]
          ? { kind: "policy-question", question: series, value }
          : {
              kind: "law-amount",
              series,
              value,
              ...(input.repeal ? { repeal: true } : {}),
              ...(input.unit ? { unit: input.unit } : {}),
            },
      ];
    }
    const bill = draftBill(this.api, {
      bodyOfficeId: input.bodyOfficeId,
      sponsorId: sponsorId!,
      provisions,
    });
    if (input.schedule) scheduleVote(this.api, bill.id);
    return {
      mark: this.mark("introduce", [bill.id], {
        billId: bill.id,
        sponsorId: sponsorId!,
        ...(input.billId ? { from: input.billId } : {}),
      }),
      bill,
    };
  }

  /**
   * Every member of every chamber the bill passes through votes (each through castMemberVote),
   * `margin` more yes than no votes in each chamber (negative to defeat it), then the body holds
   * its vote. `sign` has the executive sign (true) or veto (false) through executiveDecision;
   * left out, the executive decides as the game does. `overrideMargin` is the same for the vote
   * to override a veto. A chamber's committee is the game's own: its chair may hold the bill
   * unheard, which `held` reports.
   */
  decideAt(
    billId: string,
    margin: number | undefined,
    options: {
      /** Members voting as named (key to vote); the rest vote by `margin`, or by their own position where there is none. */
      votes?: Readonly<Record<string, "yes" | "no" | "abstain">>;
      sign?: boolean;
      overrideMargin?: number;
      /** Every member signs a discharge petition for the bill before the committee meets. */
      discharge?: boolean;
      /** The chair of each committee is cast to hear the bill, through the committee's own hearing decision. */
      chairHears?: boolean;
    } = {},
  ) {
    const api = this.api;
    const table = api.moduleState(LEGISLATURE_MODULE_ID).table("bills");
    const bill = table.get(billId) as unknown as BillRow | undefined;
    if (!bill) throw new Error("No such bill.");
    const tallies: { chamber: string; yes: number; no: number }[] = [];
    // The yes votes go first to the members who sit on the bill's committee in that chamber (where
    // it has one), then to the most senior: a bill the chamber backs is backed in its committee
    // too, and every stage votes through the members' own votes at the one margin.
    const bySeniority = (
      roster: ReturnType<typeof members>,
      seated: ReadonlySet<string>,
    ) =>
      [...roster].sort(
        (a, b) =>
          Number(seated.has(memberKey(b))) - Number(seated.has(memberKey(a))) ||
          (a.serviceStart ?? a.startDate).localeCompare(
            b.serviceStart ?? b.startDate,
          ) ||
          memberKey(a).localeCompare(memberKey(b)),
      );
    const vote = (
      chamber: string,
      wanted: number | undefined,
      override: boolean,
    ) => {
      const roster = bySeniority(
        members(api, chamber),
        new Set(committeeMemberKeys(api, billId, chamber)),
      );
      // Members named in `votes` vote as named, a dev's decision; the others fill the margin
      // (negative to defeat), or vote their own position where no margin was given.
      const named = options.votes ?? {};
      const free = roster.filter((term) => !named[memberKey(term)]);
      const namedYes = roster.filter(
        (term) => named[memberKey(term)] === "yes",
      ).length;
      const namedNo = roster.filter(
        (term) => named[memberKey(term)] === "no",
      ).length;
      let yes = 0;
      if (wanted !== undefined) {
        const total = Math.round((roster.length + wanted) / 2);
        yes = Math.max(0, Math.min(free.length, total - namedYes));
      }
      let ownYes = 0;
      let ownNo = 0;
      free.forEach((term, index) => {
        if (wanted === undefined) {
          const own = castOwnPositionVote(api, billId, memberKey(term)).vote;
          if (own === "yes") ownYes += 1;
          else if (own === "no") ownNo += 1;
        } else
          castMemberVote(
            api,
            billId,
            memberKey(term),
            index < yes ? "yes" : "no",
            override,
          );
      });
      for (const term of roster) {
        const cast = named[memberKey(term)];
        if (cast) castMemberVote(api, billId, memberKey(term), cast, override);
      }
      return wanted === undefined
        ? { chamber, yes: namedYes + ownYes, no: namedNo + ownNo }
        : { chamber, yes: namedYes + yes, no: namedNo + free.length - yes };
    };
    const chambers = chambersOf(api, bill);
    // Whether this body has an executive with a veto: a county board, or a mayor where the state
    // gives none, signs nothing and vetoes nothing, so a sign, veto or override changes nothing there.
    const executive = executiveOf(api, bill.bodyOfficeId);
    const veto =
      executive.term !== undefined &&
      (executive.office?.kind !== "mayor" || mayorVeto(api).veto);
    for (const chamber of chambers) tallies.push(vote(chamber, margin, false));
    if (options.chairHears)
      for (const chamber of chambers)
        castChairHearing(api, billId, chamber, true);
    if (options.discharge)
      for (const chamber of chambers)
        for (const term of members(api, chamber))
          signDischarge(api, billId, memberKey(term), true);
    if (veto && options.overrideMargin !== undefined)
      for (const chamber of chambers)
        vote(chamber, options.overrideMargin, true);
    if (veto && options.sign !== undefined)
      executiveDecision(api, billId, options.sign);
    const held = holdVote(api, billId);
    const records = committeeRecords(api, billId).map((c) => ({
      chamber: c.chamber,
      heard: c.heard,
      chairPicked: c.chairPicked === true,
      yes: c.yes,
      no: c.no,
      reported: c.reported,
      // Who chairs it and why they heard the bill or held it: the chair's own position on it and what
      // their temperament adds, as the committee recorded them (heard when the sum is not below zero).
      chair: c.chairId,
      chairPosition: c.chairReasons.position.total,
      chairTrait: c.chairReasons.hearingTrait,
      discharge: c.discharge ?? null,
      // Why it did not reach the floor, in the record's own terms: lost its vote, left unheard with
      // no discharge route in the chamber's data, or left unheard with a petition short of its count.
      why: c.reported
        ? null
        : c.heard
          ? ("lost" as const)
          : c.discharge
            ? ("petition-short" as const)
            : ("unheard-no-route" as const),
    }));
    return {
      mark: this.mark("decide", [billId], {
        billId,
        ...(margin !== undefined ? { margin: String(margin) } : {}),
        ...(options.votes
          ? {
              votes: Object.entries(options.votes)
                .map(([key, cast]) => `${key}:${cast}`)
                .join(","),
            }
          : {}),
        ...(options.sign !== undefined ? { sign: String(options.sign) } : {}),
        ...(options.overrideMargin !== undefined
          ? { overrideMargin: String(options.overrideMargin) }
          : {}),
      }),
      tallies,
      veto,
      committees: records,
      /** Chambers whose committee never reported the bill: the chair held it unheard, or it lost its vote. */
      held: records.filter((c) => !c.reported).map((c) => c.chamber),
      bill: held,
      /** How it ended and why, in the legislature's own terms, and the sections a trade added to it. */
      ending: billEnding(api, billId),
      addedSections: sectionsAddedTo(held),
    };
  }

  /**
   * A person falls seriously ill through the health module's own onset: tomorrow the onset is
   * heard and the module sets the death date from their age and severity, then the death, the
   * estate, the vacancy rule, the news and the funeral scene follow on their own days. Run until
   * "A person dies" to get there.
   */
  forceIllness(personId: string) {
    if (!has(this.core, HEALTH_MODULE.id))
      throw new Error("This world has no health module.");
    if (!beginSeriousIllness(this.api, personId))
      throw new Error(
        "No illness: the person is gone or has no health record.",
      );
    return { mark: this.mark("illness", [personId], { personId }) };
  }

  /**
   * A named person's job ends through their employer's own layoff (the jobs engine's separation): the
   * record of why, the work.job-lost event, the state claim and the news follow as for any layoff. A
   * worker who played today's day is let go the next day, which this says.
   */
  forceLayoff(personId: string) {
    const person = personOrFillIn(this.core, personId);
    if (!person) throw new Error("No such person.");
    const jobId = person.jobId;
    if (!jobId) throw new Error("They have no job to lose.");
    const out = layOffWorker(this.api, jobId);
    if (out === null)
      throw new Error("Their job is not on a business's staff.");
    if (out === "worked-today")
      throw new Error("They worked today: lay them off tomorrow.");
    if (out === "over")
      throw new Error("The job stands for more than one: a counted worker.");
    return {
      mark: this.mark("layoff", [personId], { personId, jobId }),
      layoff: out,
    };
  }

  /**
   * Every situation type the director stages, with the cause record kinds it waits on and the way a
   * dev control can bring that cause about through the game's own code (a `recipe`), or none where no
   * game code exists to attach to.
   */
  scenes() {
    const types = SITUATION_LIBRARY.types;
    return types.map((type) => {
      // The record kinds the type waits on that an engine writes; a type with no cause record has
      // none, and so no way in.
      // A cause is named by a record kind the type is tagged with (`causeRecord`), or by the moment the
      // director's ledger keeps (`match`): a feeling about an event the game logs
      // (`feeling:event:<kind>`), a job started, a tie turning, a re-entry. The record kind behind an
      // event label is the kind itself.
      const tagged = type.causes.flatMap((c) => c.causeRecord ?? []);
      const matched = type.causes.flatMap((c) => {
        const label = c.match?.label ?? "";
        if (label.startsWith("feeling:event:"))
          return [label.slice("feeling:event:".length)];
        return c.match
          ? [
              label ||
                c.match.labelPrefix ||
                (c.match.echo ? `echo:${c.match.echo}` : "") ||
                c.match.causeKind ||
                "",
            ].filter(Boolean)
          : [];
      });
      const causeRecords = [...new Set([...tagged, ...matched])];
      // `death`, `illness` and `layoff` bring the cause about through an engine's own function; `wait`
      // runs the world until an engine writes the record naming the player; `moment` runs it until the
      // director's own ledger holds a moment that `causeMatches` reads as one of the type's causes.
      const recipe =
        causeRecords.map((kind) => SCENE_RECIPES[kind]).find(Boolean) ??
        (tagged.length
          ? "wait"
          : type.causes.some((c) => c.match)
            ? "moment"
            : null);
      // What dev mode can do for it: bring it about now (an engine's own function), run the world
      // until its cause record comes, or nothing (no engine writes its cause yet).
      const state = !recipe
        ? ("none" as const)
        : recipe === "wait" || recipe === "moment"
          ? ("waits" as const)
          : ("plays" as const);
      return { key: type.key, causeRecords, recipe, state };
    });
  }

  /**
   * The pickers for one situation type's force-scene form, from the director's own records: `for` is
   * each person the director tells a story for; `mourned` (death scenes only) is each living person
   * they know whom the health module's illness could take; `where` is the kinds of place the type may
   * be set at, in the type's own order. A picker that does not apply to the type is null.
   */
  sceneCast(typeKey: string) {
    const scene = this.scenes().find((row) => row.key === typeKey);
    const type = SITUATION_LIBRARY.types.find((row) => row.key === typeKey);
    if (!scene || !type) throw new Error("No such situation type.");
    const person = (id: string) => {
      const row = this.core.people.get(id as never);
      return row ? { id, name: `${row.givenName} ${row.familyName}` } : null;
    };
    const told = [...(this.director?.ledger.people.keys() ?? [])]
      .filter((id) => this.core.people.get(id)?.alive)
      .flatMap((id) => person(id) ?? []);
    const circleOf = (id: string) => {
      const row = this.core.people.get(id as never);
      return row
        ? [...row.familyIds, ...row.knownIds].filter(
            (other) => other !== id && this.core.people.get(other)?.alive,
          )
        : [];
    };
    return {
      typeKey,
      recipe: scene.recipe,
      for: told,
      mourned:
        scene.recipe === "death"
          ? Object.fromEntries(
              told.map((row) => [
                row.id,
                [...new Set(circleOf(row.id))].flatMap(
                  (id) => person(id) ?? [],
                ),
              ]),
            )
          : null,
      where: [...type.setting],
    };
  }

  /**
   * Brings about the cause of a situation type through the game's own code, so the director stages
   * it as it would any moment: today, a death a person in the player's circle will hear of (the
   * health module's illness, then Run until they die and Run until a scene fires). Where the type
   * has no recipe there is no game code to attach to, and this says so.
   */
  forceScene(input: {
    typeKey: string;
    personId?: string;
    /** Who the scene is for: a layoff or illness happens to them; a death is heard by them. */
    forId?: string;
    /** Who is mourned (a death scene): the person the health module's illness takes. */
    mournedId?: string;
    /** The kind of place, one of the type's own settings (see `sceneCast`). */
    where?: string;
    cap?: number;
  }) {
    const scene = this.scenes().find((row) => row.key === input.typeKey);
    if (!scene) throw new Error("No such situation type.");
    if (!scene.recipe)
      throw new Error(
        "No game code to attach to: no engine writes this scene's cause yet.",
      );
    const player = this.core.playerId
      ? this.core.people.get(this.core.playerId)
      : undefined;
    if (input.where !== undefined) {
      const kinds = SITUATION_LIBRARY.types.find(
        (row) => row.key === input.typeKey,
      )?.setting;
      if (!kinds?.includes(input.where))
        throw new Error("The scene cannot be set there.");
      if (!this.director) throw new Error("There is no director to stage it.");
      this.director.preferSetting(input.typeKey, input.where);
    }
    if (scene.recipe === "moment") {
      if (!player) throw new Error("There is no player to run the world for.");
      const ran = this.runUntil({ scene: scene.key, cap: input.cap ?? 366 });
      return {
        recipe: scene.recipe,
        personId: player.id,
        causeRecords: scene.causeRecords,
        ran,
      };
    }
    if (scene.recipe === "wait") {
      // The cause is a record an engine writes on its own schedule: run the world until one names the
      // player, and the director stages the scene from it the ordinary way.
      if (!player) throw new Error("There is no player to run the world for.");
      const ran = this.runUntil({
        kind: scene.causeRecords[0],
        person: player.id,
        cap: input.cap ?? 366,
      });
      return {
        recipe: scene.recipe,
        personId: player.id,
        causeRecords: scene.causeRecords,
        ran,
      };
    }
    const circle = player
      ? [...player.familyIds, ...player.knownIds].filter(
          (id) => id !== player.id && this.core.people.get(id)?.alive,
        )
      : [];
    // A layoff is the player's own where they have a job, else a worker in their circle's.
    const personId =
      (scene.recipe === "death" ? input.mournedId : input.forId) ??
      input.personId ??
      (scene.recipe === "layoff"
        ? [player?.id, ...circle].find(
            (id) => id && this.core.people.get(id)?.jobId,
          )
        : scene.recipe === "illness"
          ? player?.id
          : circle[0]);
    if (!personId)
      throw new Error("No one in the player's circle to bring it about for.");
    // A death is heard by the one it is for, who has to know the person who dies.
    if (scene.recipe === "death" && input.forId) {
      const hears = this.core.people.get(input.forId);
      if (!hears || !this.director?.ledger.people.has(input.forId as never))
        throw new Error("The director is not telling that person's story.");
      if (
        !hears.familyIds.has(personId as never) &&
        !hears.knownIds.has(personId as never)
      )
        throw new Error("They would not hear of it: they do not know them.");
    }
    const out =
      scene.recipe === "layoff"
        ? this.forceLayoff(personId)
        : this.forceIllness(personId);
    // An illness is the player's own where the type is about them, so the scene follows from it.
    return {
      ...out,
      recipe: scene.recipe,
      personId,
      causeRecords: scene.causeRecords,
    };
  }

  /**
   * The small-dollar lender's loans as the credit engine wrote them: what was asked, what was lent,
   * and the outcome web's factor with the month and links it read where the lender quoted (a cap in
   * force past its lag shows as a factor below one). Reads only.
   */
  smallDollarLoans() {
    if (!has(this.core, "credit")) return [];
    return (
      this.api.moduleState("credit").table("loans").rows() as unknown as {
        id: string;
        kind: string;
        askedMinor?: number;
        principalMinor?: number;
        annualRate?: number;
        webFactor?: number;
        webLinks?: string[];
        webRecordId?: string;
      }[]
    )
      .filter((loan) => loan.kind === "small-dollar")
      .map((loan) => ({
        id: loan.id,
        askedMinor: loan.askedMinor ?? null,
        principalMinor: loan.principalMinor ?? null,
        annualRate: loan.annualRate ?? null,
        webFactor: loan.webFactor ?? null,
        webLinks: loan.webLinks ?? [],
        webRecordId: loan.webRecordId ?? null,
      }));
  }

  /**
   * The player's campaigns and the people the volunteer ask reaches (those the player knows), with each
   * person's own reasons to say yes as the campaign engine reads them. Reads only.
   */
  campaignSetup() {
    const playerId = this.core.playerId;
    if (!playerId) return [];
    const api = this.api;
    const player = this.core.people.get(playerId);
    return campaignView(this.core, playerId).campaigns.map((row) => ({
      filingId: row.filing.id,
      title: row.contest?.title ?? "",
      raisedMinor: row.campaign.raisedMinor,
      spentMinor: row.campaign.spentMinor,
      volunteers: row.campaign.volunteers,
      people: [...(player?.knownIds ?? [])].sort().flatMap((id) => {
        const person = this.core.people.get(id);
        return person?.alive
          ? [
              {
                personId: id,
                name: `${person.givenName} ${person.familyName}`,
                reason: volunteerReason(
                  api,
                  campaignFor(api, row.filing.id),
                  person,
                ),
              },
            ]
          : [];
      }),
    }));
  }

  /**
   * Donors give: the player takes the campaign day's "raise money" choice (calls to donors) through the
   * game's own campaign code, so each donor decides to give or not by their own warmth and means and every
   * gift writes the donation record and the journal entries a gift writes. A day with no gift passes and the
   * calls are made again, up to a fortnight; the result names each donor who gave and why the rest did not.
   */
  raiseMoney(filingId: string) {
    const playerId = this.core.playerId;
    if (!playerId) throw new Error("There is no player.");
    const api = this.api;
    const before = campaignFor(api, filingId).raisedMinor;
    const from = this.core.date;
    const calls: { personId: string; givenMinor: number; why: string }[] = [];
    let days = 0;
    for (; days < 14; days += 1) {
      try {
        const out = campaignDay(this.core, playerId, {
          filingId,
          kind: "raise-money",
        });
        calls.push(
          ...out.calls.map((c) => ({
            personId: c.personId,
            givenMinor: c.givenMinor,
            why: c.why,
          })),
        );
      } catch {
        // The day's hours are spent: the next day's calls are made.
      }
      if (campaignFor(api, filingId).raisedMinor > before) break;
      this.advance(addDays(makeIsoDate(this.core.date), 1));
    }
    const raisedMinor = campaignFor(api, filingId).raisedMinor - before;
    return {
      mark: this.mark("raise-money", [filingId], { filingId, from }),
      raisedMinor,
      days,
      gave: calls.filter((c) => c.givenMinor > 0),
      asked: calls.length,
    };
  }

  /** A person says yes (or no) when the campaign asks them to volunteer: a decision cast for them, read by the campaign's own ask. */
  volunteerCast(filingId: string, personId: string, yes: boolean) {
    if (campaignFor(this.api, filingId).candidateId !== this.core.playerId)
      throw new Error("That is not your campaign.");
    castVolunteer(this.api, filingId, personId, yes);
    return this.mark("volunteer-cast", [personId], {
      filingId,
      personId,
      yes: String(yes),
    });
  }

  /** Who has a say on a bill: the members of each chamber it passes through and the executive who signs it. */
  billDeciders(billId: string) {
    const api = this.api;
    const bill = api
      .moduleState(LEGISLATURE_MODULE_ID)
      .table("bills")
      .get(billId) as unknown as BillRow | undefined;
    if (!bill) throw new Error("No such bill.");
    const out: { personId: string; name: string; body: string }[] = [];
    for (const chamber of chambersOf(api, bill)) {
      const body = bodyOf(api, chamber);
      for (const term of members(api, chamber))
        if (term.personId)
          out.push({
            personId: term.personId,
            name: `${term.identity.givenName} ${term.identity.familyName}`,
            body: body?.bodyName ?? body?.governmentName ?? "",
          });
    }
    const executive = executiveOf(api, bill.bodyOfficeId).term;
    if (executive?.personId)
      out.push({
        personId: executive.personId,
        name: `${executive.identity.givenName} ${executive.identity.familyName}`,
        body: executiveOf(api, bill.bodyOfficeId).office?.kind ?? "",
      });
    return out;
  }

  /** The wealthiest living people in the world: who might want a favor enough to pay for it. */
  wealthiest(count = 12) {
    return [...this.core.people.values()]
      .filter((p) => p.alive && p.liquidMinor > 0)
      .sort((a, b) => b.liquidMinor - a.liquidMinor)
      .slice(0, count)
      .map((p) => ({
        personId: p.id,
        name: `${p.givenName} ${p.familyName}`,
        liquidMinor: p.liquidMinor,
      }));
  }

  /**
   * Someone wants a favor from an official (a pending vote, a permit, a contract: any record id)
   * and offers a bribe through the game's own considerBribe: the offerer decides whether to
   * offer and the official whether to take it, each as the engine decides, and the money moves
   * only if it is taken. Says what happened and the reasons the engine kept.
   */
  forceBribe(input: {
    offererId: string;
    officialId: string;
    subjectId: string;
    stakeMinor: number;
    /** "takes" or "refuses" picks the official's answer (the offer is made); left out, the engine decides. */
    answer?: "takes" | "refuses";
  }) {
    if (!has(this.core, CORRUPTION_MODULE_ID))
      throw new Error("This world has no corruption module.");
    const offerer = this.core.people.get(input.offererId);
    const before = offerer?.liquidMinor ?? 0;
    const record = considerBribe(this.api, {
      offererId: input.offererId,
      officialId: input.officialId,
      stakeMinor: input.stakeMinor,
      subjectId: input.subjectId,
      ...(input.answer
        ? { pick: { offer: true, take: input.answer === "takes" } }
        : {}),
    });
    if (!record) {
      const refusal = bribeRefusal(this.api, input);
      throw new Error(
        refusal ?? "No bribe: the offerer has no money or someone is gone.",
      );
    }
    return {
      mark: this.mark("bribe", [record.id], {
        offererId: input.offererId,
        officialId: input.officialId,
        subjectId: input.subjectId,
      }),
      record,
      moved: before - (offerer?.liquidMinor ?? 0),
    };
  }

  /** Cast a member's vote on a bill before the vote is held. */
  vote(billId: string, memberId: string, vote: "yes" | "no" | "abstain") {
    castMemberVote(this.api, billId, memberId, vote);
    return this.mark("vote", [billId], { billId, memberId, vote });
  }

  /**
   * The player has worked beside every colleague of the body they sit on for a while: hours of contact on the
   * record (`api.relationship`), the way a term of sessions and talks leaves it. A bill they then introduce
   * is signed on by the colleagues who back it and know them.
   */
  workBesideColleagues(hours = 2) {
    const player = snapshotExplicitControlV1(this.core).personId;
    if (!player) throw new Error("Control a person first.");
    const bodies = this.lawmakingBodies().filter((body) =>
      members(this.api, body.id).some((term) => memberKey(term) === player),
    );
    let colleagues = 0;
    for (const body of bodies)
      for (const term of members(this.api, body.id)) {
        const key = memberKey(term);
        if (key === player || !this.core.people.has(key)) continue;
        this.api.relationship(player, key, "contact", hours);
        colleagues += 1;
      }
    return this.mark("work-beside-colleagues", [player], {
      player,
      colleagues: String(colleagues),
    });
  }

  /**
   * What colleagues tell the player about a bill: each member of the player's chamber (or one member) tells
   * them where they stand, as a conversation records it (`learnStake`), so the aide's estimate and the paper's
   * "what members told you" have something to read. The sponsor is the one who learns.
   */
  learnStakes(billId: string, memberId?: string) {
    const bill = this.api
      .moduleState(LEGISLATURE_MODULE_ID)
      .table("bills")
      .get(billId) as unknown as BillRow | undefined;
    if (!bill) throw new Error(`No bill ${billId}.`);
    const told = (
      memberId
        ? [memberId]
        : members(this.api, bill.bodyOfficeId).map((term) => memberKey(term))
    ).filter((key) => key !== bill.sponsorId);
    for (const key of told)
      learnStake(this.api, billId, key, "conversation", bill.sponsorId);
    return this.mark("learn-stakes", [billId], {
      billId,
      members: String(told.length),
    });
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

  /** What a skipped year does not do, read from its registered stopgap. */
  skipNotice(): string {
    const row = STOPGAPS.find(
      (entry) => entry.id === "SG-SPEED-results-mode-daily-work",
    );
    if (!row) throw new Error("The results-mode stopgap is not registered.");
    return row.whatItFakes;
  }

  /**
   * Skips one year of the played world in results mode (`advanceCore` with `results: true`): the
   * game's date moves, only dated work and the monthly catch-up run (SG-SPEED-results-mode-daily-work).
   * The played character finishes its day and the world takes the clock, as `advance` does; the
   * player's clock binds again at the next play-screen advance. Not read-only: it writes facts.
   * Refuses, saying why, while a stop or choice holds the clock. The client calls it once per year,
   * so each finished year is a line of its own. Returns the dates, the seconds, the tier's own
   * verdict and the stopgap's list of what a skipped year does not do.
   */
  runYear() {
    try {
      this.player?.release();
    } catch {
      return { ran: false as const, held: true as const };
    }
    if (snapshotExplicitControlV1(this.core).personId !== undefined)
      return { ran: false as const, held: true as const };
    const from = this.core.date;
    const to = addDays(makeIsoDate(from), 365);
    const started = Date.now();
    advanceCore(this.core, to, { results: true });
    const problems = countryTierProblems(this.api);
    return {
      ran: true as const,
      from,
      to: this.core.date,
      seconds: (Date.now() - started) / 1000,
      opened: countryOpened(this.api),
      problems: problems.length,
    };
  }

  /**
   * The country some years on if nothing else changes (the game's own month run ahead on a
   * copy; see `countryOutlook`). Read-only: no record, no date moves, and the save is not
   * marked. The played town is not in it. Returns the nation's and the player's state's
   * figures today and at years 1, 5, 10, 15 and 20 (or the last year when fewer), every state's
   * first and last, and whether every count stayed possible.
   */
  outlook(input: { years?: number } = {}) {
    const years = input.years ?? 20;
    if (!Number.isInteger(years) || years < 1 || years > 40)
      throw new Error("The outlook runs from 1 to 40 whole years.");
    // The economy opens on the game's first day; before it there is nothing to run ahead.
    if (!countryOpened(this.api)) return { opened: false as const };
    const started = Date.now();
    const result = countryOutlook(this.api, years * 12);
    const seconds = (Date.now() - started) / 1000;
    const shown = [
      ...new Set([0, 1, 5, 10, 15, 20].filter((year) => year < years)),
      years,
    ].sort((a, b) => a - b);
    const place = corePlaceByJurisdictionId(this.townId() as EntityId);
    const usps = place?.stateJurisdictionKey?.slice("US-".length);
    const own = usps ? result.states[usps] : undefined;
    return {
      opened: true as const,
      seconds,
      from: result.from,
      to: result.nation.at(-1)!.month,
      years,
      shown,
      state: usps ?? null,
      nation: shown.map((year) => result.nation[year]!),
      mine: own ? shown.map((year) => own[year]!) : [],
      states: Object.fromEntries(
        Object.entries(result.states).map(([key, points]) => [
          key,
          { first: points[0]!, last: points.at(-1)! },
        ]),
      ),
      monthsWithProblems: result.monthsWithProblems,
      problems: result.problems,
      moneyDrift: result.moneyDrift,
      couldBe: result.monthsWithProblems === 0 && result.moneyDrift < 1e-9,
    };
  }

  /**
   * Runs the world day by day until `days` have passed or the chosen event happens, whichever
   * comes first, never past `cap` days. Says why it stopped and the record ids that stopped it.
   * An event counts only where the player lives and is governed (their town, county and state,
   * the nation, their own people) unless `where` is "anywhere": the world holds every state's
   * laws and officials, and a run stopped on another state's law tells a check nothing (Fable
   * audit, Nov 9, 2026). A bill passing or failing is read from the bills themselves, since a
   * body with no executive writes no record when its bill becomes law.
   */
  runUntil(input: {
    days?: number;
    event?: RunEvent;
    /** Or any record kind an engine writes (the cause of a scene). */
    kind?: string;
    cap?: number;
    /** Law series or questions whose bills the members vote down each day, through castMemberVote. */
    defeat?: readonly string[];
    /** Stop only on an event that names this person (their death, their job loss). */
    person?: string;
    /** Stop when the player's ledger holds a moment the director reads as a cause of this situation type. */
    scene?: string;
    /** The player's own governments and people (the default), or the whole world. */
    where?: "mine" | "anywhere";
    /** Stop only on this bill (its passing or failing) or this law row (its taking effect). */
    subject?: string;
  }) {
    const cap = Math.max(1, Math.min(input.cap ?? 366, 3660));
    const limit = Math.min(input.days ?? cap, cap);
    const kinds = input.kind
      ? [input.kind]
      : input.event
        ? RUN_EVENTS[input.event]
        : undefined;
    if (
      input.event &&
      !kinds &&
      input.event !== "scene" &&
      input.event !== "may-file"
    )
      throw new Error("Unknown event.");
    const mayFile = () => playerContests(this.api).length > 0;
    const sceneType = input.scene
      ? SITUATION_LIBRARY.types.find((t) => t.key === input.scene)
      : undefined;
    if (input.scene && !sceneType) throw new Error("No such situation type.");
    const book = () =>
      this.director?.ledger.people.get(this.player?.personId ?? "");
    const momentsBefore = book()?.moments.length ?? 0;
    const causeMoment = () => {
      const b = book();
      return b && sceneType
        ? b.moments
            .slice(momentsBefore)
            .find((m) =>
              sceneType.causes.some((c) => causeMatches(c, b, m, this.core)),
            )
        : undefined;
    };
    const count = () =>
      (kinds ?? []).reduce(
        (n, kind) => n + (this.core.logByKind.get(kind)?.size ?? 0),
        0,
      );
    const sceneCount = () =>
      this.director?.ledger.people.get(this.player?.personId ?? "")?.moments
        .length ?? 0;
    const seen = new Set(
      (kinds ?? []).flatMap((kind) => [
        ...(this.core.logByKind.get(kind) ?? []),
      ]),
    );
    const mine = input.where !== "anywhere";
    const chain = has(this.core, LAWS_MODULE_ID) ? lawChain(this.api) : null;
    const town = this.townId();
    /** Whether a logged event is the one asked for: the subject, the person, and the player's own place. */
    const wanted = (id: string) => {
      const record = this.core.durableLog.get(id);
      if (!record) return false;
      const facts = (record.facts ?? {}) as Readonly<Record<string, unknown>>;
      if (input.person && !record.personIds.includes(input.person))
        return false;
      if (
        input.subject &&
        facts.lawId !== input.subject &&
        facts.billId !== input.subject &&
        facts.contestId !== input.subject
      )
        return false;
      if (!mine || input.person) return true;
      // A law's own government, where the record names one.
      if (typeof facts.jurisdiction === "string" && chain)
        return inTownChain(chain, facts.jurisdiction);
      // A race: the office it fills is not another place's.
      if (
        typeof facts.contestId === "string" &&
        has(this.core, OFFICES_MODULE_ID)
      ) {
        const contest = has(this.core, ELECTIONS_MODULE_ID)
          ? (this.api
              .moduleState(ELECTIONS_MODULE_ID)
              .table("contests")
              .get(facts.contestId) as { officeId?: string } | undefined)
          : undefined;
        const office = contest?.officeId
          ? this.api
              .moduleState(OFFICES_MODULE_ID)
              .table("offices")
              .get(contest.officeId)
          : undefined;
        if (office) return !isOutsideOffice(this.api, office);
      }
      // A person's event: someone of the player's own, or it happened in the played town.
      return (
        record.personIds.some((p) => inPlayersCircle(this.core, p)) ||
        record.placeId === town
      );
    };
    // A bill's end is read from the bills: passed into law, or ended without becoming law.
    const billEvent =
      !input.kind &&
      (input.event === "bill-passes" || input.event === "bill-fails")
        ? input.event
        : null;
    const billRows = () =>
      billEvent && has(this.core, LEGISLATURE_MODULE_ID)
        ? (this.api
            .moduleState(LEGISLATURE_MODULE_ID)
            .table("bills")
            .rows() as unknown as BillRow[])
        : [];
    const statusBefore = new Map(billRows().map((b) => [b.id, b.status]));
    const billsEnded = () => {
      const out: string[] = [];
      for (const bill of billRows()) {
        if (statusBefore.get(bill.id) === bill.status) continue;
        statusBefore.set(bill.id, bill.status);
        if (input.subject && bill.id !== input.subject) continue;
        const how = billEnding(this.api, bill.id).how;
        if (how === "pending") continue;
        if ((how === "law") !== (billEvent === "bill-passes")) continue;
        if (
          mine &&
          chain &&
          !inTownChain(chain, billJurisdiction(this.api, bill))
        )
          continue;
        out.push(bill.id);
      }
      return out;
    };
    const sceneBefore = sceneCount();
    const before = count();
    const from = this.core.date;
    let days = 0;
    let reason: "days" | "event" | "cap" = "days";
    let records: string[] = [];
    const defeated = new Set<string>();
    // A window already open stops the run before it begins: the seat is there to file for.
    if (input.event === "may-file" && mayFile())
      return {
        from,
        to: this.core.date,
        days: 0,
        reason: "event" as const,
        event: input.event,
        where:
          input.where !== "anywhere"
            ? ("mine" as const)
            : ("anywhere" as const),
        records: playerContests(this.api).map((c) => c.id),
        defeated: [] as string[],
      };
    while (days < limit) {
      if (input.defeat?.length) this.voteDown(input.defeat, defeated);
      this.advance(addDays(makeIsoDate(this.core.date), 1));
      days += 1;
      if (sceneType) {
        const found = causeMoment();
        if (found) {
          reason = "event";
          records = [found.causeId];
          break;
        }
      }
      if (input.event === "may-file" && mayFile()) {
        reason = "event";
        records = playerContests(this.api).map((c) => c.id);
        break;
      }
      if (input.event === "scene" && sceneCount() > sceneBefore) {
        reason = "event";
        break;
      }
      if (billEvent) {
        const ended = billsEnded();
        if (ended.length) {
          reason = "event";
          records = ended;
          break;
        }
      } else if (kinds && count() > before) {
        const all = kinds.flatMap((kind) => [
          ...(this.core.logByKind.get(kind) ?? []),
        ]);
        const fresh = all.filter((id) => !seen.has(id) && wanted(id));
        // An event somewhere else, or another person's, is passed over; this run waits for the one asked for.
        for (const id of all) seen.add(id);
        if (!fresh.length) continue;
        reason = "event";
        records = fresh;
        break;
      }
    }
    if (reason === "days" && (input.event || input.kind || input.scene))
      reason = "cap";
    return {
      from,
      to: this.core.date,
      days,
      reason,
      event: input.event ?? null,
      where: mine ? ("mine" as const) : ("anywhere" as const),
      records: records.slice(0, 20),
      defeated: [...defeated],
    };
  }

  /** Every member of every chamber votes no, through castMemberVote, on each open bill that changes one of these laws. */
  private voteDown(series: readonly string[], done: Set<string>) {
    if (!has(this.core, LEGISLATURE_MODULE_ID)) return;
    const api = this.api;
    const bills = api.moduleState(LEGISLATURE_MODULE_ID).table("bills");
    for (const bill of bills.rows() as unknown as BillRow[]) {
      if (bill.status !== "drafted" || done.has(bill.id)) continue;
      if (
        !bill.provisions.some((p) =>
          series.includes(p.question ?? p.series ?? ""),
        )
      )
        continue;
      for (const chamber of chambersOf(api, bill))
        for (const term of members(api, chamber))
          castMemberVote(api, bill.id, memberKey(term), "no");
      done.add(bill.id);
      this.mark("vote-down", [bill.id], { billId: bill.id });
    }
  }

  // 4. Trace --------------------------------------------------------------

  /**
   * Why a record is there: the one trace (dev-trace.ts), which finds the record wherever the game keeps
   * it and answers decided, caused, circle-only, opening, no-cause-kept or not-a-record, with the
   * records behind it. It reads only.
   */
  trace(id: string): TraceNode {
    return traceNode(this.core, this.director, id);
  }

  /**
   * What a person remembers: each event they lived through that their knowledge still holds, when
   * they learned it and when the weekly pass forgets it (the next forget day once its retention
   * window is past). The player keeps everything; a held drive keeps its source event.
   */
  memory(personId: string) {
    const core = this.core;
    const known = core.knowledgeByPerson.get(personId);
    if (!personOrFillIn(core, personId)) throw new Error("No such person.");
    const retention = parameter(
      "experiencedKeyRetentionDays",
      core.data.parameters,
    );
    const held = new Set(
      [...(core.people.get(personId)?.drives.values() ?? [])].map(
        (drive) => drive.sourceEventId,
      ),
    );
    const fadesOn = (learnedAt: string) => {
      let day = addDays(makeIsoDate(learnedAt), retention + 1);
      while (!isForgetDay(day)) day = addDays(makeIsoDate(day), 1);
      return day;
    };
    const rows = [];
    for (const [key, fact] of known ?? [])
      if (key.startsWith("event:") && key.endsWith(":experienced"))
        rows.push({
          eventId: fact.value,
          kind: core.durableLog.get(fact.value)?.kind ?? null,
          learnedAt: fact.learnedAt,
          fadesOn:
            personId === core.playerId || held.has(fact.value)
              ? null
              : fadesOn(fact.learnedAt),
          keptBy:
            personId === core.playerId
              ? "player"
              : held.has(fact.value)
                ? "drive"
                : null,
        });
    return rows.sort((a, b) => b.learnedAt.localeCompare(a.learnedAt));
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
      states: this.otherStatesByYear(),
      marks: this.marks(),
    };
  }

  /**
   * Laws other states' legislatures changed, by the year they passed: how many
   * and in how many states, with the law rows (each keeps what carried it onto
   * its session's agenda). Read from the laws engine's rows.
   */
  otherStatesByYear() {
    if (!has(this.core, "core2-laws-v1")) return [];
    const byYear = new Map<string, { ids: string[]; states: Set<string> }>();
    for (const row of this.api
      .moduleState("core2-laws-v1")
      .table("laws")
      .rows() as unknown as {
      id: string;
      jurisdiction: string;
      /** The day the row was written: the day it passed. */
      retrieved?: string;
      terms?: { session?: unknown };
    }[]) {
      if (typeof row.terms?.session !== "string" || row.jurisdiction === "US")
        continue;
      const year = String(row.retrieved ?? "").slice(0, 4);
      const kept = byYear.get(year) ?? { ids: [], states: new Set<string>() };
      byYear.set(year, kept);
      kept.ids.push(row.id);
      kept.states.add(row.jurisdiction);
    }
    return [...byYear.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, kept]) => ({
        year,
        changes: kept.ids.length,
        states: kept.states.size,
        recordIds: kept.ids,
      }));
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

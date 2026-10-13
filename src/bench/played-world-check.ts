/**
 * The played-world check (PW-1): builds the world the owner plays
 * (`buildBenchWorld`, two-level, the bench's own module list) on a seed
 * nobody chose, runs it one day at a time with no character controlled, and
 * checks from the records that the world is alive. Every PW package is
 * finished only when its letters pass here, on two fresh seeds.
 *
 * Usage:
 *   node --import tsx src/bench/played-world-check.ts --seed <hex> \
 *     [--years 1] [--opening YYYY-MM-DD] [--output summary.json]
 *
 * Each check reads records, never a screen, and names what it read. A check
 * that fails today is listed in EXPECTED_FAILURES with the package that owns
 * the fix; the run exits 1 only when a check that is not listed fails. When
 * a package turns its letter green it removes the letter from that list.
 */
import { readdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";
import { setFlagsFromString } from "node:v8";
import { runInNewContext } from "node:vm";
import { buildBenchWorld } from "./world";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import { addDays, ageOnDate, makeIsoDate } from "../simulation/dates";
import { residentCounts } from "../core2/modules/residents";
import { monthlyIncome } from "../core2/modules/credit";
import { departuresOf } from "../core2/modules/moves";
import { VIEWS_DATA } from "../core2/modules/views";
import { realLocalities } from "../core2/places";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import { selectBenchPlace } from "./place-selection.mjs";
import policies from "../../scripts/core2-guard/policies.json" with { type: "json" };
import workData from "../core2/data/work.json" with { type: "json" };
import type { CoreAPI, CoreState } from "../core2/types";

type Row = Record<string, unknown>;

/**
 * The check's own thresholds (PW-1 "Build" 2): engineering policy for the
 * gate, not population parameters.
 */
export const PLAYED_WORLD_PARAMETERS = {
  /** J: the chosen player turns 18 within this many days of the opening. */
  playerEighteenWithinDays: {
    value: 60,
    tag: "TUNABLE",
    citation:
      "PW-1 package, check J: the golden path opens on a resident about to turn 18, so turning 18 happens in play within the first two game months.",
    spread: { low: 30, high: 90, unit: "days" },
  },
  /** N: heap after month 12 against heap after month 1, after a collection. */
  heapGrowthRatio: {
    value: 1.5,
    tag: "TUNABLE",
    citation:
      "PW-1 package, check N; owner ruling Oct 12, 7:30 p.m., item 5 (running memory stays small): a year may add at most half again the first month's retained heap.",
    spread: { low: 1.2, high: 2, unit: "ratio" },
  },
} as const;

/**
 * The parameter the voting module must declare for check E: how far a
 * ballot may run against the voter's own view (0 to 2 on the view scale's
 * half-width). The voting module declares none today; PW-3 adds it.
 */
export const BALLOT_AGAINST_VIEW_PARAMETER = "votingBallotAgainstViewMax";
/** The credit module's declared debt-to-income reference (check L). */
export const CREDIT_DTI_PARAMETER = "creditDtiReferencePct";

/** Checks that fail today, by letter, with the package that owns the fix. */
export const EXPECTED_FAILURES: Readonly<Record<string, string>> = {
  C: "PW-3",
  D: "PW-3",
  F: "PW-4",
  G: "PW-4",
  I: "PW-5",
  J: "PW-6",
  K: "PW-6",
  L: "PW-7",
  M: "PW-8",
};

/** The owner of each letter today (PW-1's table). */
export const CHECK_OWNERS: Readonly<Record<string, string>> = {
  A: "PW-1",
  B: "PW-2",
  C: "PW-3",
  D: "PW-3",
  E: "PW-3",
  F: "PW-4",
  G: "PW-4",
  H: "PW-4",
  I: "PW-5",
  J: "PW-6",
  K: "PW-6",
  L: "PW-7",
  M: "PW-8",
  N: "OPUS-CORE (BOARD item 5)",
  O: "PW-1",
};

export interface CheckResult {
  letter: string;
  title: string;
  pass: boolean;
  /** What the check read and found, in one line. */
  detail: string;
  /** Record ids the result rests on (a sample when there are many). */
  records: string[];
}

export interface MonthSample {
  month: number;
  date: string;
  heapMiB: number;
  wallSeconds: number;
}

/** What the run saw: the finished world plus what only the opening shows. */
export interface PlayedWorld {
  seed: string;
  core: CoreState;
  api: CoreAPI;
  place: { key: string; name: string; state: string | null; placeId: string };
  playerId: string;
  opening: string;
  end: string;
  buildSeconds: number;
  runSeconds: number;
  /** Set when the run threw; the checks then read the world as it stood. */
  error?: string;
  samples: MonthSample[];
  /** Payroll receipts seen in the run: paid ones, and those whose pay did not reach the payee's cash. */
  payroll: { paid: number; grouped: number; short: string[] };
  start: {
    countedPeople: number;
    fullPeople: Set<string>;
    playerActs: Map<string, number>;
    cashMinor: number;
    outsideNetMinor: number;
  };
}

const SAMPLE_COUNT = 12;
const SAMPLE_LIMIT = 8;
const MIB = 1024 * 1024;
/**
 * K's routine: resting, contacting someone known, and showing up for (or
 * skipping) a shift of a job held since the opening. The shift pair is the
 * work data's own attendance choice; K asks for a choice beyond these.
 */
const ROUTINE_ACTS = new Set([
  "rest",
  "contact-known-person",
  workData.attendanceAction.id,
  workData.absenceAction.id,
]);

/** A forced collection, so a heap sample is retained memory, not garbage. */
const collect: () => void = (() => {
  const exposed = (globalThis as { gc?: () => void }).gc;
  if (exposed) return exposed;
  setFlagsFromString("--expose-gc");
  return runInNewContext("gc") as () => void;
})();

function heapMiB(): number {
  collect();
  return process.memoryUsage().heapUsed / MIB;
}

const rowsOf = (api: CoreAPI, moduleId: string, table: string): Row[] =>
  api.moduleState(moduleId).table(table).rows() as unknown as Row[];

function cashOf(core: CoreState): number {
  let total = 0;
  for (const row of core.people.values()) total += row.liquidMinor;
  for (const row of core.organizations.values()) total += row.liquidMinor;
  return total;
}

function outsideNetOf(core: CoreState): number {
  let total = 0;
  for (const row of core.cashJournal.externalFlowsByOwner.values())
    total += row.netMinor;
  return total;
}

function countedPeopleOf(core: CoreState): number {
  return residentCounts(core).reduce((n, row) => n + row.people, 0);
}

const sample = (ids: Iterable<string>): string[] =>
  [...ids].slice(0, SAMPLE_LIMIT);

/** The bench's opening date, read the way `src/bench/m0-check.ts` reads it. */
export function benchOpening(): string {
  return process.env.BENCH_CHECK_DATE ?? "2026-10-12";
}

/**
 * Builds the played world on `seed` and runs it for `years` game years, one
 * day at a time, with no character controlled. A throw is caught and kept
 * (check A reads it), so the other checks still read what the world reached.
 */
export function runPlayedWorld(
  seed: string,
  options: {
    years?: number;
    opening?: string;
    onMonth?: (sample: MonthSample) => void;
  } = {},
): PlayedWorld {
  if (!seed.trim()) throw new Error("A seed is required; there is no default.");
  const years = options.years ?? 1;
  const opening = options.opening ?? benchOpening();
  const buildStarted = performance.now();
  const world = buildBenchWorld(seed, opening, { twoLevel: true });
  const buildSeconds = (performance.now() - buildStarted) / 1000;
  const core = world.core;
  const api = coreAPI(core);
  if (!world.playerId) throw new Error("The two-level world chose no player.");
  const player = core.people.get(world.playerId)!;
  const begin = makeIsoDate(core.date);
  const end = makeIsoDate(
    `${Number(begin.slice(0, 4)) + years}${begin.slice(4)}`,
  );
  const run: PlayedWorld = {
    seed,
    core,
    api,
    place: {
      key: world.place.key,
      name: world.place.displayName,
      state: world.place.stateJurisdictionKey,
      placeId: world.placeId,
    },
    playerId: world.playerId,
    opening: begin,
    end,
    buildSeconds,
    runSeconds: 0,
    samples: [],
    payroll: { paid: 0, grouped: 0, short: [] },
    start: {
      countedPeople: countedPeopleOf(core),
      fullPeople: new Set(core.people.keys()),
      playerActs: new Map(player.actsByKind),
      cashMinor: cashOf(core),
      outsideNetMinor: outsideNetOf(core),
    },
  };
  const seen = new Set<string>(
    [...core.work.latestPayrollByJob.values()].map((row) => row.id),
  );
  const runStarted = performance.now();
  let month = 1;
  const monthAfter = (date: string) => {
    const y = Number(date.slice(0, 4)),
      m = Number(date.slice(5, 7));
    return makeIsoDate(
      m === 12
        ? `${y + 1}-01${date.slice(7)}`
        : `${y}-${String(m + 1).padStart(2, "0")}${date.slice(7)}`,
    );
  };
  let nextSample = monthAfter(begin);
  try {
    for (let day = begin; day < end;) {
      day = addDays(day, 1);
      advanceCore(core, day);
      watchPayroll(core, run.payroll, seen);
      if (day >= nextSample || day >= end) {
        const row: MonthSample = {
          month,
          date: day,
          heapMiB: Math.round(heapMiB()),
          wallSeconds: Math.round((performance.now() - runStarted) / 100) / 10,
        };
        run.samples.push(row);
        options.onMonth?.(row);
        month += 1;
        nextSample = monthAfter(nextSample);
      }
    }
  } catch (error) {
    run.error =
      error instanceof Error ? (error.stack ?? error.message) : String(error);
  }
  run.runSeconds = (performance.now() - runStarted) / 1000;
  return run;
}

/**
 * Each job keeps only its latest payroll receipt, so the run reads them after
 * every day. A single receipt carries the payee's cash before and after; a
 * group payroll's component carries none and is counted, not judged.
 */
function watchPayroll(
  core: CoreState,
  payroll: PlayedWorld["payroll"],
  seen: Set<string>,
): void {
  for (const row of core.work.latestPayrollByJob.values()) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    if (!(row.paidMinor > 0)) continue;
    payroll.paid += 1;
    if ("groupReceiptId" in row) {
      payroll.grouped += 1;
      continue;
    }
    if (row.payeeCashAfterMinor - row.payeeCashBeforeMinor < row.paidMinor)
      payroll.short.push(row.id);
  }
}

// ---------------------------------------------------------------- the checks

type Check = (world: PlayedWorld) => Omit<CheckResult, "letter" | "title">;

const inRun = (world: PlayedWorld, date: unknown) =>
  typeof date === "string" && date > world.opening && date <= world.end;

/** A: the run completes the year without throwing. */
const checkA: Check = (world) => ({
  pass: !world.error && world.core.date >= world.end,
  detail: world.error
    ? `threw on ${world.core.date}: ${world.error.split("\n")[0]}`
    : `ran ${world.opening} to ${world.core.date} in ${world.runSeconds.toFixed(0)} s`,
  records: [`core.date:${world.core.date}`],
});

/** Every CoreModule a module file exports: objects with an id and module parts. */
const MODULE_PARTS = [
  "state",
  "onDay",
  "onCalendarWork",
  "onAfterDay",
  "onEvent",
  "eventKinds",
  "onWorkPayroll",
  "onWorkResult",
  "onWorkAttendance",
  "onSalesReceipt",
  "reasonProviders",
  "journalSourceProviders",
  "needEvaluators",
  "offerProviders",
  "effectHandlers",
  "eligibilityRules",
];
function moduleIdsOf(exports: Record<string, unknown>): string[] {
  const ids = new Set<string>();
  for (const value of Object.values(exports).flatMap((row) =>
    Array.isArray(row) ? row : [row],
  )) {
    if (!value || typeof value !== "object") continue;
    const row = value as Row;
    if (typeof row.id === "string" && MODULE_PARTS.some((key) => key in row))
      ids.add(row.id);
  }
  return [...ids];
}

const MODULES_DIRECTORY = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../core2/modules",
);
const EXEMPTIONS_FILE = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../core2/data/played-world-exemptions.json",
);

/** The module files and the module ids each exports (by import, not by regex). */
export async function moduleFiles(): Promise<
  { file: string; ids: string[] }[]
> {
  const files = readdirSync(MODULES_DIRECTORY)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .sort();
  const out: { file: string; ids: string[] }[] = [];
  for (const name of files) {
    const exports = (await import(
      pathToFileURL(join(MODULES_DIRECTORY, name)).href
    )) as Record<string, unknown>;
    out.push({ file: `src/core2/modules/${name}`, ids: moduleIdsOf(exports) });
  }
  return out;
}

/** Exemptions PW-2 writes: file or module id to a non-empty reason. */
function exemptions(): Map<string, string> {
  if (!existsSync(EXEMPTIONS_FILE)) return new Map();
  const document = JSON.parse(readFileSync(EXEMPTIONS_FILE, "utf8")) as
    Record<string, unknown> | Row[];
  const rows: Row[] = Array.isArray(document)
    ? document
    : Array.isArray((document as Row).exemptions)
      ? ((document as Row).exemptions as Row[])
      : Object.entries(document).map(([id, reason]) => ({ id, reason }));
  const out = new Map<string, string>();
  for (const row of rows) {
    const reason = typeof row.reason === "string" ? row.reason.trim() : "";
    const key = String(row.id ?? row.moduleId ?? row.file ?? "");
    if (key && reason) out.set(key, reason);
  }
  return out;
}

/** B: every module file is installed or exempted with a reason. */
function checkB(files: { file: string; ids: string[] }[]): Check {
  return (world) => {
    const exempt = exemptions();
    const missing: string[] = [];
    // A file that exports no CoreModule is a library, not an engine.
    const libraries = files.filter((row) => !row.ids.length);
    for (const { file, ids } of files) {
      const name = basename(file, ".ts");
      if (exempt.has(file) || exempt.has(name)) continue;
      for (const id of ids)
        if (!world.core.modules.has(id) && !exempt.has(id))
          missing.push(`${id} (${file})`);
    }
    return {
      pass: !missing.length,
      detail: missing.length
        ? `${missing.length} module(s) neither installed nor exempted: ${missing.join(", ")} (libraries with no module: ${libraries.map((row) => row.file).join(", ") || "none"})`
        : `all ${files.length - libraries.length} module files installed or exempted`,
      records: sample(missing),
    };
  };
}

/** C: a named adult weighed running, and someone decided to run. */
const checkC: Check = (world) => {
  const decisions = rowsOf(world.api, "candidacy", "decisions").filter((row) =>
    inRun(world, row.date),
  );
  const adults = decisions.filter((row) => {
    const person = world.core.people.get(String(row.personId));
    return (
      person &&
      ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(String(row.date))) >=
        18
    );
  });
  const ran = adults.filter((row) => row.run === true);
  return {
    pass: adults.length > 0 && ran.length > 0,
    detail: `candidacy decisions table: ${decisions.length} decisions in the run, ${adults.length} by named adults, ${ran.length} to run`,
    records: sample([...ran, ...adults].map((row) => String(row.id))),
  };
};

interface Contest {
  id: string;
  officeId: string;
  level: string;
  title: string;
  electionDate: string;
  incumbentTermId?: string;
}
const contestsOf = (world: PlayedWorld): Contest[] =>
  rowsOf(world.api, "core2-elections-v1", "contests") as unknown as Contest[];
const resultOfContest = (world: PlayedWorld, contestId: string) =>
  world.api
    .moduleState("core2-voting-v1")
    .table("results")
    .get(`result:${contestId}`) as unknown as
    | {
        id: string;
        date: string;
        totals: Record<string, number>;
        takesOffice: string | null;
      }
    | undefined;
const LOCAL = (level: string) => level !== "federal" && level !== "state";

/** D: in the first local contest of the run, counted votes exceed the named voters. */
const checkD: Check = (world) => {
  const held = contestsOf(world)
    .filter((c) => LOCAL(c.level))
    .map((c) => ({ c, result: resultOfContest(world, c.id) }))
    .filter((row) => row.result && inRun(world, row.result.date))
    .sort(
      (a, b) =>
        a.result!.date.localeCompare(b.result!.date) ||
        a.c.id.localeCompare(b.c.id),
    );
  const first = held[0];
  if (!first)
    return {
      pass: false,
      detail: "no local contest was decided in the run",
      records: [],
    };
  const total = Object.values(first.result!.totals).reduce((n, v) => n + v, 0);
  const named = (
    world.api
      .moduleState("core2-voting-v1")
      .table("ballots")
      .query("byContest", [first.c.id]) as unknown as Row[]
  ).filter(
    (row) => row.voted === true && world.core.people.has(String(row.voterId)),
  );
  return {
    pass: total > named.length,
    detail: `${first.c.title} (${first.result!.date}): ${total} votes counted, ${named.length} ballots cast by named people`,
    records: [first.c.id, first.result!.id],
  };
};

/** E: no named voter's ballot runs against their own view past the voting module's limit. */
const checkE: Check = (world) => {
  const limitRow = world.core.data.parameters[BALLOT_AGAINST_VIEW_PARAMETER];
  const views = new Map(
    rowsOf(world.api, "views", "people").map((row) => [
      String(row.id),
      Number(row.lean),
    ]),
  );
  const leanMax = VIEWS_DATA.parameters.leanMax!.value;
  const sides = new Map(
    rowsOf(world.api, "core2-parties-v1", "parties").map((row) => [
      String(row.name),
      Number(row.side),
    ]),
  );
  const filings = new Map(
    rowsOf(world.api, "core2-elections-v1", "filings").map((row) => [
      `${String(row.contestId)}:${String(row.personId)}`,
      row,
    ]),
  );
  // How far a ballot runs against the voter's view: the chosen candidate's
  // party side against the voter's lean, 0 (agrees or no side) to 2.
  const against: { id: string; by: number }[] = [];
  let judged = 0;
  for (const row of rowsOf(world.api, "core2-voting-v1", "ballots")) {
    if (row.voted !== true || !row.choice || !inRun(world, row.date)) continue;
    const lean = views.get(String(row.voterId));
    if (lean === undefined || !world.core.people.has(String(row.voterId)))
      continue;
    const filing = filings.get(
      `${String(row.contestId)}:${String(row.choice)}`,
    );
    const party = filing?.party ? String(filing.party) : null;
    const side = party
      ? ([...sides].find(
          ([name]) => name === party || party.startsWith(name),
        )?.[1] ?? 0)
      : 0;
    if (!side) continue;
    judged += 1;
    const by = Math.max(0, -side * lean);
    if (by > 0) against.push({ id: String(row.id), by: by / leanMax });
  }
  against.sort((a, b) => b.by - a.by);
  if (!limitRow)
    return {
      pass: false,
      detail: `the voting module declares no ${BALLOT_AGAINST_VIEW_PARAMETER} parameter; of ${judged} party ballots by named voters with a view, ${against.length} chose the side against their lean (largest ${(against[0]?.by ?? 0).toFixed(2)} of the scale's half-width)`,
      records: sample(against.map((row) => row.id)),
    };
  const over = against.filter((row) => row.by > limitRow.value);
  return {
    pass: !over.length,
    detail: `${over.length} of ${judged} party ballots by named voters ran against their view past ${limitRow.value}`,
    records: sample(over.map((row) => row.id)),
  };
};

/** F: federal income tax and Social Security are withheld in the second calendar year. */
const checkF: Check = (world) => {
  const january = `${Number(world.opening.slice(0, 4)) + 1}-01-01`;
  const rows = rowsOf(world.api, "core2-budgets-v1", "withholding").filter(
    (row) => String(row.date) > january && String(row.date) <= world.end,
  );
  const both = rows.filter((row) => {
    const lines = (row.lines ?? []) as {
      level: string;
      tax: string;
      minor: number;
    }[];
    const has = (tax: string) =>
      lines.some((l) => l.level === "federal" && l.tax === tax && l.minor > 0);
    return has("income") && has("social-security");
  });
  if (january > world.end)
    return {
      pass: false,
      detail: `the run ended ${world.end}, before ${january}`,
      records: [],
    };
  return {
    pass: both.length > 0,
    detail: `${rows.length} payroll withholding records after ${january}; ${both.length} withheld both federal income tax and Social Security`,
    records: sample((both.length ? both : rows).map((row) => String(row.id))),
  };
};

/** G: a law paid or served a named resident; every law in force reached someone. */
const checkG: Check = (world) => {
  const named = new Set(world.core.people.keys());
  // Payments and services with a law as their source: law reach B's named
  // rows of kind payment or service, and law effects of those kinds.
  const served = [
    ...rowsOf(world.api, "core2-law-reach-b-v1", "people"),
    ...rowsOf(world.api, "core2-law-effects-v1", "applied"),
  ].filter(
    (row) =>
      /payment|service|benefit/.test(String(row.kind)) &&
      named.has(String(row.personId)) &&
      (row.endedOn === null ||
        row.endedOn === undefined ||
        String(row.endedOn) > world.opening),
  );
  const lawsInForce = rowsOf(world.api, "core2-laws-v1", "laws").filter(
    (row) =>
      (row.ends === undefined ||
        row.ends === null ||
        String(row.ends) > world.core.date) &&
      (row.endedOn === undefined ||
        row.endedOn === null ||
        String(row.endedOn) > world.core.date),
  );
  const reached = new Set<string>();
  const add = (row: Row, count = 1) => {
    if (row.lawId && count > 0) reached.add(String(row.lawId));
  };
  for (const row of rowsOf(world.api, "core2-law-effects-v1", "applied"))
    add(row);
  for (const row of rowsOf(world.api, "core2-law-reach-a-v1", "reach"))
    add(row, Number(row.count ?? 1));
  for (const row of rowsOf(world.api, "core2-law-reach-b-v1", "people"))
    add(row);
  for (const row of rowsOf(world.api, "core2-law-reach-b-v1", "organizations"))
    add(row);
  for (const row of rowsOf(world.api, "core2-law-reach-b-v1", "groups"))
    add(row, Number(row.reached ?? 0));
  for (const row of rowsOf(world.api, "core2-law-reach-b-v1", "taken"))
    add(row);
  const noLocalEffect = new Set(
    rowsOf(world.api, "core2-laws-v1", "laws")
      .filter((row) => row.noLocalEffect === true)
      .map((row) => String(row.id)),
  );
  const unreached = lawsInForce.filter((row) => {
    const id = String(row.id);
    return !reached.has(id) && !noLocalEffect.has(id);
  });
  return {
    pass: served.length > 0 && unreached.length === 0,
    detail: `${served.length} payment or service records under a law to named residents (${
      [
        ...new Set(
          served.map((row) => `${String(row.kind)} ${String(row.lawId)}`),
        ),
      ]
        .slice(0, SAMPLE_LIMIT)
        .join("; ") || "none"
    }); ${unreached.length} of ${lawsInForce.length} laws in force reached no resident, business or budget line and carry no "no local effect" row`,
    records: sample([
      ...served.map((row) => String(row.id)),
      ...unreached.map((row) => String(row.id)),
    ]),
  };
};

/**
 * H: a budget bill passed in the run changed a spending line it names. A
 * line moved only by a law's own amendment (a pension schedule) does not
 * count: the bill's provision must reach the adopted budget.
 */
const checkH: Check = (world) => {
  const budgets = rowsOf(world.api, "core2-budgets-v1", "budgets");
  const passed = rowsOf(world.api, "core2-legislature-v1", "bills").filter(
    (bill) =>
      bill.kind === "budget" &&
      bill.status === "enacted" &&
      inRun(world, bill.introduced),
  );
  const lines = (bill: Row) =>
    (
      (bill.provisions ?? []) as {
        kind: string;
        line?: string;
        value: number;
      }[]
    )
      .filter((row) => row.kind === "budget-line" && row.line && row.value)
      .map((row) => row.line!);
  const withLines = passed.filter((bill) => lines(bill).length);
  // Bill numbers repeat across governments, so a bill counts as reaching
  // spending when a budget adopted under its number moved one of its lines.
  const reached = withLines.filter((bill) =>
    budgets.some((adopted) => {
      if (
        String(adopted.adoptedOn) < String(bill.introduced) ||
        !String(adopted.adoptedBy).includes(`, ${String(bill.number)}`)
      )
        return false;
      const before = budgets
        .filter(
          (other) =>
            other.governmentId === adopted.governmentId &&
            Number(other.fiscalYear) < Number(adopted.fiscalYear),
        )
        .sort((a, b) => Number(b.fiscalYear) - Number(a.fiscalYear))[0];
      if (!before) return false;
      const a = (before.spendingMinor ?? {}) as Record<string, number>,
        b = (adopted.spendingMinor ?? {}) as Record<string, number>;
      return lines(bill).some((line) => (a[line] ?? 0) !== (b[line] ?? 0));
    }),
  );
  return {
    pass: reached.length > 0,
    detail: `${passed.length} budget bills enacted in the run, ${withLines.length} with line changes; ${reached.length} moved a line they name in the adopted budget`,
    records: sample(
      (reached.length ? reached : withLines.length ? withLines : passed).map(
        (row) => String(row.id),
      ),
    ),
  };
};

/** I: terms end on time, movers give up their seats, and take-office dates follow the office's term rule. */
const checkI: Check = (world) => {
  const today = world.core.date;
  const terms = rowsOf(world.api, "core2-offices-v1", "terms");
  const overdue = terms.filter(
    (row) =>
      row.status === "serving" &&
      typeof row.endDate === "string" &&
      row.endDate < today,
  );
  const movers = new Set(
    departuresOf(world.api)
      .filter((row) => inRun(world, row.date))
      .flatMap((row) => [row.personId, ...row.withIds]),
  );
  const movedServing = terms.filter(
    (row) => row.status === "serving" && movers.has(String(row.personId)),
  );
  const offices = new Map(
    rowsOf(world.api, "core2-offices-v1", "offices").map((row) => [
      String(row.id),
      row,
    ]),
  );
  // The office's term rule: a new term starts on the office's term-start
  // day (month and day, from the office's data row) after the election.
  const misdated: string[] = [];
  for (const contest of contestsOf(world)) {
    const result = resultOfContest(world, contest.id);
    if (!result || !inRun(world, result.date) || !result.takesOffice) continue;
    const starts = String(offices.get(contest.officeId)?.termStarts ?? "01-01");
    const year = Number(contest.electionDate.slice(0, 4));
    const sameYear = `${year}-${starts}`;
    const expected =
      sameYear > contest.electionDate ? sameYear : `${year + 1}-${starts}`;
    if (result.takesOffice !== expected)
      misdated.push(
        `${contest.id} (takes office ${result.takesOffice}, rule gives ${expected})`,
      );
  }
  return {
    pass: !overdue.length && !movedServing.length && !misdated.length,
    detail: `${overdue.length} terms still serving past their end date; ${movedServing.length} officials serving after moving away; ${misdated.length} contests with a take-office date off the office's term rule`,
    records: sample([
      ...overdue.map((row) => String(row.id)),
      ...movedServing.map((row) => String(row.id)),
      ...misdated,
    ]),
  };
};

/** J: the player turns 18 in play, within the first weeks of the run. */
const checkJ: Check = (world) => {
  const person = world.core.people.get(world.playerId)!;
  const birth = makeIsoDate(person.birthDate);
  const eighteenth = makeIsoDate(
    `${Number(birth.slice(0, 4)) + 18}${birth.slice(4)}`,
  );
  const latest = addDays(
    makeIsoDate(world.opening),
    PLAYED_WORLD_PARAMETERS.playerEighteenWithinDays.value,
  );
  return {
    pass: eighteenth > world.opening && eighteenth <= latest,
    detail: `the player ${world.playerId} was born ${birth} and turns 18 on ${eighteenth}; the opening is ${world.opening}`,
    records: [world.playerId],
  };
};

/** K: the uncontrolled player made a choice beyond rest and contacting someone known. */
const checkK: Check = (world) => {
  const person = world.core.people.get(world.playerId)!;
  const chose: string[] = [];
  for (const [act, count] of person.actsByKind)
    if (
      !ROUTINE_ACTS.has(act) &&
      count > (world.start.playerActs.get(act) ?? 0)
    )
      chose.push(act);
  const all = [...person.actsByKind]
    .map(
      ([act, count]) =>
        `${act} ${count - (world.start.playerActs.get(act) ?? 0)}`,
    )
    .join(", ");
  return {
    pass: chose.length > 0,
    detail: `the player's acts in the run: ${all || "none"}`,
    records: [world.playerId, ...chose],
  };
};

/** L: pay reaches accounts, loans fit incomes, owners draw, homes have values. */
const checkL: Check = (world) => {
  const problems: string[] = [];
  const records: string[] = [];
  // Pay: every payroll receipt that paid something put the whole amount in
  // the payee's own cash (the receipts the run watched day by day).
  const pay = world.payroll;
  if (pay.short.length || !pay.paid)
    problems.push(
      `${pay.short.length} of ${pay.paid} paid payroll receipts did not raise the payee's cash by the amount paid`,
    );
  records.push(...sample(pay.short));
  // Loans: monthly payment against the household's monthly income, past the
  // credit module's declared debt-to-income reference.
  const reference = world.api.parameter(CREDIT_DTI_PARAMETER);
  const loans = rowsOf(world.api, "credit", "loans").filter((row) =>
    inRun(world, row.openedAt),
  );
  const oversized = loans.filter((row) => {
    const household = world.core.households.get(String(row.householdId));
    const income = household
      ? monthlyIncome(world.api, household.memberIds)
      : 0;
    const payment = Number(row.paymentMinor ?? 0);
    return income > 0 ? (100 * payment) / income > reference : payment > 0;
  });
  if (oversized.length)
    problems.push(
      `${oversized.length} of ${loans.length} loans opened in the run pay more than ${reference}% of the borrower's household income`,
    );
  records.push(...sample(oversized.map((row) => String(row.id))));
  // Owner draws: every owner-run firm that is open drew or recorded why not.
  const draws = rowsOf(world.api, "business", "draws").filter((row) =>
    inRun(world, row.date),
  );
  const drew = new Set(draws.map((row) => String(row.organizationId)));
  const owners = rowsOf(world.api, "business", "owners").filter(
    (row) =>
      world.core.people.has(String(row.ownerId)) &&
      world.core.organizations.has(String(row.id)),
  );
  const silent = owners.filter((row) => !drew.has(String(row.id)));
  if (silent.length)
    problems.push(
      `${silent.length} of ${owners.length} owner-run firms recorded no owner draw`,
    );
  records.push(...sample(silent.map((row) => String(row.id))));
  // Homes: no occupied dwelling is worth $0.
  const dwellings = rowsOf(world.api, "housing", "dwellings").filter(
    (row) => row.tenure !== "removed",
  );
  const unpriced = dwellings.filter((row) =>
    row.tenure === "rent" ? !Number(row.rentMinor) : !Number(row.valueMinor),
  );
  if (unpriced.length || !dwellings.length)
    problems.push(
      `${unpriced.length} of ${dwellings.length} occupied dwellings have a $0 value or rent`,
    );
  records.push(...sample(unpriced.map((row) => String(row.id))));
  return {
    pass: !problems.length,
    detail: `${[
      `${pay.paid} paid payroll receipts (${pay.grouped} in group payrolls), ${loans.length} loans opened, ${owners.length} owner-run firms with ${draws.length} draws, ${dwellings.length} occupied dwellings`,
      ...problems,
    ].join("; ")}`,
    records,
  };
};

/** M: a birth in the run, and the counted population moved. */
const checkM: Check = (world) => {
  const births = rowsOf(world.api, "core2-renewal-v1", "births").filter((row) =>
    inRun(world, row.date),
  );
  // People filled in from the counts left the counts without leaving town.
  const filledIn = [...world.core.people.keys()].filter(
    (id) => !world.start.fullPeople.has(id),
  ).length;
  const countedEnd = countedPeopleOf(world.core);
  const change =
    countedEnd + filledIn - births.length - world.start.countedPeople;
  return {
    pass: births.length > 0 && change !== 0,
    detail: `${births.length} births in the run; counted population ${world.start.countedPeople} at the opening and ${countedEnd} at the end, with ${filledIn} new full people (filled in or born): ${change} changed by counted births, deaths and moves`,
    records: sample(births.map((row) => String(row.id))),
  };
};

/** N: retained heap stays bounded over the year. */
const checkN: Check = (world) => {
  const first = world.samples[0];
  const last = world.samples.at(-1);
  const twelfth =
    world.samples.find((row) => row.month === SAMPLE_COUNT) ?? last;
  const ratio = PLAYED_WORLD_PARAMETERS.heapGrowthRatio.value;
  const cap = policies.nodeHeapMiB;
  if (!first || !twelfth)
    return { pass: false, detail: "no monthly samples", records: [] };
  return {
    pass: twelfth.heapMiB < ratio * first.heapMiB && twelfth.heapMiB < cap,
    detail: `heap after month 1 ${first.heapMiB} MiB, after month ${twelfth.month} ${twelfth.heapMiB} MiB (limit ${Math.round(ratio * first.heapMiB)} MiB, cap ${cap} MiB)`,
    records: [`sample:${first.date}`, `sample:${twelfth.date}`],
  };
};

/** O: every dollar balances: named cash moves only by recorded outside flows. */
const checkO: Check = (world) => {
  const cash = cashOf(world.core);
  const outside = outsideNetOf(world.core) - world.start.outsideNetMinor;
  // An outside flow's net is what left town (negative when money came in).
  const expected = world.start.cashMinor - outside;
  const gap = cash - expected;
  return {
    pass: gap === 0,
    detail: `cash of people and organizations ${world.start.cashMinor} at the opening, ${cash} at the end; outside flows net ${outside}; unexplained ${gap} (minor units)`,
    records: ["core.cashJournal.externalFlowsByOwner"],
  };
};

export const CHECK_TITLES: Readonly<Record<string, string>> = {
  A: "The run completes the year without throwing",
  B: "Every module is installed or exempted with a reason",
  C: "A named adult decided whether to run, and someone ran",
  D: "Counted voters vote in the first local contest",
  E: "No ballot runs against the voter's view past the voting limit",
  F: "Federal income tax and Social Security are withheld in the second year",
  G: "A law paid or served a resident; every law in force reached someone",
  H: "A passed budget bill changed a spending line it names",
  I: "Terms end, movers leave office, take-office dates follow the term rule",
  J: "The player turns 18 in play",
  K: "The uncontrolled player chose more than rest, contact and their usual shifts",
  L: "Pay reaches accounts, loans fit incomes, owners draw, homes have values",
  M: "A birth, and the counted population changes",
  N: "Memory stays bounded over the year",
  O: "Every dollar balances",
};

/** Runs every check on a finished world. */
export async function checkPlayedWorld(
  world: PlayedWorld,
): Promise<CheckResult[]> {
  const checks: Record<string, Check> = {
    A: checkA,
    B: checkB(await moduleFiles()),
    C: checkC,
    D: checkD,
    E: checkE,
    F: checkF,
    G: checkG,
    H: checkH,
    I: checkI,
    J: checkJ,
    K: checkK,
    L: checkL,
    M: checkM,
    N: checkN,
    O: checkO,
  };
  return Object.entries(checks).map(([letter, check]) => {
    try {
      return { letter, title: CHECK_TITLES[letter]!, ...check(world) };
    } catch (error) {
      return {
        letter,
        title: CHECK_TITLES[letter]!,
        pass: false,
        detail: `the check threw: ${error instanceof Error ? error.message : String(error)}`,
        records: [],
      };
    }
  });
}

/** The JSON summary the script writes. */
export function summaryOf(world: PlayedWorld, results: CheckResult[]) {
  return {
    schema: "played-world-check-v1",
    seed: world.seed,
    place: world.place,
    playerId: world.playerId,
    opening: world.opening,
    end: world.end,
    reached: world.core.date,
    buildSeconds: Math.round(world.buildSeconds),
    runSeconds: Math.round(world.runSeconds),
    error: world.error ?? null,
    samples: world.samples,
    checks: results.map((row) => ({
      ...row,
      owner: CHECK_OWNERS[row.letter],
      expectedFailure: row.letter in EXPECTED_FAILURES,
    })),
  };
}

function argument(args: string[], flag: string): string | undefined {
  const at = args.indexOf(flag);
  return at >= 0 ? args[at + 1] : undefined;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const seed = argument(args, "--seed");
  if (!seed) {
    console.error(
      "Usage: node --import tsx src/bench/played-world-check.ts --seed <hex> [--years 1] [--opening YYYY-MM-DD] [--output path]",
    );
    process.exitCode = 2;
    return;
  }
  const years = Number(argument(args, "--years") ?? 1);
  const opening = argument(args, "--opening");
  const output = argument(args, "--output");
  // The first line names the town, drawn the way the bench draws it.
  const place = selectBenchPlace(
    seed,
    lifePlaceStateIdentities(),
    realLocalities(),
  );
  console.log(
    `place ${place.key} ${place.displayName}, ${place.stateJurisdictionKey}; seed ${seed}`,
  );
  const world = runPlayedWorld(seed, {
    years,
    ...(opening ? { opening } : {}),
    onMonth: (row) =>
      console.log(
        `month ${row.month} ${row.date}: heap ${row.heapMiB} MiB, ${row.wallSeconds} s`,
      ),
  });
  console.log(
    `built in ${world.buildSeconds.toFixed(0)} s; ran ${world.opening} to ${world.core.date} in ${world.runSeconds.toFixed(0)} s`,
  );
  const results = await checkPlayedWorld(world);
  let unexpected = 0;
  for (const row of results) {
    const expected = EXPECTED_FAILURES[row.letter];
    const verdict = row.pass
      ? expected
        ? `PASS (listed as an expected failure for ${expected}: remove it)`
        : "PASS"
      : expected
        ? `FAIL (expected; ${expected})`
        : "FAIL";
    if (!row.pass && !expected) unexpected += 1;
    console.log(`${row.letter} ${verdict}: ${row.title}. ${row.detail}`);
    if (row.records.length) console.log(`  records: ${row.records.join(", ")}`);
  }
  if (output)
    writeFileSync(
      output,
      JSON.stringify(summaryOf(world, results), null, 2) + "\n",
    );
  process.exitCode = unexpected ? 1 : 0;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

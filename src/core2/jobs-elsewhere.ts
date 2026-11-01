/**
 * Working lives elsewhere (owner, Nov 1, 2026: "EVERY. LIFE. IS. SIMULATED.
 * ... THIS IS LOW INTENSITY STUFF."). A relative or town leaver living in
 * another place (`livesElsewhere`, the inactive tier) works, loses work, finds
 * work, moves to another job and retires by the same quarterly pulls the
 * pre-start working life runs on (src/core2/past-work.ts): JOLTS layoffs and
 * quits and CPS spells out of work, moved by their state's unemployment this
 * month, their age and their traits' leans in the jobs engine's own
 * decisions. The jobs engine reviews them once a month on its own review day;
 * a pull adds up and the change happens when it reaches one whole, never by a
 * roll. A layoff is the jobs engine's own `work.job-lost` event; a job begun,
 * a move to another job and a retirement are `person.work-spell` events, the
 * same facts as the pre-start spell's. Their relatives in town witness each.
 *
 * Who is working on day one is generation of who exists: each person's own
 * seeded line read against the CPS 2024 employment and participation rates
 * for their age, so the rates hold over everyone and nobody's line is a draw
 * of what they do. The opening's place along each pull is seeded the same
 * way, as the moves engine spreads the town's.
 *
 * No firm is kept outside the town, so no employer is named
 * (SG-LIVES-work-no-employer); people out of the labor force stay out until
 * they reach the age of retiring (SG-LIVES-work-out-of-labor-force). Nothing
 * here moves money: a husk keeps no accounts (two-level population).
 */
import jobRows from "./data/jobs/parameters.json" with { type: "json" };
import epop from "../../data/research/labor/cps-2024-employment-by-age.json" with { type: "json" };
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { SeededRng } from "./kernel/rng";
import {
  coreStateKeyOfJurisdictionId,
  corePlaceByJurisdictionId,
} from "./place-lookup";
import {
  findPerQuarter,
  layoffPerQuarter,
  PAST_WORK_SPELL,
  quitPerQuarter,
  workAgeFactor,
  workLeans,
} from "./past-work";
import { stateUnemployment } from "./modules/counted-moves";
import { livesElsewhere } from "./modules/moves";
import { DEFAULT_HEALTH_DATA, severityImpulse } from "./modules/health";
import type { EntityId } from "./kernel/brands";
import type {
  CoreAPI,
  CoreState,
  PersonId,
  PersonState,
  Source,
} from "./types";

export const WORK_ELSEWHERE_FACT = "work:elsewhere";
const JOBS_MODULE_ID = "jobs";
const NO_EMPLOYER_STOPGAP = "SG-LIVES-work-no-employer";
export const WORK_ELSEWHERE_TABLE = "elsewhere";
const OUT_OF_LABOR_FORCE_STOPGAP = "SG-LIVES-work-out-of-labor-force";
const STATE_ROW = "lives-work:state";

const CPS = epop as unknown as {
  ageBands: readonly string[];
  employedPctByAge: Readonly<Record<string, number>>;
  laborForcePctByAge: Readonly<Record<string, number>>;
};

type Status = "employed" | "looking" | "out" | "retired";

interface WorkRow {
  id: PersonId;
  status: Status;
  since: string;
  layoffPull: number;
  quitPull: number;
  findPull: number;
  retirePull: number;
}

interface StateRow {
  id: string;
  /** Each state's unemployment at the first review (the run's mean), by USPS. */
  reference: Record<string, number>;
  /** Each state's last four months of unemployment, oldest first. */
  recent: Record<string, number[]>;
}

const JOB_PARAMETERS = jobRows as unknown as Readonly<
  Record<string, { value: number }>
>;

/** The jobs engine's own parameter, read from its table (installed or not). */
function jobsParameter(api: CoreAPI, key: string): number {
  return JOB_PARAMETERS[key]?.value ?? api.parameter(key);
}

function table(api: CoreAPI) {
  return api.moduleState(JOBS_MODULE_ID).table(WORK_ELSEWHERE_TABLE);
}

function bandOf(age: number): string | undefined {
  for (const band of CPS.ageBands) {
    const [low, high] = band.replace("+", "-").split("-");
    if (age >= Number(low) && (!high || age <= Number(high))) return band;
  }
  return undefined;
}

/** The state a person living elsewhere lives in, as a USPS code. */
function uspsOf(placeId: string): string | undefined {
  const key =
    corePlaceByJurisdictionId(placeId as EntityId)?.stateJurisdictionKey ??
    coreStateKeyOfJurisdictionId(placeId);
  return key ? key.replace(/^US-/, "") : undefined;
}

/** The nation's unemployment this month, from the economy engine. */
function nationalUnemployment(api: CoreAPI): number | undefined {
  if (!api.state.modules.has("macro")) return undefined;
  const latest = (
    api.moduleState("macro").table("state").get("macro:state") as
      { latestMonth?: string } | undefined
  )?.latestMonth;
  const row = latest
    ? (api.moduleState("macro").table("months").get(`macro-month:${latest}`) as
        { unemploymentPct?: number } | undefined)
    : undefined;
  return row?.unemploymentPct;
}

/** Day one: working, looking or out, from the person's own seeded line against CPS 2024 for their age. */
function opening(
  api: CoreAPI,
  person: Readonly<PersonState>,
  age: number,
): WorkRow {
  const rng = new SeededRng(api.state.seed).fork(`lives-work:${person.id}`);
  const line = rng.next();
  const band = bandOf(age);
  const hundred = api.parameter("percent");
  const employed = band ? CPS.employedPctByAge[band]! / hundred : 0;
  const inForce = band ? CPS.laborForcePctByAge[band]! / hundred : 0;
  const status: Status =
    line < employed
      ? "employed"
      : line < inForce
        ? "looking"
        : age >= jobsParameter(api, "jobsEarliestRetirementAge")
          ? "retired"
          : "out";
  // Where they stand along each pull on day one: years already worked or
  // looked, seeded the same way.
  return {
    id: person.id,
    status,
    since: api.state.date,
    layoffPull: rng.fork("layoff").next(),
    quitPull: rng.fork("quit").next(),
    findPull: rng.fork("find").next(),
    retirePull: rng.fork("retire").next(),
  };
}

/** Their relatives in the played town (full people), who hear of it. */
function witnessesOf(api: CoreAPI, person: Readonly<PersonState>): PersonId[] {
  const core = api.state as CoreState;
  return [...person.familyIds]
    .filter((id) => {
      const other = core.people.get(id);
      return (
        other?.alive && !livesElsewhere(core, other) && other.tier !== "husk"
      );
    })
    .sort();
}

function source(api: CoreAPI, citation: string): Source {
  return {
    tag: "ESTIMATED",
    asOf: api.state.date,
    citation,
    estimatedFrom:
      "The working life of someone living elsewhere: the pre-start run's quarterly pulls (JOLTS layoffs and quits, CPS spells out of work), their state's unemployment, their age and their traits' leans in the jobs engine's decisions.",
  };
}

function spellEvent(
  api: CoreAPI,
  person: Readonly<PersonState>,
  facts: Record<string, string>,
  citation: string,
): void {
  api.stopgap(NO_EMPLOYER_STOPGAP);
  const id = `${PAST_WORK_SPELL}:${person.id}:${api.state.date}`;
  api.emit({
    id,
    date: api.state.date,
    kind: PAST_WORK_SPELL,
    personIds: [person.id],
    witnessIds: witnessesOf(api, person),
    placeId: person.placeId,
    publicRecord: false,
    source: source(api, citation),
    facts: { ...facts, [WORK_ELSEWHERE_FACT]: person.placeId },
  });
}

function lostWork(api: CoreAPI, person: Readonly<PersonState>): void {
  api.stopgap(NO_EMPLOYER_STOPGAP);
  api.emit({
    id: `event:work.job-lost:${api.state.date}:elsewhere:${person.id}`,
    date: api.state.date,
    kind: "work.job-lost",
    personIds: [person.id],
    witnessIds: witnessesOf(api, person),
    placeId: person.placeId,
    publicRecord: false,
    // Being let go is a life change (Holmes and Rahe), as in town.
    ...severityImpulse(api, DEFAULT_HEALTH_DATA.jobLossSeverity),
    source: source(api, "Let go by an employer elsewhere."),
    facts: { [WORK_ELSEWHERE_FACT]: person.placeId },
  });
}

/**
 * The month's review of everyone living elsewhere, on the jobs engine's own
 * review day: each person's pulls build by a month at this month's
 * conditions, and a pull that reaches one whole makes its change.
 */
export function reviewWorkElsewhere(api: CoreAPI): void {
  const core = api.state as CoreState;
  const p = (key: string) => api.parameter(key);
  const people = [...core.people.values()]
    .filter((row) => livesElsewhere(core, row))
    .sort((a, b) => a.id.localeCompare(b.id));
  if (!people.length) return;
  // This month's unemployment by state, and the run's reference for each.
  const byState = stateUnemployment(api);
  const national = nationalUnemployment(api);
  const held = (table(api).get(STATE_ROW) as unknown as
    StateRow | undefined) ?? {
    id: STATE_ROW,
    reference: {},
    recent: {},
  };
  const state: StateRow = {
    id: STATE_ROW,
    reference: { ...held.reference },
    recent: Object.fromEntries(
      Object.entries(held.recent).map(([key, rows]) => [key, [...rows]]),
    ),
  };
  const conditions = new Map<string, { meanOverNow: number; rise: number }>();
  const conditionsOf = (usps: string | undefined) => {
    const key = usps ?? "";
    const known = conditions.get(key);
    if (known) return known;
    const now = (usps ? byState.get(usps) : undefined) ?? national;
    if (now === undefined || now <= 0) {
      const flat = { meanOverNow: p("one"), rise: p("zero") };
      conditions.set(key, flat);
      return flat;
    }
    state.reference[key] ??= now;
    const recent = [...(state.recent[key] ?? []), now].slice(-4);
    state.recent[key] = recent;
    const row = {
      meanOverNow: state.reference[key]! / now,
      // The rise over the last quarter, as the pre-start run reads it.
      rise: Math.max(p("zero"), now - recent[0]!),
    };
    conditions.set(key, row);
    return row;
  };
  // A month as a share of the run's quarter.
  const month =
    p("daysPerMeanYear") / p("monthsPerYear") / p("pastWorkDaysPerQuarter");
  const retireAge = jobsParameter(api, "jobsEarliestRetirementAge");
  const retireYearly =
    Math.log(
      CPS.laborForcePctByAge["55-64"]! / CPS.laborForcePctByAge["65+"]!,
    ) / jobsParameter(api, "livesRetirementBandSpanYears");
  for (const person of people) {
    const age = ageOnDate(
      makeIsoDate(person.birthDate),
      makeIsoDate(core.date),
    );
    if (age < p("pastWorkYoungestAge")) continue;
    const saved = table(api).get(person.id) as unknown as WorkRow | undefined;
    const row: WorkRow = saved ? { ...saved } : opening(api, person, age);
    const at = conditionsOf(uspsOf(person.placeId));
    const leans = workLeans(core, person);
    const ageFactor = workAgeFactor(api, age);
    if (row.status === "out") {
      // Out of the labor force: no search until a cause brings them back.
      api.stopgap(OUT_OF_LABOR_FORCE_STOPGAP);
    } else if (row.status === "employed" || row.status === "looking") {
      if (age >= retireAge) row.retirePull += retireYearly / p("monthsPerYear");
      if (row.retirePull >= p("one") && age >= retireAge) {
        const was = row.status;
        row.status = "retired";
        row.since = core.date;
        if (was === "employed")
          spellEvent(
            api,
            person,
            { end: "retired", endedAt: core.date },
            "Retired from work elsewhere.",
          );
      } else if (row.status === "employed") {
        row.layoffPull +=
          layoffPerQuarter(api, at.rise, leans.layoffLean, ageFactor) * month;
        row.quitPull +=
          quitPerQuarter(
            api,
            at.meanOverNow,
            leans.quitLean,
            p("one"),
            ageFactor,
          ) * month;
        if (row.layoffPull >= p("one")) {
          row.status = "looking";
          row.since = core.date;
          row.layoffPull = p("zero");
          row.quitPull = p("zero");
          row.findPull = p("zero");
          lostWork(api, person);
        } else if (row.quitPull >= p("one")) {
          row.quitPull = p("zero");
          row.layoffPull = p("zero");
          row.since = core.date;
          spellEvent(
            api,
            person,
            { how: "moved-on", startedAt: core.date },
            "Moved to another job elsewhere.",
          );
        }
      } else {
        row.findPull +=
          findPerQuarter(api, at.meanOverNow, leans.applyLean) * month;
        if (row.findPull >= p("one")) {
          row.status = "employed";
          row.since = core.date;
          row.findPull = p("zero");
          row.layoffPull = p("zero");
          row.quitPull = p("zero");
          spellEvent(
            api,
            person,
            { how: "after-out-of-work", startedAt: core.date },
            "Found work again elsewhere.",
          );
        }
      }
    }
    table(api).put(row as never);
  }
  table(api).put(state as never);
}

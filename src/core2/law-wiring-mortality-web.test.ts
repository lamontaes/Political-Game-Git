/**
 * The mortality family of the outcome web, read from a person's own records
 * by the engine that decides who dies (src/core2/modules/health.ts): each full
 * person's strain accumulates from the life table's hazard times their
 * recorded factors, and the day it crosses their own line is the day they
 * fall seriously ill and, after the remaining days, die. Deaths are rare, so
 * each proof is on the hazard the engine computes for a named person, against
 * a twin world played from the same seed in which the cause was not recorded,
 * by record id. A place is drawn from all 56 on a seed from MORTALITY_WEB_SEED
 * (or GOLDEN_PATH_SEED, else random), and every place passed over is named.
 */
import { randomBytes } from "node:crypto";
import { appendFileSync } from "node:fs";
import { expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { displacementExcess } from "./health-own";
import { DEATH_WEB_REFRESH_DAY, deathWebFactor } from "./health-web";
import { addDays, ageOnDate, makeIsoDate } from "./kernel/dates";
import { medicaidCoverageSpells } from "./law-reach/group-b-money";
import { advanceCore } from "./life";
import {
  healthDeathOwnOf,
  healthHazardOf,
  healthReport,
} from "./modules/health";
import { JOBS_MODULE_ID, tenureYears } from "./modules/jobs";
import { enactLaw, lawChain, LAWS_MODULE_ID } from "./modules/laws";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import { residentsRuntime } from "./modules/residents";
import type { LawRowInput } from "./laws-starting";
import { WEB_LINKS } from "./outcome-web-model";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState } from "./types";

const SEED =
  process.env.MORTALITY_WEB_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");
/** Places drawn before the proof gives up; each one passed over is named. */
const DRAWS = Number(process.env.MORTALITY_WEB_DRAWS || 8);

/** Progress for a long run: set MORTALITY_WEB_TRACE to a file path. */
const trace = (message: string) => {
  if (process.env.MORTALITY_WEB_TRACE)
    appendFileSync(
      process.env.MORTALITY_WEB_TRACE,
      `${new Date().toISOString()} ${message}\n`,
    );
};

/** A proof line: printed, and kept in the trace file when one is set. */
const proof = (message: string) => {
  console.log(message);
  trace(message);
};

const tomorrow = (api: CoreAPI) => addDays(makeIsoDate(api.state.date), 1);
const link = (key: string) => WEB_LINKS.find((row) => row.key === key)!;

/** A day some whole months on (the day of month clipped to the month's last). */
function monthsAfter(day: string, months: number, dayOfMonth: number): string {
  const at = new Date(`${day}T00:00:00.000Z`);
  const month = at.getUTCMonth() + months;
  const last = new Date(
    Date.UTC(at.getUTCFullYear(), month + 1, 0),
  ).getUTCDate();
  return new Date(
    Date.UTC(at.getUTCFullYear(), month, Math.min(dayOfMonth, last)),
  )
    .toISOString()
    .slice(0, 10);
}

function openWorld(place: ReturnType<typeof drawPlace>): CoreState {
  setBookkeeping(false);
  trace(`open ${place.name} [${place.key}]`);
  const core = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  }).core;
  trace(`opened ${place.key}: ${core.people.size} people`);
  return core;
}

/** The latest row at each level of the town's chain, whatever its date, says yes. */
function levelsHoldingYes(api: CoreAPI, key: string) {
  const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
  return lawChain(api).levels.flatMap(({ level, jurisdiction }) => {
    const latest = [
      ...(laws.query("bySeries", [
        jurisdiction,
        key,
      ]) as unknown as LawRowInput[]),
    ].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
    return latest?.value === 1 ? [{ level, jurisdiction }] : [];
  });
}

function repeal(api: CoreAPI, key: string): void {
  for (const { level, jurisdiction } of levelsHoldingYes(api, key))
    enactLaw(api, {
      jurisdiction,
      level,
      series: key,
      value: 0,
      effectiveDate: tomorrow(api),
      measureId: "mortality-web-repeal",
      citation: "Mortality web test: repeal",
    });
}

/** Enact at the state, else the city, county or federal level (one that may hold it). */
function enact(api: CoreAPI, key: string): string {
  for (const level of ["state", "city", "county", "federal"] as const) {
    const at = lawChain(api).levels.find((l) => l.level === level);
    if (!at) continue;
    return enactLaw(api, {
      jurisdiction: at.jurisdiction,
      level,
      series: key,
      value: 1,
      effectiveDate: tomorrow(api),
      measureId: "mortality-web-enact",
      citation: "Mortality web test: enact",
    }).id;
  }
  throw new Error(`no level of the chain can enact ${key}`);
}

const EXPAND =
  "us-policy-positions:health-human-services.expand-medicaid-eligibility";

/** One named person's hazard as the health engine holds it on a day. */
interface Look {
  readonly id: string;
  readonly age: number;
  readonly alive: boolean;
  readonly own: ReturnType<typeof healthDeathOwnOf>;
  readonly hazardMicros: number | undefined;
  readonly hazardWeb: number | undefined;
  readonly hazardOwn: number | undefined;
  readonly onsetDate: string | null;
  readonly spellIds: readonly string[];
  /** The stretches of their coverage the payment records hold. */
  readonly stretches: readonly { from: string; to: string | null }[];
}

function look(core: CoreState, id: string): Look {
  const api = coreAPI(core);
  const person = core.people.get(id)!;
  const age = Math.floor(ageOnDate(makeIsoDate(person.birthDate), core.date));
  const hazard = healthHazardOf(api, id);
  const found = healthReport(core).cases.find((row) => row.personId === id);
  const spells = medicaidCoverageSpells(api, EXPAND)?.get(id) ?? [];
  return {
    id,
    age,
    alive: person.alive,
    own: healthDeathOwnOf(core, id),
    hazardMicros: hazard?.micros,
    hazardWeb: hazard?.web,
    hazardOwn: hazard?.own,
    onsetDate: found?.onsetDate ?? null,
    spellIds: spells.flatMap((spell) => spell.obligationIds),
    stretches: spells.map((spell) => ({ from: spell.from, to: spell.to })),
  };
}

/**
 * Named people aged 56 to 63 on `on` whose Medicaid coverage is being paid,
 * whose illness has not begun, and who are low-income (the link's group): the
 * household income fifth the monthly look read is the lowest, or unread where
 * the household has no pay (the place-level twin row lands on both). They
 * live in the player's town, whose chain of governments the test enacts or
 * repeals along (a counted place nearby reads its own county's law).
 */
function coveredAdults(core: CoreState, on: string): string[] {
  const api = coreAPI(core);
  const spells = medicaidCoverageSpells(api, EXPAND);
  if (!spells) return [];
  const cases = new Map(
    healthReport(core).cases.map((row) => [row.personId, row]),
  );
  const town = core.people.get(core.playerId ?? "")?.placeId;
  return [...spells.keys()]
    .filter((id) => {
      const person = core.people.get(id);
      if (!person?.alive || person.placeId !== town) return false;
      if (!cases.has(id) || cases.get(id)!.onsetEventId) return false;
      const age = ageOnDate(makeIsoDate(person.birthDate), on);
      const fifth = healthHazardOf(api, id)?.fifth;
      return age >= 56 && age <= 63 && (fifth === undefined || fifth === 0);
    })
    .sort();
}

/** The place-level twin row, at its own size, laid on a place's latest web month (as health-web.test.ts lays its shifts). */
const TWIN = "medicaid-expansion-to-mortality";
function layTwin(core: CoreState, placeId: string): void {
  const months = coreAPI(core)
    .moduleState(OUTCOME_WEB_MODULE_ID)
    .table("months");
  const rows = months
    .rows()
    .map((row) => row as unknown as WebMonth)
    .filter((row) => row.placeId === placeId);
  const latest = rows
    .map((row) => row.month)
    .sort()
    .at(-1);
  for (const old of rows.filter((row) => row.month === latest)) {
    const row = months.get(old.id) as unknown as WebMonth;
    months.put({
      ...row,
      effects: { ...row.effects, [TWIN]: link(TWIN).size },
    } as never);
  }
}

/**
 * A person's own-record parts other than one link's, which the two worlds
 * must share for the ratio of their factors to be that link's alone (the
 * parts multiply: a long-hours job or an earlier closure moves both alike).
 */
function otherParts(look: Look, link: string): string {
  return JSON.stringify(look.own.parts.filter((one) => one.link !== link));
}

/**
 * What the monthly look booked for a low-income person aged 55 to 64 (the
 * group the twin row lands on, the lowest income fifth or no pay on record)
 * against the web's factor for their age with and without the twin row.
 */
interface TwinProbe {
  readonly id: string;
  readonly age: number;
  readonly booked: number;
  readonly withTwin: number;
  readonly leftOut: number;
}

function probeTwin(
  core: CoreState,
  prefer: readonly string[],
): TwinProbe | undefined {
  const api = coreAPI(core);
  const candidates = [...prefer, ...[...core.people.keys()].sort()];
  // A place whose latest web month carries the laid twin row (a counted
  // place keeps no web month, so nothing is laid there to leave out).
  const months = api.moduleState(OUTCOME_WEB_MODULE_ID).table("months");
  const laid = new Set(
    (months.rows() as unknown as WebMonth[])
      .filter((row) => row.effects[TWIN] !== undefined)
      .map((row) => row.placeId),
  );
  for (const id of candidates) {
    const person = core.people.get(id);
    const hazard = person?.alive ? healthHazardOf(api, id) : undefined;
    if (!person || !hazard || !laid.has(person.placeId)) continue;
    if (hazard.fifth !== undefined && hazard.fifth !== 0) continue;
    const age = Math.floor(ageOnDate(makeIsoDate(person.birthDate), core.date));
    if (age < 55 || age > 64) continue;
    return {
      id,
      age,
      booked: hazard.web,
      withTwin: deathWebFactor(api, person.placeId, age, hazard.fifth, false)
        .factor,
      leftOut: deathWebFactor(api, person.placeId, age, hazard.fifth, true)
        .factor,
    };
  }
  return undefined;
}

/**
 * One world, played past the first monthly look of the health engine (the
 * 4th), which reads each person's coverage once as the table's own. Where the
 * state's law holds the Medicaid expansion at the opening, the treated world
 * then repeals it (the coverage people had ends); where it does not, the
 * treated world enacts it (coverage begins). The control world changes
 * nothing. Both are played past the link's lag to the next monthly look. The
 * treated world names whom the change reaches, up to three, and the control
 * looks at the same people.
 */
function playCoverage(
  place: ReturnType<typeof drawPlace>,
  treated: boolean,
  chosen?: readonly string[],
  /** Modes already proven in an earlier place: this one is not played. */
  done?: ReadonlySet<string>,
): {
  readonly mode: "enact" | "repeal";
  readonly chosen: readonly string[];
  readonly looks: readonly Look[];
  readonly probe: TwinProbe | undefined;
  readonly lookOn: string;
  readonly lawId: string | null;
} {
  const core = openWorld(place);
  const api = coreAPI(core);
  const mode = levelsHoldingYes(api, EXPAND).length ? "repeal" : "enact";
  if (done?.has(mode))
    return {
      mode,
      chosen: [],
      looks: [],
      probe: undefined,
      lookOn: core.date,
      lawId: null,
    };
  // Past the first monthly look (the 4th), so each person's coverage is read
  // once, before anything changes.
  advanceCore(core, makeIsoDate(monthsAfter(core.date, 1, 6)));
  // The link's lag after the change, then the next monthly look.
  const lag = link("coverage-to-mortality-55-64").lagMonths;
  const lookOn = monthsAfter(core.date, lag + 1, 6);
  // Repeal ends coverage people hold, so it names them before it ends.
  let names =
    chosen ??
    (mode === "repeal" ? coveredAdults(core, lookOn).slice(0, 3) : undefined);
  let lawId: string | null = null;
  if (treated) {
    if (mode === "repeal") repeal(api, EXPAND);
    else lawId = enact(api, EXPAND);
  }
  advanceCore(core, addDays(makeIsoDate(core.date), 45));
  trace(`${place.key} treated=${treated} ${mode}: at ${core.date}, 45 days on`);
  names ??= coveredAdults(core, lookOn).slice(0, 3);
  trace(
    `${place.key} treated=${treated}: ${names.length} adults aged 56 to 63 reached`,
  );
  if (!names.length)
    return { mode, chosen: names, looks: [], probe: undefined, lookOn, lawId };
  // The day before the monthly look the web's twin row is laid at its own
  // size, so the look has a twin to leave out (or not); the look is the 4th.
  advanceCore(
    core,
    makeIsoDate(monthsAfter(lookOn, 0, DEATH_WEB_REFRESH_DAY - 1)),
  );
  // On the places of the people reached and on the player's town, which
  // always keeps a web month (a counted place keeps none).
  for (const placeId of new Set([
    ...names.map((id) => core.people.get(id)!.placeId),
    core.people.get(core.playerId ?? "")?.placeId ?? "",
  ]))
    if (placeId) layTwin(core, placeId);
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const probe = probeTwin(core, names);
  advanceCore(core, makeIsoDate(lookOn));
  trace(`${place.key} treated=${treated}: looked at ${lookOn}`);
  return {
    mode,
    chosen: names,
    looks: names.map((id) => look(core, id)),
    probe,
    lookOn,
    lawId,
  };
}

it("coverage-to-mortality-55-64: a covered 55- to 64-year-old's hazard reads their own coverage", () => {
  const passed: string[] = [];
  // Both directions are proven when the draws allow: coverage begun by an
  // enactment, and coverage ended by a repeal.
  const done = new Set<string>();
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${SEED}:${draw}`, "mortality-web-coverage");
    const where = `${place.name} [${place.key}], seed ${SEED}:${draw}`;
    const treated = playCoverage(place, true, undefined, done);
    if (done.has(treated.mode)) {
      passed.push(`${where} (${treated.mode} already proven)`);
      continue;
    }
    if (!treated.chosen.length) {
      passed.push(
        `${where} (no adult aged 56 to 63 the ${treated.mode} reaches)`,
      );
      continue;
    }
    const chosen = treated.chosen;
    const control = playCoverage(place, false, chosen);
    const size = link("coverage-to-mortality-55-64").size!;
    // Gaining coverage multiplies the hazard by 1 + size; losing what they
    // held divides it by the same.
    const want = treated.mode === "enact" ? 1 + size : 1 / (1 + size);
    // Counted once: with the place-level twin row laid at its own size the day
    // before the look, the web's factor for a low-income 55- to 64-year-old
    // would carry it (it moves the factor), and the factor the look booked
    // for them is the one without it.
    const probe = treated.probe;
    if (probe) {
      expect(probe.withTwin, `${where} ${probe.id}: twin laid`).toBeLessThan(
        probe.leftOut,
      );
      expect(probe.booked, `${where} ${probe.id}: twin left out`).toBeCloseTo(
        probe.leftOut,
        9,
      );
    } else
      passed.push(
        `${where} (no low-income person aged 55 to 64 to show the twin left out)`,
      );
    let proven = 0;
    for (const id of chosen) {
      const t = treated.looks.find((row) => row.id === id)!;
      const c = control.looks.find((row) => row.id === id)!;
      trace(
        `${id}: alive ${t.alive}/${c.alive}, hazard ${t.hazardMicros}/${c.hazardMicros}, own ${t.own.factor}/${c.own.factor}, age ${t.age}`,
      );
      // A death in either world takes the person out of the comparison.
      if (!t.alive || !c.alive || t.hazardMicros === undefined) continue;
      if (c.hazardMicros === undefined) continue;
      // The control world changes no one's coverage when the link reads it (a
      // bill it passed on its own would, and then the person is no twin).
      const moved = c.own.parts.find(
        (one) => "covered" in one && one.covered !== one.baseCovered,
      );
      if (moved) {
        passed.push(
          `${where} ${id} (their coverage changed in the control world too)`,
        );
        continue;
      }
      if (
        otherParts(t, "coverage-to-mortality-55-64") !==
        otherParts(c, "coverage-to-mortality-55-64")
      ) {
        passed.push(
          `${where} ${id} (their other own records differ between the worlds)`,
        );
        continue;
      }
      // The look reads coverage the link's lag back. A repeal reaches the
      // hazard of the people it had ended coverage for by that day; one still
      // paid then (the payment ran on past the repeal) is not reached yet.
      const readDay = monthsAfter(
        treated.lookOn,
        -link("coverage-to-mortality-55-64").lagMonths,
        Number(treated.lookOn.slice(8)),
      );
      const paidThen = t.stretches.find(
        (one) => one.from <= readDay && (one.to === null || readDay < one.to),
      );
      if (treated.mode === "repeal" && paidThen) {
        passed.push(
          `${where} ${id} (still paid on ${readDay}, the day the look read: a stretch from ${paidThen.from} to ${paidThen.to ?? "now"})`,
        );
        continue;
      }
      // The treated person's own record: coverage paid (or ended), read the
      // link's lag later, against their coverage at their first look.
      const part = t.own.parts.find(
        (one) => one.link === "coverage-to-mortality-55-64",
      );
      if (!part || !("covered" in part))
        throw new Error(
          `${where} ${id}: no coverage part (own ${t.own.factor}, parts ${JSON.stringify(t.own.parts)}, spells ${t.spellIds.join(", ")})`,
        );
      expect(part.covered, `${where} ${id}: covered then`).toBe(
        treated.mode === "enact",
      );
      expect(part.baseCovered).toBe(treated.mode === "repeal");
      expect(part.readOn <= treated.lookOn).toBe(true);
      expect(
        t.own.factor / c.own.factor,
        `${where} ${id}: own factor`,
      ).toBeCloseTo(want, 9);
      // The record ids of the payments the person's stretch stands on.
      if (treated.mode === "enact") {
        expect(part.obligationIds.length).toBeGreaterThan(0);
        for (const record of part.obligationIds)
          expect(t.spellIds, `${where} ${id}: ${record}`).toContain(record);
      }
      expect(
        t.spellIds.length,
        `${where} ${id}: payment records`,
      ).toBeGreaterThan(0);
      // The hazard the engine holds differs from the twin's by the link's
      // size (the own part), whatever else moved the two worlds.
      const ratio = t.hazardMicros / c.hazardMicros;
      expect(ratio, `${where} ${id}: hazard ratio`).toBeCloseTo(
        ((t.hazardWeb ?? 1) * (t.hazardOwn ?? 1)) /
          ((c.hazardWeb ?? 1) * (c.hazardOwn ?? 1)),
        5,
      );
      expect(
        t.hazardOwn! / c.hazardOwn!,
        `${where} ${id}: own part`,
      ).toBeCloseTo(want, 9);
      // A later onset when the hazard fell, an earlier one when it rose,
      // where both worlds book one.
      if (t.onsetDate && c.onsetDate)
        expect(
          treated.mode === "enact"
            ? t.onsetDate >= c.onsetDate
            : t.onsetDate <= c.onsetDate,
          `${where} ${id}: onset`,
        ).toBe(true);
      proven += 1;
      proof(
        `mortality web coverage-to-mortality-55-64 (${treated.mode}): ${where}: ${id} age ${t.age}: own factor ${t.own.factor.toFixed(4)} vs control ${c.own.factor}; hazard ${(t.hazardMicros / 1e6).toFixed(5)} vs ${(c.hazardMicros / 1e6).toFixed(5)} (x${ratio.toFixed(4)}); twin row laid at ${link(TWIN).size}: ${probe ? `${probe.id} aged ${probe.age} booked ${probe.booked.toFixed(4)} = without the twin ${probe.leftOut.toFixed(4)}, not ${probe.withTwin.toFixed(4)}` : "no witness"}; onset ${t.onsetDate} vs ${c.onsetDate}; payments ${part.obligationIds.join(", ") || t.spellIds.join(", ")}; law ${treated.lawId}; looked ${treated.lookOn}; passed over: ${passed.join("; ") || "none"}`,
      );
    }
    if (proven > 0) {
      done.add(treated.mode);
      if (done.size === 2) return;
      continue;
    }
    passed.push(
      `${where} (the people reached died or lost their health record before the look)`,
    );
  }
  if (done.size > 0) {
    proof(
      `mortality web coverage-to-mortality-55-64: proven ${[...done].join(" and ")}; the other direction was not reached in ${DRAWS} draws; passed over: ${passed.join("; ")}`,
    );
    return;
  }
  throw new Error(
    `no drawn place had an adult aged 56 to 63 the expansion reaches in ${DRAWS} draws; passed over: ${passed.join("; ")}`,
  );
}, 3_600_000);

/** The longest tenure and the ages the proof picks its worker from: a long job, well before retirement age. */
const LONG_TENURE_YEARS = 7;

/**
 * One world, played to the first monthly look and a little past. In the
 * treated world the business of a full worker with a long job closes (the
 * engine's own closure by an owner's choice), and the jobs engine writes its
 * closure record for each worker; the control world does not close it.
 */
function playDisplacement(
  place: ReturnType<typeof drawPlace>,
  treated: boolean,
  chosen?: { readonly organizationId: string; readonly ids: readonly string[] },
): {
  readonly chosen: {
    readonly organizationId: string;
    readonly ids: readonly string[];
  };
  readonly looks: readonly Look[];
  readonly lookOn: string;
  readonly records: readonly { id: string; kind: string; personId: string }[];
} | null {
  const core = openWorld(place);
  const api = coreAPI(core);
  // Past the first monthly look (the 4th) into the second month.
  advanceCore(core, makeIsoDate(monthsAfter(core.date, 1, 6)));
  let target = chosen;
  if (!target) {
    const pickable = [...core.jobs.values()]
      .filter((job) => {
        const person = core.people.get(job.personId);
        const business = core.finance.businesses.get(job.organizationId);
        if (!person?.alive || job.endsAt !== undefined || !business)
          return false;
        if (business.closedAt || job.hoursDaily <= 0) return false;
        const age = ageOnDate(makeIsoDate(person.birthDate), core.date);
        return (
          age >= 28 && age <= 56 && tenureYears(api, job) >= LONG_TENURE_YEARS
        );
      })
      .sort((a, b) => a.id.localeCompare(b.id))[0];
    if (!pickable) return null;
    const ids = [...core.jobs.values()]
      .filter(
        (job) =>
          job.organizationId === pickable.organizationId &&
          job.endsAt === undefined &&
          core.people.get(job.personId)?.alive,
      )
      .map((job) => job.personId)
      .sort();
    target = { organizationId: pickable.organizationId, ids };
  }
  if (treated) {
    const owner = residentsRuntime(core)!.input.accounts[0]!.accountId;
    api.closeBusinessByChoice({
      organizationId: target.organizationId,
      ownerAccountId: api.accounts().main(owner),
      reasonKey: "owner.retired",
      source: core.organizations.get(target.organizationId)!.source,
    });
  }
  // Through the next monthly look, which books the factor.
  const lookOn = monthsAfter(core.date, 1, 6);
  advanceCore(core, makeIsoDate(lookOn));
  const changes = api
    .moduleState(JOBS_MODULE_ID)
    .table("changes")
    .rows() as unknown as { id: string; kind: string; personId: string }[];
  return {
    chosen: target,
    looks: target.ids.map((id) => look(core, id)),
    lookOn,
    records: changes.filter(
      (row) =>
        target.ids.includes(row.personId) &&
        (row.kind === "closure" || row.kind === "layoff"),
    ),
  };
}

it("job-loss-to-death-risk: a worker displaced from a long job carries the excess in their hazard", () => {
  const passed: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${SEED}:${draw}`, "mortality-web-job-loss");
    const where = `${place.name} [${place.key}], seed ${SEED}:${draw}`;
    const treated = playDisplacement(place, true);
    if (!treated) {
      passed.push(
        `${where} (no full worker with ${LONG_TENURE_YEARS} years on a job at an open business)`,
      );
      continue;
    }
    const control = playDisplacement(place, false, treated.chosen)!;
    let proven = 0;
    for (const id of treated.chosen.ids) {
      const t = treated.looks.find((row) => row.id === id)!;
      const c = control.looks.find((row) => row.id === id)!;
      const part = t.own.parts.find(
        (one) => one.link === "job-loss-to-death-risk",
      );
      if (!part || !("recordId" in part)) continue;
      if (!t.alive || !c.alive || t.hazardMicros === undefined) continue;
      if (c.hazardMicros === undefined) continue;
      // The control world holds no closure for them, so no excess.
      if (control.records.some((row) => row.personId === id)) {
        passed.push(`${where} ${id} (also let go in the control world)`);
        continue;
      }
      if (
        otherParts(t, "job-loss-to-death-risk") !==
        otherParts(c, "job-loss-to-death-risk")
      ) {
        passed.push(
          `${where} ${id} (their other own records differ between the worlds)`,
        );
        continue;
      }
      // The record the factor stands on is the jobs engine's own change row.
      const row = treated.records.find((one) => one.id === part.recordId);
      expect(row, `${where} ${id}: ${part.recordId}`).toBeDefined();
      expect(row!.personId).toBe(id);
      // The excess is the paper's for the years since, scaled by tenure.
      const expectedExcess =
        Math.min(1, part.tenureYears / 6) * displacementExcess(part.yearsSince);
      expect(part.excess, `${where} ${id}: excess`).toBeCloseTo(
        expectedExcess,
        9,
      );
      expect(
        t.own.factor / c.own.factor,
        `${where} ${id}: own factor`,
      ).toBeCloseTo(1 + expectedExcess, 9);
      expect(
        t.hazardOwn! / c.hazardOwn!,
        `${where} ${id}: own part`,
      ).toBeCloseTo(1 + expectedExcess, 9);
      const ratio = t.hazardMicros / c.hazardMicros;
      expect(ratio, `${where} ${id}: hazard ratio`).toBeCloseTo(
        ((t.hazardWeb ?? 1) * (t.hazardOwn ?? 1)) /
          ((c.hazardWeb ?? 1) * (c.hazardOwn ?? 1)),
        5,
      );
      // A higher hazard crosses their line sooner when both worlds book an onset.
      if (t.onsetDate && c.onsetDate)
        expect(t.onsetDate <= c.onsetDate, `${where} ${id}: onset`).toBe(true);
      proven += 1;
      proof(
        `mortality web job-loss-to-death-risk: ${where}: ${id} age ${t.age}: tenure ${part.tenureYears.toFixed(1)} years, ${part.yearsSince.toFixed(2)} years since; own factor ${t.own.factor.toFixed(4)} vs control ${c.own.factor}; hazard ${(t.hazardMicros / 1e6).toFixed(5)} vs ${(c.hazardMicros / 1e6).toFixed(5)} (x${ratio.toFixed(4)}); onset ${t.onsetDate} vs ${c.onsetDate}; record ${part.recordId}; business ${treated.chosen.organizationId}; looked ${treated.lookOn}; passed over: ${passed.join("; ") || "none"}`,
      );
    }
    if (proven > 0) return;
    passed.push(
      `${where} (no worker of the closed business carried the factor at the look)`,
    );
  }
  throw new Error(
    `no drawn place gave a displaced long-tenure worker in ${DRAWS} draws; passed over: ${passed.join("; ")}`,
  );
}, 3_600_000);

/**
 * One world played to the first monthly look and past it. The control world
 * records the same worker's job at the reference hours (the comparison the
 * research uses, 35 to 40 hours a week); the treated world keeps the hours the
 * world recorded for it. Both lay the one cause, the hours on the job, and
 * leave the rest to the engines.
 */
function playHours(
  place: ReturnType<typeof drawPlace>,
  treated: boolean,
  chosen?: string,
): {
  readonly chosen: string;
  readonly look: Look;
  readonly weeklyHours: number;
  readonly jobId: string;
  readonly lookOn: string;
} | null {
  const core = openWorld(place);
  const api = coreAPI(core);
  const week = api.parameter("daysPerWeek");
  let id = chosen;
  if (!id) {
    const job = [...core.jobs.values()]
      .filter((one) => {
        const person = core.people.get(one.personId);
        if (!person?.alive || one.endsAt !== undefined) return false;
        const age = ageOnDate(makeIsoDate(person.birthDate), core.date);
        return one.hoursDaily * week >= 55 && age >= 25 && age <= 64;
      })
      .sort((a, b) => a.id.localeCompare(b.id))[0];
    if (!job) return null;
    id = job.personId;
  }
  const person = core.people.get(id)!;
  const job = core.jobs.get(person.jobId!)!;
  const weeklyHours = job.hoursDaily * week;
  if (!treated)
    core.jobs.set(job.id, {
      ...job,
      hoursDaily: api.parameter("openingFullTimeWeeklyHours") / week,
    });
  // Past the first monthly look (the 4th), which reads the recorded hours.
  const lookOn = monthsAfter(core.date, 1, 6);
  advanceCore(core, makeIsoDate(lookOn));
  trace(`${place.key} treated=${treated}: looked at ${lookOn}`);
  return {
    chosen: id,
    look: look(core, id),
    weeklyHours,
    jobId: job.id,
    lookOn,
  };
}

it("long-hours-to-heart-and-stroke: a worker at long weekly hours carries the excess in their hazard", () => {
  const passed: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${SEED}:${draw}`, "mortality-web-long-hours");
    const where = `${place.name} [${place.key}], seed ${SEED}:${draw}`;
    const treated = playHours(place, true);
    if (!treated) {
      passed.push(
        `${where} (no full worker aged 25 to 64 at 55 or more weekly hours)`,
      );
      continue;
    }
    const control = playHours(place, false, treated.chosen)!;
    const t = treated.look;
    const c = control.look;
    if (
      !t.alive ||
      !c.alive ||
      t.hazardMicros === undefined ||
      c.hazardMicros === undefined
    ) {
      passed.push(`${where} (the worker died or had no health record)`);
      continue;
    }
    const part = t.own.parts.find(
      (one) => one.link === "long-hours-to-heart-and-stroke",
    );
    expect(part, `${where} ${t.id}: the factor's reason`).toBeDefined();
    if (!part || !("heartRisk" in part)) continue;
    // The record the factor stands on is the job's recorded hours.
    expect(part.jobId).toBe(treated.jobId);
    expect(part.weeklyHours).toBeCloseTo(treated.weeklyHours, 9);
    // The paper's relative risks at 55 hours or more.
    expect(part.heartRisk).toBeCloseTo(1.17, 9);
    expect(part.strokeRisk).toBeCloseTo(1.35, 9);
    // Heart disease and stroke are a fifth and a twentieth of deaths in middle age (NVSR 74(10) Table 1).
    expect(part.heartShare).toBeGreaterThan(0.02);
    expect(part.heartShare).toBeLessThan(0.3);
    expect(part.strokeShare).toBeGreaterThan(0.004);
    expect(part.strokeShare).toBeLessThan(0.08);
    const expected =
      1 +
      part.heartShare * (part.heartRisk - 1) +
      part.strokeShare * (part.strokeRisk - 1);
    // The twin, with the job at the reference hours, carries none, and
    // shares the person's other own records.
    expect(
      c.own.parts.some((one) => one.link === part.link),
      `${where} ${t.id}: control hours part`,
    ).toBe(false);
    if (otherParts(t, part.link) !== otherParts(c, part.link)) {
      passed.push(
        `${where} ${t.id} (their other own records differ between the worlds)`,
      );
      continue;
    }
    expect(
      t.own.factor / c.own.factor,
      `${where} ${t.id}: own factor`,
    ).toBeCloseTo(expected, 9);
    expect(
      t.hazardOwn! / c.hazardOwn!,
      `${where} ${t.id}: own part`,
    ).toBeCloseTo(expected, 9);
    const ratio = t.hazardMicros / c.hazardMicros;
    expect(ratio, `${where} ${t.id}: hazard ratio`).toBeCloseTo(
      ((t.hazardWeb ?? 1) * (t.hazardOwn ?? 1)) /
        ((c.hazardWeb ?? 1) * (c.hazardOwn ?? 1)),
      5,
    );
    if (t.onsetDate && c.onsetDate)
      expect(t.onsetDate <= c.onsetDate, `${where} ${t.id}: onset`).toBe(true);
    proof(
      `mortality web long-hours-to-heart-and-stroke: ${where}: ${t.id} age ${t.age} at ${treated.weeklyHours.toFixed(1)} weekly hours on ${treated.jobId}: own factor ${t.own.factor.toFixed(4)} vs control ${c.own.factor} (heart ${part.heartShare.toFixed(3)} x 0.17, stroke ${part.strokeShare.toFixed(3)} x 0.35); hazard ${(t.hazardMicros / 1e6).toFixed(5)} vs ${(c.hazardMicros / 1e6).toFixed(5)} (x${ratio.toFixed(4)}); onset ${t.onsetDate} vs ${c.onsetDate}; looked ${treated.lookOn}; passed over: ${passed.join("; ") || "none"}`,
    );
    return;
  }
  throw new Error(
    `no drawn place had a full worker at 55 or more weekly hours in ${DRAWS} draws; passed over: ${passed.join("; ")}`,
  );
}, 3_600_000);

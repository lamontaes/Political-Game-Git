/**
 * Two labor research links reach named people through the jobs engine's own
 * decisions, in a played world: a place drawn from all 56 on a seed nobody
 * chose (LABOR_WEB_SEED names one), the bench world with every module
 * installed, built twice from the same seed, the cause in one and not in the
 * other.
 *
 * - defense-contracts-to-earnings: Congress raises the federal national
 *   defense line in one world. The budgets module records the line, the web
 *   reads it as the contracts the town's state draws (federal.defense-boost-
 *   pct), and the jobs engine's pay level (payLevel) multiplies by the web's
 *   factor on the earnings of a named worker when it prices a raise.
 * - pretrial-detention-to-employment: a poor defendant is charged in both
 *   worlds on the same day; cash bail holds them in one and a law that ended
 *   cash bail frees them in the other. Six months on, the jobs engine's
 *   monthly review weighs a lower pull to work for the held defendant, by
 *   the link's size, in the choice score it scores for them.
 *
 * The other four links of the family (transit loss, broadband, incentive
 * deals, more immigration) stay unread: outcome-web-labor-waiting.test.ts
 * says why for each.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import * as choice from "./choice";
import justiceParameters from "./data/justice/parameters.json" with { type: "json" };
import { gameStartDate } from "./game-start";
import { defenseBoostPct } from "./gov-measures";
import { DETENTION_LINK } from "./jobs-web";
import { END_CASH_BAIL, type PretrialRow } from "./justice-pretrial";
import {
  addDays,
  ageOnDate,
  completedMonthsBetween,
  makeIsoDate,
} from "./kernel/dates";
import { advanceCore } from "./life";
import {
  amendBudget,
  baseBudget,
  budgetsOf,
  governments,
} from "./modules/budgets";
import {
  JOBS_DATA,
  JOBS_MODULE_ID,
  payLevel,
  workerSubject,
  type RaiseRow,
} from "./modules/jobs";
import {
  chargeDecision,
  JUSTICE_MODULE_ID,
  type CaseRow,
  type InvestigationRow,
} from "./modules/justice";
import { enactLaw, lawChain, lawInForce, webReach } from "./modules/laws";
import { WEB_LINKS } from "./outcome-web-model";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed = process.env.LABOR_WEB_SEED || randomBytes(20).toString("hex");
const TRIES = 8;
const MEDIAN_EARNINGS = "labor.median-earnings";
const DEFENSE = "defense-contracts-to-earnings";
const DEFENSE_LINE = "nationalDefense";
/** Congress raises the national defense line by a fifth, in one world. */
const DEFENSE_RAISE = 0.2;

const linkOf = (key: string) => WEB_LINKS.find((row) => row.key === key)!;
const JOB_ACTIONS: ReadonlySet<string> = new Set(
  Object.values(JOBS_DATA.actions).map((action) => action.id),
);

const build = (drawn: ReturnType<typeof drawPlace>) =>
  buildBenchWorld(drawn.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: drawn.key,
  }).core as CoreState;

const step = (core: CoreState, days = 1) =>
  advanceCore(core, addDays(makeIsoDate(core.date), days));

describe("defense contracts reach a worker's pay through the jobs engine", () => {
  it(
    `a larger national defense line raises the pay level that prices a named worker's raise (seed ${seed})`,
    { timeout: 1_800_000 },
    () => {
      const bookkeeping = setBookkeeping(false);
      const passed: string[] = [];
      try {
        for (let attempt = 0; attempt < TRIES; attempt += 1) {
          const drawn = drawPlace(seed, `labor-web-defense:${attempt}`);
          const where = `${drawn.name}, ${drawn.state} (${drawn.key}, seed ${drawn.seed})`;
          const lawWorld = build(drawn);
          const control = build(drawn);
          const api = coreAPI(lawWorld);
          const capi = coreAPI(control);
          const us = governments(api).find((gov) => gov.level === "federal")!;
          const budget = budgetsOf(api, us.id).at(-1)!;
          const base = baseBudget(api, us, budget.fiscalYear).spendingMinor[
            DEFENSE_LINE
          ]!;
          const act = `labor-web-defense-${attempt}`;
          amendBudget(api, {
            governmentId: us.id,
            line: DEFENSE_LINE,
            deltaMinor: Math.round(base * DEFENSE_RAISE),
            measureId: act,
            carry: true,
          });
          const town = lawChain(api).townPlaceId;
          const stateKey = lawChain(api).stateKey;
          // Play to the first day the web's month row reads the larger line.
          const reads = () =>
            webReach(api, town, MEDIAN_EARNINGS).parts.find(
              (part) => part.link === DEFENSE,
            );
          for (let day = 0; day < 45 && !reads(); day += 1) step(lawWorld);
          const part = reads();
          if (!part) {
            passed.push(`${where}: the web did not read the line in 45 days`);
            continue;
          }
          const webDay = lawWorld.date;
          const month = webReach(api, town, MEDIAN_EARNINGS).recordId;
          advanceCore(control, webDay);
          // The cause: the federal budget row's line against its base, as the
          // contracts the town's state draws, over what it produces.
          const boost = defenseBoostPct(api, stateKey)!;
          const size = linkOf(DEFENSE).size!;
          expect(size, "the row's researched size").toBeGreaterThan(0);
          expect(boost.value, where).toBeGreaterThan(0);
          expect(boost.recordId, where).toBe(budgetsOf(api, us.id).at(-1)!.id);
          expect(part.effect, where).toBeCloseTo(size * boost.value, 12);
          expect(defenseBoostPct(capi, stateKey)!.value, where).toBe(0);
          expect(
            webReach(capi, town, MEDIAN_EARNINGS).parts.map((p) => p.link),
            where,
          ).not.toContain(DEFENSE);
          // The jobs engine's pay level for each named worker in the town,
          // priced on the worker's own band, moves by exactly the effect.
          const workers = [...lawWorld.jobs.values()]
            .filter(
              (job) =>
                job.endsAt === undefined &&
                lawWorld.people.get(job.personId)?.placeId === town &&
                control.people.has(job.personId),
            )
            .slice(0, 5);
          if (!workers.length) {
            passed.push(`${where}: no named worker in the town`);
            continue;
          }
          const priced = workers.map((job) => {
            const subject = workerSubject(lawWorld, job.personId);
            const withLine = payLevel(api, town, subject);
            const without = payLevel(capi, town, subject);
            expect(
              withLine / without - 1,
              `${where}: ${job.personId}`,
            ).toBeCloseTo(part.effect, 12);
            return { job, withLine, without };
          });
          // The raise: the first yearly raise a named worker gets after the
          // web read the line is priced at the pay level of that day.
          const raises = () =>
            (
              api
                .moduleState(JOBS_MODULE_ID)
                .table("raises")
                .rows() as unknown as RaiseRow[]
            ).filter((row) => row.date > webDay && !row.counted);
          for (let day = 0; day < 400 && !raises().length; day += 1)
            step(lawWorld);
          const raise = raises().sort((a, b) =>
            a.date.localeCompare(b.date),
          )[0];
          if (!raise) {
            passed.push(`${where}: no named worker was raised in 400 days`);
            continue;
          }
          const job = lawWorld.jobs.get(raise.jobId)!;
          const place = lawWorld.organizations.get(job.organizationId)!.placeId;
          const subject = workerSubject(lawWorld, raise.personId);
          // The raise stands on the pay level the engine reads that day, with
          // the line's effect in it.
          expect(raise.values.levelTo, `${where}: ${raise.id}`).toBeCloseTo(
            payLevel(api, place, subject),
            12,
          );
          const live = webReach(
            api,
            place,
            MEDIAN_EARNINGS,
            subject,
          ).parts.find((p) => p.link === DEFENSE);
          expect(live, `${where}: ${raise.id} reads the line`).toBeDefined();
          expect(live!.effect, where).toBeGreaterThan(0);
          const person = lawWorld.people.get(raise.personId)!;
          const sample = priced[0]!;
          process.stdout.write(
            `DEFENSE (LABOR_WEB_SEED=${seed}) ${where}: act ${act} raised ${us.id}'s ${DEFENSE_LINE} line ${DEFENSE_RAISE * 100}% (${budget.id}); the web month ${month} read ${boost.value.toFixed(6)}% of ${stateKey}'s output as extra contracts, so the link moves earnings ${(part.effect * 100).toFixed(6)}% (size ${size}); ${workers.length} named workers' pay level ran ${sample.without.toFixed(6)} -> ${sample.withLine.toFixed(6)} (${sample.job.personId}, ${sample.job.id}); ${raise.id}: ${person.givenName} ${person.familyName} (${raise.personId}) was raised on ${raise.date} at pay level ${raise.values.levelFrom.toFixed(6)} -> ${raise.values.levelTo.toFixed(6)}, the line's ${live!.effect.toFixed(6)} in it. Passed over: ${passed.join("; ") || "none"}\n`,
          );
          return;
        }
        throw new Error(
          `No drawn place showed a named worker priced and raised after the line: ${passed.join("; ")}`,
        );
      } finally {
        setBookkeeping(bookkeeping);
      }
    },
  );
});

/** One offer the jobs engine scored for a person, with the web term in it (zero where none). */
interface WebTerm {
  readonly side: "held" | "freed";
  readonly personId: string;
  readonly date: string;
  readonly action: string;
  readonly target: string;
  readonly web: number;
}

describe("having been held for want of bail reaches a defendant's pull to work", () => {
  it(
    `a defendant held while cash bail is law is weighed a lower pull to work than the same one freed by a law that ended it (seed ${seed})`,
    { timeout: 3_600_000 },
    () => {
      const bookkeeping = setBookkeeping(false);
      const terms: WebTerm[] = [];
      // The defendants being watched, and which world is which.
      const watch = new Set<string>();
      const sides: { held?: CoreState; freed?: CoreState } = {};
      const original = choice.chooseAct;
      const spy = vi
        .spyOn(choice, "chooseAct")
        .mockImplementation((core, personId, offers, ...rest) => {
          const side =
            core === sides.held
              ? "held"
              : core === sides.freed
                ? "freed"
                : undefined;
          // Only the watched defendants, and the jobs engine's own offers: the
          // other engines weigh theirs through the same chooser.
          if (side && watch.has(personId))
            for (const offer of offers)
              if (JOB_ACTIONS.has(offer.definition.id))
                terms.push({
                  side,
                  personId,
                  date: core.date,
                  action: offer.definition.id,
                  target: offer.targetId,
                  web: Number(
                    offer.reasonBindings?.find((r) => r.id === "web")?.arguments
                      .value ?? 0,
                  ),
                });
          return original(core, personId, offers, ...rest);
        });
      const passed: string[] = [];
      try {
        for (let attempt = 0; attempt < TRIES; attempt += 1) {
          terms.length = 0;
          watch.clear();
          sides.held = sides.freed = undefined;
          const drawn = drawPlace(seed, `labor-web-pretrial:${attempt}`);
          const where = `${drawn.name}, ${drawn.state} (${drawn.key}, seed ${drawn.seed})`;
          const held = build(drawn);
          const api = coreAPI(held);
          if (lawInForce(api, END_CASH_BAIL).value === 1) {
            passed.push(`${where}: cash bail is already ended`);
            continue;
          }
          const freed = build(drawn);
          const fapi = coreAPI(freed);
          sides.held = held;
          sides.freed = freed;
          // The law that ended cash bail, at every level, in the freed world.
          const ended = lawChain(fapi).levels.map((level) =>
            enactLaw(fapi, {
              jurisdiction: level.jurisdiction,
              level: level.level,
              series: END_CASH_BAIL,
              value: 1,
              effectiveDate: freed.date,
              measureId: `labor-web-pretrial-${attempt}`,
              citation: "Labor web test: a law that ended cash bail",
            }),
          );
          expect(lawInForce(fapi, END_CASH_BAIL).value, where).toBe(1);
          const bail = justiceParameters.pretrialBailMinor.value;
          const town = lawChain(api).townPlaceId;
          const candidates = [...held.people.values()]
            .filter(
              (p) =>
                p.alive &&
                p.tier !== "husk" &&
                p.id !== held.playerId &&
                p.placeId === town &&
                (p.liquidMinor ?? 0) < bail &&
                freed.people.has(p.id) &&
                // Working age, so the monthly review weighs their work.
                ageOnDate(p.birthDate, held.date) >= 22 &&
                ageOnDate(p.birthDate, held.date) <= 54,
            )
            .sort((a, b) => a.id.localeCompare(b.id));
          const charge = (
            core: CoreState,
            personId: string,
          ): CaseRow | null => {
            const capi = coreAPI(core);
            const table = (name: string) =>
              capi.moduleState(JUSTICE_MODULE_ID).table(name);
            const row: InvestigationRow = {
              id: `investigation:labor-web:${personId}`,
              complaintIds: [],
              crimeId: `crime:labor-web:${personId}`,
              prosecutorOfficeId: `office:labor-web:${personId}`,
              prosecutorPersonId: null,
              opened: true,
              date: core.date,
              reasons: {},
              targets: [
                {
                  personId,
                  crimeIds: [],
                  evidence: [],
                  strength: justiceParameters.chargeBar.value + 0.1,
                },
              ],
              status: "open",
            };
            table("investigations").put(row as never);
            chargeDecision(capi, row.id);
            return (
              (table("cases").get(`case:${row.id}:${personId}`) as unknown as
                CaseRow | undefined) ?? null
            );
          };
          const pretrialOf = (core: CoreState, c: CaseRow) =>
            coreAPI(core)
              .moduleState(JUSTICE_MODULE_ID)
              .table("pretrial")
              .get(`pretrial:${c.id}`) as unknown as PretrialRow | undefined;
          // The same poor defendants charged on the same day in both worlds.
          const defendants: {
            id: string;
            heldRow: PretrialRow;
            freedRow: PretrialRow;
          }[] = [];
          for (const person of candidates) {
            if (defendants.length >= 6) break;
            const a = charge(held, person.id);
            const b = charge(freed, person.id);
            if (a?.status !== "charged" || b?.status !== "charged") continue;
            const heldRow = pretrialOf(held, a);
            const freedRow = pretrialOf(freed, b);
            expect(heldRow?.decision, `${where}: ${person.id}`).toBe("held");
            expect(freedRow?.decision, `${where}: ${person.id}`).toBe(
              "released-no-bail-law",
            );
            defendants.push({
              id: person.id,
              heldRow: heldRow!,
              freedRow: freedRow!,
            });
          }
          if (!defendants.length) {
            passed.push(`${where}: no poor defendant was charged`);
            continue;
          }
          const link = linkOf(DETENTION_LINK);
          expect(link.size, "the row's researched size").toBeLessThan(0);
          expect(link.carriedBy, "the jobs engine carries it").toContain(
            "detentionShift",
          );
          const chargedOn = defendants[0]!.heldRow.from;
          // Past the lag by a month, so a monthly review falls after it.
          const lagDay = addDays(
            makeIsoDate(chargedOn),
            Math.ceil((link.lagMonths * 365.25) / 12) + 31,
          );
          for (const d of defendants) watch.add(d.id);
          while (held.date < lagDay) {
            step(held);
            step(freed);
          }
          // The web term the engine scored for a defendant on each review
          // day, offer by offer, in each world.
          const reviews = (side: WebTerm["side"], id: string) => {
            const days = new Map<string, Map<string, number>>();
            for (const t of terms)
              if (t.side === side && t.personId === id) {
                const day = days.get(t.date) ?? new Map<string, number>();
                day.set(`${t.action}|${t.target}`, t.web);
                days.set(t.date, day);
              }
            return days;
          };
          const lagMoves = Math.log(1 + link.size!);
          const look = JOBS_DATA.actions.look.id;
          const leave = JOBS_DATA.actions.leave.id;
          for (const d of defendants) {
            const inHeld = reviews("held", d.id);
            const inFreed = reviews("freed", d.id);
            const days = [...inHeld.keys()]
              .filter((day) => inFreed.has(day))
              .sort();
            const lagUp = (day: string) =>
              completedMonthsBetween(
                makeIsoDate(d.heldRow.from),
                makeIsoDate(day),
              ) >= link.lagMonths;
            // Before the lag has run from the day they were first held, the
            // two worlds weigh the same.
            for (const day of days.filter((x) => !lagUp(x)))
              for (const [key, web] of inHeld.get(day)!)
                expect(
                  web - (inFreed.get(day)!.get(key) ?? 0),
                  `${where}: ${d.id} on ${day}, ${key}, before the lag`,
                ).toBeCloseTo(0, 12);
            const after = days.filter(lagUp);
            if (!after.length) continue;
            const day = after[0]!;
            // After it, every offer that carries the pull moves by the log of
            // one plus the size: looking for work is entered at it, a job is
            // left at its negative.
            const moved = [...inHeld.get(day)!].filter(
              ([key, web]) => web !== (inFreed.get(day)!.get(key) ?? 0),
            );
            expect(
              moved.length,
              `${where}: ${d.id} on ${day} has a moved offer`,
            ).toBeGreaterThan(0);
            for (const [key, web] of moved) {
              const gap = web - (inFreed.get(day)!.get(key) ?? 0);
              const action = key.split("|")[0];
              expect(
                action === look || action === leave,
                `${where}: ${key} is an offer of the pull to work`,
              ).toBe(true);
              expect(gap, `${where}: ${d.id} on ${day}, ${key}`).toBeCloseTo(
                action === look ? lagMoves : -lagMoves,
                9,
              );
            }
            const person = held.people.get(d.id)!;
            process.stdout.write(
              `PRETRIAL (LABOR_WEB_SEED=${seed}) ${where}: ${ended.map((row) => row.id).join(", ")} ended cash bail in the freed world; ${person.givenName} ${person.familyName} (${d.id}) was ${d.heldRow.decision} (${d.heldRow.id}) against ${d.freedRow.decision} (${d.freedRow.id}) on ${chargedOn}; on the review of ${day}, ${link.lagMonths} months on, the jobs engine scored ${moved.map(([key, web]) => `${key} at web ${web.toFixed(6)} against ${(inFreed.get(day)!.get(key) ?? 0).toFixed(6)}`).join(", ")} (the link's log ${lagMoves.toFixed(6)}, size ${link.size}); ${days.filter((x) => !lagUp(x)).length} reviews before the lag matched. Passed over: ${passed.join("; ") || "none"}\n`,
            );
            return;
          }
          passed.push(
            `${where}: ${defendants.length} defendants charged, none reviewed in both worlds after the lag`,
          );
        }
        throw new Error(
          `No drawn place showed a held defendant reviewed after the lag: ${passed.join("; ")}`,
        );
      } finally {
        spy.mockRestore();
        setBookkeeping(bookkeeping);
      }
    },
  );
});

/**
 * The played world, alive: builds the town exactly as the player gets it
 * (`buildBenchWorld`, two-level, economy on, every module the bench installs),
 * lets it run on its own the way a character lives through a skip, and fails
 * when the world isn't alive.
 *
 * Each assertion comes from one of the 20 breaks in
 * docs/reports/sim-stories-2026-10-12.md (branch cto/sim-stories-1905) and
 * names the module responsible. An assertion that fails today is listed in
 * FAILING_TODAY with the session fixing it and is checked the other way round
 * (like `it.fails`): the check stays green while it is broken, and when the
 * fix lands the run fails until the fixer removes the entry, so it becomes a
 * real pass. A break that shows in some towns and not others (births, loan
 * sizes, workers left with no cash) is judged across the nightly's three
 * worlds: it counts as fixed when it is broken in none of them and alive in
 * at least two. An assertion whose
 * subject never came up in this world (no official moved, no business was
 * founded) is skipped and says so.
 *
 * PR run: one world, one game year, seed and place from the golden-path
 * runner (GOLDEN_PATH_SEED, GOLDEN_PATH_PLACE_KEY; a random seed when unset),
 * printed. Nightly (GOLDEN_PATH_MODE=nightly): three worlds of three game
 * years each. PLAYED_WORLD_SEED and PLAYED_WORLD_YEARS override.
 * Run: node --max-old-space-size=8192 --expose-gc --import tsx tests/golden-path/played-world.node-test.ts
 * (plain node:test under tsx: Vitest's transform added a minute to the run).
 */
import { createHash, randomBytes } from "node:crypto";
import { performance } from "node:perf_hooks";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import housingConstruction from "../../src/core2/data/housing/construction.json" with { type: "json" };
import { buildBenchWorld } from "../../src/bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { addDays, ageOnDate, makeIsoDate } from "../../src/simulation/dates";
import {
  residentCounts,
  residentsRuntime,
} from "../../src/core2/modules/residents";
import { departuresOf } from "../../src/core2/modules/moves";
import {
  BUDGETS_MODULE_ID,
  budgetsOf,
  governments,
  type withholdingOf,
} from "../../src/core2/modules/budgets";
import {
  LEGISLATURE_MODULE_ID,
  POLICY_QUESTIONS,
  authorityFor,
} from "../../src/core2/modules/legislature";
import { OFFICES_MODULE_ID } from "../../src/core2/modules/offices";
import {
  ELECTIONS_MODULE_ID,
  ballot,
  checkEligibility,
  incumbentOf,
} from "../../src/core2/modules/elections";
import {
  officialCandidateId,
  resultOf,
  VOTING_MODULE_ID,
  type BallotRow,
} from "../../src/core2/modules/voting";
import { WORLD_RACES_MODULE_ID } from "../../src/core2/modules/world-races";
import { WORLD_LEGISLATING_MODULE_ID } from "../../src/core2/modules/world-legislating";
import {
  OUTCOME_WEB_MODULE_ID,
  type WebMonth,
} from "../../src/core2/modules/outcome-web";
import {
  LAWS_MODULE_ID,
  lawChain,
  lawInForce,
} from "../../src/core2/modules/laws";
import { PLACE_PRICES_MODULE_ID } from "../../src/core2/modules/place-prices";
import { outcomeIssueView } from "../../src/core2/modules/views";
import { withholdingFor } from "../../src/core2/tax-withholding";
import { healthReport } from "../../src/core2/modules/health";
import {
  termLimitReached,
  TERM_LIMITS,
  RESTORE_VOTE,
  PHOTO_ID,
} from "../../src/core2/law-reach/group-a-voting";
import { purchaseTaxes } from "../../src/core2/modules/purchase-tax";
import { jobsAt } from "../../src/core2/law-reach/group-b-money";
import {
  reachParameter,
  townFacts,
  selectResidents,
} from "../../src/core2/law-reach/group-b-people";

import { REACH_A_MODULE_ID } from "../../src/core2/law-reach/group-a-records";
import { WEB_LINKS, WEB_SETTINGS } from "../../src/core2/outcome-web-model";
import type { LawRowInput } from "../../src/core2/laws-starting";
import type { CoreAPI, CoreModule, CoreState } from "../../src/core2/types";

/** The bench's opening day (src/bench/m0-check.ts). */
const OPENING_DATE = "2026-10-12";
const nightly = process.env.GOLDEN_PATH_MODE === "nightly";
/** The runner's own draw for its first world, so its receipt names the place that ran. */
const runnerPlace =
  !process.env.PLAYED_WORLD_SEED && process.env.GOLDEN_PATH_PLACE_KEY
    ? process.env.GOLDEN_PATH_PLACE_KEY
    : undefined;
const years = Number(process.env.PLAYED_WORLD_YEARS ?? (nightly ? 3 : 1));
const baseSeed =
  process.env.PLAYED_WORLD_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(20).toString("hex");
const seeds = nightly
  ? [0, 1, 2].map((n) =>
      n
        ? createHash("sha256").update(`${baseSeed}:${n}`).digest("hex")
        : baseSeed,
    )
  : [baseSeed];
/**
 * Retained heap after a forced collection at the end of the run. Measured
 * Oct 13, 2026 on a 4-core cloud machine: 1,151 to 1,258 MB after one year
 * (three towns) and 1,633 to 1,785 MB after three years (two towns). Bound:
 * 1,500 MB plus 500 MB a year, so 2,000 MB for the PR's year and 3,000 MB for
 * the nightly's three, about 1.6 times the largest measured.
 */
const HEAP_BOUND_MB = 1_500 + 500 * years;
/**
 * A new business's loan is within the founder's means when the founder puts
 * in at least a tenth of it (SBA 7(a) start-up equity injection, 10%,
 * SOP 50 10 7.1): the loan is at most nine times the founder's own cash.
 */
const LOAN_TO_FOUNDER_CASH = 9;
const SCHOOL_AGES = [5, 17] as const;
const ROUTINE_ACTS = new Set(["rest", "contact-known-person"]);

/**
 * Assertions failing today, by the session fixing each. When a fix makes one
 * pass, remove its line here in the same PR. `byTown` marks a break that
 * shows in some towns and not others; it counts as fixed only when broken in
 * none of the three nightly worlds and alive in at least two.
 */
const FAILING_TODAY: Record<string, { owner: string; byTown?: true }> = {
  "every module": { owner: "FIXER-WIRE-ALL-MODULES" },
  // State and federal terms are filled since races elsewhere run in the
  // played world; some towns still leave local terms unfilled.
  "every ended term is filled": {
    owner: "FIXER-OFFICES-ELECTIONS",
    byTown: true,
  },
  // Alive where officials move away; unobserved where none do.
  "nobody serves after moving away": { owner: "FIXER-MOVES", byTown: true },
  // Full couples of childbearing age are rare among the full people today
  // (OPUS-CORE, BOARD item 4: a representative sample).
  "a baby is born": { owner: "OPUS-CORE", byTown: true },
  // Alive in some towns; others still leave a home unpriced.
  "homes have values and rents": { owner: "FIXER-ECONOMY", byTown: true },
  "pay reaches a spendable account": { owner: "FIXER-ECONOMY", byTown: true },
  "a new business's loan fits its founder": {
    owner: "FIXER-ECONOMY",
    byTown: true,
  },
};
/** Each byTown assertion's state in every world so far. */
const byTownStates = new Map<string, Verdict["state"][]>();

type Row = Record<string, unknown>;
const rowsOf = (core: CoreState, moduleId: string, table: string) =>
  coreAPI(core).moduleState(moduleId).table(table).rows() as unknown as Row[];

// Every way the core calls into a module; a module ran when any was called.
const HOOKS = [
  "onCalendarWork",
  "onWorkResult",
  "onWorkAttendance",
  "onWorkPayroll",
  "onAfterDay",
  "onSalesReceipt",
  "onDay",
  "onEvent",
  "onEventAppraisal",
  "onRelationshipChange",
] as const;
const OPERATIONS = [
  "needEvaluators",
  "offerProviders",
  "effectHandlers",
  "eligibilityRules",
  "reasonProviders",
] as const;
let calls = new Map<string, number>();
const wrapped = Symbol("played-world-counted");
// Reset alongside call counts for each sequential played world. Shared module
// wrappers must not close over a previous world's state or payment history.
let cashPayments = new Map<
  string,
  {
    id: string;
    date: string;
    sourceRef: { id: string };
    grossDebitMinor: number;
  }
>();
let liftedOperatingLimits = new Map<
  string,
  { recordId: string; date: string; before: number; after: number }
>();
let endedComplianceCosts = new Map<string, string>();
let careWorkEligibility = new Map<string, boolean>();
/** Counts calls and observes completed payments without retaining full game history. */
function countCalls(core: CoreState) {
  cashPayments = new Map();
  liftedOperatingLimits = new Map();
  endedComplianceCosts = new Map();
  careWorkEligibility = new Map();
  calls = new Map();
  const count = (id: string) => calls.set(id, (calls.get(id) ?? 0) + 1);
  const wrap = <F extends (...args: never[]) => unknown>(id: string, f: F) =>
    ((...args: Parameters<F>) => {
      count(id);
      const api = args[0] as CoreAPI | undefined;
      if (
        api &&
        typeof api.postJournal === "function" &&
        typeof api.accounts === "function"
      ) {
        const observed: CoreAPI = {
          ...api,
          postJournal(input) {
            const result = api.postJournal(input);
            cashPayments.set(input.id, {
              id: input.id,
              date: input.date,
              sourceRef: { id: input.sourceRef.id },
              grossDebitMinor: input.postings.reduce(
                (n, p) => n + Math.max(0, -p.deltaMinor),
                0,
              ),
            });
            return result;
          },
          accounts() {
            const accounts = api.accounts();
            return {
              ...accounts,
              transfer(input) {
                const receipt = accounts.transfer(input);
                if (
                  receipt.paidMinor > 0 &&
                  receipt.journalSequence !== undefined
                ) {
                  const journalId = `journal:${receipt.date}:${receipt.journalSequence}`;
                  cashPayments.set(journalId, {
                    id: journalId,
                    date: receipt.date,
                    sourceRef: { id: receipt.id },
                    grossDebitMinor: receipt.paidMinor,
                  });
                }
                return receipt;
              },
            };
          },
        };
        const forwarded = [...args];
        forwarded[0] = observed as never;
        // The business engine deletes repealed limits. Observe its existing
        // sales-flow amounts across that act instead of losing the evidence.
        const limits =
          id === "business"
            ? api
                .moduleState("business")
                .table("operating")
                .rows()
                .filter(
                  (row) => row.kind === "limit" && row.input === "groundwater",
                )
            : [];
        const flows = limits.flatMap((rule) =>
          [...(residentsRuntime(api.state as CoreState)?.flows.values() ?? [])]
            .filter(
              (flow) =>
                flow.kind === "outside-sales" &&
                !flow.endedAt &&
                flow.payeeId === rule.organizationId,
            )
            .map((flow) => ({
              ruleId: rule.id,
              question: String(rule.cause),
              flow,
              before: flow.amountMinor,
            })),
        );
        const costs =
          id === "business"
            ? api
                .moduleState("business")
                .table("operating")
                .rows()
                .filter(
                  (row) =>
                    row.kind === "cost" &&
                    ((api.state as CoreState).finance.businesses.get(
                      String(row.organizationId),
                    )?.annualOtherCostsMinor ?? 0) > 0 &&
                    [...cashPayments.values()].some(
                      (paid) =>
                        paid.sourceRef.id.startsWith(`compliance:${row.id}:`) &&
                        paid.grossDebitMinor > 0,
                    ),
                )
            : [];
        if (id === "core2-health-producer-p10-v1") {
          const admissions = healthReport(api.state as CoreState).cases.filter(
            (row) => row.onsetDate === api.state.date,
          );
          if (admissions.length) {
            const chain = lawChain(api);
            const facts = townFacts(api, chain.townPlaceId);
            const eligible = new Set(
              selectResidents(
                facts,
                {
                  ageFrom: "medicaidExpansionAgeFrom",
                  ageBelow: "medicaidExpansionAgeBelow",
                  incomeBelowPovertyShare: "medicaidExpansionIncomeShare",
                },
                chain.stateKey,
              ).map((row) => row.id),
            );
            const workLimited = new Set(
              selectResidents(
                facts,
                {
                  ageFrom: "medicaidExpansionAgeFrom",
                  ageBelow: "medicaidExpansionAgeBelow",
                  hoursBelowPerMonth: "medicaidWorkHoursPerMonth",
                  noChildBelow: "medicaidWorkExemptChildBelow",
                },
                chain.stateKey,
              ).map((row) => row.id),
            );
            const expanded =
              lawInForce(
                api,
                "us-policy-positions:health-human-services.expand-medicaid-eligibility",
              ).value === 1;
            for (const admission of admissions)
              careWorkEligibility.set(
                `${admission.personId}:${admission.onsetDate}`,
                expanded &&
                  eligible.has(admission.personId) &&
                  workLimited.has(admission.personId),
              );
          }
        }
        const result = f(...forwarded);
        for (const held of flows) {
          if (
            api.moduleState("business").table("operating").get(held.ruleId) ||
            held.before === held.flow.amountMinor
          )
            continue;
          const law = lawInForce(api, held.question);
          if (law.value === 0 && law.governing)
            liftedOperatingLimits.set(law.governing.id, {
              recordId: held.flow.id,
              date: api.state.date,
              before: held.before,
              after: held.flow.amountMinor,
            });
        }
        for (const held of costs) {
          if (api.moduleState("business").table("operating").get(held.id))
            continue;
          const law = lawInForce(api, String(held.cause));
          if (law.value === 0 && law.governing)
            endedComplianceCosts.set(law.governing.id, held.id);
        }
        return result;
      }
      return f(...args);
    }) as unknown as F;
  for (const module of core.modules.values()) {
    const target = module as CoreModule & Record<symbol, boolean>;
    if (target[wrapped] || Object.isFrozen(target)) continue;
    const id = module.id;
    const writable = target as unknown as Record<string, unknown>;
    for (const hook of HOOKS) {
      const f = writable[hook];
      if (typeof f === "function")
        writable[hook] = wrap(id, f as (...a: never[]) => unknown);
    }
    for (const category of OPERATIONS) {
      const table = writable[category] as
        Record<string, (...a: never[]) => unknown> | undefined;
      if (!table || Object.isFrozen(table)) continue;
      for (const name of Object.keys(table))
        table[name] = wrap(id, table[name]!);
    }
    target[wrapped] = true;
  }
  // Event subscriptions keep their listener; count it under its module.
  for (const subscribers of [
    core.eventSubscribers,
    core.eventAppraisalSubscribers,
    core.relationshipSubscribers,
  ] as Map<string, (...a: never[]) => unknown>[])
    for (const [key, listener] of subscribers)
      subscribers.set(key, wrap(key.replace(/^module:/, ""), listener));
  return cashPayments;
}
/** Every module table's contents, as a hash. */
function moduleRecords(core: CoreState): Map<string, string> {
  const out = new Map<string, string>();
  for (const module of core.modules.values()) {
    if (!module.state) continue;
    const hash = createHash("sha1");
    const store = coreAPI(core).moduleState(module.id);
    for (const name of Object.keys(module.state.tables))
      hash.update(name).update(JSON.stringify(store.table(name).rows()));
    out.set(module.id, hash.digest("hex"));
  }
  return out;
}

interface Verdict {
  state: "alive" | "broken" | "unobserved";
  why: string;
}
const pass = (why: string): Verdict => ({ state: "alive", why });
const fail = (why: string): Verdict => ({ state: "broken", why });
/** The subject never came up in this world, so it can't be judged here. */
const unobserved = (why: string): Verdict => ({ state: "unobserved", why });

/** Builds one played world, runs it, and reads every fact the assertions need. */
function playWorld(seed: string) {
  setBookkeeping(false); // play runs without the debug checks (AGENTS.md)
  const place =
    runnerPlace && seed === baseSeed
      ? { seed, key: runnerPlace }
      : drawPlace(seed, "played-world");
  const buildStarted = performance.now();
  const world = buildBenchWorld(place.seed, OPENING_DATE, {
    twoLevel: true,
    placeKey: place.key,
  });
  const buildSeconds = (performance.now() - buildStarted) / 1000;
  const core = world.core;
  const start = core.date;
  let end = addDays(makeIsoDate(start), Math.round(365.25 * years));
  const nextJanuary = `${Number(start.slice(0, 4)) + 1}-01-01`;
  const playerId = world.playerId!;
  const playerBirth = makeIsoDate(core.people.get(playerId)!.birthDate);
  const focusAtStart = new Set(core.focusPersonIds);
  const peopleAtStart = new Set(core.people.keys());
  const actsAtStart = new Map(
    [...core.people.values()].map((p) => [p.id, new Map(p.actsByKind)]),
  );
  const countedAtStart = residentCounts(core).reduce((n, r) => n + r.people, 0);
  const countedIdsAtStart = new Set(
    [...(residentsRuntime(core)?.households.values() ?? [])].flatMap((h) =>
      h.people.map((p) => p.id),
    ),
  );
  const recordsAtStart = moduleRecords(core);
  const wagesAtStart = new Map(
    [...core.jobs.values()].map((job) => [job.id, job.hourlyMinor]),
  );
  const endingTerms = rowsOf(core, OFFICES_MODULE_ID, "terms").filter(
    (t) =>
      t.status === "serving" &&
      typeof t.endDate === "string" &&
      t.endDate >= start &&
      t.endDate <= end,
  );
  const observedPayments = countCalls(core);

  // Day by day, watching what only shows on the day it happens.
  const cashYesterday = new Map<string, number>();
  const foundings: { id: string; loanMinor: number; meansMinor: number }[] = [];
  const foundingTable = coreAPI(core)
    .moduleState("business")
    .table("foundings");
  const schoolAgeIds = new Set<string>();
  let foundingsSeen = foundingTable.size;
  const runStarted = performance.now();
  for (let day = start; day < end;) {
    for (const p of core.people.values()) {
      cashYesterday.set(p.id, p.liquidMinor);
      if (!p.alive || p.tier === "husk") continue;
      const age = ageOnDate(makeIsoDate(p.birthDate), makeIsoDate(day));
      if (age >= SCHOOL_AGES[0] && age <= SCHOOL_AGES[1])
        schoolAgeIds.add(p.id);
    }
    const next = addDays(makeIsoDate(day), 1);
    advanceCore(core, next);
    if (foundingTable.size !== foundingsSeen) {
      foundingsSeen = foundingTable.size;
      for (const row of foundingTable.rows() as unknown as Row[]) {
        if (foundings.some((f) => f.id === row.id)) continue;
        if (typeof row.date !== "string" || row.date < start) continue;
        const founderId = String(row.founderId);
        const residents = residentsRuntime(core);
        const counted = residents?.households
          .get(residents.householdOfPerson.get(founderId) ?? "")
          ?.people.find((p) => p.id === founderId);
        foundings.push({
          id: String(row.id),
          loanMinor: Number(row.loanMinor ?? 0),
          meansMinor: cashYesterday.get(founderId) ?? counted?.liquidMinor ?? 0,
        });
      }
    }
    day = next;
  }
  const gc = (globalThis as { gc?: () => void }).gc;
  if (!gc)
    throw new Error(
      "Run with --expose-gc so memory is measured after collection.",
    );
  gc();
  const annualHeapMB = process.memoryUsage().heapUsed / 1e6;
  // Changed voting rules need an election. Continue to the next recorded
  // contest when the annual window ended before it.
  const votingChanges = rowsOf(core, LAWS_MODULE_ID, "laws")
    .filter(
      (row) =>
        [RESTORE_VOTE, PHOTO_ID].includes(String(row.series)) &&
        String(row.effectiveDate) >= start &&
        String(row.effectiveDate) <= core.date &&
        lawInForce(
          coreAPI(core),
          String(row.series),
          addDays(makeIsoDate(String(row.effectiveDate)), -1),
        ).value !== row.value,
    )
    .sort((a, b) =>
      String(a.effectiveDate).localeCompare(String(b.effectiveDate)),
    );
  for (const change of votingChanges) {
    const contests = rowsOf(core, ELECTIONS_MODULE_ID, "contests").filter(
      (row) => String(row.electionDate) >= String(change.effectiveDate),
    );
    const observed = contests.some((row) =>
      resultOf(coreAPI(core), String(row.id)),
    );
    const next = contests
      .filter((row) => String(row.electionDate) > core.date)
      .sort((a, b) =>
        String(a.electionDate).localeCompare(String(b.electionDate)),
      )[0];
    if (!observed && next) {
      end = addDays(makeIsoDate(String(next.electionDate)), 1);
      console.log(
        JSON.stringify({
          electionExtension: change.id,
          from: core.date,
          to: end,
          contest: next.id,
        }),
      );
      advanceCore(core, end);
    }
  }
  const runSeconds = (performance.now() - runStarted) / 1000;
  gc();
  const heapMB = process.memoryUsage().heapUsed / 1e6;
  const elapsedYears = Math.max(
    years,
    (Date.parse(core.date) - Date.parse(start)) /
      (365.25 * 24 * 60 * 60 * 1000),
  );
  const extendedHeapBoundMB = 1_500 + 500 * elapsedYears;

  const paidReceipts = [
    ...observedPayments.values(),
    ...core.cashJournal.detailedReceipts.values(),
  ];
  const api = coreAPI(core);
  const verdicts: Record<string, Verdict> = {};

  // Break 17 and the module audit: every installed module did something.
  const recordsAtEnd = moduleRecords(core);
  // Modules with no hook, operation or table only describe data (journal
  // source providers); there is nothing of theirs to run.
  const engines = [...core.modules.values()]
    .filter(
      (m) =>
        m.state ||
        HOOKS.some((h) => m[h]) ||
        OPERATIONS.some((o) => Object.keys(m[o] ?? {}).length),
    )
    .map((m) => m.id);
  const idle = engines.filter(
    (id) =>
      !calls.get(id) &&
      (!recordsAtEnd.has(id) ||
        recordsAtEnd.get(id) === recordsAtStart.get(id)),
  );
  const unchanged = [...recordsAtEnd.keys()].filter(
    (id) => recordsAtEnd.get(id) === recordsAtStart.get(id),
  );
  verdicts["every module"] =
    idle.length || unchanged.length
      ? fail(
          `Installed modules that never ran: ${idle.join(", ") || "none"}; modules whose records never changed in ${years} year(s): ${unchanged.join(", ") || "none"}.`,
        )
      : pass(`all ${engines.length} engines ran and changed their records`);
  // A changed law/person table is not evidence that an enacted policy worked.
  const enactedLaws = (
    api
      .moduleState(LAWS_MODULE_ID)
      .table("laws")
      .rows() as unknown as LawRowInput[]
  ).filter(
    (law) =>
      law.terms?.enactedBy &&
      law.effectiveDate >= OPENING_DATE &&
      law.effectiveDate <= core.date,
  );
  const webMonths = api
    .moduleState(OUTCOME_WEB_MODULE_ID)
    .table("months")
    .rows() as unknown as WebMonth[];
  const lawEffects: string[] = [],
    ineffective: string[] = [];
  for (const law of enactedLaws) {
    const links = WEB_LINKS.filter((link) => link.from === `law:${law.series}`);
    const effect = webMonths.find(
      (row) =>
        row.date >= law.effectiveDate &&
        lawInForce(api, law.series, row.date).governing?.id === law.id &&
        links.some((link) => {
          const [year, month, day] = row.date.split("-").map(Number);
          const causeDate = new Date(
            Date.UTC(year!, month! - 1 - link.lagMonths, Math.min(day!, 28)),
          )
            .toISOString()
            .slice(0, 10);
          if (lawInForce(api, law.series, causeDate).governing?.id !== law.id)
            return false;
          const previous = webMonths
            .filter(
              (other) =>
                other.placeId === row.placeId && other.date < law.effectiveDate,
            )
            .sort((a, b) => b.date.localeCompare(a.date))[0];
          if (
            !previous ||
            row.effects[link.key] === previous.effects[link.key] ||
            row.values[link.to] === previous.values[link.to]
          )
            return false;
          return (
            outcomeIssueView(api, row.placeId, law.series, 0.5).recordIds
              .length > 0
          );
        }),
    );
    const payment = paidReceipts.find(
      (row) =>
        row.date >= law.effectiveDate &&
        row.sourceRef.id.includes(law.id) &&
        row.grossDebitMinor > 0,
    );
    const raise = api
      .moduleState(LAWS_MODULE_ID)
      .table("raises")
      .rows()
      .find(
        (row) =>
          String(row.lawId).includes(law.id) &&
          Number(row.toMinor) > Number(row.fromMinor) &&
          (core.jobs.get(String(row.jobId))?.hourlyMinor ??
            residentsRuntime(core)?.jobs.get(String(row.jobId))?.hourlyMinor ??
            0) >= Number(row.toMinor),
      );
    const previousLaw = lawInForce(
      api,
      law.series,
      addDays(makeIsoDate(law.effectiveDate), -1),
    );
    // An enactment can repeat existing law or be preempted by a governing
    // level. Neither creates a new effect for this town (owner, Oct. 13).
    const governingAtEnactment = lawInForce(api, law.series, law.effectiveDate);
    const noOp =
      (previousLaw.value ?? 0) === law.value
        ? `no-op: already ${law.value}; prior ${previousLaw.governing?.id ?? "default"}`
        : governingAtEnactment.governing?.id !== law.id
          ? `no-op: governed by ${governingAtEnactment.governing?.id ?? "default"}`
          : undefined;
    // A researched delay is not a missing effect. Verify the cause actually
    // reached a kept outcome row that views read, retaining its size/lag.
    const registeredCause = api
      .moduleState(OUTCOME_WEB_MODULE_ID)
      .table("laws")
      .get(law.id);
    const superseded = enactedLaws
      .filter(
        (other) =>
          other.series === law.series &&
          other.effectiveDate > law.effectiveDate &&
          lawInForce(api, law.series, other.effectiveDate).governing?.id !==
            law.id,
      )
      .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate))[0];
    const observedUntil = superseded?.effectiveDate ?? core.date;
    const deferredLink =
      registeredCause &&
      links.find((link) => {
        const due = new Date(`${law.effectiveDate}T00:00:00Z`);
        const effectiveDay = due.getUTCDate();
        const landingDay = WEB_SETTINGS.schedule.dayOfMonth;
        due.setUTCDate(landingDay);
        due.setUTCMonth(
          due.getUTCMonth() +
            link.lagMonths +
            (effectiveDay > landingDay ? 1 : 0),
        );
        return (
          link.size !== null &&
          Number.isFinite(link.size) &&
          link.lagMonths > 0 &&
          due.toISOString().slice(0, 10) > observedUntil &&
          registeredCause.series === law.series &&
          Number(registeredCause.value) === law.value &&
          webMonths.some(
            (row) =>
              row.placeId === lawChain(api).townPlaceId &&
              row.date >= law.effectiveDate &&
              Number.isFinite(row.effects[link.key]) &&
              outcomeIssueView(api, row.placeId, law.series, 0.5).recordIds
                .length > 0,
          )
        );
      });
    const deferred = deferredLink
      ? `${registeredCause!.id}: registered ${deferredLink.key}, size=${deferredLink.size}, lag=${deferredLink.lagMonths} months${superseded ? `; superseded before landing by ${superseded.id}` : ""}`
      : undefined;
    const purchaseRule =
      law.series ===
        "us-policy-positions:fiscal.exempt-groceries-from-sales-tax" &&
      lawInForce(api, law.series).governing?.id === law.id
        ? [...purchaseTaxes(core).values()].find(
            (row) =>
              row.placeId === lawChain(api).townPlaceId &&
              row.from >= law.effectiveDate &&
              row.ratePercent > 0 &&
              !row.endedAt &&
              Boolean(row.exemptClassificationPrefixes?.length) ===
                (law.value === 1),
          )
        : undefined;
    const price =
      previousLaw.value !== law.value
        ? api
            .moduleState(PLACE_PRICES_MODULE_ID)
            .table("rules")
            .rows()
            .find(
              (row) =>
                String(row.cause).includes(law.id) && Number(row.value) !== 0,
            )
        : undefined;
    const salary = [...core.work.payChanges.entries()].find(
      ([jobId, changes]) =>
        changes.some(
          (change, index) =>
            change.source.citation.includes(law.id) &&
            change.date >= law.effectiveDate &&
            (index > 0 || wagesAtStart.has(jobId)) &&
            change.hourlyMinor !==
              (changes[index - 1]?.hourlyMinor ?? wagesAtStart.get(jobId)),
        ),
    );
    let engineNoOp: string | undefined;
    if (
      law.series ===
      "us-policy-positions:education.raise-teacher-minimum-salary"
    ) {
      const publicTeachers = jobsAt(
        api,
        ["service:school"],
        "profession:teacher",
      );
      const teachers = publicTeachers.length
        ? publicTeachers
        : jobsAt(api, ["service:private-school"], "profession:teacher");
      const floor =
        (reachParameter("teacherMinimumSalaryDollars") *
          reachParameter("centsPerDollar")) /
        reachParameter("daysPerYear");
      if (
        !raise &&
        !salary &&
        teachers.every((job) => job.wageDailyMinor >= floor)
      )
        engineNoOp = `no-op: ${teachers.length} covered teachers already meet daily floor ${floor}; jobs=${teachers.map((job) => job.id).join(",")}`;
    }
    if (law.series === "us-policy-positions:fiscal.adopt-income-tax") {
      const existing = lawInForce(
        api,
        "income-tax",
        addDays(makeIsoDate(law.effectiveDate), -1),
      ).levels.find(
        (row) => row.level === law.level && row.row && (row.row.value ?? 0) > 0,
      );
      if (existing?.row)
        engineNoOp = `no-op: income tax already collected under ${existing.row.id}`;
    }
    if (
      law.series ===
      "us-policy-positions:government-operations.broaden-local-authority"
    ) {
      const localBills = rowsOf(core, LEGISLATURE_MODULE_ID, "bills").filter(
        (bill) =>
          String(bill.introduced) >= law.effectiveDate &&
          !/:(legislature-|us-house|us-senate)/.test(String(bill.bodyOfficeId)),
      );
      const unregulated = localBills.filter((bill) =>
        (bill.provisions as { kind: string; question?: string }[]).some(
          (provision) =>
            provision.kind === "policy-question" &&
            provision.question &&
            !POLICY_QUESTIONS[provision.question]?.answers[
              lawChain(api).stateKey
            ],
        ),
      );
      if (!unregulated.length)
        engineNoOp = `no-op in this window: no local bill needs home rule for an unregulated matter; inspected=${localBills.map((bill) => bill.id).join(",") || "no local bills"}`;
      else if (
        unregulated.some((bill) =>
          (bill.authority as { source: string }[]).some(
            (row) => row.source === law.id,
          ),
        )
      )
        engineNoOp = `decision authority: ${
          unregulated.find((bill) =>
            (bill.authority as { source: string }[]).some(
              (row) => row.source === law.id,
            ),
          )!.id
        }`;
    }
    if (
      law.series === TERM_LIMITS &&
      lawInForce(api, law.series).governing?.id === law.id
    ) {
      const heldTerms = rowsOf(core, OFFICES_MODULE_ID, "terms").filter(
        (row) => row.personId && row.officeId,
      );
      const barred = heldTerms.flatMap((term) =>
        rowsOf(core, ELECTIONS_MODULE_ID, "contests")
          .filter(
            (contest) =>
              contest.officeId === term.officeId &&
              core.people.has(String(term.personId)),
          )
          .flatMap((contest) =>
            checkEligibility(api, String(term.personId), String(contest.id))
              .filter((check) => check.rule === "term-limit" && !check.met)
              .map(() => `${term.id}; contest=${contest.id}`),
          ),
      );
      if (barred.length)
        engineNoOp = `filing eligibility: ${barred.join(",")}; term-limit requirement fails in the election engine`;
      if (
        heldTerms.every(
          (row) =>
            !termLimitReached(api, String(row.personId), String(row.officeId)),
        )
      )
        engineNoOp = `no-op: no recorded officeholder has reached the engine's term limit; inspected ${heldTerms.length} term records`;
    }
    if (
      law.series ===
      "us-policy-positions:health-human-services.medicaid-work-requirement"
    ) {
      const cases = healthReport(core).cases.filter(
        (row) =>
          row.onsetDate >= law.effectiveDate && row.onsetDate < observedUntil,
      );
      if (!cases.length)
        engineNoOp = `no-op in this window: no care-onset eligibility decision while this law governed, through ${observedUntil}`;
      else if (
        cases.every(
          (row) =>
            lawInForce(
              api,
              "us-policy-positions:health-human-services.expand-medicaid-eligibility",
              row.onsetDate,
            ).value !== 1,
        )
      )
        engineNoOp = `no-op: Medicaid expansion was inactive at every care admission; payments=${cases.map((row) => row.carePaymentId ?? row.personId).join(",")}`;
    }
    if (
      law.series ===
        "us-policy-positions:health-human-services.medicaid-work-requirement" &&
      !engineNoOp
    ) {
      const cases = healthReport(core).cases.filter(
        (row) =>
          row.onsetDate >= law.effectiveDate && row.onsetDate < observedUntil,
      );
      if (
        cases.length &&
        cases.every(
          (row) =>
            careWorkEligibility.get(`${row.personId}:${row.onsetDate}`) ===
            false,
        )
      )
        engineNoOp = `no-op: no admitted patient was both Medicaid-eligible and subject to the work rule at admission; inspected=${cases.map((row) => row.carePaymentId ?? row.personId).join(",")}`;
      const served = cases.find(
        (row) =>
          careWorkEligibility.get(`${row.personId}:${row.onsetDate}`) ===
            true &&
          row.covered === true &&
          (row.carePaidMinor ?? 0) > 0,
      );
      if (law.value === 0 && served && previousLaw.value === 1)
        engineNoOp = `eligibility that paid after work-rule repeal: ${served.carePaymentId}; paid=${served.carePaidMinor}`;
    }
    if (
      law.series ===
        "us-policy-positions:labor-workforce.local-minimum-wage-authority" &&
      lawInForce(api, law.series, law.effectiveDate).governing?.id === law.id
    ) {
      const authority = api
        .moduleState(LAWS_MODULE_ID)
        .table("enactments")
        .query("bySeries", ["local-minimum-wage-authority"])
        .find((row) => row.measureId === law.id);
      // Read the actual law/enactment history at this act's date. Later
      // amendments must not erase the decision this earlier rule supplied.
      const historicalApi: CoreAPI = {
        ...api,
        state: { ...api.state, date: law.effectiveDate },
      };
      const decision = authorityFor(historicalApi, {
        kind: "law-amount",
        series: "minimum-wage",
        value: (lawInForce(historicalApi, "minimum-wage").value ?? 0) + 1,
      });
      if (
        authority &&
        authority.answer === (law.value === 1 ? "yes" : "no") &&
        decision.allowed === (law.value === 1)
      )
        engineNoOp = `local wage decision: ${authority.id}; allowed=${decision.allowed}; reason=${decision.reason}`;
    }
    if (law.series === RESTORE_VOTE) {
      const grantsAt = (date: string) =>
        lawChain(api).levels.flatMap((level) => {
          const latest = (
            api
              .moduleState(LAWS_MODULE_ID)
              .table("laws")
              .query("bySeries", [
                level.jurisdiction,
                RESTORE_VOTE,
              ]) as unknown as LawRowInput[]
          )
            .filter((row) => row.effectiveDate <= date)
            .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
          return latest?.value === 1 ? [latest.id] : [];
        });
      const beforeGrants = grantsAt(
        addDays(makeIsoDate(law.effectiveDate), -1),
      );
      const currentGrants = grantsAt(law.effectiveDate);
      if (Boolean(beforeGrants.length) === Boolean(currentGrants.length))
        engineNoOp = `no-op: restoration eligibility unchanged across active levels; grants=${currentGrants.join(",") || "none"}`;
      const result = rowsOf(core, ELECTIONS_MODULE_ID, "contests")
        .map((contest) => resultOf(api, String(contest.id)))
        .find(
          (row) =>
            row &&
            row.date >= law.effectiveDate &&
            row.date < observedUntil &&
            row.countedEligible > 0 &&
            lawInForce(api, law.series, row.date).governing?.id === law.id,
        );
      if (result && !engineNoOp)
        engineNoOp = `eligibility at election: ${result.id}; ${result.countedEligible} counted voters served`;
      else if (
        superseded &&
        !rowsOf(core, ELECTIONS_MODULE_ID, "contests").some(
          (row) =>
            String(row.electionDate) >= law.effectiveDate &&
            String(row.electionDate) < observedUntil,
        )
      )
        engineNoOp = `no-op in this window: superseded by ${superseded.id} before an election could use this rule`;
    }
    if (law.series === PHOTO_ID) {
      const activeAt = (date: string) =>
        lawChain(api).levels.flatMap((level) => {
          const latest = (
            api
              .moduleState(LAWS_MODULE_ID)
              .table("laws")
              .query("bySeries", [
                level.jurisdiction,
                PHOTO_ID,
              ]) as unknown as LawRowInput[]
          )
            .filter((row) => row.effectiveDate <= date)
            .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
          return latest?.value === 1 ? [latest.id] : [];
        });
      const beforeRules = activeAt(addDays(makeIsoDate(law.effectiveDate), -1));
      const afterRules = activeAt(law.effectiveDate);
      if (Boolean(beforeRules.length) === Boolean(afterRules.length)) {
        engineNoOp = `no-op: photo-ID requirement unchanged across active levels; rules=${afterRules.join(",") || "none"}`;
      } else {
        const decision = (
          api
            .moduleState(VOTING_MODULE_ID)
            .table("ballots")
            .rows() as unknown as BallotRow[]
        ).find(
          (row) =>
            row.date >= law.effectiveDate &&
            row.date < observedUntil &&
            lawInForce(api, PHOTO_ID, row.date).governing?.id === law.id &&
            Number.isFinite(row.turnoutReasons.cost),
        );
        if (decision)
          engineNoOp = `photo-ID turnout decision: ${decision.id}; requirement ${beforeRules.length > 0} -> ${afterRules.length > 0}; recorded cost=${decision.turnoutReasons.cost}`;
        else if (
          superseded &&
          !rowsOf(core, ELECTIONS_MODULE_ID, "contests").some(
            (row) =>
              String(row.electionDate) >= law.effectiveDate &&
              String(row.electionDate) < observedUntil,
          )
        )
          engineNoOp = `no-op in this window: superseded by ${superseded.id} before an election could use the photo-ID rule`;
      }
    }
    const constructionPrice =
      law.series ===
        "us-policy-positions:environment-energy.ban-new-gas-hookups" &&
      law.value === 1 &&
      previousLaw.value !== 1
        ? api
            .moduleState("housing")
            .table("projects")
            .rows()
            .find((project) => {
              const price = Number(project.monthlyCostMinor);
              return (
                project.kind === "single" &&
                project.placeId === lawChain(api).townPlaceId &&
                lawInForce(api, law.series, String(project.startedAt)).governing
                  ?.id === law.id &&
                price > 0 &&
                price !==
                  Math.round(
                    price /
                      (1 + housingConstruction.single.allElectricCostChange),
                  ) &&
                paidReceipts.some(
                  (row) =>
                    row.sourceRef.id.startsWith(
                      `construction:${project.id}:`,
                    ) && row.grossDebitMinor > 0,
                )
              );
            })
        : undefined;
    const beforeDate = addDays(makeIsoDate(law.effectiveDate), -1);
    const withheld = (
      api
        .moduleState(BUDGETS_MODULE_ID)
        .table("withholding")
        .rows() as unknown as ReturnType<typeof withholdingOf>
    ).find((row) => {
      const line = row.lines.find((item) => item.lawId.includes(law.id));
      if (!line || row.date < law.effectiveDate) return false;
      const before = withholdingFor({
        paidMinor: row.paidMinor,
        periodDays: row.periodDays,
        yearToDateMinor: row.yearToDateMinor,
        incomeTax: lawInForce(api, "income-tax", beforeDate),
        socialSecurity: lawInForce(api, "social-security-tax", beforeDate),
        medicare: lawInForce(api, "medicare-tax", beforeDate),
      }).find(
        (item) =>
          item.jurisdiction === line.jurisdiction && item.tax === line.tax,
      );
      return (
        line.minor !== (before?.minor ?? 0) &&
        paidReceipts.some(
          (item) => item.sourceRef.id === row.id && item.grossDebitMinor > 0,
        )
      );
    });
    const premium = core.modules.has(REACH_A_MODULE_ID)
      ? api
          .moduleState(REACH_A_MODULE_ID)
          .table("premiums")
          .rows()
          .find(
            (row) =>
              String(row.reason).includes(law.id) &&
              Number(row.premiumMinor) > 0 &&
              paidReceipts.some(
                (item) =>
                  item.sourceRef.id === row.id && item.grossDebitMinor > 0,
              ),
          )
      : undefined;
    const lifted = liftedOperatingLimits.get(law.id);
    const liftedPayment =
      lifted &&
      paidReceipts.find(
        (row) =>
          row.date >= lifted.date &&
          row.sourceRef.id.includes(lifted.recordId) &&
          row.grossDebitMinor > 0,
      );
    const complianceRule = core.modules.has("business")
      ? api
          .moduleState("business")
          .table("operating")
          .rows()
          .find(
            (row) =>
              row.kind === "cost" &&
              String(
                (row.source as { citation?: string } | undefined)?.citation,
              ).includes(law.id),
          )
      : undefined;
    const compliance =
      complianceRule &&
      paidReceipts.find(
        (row) =>
          row.sourceRef.id.startsWith(`compliance:${complianceRule.id}:`) &&
          row.date >= law.effectiveDate &&
          row.date >= String(complianceRule.since) &&
          row.grossDebitMinor > 0,
      );
    if (
      noOp ||
      engineNoOp ||
      purchaseRule ||
      deferred ||
      effect ||
      payment ||
      raise ||
      price ||
      salary ||
      constructionPrice ||
      withheld ||
      premium ||
      compliance ||
      liftedPayment ||
      endedComplianceCosts.has(law.id)
    )
      lawEffects.push(
        `${law.id} -> ${noOp ?? engineNoOp ?? purchaseRule?.id ?? deferred ?? effect?.id ?? payment?.id ?? raise?.jobId ?? price?.id ?? salary?.[0] ?? constructionPrice?.id ?? withheld?.id ?? premium?.id ?? compliance?.id ?? liftedPayment?.id ?? endedComplianceCosts.get(law.id)}`,
      );
    else
      ineffective.push(
        `${law.id} (${law.series}): no changed read measure, wage/price, or attributable payment; value=${law.value}, previous=${previousLaw.value}, governing=${governingAtEnactment.governing?.id}`,
      );
  }
  verdicts["enacted laws change money or read measures"] = !enactedLaws.length
    ? {
        state: "unobserved",
        why: "No law enacted during this run; LAW-LINK independently enacts all 59.",
      }
    : ineffective.length
      ? fail(ineffective.join("; "))
      : pass(lawEffects.join("; "));
  const missing = [
    WORLD_RACES_MODULE_ID,
    WORLD_LEGISLATING_MODULE_ID,
    OUTCOME_WEB_MODULE_ID,
  ].filter((id) => !core.modules.has(id));
  verdicts["national races, lawmaking and outcomes are installed"] =
    missing.length
      ? fail(
          `The played world (src/bench/world.ts) does not install ${missing.join(", ")}: no president takes office, no policy bill is written and no outcome is measured (breaks 5, 7, 17).`,
        )
      : pass("installed");

  // Break 2: people other than the player live varied days.
  const chosen = new Map<string, number>();
  const choosers = new Set<string>();
  for (const p of core.people.values()) {
    if (p.id === playerId) continue;
    const before = actsAtStart.get(p.id) ?? new Map<string, number>();
    for (const [act, n] of p.actsByKind) {
      const delta = n - (before.get(act) ?? 0);
      if (delta <= 0) continue;
      chosen.set(act, (chosen.get(act) ?? 0) + delta);
      choosers.add(p.id);
    }
  }
  const beyondRoutine = [...chosen.keys()].filter((a) => !ROUTINE_ACTS.has(a));
  const outsideFocus = [...choosers].filter((id) => !focusAtStart.has(id));
  verdicts["people choose varied acts"] =
    beyondRoutine.length && outsideFocus.length
      ? pass(
          `${choosers.size} people chose ${[...chosen.keys()].join(", ")}; ${outsideFocus.length} of them outside the focus set`,
        )
      : fail(
          `Full people other than the player chose only ${[...chosen.keys()].join(", ") || "nothing"} (${choosers.size} people; ${outsideFocus.length} outside the director's focus set of ${focusAtStart.size}). The core's choices (src/core2/life.ts, choice offers) must give people more than rest and contact, and people outside the focus set must choose too.`,
        );

  // Break 2: the golden path's first step happens in play.
  const ageAtStart = ageOnDate(playerBirth, makeIsoDate(start));
  const ageAtEnd = ageOnDate(playerBirth, makeIsoDate(end));
  verdicts["player turns 18"] =
    ageAtStart < 18 && ageAtEnd >= 18
      ? pass(`the player turns 18 in play (from ${ageAtStart})`)
      : fail(
          `The player character was ${ageAtStart} at the opening and ${ageAtEnd} at the end, so turning 18 never happens in play. The bench's entrant pick (src/bench/world.ts, entrantOf) must choose the resident closest to turning 18.`,
        );

  // School: school-age people go to school.
  const schoolActs = [...schoolAgeIds].filter((id) =>
    [...(core.people.get(id)?.actsByKind.keys() ?? [])].some((a) =>
      /school/.test(a),
    ),
  );
  const schoolKinds = [...core.logByKind.keys()].filter((k) =>
    /school/.test(k),
  );
  verdicts["school-age people attend school"] =
    schoolAgeIds.size && (schoolActs.length || schoolKinds.length)
      ? pass(`${schoolActs.length} of ${schoolAgeIds.size} attended school`)
      : fail(
          `${schoolAgeIds.size} full people were of school age (${SCHOOL_AGES[0]} to ${SCHOOL_AGES[1]}) and none attended school: the core's day (src/core2/life.ts) has no school attendance${schoolAgeIds.size ? "" : ", and the played world had nobody of school age"}.`,
        );

  // Break 4: withholding continues after January 1.
  const withheld = rowsOf(core, BUDGETS_MODULE_ID, "withholding").filter(
    (r) => String(r.date) >= nextJanuary,
  );
  const taxes = new Set(
    withheld.flatMap((r) =>
      (r.lines as { tax: string; level: string; minor: number }[])
        .filter((l) => l.minor > 0)
        .map((l) => `${l.level}:${l.tax}`),
    ),
  );
  // Residents of the five territories owe no federal income tax on income
  // earned there (26 U.S.C. 931 to 933: Puerto Rico excludes it, and Guam,
  // the Virgin Islands, American Samoa and the Northern Marianas pay their
  // own territorial income tax instead), but Social Security and Medicare
  // still apply. The place record names its state or territory.
  const territory = ["US-AS", "US-GU", "US-MP", "US-PR", "US-VI"].includes(
    world.place.stateJurisdictionKey ?? "",
  );
  const federalWithheld = territory
    ? taxes.has("federal:social-security") && taxes.has("federal:medicare")
    : taxes.has("federal:income") && taxes.has("federal:social-security");
  verdicts["taxes are withheld after January 1"] = federalWithheld
    ? pass(`withheld after ${nextJanuary}: ${[...taxes].join(", ")}`)
    : fail(
        `After ${nextJanuary}, ${withheld.length} paychecks withheld only ${[...taxes].join(", ") || "nothing"}: federal income tax and Social Security stopped. The laws module's starting tax rows (src/core2/data/laws/starting-law.json, read by src/core2/modules/budgets.ts withhold) must carry forward until a law changes them.`,
      );

  // Break 6: a passed budget changes the adopted spending.
  const bills = rowsOf(core, LEGISLATURE_MODULE_ID, "bills").filter(
    (b) => String(b.introduced) >= start,
  );
  const isBudget = (b: Row) =>
    b.kind === "budget" ||
    ((b.provisions as { kind: string }[]) ?? []).every(
      (p) => p.kind === "budget-line",
    );
  const passedBudgets = bills.filter(
    (b) =>
      isBudget(b) &&
      b.status === "enacted" &&
      ((b.provisions as { value?: number }[]) ?? []).some((p) => p.value),
  );
  // Each passed budget's adopted row names its bill; its spending must
  // differ from the same government's budget the year before.
  const budgets = governments(api).flatMap((g) => budgetsOf(api, g.id));
  // Bill numbers repeat across governments, so a bill counts as reaching
  // spending when any budget adopted under its number changed.
  const unchangedBudgets = passedBudgets.filter(
    (bill) =>
      !budgets.some((adopted) => {
        if (
          adopted.adoptedOn < String(bill.introduced) ||
          // Amendments after adoption are appended ("; amended by ...").
          !adopted.adoptedBy
            .split("; ")[0]!
            .endsWith(`, ${String(bill.number)}`)
        )
          return false;
        const before = budgetsOf(api, adopted.governmentId)
          .filter((row) => row.fiscalYear < adopted.fiscalYear)
          .at(-1);
        return (
          before !== undefined &&
          JSON.stringify(before.spendingMinor) !==
            JSON.stringify(adopted.spendingMinor)
        );
      }),
  );
  verdicts["a passed budget changes spending"] = !passedBudgets.length
    ? unobserved(`no budget with line changes passed in ${years} year(s)`)
    : !unchangedBudgets.length
      ? pass(
          `all ${passedBudgets.length} budgets passed with changes changed their government's spending`,
        )
      : fail(
          `${unchangedBudgets.length} of ${passedBudgets.length} budget bills enacted with line changes left the adopted spending as it was the year before (${unchangedBudgets
            .slice(0, 3)
            .map((b) => String(b.number))
            .join(
              ", ",
            )}). An enacted budget's lines must reach the adopted budget (src/core2/modules/budgets.ts, src/core2/modules/legislature.ts councilBudget).`,
        );

  // Break 7: lawmaking runs.
  const policyBills = bills.filter((b) => !isBudget(b));
  verdicts["a non-budget bill is introduced"] = policyBills.length
    ? pass(`${policyBills.length} policy bills introduced`)
    : fail(
        `Of ${bills.length} bills introduced in ${years} year(s), none was anything but a budget: no council, legislature or Congress proposed a law (core2-world-legislating-v1 is not installed in src/bench/world.ts).`,
      );

  // Breaks 5, 8, 9: every term that ends is followed by an election or appointment.
  const terms = rowsOf(core, OFFICES_MODULE_ID, "terms");
  const vacancies = rowsOf(core, OFFICES_MODULE_ID, "vacancies");
  const unfilled = endingTerms.filter(
    (old) =>
      !terms.some(
        (t) =>
          t.seatId === old.seatId &&
          t.id !== old.id &&
          String(t.startDate) >= String(old.startDate),
      ) && !vacancies.some((v) => v.seatId === old.seatId),
  );
  verdicts["every ended term is filled"] = !endingTerms.length
    ? unobserved("no term ended in the run")
    : unfilled.length
      ? fail(
          `${unfilled.length} of ${endingTerms.length} terms ending in the run had no election, appointment or vacancy after them (for example ${unfilled
            .slice(0, 3)
            .map((t) => `${t.officeId} ending ${t.endDate}`)
            .join(
              "; ",
            )}). Offices and elections (src/core2/modules/offices.ts, elections.ts) must schedule a contest or open a vacancy when a term ends.`,
        )
      : pass(`${endingTerms.length} ending terms all followed`);

  // Break 8: nobody keeps an office after moving away.
  const departures = departuresOf(api).filter((d) => d.date >= start);
  const termsBefore = (id: string, date: string) =>
    terms.some((t) => t.personId === id && String(t.startDate) <= date);
  const movedOfficials = departures.flatMap((d) =>
    [d.personId, ...d.withIds].filter((id) => termsBefore(id, d.date)),
  );
  const movedServing = movedOfficials.filter((id) =>
    terms.some((t) => t.personId === id && t.status === "serving"),
  );
  verdicts["nobody serves after moving away"] = !movedOfficials.length
    ? unobserved(`${departures.length} departures, none by an official`)
    : movedServing.length
      ? fail(
          `${movedServing.length} officials moved away and still serve (${movedServing.slice(0, 3).join(", ")}). Moving away (src/core2/modules/moves.ts) must open a vacancy in the mover's office.`,
        )
      : pass(`${movedOfficials.length} officials moved away and left office`);

  // Break 1: somebody new runs for office.
  const contests = rowsOf(core, ELECTIONS_MODULE_ID, "contests");
  const held = contests.filter((c) => {
    const result = resultOf(api, String(c.id));
    return result && result.date >= start && result.date <= end;
  });
  const challengers = held.flatMap((c) => {
    const incumbent = incumbentOf(api, String(c.id));
    const incumbentId = incumbent
      ? (incumbent.personId ?? officialCandidateId(incumbent.id))
      : undefined;
    return ballot(api, String(c.id)).filter(
      (f) => f.personId !== incumbentId && core.people.has(f.personId),
    );
  });
  verdicts["a named challenger runs"] = !held.length
    ? unobserved("no race was decided in the run")
    : challengers.length
      ? pass(`${challengers.length} named challengers in ${held.length} races`)
      : fail(
          `In ${held.length} races decided in the run, no named person other than the incumbent was on the ballot. Who runs (src/core2/modules/candidacy.ts) must have named adults weigh running when a seat comes up.`,
        );

  // Break 10: the counted population votes in local races.
  const local = held.filter(
    (c) => c.level !== "federal" && c.level !== "state",
  );
  const silent = local.filter(
    (c) =>
      Object.values(resultOf(api, String(c.id))!.countedVotes).reduce(
        (n, v) => n + v,
        0,
      ) === 0 && resultOf(api, String(c.id))!.countedTurnout === 0,
  );
  // Turning out but leaving an indistinguishable race blank is a decision,
  // not missing counted voters. Never require the engine to invent a choice.
  const blank = local.filter((c) => {
    const result = resultOf(api, String(c.id))!;
    return (
      result.countedTurnout > 0 &&
      Object.values(result.countedVotes).every((votes) => votes === 0)
    );
  });
  verdicts["counted voters vote in local races"] = !local.length
    ? unobserved("no local race was decided in the run")
    : !silent.length
      ? pass(
          `counted voters participated in all ${local.length} local races; ${blank.length} had turnout with blank choices; results=${blank.map((c) => resultOf(api, String(c.id))!.id).join(",")}`,
        )
      : fail(
          `${silent.length} of ${local.length} local races decided in the run had no votes from the counted population (for example ${silent
            .slice(0, 3)
            .map((c) => c.title)
            .join(
              "; ",
            )}). Voting (src/core2/modules/voting.ts holdElection) must give counted voters choices in races without party labels.`,
        );

  // Break 12: the counted population changes.
  // A full couple's own decision, not a counted birth: counted births are
  // rates applied to totals and show in the counted population's change.
  const births = rowsOf(core, "core2-renewal-v1", "births").filter(
    (b) => String(b.date) >= start && b.counted !== true,
  );
  // Filling in a counted person moves them to the full people; that is not
  // a change in who lives here.
  const filledIn = [...core.people.keys()].filter(
    (id) => !peopleAtStart.has(id) && countedIdsAtStart.has(id),
  ).length;
  const countedAtEnd = residentCounts(core).reduce((n, r) => n + r.people, 0);
  const countedChange = countedAtEnd + filledIn - countedAtStart;
  countedIdsAtStart.clear();
  verdicts["the counted population changes"] = countedChange
    ? pass(`counted population changed by ${countedChange}`)
    : fail(
        `The counted population stayed at ${countedAtStart} for ${years} year(s), apart from ${filledIn} people filled in: no counted births, deaths or moves (src/core2/modules/residents.ts, src/core2/modules/renewal.ts).`,
      );
  verdicts["a baby is born"] = births.length
    ? pass(`${births.length} births`)
    : fail(
        `No full couple had a baby in ${years} year(s). Births (src/core2/modules/renewal.ts) must follow couples' circumstances; counted births show in the counted population's change.`,
      );

  // Break 16: homes have prices.
  const dwellings = rowsOf(core, "housing", "dwellings");
  const unpriced = dwellings.filter((d) =>
    d.tenure === "rent" ? !Number(d.rentMinor) : !Number(d.valueMinor),
  );
  const renters = dwellings.filter((d) => d.tenure === "rent");
  verdicts["homes have values and rents"] =
    dwellings.length && !unpriced.length && renters.length
      ? pass(`${dwellings.length} homes priced, ${renters.length} rented`)
      : fail(
          `${unpriced.length} of ${dwellings.length} homes have no value or rent, and ${renters.length} are rented. Housing (src/core2/modules/housing.ts) must seed values and rents from the place's records.`,
        );

  // Break 20: pay reaches an account the worker can spend from.
  const paychecks = [...core.work.detailedPayroll.values()].filter(
    (r) => r.date >= start && r.paidMinor > 0,
  );
  const unreached = paychecks.filter(
    (r) => r.payeeCashAfterMinor <= r.payeeCashBeforeMinor,
  );
  const lastMonth = addDays(makeIsoDate(end), -31);
  const paidRecently = new Set(
    paychecks.filter((r) => r.date >= lastMonth).map((r) => r.personId),
  );
  const brokeWorkers = [...paidRecently].filter(
    (id) => (core.people.get(id)?.liquidMinor ?? 0) <= 0,
  );
  verdicts["pay reaches a spendable account"] = !paychecks.length
    ? unobserved("no named person was paid in the run")
    : !unreached.length && !brokeWorkers.length
      ? pass(`${paychecks.length} paychecks reached their workers`)
      : fail(
          `${paychecks.length} paychecks: ${unreached.length} did not raise the worker's cash, and ${brokeWorkers.length} of ${paidRecently.size} people paid in the last month have no cash at the end. Wages (src/core2/work-payroll-cash.ts) must reach the worker's own account.`,
        );

  // Break 15: a new business borrows within its founder's means.
  const oversized = foundings.filter(
    (f) => f.loanMinor > LOAN_TO_FOUNDER_CASH * Math.max(f.meansMinor, 0),
  );
  verdicts["a new business's loan fits its founder"] = !foundings.length
    ? unobserved(`no business was founded in ${years} year(s)`)
    : !oversized.length
      ? pass(`${foundings.length} foundings within means`)
      : fail(
          `${oversized.length} of ${foundings.length} new businesses borrowed more than ${LOAN_TO_FOUNDER_CASH} times the founder's cash (largest loan $${(Math.max(...oversized.map((f) => f.loanMinor)) / 100).toFixed(0)}). Business (src/core2/modules/business.ts) must size a founding to the founder's means.`,
        );

  return {
    summary: {
      seed,
      place: `${world.place.displayName} (${place.key})`,
      placeSeed: place.seed,
      years,
      elapsedYears,
      annualHeapMB: Math.round(annualHeapMB),
      extendedHeapBoundMB: Math.round(extendedHeapBoundMB),
      buildSeconds: Math.round(buildSeconds),
      runSeconds: Math.round(runSeconds),
      heapMB: Math.round(heapMB),
      modules: core.modules.size,
    },
    heapMB,
    annualHeapMB,
    extendedHeapBoundMB,
    verdicts,
  };
}

for (const [index, seed] of seeds.entries()) {
  describe(`played world ${index + 1} of ${seeds.length} (seed ${seed})`, () => {
    let result: ReturnType<typeof playWorld> | undefined;
    before(() => {
      result = playWorld(seed);
      console.log(JSON.stringify({ playedWorld: result.summary }));
      for (const [name, verdict] of Object.entries(result.verdicts))
        console.log(`${verdict.state.toUpperCase()} ${name}: ${verdict.why}`);
    });
    after(() => {
      result = undefined;
      (globalThis as { gc?: () => void }).gc?.();
    });
    const alive = (name: string, nightlyOnly = false) => {
      if (nightlyOnly && years < 3) return;
      const failing = FAILING_TODAY[name];
      const title = failing
        ? `${name} [failing today; ${failing.owner}]`
        : name;
      it(title, (t) => {
        const verdict = result!.verdicts[name]!;
        if (failing?.byTown)
          byTownStates.set(name, [
            ...(byTownStates.get(name) ?? []),
            verdict.state,
          ]);
        if (verdict.state === "unobserved") return t.skip(verdict.why);
        if (!failing) return assert.equal(verdict.state, "alive", verdict.why);
        if (failing.byTown)
          return t.diagnostic(`${verdict.state}: ${verdict.why}`);
        assert.equal(
          verdict.state,
          "broken",
          `Now alive: ${verdict.why}. ${failing.owner}: remove "${name}" from FAILING_TODAY in tests/golden-path/played-world.node-test.ts so it is a real pass.`,
        );
      });
    };
    alive("every module");
    alive("enacted laws change money or read measures");
    alive("national races, lawmaking and outcomes are installed");
    alive("people choose varied acts");
    alive("player turns 18");
    alive("school-age people attend school");
    alive("taxes are withheld after January 1");
    alive("a passed budget changes spending");
    alive("a non-budget bill is introduced");
    alive("every ended term is filled");
    alive("nobody serves after moving away");
    alive("a named challenger runs");
    alive("counted voters vote in local races");
    alive("the counted population changes");
    alive("a baby is born", true);
    alive("homes have values and rents");
    alive("pay reaches a spendable account");
    alive("a new business's loan fits its founder");
    it(`memory after ${years} year(s) stays under ${HEAP_BOUND_MB} MB and extensions keep the same yearly allowance`, () => {
      assert.ok(
        result!.annualHeapMB < HEAP_BOUND_MB,
        `Annual heap ${Math.round(result!.annualHeapMB)} MB exceeds ${HEAP_BOUND_MB} MB (OPUS-CORE).`,
      );
      assert.ok(
        result!.heapMB < result!.extendedHeapBoundMB,
        `Extended heap ${Math.round(result!.heapMB)} MB exceeds ${Math.round(result!.extendedHeapBoundMB)} MB for the actual elapsed years (OPUS-CORE).`,
      );
    });
  });
}

// The nightly's three worlds: a break that shows only in some towns counts as
// fixed when it is broken in none and alive in at least two.
if (seeds.length >= 3)
  describe("across the nightly's worlds", () => {
    for (const [name, failing] of Object.entries(FAILING_TODAY))
      if (failing.byTown)
        it(`${name} [failing today in some towns; ${failing.owner}]`, (t) => {
          const states = byTownStates.get(name) ?? [];
          if (!states.length || states.every((s) => s === "unobserved"))
            return t.skip("not observed in any world");
          const alive = states.filter((s) => s === "alive").length;
          assert.ok(
            states.includes("broken") || alive < 2,
            `Now alive in ${alive} of ${states.length} worlds and broken in none. ${failing.owner}: remove "${name}" from FAILING_TODAY in tests/golden-path/played-world.node-test.ts so it is a real pass.`,
          );
        });
  });

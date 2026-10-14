/**
 * Day-one dump for the stress audit (Oct 14, 2026). Read-only on src/.
 * Builds the played world (buildBenchWorld, two levels, every module) on the
 * game's start date and writes every record the audit reads to one JSON file.
 *
 *   node --import tsx docs/reports/stress-audit-day-one-2026-10-14/dump-day-one.ts <seed> <out.json> [placeKey]
 */
import { writeFileSync } from "node:fs";
import { buildBenchWorld } from "../../../src/bench/world";
import { gameStartDate } from "../../../src/core2/game-start";
import {
  moduleState,
  moduleStateStores,
  moduleTableSizes,
} from "../../../src/core2/module-state";
import {
  residentCounts,
  residentsRuntime,
} from "../../../src/core2/modules/residents";
import { personOrFillIn } from "../../../src/core2/state";
import { advanceCore } from "../../../src/core2/life";
import { addDays, makeIsoDate } from "../../../src/core2/kernel/dates";

const [seed, out, placeKey] = process.argv.slice(2);
if (!seed || !out) throw new Error("usage: <seed> <out.json> [placeKey]");

const started = Date.now();
const w = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  ...(placeKey ? { placeKey } : {}),
});
const buildMs = Date.now() - started;
const core = w.core;

const plain = (value: unknown): unknown =>
  JSON.parse(
    JSON.stringify(value, (_key, v) =>
      v instanceof Map
        ? Object.fromEntries(v)
        : v instanceof Set
          ? [...v]
          : typeof v === "bigint"
            ? String(v)
            : v,
    ),
  );

const modules: Record<string, unknown> = {};
for (const [id, store] of moduleStateStores(core)) {
  try {
    modules[id] = plain(store.snapshot().tables);
  } catch (error) {
    modules[id] = { error: String(error) };
  }
}

const logKinds: Record<string, number> = {};
for (const [kind, ids] of core.logByKind) logKinds[kind] = ids.size;

/** Plain data with the long provenance texts cut to their tag. */
const lean = (value: unknown): unknown =>
  JSON.parse(
    JSON.stringify(value, (key, v) =>
      key === "source" && v && typeof v === "object"
        ? { tag: (v as { tag?: string }).tag }
        : v instanceof Map
          ? Object.fromEntries(v)
          : v instanceof Set
            ? [...v]
            : v,
    ),
  );

// Everything on day one, taken before the fill-in and the first day run.
const dayOne = {
  seed,
  date: core.date,
  startedAt: core.startedAt,
  buildMs,
  place: plain(w.place),
  placeId: w.placeId,
  playerId: w.playerId,
  placeMetadata: core.placeMetadata,
  people: plain([...core.people.values()]),
  husks: plain([...core.husks.values()]),
  households: plain([...core.households.values()]),
  jobs: plain([...core.jobs.values()]),
  organizations: plain([...core.organizations.values()]),
  publicOrganizations: plain([...core.publicOrganizations.values()]),
  relationships: core.relationships.size,
  familyLinks: plain([...core.familyLinks.values()]),
  memberships: plain([...core.memberships.values()]),
  knowledgeOfPlayer: w.playerId
    ? plain(core.knowledgeByPerson.get(w.playerId) ?? new Map())
    : null,
  durableLog: plain([...core.durableLog.values()]),
  logKinds,
  stopgapHits: [...core.stopgapHits],
  gaps: [...core.gaps],
  finance: plain(core.finance),
  modules,
};

// The counted (wider) population, as its records stand on day one.
const rt = residentsRuntime(core);
const counted = rt
  ? {
      accounts: plain(rt.input.accounts),
      households: [...rt.households.values()].length,
      townHouseholds: [...rt.households.values()]
        .filter((record) => record.household.placeId === w.placeId)
        .map((record) =>
          lean({
            household: record.household,
            people: record.people,
            jobs: record.jobs,
          }),
        ),
      jobs: rt.jobs.size,
      flowsByKind: [...rt.flows.values()].reduce<Record<string, number>>(
        (acc, flow) => ((acc[flow.kind] = (acc[flow.kind] ?? 0) + 1), acc),
        {},
      ),
      sampleFlows: plain([...rt.flows.values()].slice(0, 40)),
      openingCashByPlace: plain(rt.openingCashByPlace),
      counts: plain(residentCounts(core)),
    }
  : null;

// Fill in one counted worker at the town's biggest counted employer and see
// whether the filled-in person matches the records.
let fillIn: unknown = null;
if (rt) {
  const byOrg = new Map<string, { personId: string; job: unknown }[]>();
  for (const record of rt.households.values())
    if (record.household.placeId === w.placeId)
      for (const job of record.jobs)
        byOrg.set(job.organizationId, [
          ...(byOrg.get(job.organizationId) ?? []),
          { personId: job.personId, job },
        ]);
  const biggest = [...byOrg].sort((a, b) => b[1].length - a[1].length)[0];
  if (biggest) {
    const pick = biggest[1][0]!;
    const person = personOrFillIn(core, pick.personId);
    fillIn = plain({
      organizationId: biggest[0],
      organization: core.organizations.get(biggest[0]),
      countedWorkers: biggest[1].length,
      countedJob: pick.job,
      filledPerson: person,
      filledJob: person?.jobId ? core.jobs.get(person.jobId) : null,
      household: person ? core.households.get(person.householdId) : null,
    });
  }
}

// Run the first simulated day and record which engine tables fill.
const sizesBefore = moduleTableSizes(core);
let firstDay: unknown;
try {
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const after = moduleTableSizes(core);
  firstDay = {
    date: core.date,
    grew: Object.fromEntries(
      Object.entries(after).filter(([k, v]) => v !== (sizesBefore[k] ?? 0)),
    ),
    macro: plain(moduleState(core, "macro").snapshot().tables),
  };
} catch (error) {
  firstDay = { error: String(error) };
}

writeFileSync(out, JSON.stringify(dayOne));
writeFileSync(
  out.replace(/\.json$/, "-counted.json"),
  JSON.stringify({ counted, fillIn, firstDay }),
);
console.log(
  JSON.stringify({
    seed,
    place: w.place.key,
    placeId: w.placeId,
    playerId: w.playerId,
    people: core.people.size,
    husks: core.husks.size,
    households: core.households.size,
    jobs: core.jobs.size,
    organizations: core.organizations.size,
    buildMs,
  }),
);

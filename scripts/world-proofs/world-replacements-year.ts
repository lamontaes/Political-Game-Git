/**
 * Replacement proof (OPUS-WORLD, owner ruling Oct 14: every role is refilled
 * when its holder dies, leaves or is removed): build the played world as the
 * bench builds it, run a game year, and print by record id each worker who
 * died or moved away, the opening that replaces them, and who filled it.
 *
 * node --import tsx scripts/world-proofs/world-replacements-year.ts <seed> [placeKey] [days]
 */
import { performance } from "node:perf_hooks";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { JOBS_MODULE_ID } from "../../src/core2/modules/jobs";
import { drawPlace } from "../../tests/golden-path/place";

const seed = process.argv[2] ?? `${Date.now()}`;
// A place drawn from all 56 by the seed, as the golden-path runner draws.
const placeKey = process.argv[3] || drawPlace(seed, "world-replacements").key;
const days = Number(process.argv[4] ?? 365);
const start = gameStartDate();

// The monthly counted record it reads is kept only under bookkeeping.
setBookkeeping(true);

const t0 = performance.now();
const world = buildBenchWorld(seed, start, { twoLevel: true, placeKey });
const core = world.core;
const api = coreAPI(core);
const end = new Date(`${start}T00:00:00Z`);
end.setUTCDate(end.getUTCDate() + days);
advanceCore(core, end.toISOString().slice(0, 10));
const seconds = (performance.now() - t0) / 1000;

interface Change {
  id: string;
  date: string;
  personId: string;
  organizationId: string;
  jobId: string;
  kind: string;
  reasonKey: string;
}
interface Position {
  id: string;
  organizationId: string;
  occupation: string;
  openedAt: string;
  status: string;
  filledBy?: string;
  replacesJobId?: string;
  replacesPersonId?: string;
}
const state = api.moduleState(JOBS_MODULE_ID);
const changes = state.table("changes").rows() as unknown as Change[];
const positions = state.table("positions").rows() as unknown as Position[];
const byReplaced = new Map(
  positions
    .filter((row) => row.replacesJobId)
    .map((row) => [row.replacesJobId!, row]),
);
const name = (id: string | undefined) => {
  const p = id ? core.people.get(id) : undefined;
  return p ? `${p.givenName} ${p.familyName}` : id;
};
const chain = (reason: string) => {
  const left = changes.filter((row) => row.reasonKey === reason);
  const replaced = left.filter((row) => byReplaced.has(row.jobId));
  const filled = replaced.filter(
    (row) => byReplaced.get(row.jobId)!.status === "filled",
  );
  const sample = filled[0] ?? replaced[0] ?? left[0];
  const position = sample ? byReplaced.get(sample.jobId) : undefined;
  const hire = position?.filledBy
    ? changes.find(
        (row) =>
          row.kind === "hire" &&
          row.personId === position.filledBy &&
          row.organizationId === position.organizationId,
      )
    : undefined;
  return {
    left: left.length,
    replacementOpened: replaced.length,
    replacementFilled: filled.length,
    sample: sample && {
      left: { ...sample, who: name(sample.personId) },
      employer: core.organizations.get(sample.organizationId)?.name,
      opening: position,
      filledBy: position?.filledBy && name(position.filledBy),
      hire,
    },
  };
};

// The wider population's deaths, from the renewal engine's monthly rows.
const countedDeaths = new Map<string, string>();
if (core.modules.has("core2-renewal-v1"))
  for (const row of api
    .moduleState("core2-renewal-v1")
    .table("counts")
    .rows() as unknown as { id: string; deaths?: string[] }[])
    for (const id of row.deaths ?? []) countedDeaths.set(id, row.id);
const countedDied = positions.filter(
  (row) => row.replacesPersonId && countedDeaths.has(row.replacesPersonId),
);
const countedSample =
  countedDied.find((row) => row.status === "filled") ?? countedDied[0];
const countedHire = countedSample?.filledBy
  ? changes.find(
      (c) =>
        c.kind === "hire" &&
        c.personId === countedSample.filledBy &&
        c.organizationId === countedSample.organizationId,
    )
  : undefined;

console.log(
  JSON.stringify(
    {
      seed,
      place: placeKey,
      span: [start, core.date],
      seconds: Math.round(seconds),
      died: chain("died"),
      movedAway: chain("moved-away"),
      quitOrRetired: {
        replacementOpened: positions.filter(
          (row) =>
            row.replacesJobId &&
            changes.some(
              (c) =>
                c.jobId === row.replacesJobId &&
                (c.kind === "quit" || c.reasonKey === "retired"),
            ),
        ).length,
      },
      countedDied: {
        deaths: countedDeaths.size,
        replacementOpened: countedDied.length,
        replacementFilled: countedDied.filter((row) => row.status === "filled")
          .length,
        sample: countedSample && {
          died: countedSample.replacesPersonId,
          deathsRow: countedDeaths.get(countedSample.replacesPersonId!),
          employer: core.organizations.get(countedSample.organizationId)?.name,
          opening: countedSample,
          hire: countedHire,
        },
      },
      countedReplacementsOpened: positions.filter(
        (row) =>
          row.replacesJobId &&
          !changes.some((c) => c.jobId === row.replacesJobId),
      ).length,
      openings: {
        replacements: positions.filter((row) => row.replacesJobId).length,
        growth: positions.filter((row) => !row.replacesJobId).length,
      },
    },
    null,
    2,
  ),
);

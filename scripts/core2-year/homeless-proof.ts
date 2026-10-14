/**
 * Homelessness item 4 in a played year: a person who loses their home forms
 * the resolve to secure one (or, by their traits, carries on), and that
 * resolve raises their pull to look for and apply for work, through the
 * same chooser. Each step by record id.
 * Run: node --import tsx scripts/core2-year/homeless-proof.ts [seed] [days]
 */
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import { DevMode } from "../../src/bench/dev-mode";
import { BenchPlayer } from "../../src/bench/player";
import { HOUSING_STATUS_EVENT } from "../../src/core2/housing-homeless";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";

setBookkeeping(false);
const seed = process.argv[2] ?? randomBytes(6).toString("hex");
const days = Number(process.argv[3] ?? 365);
const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
const core = world.core;
const api = coreAPI(core);
console.log(`${world.place.displayName}, seed ${seed}, ${days} days`);

const lost = new Map<string, { id: string; status: string; date: string }>();
const formed = new Map<string, { id: string; date: string }>();
const evictions: string[] = [];
const emit = api.emit.bind(api);
api.emit = ((event: Parameters<typeof emit>[0]) => {
  if (event.kind === HOUSING_STATUS_EVENT)
    for (const id of event.personIds)
      if (!lost.has(id))
        lost.set(id, {
          id: event.id,
          status: String(event.facts?.status ?? ""),
          date: event.date,
        });
  if (event.kind === "housing.eviction") evictions.push(event.id);
  return emit(event);
}) as typeof api.emit;
const dev = new DevMode(
  core,
  world.director,
  new BenchPlayer(core, world.director),
  world.placeId,
);
dev.advance(addDays(makeIsoDate(core.date), days));

for (const person of core.people.values())
  for (const drive of person.drives.values())
    if (drive.kind === "keep-home" && !formed.has(person.id))
      formed.set(person.id, { id: drive.id, date: drive.sourceEventId });
const seekers = api.moduleState("jobs").table("seekers");
console.log(
  `${evictions.length} evictions; ${lost.size} people lost their home; ${formed.size} formed the resolve to secure one`,
);
let shown = 0;
for (const [personId, row] of lost) {
  if (shown >= 6) break;
  shown += 1;
  const person = core.people.get(personId);
  const seeker = seekers.get(personId) as
    { since?: string; reasonKey?: string } | undefined;
  const job = person?.jobId ? core.jobs.get(person.jobId) : undefined;
  console.log(
    `  ${personId}: ${row.status} on ${row.date} (${row.id}); resolve ${formed.get(personId)?.id ?? "none (carried on or too young)"}; looking ${seeker ? `since ${seeker.since} (${seeker.reasonKey})` : "no"}; job ${job ? `${job.title} from ${job.startsAt}` : "none"}`,
  );
}
const housing = api.moduleState("housing");
const cases = housing.table("cases").rows() as {
  stage?: string;
  status?: string;
}[];
const stages = new Map<string, number>();
for (const row of cases) {
  const key = String(row.stage ?? row.status ?? "?");
  stages.set(key, (stages.get(key) ?? 0) + 1);
}
console.log(
  `housing: ${cases.length} cases by stage ${JSON.stringify([...stages])}; ${housing.table("statuses").size} households not housed`,
);

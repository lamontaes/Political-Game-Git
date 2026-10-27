/* global process, console */
// Roadmap M1-11, drives from the economy, in the place the golden-path runner
// draws (GOLDEN_PATH_SEED, GOLDEN_PATH_PLACE_KEY). Builds the world the player
// gets (`buildBenchWorld`, every module) and plays a year with the ordinary
// producers (nothing is injected), keeping every response the drives engine
// records to a job loss, an eviction or a closure. Then:
// (1) job losses or closures happened, and every event the producers emitted
//     that named someone was answered. Whether a kind happened is read from
//     the producers' own events, never from the responses: a kind no producer
//     emitted in the year (often evictions in a small town) is named in the
//     output as not exercised; one that happened but lost its responses fails,
//     and an event that named no one is listed by its id;
// (2) displaced workers (job losses and closures) take up an ambition at the
//     displaced-worker rate and most carry on, the band the engine's own test
//     uses (data/research/drives/economic-losses.json: retraining 10 to 16
//     percent plus a few points of new businesses);
// (3) everyone who answered was named by the event's records or shares a
//     household or family with someone it named, counted people included
//     (src/bench/m1-11-named.ts);
// (4) every drive formed from these events that aims at someone aims at the
//     party the event names as responsible, and that party is a record.
// Exits nonzero naming each failed clause. M1_11_DROP_RESPONSES_OF=<kind>
// drops that kind's responses as they are recorded, to show the check fails.
// Usage: node --max-old-space-size=8192 --import tsx src/bench/m1-11-check.ts
import { buildBenchWorld } from "./world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import type { CoreEventInput } from "../core2/types";
import {
  DEFAULT_DRIVES_DATA,
  drivesReport,
  responsibleId,
  type FormationTrace,
} from "../core2/modules/drives";
import { residentFacts, residentsRuntime } from "../core2/modules/residents";
import { coreAPI } from "../core2/state";
import { answeredByNamed } from "./m1-11-named";
import { occurrence, type OccurredEvent } from "./m1-11-occurred";

const seed = process.env.GOLDEN_PATH_SEED ?? "m1-11-check";
const placeKey = process.env.GOLDEN_PATH_PLACE_KEY;
const failures: string[] = [];
const check = (ok: unknown, message: string) => {
  if (!ok && failures.length < 40) failures.push(message);
};
const LOSS = new Set(["work.job-lost", "organization.closed"]);
const KINDS = new Set([...LOSS, "housing.eviction"]);
// The band drives-economy.test.ts holds the engine to.
const PROVE = [0.06, 0.25] as const;
const CARRY_ON_AT_LEAST = 0.6;

setBookkeeping(false);
const w = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  ...(placeKey ? { placeKey } : {}),
});
const { core } = w;
const where = `${w.place.displayName} (${w.place.key}), seed ${seed}`;

// Every response the engine records, kept whole: its own list keeps only the
// latest few hundred. Watching changes nothing it does.
const answers: FormationTrace[] = [];
// The counted workers each closure ended, read when the engine answers it:
// by the year's end their jobs may be gone from the counted records.
const endedCounted = new Map<string, string[]>();
const closureWorkers = (eventId: string) => {
  const closure = core.finance.closures.get(
    eventId.split(":").slice(2).join(":"),
  );
  const jobs = residentsRuntime(core)?.jobs;
  return (closure?.endedCountedJobIds ?? []).flatMap((id) => {
    const personId = jobs?.get(id)?.personId;
    return personId ? [personId] : [];
  });
};
const { factKeys: driveFacts } = DEFAULT_DRIVES_DATA as unknown as {
  factKeys: { countedSubject: string; countedPerceivers: string };
};
// Every event of these kinds the producers emit, with the people it named
// then: full people, and the counted people its records name (its counted
// subject and perceivers, and the counted workers a closure ended).
const occurred: OccurredEvent[] = [];
coreAPI(core).subscribeEvents("m1-11-check", [...KINDS], (_api, event) => {
  watch();
  const facts = (event.facts ?? {}) as Record<string, string | undefined>;
  const perceivers = facts[driveFacts.countedPerceivers];
  const counted = [
    facts[driveFacts.countedSubject],
    ...(perceivers ? (JSON.parse(perceivers) as string[]) : []),
  ].filter((id): id is string => !!id);
  // The engine answers a full person who is alive and a counted person still
  // in the counts; anyone else the records name is kept, by id, as unable to.
  const candidates = [
    ...(event.personIds ?? []),
    ...counted,
    ...(event.kind === "organization.closed" ? closureWorkers(event.id) : []),
  ];
  const able = (id: string) =>
    core.people.get(id as never)?.alive === true ||
    (!core.people.has(id as never) &&
      residentFacts(core, id as never) !== undefined);
  occurred.push({
    id: event.id,
    kind: event.kind,
    named: [...new Set(candidates.filter(able))],
    ineligible: [...new Set(candidates.filter((id) => !able(id)))],
  });
});
const dropped = process.env.M1_11_DROP_RESPONSES_OF;
const take = (row: FormationTrace) => {
  if (!KINDS.has(row.eventKind) || row.eventKind === dropped) return;
  answers.push(row);
  if (row.eventKind === "organization.closed" && !endedCounted.has(row.eventId))
    endedCounted.set(row.eventId, closureWorkers(row.eventId));
};
// The engine makes its list the first time it answers anything; until then
// the report hands out an empty one it never writes. Watch the live list from
// the moment it exists, taking what it already holds when it appeared during
// the year (an opening's answers are not this year's).
let watched: FormationTrace[] | undefined;
const watch = (held = true) => {
  const report = drivesReport(core);
  // No runtime yet: `perceived` is unset and the list is a stand-in.
  if (report.perceived === undefined || report.decisions === watched) return;
  const kept = report.decisions;
  if (held) for (const row of kept) take(row);
  const push = kept.push.bind(kept);
  kept.push = (...rows: FormationTrace[]) => {
    for (const row of rows) take(row);
    return push(...rows);
  };
  watched = kept;
};
watch(false);
advanceCore(core, addDays(makeIsoDate(core.date), 365));
watch();

// (1) Events happened and were answered.
const events = new Map<string, FormationTrace["event"] & { kind: string }>();
for (const row of answers)
  events.set(row.eventId, { ...row.event, kind: row.eventKind });
const byKind = (kind: string) =>
  [...events.values()].filter((e) => e.kind === kind).length;
const losses = answers.filter((row) => LOSS.has(row.eventKind));
// Read from the producers' events: a kind that never happened in this town's
// year is named, not failed (a small town can go a year without an
// eviction); an event that happened and named someone must have been
// answered. A year in which no worker lost a job (Rosston, Oklahoma: no
// layoff, three closures with no one on staff) leaves the displaced-worker
// clauses unchecked and says so, as it does for a kind that never happened.
const report = occurrence(
  KINDS,
  occurred,
  new Set(answers.map((row) => row.eventId)),
);
const { notExercised } = report;
for (const kind of KINDS) {
  const lost = report.unanswered.filter((event) => event.kind === kind);
  check(
    lost.length === 0,
    `${where}: ${lost.length} ${kind} events named someone and drew no response (${lost
      .slice(0, 3)
      .map((event) => `${event.id} naming ${event.named.join(" ")}`)
      .join(", ")})`,
  );
}

// (2) The displaced-worker rate.
const share = (id: string) =>
  losses.filter((row) => row.chosen.responseId === id).length /
  Math.max(1, losses.length);
const prove = share("prove-oneself");
const carryOn = share("carry-on");
// The band is for a whole population; one town's year is a sample of its
// displaced workers, so each bound widens by two standard errors at that
// sample's size (three workers can all carry on by chance; 145 cannot).
const n = Math.max(1, losses.length);
const slack = (p: number) => 2 * Math.sqrt((p * (1 - p)) / n);
const low = Math.max(0, PROVE[0] - slack(PROVE[0]));
const high = Math.min(1, PROVE[1] + slack(PROVE[1]));
const carryFloor = Math.max(0, CARRY_ON_AT_LEAST - slack(CARRY_ON_AT_LEAST));
check(
  losses.length === 0 || (prove >= low && prove <= high),
  `${where}: ${(100 * prove).toFixed(1)}% of ${losses.length} displaced workers set out to prove themselves, outside ${(100 * low).toFixed(1)}-${(100 * high).toFixed(1)}% (${100 * PROVE[0]}-${100 * PROVE[1]}% with this sample's error)`,
);
check(
  losses.length === 0 || carryOn >= carryFloor,
  `${where}: only ${(100 * carryOn).toFixed(1)}% of ${losses.length} displaced workers carry on, under ${(100 * carryFloor).toFixed(1)}% (${100 * CARRY_ON_AT_LEAST}% with this sample's error)`,
);

// (3) Who answered: someone the event's records name (for a counted person,
// its counted subject, perceivers or the counted workers a closure ended), or
// their household or family. Being counted is never enough by itself.
const counted = residentsRuntime(core);
const kin = new Map<string, Set<string>>();
for (const link of core.familyLinks.values()) {
  const [a, b] = link.personIds;
  kin.set(a, (kin.get(a) ?? new Set()).add(b));
  kin.set(b, (kin.get(b) ?? new Set()).add(a));
}
const lookups = {
  householdOf: (id: string) =>
    core.people.get(id as never)?.householdId ??
    counted?.householdOfPerson.get(id as never),
  kinOf: (id: string) => kin.get(id),
  endedCountedWorkers: (eventId: string) => endedCounted.get(eventId) ?? [],
  factKeys: driveFacts,
};
let unnamed = 0;
const unnamedSample: string[] = [];
for (const row of answers) {
  if (answeredByNamed(row, lookups)) continue;
  unnamed += 1;
  if (unnamedSample.length < 3)
    unnamedSample.push(`${row.personId} for ${row.eventId}`);
}
check(
  unnamed === 0,
  `${where}: ${unnamed} people answered an event that named neither them nor their household or family (${unnamedSample.join("; ")})`,
);

// (4) Every aimed drive aims at the party the event names, a record.
// The party an event names is read by the drives engine's own `responsibleId`
// (one rule, not a second copy): the responsible fact, else the person its
// record names as deciding the harm (who decided a layoff), else the topic or
// the institution the record names.
const responsible = (id: string) =>
  // The trace keeps the event without its id, people and place; the engine's
  // rule reads only the id, the facts, the topic and the kind.
  responsibleId(
    DEFAULT_DRIVES_DATA,
    { ...events.get(id)!, id } as unknown as CoreEventInput,
    core.people,
  );
const isRecord = (id: string) =>
  core.people.has(id as never) || core.organizations.has(id);
const aimed = drivesReport(core).drives.filter(
  (d) => events.has(d.sourceEventId) && d.targetId,
);
let misaimed = 0;
const misaimedSample: string[] = [];
for (const drive of aimed) {
  const party = responsible(drive.sourceEventId);
  if (drive.targetId === party && isRecord(drive.targetId!)) continue;
  misaimed += 1;
  if (misaimedSample.length < 3)
    misaimedSample.push(
      `${drive.id} of ${drive.personId} aims at ${drive.targetId}, the event names ${party}`,
    );
}
check(
  misaimed === 0,
  `${where}: ${misaimed} drives aim at someone other than the party the event names (${misaimedSample.join("; ")})`,
);

const byResponse = (kind: string) => {
  const out: Record<string, number> = {};
  for (const row of answers.filter((r) => r.eventKind === kind))
    out[row.chosen.responseId] = (out[row.chosen.responseId] ?? 0) + 1;
  return out;
};
const sample = aimed.slice(0, 3).map((d) => ({
  drive: d.id,
  person: d.personId,
  target: d.targetId,
  event: d.sourceEventId,
}));
console.log(
  JSON.stringify(
    {
      place: where,
      events: {
        jobLosses: byKind("work.job-lost"),
        closures: byKind("organization.closed"),
        evictions: byKind("housing.eviction"),
      },
      notExercised,
      displacedClausesRan: losses.length > 0,
      occurred: occurred.length,
      namedNoOne: report.namedNoOne.length,
      namedNoOneSample: report.namedNoOne.slice(0, 5).map((event) => ({
        event: event.id,
        ineligible: event.ineligible,
      })),
      answers: answers.length,
      countedAnswers: answers.filter((row) => row.counted).length,
      countedSample: answers
        .filter((row) => row.counted)
        .slice(0, 2)
        .map((row) => ({ person: row.personId, event: row.eventId })),
      displacedWorkers: losses.length,
      proveOneself: +prove.toFixed(3),
      carryOn: +carryOn.toFixed(3),
      responses: {
        jobLoss: byResponse("work.job-lost"),
        closure: byResponse("organization.closed"),
        eviction: byResponse("housing.eviction"),
      },
      aimedDrives: aimed.length,
      sample,
    },
    null,
    2,
  ),
);
if (failures.length) {
  console.log(`M1-11 FAIL:\n${failures.join("\n")}`);
  process.exit(1);
}
console.log(`M1-11 passed: ${where}`);

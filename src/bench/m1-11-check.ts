/* global process, console */
// Roadmap M1-11, drives from the economy, in the place the golden-path runner
// draws (GOLDEN_PATH_SEED, GOLDEN_PATH_PLACE_KEY). Builds the world the player
// gets (`buildBenchWorld`, every module) and plays a year with the ordinary
// producers (nothing is injected), keeping every response the drives engine
// records to a job loss, an eviction or a closure. Then:
// (1) such events happened and people answered them;
// (2) displaced workers (job losses and closures) take up an ambition at the
//     displaced-worker rate and most carry on, the band the engine's own test
//     uses (data/research/drives/economic-losses.json: retraining 10 to 16
//     percent plus a few points of new businesses);
// (3) everyone who answered was named by the event or shares a household or
//     family with someone it named;
// (4) every drive formed from these events that aims at someone aims at the
//     party the event names as responsible, and that party is a record.
// Exits nonzero naming each failed clause.
// Usage: node --max-old-space-size=8192 --import tsx src/bench/m1-11-check.ts
import { buildBenchWorld } from "./world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import {
  DEFAULT_DRIVES_DATA,
  drivesReport,
  type FormationTrace,
} from "../core2/modules/drives";

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
const kept = drivesReport(core).decisions;
const push = kept.push.bind(kept);
kept.push = (...rows: FormationTrace[]) => {
  for (const row of rows) if (KINDS.has(row.eventKind)) answers.push(row);
  return push(...rows);
};

advanceCore(core, addDays(makeIsoDate(core.date), 365));

// (1) Events happened and were answered.
const events = new Map<string, FormationTrace["event"] & { kind: string }>();
for (const row of answers)
  events.set(row.eventId, { ...row.event, kind: row.eventKind });
const byKind = (kind: string) =>
  [...events.values()].filter((e) => e.kind === kind).length;
const losses = answers.filter((row) => LOSS.has(row.eventKind));
check(
  losses.length > 0,
  `${where}: no job loss or closure was answered in a year`,
);

// (2) The displaced-worker rate.
const share = (id: string) =>
  losses.filter((row) => row.chosen.responseId === id).length /
  Math.max(1, losses.length);
const prove = share("prove-oneself");
const carryOn = share("carry-on");
check(
  losses.length === 0 || (prove >= PROVE[0] && prove <= PROVE[1]),
  `${where}: ${(100 * prove).toFixed(1)}% of displaced workers set out to prove themselves, outside ${100 * PROVE[0]}-${100 * PROVE[1]}%`,
);
check(
  losses.length === 0 || carryOn >= CARRY_ON_AT_LEAST,
  `${where}: only ${(100 * carryOn).toFixed(1)}% of displaced workers carry on, under ${100 * CARRY_ON_AT_LEAST}%`,
);

// (3) Who answered: someone the event named, or their household or family.
const householdOf = (id: string) => core.people.get(id as never)?.householdId;
const kin = new Map<string, Set<string>>();
for (const link of core.familyLinks.values()) {
  const [a, b] = link.personIds;
  kin.set(a, (kin.get(a) ?? new Set()).add(b));
  kin.set(b, (kin.get(b) ?? new Set()).add(a));
}
let unnamed = 0;
const unnamedSample: string[] = [];
for (const row of answers) {
  const subjects = row.event.subjects;
  const near =
    subjects.includes(row.personId) ||
    subjects.some(
      (s) =>
        (householdOf(s) !== undefined &&
          householdOf(s) === householdOf(row.personId)) ||
        kin.get(s)?.has(row.personId),
    );
  if (near || row.counted) continue;
  unnamed += 1;
  if (unnamedSample.length < 3)
    unnamedSample.push(`${row.personId} for ${row.eventId}`);
}
check(
  unnamed === 0,
  `${where}: ${unnamed} people answered an event that named neither them nor their household or family (${unnamedSample.join("; ")})`,
);

// (4) Every aimed drive aims at the party the event names, a record.
const { factKeys, institutionFact, responsibleInTopic } =
  DEFAULT_DRIVES_DATA as unknown as {
    factKeys: { responsible: string };
    institutionFact: { prefix: string; suffix: string };
    responsibleInTopic: readonly string[];
  };
const responsible = (id: string) => {
  const event = events.get(id)!;
  const named = event.facts?.[`event:${id}:${factKeys.responsible}`];
  if (named) return named;
  if (responsibleInTopic.includes(event.kind) && event.topic)
    return event.topic;
  const key = Object.keys(event.facts ?? {}).find(
    (row) =>
      row.startsWith(institutionFact.prefix) &&
      row.endsWith(institutionFact.suffix),
  );
  return key?.slice(
    institutionFact.prefix.length,
    key.length - institutionFact.suffix.length,
  );
};
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
      answers: answers.length,
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

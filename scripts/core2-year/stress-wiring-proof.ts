/**
 * Proof for the Oct 14 stress-audit wiring (OPUS-CORE, PR #4167): one year of
 * the played world (`buildBenchWorld`, two-level, every module) in a place
 * drawn from all 56 by a seed taken from the clock, naming by record id
 * where each engine read what another wrote.
 *
 * Run: node --max-old-space-size=8192 --import tsx scripts/core2-year/stress-wiring-proof.ts [seed]
 */
import { randomBytes } from "node:crypto";
import { performance } from "node:perf_hooks";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { composeJournal } from "../../src/director/journal";
import { stancesOf } from "../../src/core2/modules/views";
import { drawPlace } from "./place";

setBookkeeping(false);
const seed = process.argv[2] ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "played-world");
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const core = world.core;
const api = coreAPI(core);
console.log(`Place ${place.key}, seed ${seed}, place seed ${place.seed}`);
for (const person of core.people.values())
  if (person.alive && person.tier !== "husk")
    world.director.watch(core, person.id);

const start = core.date;
const end = addDays(makeIsoDate(start), 365);
const huskActs = new Map<string, number>();
const husks = [...core.people.values()].filter((p) => p.tier === "husk");
const huskKindsBefore = new Map(
  husks.map((p) => [p.id, new Map(p.actsByKind)]),
);
const focusHusks = husks.filter((p) => core.focusPersonIds.has(p.id));
const callbacksSeen = new Map<string, { date: string; due: string }>();
const started = performance.now();
let filledIn: string | undefined;
for (let day = start; day < end;) {
  const next = addDays(makeIsoDate(day), 1);
  advanceCore(core, next);
  for (const [id, row] of core.pendingCallbacks)
    if (!callbacksSeen.has(id))
      callbacksSeen.set(id, { date: next, due: row.date });
  // Midyear, fill in one counted resident (as a click does) to show health.
  if (!filledIn && next >= addDays(makeIsoDate(start), 180)) {
    const { personOrFillIn } = await import("../../src/core2/state");
    const { countedRecords } =
      await import("../../src/core2/tooling/counted-records");
    const counted = [...countedRecords(core).values()]
      .flatMap((h) => h.people.map((p) => p.id))
      .sort()[0];
    if (counted) filledIn = personOrFillIn(core, counted)?.id;
  }
  day = next;
}
const seconds = (performance.now() - started) / 1000;
console.log(`Ran ${start} to ${end} in ${seconds.toFixed(0)} s`);

// Defect 1: approaches, callbacks and replies.
const log = (kind: string) =>
  [...(core.logByKind.get(kind) ?? [])].map((id) => core.durableLog.get(id)!);
const approaches = log("office.approached");
const replies = log("office.replied");
console.log(
  `\nDefect 1: ${approaches.length} approaches, ${replies.length} replies, ${core.pendingCallbacks.size} still pending at year end`,
);
// The director keeps a season of moments whole, so read the latest reply.
const withMoment = replies.filter((r) =>
  world.director.ledger.people
    .get(r.personIds[0]!)
    ?.moments.some((m) => m.causeId === r.id),
);
console.log(
  `  ${withMoment.length} replies still held as a director moment at year end`,
);
const reply = withMoment.at(-1) ?? replies.at(-1);
if (reply) {
  const callbackId = reply.facts!.callbackId!;
  console.log(`  approach ${reply.facts!.approachEventId}`);
  console.log(
    `  callback ${callbackId} filed ${callbacksSeen.get(callbackId)?.date} due ${callbacksSeen.get(callbackId)?.due}`,
  );
  console.log(
    `  reply ${reply.id} on ${reply.date} by ${reply.facts!.responderId} (${reply.facts!.responderTitle}) of ${reply.facts!.office}`,
  );
  const residentId = reply.personIds[0]!;
  const book = world.director.ledger.people.get(residentId);
  const moment = book?.moments.find((m) => m.causeId === reply.id);
  console.log(
    `  director moment ${moment?.id ?? "(none)"} kind ${moment?.causeKind ?? "-"}`,
  );
  const lines = composeJournal(core, world.director, residentId)
    .flatMap((c) => c.lines)
    .filter((l) => l.sourceRecordIds.includes(reply.id));
  for (const line of lines) console.log(`  journal ${line.id}: "${line.text}"`);
  const again = approaches.filter(
    (a) => a.personIds[0] === residentId && a.date >= reply.date,
  );
  console.log(
    `  went back after the reply: ${again.length} (first ${again[0]?.id ?? "-"})`,
  );
}

// Defect 17: husks.
let huskActCount = 0;
let huskShiftCount = 0;
const huskShiftKinds = new Set([
  "attend-scheduled-work-date-segment",
  "decline-scheduled-work-date-segment",
]);
for (const husk of husks) {
  const before = huskKindsBefore.get(husk.id)!;
  for (const [kind, count] of husk.actsByKind) {
    const delta = count - (before.get(kind) ?? 0);
    if (!delta) continue;
    if (huskShiftKinds.has(kind)) huskShiftCount += delta;
    else {
      huskActCount += delta;
      huskActs.set(husk.id, (huskActs.get(husk.id) ?? 0) + delta);
    }
  }
}
const volunteers = log("cause.volunteered").filter((e) => {
  const actor = core.people.get(e.personIds[0]!);
  const group = core.organizations.get(e.facts?.organizationId ?? "");
  return (
    actor &&
    group &&
    actor.placeId !== group.placeId &&
    actor.countyId !== group.placeId
  );
});
console.log(
  `\nDefect 17: ${husks.length} husks (${focusHusks.length} in the focus circle), ${huskActCount} chosen acts by husks (plus ${huskShiftCount} scheduled work shifts by husks hired as aides, defect 16); ${volunteers.length} volunteer acts away from home`,
);
if (focusHusks[0])
  console.log(
    `  e.g. ${focusHusks[0].id} at ${focusHusks[0].placeId}: lastActDate ${focusHusks[0].lastActDate}`,
  );

// Defect 2: cause groups spend.
const ads = log("cause-group.ad-ran");
const spent = ads.reduce((n, e) => n + Number(e.facts!.spentMinor), 0);
console.log(
  `\nDefect 2: ${ads.length} group ad buys, $${(spent / 100).toFixed(2)} spent`,
);
const ad = ads[0];
if (ad) {
  console.log(
    `  ad ${ad.id}: spent ${ad.facts!.spentMinor} of ${ad.facts!.balanceBeforeMinor}, reached ${ad.facts!.reached}`,
  );
  const moved = (ad.witnessIds ?? [])
    .map((id) => ({
      id,
      stance: stancesOf(api, id).find(
        (s) =>
          s.topic === ad.topic && s.causes.some((c) => c.eventId === ad.id),
      ),
    }))
    .filter((row) => row.stance);
  console.log(
    `  views: ${moved.length} stances cite it, e.g. ${moved[0] ? `${moved[0].id}:${ad.topic}` : "-"}`,
  );
  const stories = api.moduleState("news").table("stories");
  console.log(`  news story: ${stories.get(ad.id) ? ad.id : "(none)"}`);
}
const groups = [...core.organizations.values()].filter(
  (o) => o.kind === "cause-group",
);
for (const group of groups.slice(0, 3))
  console.log(
    `  group ${group.id}: balance now ${api.accounts().balance(api.accounts().main(group.id))}`,
  );

// Defect 20: a filled-in person's health record.
const { healthReport } = await import("../../src/core2/modules/health");
const health = healthReport(core);
console.log(
  `\nDefect 20: filled in ${filledIn ?? "(nobody)"}; health record: conditions ${JSON.stringify(filledIn ? health.conditionsByPerson.get(filledIn) : undefined)}, resilience line ${filledIn ? String(health.resilienceLines.get(filledIn)) : "-"}, case ${JSON.stringify(health.cases.find((c) => c.personId === filledIn) ?? null)}`,
);

// Defect 24: appointments.
const appointments = api
  .moduleState("core2-executive-v1")
  .table("appointments")
  .rows() as unknown as {
  id: string;
  holderId: string;
  reasons: unknown;
}[];
for (const row of appointments.slice(0, 3))
  console.log(
    `\nDefect 24: ${row.id} -> ${row.holderId}, reasons ${JSON.stringify(row.reasons).slice(0, 300)}`,
  );

/**
 * Family-life report (brief S, step 1). Read-only development tooling.
 * Builds the bench world in a drawn place, watches the player and their
 * household exactly as the bench does (player.ts select), runs N years day by
 * day, and writes every family-kind scene staged on those books, composed
 * through purposeScene on its day, plus every family record that named the
 * player, their household, their kin or the people they know, with whether a
 * scene came of it.
 *   node --import tsx scripts/dialogue-batch/family-play.ts --seed <s> --years 5 --out f.md
 */
import { writeFileSync, appendFileSync } from "node:fs";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { advanceCore } from "../../src/core2/life";
import { registerModule } from "../../src/core2/state";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import type { CoreState, PersonId } from "../../src/core2/types";
import { purposeScene } from "../../src/director/purpose-scene";
import type { TreeNode, SceneTalkLine } from "../../src/director/scene-talk";
import { drawPlace } from "../core2-year/place";
import { gameStartDate } from "../../src/core2/game-start";

const option = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
};
const seed = option("seed", "family-a");
const years = Number(option("years", "5"));
const out = option("out", `family-${seed}.md`);
const FAMILY = new Set(
  "first-meeting becoming-friends date proposal breakup new-baby moving-goodbye arrival care celebration gathering-missing return family-filing family-loss family-absence funeral notice-home home-damaged".split(
    " ",
  ),
);
const KINDS = [
  "family.partnered",
  "family.moved-in",
  "family.engaged",
  "family.married",
  "family.separated",
  "family.gathering-missed",
  "person-birth",
  "person.moved-away",
  "health.serious-illness",
  "life.death",
  "household-member",
  "work.job-started",
];
const place = drawPlace(seed, "family-life");
setBookkeeping(false);
const t0 = Date.now();
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const core: CoreState = world.core;
const director = world.director;
const playerId = world.playerId! as PersonId;
const me = core.people.get(playerId)!;
const nameOf = (id: string) => {
  const r = core.people.get(id as PersonId);
  return r ? `${r.givenName} ${r.familyName}` : id;
};
const lines: string[] = [];
const say = (s: string) => lines.push(s);
say(
  `# Family life, ${place.name} (${place.key}), seed ${seed}, ${years} years\n\nPlayer ${nameOf(playerId)} (${playerId}), born ${me.birthDate}, household ${me.householdId}. Built in ${Math.round((Date.now() - t0) / 1000)} s.`,
);
const watched = new Set<PersonId>([playerId]);
for (const id of core.households.get(me.householdId)?.memberIds ?? [])
  if (core.people.get(id)?.alive) watched.add(id as PersonId);
if (option("circle", "") === "yes") {
  const local = [...core.people.values()]
    .filter((p) => p.alive && p.placeId === me.placeId)
    .map((p) => p.id as PersonId);
  for (const id of [...new Set([...(me.familyIds as any), ...(me.knownIds as any), ...local])].slice(0, 64))
    watched.add(id as PersonId);
}
for (const id of watched) director.watch(core, id);
say(`Watched (as the bench does): ${[...watched].map(nameOf).join(", ")}`);
say(
  `Kin: ${[...(me.familyIds as any)].length}; known: ${[...(me.knownIds as any)].length}; household: ${watched.size}`,
);

// Every family record, with how it touches the player.
type Rec = { id: string; kind: string; date: string; tie: string; text: string; facts: string };
const recs: Rec[] = [];
const tieOf = (ids: readonly string[]): string => {
  const p = core.people.get(playerId)!;
  if (ids.includes(playerId)) return "player";
  const house = core.households.get(p.householdId)?.memberIds ?? [];
  if (ids.some((i) => house.includes(i as PersonId))) return "household";
  if (ids.some((i) => [...(p.familyIds as any)].includes(i))) return "kin";
  if (ids.some((i) => [...(p.knownIds as any)].includes(i))) return "known";
  return "";
};
registerModule(core, {
  id: "family-play:watch",
  eventKinds: KINDS,
  onEvent: (_api, event) => {
    const tie = tieOf([...event.personIds, ...(event.witnessIds ?? [])]);
    if (!tie) return;
    recs.push({
      id: event.id,
      kind: event.kind,
      date: String(event.date),
      tie,
      text: event.source?.text ?? (event as any).summary ?? "",
      facts: JSON.stringify(event.facts ?? {}).slice(0, 300),
    });
  },
});

const flat = (n: TreeNode, ind: string, who: (l: SceneTalkLine) => string) => {
  for (const l of n.lines)
    say(`${ind}${who(l)}: ${l.text}  _[${l.move}; ${l.bearing ?? "-"}]_`);
  if (n.end?.close) say(`${ind}${who(n.end.close)}: ${n.end.close.text}  _[close]_`);
  if (n.end) say(`${ind}**end: ${n.end.outcome}${n.end.ending ? " / " + n.end.ending.label : ""}**`);
  for (const r of n.replies) {
    say(`${ind}- You (${r.line.move}): ${r.line.text}`);
    if (r.next) flat(r.next, ind + "  ", who);
  }
};

const seen = new Map<string, number>();
const tally = new Map<string, { staged: number; composed: number; skipped: string[]; player: number }>();
const scenesSay: string[] = [];
const journal: string[] = [];
const days = years * 365;
for (let day = 0; day < days; day += 1) {
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  if (day % 90 === 0)
    console.error(`${place.name} day ${day} ${Math.round((Date.now() - t0) / 1000)} s`);
  for (const [personId, book] of director.ledger.people) {
    const from = seen.get(personId) ?? 0;
    seen.set(personId, book.schedule.length);
    for (const entry of book.schedule.slice(from)) {
      const fam = entry.bindings.filter((b) => FAMILY.has(b.typeKey));
      if (!fam.length) continue;
      const moment = book.momentsById.get(entry.momentId)!;
      if (entry.outcome === "journal-line") {
        if (personId === playerId)
          journal.push(`${entry.date} ${fam.map((b) => b.typeKey).join("+")} (${moment.label}, impact ${moment.impact.toFixed(2)}) ${moment.causeId}`);
        continue;
      }
      for (const b of fam) {
        const t0 = tally.get(b.typeKey) ?? { staged: 0, composed: 0, skipped: [], player: 0 };
        t0.staged += 1;
        if (personId === playerId) t0.player += 1;
        tally.set(b.typeKey, t0);
      }
      const binding = fam[0]!;
      const t = tally.get(binding.typeKey)!;
      // As the bench does (story.ts): the first binding whose purpose composes.
      const res = purposeScene(core, director, personId as PersonId, entry, { next: true });
      lines.push(
        `\n### ${entry.bindings.map((b) => b.typeKey).join(" + ")} on ${entry.date} (${entry.outcome}), book of ${nameOf(personId)}${personId === playerId ? " (player)" : ""}\ncause ${moment.causeId} (${moment.label}, impact ${moment.impact.toFixed(2)}); setting ${binding.setting.kind}; cast ${binding.presentIds.map(nameOf).join(", ")}`,
      );
      if (!res || res.kind !== "composed") {
        const why = res ? (res as any).reason : "no result";
        t.skipped.push(why);
        say(`not composed: ${why}`);
        continue;
      }
      say(`played as: ${res.scene.typeKey}`);
      t.composed += 1;
      const talk = res.scene.talk;
      const asker = nameOf(talk.askerId);
      say(`purpose ${talk.purpose}; asker ${asker}; asked ${nameOf(talk.askedId)}`);
      say(`facts: ${res.scene.facts.map((f) => f.key + "=" + f.text).join("; ")}`);
      for (const l of talk.narration) say(`Narration: ${l.text}`);
      if (talk.open) say(`${asker}: ${talk.open.text}`);
      say(`${asker}: ${talk.state.text}  _[${talk.state.bearing ?? "-"}]_`);
      flat(talk.tree, "", (l) => (l.role === "asked" ? "You" : asker));
    }
  }
}
say(`\n## Staged on the watched books`);
for (const k of FAMILY) {
  const t = tally.get(k);
  say(`- ${k}: ${t ? `${t.staged} staged (${t.player} on the player's book), ${t.composed} composed${t.skipped.length ? `; skipped: ${[...new Set(t.skipped)].join(" | ")}` : ""}` : "0"}`);
}
say(`\n## Family moments on the player's book that became Journal lines (${journal.length})`);
for (const j of journal) say(`- ${j}`);
say(`\n## Family records touching the player (${recs.length})`);
const byKind = new Map<string, Map<string, number>>();
for (const r of recs) {
  const m = byKind.get(r.kind) ?? new Map();
  m.set(r.tie, (m.get(r.tie) ?? 0) + 1);
  byKind.set(r.kind, m);
}
for (const [k, m] of byKind) say(`- ${k}: ${[...m].map(([t, n]) => `${t} ${n}`).join(", ")}`);
say(`\n### Records naming the player or household`);
for (const r of recs.filter((r) => r.tie === "player" || r.tie === "household"))
  say(`- ${r.date} ${r.kind} ${r.id} [${r.tie}] ${r.text} ${r.facts}`);
// The couples table at the end, for the player.
const couples = (core.modules.get("partnerships") as any)?.tables?.couples;
say(`\nPlayer at the end: household ${core.people.get(playerId)!.householdId}, members ${(core.households.get(core.people.get(playerId)!.householdId)?.memberIds ?? []).map(nameOf).join(", ")}`);
say(`Total time ${Math.round((Date.now() - t0) / 1000)} s`);
writeFileSync(out, lines.join("\n") + "\n");
appendFileSync(out, "");
console.error(`wrote ${out}`);
void couples;

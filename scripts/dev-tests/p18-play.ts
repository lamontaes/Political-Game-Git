/** Scratch: plays a drawn place and, in every talk, picks the reply whose text is one of the targets still unseen; prints each talk where one was said. The engine writes every line. */
import { buildBenchWorld } from "../../src/bench/world";
import { drawPlace } from "../core2-year/place";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { gameStartDate } from "../../src/core2/game-start";
import { openConversation, say } from "../../src/director/conversation";
import { fileForOffice, governmentView } from "../../src/bench/government";
import type { PersonId } from "../../src/core2/types";
const seed = process.argv[2]!;
const days = Number(process.argv[3] ?? 150);
const D = /^(I see it the other way|We don't agree there|I come down on the other side|I'd vote the other way|You won't get me there|I can't go along with that|We'll have to agree to disagree|I've never seen it your way)\.$/;
const T = [/^We'll have to agree to disagree\.$/];
const variants = new Map<string, number>();
const seen = new Set<number>();
setBookkeeping(false);
const place = drawPlace(seed, "p18");
const w = buildBenchWorld(place.seed, gameStartDate(), { twoLevel: true, placeKey: place.key });
const { core, director } = w;
const me = w.playerId! as PersonId;
console.log(`## ${place.name} (${place.key}), seed ${seed}`);
let filed = false;
for (let day = 0; day < days && seen.size < T.length; day++) {
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  if (!filed) {
    const open = governmentView(core, me).contests.find((r) => r.checks.every((c) => c.met));
    if (open) { try { fileForOffice(core, me, open.contest.id); filed = true; console.log(`STAGED: day ${day} the player filed for ${open.contest.title} through the filing route`); } catch {} }
  }
  const p = core.people.get(me)!;
  const circle = [...(core.households.get(p.householdId)?.memberIds ?? []), ...p.knownIds].filter((i) => i !== me && core.people.get(i)?.alive);
  for (const o of [...new Set(circle)]) {
    const talk = openConversation(core, me, o as PersonId, { director });
    let hit = false; const hitD = new Set<object>();
    for (let turn = 0; turn < 8 && talk.choices.length; turn++) {
      const dv = talk.choices.find((c) => D.test(c.text));
      if (dv && !hitD.has(talk)) { hitD.add(talk); variants.set(dv.text, (variants.get(dv.text) ?? 0) + 1); }
      const ti = T.findIndex((r, i) => !seen.has(i) && talk.choices.some((c) => r.test(c.text)));
      const c = ti >= 0 ? talk.choices.find((c) => T[ti]!.test(c.text))! : talk.choices[turn % talk.choices.length]!;
      if (ti >= 0) { seen.add(ti); hit = true; }
      say(core, talk, c.key);
    }
    if (hit) {
      console.log(`-- ${core.date} with ${core.people.get(o as PersonId)?.givenName}`);
      for (const l of talk.lines) console.log(`  ${l.speakerId === me ? "You" : core.people.get(l.speakerId)?.givenName}: ${l.text}`);
    }
  }
}
console.log([...variants].join(' ; '));
console.log(`seen ${seen.size} of ${T.length}: ${[...seen].join(",")}`);

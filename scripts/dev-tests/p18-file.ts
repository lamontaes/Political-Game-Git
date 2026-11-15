/** Scratch: a named place, the player files through the filing route, lives to the election; every housemate talk presses an offered target reply. */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { gameStartDate } from "../../src/core2/game-start";
import { fileForOffice, governmentView } from "../../src/bench/government";
import { noteHeard, openConversation, say } from "../../src/director/conversation";
import type { PersonId } from "../../src/core2/types";
const [key, seed, daysArg] = process.argv.slice(2) as [string, string, string];
const days = Number(daysArg ?? 320);
const T = [/^I'll be okay\. Thanks\.$/, /^I'll be careful\. I promise\.$/, /^Somebody has to run for .*\.$/, /^You think it's a mistake\?$/, /^We'll have to agree to disagree\.$/];
const seen = new Set<number>();
setBookkeeping(false);
const w = buildBenchWorld(seed, gameStartDate(), { twoLevel: true, placeKey: key });
const { core, director } = w;
const me = w.playerId! as PersonId;
director.watch(core, me); core.focusPersonIds.add(me);
console.log(`place ${key} seed ${seed}`);
let filed = false;
const talked = new Set<string>();
for (let day = 0; day < days; day++) {
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  if (!filed) {
    const open = governmentView(core, me).contests.find((r) => r.checks.every((c) => c.met));
    if (open) { try { fileForOffice(core, me, open.contest.id); filed = true; console.log(`STAGED ${core.date}: the player filed for ${open.contest.title} through the filing route`); } catch (e) { console.log("refused", (e as Error).message); } }
  }
  const p = core.people.get(me)!;
  const room = [...(core.households.get(p.householdId)?.memberIds ?? [])].filter((i) => i !== me && core.people.get(i)?.alive) as PersonId[];
  for (const o of room) {
    const talk = openConversation(core, me, o, { director, presentIds: room, minuteOfDay: 20 * 60 + 30 });
    if (!talk.lines.length) continue;
    noteHeard(core, talk);
    let hit = false;
    if (talk.lines.some((l) => /worry|sorry about|filed for|running for|came out/.test(l.text))) console.log(`   offered ${core.date} ${core.people.get(o)?.givenName}: ${talk.choices.map((c) => c.text).join(' | ')}`);
    for (let turn = 0; turn < 6 && talk.choices.length; turn++) {
      const c = talk.choices.find((c) => T.some((r, i) => !seen.has(i) && r.test(c.text))) ?? talk.choices[turn % talk.choices.length]!;
      const ti = T.findIndex((r) => r.test(c.text)); if (ti >= 0) { seen.add(ti); hit = true; }
      say(core, talk, c.key);
    }
    if (hit) { console.log(`-- ${core.date} with ${core.people.get(o)?.givenName}`); for (const l of talk.lines) console.log(`  ${l.speakerId === me ? "You" : core.people.get(l.speakerId)?.givenName}: ${l.text}`); }
  }
}
console.log(`filed ${filed}; seen ${[...seen].join(",")}`);

import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { openConversation, say } from "../../src/director/conversation";
import type { PersonId } from "../../src/core2/types";
const [key, seed] = process.argv.slice(2) as [string, string];
setBookkeeping(false);
const w = buildBenchWorld(seed, gameStartDate(), { twoLevel: true, placeKey: key });
const { core, director } = w; const me = w.playerId! as PersonId;
const tally = new Map<string, number>();
for (let day = 0; day < 25; day++) {
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const p = core.people.get(me)!;
  const circle = [...new Set([...(core.households.get(p.householdId)?.memberIds ?? []), ...p.knownIds])].filter((i) => i !== me) as PersonId[];
  for (const o of circle) {
    const talk = openConversation(core, me, o, { director });
    const d = talk.choices.filter((c) => /other way|don't agree there|other side|vote the other|get me there|go along|agree to disagree|your way\.$/.test(c.text) && !/vote your way/.test(c.text));
    for (const c of d) { tally.set(c.text, (tally.get(c.text) ?? 0) + 1); if (/agree to disagree/.test(c.text)) { say(core, talk, c.key); console.log(`day ${day} with ${core.people.get(o)?.givenName}`); for (const l of talk.lines) console.log(`  ${l.speakerId === me ? "You" : core.people.get(l.speakerId)?.givenName}: ${l.text}`); } }
  }
}
console.log([...tally].join(" ; "));

/**
 * Walks every housemate's talk to its end by pressing the first reply each time, and counts the
 * talks that stop with nothing to press and no goodbye (a dead end): what the last line was,
 * who said it and what the talk was about.
 * Run: SEEDS=21,22,23 node --import tsx scripts/words/dead-end-talks.ts
 */
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import type { PersonId } from "../../src/core2/types";
import {
  buildBenchWorldInStages,
  OPENING_WARMUP_DAYS,
} from "../../src/bench/world";
import { openingArrivalMinute } from "../../src/bench/opening";
import { roomIds } from "../../src/bench/scene";
import {
  meetOverTalk,
  noteHeard,
  openConversation,
  say,
} from "../../src/director/conversation";

setBookkeeping(false);
let talks = 0;
let ended = 0;
const dead: string[] = [];
const unanswered: string[] = [];
for (const seed of (process.env.SEEDS ?? "21,22,23").split(",")) {
  const world = await buildBenchWorldInStages(
    seed,
    gameStartDate(),
    { twoLevel: true, warmUpDays: OPENING_WARMUP_DAYS },
    () => undefined,
  );
  const { core, director } = world;
  const playerId = world.playerId as PersonId;
  const me = core.people.get(playerId)!;
  const minute = openingArrivalMinute(core, playerId);
  const room = roomIds(core, playerId, undefined, minute) as PersonId[];
  const ids = (
    core.households.get(me.householdId ?? "")?.memberIds ?? []
  ).filter(
    (id) => id !== playerId && core.people.get(id as PersonId)?.alive,
  ) as PersonId[];
  const options = { director, presentIds: room, minuteOfDay: minute };
  for (const id of ids) {
    const talk = openConversation(core, playerId, id, options);
    if (!talk.lines.length) continue;
    talks++;
    meetOverTalk(core, talk);
    noteHeard(core, talk);
    // Press a question about their life first when one is offered: a pressed question must be
    // answered by a line of theirs.
    for (let step = 0; step < 14 && talk.choices.length; step += 1) {
      const pick = talk.choices.find((c) => c.raises) ?? talk.choices[0]!;
      const before = talk.lines.length;
      const said = pick.text;
      say(core, talk, pick.key);
      const added = talk.lines.slice(before + 1);
      if (pick.raises && !added.some((l) => l.speakerId !== playerId))
        unanswered.push(
          `${seed} ${world.place.displayName} ${core.people.get(id)!.givenName}: pressed "${said}" (raises ${pick.raises.split(":")[0]}), they said nothing back`,
        );
    }
    const last = talk.lines.at(-1)!;
    if (last.kind === "farewell") ended++;
    else if (!talk.choices.length)
      dead.push(
        `${seed} ${world.place.displayName} ${core.people.get(id)!.givenName}: last ${last.kind}/${last.act} by ${last.speakerId === playerId ? "player" : "them"}, ${talk.lines.length} lines, topics ${talk.topics.map((t) => t.split(":")[0]).join(",")}: ${last.text.slice(0, 90)}`,
      );
  }
}
console.log(unanswered.join("\n"));
console.log(`pressed questions with no answer ${unanswered.length}`);
console.log(dead.join("\n"));
console.log(
  `talks ${talks}, ended with a goodbye ${ended}, dead ends ${dead.length}`,
);

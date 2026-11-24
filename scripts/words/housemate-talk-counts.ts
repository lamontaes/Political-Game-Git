/**
 * Counts, over drawn places, how many people at home have something to say the
 * first time the player clicks each, in the order the screen lists them, with
 * the earlier housemates' talks heard and answered (the game's own routes).
 * Run: SEEDS=21,22,23 node --import tsx scripts/words/housemate-talk-counts.ts
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
let talked = 0;
let silent = 0;
let aloneSilent = 0;
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
  const row: string[] = [];
  // Each one alone first (a look writes nothing), then in the screen's order.
  const alone = ids.map(
    (id) =>
      openConversation(core, playerId, id, { ...options, look: true }).lines
        .length > 0,
  );
  ids.forEach((id, at) => {
    const talk = openConversation(core, playerId, id, options);
    const said = talk.lines.length > 0;
    row.push(
      `${core.people.get(id)!.givenName}:${said ? "talks" : "silent"}${alone[at] ? "" : "(alone silent)"}`,
    );
    if (said) {
      talked++;
      meetOverTalk(core, talk);
      noteHeard(core, talk);
      const first = talk.choices[0];
      if (first) say(core, talk, first.key);
    } else silent++;
    if (!alone[at]) aloneSilent++;
  });
  console.log(`${seed} ${world.place.displayName}: ${row.join(", ")}`);
}
console.log(
  `talks ${talked}, silent in order ${silent}, silent even alone ${aloneSilent}`,
);

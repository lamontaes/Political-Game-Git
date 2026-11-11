/**
 * Plays a drawn place day by day from the game's start and prints every talk
 * between the player and the people they know whose first topic is a news
 * story or a change in town (words-home-news-lines-are-composed): each line,
 * who said it, and the replies offered at each turn. Usage:
 *   node --import tsx scripts/dialogue-batch/news-talk-probe.ts --seed <seed> [--days 60] [--talks 6]
 */
import { buildBenchWorld } from "../../src/bench/world";
import { drawPlace } from "../core2-year/place";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { openConversation, say } from "../../src/director/conversation";
import type { PersonId } from "../../src/core2/types";

const arg = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at > 0 ? process.argv[at + 1]! : fallback;
};
const seed = arg("seed", "news-talk-probe");
const days = Number(arg("days", "60"));
const wanted = Number(arg("talks", "6"));
const out = (line: string) => process.stdout.write(`${line}\n`);

setBookkeeping(false);
const place = drawPlace(seed, "news-talk-probe");
const world = buildBenchWorld(place.seed, "2025-01-20", {
  twoLevel: true,
  placeKey: place.key,
});
const { core, director } = world;
const playerId = world.playerId! as PersonId;
out(`${place.name} (${place.key}), seed ${seed}, player ${playerId}`);
const isNews = (topic: string | undefined) =>
  !!topic && /^news:/.test(topic.replace(/^[^>]*>/, ""));
let shown = 0;
/** A topic already shown with a person is not shown again. */
const shownTopics = new Set<string>();
for (let day = 0; day < days && shown < wanted; day += 1) {
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const player = core.people.get(playerId)!;
  const circle = [
    ...(core.households.get(player.householdId)?.memberIds ?? []),
    ...player.knownIds,
  ].filter((id) => id !== playerId && core.people.get(id)?.alive);
  for (const otherId of [...new Set(circle)]) {
    if (shown >= wanted) break;
    const talk = openConversation(core, playerId, otherId as PersonId, {
      director,
    });
    if (!isNews(talk.topics[0]) || shownTopics.has(talk.topics[0]!)) continue;
    shownTopics.add(talk.topics[0]!);
    shown += 1;
    out(`--- ${core.date} with ${otherId} on ${talk.topics[0]}`);
    for (let turn = 0; turn < 8; turn += 1) {
      if (!talk.choices.length) break;
      out(`    replies: ${talk.choices.map((c) => c.text).join(" | ")}`);
      say(core, talk, talk.choices[(turn + shown) % talk.choices.length]!.key);
    }
    for (const line of talk.lines)
      out(
        `  ${line.speakerId === playerId ? "P" : "O"} [${line.kind}] ${line.text}`,
      );
  }
}
out(`${shown} news talks`);

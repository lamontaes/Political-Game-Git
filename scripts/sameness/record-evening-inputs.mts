/**
 * The sameness gate's inputs for the first evening's Journal entry
 * (`journal-evening`) and the talk at home's line on the address's point
 * (`talk-address-point`) (the Story lead, Nov 24), over drawn worlds: for each
 * world, the outline input the one planner tells the text from, as
 * `eveningTelling` (src/director/journal-evening.ts) and `conversationTelling`
 * (src/english/conversation-words.ts) build it. The evening is played as
 * scripts/words/first-evening-packet.ts plays it: the talk at home first,
 * with a reply, then the Journal.
 *
 * One world per process, so memory frees between worlds; run it in a loop:
 *   SEEDS=a,b,c node --import tsx scripts/sameness/record-evening-inputs.mts
 *   N=60 draws that many seeds (crypto randomBytes(8) hex).
 * Appends to scripts/sameness/inputs/journal-evening-drawn.jsonl and
 * talk-address-point-drawn.jsonl (one talk line per world at most).
 * Exits 0 when the world wrote a Journal line, 2 when it was skipped.
 */
import { randomBytes } from "node:crypto";
import { appendFileSync } from "node:fs";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
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
  raiseFacts,
  say,
  subjectsBetween,
  withOnceSaid,
} from "../../src/director/conversation";
import { eveningTelling } from "../../src/director/journal-evening";
import { conversationTelling } from "../../src/english/conversation-words";
import { tell, type TellingInput } from "../../src/english/outline-planner";

setBookkeeping(false);
const seeds = process.env.SEEDS
  ? process.env.SEEDS.split(",").filter(Boolean)
  : Array.from({ length: Number(process.env.N ?? 1) }, () =>
      randomBytes(8).toString("hex"),
    );
// OUT_DIR records elsewhere (a long run that should not touch the inputs
// writers gate against until it ends); the inputs folder otherwise.
const dir = process.env.OUT_DIR ?? "scripts/sameness/inputs";
const POINT = "address-point";

/** One gate input line from a telling. */
const line = (input: TellingInput, place: string) =>
  `${JSON.stringify({
    ...(input.kind.startsWith("talk-") ? { kind: input.kind } : {}),
    facts: input.facts,
    ...(input.points ? { points: input.points } : {}),
    traits: input.traits,
    momentKey: input.momentKey,
    worldSeed: input.worldSeed,
    place,
  })}\n`;

let wrote = 0;
for (const seed of seeds) {
  const world = await buildBenchWorldInStages(
    seed,
    gameStartDate(),
    { twoLevel: true, warmUpDays: OPENING_WARMUP_DAYS },
    () => undefined,
  );
  const { core, director } = world;
  const me = world.playerId as never;
  const place = world.place.displayName;
  const minute = openingArrivalMinute(core, me);
  const household = core.households.get(core.people.get(me)!.householdId ?? "");
  const room = roomIds(core, me, undefined, minute);
  let talkLine: string | null = null;
  for (const id of (household?.memberIds ?? []).filter((m) => m !== me)) {
    const other = core.people.get(id as never);
    if (!other?.alive) continue;
    const talk = openConversation(core, me, id as never, {
      director,
      presentIds: room as never,
      minuteOfDay: minute,
    });
    const at = talk.lines.findIndex(
      (row) =>
        row.speakerId === (id as never) &&
        row.subjectId?.startsWith(`${id}>${POINT}:`),
    );
    if (at >= 0 && !talkLine) {
      const row = talk.lines[at]!;
      const subjectId = row.subjectId!.slice(`${id}>`.length);
      const subject =
        talk.last?.subject.id === row.subjectId
          ? talk.last.subject
          : subjectsBetween(core, id as never, me, director, talk).find(
              (s) => s.id === subjectId,
            );
      if (subject) {
        const before = talk.lines.slice(0, at);
        const said = before
          .filter((l) => l.speakerId === (id as never))
          .flatMap((l) => l.wording?.parts ?? []);
        const aboutText = subject.facts.about?.text.toLowerCase();
        const named =
          !!aboutText &&
          before.some((l) => l.text.toLowerCase().includes(aboutText));
        const theyOpened = !!talk.topics[0]?.startsWith(`${id}>`);
        const input = conversationTelling({
          seed: core.seed,
          subject: POINT,
          speakerId: id as never,
          traits: other.traits,
          facts: withOnceSaid(
            raiseFacts(subject.facts, id as never, named, theyOpened),
            id as never,
            said,
          ),
          momentKey: `${me}:${id}:${core.date}:${at}:${subjectId}:theirs`,
        });
        if (input) {
          talkLine = line(input, place);
          // The recorded input tells the played line's own pieces (the
          // talk's earlier-heard memory aside), or it is not the played input.
          const again = tell({ ...input, said });
          const played = (row.wording?.parts ?? []).join("|");
          if (again?.sentences.map((s) => s.piece).join("|") !== played)
            console.error(
              `${seed} ${place}: the recorded input tells other pieces than the played line`,
            );
        }
      }
    }
    meetOverTalk(core, talk);
    noteHeard(core, talk);
    const first = talk.choices[0];
    if (first) say(core, talk, first.key);
    if (talkLine) break;
  }
  const evening = eveningTelling(core, director, me, core.date as never);
  if (!evening) {
    console.error(`${seed} ${place}: the evening did not open, skipped`);
    continue;
  }
  appendFileSync(`${dir}/journal-evening-drawn.jsonl`, line(evening, place));
  wrote += 1;
  if (talkLine)
    appendFileSync(`${dir}/talk-address-point-drawn.jsonl`, talkLine);
  else console.error(`${seed} ${place}: no address-point talk line`);
  console.log(`${seed} ${place}: journal yes, talk ${talkLine ? "yes" : "no"}`);
}
process.exit(wrote ? 0 : 2);

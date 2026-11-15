/**
 * The owner's grades reach everyday talk (words-everyday-talk-one-engine,
 * owner, Oct 29: "calibration should affect the entire thing"). A move-pair
 * grade in the calibration table (`movePairs`, "ask>answer") says whether one
 * move reads naturally after another. In a played world in two drawn places,
 * each talk the player can open with the people they know, each week for 30
 * days: grading the first offered reply's move as unnatural after the other
 * person's last line moves that reply down the four on offer, behind replies
 * that make another move, wherever such a reply is in the talk's pool.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import type { PersonId } from "../core2/types";
import { CALIBRATION, type CalibrationTable } from "../english/calibration";
import {
  CONVERSATION_DATA,
  openConversation,
  replyMoveOf,
  type Conversation,
} from "./conversation";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const PLACES = 2;
const DAYS = 30;
const STEP = 7;
/** A grade at the bottom of the 1 to 5 scale, counted fully. */
const UNNATURAL = { mean: 1, count: 100 };

/** The other person's last line by its move, as the talk weighs it. */
const previousOf = (talk: Conversation) => {
  const line = talk.lines.at(-1)!;
  return /\?\s*$/.test(line.text) ? "ask" : line.act;
};

it(`a move-pair grade changes the replies a talk offers (seed ${seed})`, () => {
  const report: string[] = [];
  for (let draw = 0; draw < PLACES; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "talk-move-pairs");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    setBookkeeping(false);
    const { core, director, playerId } = buildBenchWorld(
      place.seed,
      gameStartDate(),
      { twoLevel: true, placeKey: place.key },
    );
    const me = playerId! as PersonId;
    director.watch(core, me);
    let talks = 0;
    let moved = 0;
    let example = "";
    const end = addDays(makeIsoDate(core.date), DAYS);
    for (
      let day = makeIsoDate(core.date);
      day <= end;
      day = addDays(day, STEP)
    ) {
      if (day > core.date) advanceCore(core, day);
      const known = [...(core.people.get(me)?.knownIds ?? [])]
        .filter((id) => core.people.get(id)?.alive)
        .sort();
      for (const otherId of known) {
        const talk = openConversation(core, me, otherId as PersonId, {
          director,
        });
        if (!talk.choices.length || !talk.last || !talk.lines.length) continue;
        talks += 1;
        const kind = talk.last.kind;
        const first = talk.choices[0]!;
        const pair = `${previousOf(talk)}>${replyMoveOf(kind, first.move)}`;
        const graded: CalibrationTable = {
          ...CALIBRATION,
          movePairs: { ...CALIBRATION.movePairs, [pair]: UNNATURAL },
        };
        const after = openConversation(core, me, otherId as PersonId, {
          director,
          data: { ...CONVERSATION_DATA, calibration: graded },
        });
        // The same talk opens: the same line from them.
        expect(after.lines.map((line) => line.text)).toEqual(
          talk.lines.map((line) => line.text),
        );
        const other = after.choices.filter(
          (choice) =>
            replyMoveOf(kind, choice.move) !== replyMoveOf(kind, first.move),
        );
        // With a reply of another move on offer, the graded one is no longer first.
        if (!other.length) continue;
        expect(
          replyMoveOf(kind, after.choices[0]!.move),
          `${where}, ${core.date}: "${talk.lines.at(-1)!.text}" after ${pair} graded unnatural`,
        ).not.toBe(replyMoveOf(kind, first.move));
        moved += 1;
        example ||= `"${talk.lines.at(-1)!.text}": first offered "${first.text}" (${pair}); graded unnatural, first offered "${after.choices[0]!.text}"`;
      }
    }
    report.push(
      `${where}: ${talks} talks, ${moved} where grading the first reply's pair moved it down; e.g. ${example || "none"}`,
    );
    expect(talks, `${where}: no one to talk to`).toBeGreaterThan(0);
    expect(
      moved,
      `${where}: no talk offered replies of two moves`,
    ).toBeGreaterThan(0);
  }
  process.stdout.write(`TALK MOVE PAIRS\n${report.join("\n")}\n`);
}, 3_600_000);

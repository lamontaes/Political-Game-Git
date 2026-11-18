/**
 * The owner's grades reach everyday talk (words-everyday-talk-one-engine,
 * owner, Oct 29: "calibration should affect the entire thing"). A move-pair
 * grade in the calibration table (`movePairs`, "ask>answer") says whether one
 * move reads naturally after another. In a played world at two named places,
 * each talk the player can open with the people they know, each week for 30
 * days: grading the first offered reply's move as unnatural after the other
 * person's last line moves that reply down the four on offer, behind replies
 * that make another move, wherever such a reply is in the talk's pool.
 *
 * Opening a talk writes what was said (a view the player learned, a subject
 * raised), so a second talk with the same person that day opens on another
 * subject (tests-talk-move-pairs-second-talk-opens-another-subject; at Basco,
 * Illinois the second talk said "The President is for admitting more
 * immigrants..." after the first said "Ask me about paid family leave."). The
 * graded talk is therefore opened in a twin of the world, built from the same
 * seed and played the same days, where it is that day's first talk with that
 * person, as the ungraded one is in the first world. Each world then holds the
 * same one talk, so the twins stay the same for the next.
 *
 * Two places are drawn from all 56 on a seed nobody chose; each is named with
 * its seed in every message. Measured at about 75 s a pair of places alone;
 * the limit stays 180 s, near twice the measured run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
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
const PLACES = [0, 1].map((draw) => ({
  ...drawPlace(`${seed}:${draw}`, "talk-move-pairs"),
  draw,
}));
const DAYS = 30;
const STEP = 7;
const LIMIT_MS = 180_000;
/** A grade at the bottom of the 1 to 5 scale, counted fully. */
const UNNATURAL = { mean: 1, count: 100 };

/** The other person's last line by its move, as the talk weighs it. */
const previousOf = (talk: Conversation) => {
  const line = talk.lines.at(-1)!;
  return /\?\s*$/.test(line.text) ? "ask" : line.act;
};

it(
  "a move-pair grade changes the replies a talk offers",
  () => {
    const report: string[] = [];
    for (const place of PLACES) {
      const where = `${place.name} (${place.key}), seed ${seed}:${place.draw}`;
      setBookkeeping(false);
      // The world the ungraded talk is had in, and its twin for the graded one.
      const [world, twin] = [0, 1].map(() =>
        buildBenchWorld(place.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: place.key,
        }),
      );
      const { core, director, playerId } = world!;
      const me = playerId! as PersonId;
      expect(twin!.playerId, `${where}: the twin plays someone else`).toBe(me);
      director.watch(core, me);
      twin!.director.watch(twin!.core, me);
      let talks = 0;
      let moved = 0;
      let example = "";
      const end = addDays(makeIsoDate(core.date), DAYS);
      for (
        let day = makeIsoDate(core.date);
        day <= end;
        day = addDays(day, STEP)
      ) {
        if (day > core.date) {
          advanceCore(core, day);
          advanceCore(twin!.core, day);
        }
        const known = [...(core.people.get(me)?.knownIds ?? [])]
          .filter((id) => core.people.get(id)?.alive)
          .sort();
        expect(
          [...(twin!.core.people.get(me)?.knownIds ?? [])]
            .filter((id) => twin!.core.people.get(id)?.alive)
            .sort(),
          `${where}, ${core.date}: the twin knows other people`,
        ).toEqual(known);
        for (const otherId of known) {
          const talk = openConversation(core, me, otherId as PersonId, {
            director,
          });
          if (!talk.choices.length || !talk.last || !talk.lines.length)
            continue;
          talks += 1;
          const kind = talk.last.kind;
          const first = talk.choices[0]!;
          const pair = `${previousOf(talk)}>${replyMoveOf(kind, first.move)}`;
          const graded: CalibrationTable = {
            ...CALIBRATION,
            movePairs: { ...CALIBRATION.movePairs, [pair]: UNNATURAL },
          };
          const after = openConversation(twin!.core, me, otherId as PersonId, {
            director: twin!.director,
            data: { ...CONVERSATION_DATA, calibration: graded },
          });
          // The same talk opens: the same line from them.
          expect(
            after.lines.map((line) => line.text),
            `${where}, ${core.date}: the twin's talk with ${otherId}`,
          ).toEqual(talk.lines.map((line) => line.text));
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
  },
  LIMIT_MS,
);

/**
 * A stranger says who they are before any news (Words lead, Nov 14: in a
 * played world run through the November count, residents the player had never
 * met opened on the paper's story and the player had no name for the
 * speaker). Pinned to the Words lead's world, Sheridan, Wyoming (5669845),
 * seed 5c66d25fa63c1ee8adb53909d641ab9d36015cebcc0726284859fc46b07ea7aa: it
 * opens Oct 27, 2026 and runs to the count on Nov 3 and two days after. The
 * residents the player has not met who hold a story open a talk; the first
 * thing each says after the greeting is the introduction, and the story
 * follows later in the same talk.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import type { PersonId } from "../core2/types";
import { openConversation, say, subjectsBetween } from "./conversation";

const SEED = "5c66d25fa63c1ee8adb53909d641ab9d36015cebcc0726284859fc46b07ea7aa";
const PLACE = "5669845";
const OPENS = "2026-10-27";
/** The count was Nov 3; two days after it the papers have been read. */
const THROUGH_DAYS = 9;

it("a resident the player has not met says who they are before the paper's story (Sheridan, WY, pinned seed)", () => {
  setBookkeeping(false);
  const world = buildBenchWorld(SEED, OPENS, {
    twoLevel: true,
    placeKey: PLACE,
  });
  const { core, director } = world;
  const playerId = world.playerId! as PersonId;
  director.watch(core, playerId);
  core.focusPersonIds.add(playerId);
  let packet = advancePlayerV1(core, {
    controlledPersonId: playerId,
    through: {
      date: addDays(makeIsoDate(OPENS), THROUGH_DAYS),
      minuteOfDay: 12 * 60,
    },
  });
  while (packet.kind !== "complete")
    packet =
      packet.kind === "stop"
        ? resumePlayerV1(core, { kind: "stop", pauseId: packet.pauseId })
        : resumePlayerV1(core, {
            kind: "own-choice",
            pauseId: packet.pauseId,
          });
  const me = core.people.get(playerId)!;
  const holders = [...core.people.values()].filter(
    (row) =>
      row.alive &&
      row.tier !== "husk" &&
      row.id !== playerId &&
      !me.knownIds.has(row.id) &&
      subjectsBetween(core, row.id, playerId, director).some(
        (subject) => subject.kind === "news",
      ) &&
      subjectsBetween(core, row.id, playerId, director).some(
        (subject) => subject.kind === "here",
      ),
  );
  process.stdout.write(
    `introduction first: ${holders.length} unmet residents hold a story and can introduce themselves\n`,
  );
  expect(holders.length).toBeGreaterThan(0);
  let goesOn = 0;
  const order =
    process.env.INTRO_ORDER === "reverse" ? [...holders].reverse() : holders;
  for (const row of order.slice(0, 6)) {
    const talk = openConversation(core, playerId, row.id as PersonId, {
      director,
    });
    const first = talk.lines.find((line) => line.kind !== "greet");
    expect(first?.kind, `${row.givenName}: ${first?.text}`).toBe("here");
    process.stdout.write(`TALK ${row.givenName} ${row.familyName}\n`);
    let shown = 0;
    const show = (pressed?: string) => {
      for (const line of talk.lines.slice(shown))
        process.stdout.write(
          `  ${line.speakerId === playerId ? "You" : row.givenName}: ${line.text}\n`,
        );
      shown = talk.lines.length;
      if (talk.choices.length)
        process.stdout.write(
          `  You say: ${talk.choices.map((choice) => `${choice.key === pressed ? "[pressed] " : ""}${choice.text}`).join(" | ")}\n`,
        );
      else process.stdout.write("  (the talk is over)\n");
    };
    // The player gives their name, then takes the first reply offered at each turn.
    const name = talk.choices.find((choice) => choice.move === "name");
    expect(
      name,
      `${row.givenName} offers the player a name to give`,
    ).toBeTruthy();
    let pick = name!;
    show(pick.key);
    for (let turn = 0; turn < 6; turn += 1) {
      say(core, talk, pick.key);
      if (
        turn === 0 &&
        talk.lines
          .slice(2)
          .some((line) => line.kind !== "here" && line.kind !== "here-back")
      )
        goesOn += 1;
      if (!talk.choices.length) {
        show();
        break;
      }
      pick = talk.choices[0]!;
      show(pick.key);
    }
  }
  // The same story is told to the player once a day (one telling for the
  // house), so only the first resident to tell it goes on to it here.
  process.stdout.write(
    `introduction first: ${goesOn} of 6 went on to more after the name\n`,
  );
  expect(goesOn).toBeGreaterThan(0);
}, 240_000);

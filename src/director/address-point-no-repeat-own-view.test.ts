// @vitest-environment node
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { openingArrivalMinute } from "../bench/opening";
import { roomIds } from "../bench/scene";
import {
  buildBenchWorld,
  NoPlayerHereError,
  OPENING_WARMUP_DAYS,
} from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import type { PersonId } from "../core2/types";
import { meetOverTalk, noteHeard, openConversation, say } from "./conversation";

// The first evening's talk after the address point (the Story lead's pick (b)
// of Fixer A's trace, #9750): where the housemate then says where they stand
// on the same question, the replies offered follow what the player just said
// to them, never the side the player's record holds. Before, "Same here, Dad."
// was followed by the one reply "Not with you.", and "I think he has that
// wrong." by "Exactly right." The test draws places and plays the first
// housemate who raises the point, taking each of the point's replies, until
// it has seen an own-view follow the point in enough places; it names every
// place it passed over.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 10;
const CASES = 3;

/** The move a choice makes ("agree", "disagree"), from its key ("4:agree:Same side."). */
const moveOf = (key: string) => key.split(":")[1] ?? "";

async function play(drawn: ReturnType<typeof drawPlace>, branch: number) {
  const world = buildBenchWorld(drawn.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: drawn.key,
    warmUpDays: OPENING_WARMUP_DAYS,
  });
  const { core, director } = world;
  const me = core.playerId as PersonId;
  const minute = openingArrivalMinute(core, me);
  const room = roomIds(core, me, undefined, minute);
  const household = core.households.get(core.people.get(me)?.householdId ?? "");
  for (const id of (household?.memberIds ?? []).filter((m) => m !== me)) {
    const talk = openConversation(core, me, id as PersonId, {
      director,
      presentIds: room as PersonId[],
      minuteOfDay: minute,
    });
    if (!talk.lines.some((line) => line.kind === "address-point")) continue;
    meetOverTalk(core, talk);
    noteHeard(core, talk);
    const pick = talk.choices[Math.min(branch, talk.choices.length - 1)]!;
    const before = talk.lines.length;
    const after = say(core, talk, pick.key);
    return {
      said: moveOf(pick.key),
      saidText: pick.text,
      followed: after.lines.slice(before).some((l) => l.kind === "own-view"),
      offered: after.choices.map((c) => ({
        move: moveOf(c.key),
        text: c.text,
      })),
    };
  }
  return null;
}

it(`the replies to where they stand after the address point follow what the player said (seed ${seed})`, async () => {
  setBookkeeping(false);
  const passed: string[] = [];
  let cases = 0;
  for (let draw = 0; draw < DRAWS && cases < CASES; draw += 1) {
    const drawn = drawPlace(`${seed}:${draw}`, "no-repeat-own-view");
    const where = `${drawn.name} (${drawn.key}), place seed ${drawn.seed}`;
    let seen = 0;
    try {
      for (const branch of [0, 1]) {
        const result = await play(drawn, branch);
        if (!result) {
          passed.push(
            `${where}: nobody in the household raised the address point`,
          );
          break;
        }
        if (!result.followed) {
          passed.push(
            `${where}, reply ${branch + 1}: no own-view followed the point`,
          );
          continue;
        }
        seen += 1;
        const opposite = result.said === "agree" ? "disagree" : "agree";
        expect(
          result.offered.filter((o) => o.move === opposite),
          `${where}: after "${result.saidText}" (${result.said}) the talk offered a ${opposite} reply: ${JSON.stringify(result.offered)}`,
        ).toEqual([]);
      }
    } catch (error) {
      if (error instanceof NoPlayerHereError) {
        passed.push(`${where}: no player can live here`);
        continue;
      }
      throw error;
    }
    if (seen) cases += 1;
  }
  expect(
    cases,
    `No drawn place showed an own-view after the address point (seed ${seed}):\n${passed.join("\n")}`,
  ).toBeGreaterThan(0);
  process.stdout.write(
    `address-point-no-repeat-own-view (GOLDEN_PATH_SEED=${seed}): ${cases} place(s) checked; passed over: ${passed.join(" | ") || "none"}\n`,
  );
}, 900_000);

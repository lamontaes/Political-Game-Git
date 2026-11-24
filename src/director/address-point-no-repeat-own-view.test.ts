// @vitest-environment node
import { describe, expect, it } from "vitest";
import { openingArrivalMinute } from "../bench/opening";
import { roomIds } from "../bench/scene";
import { buildBenchWorldInStages, OPENING_WARMUP_DAYS } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import type { PersonId } from "../core2/types";
import { meetOverTalk, noteHeard, openConversation, say } from "./conversation";

// The first evening's talk after the address point (Story lead's pick (a) of
// Fixer A's trace, #9750): once the point is answered, the speaker does not
// raise their own view on the very question the point just covered. Raising
// it restated a stand a turn after it was given, and its replies read the
// player's seeded stance, so only one reply was left ("Not with you.",
// "Exactly right."). The talk is played as the bench plays it: the first
// housemate with something to say, the point's reply taken, then every line
// and reply set that follows. The two worlds are the pre-grade's seeds where
// the trap showed (Bethel, Maine and Oakton, Virginia).
const SEEDS = ["bd3806", "d8e52e"] as const;
/** The point's two replies: agreeing with the speaker, and parting ways. */
const BRANCHES = [0, 1] as const;

describe("after the address point the talk does not raise the same question again", () => {
  for (const seed of SEEDS)
    for (const branch of BRANCHES)
      it(`seed ${seed}, reply ${branch + 1}`, async () => {
        setBookkeeping(false);
        const world = await buildBenchWorldInStages(
          seed,
          gameStartDate(),
          { twoLevel: true, warmUpDays: OPENING_WARMUP_DAYS },
          () => undefined,
        );
        const { core, director } = world;
        const me = world.playerId as PersonId;
        const where = `${world.place.displayName}, seed ${seed}, reply ${branch + 1}`;
        const minute = openingArrivalMinute(core, me);
        const room = roomIds(core, me, undefined, minute);
        const household = core.households.get(
          core.people.get(me)?.householdId ?? "",
        );
        let played = false;
        for (const id of (household?.memberIds ?? []).filter((m) => m !== me)) {
          const talk = openConversation(core, me, id as PersonId, {
            director,
            presentIds: room as PersonId[],
            minuteOfDay: minute,
          });
          if (!talk.lines.length) continue;
          meetOverTalk(core, talk);
          noteHeard(core, talk);
          // Only the housemate who raises the address's point is under test.
          if (!talk.lines.some((line) => line.kind === "address-point"))
            continue;
          const pick = talk.choices[Math.min(branch, talk.choices.length - 1)]!;
          const before = talk.lines.length;
          let at = say(core, talk, pick.key);
          const after = at.lines.slice(before);
          const kinds = after.map((line) => line.kind);
          expect(kinds, `${where}: the point is answered`).toContain(
            "address-point-back",
          );
          // The same question is not raised twice: no own-view line follows
          // the answer to the point.
          expect(
            kinds.filter((kind) => kind === "own-view"),
            `${where}: the speaker restated their stand after the point`,
          ).toEqual([]);
          // And the talk never offers a single reply after it.
          for (let step = 0; step < 8 && at.choices.length; step += 1) {
            expect(
              at.choices.length,
              `${where}: offered one reply, "${at.choices[0]?.text}"`,
            ).toBeGreaterThan(1);
            at = say(core, at, at.choices[0]!.key);
          }
          played = true;
          break;
        }
        expect(played, `${where}: nobody raised the address point`).toBe(true);
        process.stdout.write(`address-point-no-repeat-own-view: ${where}\n`);
      }, 600_000);
});

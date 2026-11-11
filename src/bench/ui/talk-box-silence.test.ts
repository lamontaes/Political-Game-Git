/**
 * Say nothing is offered only where a talk has replies to stay silent on
 * (pool item play-talk-no-say-nothing-when-nothing-left; owner, Oct 27: "when
 * there's nothing left to say, don't allow there to be a say nothing"). The
 * replies come from real talks in two places drawn from all 56.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../../scripts/core2-year/place";
import { setBookkeeping } from "../../core2/bookkeeping";
import { gameStartDate } from "../../core2/game-start";
import { openConversation } from "../../director/conversation";
import { buildBenchWorld } from "../world";
// @ts-expect-error the part is plain JavaScript
import { silenceOffered } from "./talk-box.mjs";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`a talk offers Say nothing exactly when it has replies (seed ${seed})`, () => {
  setBookkeeping(false);
  let withReplies = 0;
  for (let draw = 0; draw < 2; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "talk-silence");
    const where = `${place.name} (${place.key}), place seed ${place.seed}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core } = world;
    const me = world.playerId!;
    for (const id of [...(core.people.get(me)?.knownIds ?? [])].slice(0, 8)) {
      const talk = openConversation(core, me, id);
      const choices =
        (talk as unknown as { choices?: unknown[] }).choices ?? [];
      expect(silenceOffered(choices), `${where}: ${id}`).toBe(
        choices.length > 0,
      );
      if (choices.length) withReplies += 1;
    }
  }
  expect(silenceOffered([]), "an empty reply list").toBe(false);
  expect(silenceOffered([{ key: "x" }]), "a reply list").toBe(true);
  expect(withReplies, `no talk had replies (seed ${seed})`).toBeGreaterThan(0);
}, 900_000);

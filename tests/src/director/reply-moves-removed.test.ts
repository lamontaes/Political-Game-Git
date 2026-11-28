/**
 * No reply says nothing (owner, Nov 25, order 1): the `leave`, `deflect` and
 * `stall` player reply moves are gone, and leaving is the screen's own Leave
 * control. A set holds the replies the arc has stances for, one to four
 * (owner, Nov 10), with none empty and none repeated, and a smaller set plays
 * to an end. The place is drawn from all 56 (drawn-place-tests);
 * GOLDEN_PATH_SEED=<seed> replays a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../../scripts/core2-year/place";
import {
  composeSceneTalk,
  type TreeNode,
} from "../../../src/director/scene-talk";
import { expectUpToFourDifferent } from "../../support/reply-set-check";

const REMOVED = new Set(["leave", "deflect", "stall"]);
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "reply-moves-removed");

it(`no composed set holds a removed reply, and a smaller set plays (${place.name} (${place.key}), seed ${place.seed})`, async () => {
  // The scene fixture builds its world from these two (tests/support).
  process.env.GOLDEN_PATH_SEED = place.seed;
  process.env.GOLDEN_PATH_PLACE_KEY = place.key;
  const { core, director, askerId, askedId, facts, types, HELD } =
    await import("../../support/scene-talk-fixture");
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  let composed = 0;
  let smaller = 0;
  const skipped: string[] = [];
  for (const type of types) {
    const result = composeSceneTalk(
      core,
      director,
      { askerId, askedId },
      type,
      facts,
      {},
      HELD,
    );
    if (result.kind !== "composed") {
      skipped.push(`${type.key}: ${result.reason}`);
      continue;
    }
    composed += 1;
    const walk = (node: TreeNode, path: string) => {
      if (node.replies.length)
        expectUpToFourDifferent(
          node.replies.map((reply) => reply.line),
          `${where}: ${type.key} ${path}`,
        );
      if (node.replies.length && node.replies.length < 4) smaller += 1;
      for (const reply of node.replies) {
        expect(
          REMOVED.has(reply.line.move),
          `${where}: ${type.key} ${path} offers ${reply.line.move}`,
        ).toBe(false);
        // A reply plays on: the asker answers it, more replies follow, or it ends.
        const next = reply.next;
        expect(
          next,
          `${where}: ${type.key} ${path}: ${reply.line.text}`,
        ).not.toBeNull();
        if (next) walk(next, `${path}>${reply.line.move}`);
      }
      for (const branch of node.branches ?? []) walk(branch.node, path);
    };
    walk(result.talk.tree, "root");
    for (const round of result.talk.rounds)
      for (const reply of round.replies)
        expect(REMOVED.has(reply.move), `${where}: ${type.key}`).toBe(false);
  }
  expect(
    composed,
    `${where}: no scene composed (${skipped.join("; ")})`,
  ).toBeGreaterThan(0);
  expect(
    smaller,
    `${where}: no set with fewer than four replies`,
  ).toBeGreaterThan(0);
}, 600_000);

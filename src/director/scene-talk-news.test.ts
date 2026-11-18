import { expect, it } from "vitest";
import { stageWorldHeld } from "../../scripts/dialogue-batch/stage-world";
import type { PersonId } from "../core2/types";
import { openConversation } from "./conversation";

// A scene's talk never asks about news the scene is not about (the talk a
// scene hands to skips bring-it-up, which is what says what the news is, so
// "What do you think?" would ask about nothing). One generated year at the
// place the seed draws; the test names it.
const SEED = "a7";

it(`no scene's talk turns to news the scene is not about (seed ${SEED})`, () => {
  const kinds: { label: string; kinds: string[] }[] = [];
  const world = stageWorldHeld({
    id: "scene-talk-news",
    seed: SEED,
    days: 365,
    onStaged: (staged, _scene, core, director) => {
      const watcher = staged.watchedId as PersonId;
      const other = staged.castIds.find((id) => id !== watcher);
      if (!other) return;
      const moment = director.ledger.people
        .get(watcher)
        ?.momentsById.get(staged.momentId);
      const opened = openConversation(core, watcher, other as PersonId, {
        director,
        occasionId: staged.momentId,
        presentIds: staged.castIds as PersonId[],
      });
      kinds.push({
        label: `${staged.typeKey} (${moment?.label ?? ""})`,
        kinds: opened.lines.map((line) => line.kind),
      });
    },
  });
  const { place } = world.report;
  const where = `${place.name} (${place.key}), seed ${SEED}`;
  expect(kinds.length, where).toBeGreaterThan(0);
  for (const talk of kinds)
    expect(talk.kinds, `${where}: ${talk.label}`).not.toContain("news");
}, 900_000);

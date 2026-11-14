import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { BenchPlayer } from "../bench/player";
import { DevMode } from "../bench/dev-mode";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import type { PersonId } from "../core2/types";
import { purposeScene } from "./purpose-scene";

// A funeral the player hears of (a death in their circle, the health engine's
// `life.death` record) is staged by the director and worded by the English
// engine. Before this, nothing wrote the `deceased` fact, every line that
// states the funeral's request needs it, and the scene was skipped with "the
// request that states funeral-cause cannot be worded from the records given".
// Pinned to one drawn place (Whiteriver, Arizona; seed thin-d1 of the thin
// banks read): the dev route brings the death about through the health
// engine's own illness and runs the world until the person dies, as a
// player's world would (about two minutes).
const PLACE = {
  key: "0482530",
  name: "Whiteriver, Arizona",
  seed: "dc8fc77467819ffc56a56bac001f958db7709f56081b19dc638b56b685671eb1",
};

it(
  `a death in the player's circle stages a funeral that can be worded (${PLACE.name}, ${PLACE.key})`,
  { timeout: 280_000 },
  () => {
    setBookkeeping(false);
    const world = buildBenchWorld(PLACE.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: PLACE.key,
    });
    const { core, director } = world;
    const player = new BenchPlayer(core, director);
    player.select(world.playerId!);
    const dev = new DevMode(core, director, player, world.placeId);
    dev.advance(addDays(makeIsoDate(core.date), 1));
    dev.forceScene({ typeKey: "funeral" });
    const ran = dev.runUntil({ scene: "funeral", cap: 366 });
    const where = `${PLACE.name} (${PLACE.key}), seed ${PLACE.seed}: ${ran.reason} after ${ran.days} days`;
    const composed: string[] = [];
    const skipped: string[] = [];
    for (const [personId, book] of director.ledger.people) {
      for (const entry of book.schedule) {
        if (!entry.bindings.some((row) => row.typeKey === "funeral")) continue;
        const result = purposeScene(
          core,
          director,
          personId as PersonId,
          entry,
          {
            typeKey: "funeral",
          },
        );
        if (result?.kind !== "composed") {
          skipped.push(
            `${personId}: ${result ? (result as { reason: string }).reason : "none"}`,
          );
          continue;
        }
        const { scene } = result;
        const moment = book.momentsById.get(entry.momentId)!;
        const dead = core.people.get(
          core.durableLog.get(moment.causeId)!.personIds[0] as PersonId,
        )!;
        const fact = scene.facts.find((row) => row.key === "deceased");
        expect(fact?.text, where).toBe(dead.givenName);
        expect(fact?.recordIds, where).toContain(moment.causeId);
        for (const line of [
          scene.talk.state,
          ...scene.talk.tree.replies.map((r) => r.line),
        ])
          expect(line.text, where).not.toMatch(/[{}]|undefined/);
        const said = scene.facts.find((row) => row.key === "cause");
        composed.push(
          `${personId}: ${scene.talk.state.text} (tie: ${scene.facts.find((row) => row.key === "deceased-tie")?.text ?? "none"}; cause: ${said?.text ?? "none"})`,
        );
      }
    }
    process.stdout.write(`FUNERAL ${where}\n  ${composed.join("\n  ")}\n`);
    // A funeral plays only where the dead person left a cause on record (the
    // plain funeral is item words-funeral-plain-scene-with-no-cause-on-record);
    // anything else skipped is a defect.
    expect(
      skipped.filter((row) => !/cannot be worded from the records/.test(row)),
      where,
    ).toEqual([]);
    expect(skipped, where).toEqual([]);
    expect(composed.length, where).toBeGreaterThan(0);
  },
);

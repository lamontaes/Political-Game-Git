import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import type { PersonId } from "../core2/types";
import { purposeScene } from "../director/purpose-scene";
import { BenchPlayer, ownPick } from "./player";
import { storyScene } from "./story";
import { buildBenchWorld } from "./world";

// One narrator per scene (the plan of Oct 28, section 1): a scene with a
// purpose opens on its own narration, the voice that also speaks between its
// lines, and the situation's paragraph is not said beside it. Before, a job
// offer read "The phone rings." twice. Played as the bench plays a drawn
// town's new adult, through the months the director stages scenes.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DAYS = 150;

it(`a scene with a purpose has one narrator and says no sentence twice (seed ${seed})`, () => {
  setBookkeeping(false);
  const place = drawPlace(seed, "story-one-narrator");
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  const me = world.playerId! as PersonId;
  const player = new BenchPlayer(core, director);
  player.select(me);
  const end = addDays(makeIsoDate(core.date), DAYS);
  const seen = new Set<string>();
  const shown: string[] = [];
  let checked = 0;
  const check = () => {
    for (const entry of director.ledger.people.get(me)?.schedule ?? []) {
      if (seen.has(entry.momentId)) continue;
      seen.add(entry.momentId);
      const purpose = purposeScene(core, director, me, entry, { next: true });
      if (purpose?.kind !== "composed" || !purpose.scene.talk.narration.length)
        continue;
      const story = storyScene(core, director, me, entry.momentId, 18 * 60);
      const said = story.narration.map((line) => line.text);
      expect(said, `${where}: ${entry.momentId}`).toEqual(
        purpose.scene.talk.narration.map((line) => line.text),
      );
      const sentences = said
        .join(" ")
        .split(/(?<=[.!?])\s+/)
        .filter(Boolean);
      expect(new Set(sentences).size, `${where}: ${said.join(" | ")}`).toBe(
        sentences.length,
      );
      checked += 1;
      if (shown.length < 4)
        shown.push(`${core.date} ${purpose.scene.typeKey}: ${said.join(" ")}`);
    }
  };
  let r = player.advance("day");
  for (let step = 0; step < 4000 && core.date < end; step += 1) {
    const packet = r.packet as unknown as { kind: string; pauseId?: string };
    check();
    if (packet.kind === "stop") {
      if (player.pollingPlace) player.leavePolls();
      r = player.resume({ kind: "stop", pauseId: packet.pauseId! });
    } else if (packet.kind === "choice")
      r = player.resume({
        kind: "choice",
        pauseId: packet.pauseId!,
        offerId: ownPick(r.packet as never)!.offerId,
      });
    else {
      if (player.pollingPlace) player.leavePolls();
      r = player.advance("day");
    }
  }
  expect(
    checked,
    `${where}: no scene with a purpose in ${DAYS} days`,
  ).toBeGreaterThan(0);
  process.stdout.write(
    `ONE NARRATOR ${where}, run seed ${seed}: ${checked} scenes with a purpose\n  ${shown.join("\n  ")}\n`,
  );
}, 900_000);

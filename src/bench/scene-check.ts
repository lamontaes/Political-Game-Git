/* global process, console */
// Every scene reached in a random place shows real art: a backdrop file
// from the library and an approved whole figure for each person drawn.
// Usage: node --import tsx src/bench/scene-check.ts [seed]
import { existsSync, statSync } from "node:fs";
import { BenchPlayer } from "./player";
import { buildBenchWorld } from "./world";
import { gameStartDate } from "../core2/game-start";
import { backdropPath, benchScene } from "./scene";

const seed = process.argv[2] ?? process.env.GOLDEN_PATH_SEED ?? "scene-check";
const w = buildBenchWorld(seed, gameStartDate(), {
  ...(process.env.GOLDEN_PATH_PLACE_KEY
    ? { placeKey: process.env.GOLDEN_PATH_PLACE_KEY }
    : {}),
  minimumPeople: Number(process.env.BENCH_CHECK_PEOPLE ?? 600),
});
const player = new BenchPlayer(w.core, w.director);
const adults = w.residents.filter((row) => row.age >= 18);
const picked = [0, 1, 2].map(
  (i) => adults[Math.floor(((i + 1) * adults.length) / 4)]!,
);
const places = new Map<string, number>();
let scenes = 0,
  figures = 0,
  unplaced = 0;
function look(personId: string) {
  const scene = benchScene(w.core, personId, player.packet);
  if (!existsSync(backdropPath(scene.backdrop.file)))
    throw new Error(`Missing backdrop ${scene.backdrop.file}`);
  for (const person of scene.people) {
    // Only the v2 standing figures are drawn (owner, Oct 24).
    if (!person.figureUrl.startsWith("/art/people-engine/v2/figures/"))
      throw new Error(`${person.personId} is not a v2 figure`);
    const file = new URL(`../..${person.figureUrl}`, import.meta.url);
    if (!existsSync(file) || statSync(file).size < 1000)
      throw new Error(`Blank figure for ${person.personId}`);
    figures++;
  }
  if (!scene.people.some((person) => person.personId === personId))
    throw new Error(`${personId} is not drawn in their own scene.`);
  unplaced += scene.unplaced.length;
  places.set(scene.place, (places.get(scene.place) ?? 0) + 1);
  scenes++;
}
for (const row of picked) {
  player.select(row.id);
  look(row.id);
  let result = player.advance("week");
  for (let guard = 0; result.packet.kind !== "complete"; guard++) {
    if (guard > 2000) throw new Error("The week did not finish.");
    look(row.id);
    const packet = result.packet;
    result = {
      ...result,
      ...(packet.kind === "choice"
        ? player.resume({
            kind: "choice",
            pauseId: packet.pauseId,
            offerId: packet.offers[0]!.offerId,
          })
        : player.resume({ kind: "stop", pauseId: packet.pauseId })),
    };
  }
  look(row.id);
}
console.log(
  `${w.place.displayName} (${w.place.key}), seed ${seed}: ${scenes} scenes, ${figures} figures drawn, ${unplaced} people present without a spot or a fitting whole figure; places ${[...places].map(([p, n]) => `${p} ${n}`).join(", ")}`,
);

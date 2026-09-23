/**
 * Mass play orchestrator.
 *
 *   node --import tsx scripts/playtest/mass-play/run.ts --games 200 \
 *     --workers 4 --years 2 --out <dir> [--mix short|long|dynasty] [--seed s]
 *
 * Places are drawn across every state, D.C. and the territories the game can
 * start a life in, never Kentucky. Each game gets its own persona, start age
 * and seed. Results land as JSON lines in <dir>/games.jsonl.
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
} from "../../../src/simulation/life-places";
import { rng, type GameSpec, type Persona } from "./driver";

const args = process.argv.slice(2);
const opt = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1]! : fallback;
};
const games = Number(opt("games", "20"));
const workers = Number(opt("workers", "4"));
const years = Number(opt("years", "2"));
const mix = opt("mix", "short");
const out = opt("out", "mass-play-out");
const runSeed = opt("seed", `mass-${Date.now()}`);
const wallMs = Number(opt("wall", String(15 * 60_000)));
// Starting ages to draw from, for example --ages 8,9,10,11,12.
const ageList = opt("ages", "10,16,18,21,25,30,40,55,70")
  .split(",")
  .map(Number);
mkdirSync(out, { recursive: true });

const random = rng(runSeed);
const states = lifePlaceStateIdentities().filter((s) => s.usps !== "KY");
const personas: Persona[] =
  mix === "dynasty"
    ? ["dynasty"]
    : [
        "random",
        "random",
        "terrible",
        "terrible",
        "ambitious",
        "ambitious",
        "idle",
        "chaotic",
      ];
const specs: GameSpec[] = [];
for (let i = 0; i < games; i++) {
  const state = states[i % states.length]!;
  const places = searchLifePlaces("", 5000, {
    stateJurisdictionKey: state.jurisdictionKey,
    scope: "locality",
  });
  if (!places.length) continue;
  const place = places[Math.floor(random() * places.length)]!;
  const persona = personas[Math.floor(random() * personas.length)]!;
  const startAge =
    mix === "dynasty"
      ? 55 + Math.floor(random() * 16)
      : ageList[Math.floor(random() * ageList.length)]!;
  specs.push({
    id: `${runSeed}-${i}`,
    seed: `${runSeed}-${i}`,
    placeKey: place.key,
    placeName: place.displayName,
    usps: state.usps,
    persona,
    startAge,
    years,
    generations: mix === "dynasty" ? 4 : mix === "long" ? 2 : 1,
    wallMs,
  });
}
const outFile = join(out, "games.jsonl");
const slices = Array.from({ length: workers }, (_, k) =>
  specs.filter((_, i) => i % workers === k),
);
let done = 0;
await Promise.all(
  slices.map(
    (slice, k) =>
      new Promise<void>((resolve) => {
        const file = join(out, `specs-${k}.json`);
        writeFileSync(file, JSON.stringify(slice));
        const child = spawn(
          process.execPath,
          [
            "--max-old-space-size=3500",
            "--import",
            "tsx",
            "scripts/playtest/mass-play/worker.ts",
            file,
            outFile,
          ],
          { stdio: ["ignore", "ignore", "pipe"] },
        );
        child.stderr.on("data", (d) => process.stderr.write(`[w${k}] ${d}`));
        child.on("exit", (code) => {
          done += 1;
          console.log(`worker ${k} exited ${code} (${done}/${workers})`);
          resolve();
        });
      }),
  ),
);
console.log(`${specs.length} games written to ${outFile}`);

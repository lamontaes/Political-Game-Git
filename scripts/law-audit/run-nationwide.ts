/** Five watched worlds on one source pin. Child simulations are not new agents. */
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, writeFileSync, createWriteStream } from "node:fs";
import { drawRandomPlace } from "../../tests/support/random-place";
import { unincorporatedCountyJurisdictionIds } from "../../src/simulation/nationwide-world/local-governments";

function option(name: string, fallback: string) {
  const index = process.argv.indexOf(`--${name}`);
  const result = index < 0 ? fallback : process.argv[index + 1];
  if (!result || result.startsWith("--"))
    throw new Error(`--${name} needs a value`);
  return result;
}
const seed = option("seed", "team2-national-20260930-a");
const months = Number(option("months", "24"));
if (!Number.isSafeInteger(months) || months < 1)
  throw new Error("Invalid months");
const out = option("out", "test-results/law-audit/nationwide");
const head = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const dirty = execFileSync("git", ["status", "--porcelain"], {
  encoding: "utf8",
}).trim();
if (dirty)
  throw new Error(
    "Publish source before a nationwide run; dirty paths are not a source pin.",
  );
mkdirSync(out, { recursive: true });
const usedStates = new Set<string>();
const worlds = Array.from({ length: 5 }, (_, index) => {
  const worldSeed = `${seed}-${index + 1}`;
  const place = drawRandomPlace(
    worldSeed,
    (candidate) =>
      candidate.stateJurisdictionKey !== null &&
      !usedStates.has(candidate.stateJurisdictionKey) &&
      (index !== 0 ||
        unincorporatedCountyJurisdictionIds(candidate.context.jurisdiction.id)
          .length > 0),
  );
  usedStates.add(place.stateJurisdictionKey!);
  return {
    seed: worldSeed,
    place: place.key,
    startingState: place.stateJurisdictionKey,
    startingPlace: place.displayName,
    unincorporated:
      unincorporatedCountyJurisdictionIds(place.context.jurisdiction.id)
        .length > 0,
    output: `${out}/world-${index + 1}`,
    status: "NOT RUN",
    exitCode: null as number | null,
  };
});
function persist() {
  writeFileSync(
    `${out}/manifest.json`,
    JSON.stringify(
      {
        head,
        dirty,
        months,
        worlds,
        limits: [
          "Every world covers all enacted jurisdictions, not only its starting state.",
          "Running or failed worlds are not complete audit evidence.",
          "Prior unstamped receipts are separate; a stamp alone is not proof.",
        ],
      },
      null,
      2,
    ),
  );
}
persist();
console.log(JSON.stringify({ head, months, worlds }));
let cursor = 0;
async function worker() {
  for (;;) {
    const index = cursor++;
    const world = worlds[index];
    if (!world) return;
    if (
      execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim() !== head ||
      execFileSync("git", ["status", "--porcelain"], {
        encoding: "utf8",
      }).trim()
    )
      throw new Error("Source changed; remaining worlds NOT RUN.");
    world.status = "RUNNING";
    persist();
    const log = createWriteStream(`${world.output}.log`);
    const child = spawn(
      process.execPath,
      [
        "--max-old-space-size=8192",
        "--import",
        "tsx",
        "scripts/law-audit/run.ts",
        "--seed",
        world.seed,
        "--place",
        world.place,
        "--months",
        String(months),
        "--out",
        world.output,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    child.stdout.pipe(log);
    child.stderr.pipe(log, { end: false });
    world.exitCode = await new Promise<number>((resolve) => {
      child.once("error", (error) => {
        log.write(String(error));
        resolve(1);
      });
      child.once("close", (code) => resolve(code ?? 1));
    });
    log.end();
    world.status = world.exitCode === 0 ? "COMPLETED" : "NORESULT";
    persist();
    console.log(JSON.stringify(world));
  }
}
await Promise.all([worker(), worker()]);
if (worlds.some((world) => world.exitCode !== 0)) process.exitCode = 1;

/** Separate public unit checks from required private delivery verification. */
import process from "node:process";
import console from "node:console";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
const mode = process.argv[2];
if (!["public", "private"].includes(mode))
  throw Error("Specify public or private");
const env = {
  ...process.env,
  MODULAR_REQUIRE_PRIVATE: mode === "private" ? "1" : "0",
};
if (mode === "private") {
  const needed = [
    "art/manifest/character_candidate_modular45_registry.json",
    "art/authoring/modular47-r1/calibration.json",
    "art/authoring/modular47-r1/pose-pack.json",
    env.MODULAR_SUPPLIED_EVIDENCE,
  ];
  if (needed.some((p) => !p || !existsSync(p)))
    throw Error(
      "Private verification requires the matching installed pack AND MODULAR_SUPPLIED_EVIDENCE. No skipped private pass.",
    );
}
console.log(
  JSON.stringify({
    mode,
    privateCoverage: mode === "private" ? "REQUIRED" : "NOT_TESTED",
  }),
);
function run(command, args) {
  const result = spawnSync(command, args, { env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
run("python3", [
  "-m",
  "unittest",
  "discover",
  "-s",
  "scripts/art-asset-factory/modular_fit",
  "-p",
  "test_*.py",
]);
run(process.execPath, [
  "node_modules/vitest/vitest.mjs",
  "run",
  "src/presentation/prepared-profile.test.ts",
  "src/presentation/sha256.test.ts",
  "src/player/raster-material.test.ts",
  ...(mode === "private"
    ? [
        "src/r1-review",
        "src/presentation/modular-source-kit.test.ts",
        "src/presentation/complete-outfit.test.ts",
        "src/presentation/engine-people29.test.ts",
      ]
    : []),
]);

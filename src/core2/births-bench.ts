/** Part 1 generated-year evidence. One guarded process per variant, same frozen input. */
import { createHash, randomInt } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { execFileSync } from "node:child_process";
import { hostname, platform, arch, cpus } from "node:os";
import { resolve } from "node:path";
import { getHeapStatistics } from "node:v8";
import { pathToFileURL } from "node:url";
// The runner may be copied to /tmp while the single checkout switches named
// revisions. All runtime modules load from cwd, not from the copied runner.
const load = (path: string) => import(pathToFileURL(resolve(path)).href);
import type * as PlacesModule from "../simulation/life-places";
import type * as PlacePopulationModule from "../simulation/nationwide-world/place-population";
import type * as PopulationModule from "./population";
import type * as LifeModule from "./life";
import type * as StateModule from "./state";
import type * as RenewalSetupModule from "./births-setup";
import type * as RenewalModule from "./modules/renewal";
import type { CoreInput } from "./types";
const args = process.argv.slice(2);
const arg = (name: string) => {
  const index = args.indexOf(name);
  if (index < 0 || !args[index + 1]) throw new Error(`Missing ${name}`);
  return args[index + 1]!;
};
const hash = (bytes: string) =>
  createHash("sha256").update(bytes).digest("hex");
if (args.includes("--prepare")) {
  const { lifePlaceStateIdentities, lifePlaceSearch } = (await load(
    "src/simulation/life-places.ts",
  )) as typeof PlacesModule;
  const { placeReferencePopulation } = (await load(
    "src/simulation/nationwide-world/place-population.ts",
  )) as typeof PlacePopulationModule;
  const { buildPopulation } = (await load(
    "src/core2/population.ts",
  )) as typeof PopulationModule;
  const states = lifePlaceStateIdentities();
  if (states.length !== 56) throw new Error("Expected all 56 identities.");
  const state = states[randomInt(states.length)]!;
  const places = lifePlaceSearch("", 100000, {
    stateJurisdictionKey: state.jurisdictionKey,
    scope: "locality",
  });
  const sized = places.filter(
    (place) =>
      place.sourceGeoid &&
      (placeReferencePopulation(place.sourceGeoid)?.value ?? 0) >= 800,
  );
  const pool = sized.length ? sized : places;
  if (!pool.length)
    throw new Error("Selected identity has no locality; do not redraw.");
  const place = pool[randomInt(pool.length)]!;
  const seed = "m1-renewal-births-20261011";
  const input = buildPopulation({
    seed,
    placeKey: place.key,
    startedAt: "2026-01-01",
    minimumPeople: 800,
  });
  const bytes = JSON.stringify(input);
  writeFileSync(arg("--input"), bytes, { flag: "wx" });
  const receipt = {
    selection: "crypto random all56 identity, then locality; generation only",
    state,
    place,
    seed,
    people: input.people.length,
    inputSha256: hash(bytes),
  };
  writeFileSync(arg("--output"), JSON.stringify(receipt, null, 2) + "\n");
  console.log(JSON.stringify(receipt));
} else {
  const bytes = readFileSync(arg("--input"), "utf8"),
    input = JSON.parse(bytes) as CoreInput;
  const variant = arg("--variant");
  if (!["base", "births"].includes(variant))
    throw new Error("Unknown variant.");
  const sourceRevision = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  if (
    execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim()
  )
    throw new Error("Measure a clean named revision.");
  const { createLifeCore, advanceCore } = (await load(
    "src/core2/life.ts",
  )) as typeof LifeModule;
  const { coreAPI, assertCoreIntegrity } = (await load(
    "src/core2/state.ts",
  )) as typeof StateModule;
  const factory =
    variant === "births"
      ? ((await load("src/core2/births-setup.ts")) as typeof RenewalSetupModule)
          .createRenewalCore
      : createLifeCore;
  const start = performance.now();
  const core = factory(input);
  const ready = performance.now();
  const result = advanceCore(core, "2027-01-01");
  const end = performance.now();
  if (result.simulatedDays !== 365)
    throw new Error("Expected a complete year.");
  assertCoreIntegrity(core);
  const store =
    variant === "births"
      ? coreAPI(core).moduleState(
          ((await load("src/core2/modules/renewal.ts")) as typeof RenewalModule)
            .RENEWAL_MODULE_ID,
        )
      : undefined;
  const residents = input.people.filter(
    (person) => person.tier !== "husk",
  ).length;
  const births = store?.table("births").rows() ?? [];
  const receipt = {
    variant,
    sourceRevision,
    apiVersion: core.apiVersion,
    host: {
      hostname: hostname(),
      platform: platform(),
      arch: arch(),
      cpu: cpus()[0]?.model,
      node: process.versions.node,
      execArgv: process.execArgv,
      heapLimitMiB: getHeapStatistics().heap_size_limit / 1048576,
    },
    peakRssMiB: process.resourceUsage().maxRSS / 1024,
    inputSha256: hash(bytes),
    residents,
    inputPeople: input.people.length,
    initializeMilliseconds: ready - start,
    advanceMilliseconds: end - ready,
    totalMilliseconds: end - start,
    result,
    birthsPer1000OpeningResidents: (births.length * 1000) / residents,
    births,
    plans: store?.table("plans").rows(),
    pregnancies: store?.table("pregnancies").rows(),
    gaps: [...core.gaps],
    ageProfileBefore: ageProfile(input.people, input.startedAt),
    ageProfileAfter: ageProfile(
      [...core.people.values()].filter((person) => person.alive),
      core.date,
    ),
  };
  writeFileSync(arg("--output"), JSON.stringify(receipt, null, 2) + "\n");
  console.log(
    JSON.stringify({
      variant,
      advanceMilliseconds: receipt.advanceMilliseconds,
      births: births.length,
      rate: receipt.birthsPer1000OpeningResidents,
    }),
  );
}
function ageProfile(
  people: readonly { birthDate: string; tier: string }[],
  date: string,
) {
  const counts: Record<string, number> = {};
  for (const person of people) {
    if (person.tier === "husk") continue;
    const age =
      Number(date.slice(0, 4)) -
      Number(person.birthDate.slice(0, 4)) -
      Number(date.slice(5) < person.birthDate.slice(5));
    const band =
      age < 5 ? "0-4" : age < 18 ? "5-17" : age < 65 ? "18-64" : "65+";
    counts[band] = (counts[band] ?? 0) + 1;
  }
  return counts;
}

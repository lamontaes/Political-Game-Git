/** Part 1 generated-year evidence. One guarded process per variant, same frozen input. */
import { createHash, randomInt } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import {
  lifePlaceStateIdentities,
  lifePlaceSearch,
} from "../simulation/life-places";
import { placeReferencePopulation } from "../simulation/nationwide-world/place-population";
import { buildPopulation } from "./population";
import { createLifeCore, advanceCore } from "./life";
import { createRenewalCore } from "./births-setup";
import { coreAPI, assertCoreIntegrity } from "./state";
import { RENEWAL_MODULE_ID } from "./modules/renewal";
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
  const start = performance.now();
  const core =
    variant === "births" ? createRenewalCore(input) : createLifeCore(input);
  const ready = performance.now();
  const result = advanceCore(core, "2027-01-01");
  const end = performance.now();
  if (result.simulatedDays !== 365)
    throw new Error("Expected a complete year.");
  assertCoreIntegrity(core);
  const store =
    variant === "births"
      ? coreAPI(core).moduleState(RENEWAL_MODULE_ID)
      : undefined;
  const residents = input.people.filter(
    (person) => person.tier !== "husk",
  ).length;
  const births = store?.table("births").rows() ?? [];
  const receipt = {
    variant,
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

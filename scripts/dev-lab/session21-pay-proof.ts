import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { advanceObservedWorld } from "../../src/presentation/observer-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { openWatchedWorld } from "./world-aging";

const seed = "session21-pay-kind-30-day-opening";
const place = drawRandomPlace(seed);
const { world } = openWatchedWorld(seed, place.key);
const advanced = advanceObservedWorld(world, 30);
const receipt = {
  head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  seed,
  place: { key: place.key, name: place.displayName },
  days: 30,
  from: world.currentDate,
  through: advanced.currentDate,
  people: Object.keys(advanced.people).length,
  newPayTerms: advanced.history.resourceFlowTerms
    .slice(world.history.resourceFlowTerms.length)
    .filter((row) =>
      row.lawEffectStamps?.some((stamp) => stamp.effectKind === "pay"),
    ),
};
writeFileSync(
  "/tmp/session21-pay-kind-30-day.json",
  JSON.stringify(receipt, null, 2),
);
console.log(
  JSON.stringify({ ...receipt, newPayTerms: receipt.newPayTerms.length }),
);

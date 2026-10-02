import { writeFileSync } from "node:fs";
import { smallWorld } from "./small-world";
import { drawRandomPlace } from "../support/random-place";
import { createOrganization } from "../../src/simulation/life";
import { serializeWorld } from "../../src/simulation/serialization";

const seed = "news-institution-purpose:browser";
const place = drawRandomPlace(seed);
const small = smallWorld({ place: place.key, seed });
let world = small.world;
const ids: string[] = [];
for (const [name, classification] of [
  ["Purpose fixture academy", "service:private-school"],
  ["Unknown-purpose fixture", "service:unrecognized-fixture"],
] as const) {
  world = createOrganization(world, {
    stableKey: `news-purpose:${classification}`,
    formedAt: world.currentDate,
    provenance: {
      kind: "authored",
      note: "Controlled institution-purpose browser fixture.",
    },
    initialProfile: {
      name,
      classification,
      locationJurisdictionId: small.jurisdictionId,
    },
  });
  ids.push(world.history.organizations.at(-1)!.id);
}
const outFile = process.argv[2];
if (!outFile) throw new Error("Expected serialized-world output path.");
writeFileSync(outFile, serializeWorld(world));
process.stdout.write(
  JSON.stringify({
    seed,
    place: place.displayName,
    schoolId: ids[0]!,
    omittedId: ids[1]!,
  }),
);

import {
  formatPersonStressHarnessReport,
  runPersonStressHarness,
  type PersonStressHarnessOptions,
} from "../simulation/person-stress-harness";
import { lifePlaceByKey } from "../simulation/life-places";
import type { EntityId, PersonGenerationProfile } from "../simulation/types";

const USAGE =
  "usage: npm run stress:persons -- --place <place key, for example 3260600> [--seeds n] [--per-seed n] [--profile production|stress] [--seed s] [--json]";

function parseArgs(): { options: PersonStressHarnessOptions; json: boolean } {
  const args = process.argv.slice(2);
  let seedCount = 10;
  let peoplePerSeed = 6;
  let profile: PersonGenerationProfile = "production";
  let json = false;
  let jurisdictionId: EntityId | null = null;
  const customSeeds: string[] = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i] as string;
    if (arg === "--seeds" && i + 1 < args.length) {
      seedCount = parseInt(args[i + 1] as string, 10);
      i += 1;
    } else if (arg === "--per-seed" && i + 1 < args.length) {
      peoplePerSeed = parseInt(args[i + 1] as string, 10);
      i += 1;
    } else if (arg === "--profile" && i + 1 < args.length) {
      profile = args[i + 1] === "stress" ? "stress" : "production";
      i += 1;
    } else if (arg === "--place" && i + 1 < args.length) {
      const place = lifePlaceByKey(args[i + 1] as string);
      if (!place) {
        console.error(`No place named '${args[i + 1]}'. ${USAGE}`);
        process.exit(2);
      }
      jurisdictionId = place.context.jurisdiction.id;
      i += 1;
    } else if (arg === "--json") {
      json = true;
    } else if (arg === "--seed" && i + 1 < args.length) {
      customSeeds.push(args[i + 1] as string);
      i += 1;
    }
  }

  if (!jurisdictionId) {
    console.error(`The harness needs a place; it has no default. ${USAGE}`);
    process.exit(2);
  }

  return {
    options: {
      jurisdictionId,
      seeds: customSeeds.length > 0 ? customSeeds : undefined,
      seedCount,
      peoplePerSeed,
      profile,
    },
    json,
  };
}

const { options, json } = parseArgs();
const result = runPersonStressHarness(options);

if (json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(formatPersonStressHarnessReport(result, true));
}

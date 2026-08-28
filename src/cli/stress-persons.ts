import {
  formatPersonStressHarnessReport,
  runPersonStressHarness,
  type PersonStressHarnessOptions,
} from "../simulation/person-stress-harness";
import type { PersonGenerationProfile } from "../simulation/types";

function parseArgs(): { options: PersonStressHarnessOptions; json: boolean } {
  const args = process.argv.slice(2);
  let seedCount = 10;
  let peoplePerSeed = 6;
  let profile: PersonGenerationProfile = "production";
  let json = false;
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
    } else if (arg === "--json") {
      json = true;
    } else if (arg === "--seed" && i + 1 < args.length) {
      customSeeds.push(args[i + 1] as string);
      i += 1;
    }
  }

  return {
    options: {
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

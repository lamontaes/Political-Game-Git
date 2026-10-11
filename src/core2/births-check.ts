/** Aggregate evidence only: never imported by actor rules. */
import { readFileSync, writeFileSync } from "node:fs";
import rates2023 from "../../data/research/renewal/natality-2023.json" with { type: "json" };
import rates2024 from "../../data/research/renewal/natality-2024.json" with { type: "json" };
const args = process.argv.slice(2);
const arg = (name: string) => {
  const index = args.indexOf(name);
  if (index < 0 || !args[index + 1]) throw new Error(`Missing ${name}`);
  return args[index + 1]!;
};
const read = (name: string) => JSON.parse(readFileSync(arg(name), "utf8"));
const place = read("--place"),
  base = read("--base"),
  head = read("--head");
if (
  base.inputSha256 !== head.inputSha256 ||
  head.inputSha256 !== place.inputSha256
)
  throw new Error("Mismatched generated inputs.");
const area = place.state.name;
const rates = [rates2023, rates2024]
  .map(
    (data) =>
      (data.areas as Record<string, { birthsPer1000Residents: number | null }>)[
        area
      ]?.birthsPer1000Residents,
  )
  .filter((rate): rate is number => typeof rate === "number");
const range = rates.length ? [Math.min(...rates), Math.max(...rates)] : null;
const ratio = head.advanceMilliseconds / base.advanceMilliseconds;
const receipt = {
  place: {
    jurisdiction: area,
    key: place.place.key,
    name: place.place.displayName,
  },
  seed: place.seed,
  inputSha256: head.inputSha256,
  baseMilliseconds: base.advanceMilliseconds,
  headMilliseconds: head.advanceMilliseconds,
  addedYearPercent: (ratio - 1) * 100,
  speedWithin5Percent: ratio <= 1.05,
  births: head.births.length,
  openingResidents: head.residents,
  birthsPer1000Residents: head.birthsPer1000OpeningResidents,
  observationYears: [2023, 2024],
  observedCrudeRange: range,
  birthsInObservedRange: range
    ? head.birthsPer1000OpeningResidents >= range[0]! &&
      head.birthsPer1000OpeningResidents <= range[1]!
    : null,
  ageProfileBefore: head.ageProfileBefore,
  ageProfileAfter: head.ageProfileAfter,
  ageProfileReferenceCheck:
    "Not assessed: real one-year changes not retrieved; Part 2 movers are deferred. No test bound changed.",
  birthsTrace: head.births.map((birth: { pregnancyId: string }) => {
    const pregnancy = head.pregnancies.find(
      (row: { id: string }) => row.id === birth.pregnancyId,
    );
    const plan = head.plans.find(
      (row: { id: string }) => row.id === pregnancy.planId,
    );
    return { birth, pregnancy, plan };
  }),
  acceptance:
    "Builder evidence; fresh Sonnet/high finisher bench required. M1-09 remains pending.",
};
writeFileSync(arg("--output"), JSON.stringify(receipt, null, 2) + "\n");
console.log(
  JSON.stringify({
    births: receipt.births,
    rate: receipt.birthsPer1000Residents,
    range,
    birthsInObservedRange: receipt.birthsInObservedRange,
    addedYearPercent: receipt.addedYearPercent,
  }),
);

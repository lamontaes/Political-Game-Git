/** Aggregate evidence only: never imported by actor rules. */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { ageOnDate } from "./kernel/dates";
import areaNames from "../../data/research/renewal/area-names.json" with { type: "json" };
import policies from "../../scripts/core2-guard/policies.json" with { type: "json" };
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
  baseRuns = read("--base"),
  headRuns = read("--head");
if (
  !Array.isArray(baseRuns) ||
  !Array.isArray(headRuns) ||
  baseRuns.length !== 3 ||
  headRuns.length !== 3
)
  throw new Error(
    "Require three independent year runs for each clean revision.",
  );
const inputBytes = readFileSync(arg("--input"), "utf8");
if (createHash("sha256").update(inputBytes).digest("hex") !== place.inputSha256)
  throw new Error("Input differs from the retained random-place draw.");
const input = JSON.parse(inputBytes);
const base = baseRuns[0],
  head = headRuns[0];
for (const group of [baseRuns, headRuns]) {
  if (group.some((row) => row.sourceRevision !== group[0].sourceRevision))
    throw new Error("Revision changed within measured group.");
}
for (const row of [...baseRuns, ...headRuns]) {
  if (
    row.inputSha256 !== place.inputSha256 ||
    row.result.simulatedDays !== 365 ||
    JSON.stringify(row.host) !== JSON.stringify(base.host) ||
    !Number.isFinite(row.advanceMilliseconds) ||
    row.advanceMilliseconds <= 0
  )
    throw new Error("Incomparable generated year runs.");
}
if (
  headRuns.some(
    (row) => JSON.stringify(row.births) !== JSON.stringify(head.births),
  )
)
  throw new Error("Birth outcomes changed across identical inputs.");
const median = (values: number[]) => [...values].sort((a, b) => a - b)[1]!;
const baseMilliseconds = median(baseRuns.map((row) => row.advanceMilliseconds));
const headMilliseconds = median(headRuns.map((row) => row.advanceMilliseconds));
if (
  !head.host.execArgv?.includes(`--max-old-space-size=${policies.nodeHeapMiB}`)
)
  throw new Error(
    "Year measurements must use the published guard heap policy.",
  );
const aliases = areaNames.aliases as Record<string, string>;
const area = aliases[place.state.jurisdictionKey] ?? place.state.name;
const midyearDate = `${input.startedAt.slice(0, 4)}-07-01`;
const openingResidents = input.people.filter(
  (person: { tier: string }) => person.tier !== "husk",
);
// This receipt covers births only: health and migration producers are parked.
const midyearResidents =
  openingResidents.length +
  head.births.filter((birth: { date: string }) => birth.date <= midyearDate)
    .length;
const crudeRate = (head.births.length * 1000) / midyearResidents;
const maternalBands = Object.keys(rates2024.areas["United States"].ageRates);
const bands = maternalBands.map((band) => {
  const [low, high] = band.split("-").map(Number);
  const denominator = openingResidents.filter(
    (person: { looks?: { gender?: string }; birthDate: string }) => {
      const age = ageOnDate(person.birthDate, midyearDate);
      return person.looks?.gender === "female" && age >= low! && age <= high!;
    },
  ).length;
  const births = head.births.filter(
    (birth: { motherId: string; date: string }) => {
      const mother = input.people.find(
        (person: { id: string }) => person.id === birth.motherId,
      );
      if (!mother) throw new Error("Missing recorded mother.");
      const age = ageOnDate(mother.birthDate, birth.date);
      return age >= low! && (band === maternalBands.at(-1) || age <= high!);
    },
  ).length;
  return {
    band,
    births,
    midyearFemales: denominator,
    simulatedRate: denominator ? (births * 1000) / denominator : null,
    sourcedRates: [rates2023, rates2024].map((data) => ({
      year: data.year,
      rate:
        (
          data.areas as Record<
            string,
            { ageRates: Record<string, number | null> }
          >
        )[area]?.ageRates[band] ?? null,
    })),
  };
});
const rates = [rates2023, rates2024]
  .map(
    (data) =>
      (data.areas as Record<string, { birthsPer1000Residents: number | null }>)[
        area
      ]?.birthsPer1000Residents,
  )
  .filter((rate): rate is number => typeof rate === "number");
const range = rates.length ? [Math.min(...rates), Math.max(...rates)] : null;
const ratio = headMilliseconds / baseMilliseconds;
const receipt = {
  place: {
    jurisdiction: area,
    key: place.place.key,
    name: place.place.displayName,
  },
  seed: place.seed,
  inputSha256: head.inputSha256,
  baseRevision: base.sourceRevision,
  headRevision: head.sourceRevision,
  host: head.host,
  timing: {
    method:
      "median of three independent full-year processes per clean named revision, unchanged baseline cohort reused against the final head cohort, one process at a time on the same machine; one unmeasured warmup per revision; guard heap policy",
    baseMilliseconds: baseRuns.map((row) => row.advanceMilliseconds),
    headMilliseconds: headRuns.map((row) => row.advanceMilliseconds),
  },
  baseMilliseconds,
  headMilliseconds,
  addedYearPercent: (ratio - 1) * 100,
  speedWithin5Percent: ratio <= 1.05,
  guardWithin20Percent: ratio <= policies.maximumRatio,
  peakRssMiB: {
    base: Math.max(...baseRuns.map((row) => row.peakRssMiB)),
    head: Math.max(...headRuns.map((row) => row.peakRssMiB)),
  },
  births: head.births.length,
  openingResidents: head.residents,
  midyearDate,
  midyearResidents,
  denominatorScope:
    "Opening non-husk residents plus births by July 1; births-only run, no health or migration producers.",
  birthsPer1000Residents: crudeRate,
  maternalAgeComparison: bands,
  maternalAgeAssessment:
    "Descriptive sourced comparison; nine events do not establish a sampling interval or an age-specific pass. No acceptance bound was invented.",
  observationYears: [2023, 2024],
  observedCrudeRange: range,
  birthsInObservedRange: range
    ? crudeRate >= range[0]! && crudeRate <= range[1]!
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

import { drawRandomPlace } from "../../tests/support/random-place";
import { runAgingBenchmark } from "../dev-lab/world-aging";

function option(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : (process.argv[index + 1] ?? fallback);
}

const seed = option("seed", `speed-year-${Date.now()}`);
const place = drawRandomPlace(seed);
const maxSeconds = Number(option("max-seconds", "120"));
if (!Number.isFinite(maxSeconds) || maxSeconds <= 0) {
  throw new Error("--max-seconds must be a positive number");
}

const profile = await runAgingBenchmark({
  seed,
  placeKey: place.key,
  years: 1,
  daysPerYear: 30,
  maxMinutes: 10,
  profileYears: [1],
  profileDayLimit: 30,
});
const profiledDays = profile.years[0]?.days ?? 0;
if (profiledDays !== 30 || profile.stoppedEarly) {
  console.error(
    `The cost profile completed ${profiledDays}/30 days. ${profile.stoppedEarly ?? ""}`,
  );
  process.exitCode = 1;
}

const result = await runAgingBenchmark({
  seed,
  placeKey: place.key,
  years: 1,
  daysPerYear: 365,
  maxMinutes: maxSeconds / 60,
  profileYears: [],
});
const year = result.years[0];
if (year) {
  console.log(
    `place=${place.displayName} (${place.key}) seed=${seed} days=${year.days}/365 seconds=${year.yearSeconds} seconds/day=${(year.yearSeconds / year.days).toFixed(3)}`,
  );
}
if (result.stoppedEarly) console.error(result.stoppedEarly);
console.log(
  `profile_days=${profiledDays} place=${place.displayName} (${place.key}) seed=${seed}`,
);
for (const [index, cost] of (profile.profiles?.lastYearTop ?? [])
  .slice(0, 10)
  .entries()) {
  console.log(
    `${index + 1}. ${cost.key}: ${cost.selfMs.toFixed(3)} ms/day self, ${cost.totalMs.toFixed(3)} ms/day inclusive`,
  );
}
if (
  !year ||
  result.stoppedEarly ||
  year.days !== 365 ||
  year.yearSeconds >= maxSeconds
) {
  console.error(`The year did not complete within ${maxSeconds} seconds.`);
  process.exitCode = 1;
}

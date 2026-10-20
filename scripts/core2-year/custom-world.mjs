/* global process, console */
// M6-04's world-generation check: the same drawn place built from real data
// and from a customized world. Every setting must show in the generated world,
// and the custom world must then run by the same rules (every dollar balances).
// Usage: CORE2_BOOKKEEPING=0 node --import tsx scripts/core2-year/custom-world.mjs [--seed S]
// Under the golden-path runner it takes GOLDEN_PATH_SEED and GOLDEN_PATH_PLACE_KEY,
// and exits 1 when any check fails.
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const args = process.argv.slice(2);
const value = (name, fallback) =>
  args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const at = (path) => import(pathToFileURL(resolve(process.cwd(), path)).href);
const { generatedOpening } = await at("src/core2/tooling/generated-world.ts");
const { drawPlace } = await at("scripts/core2-year/place.ts");
const { createLifeCore, advanceCore } = await at("src/core2/life.ts");
const { lifePlaceByKey } = await at("src/simulation/life-places.ts");
const { customPolitics } = await at("src/core2/electorate.ts");
const { addDays, makeIsoDate } = await at("src/core2/kernel/dates.ts");
const seed = value(
  "--seed",
  process.env.GOLDEN_PATH_SEED ??
    (await import("node:crypto")).randomBytes(16).toString("hex"),
);
const givenKey = process.env.GOLDEN_PATH_PLACE_KEY;
const place = givenKey
  ? {
      seed,
      key: givenKey,
      name: lifePlaceByKey(givenKey)?.formalName ?? givenKey,
      state: lifePlaceByKey(givenKey)?.stateJurisdictionKey ?? "",
    }
  : drawPlace(seed, "core2-custom-world");

const settings = {
  economy: { outsideDemand: 0.5, householdCash: 2, wages: 1.5 },
  politics: { leanShift: 0.2, turnout: 0.8, partyStrength: { green: 2 } },
};
const real = generatedOpening(place, { twoLevel: true });
const custom = generatedOpening(place, { twoLevel: true, settings });
// Population changes who is generated, so it gets its own world.
const population = 3000;
const sized = generatedOpening(place, {
  twoLevel: true,
  settings: { population },
});

const sum = (rows, f) => rows.reduce((n, row) => n + f(row), 0);
const wages = (input) =>
  sum(input.jobs, (row) => row.wageDailyMinor) +
  sum(input.residents.households, (home) =>
    sum(home.jobs, (row) => row.wageDailyMinor),
  );
const outsideSales = (input) =>
  sum(
    input.residents.flows.filter((row) => row.kind === "outside-sales"),
    (row) => row.amountMinor,
  );
const people = (input) =>
  input.people.length +
  sum(input.residents.households, (home) => home.people.length);
const near = (ratio, target, tolerance) =>
  Math.abs(ratio - target) <= tolerance * target;

const recorded = JSON.parse(custom.placeMetadata?.worldSettings ?? "{}");
const checks = [];
const check = (name, pass, detail) => checks.push({ name, pass, detail });

check(
  "settings recorded on the world",
  JSON.stringify(recorded) === JSON.stringify(settings) &&
    custom.gaps.some((row) => row.startsWith("Custom world")),
  "placeMetadata.worldSettings and a custom-world gap",
);
check(
  "population at least the setting",
  people(sized) >= population,
  `${people(sized)} people for a setting of ${population} (real data: ${people(real)})`,
);
// The same seed generates the same jobs, so pay scales by the setting.
const wageRatio = wages(custom) / wages(real);
check(
  "wages",
  near(wageRatio, settings.economy.wages, 0.01),
  `pay ×${wageRatio.toFixed(3)}`,
);
const cashRatio =
  sum(custom.people, (row) => row.liquidMinor) /
  Math.max(
    1,
    sum(real.people, (row) => row.liquidMinor),
  );
check(
  "household cash",
  near(cashRatio, settings.economy.householdCash, 0.05),
  `full households' cash ×${cashRatio.toFixed(3)}`,
);
const outsideRatio = outsideSales(custom) / Math.max(1, outsideSales(real));
check(
  "outside demand",
  outsideSales(real) === 0 || outsideRatio < 1,
  `outside buyers' purchases ×${outsideRatio.toFixed(3)}`,
);
// The electorate reads the politics settings: the town's lean shifts and the
// cost of voting scales (src/core2/electorate.ts customPolitics).
const politics = customPolitics({ placeMetadata: custom.placeMetadata ?? {} });
const realPolitics = customPolitics({
  placeMetadata: real.placeMetadata ?? {},
});
check(
  "lean shift",
  politics.leanShift === settings.politics.leanShift &&
    realPolitics.leanShift === 0,
  `the town's lean shifted by ${politics.leanShift}`,
);
check(
  "turnout",
  politics.turnout === settings.politics.turnout && realPolitics.turnout === 1,
  `the cost of voting divided by ${politics.turnout}`,
);
// The custom world then runs by the same rules.
const core = createLifeCore(custom);
const cash = () =>
  sum([...core.people.values()], (row) => row.liquidMinor) +
  sum([...core.organizations.values()], (row) => row.liquidMinor) +
  sum(
    [...core.cashJournal.externalFlowsByOwner.values()],
    (row) => row.netMinor,
  );
const before = cash();
// A month on from wherever the world opens (it opens on the one start date).
advanceCore(core, addDays(makeIsoDate(core.date), 31));
check(
  "every dollar balances for a month",
  cash() === before,
  "cash + outside net",
);

console.log(
  JSON.stringify(
    { place: `${place.name}, ${place.state}`, seed, checks },
    null,
    1,
  ),
);
const failed = checks.filter((row) => !row.pass);
if (failed.length) {
  console.error(
    `M6-04 world generation failed: ${failed.map((row) => row.name).join(", ")}`,
  );
  process.exit(1);
}

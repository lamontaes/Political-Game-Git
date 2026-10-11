/**
 * P15 part 5 turnover receipt: builds an ordinary generated town, runs it for
 * years, and reports how much of each adult's circle is still in it at the
 * end, against Mollenhorst, Volker and Flap (2014): after seven years, 48% of
 * discussion partners and practical helpers were still in the network.
 *
 * A circle is a person's K closest ties today. The study does not fix K, so
 * the receipt reports several sizes.
 *
 *   npx tsx src/core2/tooling/p15-turnover-receipt.ts --seed <seed> \
 *     [--minimum <people>] [--years <n>] [--out <file>]
 */
import { writeFileSync } from "node:fs";
import { addDays, ageOnDate, makeIsoDate } from "../../simulation/dates";
import { enrichCivicInputs } from "../civic-inputs";
import { currentCloseness } from "../closeness";
import { buildDeepPast } from "../deep-past";
import { ENCOUNTERS } from "../encounters";
import { advanceCore, createLifeCore } from "../life";
import { OPENING_KIN } from "../opening-kin";
import { buildPopulation } from "../population";
import type { CoreState } from "../types";
import research from "../../../data/research/people/contact-frequency-by-tie.json" with { type: "json" };

const ADULT_AGE = 18;
const SIZES = [3, 5, 10];

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

/** Each person's ties, closest first, as of today. */
function circles(core: CoreState, ids: readonly string[], size: number) {
  const out = new Map<string, string[]>();
  for (const id of ids) {
    const ranked = [...(core.relationshipsByPerson.get(id) ?? [])]
      .map((rowId) => core.relationships.get(rowId)!)
      .map((row) => ({
        other: row.actorId === id ? row.otherId : row.actorId,
        level: currentCloseness(core, row),
      }))
      .sort((a, b) => b.level - a.level || a.other.localeCompare(b.other));
    out.set(
      id,
      ranked.slice(0, size).map((row) => row.other),
    );
  }
  return out;
}

if (process.argv[1]?.endsWith("p15-turnover-receipt.ts")) {
  const seed = argument("seed");
  if (!seed) throw new Error("--seed is required.");
  const minimum = argument("minimum");
  const years = Number(argument("years") ?? "7");
  const clock = () => performance.now() / 1000;
  const began = clock();
  const input = buildPopulation({
    seed,
    startedAt: "2021-01-01",
    ...(minimum ? { minimumPeople: Number(minimum) } : {}),
  });
  const core = createLifeCore(enrichCivicInputs(buildDeepPast(input)));
  const startedOn = core.date;
  const adults = [...core.people.values()]
    .filter(
      (person) =>
        person.tier !== OPENING_KIN.kinTier &&
        ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(core.date)) >=
          ADULT_AGE,
    )
    .map((person) => person.id);
  const before = new Map(
    SIZES.map((size) => [size, circles(core, adults, size)]),
  );
  const created = clock();
  const yearly: { year: number; seconds: number }[] = [];
  for (let year = 1; year <= years; year += 1) {
    const at = clock();
    advanceCore(
      core,
      addDays(makeIsoDate(startedOn), Math.round(year * 365.2425)),
    );
    yearly.push({ year, seconds: Number((clock() - at).toFixed(1)) });
  }
  const survivors = adults.filter((id) => core.people.get(id)?.alive);
  const after = new Map(
    SIZES.map((size) => [size, circles(core, survivors, size)]),
  );
  const retention = Object.fromEntries(
    SIZES.map((size) => {
      let kept = 0,
        total = 0,
        kinTotal = 0,
        kinKept = 0;
      for (const id of survivors) {
        const start = before.get(size)!.get(id)!;
        const end = new Set(after.get(size)!.get(id)!);
        const person = core.people.get(id)!;
        for (const other of start) {
          const family = person.familyIds.has(other);
          total += 1;
          if (family) kinTotal += 1;
          if (end.has(other)) {
            kept += 1;
            if (family) kinKept += 1;
          }
        }
      }
      return [
        `closest${size}`,
        {
          members: total,
          stillInCircle: Number((kept / Math.max(total, 1)).toFixed(3)),
          kinShareOfMembers: Number((kinTotal / Math.max(total, 1)).toFixed(3)),
          kinStillInCircle: Number(
            (kinKept / Math.max(kinTotal, 1)).toFixed(3),
          ),
          othersStillInCircle: Number(
            ((kept - kinKept) / Math.max(total - kinTotal, 1)).toFixed(3),
          ),
        },
      ];
    }),
  );
  let met = 0;
  for (const id of survivors)
    for (const fact of core.people.get(id)!.pastFacts ?? [])
      if (fact.kind.startsWith(ENCOUNTERS.factKindPrefix)) met += 1;
  const receipt = {
    seed,
    place: input.placeMetadata?.placeName,
    startedAt: startedOn,
    endedAt: core.date,
    years,
    adultsAtStart: adults.length,
    adultsAlive: survivors.length,
    newPeopleMetPerSurvivingAdult: Number(
      (met / Math.max(survivors.length, 1)).toFixed(2),
    ),
    retention,
    answerKey: research.sources.find(
      (row) => row.id === "mollenhorst-network-turnover",
    ),
    seconds: {
      createWithDeepPast: Number((created - began).toFixed(1)),
      yearly,
    },
  };
  const text = `${JSON.stringify(receipt, null, 2)}\n`;
  const out = argument("out");
  if (out) writeFileSync(out, text);
  else process.stdout.write(text);
}

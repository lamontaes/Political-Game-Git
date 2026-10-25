/**
 * How much the people of a played town do for their causes, year by year,
 * against how often real people do it (people-cause-holder-activity-calibrated).
 * For each act a person with a cause can take, the share of the town's full
 * adults who took it at least once in the year and how many times each did,
 * beside the band the Civic Engagement and Volunteering Supplement gives for the
 * matching measure (the range of its four survey years), and each volunteer's
 * hours against the hours real volunteers give. The bands check the town's
 * totals; nothing reads them to decide who acts.
 * Run: node --max-old-space-size=8192 --import tsx scripts/research/cause-activity-year.ts [seed] [placeKey] [years]
 */
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { drawPlace } from "../core2-year/place";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { registerModule } from "../../src/core2/state";
import { corePlaceByKey } from "../../src/core2/place-lookup";
import parametersJson from "../../src/core2/data/parameters.json" with { type: "json" };
import cev from "../../data/research/people/cev-2017-2023-national-rates.json" with { type: "json" };
import hours from "../../data/research/people/census-2024-cev-volunteer-hours.json" with { type: "json" };

type Measure = keyof (typeof cev.rates)["2023"];
const years = Object.keys(cev.rates) as (keyof typeof cev.rates)[];
const band = (measure: Measure) => {
  const values = years
    .map((year) => cev.rates[year][measure])
    .filter((v): v is number => typeof v === "number");
  return { low: Math.min(...values), high: Math.max(...values) };
};
const pct = (x: number) => `${(100 * x).toFixed(1)}%`;

/** Each act a cause holder takes, and the survey measure its share is checked against. */
const ACTS: readonly { kind: string; act: string; measure: Measure }[] = [
  {
    kind: "cause.volunteered",
    act: "volunteered for a cause",
    measure: "formalVolunteering",
  },
  {
    kind: "cause.donated",
    act: "donated to a cause",
    measure: "donatingToAPoliticalCause",
  },
  {
    kind: "office.approached",
    act: "approached an office",
    measure: "contactingPublicOfficials",
  },
  {
    kind: "initiative.organizing-started",
    act: "organized a meeting",
    measure: "attendingPublicMeetings",
  },
  {
    kind: "cause-group.joined",
    act: "joined a cause group",
    measure: "organizationalMembership",
  },
  {
    kind: "cause.shared",
    act: "shared a cause",
    measure: "discussingIssuesWithFriendsAndFamily",
  },
];

const seedArg = process.argv[2] ?? randomBytes(8).toString("hex");
const place = process.argv[3]
  ? {
      key: process.argv[3],
      seed: seedArg,
      name: corePlaceByKey(process.argv[3])?.displayName ?? process.argv[3],
    }
  : drawPlace(seedArg, "cause-activity");
const playYears = Number(process.argv[4] ?? 3);
const volunteerHours = (
  parametersJson as unknown as Record<string, { value: number }>
).volunteerHours!.value;

setBookkeeping(false);
const { core } = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
console.log(
  `${place.name} (${place.key}), seed ${place.seed}: ${playYears} played years. Bands: CEV national rates ${years.join(", ")}; hours per volunteer, median ${hours.hoursPerVolunteer["2023"].median} to ${hours.hoursPerVolunteer["2017"].median}, mean ${hours.hoursPerVolunteer["2023"].mean} to ${hours.hoursPerVolunteer["2017"].mean}.`,
);
let acts = new Map<string, Map<string, number>>();
let firstIds = new Map<string, string>();
registerModule(core, {
  id: "research:cause-activity",
  eventKinds: ACTS.map((row) => row.kind),
  onEvent: (_api, event) => {
    const who = event.personIds?.[0];
    if (!who) return;
    const byPerson = acts.get(event.kind) ?? new Map<string, number>();
    byPerson.set(who, (byPerson.get(who) ?? 0) + 1);
    acts.set(event.kind, byPerson);
    if (!firstIds.has(event.kind)) firstIds.set(event.kind, event.id);
  },
});
for (let year = 1; year <= playYears; year += 1) {
  acts = new Map();
  firstIds = new Map();
  advanceCore(core, addDays(makeIsoDate(core.date), 365));
  const thisYear = Number(core.date.slice(0, 4));
  const adults = [...core.people.values()].filter(
    (p) =>
      p.alive &&
      p.tier !== "husk" &&
      thisYear - Number(p.birthDate.slice(0, 4)) >= 18,
  ).length;
  const members = new Set(
    [...core.memberships.keys()].map((key) => key.split(":")[0]),
  ).size;
  console.log(
    `Year ${year} (to ${core.date}), ${adults} full adults; ${members} belong to a group (${pct(members / adults)}), ${core.memberships.size} memberships.`,
  );
  for (const row of ACTS) {
    const byPerson = acts.get(row.kind) ?? new Map<string, number>();
    const people = byPerson.size;
    const total = [...byPerson.values()].reduce((n, v) => n + v, 0);
    const { low, high } = band(row.measure);
    const share = adults ? people / adults : 0;
    const where = share < low ? "below" : share > high ? "above" : "inside";
    console.log(
      `  ${row.act}: ${people} people (${pct(share)}, ${where} ${row.measure} ${pct(low)} to ${pct(high)}), ${total} times, ${people ? (total / people).toFixed(1) : "0"} each; first record ${firstIds.get(row.kind) ?? "none"}`,
    );
  }
  const volunteers = [...(acts.get("cause.volunteered") ?? new Map()).values()]
    .map((n) => n * volunteerHours)
    .sort((a, b) => a - b);
  if (volunteers.length) {
    const median = volunteers[Math.floor(volunteers.length / 2)]!;
    const mean = volunteers.reduce((n, v) => n + v, 0) / volunteers.length;
    console.log(
      `  hours per volunteer (volunteerHours ${volunteerHours} a session): median ${median.toFixed(0)}, mean ${mean.toFixed(0)}`,
    );
  }
}

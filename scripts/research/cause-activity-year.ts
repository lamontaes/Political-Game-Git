/**
 * How much the people of a played town do for their causes, year by year,
 * beside how often real people do the nearest thing the Civic Engagement and
 * Volunteering Supplement measures (people-cause-holder-activity-calibrated).
 * For each act a person with a cause can take, the share of the town's full
 * people aged 16 and over on the year's last day (the survey's universe) who
 * took it at least once in the year and how many times each did, beside the
 * survey's range over its four years for its nearest measure, and each
 * volunteer's hours beside the hours real volunteers give. Each act and its
 * measure count different things, and each line says how; the town's full
 * people are the player's circle and the people around them, not a sample of
 * the town. So each line is a diagnostic proxy, not a calibration: it draws no
 * conclusion about the town in either direction. Nothing reads these numbers
 * to decide who acts.
 * Run: node --max-old-space-size=8192 --import tsx scripts/research/cause-activity-year.ts [seed] [placeKey] [years]
 */
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { drawPlace } from "../core2-year/place";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { resolve } from "node:path";
import { addDays, ageOnDate, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { registerModule } from "../../src/core2/state";
import { corePlaceByKey } from "../../src/core2/place-lookup";
import type { PersonState } from "../../src/core2/types";
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

/** Each act a cause holder takes, the survey measure nearest it, and how the two differ. */
const ACTS: readonly {
  kind: string;
  act: string;
  measure: Measure;
  differs: string;
}[] = [
  {
    kind: "cause.volunteered",
    act: "volunteered for a cause",
    measure: "formalVolunteering",
    differs:
      "the survey counts volunteering through any organization, religious, school and civic included",
  },
  {
    kind: "cause.donated",
    act: "donated to a cause",
    measure: "donatingToAPoliticalCause",
    differs:
      "the survey counts money to a political party, candidate or cause; the game's causes include civic ones",
  },
  {
    kind: "office.approached",
    act: "approached an office",
    measure: "contactingPublicOfficials",
    differs:
      "the survey counts any contact with a public official, about anything",
  },
  {
    kind: "initiative.organizing-started",
    act: "organized a meeting",
    measure: "attendingPublicMeetings",
    differs: "the survey counts attending a public meeting, not organizing one",
  },
  {
    kind: "cause-group.joined",
    act: "joined a cause group this year",
    measure: "organizationalMembership",
    differs:
      "the survey counts belonging to any group at the time asked, not joining one this year; the stock is printed above",
  },
  {
    kind: "cause.shared",
    act: "shared a cause",
    measure: "discussingIssuesWithFriendsAndFamily",
    differs:
      "the survey counts discussing any political or civic issue with friends or family",
  },
];

/** The survey's universe: people aged 16 and over. */
export const SURVEY_AGE = 16;

/**
 * In the survey's universe on the day the year is measured: alive, a full
 * person, and 16 by completed age that day (a birthday later in the year does
 * not count).
 */
export function inSurveyUniverse(
  person: Readonly<Pick<PersonState, "alive" | "tier" | "birthDate">>,
  date: string,
): boolean {
  return (
    person.alive &&
    person.tier !== "husk" &&
    ageOnDate(person.birthDate, date) >= SURVEY_AGE
  );
}

function main(): void {
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
    `${place.name} (${place.key}), seed ${place.seed}: ${playYears} played years. Survey measures (diagnostic proxies; each line says how the act differs): CEV national rates ${years.join(", ")}; hours per formal volunteer through any organization, median ${hours.hoursPerVolunteer["2023"].median} to ${hours.hoursPerVolunteer["2017"].median}, mean ${hours.hoursPerVolunteer["2023"].mean} to ${hours.hoursPerVolunteer["2017"].mean}.`,
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
    // The survey's universe among the town's full people, on the year's last
    // day; the acts below are counted only for people in it.
    const universe = new Set(
      [...core.people.values()]
        .filter((p) => inSurveyUniverse(p, core.date))
        .map((p) => p.id),
    );
    const people16 = universe.size;
    const members = new Set(
      [...core.memberships.values()]
        .map((membership) => membership.personId)
        .filter((id) => universe.has(id)),
    ).size;
    const { low: memberLow, high: memberHigh } = band(
      "organizationalMembership",
    );
    console.log(
      `Year ${year} (to ${core.date}), ${people16} full people aged ${SURVEY_AGE} and over; ${members} belong to a group (${pct(members / people16)}; survey, any group: ${pct(memberLow)} to ${pct(memberHigh)}), ${core.memberships.size} memberships.`,
    );
    for (const row of ACTS) {
      const all = acts.get(row.kind) ?? new Map<string, number>();
      const byPerson = [...all].filter(([id]) => universe.has(id));
      const people = byPerson.length;
      const total = byPerson.reduce((n, [, v]) => n + v, 0);
      const { low, high } = band(row.measure);
      const share = people16 ? people / people16 : 0;
      console.log(
        `  ${row.act}: ${people} people (${pct(share)}), ${total} times, ${people ? (total / people).toFixed(1) : "0"} each; nearest survey measure ${row.measure} ${pct(low)} to ${pct(high)} (${row.differs}); first record ${firstIds.get(row.kind) ?? "none"}`,
      );
    }
    const volunteers = [...(acts.get("cause.volunteered") ?? new Map())]
      .filter(([id]) => universe.has(id))
      .map(([, n]) => n * volunteerHours)
      .sort((a, b) => a - b);
    if (volunteers.length) {
      const median = volunteers[Math.floor(volunteers.length / 2)]!;
      const mean = volunteers.reduce((n, v) => n + v, 0) / volunteers.length;
      console.log(
        `  hours per cause volunteer (volunteerHours ${volunteerHours} a session): median ${median.toFixed(0)}, mean ${mean.toFixed(0)}; survey, any organization, over a quarter of people: median ${hours.hoursPerVolunteer["2023"].median} to ${hours.hoursPerVolunteer["2017"].median}`,
      );
    }
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(import.meta.filename)
)
  main();

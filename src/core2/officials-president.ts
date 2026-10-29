/**
 * The President's own record at the opening (officials generation): the home
 * state, the office held before, the 2024 election won and the states the
 * campaign reached, each a past fact with its source. The opening's address
 * may name a place only from these facts, and the opening's screens read the
 * home state and the office before. No campaign runs: who the President is
 * was drawn once from the world's seed, and which states were contested is
 * the real 2024 map.
 */
import calibration from "../../data/source/electoral-calibration-2024/corpus.json" with { type: "json" };
import { coreStateName } from "./place-lookup";
import officialsData from "./data/officials/officials.json" with { type: "json" };
import { uniform } from "./officials-roster";
import { partySide } from "./appointments";
import type { CoreState, PersonInput, Source } from "./types";
import { worldSwing } from "./modules/elections";

type PastFact = NonNullable<PersonInput["pastFacts"]>[number];

interface PresidentData {
  electionDay: { value: string };
  campaignFrom: { value: string };
  contestedMargin: { value: number };
  priorOffice: {
    source: string;
    shares: Record<string, { value: number; title: string | null }>;
  };
}
// Read from the officials file itself, not the roster's copy: the roster is
// still loading when the elections module reaches this file through it.
const DATA = (officialsData as unknown as { president: PresidentData })
  .president;

const MAP = (
  calibration as unknown as {
    presidentialByState: {
      stateUsps: string;
      democraticTwoPartyShare: number | null;
    }[];
  }
).presidentialByState
  .filter((row) => row.democraticTwoPartyShare !== null)
  .map((row) => ({
    usps: row.stateUsps,
    share: row.democraticTwoPartyShare!,
  }))
  .sort((a, b) => a.usps.localeCompare(b.usps));

/** This world's 2024 map: each state's Democratic two-party share, moved by the world's swing. */
function worldMap(seed: string): readonly { usps: string; share: number }[] {
  return MAP.map((row) => ({
    usps: row.usps,
    share: Math.max(0, Math.min(1, row.share - worldSwing(seed, row.usps))),
  }));
}

const MAP_SOURCE =
  "Clerk of the U.S. House, Statistics of the Presidential and Congressional Election of November 5, 2024 (data/source/electoral-calibration-2024).";

/** Past-fact kinds the President's record uses. */
export const PRESIDENT_FACT = {
  homeState: "identity:home-state",
  priorOffice: "career:prior-office",
  elected: "campaign:elected",
  visit: "campaign:visit",
} as const;

/** The states contested on the 2024 map: a two-party share near even. */
export function contestedStates2024(seed: string): readonly {
  usps: string;
  democraticTwoPartyShare: number;
}[] {
  const margin = DATA.contestedMargin.value;
  return worldMap(seed)
    .filter((row) => Math.abs(row.share - 0.5) < margin)
    .map((row) => ({
      usps: row.usps,
      democraticTwoPartyShare: row.share,
    }));
}

function dayBetween(from: string, to: string, u: number): string {
  const start = Date.parse(`${from}T00:00:00Z`);
  const days = Math.floor((Date.parse(`${to}T00:00:00Z`) - start) / 86_400_000);
  return new Date(start + Math.floor(u * days) * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/**
 * The state a national official calls home: one their party carried in 2024,
 * drawn once from the world's seed. `who` is the office ("president" for the
 * President), so every national official is filled in at home by one rule.
 */
export function nationalHomeState(
  seed: string,
  who: string,
  party: string | null,
): { usps: string; share: number } {
  const side = partySide(party);
  const map = worldMap(seed);
  const carried = map.filter((row) =>
    side > 0 ? row.share < 0.5 : side < 0 ? row.share > 0.5 : true,
  );
  return (
    carried[Math.floor(uniform(`${seed}:${who}:home`) * carried.length)] ??
    map[0]!
  );
}

/**
 * The President's past facts. `townState` is the played town's state key
 * (`US-XX`); it is visited only when the map says it was contested.
 */
export function presidentRecord(input: {
  seed: string;
  personId: string;
  party: string | null;
  townState: string;
  date: string;
}): PastFact[] {
  const at = (what: string) => `${input.seed}:president:${what}`;
  const source = (citation: string): Source => ({
    tag: "ESTIMATED",
    citation,
    asOf: input.date,
    estimatedFrom: "src/core2/data/officials/officials.json#president",
  });
  // A home state the President's party carried in 2024.
  const home = nationalHomeState(input.seed, "president", input.party);
  const homeKey = `US-${home.usps}`;
  const facts: PastFact[] = [
    {
      id: `${input.personId}:home-state`,
      date: input.date,
      kind: PRESIDENT_FACT.homeState,
      summary: homeKey,
      source: source(
        `A state the President's party carried in 2024 (${MAP_SOURCE}), drawn once from the world's seed.`,
      ),
      facts: {
        stateKey: homeKey,
        stateName: coreStateName(home.usps) ?? home.usps,
      },
    },
  ];
  // The office before, in the shares Presidents held them.
  const shares = Object.entries(DATA.priorOffice.shares).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );
  const total = shares.reduce((sum, [, row]) => sum + row.value, 0);
  let pick = uniform(at("prior-office")) * total;
  const [office, row] =
    shares.find(([, entry]) => (pick -= entry.value) < 0) ?? shares.at(-1)!;
  if (row.title)
    facts.push({
      id: `${input.personId}:prior-office`,
      date: input.date,
      kind: PRESIDENT_FACT.priorOffice,
      summary: office,
      source: source(DATA.priorOffice.source),
      facts: {
        office,
        title: row.title,
        ...(office === "governor" || office === "us-senate"
          ? { stateKey: homeKey }
          : {}),
      },
    });
  facts.push({
    id: `${input.personId}:elected-2024`,
    date: DATA.electionDay.value,
    kind: PRESIDENT_FACT.elected,
    summary: "president",
    source: { tag: "SOURCED", citation: MAP_SOURCE, asOf: input.date },
    facts: { office: "president", year: DATA.electionDay.value.slice(0, 4) },
  });
  // Every contested state, and the home state.
  const contested = contestedStates2024(input.seed);
  const visited = new Map(
    contested.map((row) => [`US-${row.usps}`, row.democraticTwoPartyShare]),
  );
  if (homeKey !== input.townState || visited.has(homeKey))
    visited.set(homeKey, home.share);
  for (const [stateKey, share] of [...visited].sort((a, b) =>
    a[0].localeCompare(b[0]),
  ))
    facts.push({
      id: `${input.personId}:visit:${stateKey}`,
      date: dayBetween(
        DATA.campaignFrom.value,
        DATA.electionDay.value,
        uniform(`visit:${stateKey}:${input.seed}`),
      ),
      kind: PRESIDENT_FACT.visit,
      summary: stateKey,
      source: {
        tag: "ESTIMATED",
        citation: `${MAP_SOURCE} A contested state (two-party share within ${DATA.contestedMargin.value} of even) or the home state; the day is drawn once from the world's seed.`,
        asOf: input.date,
        estimatedFrom: "src/core2/data/officials/officials.json#president",
      },
      facts: {
        stateKey,
        stateName: coreStateName(stateKey.slice(3)) ?? stateKey,
        democraticTwoPartyShare: String(share),
        contested: String(
          contested.some((row) => `US-${row.usps}` === stateKey),
        ),
      },
    });
  return facts;
}

/** Give the seated President their record, once. */
export function recordPresident(
  core: CoreState,
  input: Parameters<typeof presidentRecord>[0],
): void {
  const person = core.people.get(input.personId);
  if (!person) return;
  const have = new Set((person.pastFacts ?? []).map((fact) => fact.id));
  const added = presidentRecord(input).filter((fact) => !have.has(fact.id));
  if (added.length)
    (person as { pastFacts?: readonly PastFact[] }).pastFacts = [
      ...(person.pastFacts ?? []),
      ...added,
    ];
}

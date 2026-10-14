/**
 * Voter groups for the counted population (two-level population). Each
 * place's counted adults, by CPS age band, become one group: its size is the
 * count, its turnout the state's November 2024 CPS citizen turnout for that
 * age band, and its starting lean the state's 2024 presidential two-party
 * margin (positive = more Republican, PEOPLE's conservative-positive scale).
 * Views and elections refine lean and turnout from residents' own records.
 */
import cps from "../../data/source/census-voting-registration/corpus.json" with { type: "json" };
import PLACE_CITIZENSHIP from "./data/place-citizenship-2024.json" with { type: "json" };
import { parameter } from "./parameters";
import COUNTY_PRESIDENTIAL from "./data/county-presidential-2024.json" with { type: "json" };
import { ELECTORAL_CALIBRATION } from "../simulation/world-setup/political-start";
import { corePlaceByKey, corePlaceStateIdentities } from "./place-lookup";
import type { VoterGroup } from "./voter-groups";
import type { CoreInput, Source } from "./types";

const BANDS: readonly [number, number, string][] = [
  [18, 25, "18 to 24 years"],
  [25, 35, "25 to 34 years"],
  [35, 45, "35 to 44 years"],
  [45, 65, "45 to 64 years"],
  [65, 200, "65 years and over"],
];

interface CpsRow {
  dimension: string;
  geographyName: string;
  group: string;
  recordId: string;
  releaseDate: string;
  metrics: Record<string, { value: { state: string; value?: number } }>;
}

function turnoutFor(stateName: string, band: string) {
  const rows = cps as unknown as readonly CpsRow[];
  const find = (geography: string) =>
    rows.find(
      (row) =>
        row.dimension === "age" &&
        row.geographyName === geography &&
        row.group === band,
    );
  const row = find(stateName.toUpperCase()) ?? find("UNITED STATES");
  const value = row?.metrics.votedCitizenPercent?.value.value;
  const adults = row?.metrics.adultPopulation?.value.value,
    citizens = row?.metrics.citizenAdultPopulation?.value.value;
  return row && value !== undefined
    ? {
        turnout: value / 100,
        // Adults who are citizens, so eligible to vote.
        citizenShare:
          adults && citizens !== undefined ? Math.min(1, citizens / adults) : 1,
        row,
        national: row.geographyName !== stateName.toUpperCase(),
      }
    : undefined;
}

/**
 * Adds one voter group per place and age band of counted adults. A custom
 * world's politics settings shift the starting lean (−1 to 1, positive more
 * Republican) and multiply turnout (capped at everyone voting).
 */
/** Democratic and Republican 2024 votes summed over the town's recorded counties. */
function countyResult(
  countyNames: string | undefined,
  usps: string | undefined,
): [number, number] | undefined {
  if (!countyNames || !usps) return undefined;
  const table = COUNTY_PRESIDENTIAL.byStateCounty as unknown as Record<
    string,
    [number, number]
  >;
  const stateName = countyNames.split(", ").at(-1)!;
  let dem = 0,
    rep = 0,
    found = false;
  for (const name of countyNames
    .slice(0, countyNames.length - stateName.length)
    .split(/;\s*|,\s*/)
    .map((part) => part.trim())
    .filter(Boolean)) {
    const row = table[`${usps}|${name}`];
    if (!row) continue;
    dem += row[0];
    rep += row[1];
    found = true;
  }
  return found ? [dem, rep] : undefined;
}

export function withCountedVoterGroups(
  input: CoreInput,
  custom: { leanShift?: number; turnout?: number } = {},
): CoreInput {
  const residents = input.residents;
  const placeKey = input.placeMetadata?.placeKey;
  if (!residents || !placeKey) return input;
  const place = corePlaceByKey(placeKey);
  const usps = place?.stateJurisdictionKey?.replace(/^US-/, "");
  const state = corePlaceStateIdentities().find((row) => row.usps === usps);
  const presidential = ELECTORAL_CALIBRATION.presidentialByState?.find(
    (row) => row.stateUsps === usps,
  );
  // The town's county result where one is recorded (Alaska reports by house
  // district, so it keeps the state's); else the state's.
  const county = countyResult(input.placeMetadata?.countyNames, usps);
  const dem = county?.[0] ?? presidential?.totalsByParty.democratic ?? 0,
    rep = county?.[1] ?? presidential?.totalsByParty.republican ?? 0;
  const share = dem + rep > 0 ? dem / (dem + rep) : undefined;
  const leanShift = custom.leanShift ?? 0,
    turnoutScale = custom.turnout ?? 1;
  const lean = Math.max(
    -1,
    Math.min(1, (share === undefined ? 0 : 1 - 2 * share) + leanShift),
  );
  const placeCitizens = (
    PLACE_CITIZENSHIP.byPlace as unknown as Record<string, [number, number]>
  )[placeKey];
  const start = Number(input.startedAt.slice(0, 4));
  // Groups stand for the town's whole counted population. Relatives counted
  // elsewhere (county or state) are a sample of those places, not their voters.
  const town = input.people.find((row) => row.id === input.playerId)?.placeId;
  const counts = new Map<string, number>();
  for (const record of residents.households)
    for (const person of record.people) {
      if (town && record.household.placeId !== town) continue;
      const age = start - Number(person.birthDate.slice(0, 4));
      const band = BANDS.find(([min, max]) => age >= min && age < max)?.[2];
      if (!band) continue;
      const key = `${record.household.placeId}|${band}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  const groups: VoterGroup[] = [];
  for (const [key, size] of counts) {
    const [placeId, band] = key.split("|") as [string, string];
    const observed = state ? turnoutFor(state.name, band) : undefined;
    if (!observed) continue;
    // The place's ACS citizen share of adults, blended with the state's for
    // the band so a small place's noisy sample leans on its state.
    const prior = parameter("citizenShareStatePriorAdults");
    const citizenShare = placeCitizens
      ? (placeCitizens[0] + prior * observed.citizenShare) /
        (placeCitizens[1] + prior)
      : observed.citizenShare;
    const source: Source = {
      tag: "ESTIMATED",
      asOf: input.startedAt,
      citation: [
        `U.S. Census Bureau November 2024 CPS voting table 4c, ${observed.row.recordId} (${observed.national ? "national row; no state row" : `${state!.name}`}); Clerk of the U.S. House, Statistics of the Presidential and Congressional Election of November 5, 2024 (${usps ?? "no state"} two-party share)`,
        county ? COUNTY_PRESIDENTIAL.citation : undefined,
        placeCitizens ? PLACE_CITIZENSHIP.citation : undefined,
      ]
        .filter(Boolean)
        .join("; "),
      estimatedFrom: `Counted adults ${band} (${size}) × citizen share of adults ${citizenShare.toFixed(3)} (${placeCitizens ? `the place's ACS 2020–2024 ${placeCitizens[0]} of ${placeCitizens[1]}, blended with the state's ${observed.citizenShare.toFixed(3)} at ${prior} adults` : "the state's"}) = eligible voters; turnout from citizen turnout; starting lean ${lean.toFixed(3)} from the ${county ? "county's" : "state's"} 2024 presidential two-party margin${share === undefined ? " (no presidential vote recorded: 0)" : ""}${leanShift || turnoutScale !== 1 ? `; custom world: lean shifted ${leanShift}, turnout ×${turnoutScale}` : ""}. Views and elections refine it.`,
    };
    groups.push({
      id: `residents:${placeId}:${band}`,
      placeId,
      ageBand: band,
      lean,
      turnout: Math.min(1, observed.turnout * turnoutScale),
      size: Math.round(size * citizenShare),
      asOf: input.startedAt,
      source,
      sourceRecordIds: [
        observed.row.recordId,
        county
          ? `presidential-2024:${usps}:${input.placeMetadata?.countyNames}`
          : `presidential-2024:${usps ?? "none"}`,
      ],
    });
  }
  return { ...input, voterGroups: [...(input.voterGroups ?? []), ...groups] };
}

/** The group a counted adult belongs to, so fill-in can move them out of it. */
export function countedVoterGroupId(
  placeId: string,
  birthDate: string,
  at: string,
): string | undefined {
  const age = Number(at.slice(0, 4)) - Number(birthDate.slice(0, 4));
  const band = BANDS.find(([min, max]) => age >= min && age < max)?.[2];
  return band ? `residents:${placeId}:${band}` : undefined;
}

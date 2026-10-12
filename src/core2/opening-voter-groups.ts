/**
 * Voter groups for the counted population (two-level population). Each
 * place's counted adults, by CPS age band, become one group: its size is the
 * count, its turnout the state's November 2024 CPS citizen turnout for that
 * age band, and its starting lean the state's 2024 presidential two-party
 * margin (positive = more Republican, PEOPLE's conservative-positive scale).
 * Views and elections refine lean and turnout from residents' own records.
 */
import cps from "../../data/source/census-voting-registration/corpus.json" with { type: "json" };
import { ELECTORAL_CALIBRATION } from "../simulation/world-setup/political-start";
import {
  lifePlaceByKey,
  lifePlaceStateIdentities,
} from "../simulation/life-places";
import { stopgap } from "./stopgaps";
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
  return row && value !== undefined
    ? {
        turnout: value / 100,
        row,
        national: row.geographyName !== stateName.toUpperCase(),
      }
    : undefined;
}

/** Adds one voter group per place and age band of counted adults. */
export function withCountedVoterGroups(input: CoreInput): CoreInput {
  const residents = input.residents;
  const placeKey = input.placeMetadata?.placeKey;
  if (!residents || !placeKey) return input;
  stopgap("SG-CORE-voter-groups-starting-lean");
  const place = lifePlaceByKey(placeKey);
  const usps = place?.stateJurisdictionKey?.replace(/^US-/, "");
  const state = lifePlaceStateIdentities().find((row) => row.usps === usps);
  const presidential = ELECTORAL_CALIBRATION.presidentialByState?.find(
    (row) => row.stateUsps === usps,
  );
  const dem = presidential?.totalsByParty.democratic ?? 0,
    rep = presidential?.totalsByParty.republican ?? 0;
  const share = dem + rep > 0 ? dem / (dem + rep) : undefined;
  const lean = share === undefined ? 0 : 1 - 2 * share;
  const start = Number(input.startedAt.slice(0, 4));
  const counts = new Map<string, number>();
  for (const record of residents.households)
    for (const person of record.people) {
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
    const source: Source = {
      tag: "ESTIMATED",
      asOf: input.startedAt,
      citation: `U.S. Census Bureau November 2024 CPS voting table 4c, ${observed.row.recordId} (${observed.national ? "national row; no state row" : `${state!.name}`}); Clerk of the U.S. House, Statistics of the Presidential and Congressional Election of November 5, 2024 (${usps ?? "no state"} two-party share).`,
      estimatedFrom: `Counted adults ${band}; turnout from citizen turnout, all counted adults treated as eligible; starting lean ${lean.toFixed(3)} from the state's 2024 presidential two-party margin${share === undefined ? " (no presidential vote recorded: 0)" : ""}. Views and elections refine it.`,
    };
    groups.push({
      id: `residents:${placeId}:${band}`,
      placeId,
      ageBand: band,
      lean,
      turnout: observed.turnout,
      size,
      asOf: input.startedAt,
      source,
      sourceRecordIds: [
        observed.row.recordId,
        `presidential-2024:${usps ?? "none"}`,
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

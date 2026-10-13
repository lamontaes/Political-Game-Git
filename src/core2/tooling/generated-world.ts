/** A generated opening in a place drawn from all 56, the same route as the speed guard's month. */
import { releaseRecentHistory } from "../../simulation/history-index";
import {
  forgetLastValidatedWorld,
  withoutWorldChecks,
} from "../../simulation/world";
import { bookkeeping } from "../bookkeeping";
import { ageOnDate, makeIsoDate } from "../../simulation/dates";
import { withPrivateTuition } from "../opening-private-tuition";
import { withPublicSchoolDistrict } from "../opening-public-schools";
import { buildPopulation } from "../population";
import { buildDeepPast } from "../deep-past";
import { enrichCivicInputs } from "../civic-inputs";
import { buildOpeningPeerContacts } from "../opening-peer-network";
import { initialFocusPeople } from "../focus";
import { buildOpeningEconomy } from "../opening-economy";
import { collapseToTwoLevels, fullPeople } from "../residents";
import { withCountedVoterGroups } from "../opening-voter-groups";
import { addOutsideMarket } from "../opening-outside-market";
import { parameter } from "../parameters";
import measurement from "../data/measurement.json" with { type: "json" };
import type { CoreInput } from "../types";

/** Population, past, civic records, the player's peers and circle, then the economy. */
/**
 * Custom-world settings (M6-04). A new game uses real data unless the player
 * changes something; every setting is recorded on the world so engines and
 * screens can show it as the player's choice, not as real data.
 */
export interface WorldSettings {
  /** Residents generated (at least), default from targetPopulation. */
  population?: number;
  economy?: {
    /** Multiplies outside buyers' demand for the town's firms. */
    outsideDemand?: number;
    /** Multiplies every household's opening cash. */
    householdCash?: number;
    /** Multiplies every job's pay. */
    wages?: number;
  };
  /** Recorded for PEOPLE's views and GOV's elections to read. */
  politics?: {
    /** -1 (left) to +1 (right), added to residents' lean. */
    leanShift?: number;
    /** Multiplies turnout. */
    turnout?: number;
    /** Party name to a strength multiplier. */
    partyStrength?: Readonly<Record<string, number>>;
  };
}

function checkSettings(settings: WorldSettings): void {
  const multiplier = (value: number | undefined, name: string) => {
    if (value !== undefined && !(value >= 0.25 && value <= 4))
      throw new Error(`World setting ${name} must be between 0.25 and 4.`);
  };
  if (
    settings.population !== undefined &&
    !(
      Number.isSafeInteger(settings.population) &&
      settings.population >= 100 &&
      settings.population <= 50_000
    )
  )
    throw new Error("World population must be 100 to 50,000 people.");
  multiplier(settings.economy?.outsideDemand, "outside demand");
  multiplier(settings.economy?.householdCash, "household cash");
  multiplier(settings.economy?.wages, "wages");
  multiplier(settings.politics?.turnout, "turnout");
  for (const [party, value] of Object.entries(
    settings.politics?.partyStrength ?? {},
  ))
    multiplier(value, `party strength (${party})`);
  const shift = settings.politics?.leanShift;
  if (shift !== undefined && !(shift >= -1 && shift <= 1))
    throw new Error("World lean shift must be between -1 and 1.");
}

export function generatedOpening(
  place: { seed: string; key: string },
  options: {
    economy?: boolean;
    twoLevel?: boolean;
    settings?: WorldSettings;
    /** The opening date; January 2021 by default (M1-14 moves games to 2026). */
    startedAt?: string;
  } = {},
): CoreInput {
  const settings = options.settings ?? {};
  checkSettings(settings);
  // World integrity checks are bookkeeping: on in tests and the bench only.
  if (!bookkeeping())
    return withoutWorldChecks(() => buildOpening(place, options, settings));
  return buildOpening(place, options, settings);
}

function buildOpening(
  place: { seed: string; key: string },
  options: { economy?: boolean; twoLevel?: boolean; startedAt?: string },
  settings: WorldSettings,
): CoreInput {
  const population = buildPopulation({
    seed: place.seed,
    placeKey: place.key,
    startedAt: options.startedAt ?? measurement.startedAt,
    minimumPeople: settings.population ?? parameter("targetPopulation"),
    openingEmployment: true,
    scheduledWork: true,
  });
  // Record each class and workgroup's size as the full build sees it, so a
  // person filled in later joins the same-sized peer group (PEOPLE's
  // peerCohortSize; called once their deep past supports it).
  const cohortSizes: Record<string, number> = {};
  const withPast = (
    buildDeepPast as (
      input: CoreInput,
      options?: Record<string, unknown>,
    ) => CoreInput
  )(population, {
    peerCohortSize: (circle: string, contextKey: string, present: number) => {
      cohortSizes[`${circle}|${contextKey}`] = present;
      return present;
    },
  });
  let input = applyOpeningSettings(enrichCivicInputs(withPast), settings);
  // The town's public school district, staffed from workers not yet placed.
  const schools = withPublicSchoolDistrict(input);
  input = schools.receipt
    ? {
        ...schools.input,
        placeMetadata: {
          ...(schools.input.placeMetadata ?? {}),
          openingPublicSchools: JSON.stringify(schools.receipt),
        },
      }
    : schools.input;
  const start = makeIsoDate(input.startedAt);
  const player = input.people
    .filter(
      (person) =>
        person.jobId &&
        ageOnDate(makeIsoDate(person.birthDate), start) >=
          parameter("benchmarkAdultMinimumAge"),
    )
    .sort((a, b) => a.id.localeCompare(b.id))[0];
  if (!player)
    throw new Error(`No eligible recorded adult worker in ${place.key}`);
  input = {
    ...buildOpeningPeerContacts(input, { personIds: [player.id] }).input,
    playerId: player.id,
  };
  input = {
    ...input,
    focusPersonIds: [...initialFocusPeople(input)].sort(),
    focusPlaceIds: [],
    visiblePlaceIds: [
      player.placeId,
      ...(player.countyId ? [player.countyId] : []),
    ].sort(),
  };
  // Two-level: decide who stays a full person first, so counted households
  // get light economy terms (same amounts, no per-household evidence).
  const keep = options.twoLevel ? fullPeople(input) : undefined;
  const countedHouseholdIds = keep
    ? new Set(
        input.households
          .filter((home) => !home.memberIds.some((id) => keep.has(id)))
          .map((home) => home.id),
      )
    : undefined;
  const outsideDemand = settings.economy?.outsideDemand ?? 1;
  if (options.economy !== false)
    input = scaleOutsideSales(
      outsideDemand,
      addOutsideMarket(
        withPrivateTuition(
          buildOpeningEconomy(input, {
            finance: { countedHouseholdIds },
            customers: { countedHouseholdIds },
          }).input,
        ),
      ),
    );
  // The generator's temporary world is done; let its indexes go.
  releaseRecentHistory();
  forgetLastValidatedWorld();
  if (!keep) return input;
  const two = withCountedVoterGroups(collapseToTwoLevels(input, { keep }), {
    leanShift: settings.politics?.leanShift ?? 0,
    turnout: settings.politics?.turnout ?? 1,
  });
  return { ...two, residents: { ...two.residents!, cohortSizes } };
}

/** Wages and household cash, applied before the economy is built from them. */
function applyOpeningSettings(
  input: CoreInput,
  settings: WorldSettings,
): CoreInput {
  const wages = settings.economy?.wages ?? 1,
    cash = settings.economy?.householdCash ?? 1;
  const recorded: Record<string, string> =
    Object.keys(settings).length === 0
      ? {}
      : { worldSettings: JSON.stringify(settings) };
  return {
    ...input,
    placeMetadata: { ...(input.placeMetadata ?? {}), ...recorded },
    gaps:
      Object.keys(settings).length === 0
        ? input.gaps
        : [
            ...input.gaps,
            `Custom world: the player changed real data (${Object.keys(settings).join(", ")}); see placeMetadata.worldSettings.`,
          ],
    people:
      cash === 1
        ? input.people
        : input.people.map((row) => ({
            ...row,
            liquidMinor: Math.round(row.liquidMinor * cash),
          })),
    jobs:
      wages === 1
        ? input.jobs
        : input.jobs.map((row) => ({
            ...row,
            wageDailyMinor: Math.round(row.wageDailyMinor * wages),
            ...(row.hourlyMinor === undefined
              ? {}
              : { hourlyMinor: Math.round(row.hourlyMinor * wages) }),
          })),
    workCommitments:
      wages === 1
        ? input.workCommitments
        : input.workCommitments?.map((row) => ({
            ...row,
            hourlyMinor: Math.round(row.hourlyMinor * wages),
          })),
  };
}

function scaleOutsideSales(factor: number, input: CoreInput): CoreInput {
  if (factor === 1 || !input.residents) return input;
  return {
    ...input,
    residents: {
      ...input.residents,
      flows: input.residents.flows.map((row) =>
        row.kind === "outside-sales"
          ? { ...row, amountMinor: Math.round(row.amountMinor * factor) }
          : row,
      ),
    },
  };
}

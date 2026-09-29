/**
 * VITAL STATISTICS — one fixed list of figures for the place a world report
 * watched, read at the opening and again at the end, so two worlds can be set
 * side by side (Claude CTO, 11:40 p.m. September 28, from Lamontae's note:
 * "education and crime economy, stuff like that so I can see how worlds
 * differ").
 *
 * Every figure is read from what the world recorded; nothing here writes or
 * draws. A figure the world does not record yet is shown as "not recorded"
 * with the reason, never as zero. Each row says where its figure is kept: the
 * town itself (a city's own outcome once its own laws act on it), or the
 * state the town lies in.
 */
import type { EntityId, IsoDate, World } from "../../src/simulation";
import { describeTownBusinesses } from "../../src/simulation/living-world/town-businesses";
import { townResidents } from "../../src/simulation/living-world/town-employment";
import { describeTownHomes } from "../../src/simulation/living-world/town-homes";
import {
  townMedianHourlyPay,
  townUnemploymentRate,
} from "../../src/simulation/living-world/town-economy-measures";
import { TOWN_FAMILIES_VERSION } from "../../src/simulation/living-world/town-families";
import { publicPartyAffiliation } from "../../src/simulation/living-world/congress";
import { organizationNameAt } from "../../src/simulation/living-world/party-registry";
import { sittingLocalOfficers } from "../../src/simulation/living-world/local-government-seats";
import { homeLocalGovernmentUnits } from "../../src/simulation/nationwide-world/local-governments";
import { currentStateExecutiveHolders } from "../../src/simulation/nationwide-world/state-executives";
import { stateLegislators } from "../../src/simulation/nationwide-world/state-legislature-opening";
import { stateCandidacyPack } from "../../src/simulation/candidacy-packs";
import { townRoster } from "../../src/simulation/living-world/town-residents";
import {
  PLACE_OUTCOME_BASES,
  PLACE_OUTCOME_MEASURES,
  placeOutcomeAt,
  placeOutcomeKey,
} from "../../src/simulation/outcome-web/place-outcomes";

/** Where a figure is kept. */
export type VitalScope = "town" | "state";

export interface VitalFigure {
  readonly key: string;
  readonly label: string;
  readonly scope: VitalScope;
  /** The figure, formatted; null when the world does not record it. */
  readonly value: string | null;
  /** Why it is not recorded, when it is not. */
  readonly missing?: string;
}

export interface VitalSnapshot {
  readonly date: IsoDate;
  readonly figures: readonly VitalFigure[];
}

const percent = (value: number | null | undefined, digits = 1) =>
  value === null || value === undefined ? null : `${value.toFixed(digits)}%`;

function outcome(
  world: World,
  town: EntityId,
  measure: string,
  label: string,
  format: (value: number) => string,
): VitalFigure {
  const key = `outcome:${measure}`;
  if (!PLACE_OUTCOME_MEASURES.includes(measure))
    return {
      key,
      label,
      scope: "state",
      value: null,
      missing: "the outcome web does not compute this measure on this head",
    };
  const record = placeOutcomeAt(world, measure, town, world.currentDate);
  if (record)
    return {
      key,
      label,
      // A city or county whose own laws act keeps its own value.
      scope: /^US-[A-Z]{2}$/.test(record.placeKey) ? "state" : "town",
      value: format(record.value),
    };
  const stateKey = placeOutcomeKey(town);
  return {
    key,
    label,
    scope: "state",
    value: null,
    missing:
      stateKey && PLACE_OUTCOME_BASES[measure]?.places[stateKey] === undefined
        ? `the outcome web has no starting value for ${stateKey}`
        : `no monthly value recorded yet for ${stateKey ?? "this place"}`,
  };
}

/** The first of several measures the outcome web computes on this head. */
function firstMeasure(...measures: string[]): string {
  return (
    measures.find((measure) => PLACE_OUTCOME_MEASURES.includes(measure)) ??
    measures[0]!
  );
}

const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

function partyName(world: World, personId: EntityId | null): string | null {
  if (!personId) return null;
  const partyId = publicPartyAffiliation(world, personId);
  return partyId ? (organizationNameAt(world, partyId) ?? null) : null;
}

function governingParty(
  world: World,
  town: EntityId,
  anchorPersonId: EntityId,
): VitalFigure[] {
  const stateKey = placeOutcomeKey(town);
  const usps = stateKey?.replace(/^US-/, "") ?? null;
  const governor = currentStateExecutiveHolders(world).find(
    (holder) => holder.stateUsps === usps,
  );
  const figures: VitalFigure[] = [
    {
      key: "governor-party",
      label: "Governor's party",
      scope: "state",
      value: governor
        ? `${partyName(world, governor.personId) ?? "no party"} (${governor.personName})`
        : null,
      ...(governor ? {} : { missing: "no sitting governor is recorded" }),
    },
  ];
  const pack = stateCandidacyPack(stateKey);
  const members = pack ? stateLegislators(world, pack.packId) : [];
  const chambers = new Map<string, Map<string, number>>();
  for (const member of members) {
    // Office keys read "<pack>:house"; the chamber is the last part.
    const chamber = capitalize(member.officeKey.split(":").at(-1) ?? "");
    const seats = chambers.get(chamber) ?? new Map<string, number>();
    const party = member.party ? capitalize(member.party) : "no party";
    seats.set(party, (seats.get(party) ?? 0) + 1);
    chambers.set(chamber, seats);
  }
  figures.push({
    key: "legislature-seats",
    label: "State legislature, seats by party",
    scope: "state",
    value:
      chambers.size === 0
        ? null
        : [...chambers]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(
              ([chamber, seats]) =>
                `${chamber}: ${[...seats]
                  .sort((a, b) => b[1] - a[1])
                  .map(([party, n]) => `${party} ${n}`)
                  .join(", ")}`,
            )
            .join("; "),
    ...(chambers.size === 0
      ? { missing: "no seated state legislators are recorded" }
      : {}),
  });
  const unit = homeLocalGovernmentUnits(world, anchorPersonId).municipal[0];
  const mayor = unit
    ? sittingLocalOfficers(world, unit).find((office) => office.mayor)
    : undefined;
  figures.push({
    key: "mayor-party",
    label: "Mayor's party",
    scope: "town",
    value: mayor
      ? (partyName(world, mayor.personId) ??
        "no party (nonpartisan or unaffiliated)")
      : null,
    ...(mayor
      ? {}
      : {
          missing: unit
            ? "no sitting mayor is recorded"
            : "the place has no municipal government on record",
        }),
  });
  return figures;
}

/** The vital statistics of a watched town as the world stands now. */
export function vitalSnapshot(
  world: World,
  town: EntityId,
  anchorPersonId: EntityId,
): VitalSnapshot {
  // The town's size is its Census count; the world writes its people out as
  // it needs them, so the written count is shown beside it.
  const roster = townRoster(town);
  const written = townResidents(world, town).length;
  const homes = describeTownHomes(world, town);
  const unemployment = townUnemploymentRate(world, town);
  const pay = townMedianHourlyPay(world, town);
  const businesses = describeTownBusinesses(world, town, world.currentDate);
  const count = (value: number) => value.toLocaleString("en-US");
  const crime = firstMeasure("crime.violent", "crime.rate-index");
  const figures: VitalFigure[] = [
    {
      key: "people",
      label: "People living in the place",
      scope: "town",
      // A place with no Census count is sized by a set stand-in (1,000), so
      // the row says the count is not measured.
      value:
        roster.referencePopulation === null
          ? `${count(roster.population)}, set by hand: no Census count (${count(written)} written out)`
          : `${count(roster.population)} (${count(written)} written out)`,
    },
    {
      key: "households",
      label: "Households",
      scope: "town",
      value:
        roster.referencePopulation === null
          ? `${count(roster.households)}, set by hand: no Census count (${count(homes.households)} written out)`
          : `${count(roster.households)} (${count(homes.households)} written out)`,
    },
    {
      key: "median-pay",
      label: "Median hourly pay of jobs held",
      scope: "town",
      value:
        pay.value === null ? null : `$${(pay.value / 100).toFixed(2)} an hour`,
      ...(pay.value === null ? { missing: "no job pay is recorded" } : {}),
    },
    {
      key: "household-income",
      label: "Median household income",
      scope: "town",
      value: null,
      missing: "the world keeps pay per job, not income per household",
    },
    {
      key: "unemployment",
      label: "Unemployment",
      scope: "town",
      value:
        unemployment.value === null
          ? null
          : `${percent(unemployment.value)} of ${count(unemployment.basis)} written out in the labor force`,
      ...(unemployment.value === null
        ? { missing: "nobody in the labor force is recorded" }
        : {}),
    },
    outcome(
      world,
      town,
      "household.poverty-pct",
      "Poverty",
      (v) => `${v.toFixed(1)}%`,
    ),
    {
      key: "rent-share",
      label: "Typical rent as a share of income",
      scope: "town",
      value: null,
      missing: "no rent payment is recorded on this head",
    },
    outcome(
      world,
      town,
      "health.uninsured-pct",
      "Without health insurance",
      (v) => `${v.toFixed(1)}%`,
    ),
    outcome(
      world,
      town,
      "school.graduation-pct",
      "High school graduation",
      (v) => `${v.toFixed(1)}%`,
    ),
    outcome(
      world,
      town,
      "school.college-completion-pct",
      "College completion (bachelor's or more)",
      (v) => `${v.toFixed(1)}%`,
    ),
    crime === "crime.violent"
      ? outcome(world, town, crime, "Violent crime per 100,000 people", (v) =>
          v.toFixed(1),
        )
      : outcome(world, town, crime, "Crime index (100 at the start)", (v) =>
          v.toFixed(0),
        ),
    outcome(
      world,
      town,
      "voting.turnout-pct",
      "Turnout",
      (v) => `${v.toFixed(1)}%`,
    ),
    {
      key: "businesses-open",
      // The world writes a town's existing businesses out as their jobs are
      // filled, so this count can rise without a new business opening.
      label: "Businesses written out and open",
      scope: "town",
      value: count(businesses.open),
    },
    ...governingParty(world, town, anchorPersonId),
  ];
  return { date: world.currentDate, figures };
}

export interface VitalCounts {
  readonly from: IsoDate;
  readonly until: IsoDate;
  readonly births: number;
  readonly deaths: number;
  readonly businessesOpened: number;
  readonly businessesClosed: number;
}

/** Births, deaths and business openings and closings between two dates. */
export function vitalCounts(
  world: World,
  town: EntityId,
  from: IsoDate,
  until: IsoDate,
): VitalCounts {
  const prefix = `${TOWN_FAMILIES_VERSION}:${town}:`;
  const births = world.history.events.filter(
    (event) =>
      event.type === "life.family-member-added" &&
      event.stableKey.startsWith(prefix) &&
      event.occurredAt >= from &&
      event.occurredAt < until,
  ).length;
  const deaths = world.history.personDeaths.filter(
    (death) =>
      death.diedAt >= from &&
      death.diedAt < until &&
      world.people[death.personId]?.homeJurisdictionId === town,
  ).length;
  const since = describeTownBusinesses(world, town, from);
  const after = describeTownBusinesses(world, town, until);
  return {
    from,
    until,
    births,
    deaths,
    businessesOpened: since.opened - after.opened,
    businessesClosed: since.closed - after.closed,
  };
}

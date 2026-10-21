/**
 * The government rule readers in `src/core2/gov-rules/` give exactly what the
 * old engine's readers give: every ported export against its original, for
 * all 56 states and territories, a fixed sample of localities and counties in
 * each, every government unit in the Census listing, and a spread of dates.
 *
 * Run with `GOV_RULES_WRITE=1` to rewrite `gov-rules/municipal-governments.json`
 * from the old engine's compiled municipal corpus.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  searchCorePlaces,
  corePlaceStateIdentities,
  type CorePlace,
} from "./place-lookup";
import {
  allGovernmentUnits,
  municipioUnit,
  type GovernmentUnitIdentity,
} from "./reference/government-units";
import { makeIsoDate } from "./kernel/dates";
import { SeededRng } from "./kernel/rng";
import * as oldBallot from "../simulation/municipal-ballot-rules";
import * as oldElectionRules from "../simulation/municipal-election-rules";
import * as oldTownCalendar from "../simulation/nationwide-world/town-election-calendar";
import * as oldCountyCalendar from "../simulation/nationwide-world/county-election-calendar";
import * as oldLocalGovernments from "../simulation/nationwide-world/local-governments";
import * as oldBodyRules from "../simulation/nationwide-world/local-governing-body-rules";
import * as oldChiefRules from "../simulation/nationwide-world/local-chief-executive-rules";
import * as oldRowOffices from "../simulation/nationwide-world/county-row-offices";
import * as oldBoardRules from "../simulation/nationwide-world/township-governing-body-rules";
import * as oldIdentity from "../simulation/person-identity";
import * as oldCohorts from "../simulation/given-name-cohorts";
import * as oldNames from "../simulation/names-data";
import {
  municipalGovernments as oldMunicipalGovernments,
  primaryReading as oldPrimaryReading,
} from "../simulation/municipal-government";

import * as ballot from "./gov-rules/municipal-ballot-rules";
import * as electionRules from "./gov-rules/municipal-election-rules";
import * as townCalendar from "./gov-rules/town-election-calendar";
import * as countyCalendar from "./gov-rules/county-election-calendar";
import * as localGovernments from "./gov-rules/local-governments";
import * as bodyRules from "./gov-rules/local-governing-body-rules";
import * as chiefRules from "./gov-rules/local-chief-executive-rules";
import * as rowOffices from "./gov-rules/county-row-offices";
import * as boardRules from "./gov-rules/township-governing-body-rules";
import * as identity from "./gov-rules/person-identity";
import * as cohorts from "./gov-rules/given-name-cohorts";
import * as names from "./gov-rules/names-data";
import municipalGovernmentsJson from "./gov-rules/municipal-governments.json" with { type: "json" };

const STATES = corePlaceStateIdentities();
const DATES = [
  "2024-01-01",
  "2026-10-12",
  "2027-06-30",
  "2028-11-08",
  "2031-02-28",
].map(makeIsoDate);

/** Evenly spaced picks from a list sorted by key: first, last and between. */
function sample(places: readonly CorePlace[], count: number): CorePlace[] {
  const sorted = [...places].sort((a, b) => a.key.localeCompare(b.key));
  if (sorted.length <= count) return sorted;
  return Array.from(
    { length: count },
    (_, index) =>
      sorted[Math.round((index * (sorted.length - 1)) / (count - 1))]!,
  );
}

function placesIn(
  stateKey: string,
  scope: "locality" | "county",
): readonly CorePlace[] {
  return searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
    stateJurisdictionKey: stateKey,
    scope,
  });
}

/** The compiled-corpus projection `municipal-governments.json` holds. */
function municipalProjection() {
  return {
    governments: oldMunicipalGovernments().map((government) => {
      const reading = oldPrimaryReading(government);
      return {
        key: government.key,
        placeGeoid: government.placeGeoid ?? null,
        publisherId: government.identity?.publisherId || null,
        reading: {
          form: reading.form ?? null,
          bodyName: reading.bodyName ?? null,
          bodySize: reading.bodySize ?? null,
          composition: reading.composition
            ? {
                pattern: reading.composition.pattern,
                districtSeats: reading.composition.districtSeats ?? null,
                wardSeats: reading.composition.wardSeats ?? null,
              }
            : null,
          executiveSelection: reading.executiveSelection ?? null,
          mayor: reading.mayor
            ? {
                title: reading.mayor.title ?? null,
                structuralPosition: reading.mayor.structuralPosition ?? null,
              }
            : null,
          terms: reading.terms.map((term) => ({
            seatClass: term.seatClass,
            years: term.years ?? null,
          })),
        },
      };
    }),
  };
}

describe("ported government rule readers", () => {
  it("hold the old compiled municipal corpus's projection", () => {
    const projection = municipalProjection();
    if (process.env.GOV_RULES_WRITE === "1")
      writeFileSync(
        fileURLToPath(
          new URL("./gov-rules/municipal-governments.json", import.meta.url),
        ),
        `${JSON.stringify(projection, null, 2)}\n`,
      );
    else expect(municipalGovernmentsJson).toEqual(projection);
  });

  it("match on election calendars, recall and timing in all 56 places", () => {
    expect(STATES).toHaveLength(56);
    expect(townCalendar.FILING_LEAD_DAYS).toBe(
      oldTownCalendar.FILING_LEAD_DAYS,
    );
    expect(townCalendar.FILING_LEAD_SOURCE).toBe(
      oldTownCalendar.FILING_LEAD_SOURCE,
    );
    for (let year = 1990; year <= 2100; year += 1)
      expect(townCalendar.novemberGeneralElectionDay(year)).toBe(
        oldTownCalendar.novemberGeneralElectionDay(year),
      );
    const doctrines = [
      null,
      "two-question-standalone",
      "simultaneous-incumbent-replacement",
      "yes-no-retention",
      "judicial-cause-removal-trial",
      "prohibited",
    ] as const;
    for (const state of STATES) {
      for (const usps of [state.usps, state.usps.toLowerCase()]) {
        for (const doctrine of doctrines)
          expect(ballot.resolveMunicipalRecallRule(usps, doctrine)).toEqual(
            oldBallot.resolveMunicipalRecallRule(usps, doctrine),
          );
        expect(ballot.resolveMunicipalRecallRule(usps)).toEqual(
          oldBallot.resolveMunicipalRecallRule(usps),
        );
      }
      for (const place of sample(
        placesIn(state.jurisdictionKey, "locality"),
        5,
      ))
        expect(
          ballot.resolveMunicipalElectionTiming(
            state.usps,
            place.sourceGeoid ?? "",
          ),
        ).toEqual(
          oldBallot.resolveMunicipalElectionTiming(
            state.usps,
            place.sourceGeoid ?? "",
          ),
        );
    }
    for (const percent of [0.5, 5, 10, 12.5, 15, 25, 33.3, 100])
      for (const base of [0, 1, 7, 99, 1000, 123_457])
        expect(
          electionRules.resolveRequiredSignatures(
            { percent, base: "registered-voters" },
            base,
          ),
        ).toBe(
          oldElectionRules.resolveRequiredSignatures(
            { percent, base: "registered-voters" },
            base,
          ),
        );
  });

  it("match on the local governments of sampled places in all 56 places", () => {
    let localities = 0;
    let counties = 0;
    expect(localGovernments.placeLocalGovernmentUnits(null)).toEqual(
      oldLocalGovernments.placeLocalGovernmentUnits(null),
    );
    for (const state of STATES) {
      const picked = sample(placesIn(state.jurisdictionKey, "locality"), 5);
      expect(picked.length).toBeGreaterThanOrEqual(
        Math.min(3, placesIn(state.jurisdictionKey, "locality").length),
      );
      const countyPlaces = sample(placesIn(state.jurisdictionKey, "county"), 3);
      for (const place of [...picked, ...countyPlaces]) {
        expect(localGovernments.placeLocalGovernmentUnits(place)).toEqual(
          oldLocalGovernments.placeLocalGovernmentUnits(place),
        );
        if (place.scope === "locality") localities += 1;
        else counties += 1;
      }
    }
    expect(localities).toBeGreaterThanOrEqual(56 * 3);
    console.log(
      `gov-rules: ${STATES.length} places, ${localities} localities, ${counties} counties compared`,
    );
  });

  it("match on every government unit's offices and county calendars", () => {
    const units: GovernmentUnitIdentity[] = [...allGovernmentUnits()];
    // Puerto Rico's municipios are not in the Census listing.
    for (let code = 1; code <= 153; code += 2) {
      const unit = municipioUnit(`72${String(code).padStart(3, "0")}`);
      if (unit) units.push(unit);
    }
    let countyCalendars = 0;
    for (const unit of units) {
      expect(bodyRules.localGoverningBodyRules(unit)).toEqual(
        oldBodyRules.localGoverningBodyRules(unit),
      );
      expect(chiefRules.localChiefExecutiveRules(unit)).toEqual(
        oldChiefRules.localChiefExecutiveRules(unit),
      );
      expect(rowOffices.countyElectedRowOffices(unit)).toEqual(
        oldRowOffices.countyElectedRowOffices(unit),
      );
      expect(boardRules.boardGoverningBodyRules(unit)).toEqual(
        oldBoardRules.boardGoverningBodyRules(unit),
      );
      if (unit.unitType !== "county") continue;
      for (const date of DATES)
        expect(countyCalendar.nextCountyElection(unit, date)).toEqual(
          oldCountyCalendar.nextCountyElection(unit, date),
        );
      countyCalendars += 1;
    }
    console.log(
      `gov-rules: ${units.length} government units, ${countyCalendars} county calendars x ${DATES.length} dates compared`,
    );
  });

  it("match on invented officials' identity and names", () => {
    expect(names.PLACE_NAMES_V1_VERSION).toBe(oldNames.PLACE_NAMES_V1_VERSION);
    for (const version of ["names-v1", "demo-names-v4", "names-pr-v1"]) {
      const corpus = names.getNameCorpus(version);
      expect(corpus).toEqual(oldNames.getNameCorpus(version));
      for (const gender of ["male", "female", "nonbinary"] as const)
        expect(names.givenNamePoolForCorpus(corpus, gender)).toEqual(
          oldNames.givenNamePoolForCorpus(
            oldNames.getNameCorpus(version),
            gender,
          ),
        );
    }
    expect(() => names.getNameCorpus("nope")).toThrow();
    for (const state of STATES)
      for (const version of [names.PLACE_NAMES_V1_VERSION, undefined])
        expect(names.nameCorpusVersionForPlace(state.usps, version)).toBe(
          oldNames.nameCorpusVersionForPlace(state.usps, version),
        );
    expect(names.nameCorpusVersionForPlace(null, "place-names-v1")).toBe(
      oldNames.nameCorpusVersionForPlace(null, "place-names-v1"),
    );

    for (let seed = 0; seed < 300; seed += 1) {
      const key = `gov-rules-${seed}`;
      expect(identity.generatePersonIdentity(new SeededRng(key))).toEqual(
        oldIdentity.generatePersonIdentity(new SeededRng(key)),
      );
      const year = 1890 + ((seed * 7) % 160);
      for (const sex of ["male", "female"] as const)
        expect(cohorts.drawCohortGivenName(new SeededRng(key), sex, year)).toBe(
          oldCohorts.drawCohortGivenName(new SeededRng(key), sex, year),
        );
    }
  });
});

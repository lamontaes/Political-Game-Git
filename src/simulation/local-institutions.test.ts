import { describe, expect, it } from "vitest";

import corpusText from "../../data/research/places/local-institutions.json?raw";
import { NATIONAL_PLACES_ROWS } from "./national-places.generated";
import { TERRITORY_PLACE_ROWS } from "./territory-places";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import {
  educationEnrollmentHistoryForPerson,
  organizationProfileAt,
} from "./life-queries";
import {
  localInstitutionsFor,
  localSchoolInstitutionFor,
} from "./local-institutions";
import { drawRandomPlace } from "../../tests/support/random-place";
import {
  compileLocalInstitutions,
  type LocalInstitutionEducationInput,
} from "../../scripts/source/local-institutions";
import type { LocalInstitutionsCorpus } from "./local-institutions-data";

const corpus = JSON.parse(corpusText) as LocalInstitutionsCorpus;
const RANDOM_SCHOOL_PLACE = drawRandomPlace(
  "b23-random-school-proof",
  (candidate) => {
    const rows = candidate.sourceGeoid
      ? corpus.places[candidate.sourceGeoid]
      : undefined;
    return !!rows && (rows.highSchools.length > 0 || rows.districts.length > 0);
  },
);

describe("compiled local institutions", () => {
  it("indexes every Census place without inventing missing institution rows", () => {
    const places = JSON.parse(NATIONAL_PLACES_ROWS) as [
      string,
      string,
      string,
    ][];
    const placeInputs = [
      ...places.map(([geoid, name, state]) => ({ geoid, name, state })),
      ...TERRITORY_PLACE_ROWS.map(([geoid, name, state]) => ({
        geoid,
        name,
        state,
      })),
    ];
    const empty = compileLocalInstitutions(placeInputs, []);
    expect(Object.keys(empty.places)).toHaveLength(placeInputs.length);
    const territories = new Set(
      TERRITORY_PLACE_ROWS.map(([, , state]) => state),
    );
    expect(territories).toEqual(new Set(["GU", "VI", "AS", "MP"]));
    const includedStates = new Set(places.map(([, , state]) => state));
    for (const state of territories) includedStates.add(state);
    expect(includedStates.size).toBe(56);
    for (const { geoid } of placeInputs) {
      expect(empty.places[geoid]).toEqual({
        highSchools: [],
        districts: [],
        hospitals: [],
        banks: [],
        colleges: [],
        largeEmployers: [],
      });
    }
  });

  it("joins a known CCD high school to its Census place", () => {
    const places = [{ geoid: "0107000", name: "Birmingham", state: "AL" }];
    const row = [
      "nces-sch:010000100001",
      "school",
      "Birmingham High School",
      "Birmingham",
      "AL",
      "01",
      null,
      "nces-lea:0100001",
      "1",
      "Open",
      null,
      "unknown",
      [["G_12_OFFERED", "Yes"]],
      [],
      "2024-25",
    ] as const as LocalInstitutionEducationInput;
    const compiled = compileLocalInstitutions(places, [row]);
    expect(compiled.places["0107000"]?.highSchools).toEqual([
      {
        name: "Birmingham High School",
        kind: "high-school",
        sourceKey: "NCES-CCD",
        sourceId: "010000100001",
        asOf: "2025-06-30",
        historicalNameEstimated: true,
      },
    ]);
  });

  it("retains the sourced Seattle CCD name under place GEOID 5363000", () => {
    expect(
      corpus.places["5363000"]?.highSchools.some(
        (row) =>
          row.sourceKey === "NCES-CCD" && row.sourceId === "530354000526",
      ),
    ).toBe(true);
  });

  it("resolves the real school through a new world jurisdiction", () => {
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey: "5363000",
      seed: "b23-local-reader-seattle",
      startAge: 25,
      startingLife: "ordinary-life",
      household: "lives-alone",
      questionnaire: "skipped",
    });
    const jurisdictionId =
      game.world.people[game.playerPersonId]!.homeJurisdictionId;
    expect(
      localInstitutionsFor(game.world, jurisdictionId).highSchools.some(
        (row) => row.sourceId === "530354000526",
      ),
    ).toBe(true);
  });

  it(`uses a source-backed school name in a new game at ${RANDOM_SCHOOL_PLACE.displayName}`, () => {
    const place = RANDOM_SCHOOL_PLACE;
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey: place.key,
      seed: "b23-random-school-proof-new-game",
      startAge: 17,
      startingLife: "ordinary-life",
      household: "lives-alone",
      questionnaire: "skipped",
    });
    const player = game.world.people[game.playerPersonId]!;
    const expected = localSchoolInstitutionFor(
      game.world,
      player.homeJurisdictionId,
      "high",
    )!;
    expect(expected).toBeDefined();
    const enrollment = educationEnrollmentHistoryForPerson(
      game.world,
      player.id,
    ).at(-1)!;
    const organization = game.world.history.organizations.find(
      (row) => row.id === enrollment.organizationId,
    )!;
    expect(
      organizationProfileAt(game.world, enrollment.organizationId)?.name,
    ).toBe(expected.name);
    expect(organization.provenance).toMatchObject({
      kind: "source-record",
      reference: expect.stringContaining(
        `${expected.sourceKey}:${expected.sourceId}`,
      ),
    });
  });
});

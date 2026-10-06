import { describe, expect, it } from "vitest";

import corpusText from "../../data/research/places/local-institutions.json?raw";
import { drawRandomPlace } from "../../tests/support/random-place";
import type { LocalInstitutionsCorpus } from "../simulation/local-institutions-data";
import {
  activeWorkRelationshipsAt,
  organizationProfileAt,
} from "../simulation";
import { localSchoolInstitutionFor } from "../simulation/local-institutions";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { createExplicitGeographyLife } from "./new-game-geography";
import { projectPersonalRecord } from "./personal-record";
import { projectJournalView } from "./journal-views";
import { observerPlace } from "./observer-world";
import { openOrdinaryLife } from "./ordinary-life";
import { projectJobMarket } from "./job-listings-view";

const corpus = JSON.parse(corpusText) as LocalInstitutionsCorpus;

function randomSchoolPlace(seed: string, excluding: readonly string[] = []) {
  return drawRandomPlace(seed, (place) => {
    const rows = place.sourceGeoid ? corpus.places[place.sourceGeoid] : null;
    return (
      !excluding.includes(place.key) &&
      !!rows &&
      (rows.highSchools.length > 0 || rows.districts.length > 0)
    );
  });
}

function newGame(placeKey: string, seed: string, startAge: number) {
  return createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    placeKey,
    seed,
    startAge,
    startingLife: "ordinary-life",
    household: "lives-alone",
    questionnaire: "skipped",
  });
}

describe("local institution names in ordinary play", () => {
  it("shows a source school in Personal and Journal across two random places", () => {
    const personalPlace = randomSchoolPlace("b23-personal-local-school");
    const personalGame = newGame(
      personalPlace.key,
      "b23-personal-local-school-game",
      17,
    );
    const personalPlayer =
      personalGame.world.people[personalGame.playerPersonId]!;
    const personalSchool = localSchoolInstitutionFor(
      personalGame.world,
      personalPlayer.homeJurisdictionId,
      "high",
    )!;
    const personal = projectPersonalRecord(
      personalGame.world,
      personalPlayer.id,
    )!;
    expect(personal.identity.placeName).toBeDefined();
    expect(
      personal.education.some((row) => row.text.includes(personalSchool.name)),
    ).toBe(true);

    const journalPlace = randomSchoolPlace("b23-journal-local-school", [
      personalPlace.key,
    ]);
    const journalGame = newGame(
      journalPlace.key,
      "b23-journal-local-school-game",
      17,
    );
    const journalPlayer = journalGame.world.people[journalGame.playerPersonId]!;
    const journalSchool = localSchoolInstitutionFor(
      journalGame.world,
      journalPlayer.homeJurisdictionId,
      "high",
    )!;
    const journal = projectJournalView(
      journalGame.world,
      journalPlayer.id,
      "years",
      null,
    );
    expect(
      journal.sections
        .flatMap((section) => section.entries)
        .some((entry) => entry.text.includes(journalSchool.name)),
    ).toBe(true);

    const workPlace = observerPlace("adult-work-1");
    const workGame = createExplicitGeographyLife({
      placeKey: workPlace.key,
      seed: "adult-work-1",
      startAge: 34,
    }).game;
    const workWorld = openOrdinaryLife(workGame.world, workGame.playerPersonId);
    const workPlayer = workWorld.people[workGame.playerPersonId]!;
    const held = activeWorkRelationshipsAt(workWorld, workPlayer.id)[0]!;
    const employerName = organizationProfileAt(
      workWorld,
      held.relationship.organizationId!,
    )!.name;
    expect(
      projectJobMarket(workWorld, workPlayer.id).heldJobs.some((row) =>
        row.heading.includes(employerName),
      ),
    ).toBe(true);
  });
});

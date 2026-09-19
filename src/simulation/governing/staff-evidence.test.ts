import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { openOrdinaryLife } from "../../presentation/ordinary-life";
import { workRelationshipHistoryForPerson } from "../life-queries";
import { serializeWorld } from "../serialization";
import type { World } from "../types";
import {
  generateStaffCandidateHistory,
  staffAssessment,
  staffCareerEvidence,
  staffKnowsLegislature,
} from "./staff-evidence";

function openingWorld(seed: string): World {
  const game = generateOpeningLife(
    prepareOpeningLife({ ...DEFAULT_NEW_GAME_SETUP, seed, startAge: 40 }),
  ).game!;
  return openOrdinaryLife(game.world, game.playerPersonId);
}

describe("GOVERNING D1: a staff assessment reads the record", () => {
  it("says what it does not know about a person with no working history", () => {
    const world = openingWorld("staff-evidence-empty");
    const stranger = world.personOrder.find(
      (id) => workRelationshipHistoryForPerson(world, id).length === 0,
    )!;
    const assessment = staffAssessment(world, stranger);
    expect(assessment.evidence).toBe("limited");
    expect(assessment.background).toMatch(/no record/);
    expect(assessment.caution).toMatch(/without evidence/);
    // No invented years of experience appear anywhere in it.
    expect(`${assessment.background} ${assessment.strength}`).not.toMatch(
      /\d+ years/,
    );
  }, 300_000);

  it("reads canonical posts, dates and employers once written", () => {
    const world = openingWorld("staff-evidence-career");
    const person = world.personOrder.find(
      (id) => workRelationshipHistoryForPerson(world, id).length === 0,
    )!;
    const jurisdictionId = world.people[person]!.homeJurisdictionId;
    const written = generateStaffCandidateHistory(world, {
      personId: person,
      stableKey: "staff-evidence:test-candidate",
      jurisdictionId,
    });
    const posts = staffCareerEvidence(written, person);
    expect(posts.length).toBeGreaterThan(0);
    const assessment = staffAssessment(written, person);
    expect(assessment.evidence).toBe("recorded");
    // Every claim in the background sentence is in the records.
    expect(assessment.background).toContain(posts.at(-1)!.title);
    expect(assessment.background).toContain(posts.at(-1)!.years.toString());
    expect(staffKnowsLegislature(written, person)).toBe(
      posts.some((post) => post.occupation === "profession:legislative-staff"),
    );
    // Writing it twice writes nothing the second time.
    const again = generateStaffCandidateHistory(written, {
      personId: person,
      stableKey: "staff-evidence:test-candidate",
      jurisdictionId,
    });
    expect(serializeWorld(again)).toBe(serializeWorld(written));
    // Two different people do not share one identifier-derived biography.
    const other = world.personOrder.find(
      (id) =>
        id !== person &&
        workRelationshipHistoryForPerson(world, id).length === 0,
    )!;
    const second = generateStaffCandidateHistory(again, {
      personId: other,
      stableKey: "staff-evidence:test-candidate-2",
      jurisdictionId,
    });
    expect(staffAssessment(second, other).background).not.toBe(
      assessment.background,
    );
  }, 300_000);
});

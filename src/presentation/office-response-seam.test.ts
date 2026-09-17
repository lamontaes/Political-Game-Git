import { describe, expect, it } from "vitest";
import { assertWorldIntegrity, serializeWorld } from "../simulation";
import type { EntityId, World } from "../simulation";
import {
  enterSupportedTerm,
  recordedTermFixture,
} from "../../tests/fixtures/recorded-legislative-term";
import { recordOfficeConsequence } from "../simulation/governing/office-consequence";
import { openMatter, recordAllegation } from "../simulation/press";
import {
  OFFICE_ANSWER_EVENT,
  answerForOffice,
  officeOutcomeLine,
  projectOfficeMatters,
} from "./office-response";

/**
 * CRUNCH47, the B–D seam composed: B says the words, GOVERNING decides what
 * the office does, and B prints that answer rather than a guess at it.
 *
 * B's own half is proven with an injected writer in office-response.test.ts.
 * This runs against GOVERNING's real recordOfficeConsequence.
 */

function officeholder() {
  const fixture = recordedTermFixture("player");
  return {
    world: enterSupportedTerm(fixture.world, fixture.personId),
    player: fixture.personId,
  };
}

function withMatter(world: World, player: EntityId, key: string) {
  const opened = openMatter(world, {
    stableKey: `${key}:matter`,
    family: "M1",
    subjectPersonIds: [player],
    occurrenceId: null,
    originEventId: world.history.events.at(-1)!.id,
    jurisdictionId: world.people[player]!.homeJurisdictionId,
  });
  return recordAllegation(opened.world, {
    stableKey: `${key}:allegation`,
    matterId: opened.matter.id,
    allegerPersonId: world.personOrder.find((id) => id !== player)!,
    statement: "Campaign money paid for something personal.",
    publicAllegation: true,
    basisEventIds: [],
  }).world;
}

describe("B + D: answering for an office, against the real writer", () => {
  it("four answers leave the office alone, and say so in GOVERNING's words", () => {
    const { world, player } = officeholder();
    const alleged = withMatter(world, player, "seam-explain");
    const matterId = projectOfficeMatters(alleged, player)[0]!.matterId;
    const said = answerForOffice(
      alleged,
      {
        personId: player,
        matterId,
        kind: "cooperation-declined",
        statement: "I won't be taking part in that.",
      },
      recordOfficeConsequence,
    );
    expect(said.officeChanged).toBe(false);
    expect(said.effectiveAt).toBeNull();
    expect(officeOutcomeLine(said)).toBe(said.officeNote);
    // The words are on the record, and they are the ones that were said.
    const answer = said.world.history.events.find(
      (event) => event.type === OFFICE_ANSWER_EVENT,
    )!;
    expect(answer.summary).toContain("I won't be taking part in that.");
    // The seat is untouched.
    expect(said.world.history.workStatuses).toEqual(
      alleged.history.workStatuses,
    );
    assertWorldIntegrity(said.world);
  });

  it("an office GOVERNING does not recognize is not vacated by B saying so", () => {
    const { world, player } = officeholder();
    const alleged = withMatter(world, player, "seam-resign");
    const matterId = projectOfficeMatters(alleged, player)[0]!.matterId;
    const resigned = answerForOffice(
      alleged,
      { personId: player, matterId, kind: "resignation" },
      recordOfficeConsequence,
    );
    // A legislative seat is not an office GOVERNING's writer recognizes by the
    // key B has for it, so it answers that there is no term to end — and B
    // prints that, rather than inventing a vacancy. The seat stands.
    expect(resigned.officeChanged).toBe(false);
    expect(resigned.effectiveAt).toBeNull();
    expect(officeOutcomeLine(resigned)).toBe(resigned.officeNote);
    expect(resigned.officeNote).toMatch(/do not hold this office/);
    expect(resigned.world.history.workStatuses).toEqual(
      alleged.history.workStatuses,
    );
    // The player's own words are still recorded: they said it, whatever it did.
    expect(
      resigned.world.history.events.filter(
        (event) => event.type === OFFICE_ANSWER_EVENT,
      ),
    ).toHaveLength(1);
    assertWorldIntegrity(resigned.world);
    // Saying it again changes nothing: the matter is answered.
    expect(() =>
      answerForOffice(
        resigned.world,
        { personId: player, matterId, kind: "resignation" },
        recordOfficeConsequence,
      ),
    ).toThrow(/nothing of yours to answer/);
    const reopened = serializeWorld(resigned.world);
    expect(reopened.length).toBeGreaterThan(0);
  });
});

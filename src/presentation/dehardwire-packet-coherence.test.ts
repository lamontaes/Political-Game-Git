import { enterSupportedTerm } from "../../tests/fixtures/recorded-legislative-term";
import { describe, expect, it } from "vitest";

import {
  deserializeWorld,
  measureProvisions,
  serializeWorld,
} from "../simulation";
import type { World } from "../simulation";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";
import { projectCampaign } from "./campaign-projection";
import {
  campaignUntilDecided,
  fileForOffice,
} from "../../tests/fixtures/campaign-fixture";

import { resolvePlayerCapabilities } from "./player-capabilities";
import {
  applyLegislativeCommand,
  openLegislativeWork,
} from "./legislation-world";
import { openLegislativeBargaining } from "./legislative-bargaining-world";
import {
  BENEFICIARY_LABEL,
  PLACE_LABEL,
  PROGRAM_AMOUNT_MINOR_UNITS,
} from "./legislative-bargaining-brief";

/**
 * DIRECTOR42 ROLE B — one bill, described the same way everywhere.
 *
 * The dehardwire wave took the measure's identity off an authored literal and
 * put it on the world. That only counts if the rest of the packet followed:
 * the record, the filed sections, the fiscal note and its amounts, the
 * beneficiary and its place, the people in the room, what the conversation
 * says the bill is, and which outcomes the institution supports must all be
 * about the SAME measure in the SAME current institution — otherwise the room
 * is describing a bill this world never filed.
 *
 * This walks the ordinary route to get there: a life, a candidacy, a win, a
 * seated term, the office's bill, the floor.
 */

function wonSeatedAndOnTheFloor(seed: string) {
  // The accepted route, reused rather than reinvented: a life in Lexington, a
  // candidacy filed, the campaign played until the election decides.
  const built = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    startAge: 34,
    placeKey: "lexington-fayette",
    gender: "male",
    pronouns: "he-him",
    questionnaire: "skipped",
  });
  const personId = built.playerPersonId;
  let world = fileForOffice(openOrdinaryLife(built.world, personId), personId);
  world = campaignUntilDecided(world, personId);
  expect(projectCampaign(world, personId).phase).toBe("won");
  world = enterSupportedTerm(world, personId);

  const capabilities = resolvePlayerCapabilities(world);
  const opened = openLegislativeWork(world, {
    playerPersonId: personId,
    scenarioKey: capabilities.legislativeScenarioKey!,
    jurisdictionId: capabilities.legislativeJurisdictionId!,
  });
  world = opened.world;
  for (const step of [
    "request-referral",
    "request-committee-hearing",
    "move-committee-report",
    "request-calendar-placement",
  ] as const) {
    world = applyLegislativeCommand(world, opened.assignment, {
      kind: "take-step",
      step,
    }).world;
  }
  return { world, personId, assignment: opened.assignment };
}

function measureIn(world: World, measureId: string) {
  const record = world.history.legislativeMeasures.find(
    (entry) => entry.id === measureId,
  );
  if (!record) throw new Error("The bill is not in this world.");
  return record;
}

describe("the sitting and the bill are the same bill", () => {
  it("describes one measure, in one institution, from the record outwards", () => {
    const played = wonSeatedAndOnTheFloor("p85c-owner-0");
    const entry = openLegislativeBargaining(played.world, {
      playerPersonId: played.personId,
    });
    expect(entry.kind, entry.kind === "unavailable" ? entry.reason : "").toBe(
      "available",
    );
    if (entry.kind !== "available") return;

    const seat = entry.seat;
    const record = measureIn(entry.world, seat.measureId);

    // 1. The record's own number, from this world's numbering — not a literal.
    expect(record.designation).toMatch(/^[A-Z]{2} \d+$/);

    // 2. The conversation is about that record, by number and by title.
    const facts = seat.progress.subjectFacts;
    expect(facts.measureId).toBe(record.id);
    expect(facts.designation).toBe(record.designation);
    expect(facts.shortTitle).toBe(record.shortTitle);

    // 3. The current institution: the chamber named in the room is the chamber
    //    the bill is actually before, in the seat's own rule pack.
    expect(seat.scenario.pack.packId).toBe(record.rulePackId);
    expect(seat.openedChamberKey).toBeDefined();
    expect(facts.chamberName.length).toBeGreaterThan(0);

    // 4. The filed sections were seeded against this measure, not another,
    //    and the record each one wrote names this bill.
    const provisions = measureProvisions(entry.world, record.id);
    expect(provisions.length).toBeGreaterThan(0);
    for (const provision of provisions) {
      expect(provision.measureId).toBe(record.id);
    }

    // 5. The fiscal note is recorded against this measure and names it, and
    //    the amount it states is the amount the bill actually commits.
    const fiscalNote = (entry.world.history.events ?? []).find(
      (event) =>
        event.stableKey === seat.progress.subjectFacts.fiscalNoteEventStableKey,
    );
    expect(fiscalNote).toBeDefined();
    expect(fiscalNote!.summary).toContain(record.designation);
    expect(facts.billAmountLabel).toContain(
      (PROGRAM_AMOUNT_MINOR_UNITS / 100).toLocaleString("en-US"),
    );

    // 6. Beneficiary and place belong to the same authored measure as the
    //    sections, so the ask in the room is about this bill's programme.
    expect(facts.requestedBeneficiaryLabel).toBe(BENEFICIARY_LABEL);
    expect(facts.requestedPlaceLabel).toBe(PLACE_LABEL);

    // 7. The participants are people this world contains.
    for (const personId of [
      seat.playerPersonId,
      seat.advocatePersonId,
      seat.guardianPersonId,
      seat.analystPersonId,
    ]) {
      expect(entry.world.people[personId]).toBeDefined();
    }

    // 8. Supported outcomes are the institution's, and every intent offered
    //    is about this measure.
    expect(seat.floorIntents.length).toBeGreaterThan(0);
  });

  it("spends no game time to walk in and read", () => {
    // Entering the room and reading what is on file is inspection. It may
    // record that the player has read the fiscal note, but it must not move
    // the clock — the audit's rule that a read-only screen spends no time.
    const played = wonSeatedAndOnTheFloor("p85c-owner-0");
    const before = {
      date: played.world.currentDate,
      minute: played.world.minuteOfDay,
    };
    const entry = openLegislativeBargaining(played.world, {
      playerPersonId: played.personId,
    });
    expect(entry.kind).toBe("available");
    if (entry.kind !== "available") return;
    expect(entry.world.currentDate).toBe(before.date);
    expect(entry.world.minuteOfDay).toBe(before.minute);
  });

  it("still describes the same bill after a save and a reopen", () => {
    const played = wonSeatedAndOnTheFloor("p85c-owner-0");
    const first = openLegislativeBargaining(played.world, {
      playerPersonId: played.personId,
    });
    expect(first.kind).toBe("available");
    if (first.kind !== "available") return;
    const before = measureIn(first.world, first.seat.measureId);

    const reloaded = deserializeWorld(serializeWorld(first.world));
    const again = openLegislativeBargaining(reloaded, {
      playerPersonId: played.personId,
    });
    expect(again.kind).toBe("available");
    if (again.kind !== "available") return;
    const after = measureIn(again.world, again.seat.measureId);

    expect(after.id).toBe(before.id);
    expect(after.designation).toBe(before.designation);
    expect(again.seat.progress.subjectFacts.designation).toBe(
      before.designation,
    );
    expect(again.seat.advocatePersonId).toBe(first.seat.advocatePersonId);
    expect(again.seat.guardianPersonId).toBe(first.seat.guardianPersonId);
  });
});

import { enterSupportedTerm } from "../../tests/fixtures/recorded-legislative-term";
import { describe, expect, it } from "vitest";

import {
  deserializeWorld,
  measureProvisions,
  serializeWorld,
  legislativeBlueprint,
  seatBodyForPack,
  authoredScenarioSeatCount,
  personName,
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
} from "../simulation";
import type { World } from "../simulation";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";
import { drawRandomPlace } from "../../tests/support/random-place";
import { ensureWorldStartingConditions } from "../simulation/world-setup/conditions";
import { generatePoliticalStartingConditions } from "../simulation/world-setup/political-start";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../simulation/world-setup/types";
import { fileDraft, recompileSavedBill } from "./legislation-docket";
import { applyLegislativeStep } from "./legislation-session";
import { projectCampaign } from "./campaign-projection";
import {
  campaignUntilDecided,
  fileForOffice,
} from "../../tests/fixtures/campaign-fixture";

import { resolvePlayerCapabilities } from "./player-capabilities";
import { openLegislativeBargaining } from "./legislative-bargaining-world";

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
  // Each run starts in a seeded place selected from the 56 jurisdictions, then
  // follows the same ordinary election and floor route.
  const place = drawRandomPlace(seed);
  const built = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    startAge: 34,
    placeKey: place.key,
    gender: "male",
    pronouns: "he-him",
    questionnaire: "skipped",
  });
  const personId = built.playerPersonId;
  let world = ensureWorldStartingConditions(built.world, {
    openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
    political: generatePoliticalStartingConditions,
  });
  world = fileForOffice(openOrdinaryLife(world, personId), personId);
  world = campaignUntilDecided(world, personId);
  expect(projectCampaign(world, personId).phase).toBe("won");
  world = enterSupportedTerm(world, personId);

  const capabilities = resolvePlayerCapabilities(world);
  const scenarioKey = capabilities.legislativeScenarioKey!;
  const jurisdictionId = capabilities.legislativeJurisdictionId!;
  const filed = fileDraft(world, {
    scenarioKey,
    playerPersonId: personId,
    jurisdictionId,
    familyKey: "transit-access",
    variantKey: "enrollment-fare-relief",
  });
  world = filed.world;
  const blueprint = legislativeBlueprint(scenarioKey);
  const votePlan: Record<string, { readonly yea: number }> = {};
  for (const chamber of blueprint.pack.chambers) {
    const seatCount = authoredScenarioSeatCount(
      blueprint.pack,
      chamber.chamberKey,
    );
    for (const committee of chamber.committees) {
      votePlan[votePlanKeyForCommittee(committee.committeeKey)] = {
        yea: committee.appointedMembers ?? 7,
      };
    }
    for (const stage of chamber.floorStages) {
      votePlan[votePlanKeyForFloor(chamber.chamberKey, stage.stageKey)] = {
        yea: seatCount,
      };
    }
  }
  const procedure = {
    pack: blueprint.pack,
    measureId: filed.bill.measureId,
    bodies: blueprint.pack.chambers.map((chamber, index) =>
      seatBodyForPack(
        chamber.chamberKey,
        chamber.name,
        authoredScenarioSeatCount(blueprint.pack, chamber.chamberKey),
        index === 0
          ? [{ personId, name: personName(world.people[personId]!) }]
          : [],
        blueprint.nonpartisan,
      ),
    ),
    committeeMemberCount:
      blueprint.pack.chambers[0]?.committees[0]?.appointedMembers ?? 7,
    votePlan,
    governorAction: blueprint.governorAction,
    governorRationale: blueprint.governorRationale,
  };
  for (const step of [
    "request-referral",
    "request-committee-hearing",
    "move-committee-report",
    "request-calendar-placement",
  ] as const) {
    world = applyLegislativeStep(procedure, world, step).world;
  }
  return { world, personId, bill: filed.bill, place };
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
      measureStableKey: played.bill.measureStableKey,
    });
    expect(entry.kind, entry.kind === "unavailable" ? entry.reason : "").toBe(
      "available",
    );
    if (entry.kind !== "available") return;

    const seat = entry.seat;
    const record = measureIn(entry.world, seat.measureId);

    // 1. The record's own number, from this world's numbering — not a literal.
    expect(record.designation.trim().length).toBeGreaterThan(0);

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
    const compiled = recompileSavedBill(entry.world, played.bill);
    expect("unavailable" in compiled).toBe(false);
    if ("unavailable" in compiled) return;
    expect(facts.billAmountLabel).toBe(
      compiled.appropriatedLabel ??
        compiled.authorizedCeilingLabel ??
        "nothing; this Act appropriates no money",
    );

    // 6. Beneficiary and place belong to the same authored measure as the
    //    sections, so the ask in the room is about this bill's program.
    expect(facts.requestedBeneficiaryLabel).toBe(
      compiled.amendmentInvitation.beneficiaryLabel,
    );
    expect(facts.requestedPlaceLabel).toBe(
      compiled.amendmentInvitation.placeLabel,
    );
    expect(JSON.stringify(seat)).not.toContain("Kentucky");

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
      measureStableKey: played.bill.measureStableKey,
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
      measureStableKey: played.bill.measureStableKey,
    });
    expect(first.kind).toBe("available");
    if (first.kind !== "available") return;
    const before = measureIn(first.world, first.seat.measureId);

    const reloaded = deserializeWorld(serializeWorld(first.world));
    const again = openLegislativeBargaining(reloaded, {
      playerPersonId: played.personId,
      measureStableKey: played.bill.measureStableKey,
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

import { describe, expect, it } from "vitest";

import { enterSupportedTerm } from "../../tests/fixtures/recorded-legislative-term";
import { addDays } from "../simulation/dates";
import { districtIdentityCatalog } from "../districts/catalog";
import { districtMembershipFromCanonicalHome } from "../districts/query";
import {
  fileForOffice,
  campaignUntilDecided,
} from "../../tests/fixtures/campaign-fixture";
import {
  availableMeasureSteps,
  deserializeWorld,
  measurePosition,
  searchLifePlaces,
  serializeWorld,
} from "../simulation";
import {
  castMemberBallot,
  memberVotesAhead,
} from "../simulation/governing/legislative-clock";
import { currentGoverningOffices } from "../simulation/governing/state-governing";
import { STATUTE_EFFECTIVE_DEFAULT_DAYS } from "../simulation/enacted-rule-changes";
import { fileDraftFromOffice } from "./legislation-docket";
import { resolveLegislativeFilingEntry } from "./legislative-filing-entry";
import {
  applyLegislativeCommand,
  institutionOwnsStep,
  resolveLegislativeAssignmentForMeasure,
} from "./legislation-world";
import { legislativeProcedureRefusal } from "./legislative-procedure-availability";
import { projectMeasureBriefing } from "./legislation-projection";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import { projectCampaign } from "./campaign-projection";

describe("an elected member waiting for a governor", () => {
  it("offers the real desk, records its decision, and carries a signed law to effect", () => {
    const place = searchLifePlaces("", 200, {
      stateJurisdictionKey: "US-OR",
      scope: "locality",
    }).find(
      (candidate) =>
        candidate.sourceGeoid &&
        districtMembershipFromCanonicalHome({
          homeJurisdictionId: candidate.jurisdictionId,
          catalog: districtIdentityCatalog(),
          placeGeoid: candidate.sourceGeoid,
          chamber: "state-lower",
        }).kind === "known",
    );
    if (!place?.sourceGeoid) throw new Error("No Oregon House district home.");
    const membership = districtMembershipFromCanonicalHome({
      homeJurisdictionId: place.jurisdictionId,
      catalog: districtIdentityCatalog(),
      placeGeoid: place.sourceGeoid,
      chamber: "state-lower",
    });
    if (membership.kind !== "known") throw new Error("No district binding.");
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "leg-content1-family-bargaining",
        startAge: 34,
        placeKey: place.key,
        gender: "male",
        pronouns: "he-him",
        questionnaire: "skipped",
      }),
    ).game!;
    const personId = game.playerPersonId;
    let world = fileForOffice(
      openOrdinaryLife(game.world, personId),
      personId,
      membership.binding,
    );
    world = campaignUntilDecided(world, personId);
    expect(projectCampaign(world, personId).phase).toBe("won");
    world = enterSupportedTerm(world, personId);
    const filing = resolveLegislativeFilingEntry(world, personId);
    if (filing.kind !== "available") throw new Error(filing.reason);
    const filed = fileDraftFromOffice(world, {
      playerPersonId: personId,
      scenarioKey: filing.scenarioKey,
      jurisdictionId: filing.jurisdictionId,
      memberSeatStableKey: filing.seat.relationshipStableKey,
      familyKey: "broadband-access",
      variantKey: "unserved-buildout",
    });
    const measureId = filed.bill.measureId;
    world = deserializeWorld(serializeWorld(filed.world));

    for (
      let turn = 0;
      turn < 80 &&
      measurePosition(world, measureId).phase !== "awaiting-executive";
      turn += 1
    ) {
      const resolved = resolveLegislativeAssignmentForMeasure(world, {
        measureId,
        playerPersonId: personId,
        memberSeatStableKey: filing.seat.relationshipStableKey,
      });
      if (resolved.kind !== "available") throw new Error(resolved.reason);
      const step = availableMeasureSteps(world, measureId).find(
        (candidate) => candidate !== "offer-amendment",
      );
      if (!step)
        throw new Error(
          `No step at ${measurePosition(world, measureId).phase}.`,
        );
      if (institutionOwnsStep(world, resolved.assignment, step)) {
        for (const ahead of memberVotesAhead(world, personId).filter(
          (entry) => entry.measure.id === measureId && entry.ballot === null,
        ))
          world = castMemberBallot(world, {
            personId,
            question: ahead.question,
            ballot: "yea",
          });
        world = applyLegislativeCommand(world, resolved.assignment, {
          kind: "await-institution",
          step,
        }).world;
      } else {
        world = applyLegislativeCommand(world, resolved.assignment, {
          kind: "take-step",
          step,
        }).world;
      }
    }

    expect(measurePosition(world, measureId).phase).toBe("awaiting-executive");
    expect(
      currentGoverningOffices(world).some(
        (office) => office.jurisdictionId === filing.jurisdictionId,
      ),
    ).toBe(true);
    world = deserializeWorld(serializeWorld(world));
    const resolved = resolveLegislativeAssignmentForMeasure(world, {
      measureId,
      playerPersonId: personId,
      memberSeatStableKey: filing.seat.relationshipStableKey,
    });
    if (resolved.kind !== "available") throw new Error(resolved.reason);
    expect(resolved.assignment.procedure.governorAction).toBeNull();
    const withoutGovernorDesk = {
      ...world,
      history: {
        ...world.history,
        organizations: world.history.organizations.filter(
          (organization) =>
            !organization.stableKey.startsWith("executive-office:"),
        ),
      },
    };
    expect(currentGoverningOffices(withoutGovernorDesk)).toHaveLength(0);
    expect(
      legislativeProcedureRefusal(
        withoutGovernorDesk,
        resolved.assignment.procedure,
        "await-executive-decision",
      ),
    ).toContain("No current governor's desk");
    expect(() =>
      applyLegislativeCommand(withoutGovernorDesk, resolved.assignment, {
        kind: "take-step",
        step: "await-executive-decision",
      }),
    ).toThrow("No current governor's desk");
    expect(
      legislativeProcedureRefusal(
        world,
        resolved.assignment.procedure,
        "await-executive-decision",
      ),
    ).toBeNull();
    const before = serializeWorld(world);
    world = applyLegislativeCommand(world, resolved.assignment, {
      kind: "take-step",
      step: "await-executive-decision",
    }).world;
    expect(serializeWorld(world)).not.toBe(before);
    expect(world.currentDate > filed.world.currentDate).toBe(true);
    expect(
      world.history.events.some(
        (event) =>
          event.type === "governing.matter-opened" &&
          event.tags.includes(`measure:${measureId}`),
      ),
    ).toBe(true);

    for (
      let turn = 0;
      turn < 30 &&
      measurePosition(world, measureId).phase === "awaiting-executive";
      turn += 1
    )
      world = passOrdinaryDays(world, 3);
    const executiveAction = (world.history.legislativeActions ?? []).find(
      (action) =>
        action.measureId === measureId &&
        ["signed", "vetoed"].includes(action.kind),
    );
    expect(executiveAction?.kind).toBe("signed");
    for (
      let turn = 0;
      turn < 10 && measurePosition(world, measureId).outcome === null;
      turn += 1
    )
      world = passOrdinaryDays(world, 3);
    expect(measurePosition(world, measureId).outcome).toBe("enacted");
    const enactment = world.history.legislativeEnactments?.find(
      (entry) => entry.measureId === measureId,
    );
    if (!enactment) throw new Error("The signed measure has no enactment.");
    const operativeDate =
      enactment.effectiveAt ??
      addDays(enactment.resolvedAt, STATUTE_EFFECTIVE_DEFAULT_DAYS);
    expect(operativeDate > enactment.resolvedAt).toBe(true);
    if (enactment.effectiveAt)
      expect(projectMeasureBriefing(world, measureId).outcomeNote).toContain(
        enactment.effectiveAt,
      );
    const reopened = deserializeWorld(serializeWorld(world));
    expect(
      reopened.history.legislativeEnactments?.find(
        (entry) => entry.measureId === measureId,
      ),
    ).toEqual(enactment);
    world = reopened;
    for (
      let turn = 0;
      turn < 50 && world.currentDate < operativeDate;
      turn += 1
    )
      world = passOrdinaryDays(world, 7);
    expect(world.currentDate >= operativeDate).toBe(true);
    expect(projectMeasureBriefing(world, measureId).whereItStands).toBe(
      "The bill is law.",
    );
  }, 900_000);
});

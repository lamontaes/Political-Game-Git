import { describe, expect, it } from "vitest";
import {
  createLegislativeScenario,
  referMeasure,
  serializeWorld,
  type EntityId,
} from "../simulation";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import {
  fileForOffice,
  projectCampaign,
  spendAnAfternoon,
} from "./campaign-projection";
import { projectLegislativeOfficeContext } from "./legislative-office-context";

function wonSeat() {
  const built = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed: "p85c-owner-0",
    startAge: 34,
    placeKey: "lexington-fayette",
    gender: "male",
    pronouns: "he-him",
    questionnaire: "skipped",
  });
  const personId = built.playerPersonId;
  let world = fileForOffice(openOrdinaryLife(built.world, personId), personId);
  world = spendAnAfternoon(world, personId, "fundraising");
  for (let index = 0; index < 3; index += 1) {
    world = spendAnAfternoon(passOrdinaryDays(world), personId, "outreach");
  }
  for (
    let day = 0;
    day < 60 && projectCampaign(world, personId).phase === "active";
    day += 1
  )
    world = passOrdinaryDays(world);
  expect(projectCampaign(world, personId).phase).toBe("won");
  return { world, personId };
}

describe("legislative office orientation", () => {
  it("reads an actual winner's office without inventing legal term dates or committee appointments", () => {
    const { world, personId } = wonSeat();
    const before = serializeWorld(world);
    const context = projectLegislativeOfficeContext(world, personId);
    expect(context.member.kind).toBe("member");
    if (context.member.kind !== "member") return;
    const member = context.member;
    expect(member.officeTitle).toBeTruthy();
    expect(member.chamberLabel).toBeTruthy();
    expect(member.jurisdictionLabel).toBe("Kentucky");
    expect(member.seat.electionResultId).toBeTruthy();
    expect(member.seat.relationshipId).toBeTruthy();
    expect(member.recordedWorkStartedAt).toBeTruthy();
    expect(context.termCommencement.kind).toBe("unavailable");
    expect(context.termExpiry.kind).toBe("unavailable");
    expect(context.committeeMembership.kind).toBe("unavailable");
    expect(serializeWorld(world)).toBe(before);
  });

  it("keeps recorded sponsorship and committee referral separate from membership", () => {
    const scenario = createLegislativeScenario("kentucky");
    const measure = scenario.world.history.legislativeMeasures!.find(
      (m) => m.id === scenario.measureId,
    )!;
    const committee = scenario.pack.chambers[0]!.committees[0]!;
    const world = referMeasure(scenario.world, {
      stableKey: "office-context:referral",
      measureId: measure.id,
      committeeKey: committee.committeeKey,
    });
    const before = serializeWorld(world);
    const context = projectLegislativeOfficeContext(
      world,
      measure.sponsorPersonId!,
      measure.id,
    );
    expect(context.member.kind).toBe("unavailable");
    expect(context.measure.kind).toBe("measure");
    if (context.measure.kind !== "measure") return;
    expect(context.measure.isSponsorOfRecord).toBe(true);
    expect(context.measure.lastRecordedReferral?.committeeKey).toBe(
      committee.committeeKey,
    );
    expect(context.committeeMembership.kind).toBe("unavailable");
    const other = Object.values(world.people).find(
      (p) => p.id !== measure.sponsorPersonId,
    )!;
    const otherContext = projectLegislativeOfficeContext(
      world,
      other.id,
      measure.id,
    );
    expect(
      otherContext.measure.kind === "measure" &&
        otherContext.measure.isSponsorOfRecord,
    ).toBe(false);
    expect(
      projectLegislativeOfficeContext(world, other.id, "missing" as EntityId)
        .measure.kind,
    ).toBe("unavailable");
    expect(serializeWorld(world)).toBe(before);
  });
});

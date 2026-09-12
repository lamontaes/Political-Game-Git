import { describe, expect, it } from "vitest";

import {
  activeCampaignForCandidate,
  addDays,
  campaignActions,
  candidacyPackForJurisdiction,
  deserializeWorld,
  ensureCampaignOpponents,
  fileCampaign,
  makeCurrencyCode,
  recordWorkStatus,
  requireLifePlace,
  serializeWorld,
  workStatusAt,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import { buildProductionWorld } from "./production-world";
import {
  fileForOffice,
  projectCampaign,
  spendAnAfternoon,
} from "./campaign-projection";
import {
  commitCampaignStrategy,
  projectCampaignStrategy,
  projectLatestCampaignStrategyReport,
} from "./campaign-strategy";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";

function soloCampaign(seed: string) {
  const built = buildProductionWorld({
    seed,
    place: requireLifePlace("kentucky"),
    age: 34,
    givenName: null,
    familyName: null,
    startingLife: "ordinary-life",
    household: "lives-alone",
    depth: "summarize-earlier-life",
  });
  const world = openOrdinaryLife(built.world, built.playerPersonId);
  return {
    personId: built.playerPersonId,
    world: fileForOffice(world, built.playerPersonId),
  };
}
function staffedCampaign(seed: string): {
  readonly world: World;
  readonly personId: EntityId;
  readonly staffPersonId: EntityId;
} {
  const built = buildProductionWorld({
    seed,
    place: requireLifePlace("kentucky"),
    age: 34,
    givenName: null,
    familyName: null,
    startingLife: "ordinary-life",
    household: "shares-a-home",
    depth: "summarize-earlier-life",
  });
  const opened = openOrdinaryLife(built.world, built.playerPersonId);
  const person = opened.people[built.playerPersonId]!;
  const staffPersonId = opened.personOrder.find(
    (personId) => personId !== built.playerPersonId,
  );
  if (!staffPersonId) throw new Error("Expected a second established person.");
  const option = candidacyPackForJurisdiction(
    person.homeJurisdictionId,
  )?.offices.at(0);
  if (!option) throw new Error("Expected a supported office.");
  const opponents = ensureCampaignOpponents(opened, {
    stableKey: `staffed:${seed}`,
    jurisdictionId: person.homeJurisdictionId,
    count: 1,
    excludePersonIds: [built.playerPersonId, staffPersonId],
  });
  const filed = fileCampaign(opponents.world, {
    stableKey: `staffed:${seed}:campaign`,
    candidatePersonId: built.playerPersonId,
    jurisdictionId: person.homeJurisdictionId,
    officeKey: option.officeKey,
    electionDate: addDays(opened.currentDate, 28),
    rivalPersonIds: opponents.personIds,
    existingContestId: null,
    committeeName: "A test committee",
    donorPoolName: "A test supporter pool",
    advertisingVendorName: "A test advertising vendor",
    staffPersonIds: [staffPersonId],
    treasuryCurrency: makeCurrencyCode("USD"),
  });
  return {
    world: filed.world,
    personId: built.playerPersonId,
    staffPersonId,
  };
}

function selectedInput(
  proposal: NonNullable<ReturnType<typeof projectCampaignStrategy>>,
  priorityKey = proposal.proposedPriorityKey,
) {
  const priority = proposal.priorityChoices.find(
    (choice) => choice.key === priorityKey,
  )!;
  return {
    campaignId: proposal.campaignId,
    proposerPersonId: proposal.proposerPersonId,
    priorityKey,
    geographyKey: proposal.geographyChoices[0]!.key,
    spendingKey: priority.spendingChoices[0]!.key,
  };
}

describe("the first staff-strategy campaign interaction", () => {
  it("supports an honest solo plan, explicit buy, visible report, and reload", () => {
    const life = soloCampaign("strategy-solo");
    const first = projectCampaignStrategy(life.world, life.personId)!;
    expect(first.proposerPersonId).toBeNull();
    expect(first.attribution).toMatch(/without campaign staff/i);
    expect(first.knownSituation.join(" ")).toMatch(/committee currently has/i);
    expect(first.geographyChoices).toHaveLength(1);
    expect(first.geographyChoices[0]!.explanation).toMatch(/no finer/i);

    let world = commitCampaignStrategy(
      life.world,
      life.personId,
      selectedInput(first, "fundraising"),
    );
    world = passOrdinaryDays(world, 1);
    const funded = projectCampaignStrategy(world, life.personId)!;
    const advertising = funded.priorityChoices.find(
      (choice) => choice.key === "advertising",
    )!;
    expect(advertising.unavailable).toBeNull();
    expect(advertising.spendingChoices.length).toBeGreaterThan(1);
    expect(
      advertising.spendingChoices.every((choice) =>
        choice.label.includes(choice.amount.currency),
      ),
    ).toBe(true);

    const selected = advertising.spendingChoices[0]!;
    world = commitCampaignStrategy(world, life.personId, {
      campaignId: funded.campaignId,
      proposerPersonId: funded.proposerPersonId,
      priorityKey: "advertising",
      geographyKey: funded.geographyChoices[0]!.key,
      spendingKey: selected.key,
    });
    const action = campaignActions(
      world,
      activeCampaignForCandidate(world, life.personId)!.id,
    ).at(-1)!;
    expect(action.plannedSpend).toEqual(selected.amount);
    expect(action.strategy?.approvedSpendCeiling).toEqual(selected.amount);
    expect(action.strategy?.geographyKey).toBe(funded.geographyChoices[0]!.key);

    const report = projectLatestCampaignStrategyReport(world, life.personId)!;
    expect(report.actualSpend).toEqual(selected.amount);
    expect(report.outcome).toContain(report.geographyLabel);
    expect(report.observedResult).not.toBeNull();

    const reloaded = deserializeWorld(serializeWorld(world));
    expect(
      projectLatestCampaignStrategyReport(reloaded, life.personId),
    ).toEqual(report);
  });

  it("attributes a proposal only to active staff and records disagreement", () => {
    const life = staffedCampaign("strategy-staff");
    const proposal = projectCampaignStrategy(life.world, life.personId)!;
    expect(proposal.proposerPersonId).toBe(life.staffPersonId);
    expect(proposal.attribution).toMatch(/active campaign staff/i);

    const world = commitCampaignStrategy(
      life.world,
      life.personId,
      selectedInput(proposal, "outreach"),
    );
    const report = projectLatestCampaignStrategyReport(world, life.personId)!;
    expect(report.agreement).toBe("changed-plan");
    expect(report.attribution).toMatch(/proposed the starting priority/i);
  });

  it("refuses a stale proposal after the named staff member departs", () => {
    const life = staffedCampaign("strategy-departure");
    const proposal = projectCampaignStrategy(life.world, life.personId)!;
    const campaign = activeCampaignForCandidate(life.world, life.personId)!;
    const workId = campaign.staffWorkRelationshipIds[0]!;
    const status = workStatusAt(life.world, workId)!;
    const changed = recordWorkStatus(life.world, {
      stableKey: `${campaign.stableKey}:staff-departed:test`,
      workRelationshipId: workId,
      effectiveAt: life.world.currentDate,
      status: "ended",
      reason: "They left the campaign.",
      provenance: {
        kind: "authored",
        note: "Feature control for a changed staff situation.",
      },
      supersedesStatusId: status.id,
    });

    expect(
      projectCampaignStrategy(changed, life.personId)!.proposerPersonId,
    ).toBeNull();
    expect(() =>
      commitCampaignStrategy(changed, life.personId, selectedInput(proposal)),
    ).toThrow(/staff situation changed/i);
  });

  it("refuses an old spending choice after committee funds change", () => {
    const life = soloCampaign("strategy-funds-change");
    let world = spendAnAfternoon(life.world, life.personId, "fundraising");
    world = passOrdinaryDays(world, 1);
    const proposal = projectCampaignStrategy(world, life.personId)!;
    const advertising = proposal.priorityChoices.find(
      (choice) => choice.key === "advertising",
    )!;
    const largest = advertising.spendingChoices.at(-1)!;
    const stale = {
      campaignId: proposal.campaignId,
      proposerPersonId: proposal.proposerPersonId,
      priorityKey: "advertising" as const,
      geographyKey: proposal.geographyChoices[0]!.key,
      spendingKey: largest.key,
    };

    world = spendAnAfternoon(world, life.personId, "advertising");
    world = passOrdinaryDays(world, 1);
    expect(
      projectCampaign(world, life.personId).treasury.minorUnits,
    ).toBeLessThan(largest.amount.minorUnits);
    expect(() => commitCampaignStrategy(world, life.personId, stale)).toThrow(
      /funds changed/i,
    );
  });
});

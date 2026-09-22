import { describe, expect, it } from "vitest";

import {
  addDays,
  campaignForCandidate,
  campaignState,
  ensureCampaignOpponents,
  ensureStateJurisdiction,
  fileCampaign,
  deserializeWorld,
  makeCurrencyCode,
  searchLifePlaces,
  serializeWorld,
  stateExecutiveIdentity,
  stateJurisdictionForKey,
} from "../simulation";
import type { World } from "../simulation";
import {
  CANDIDATE_PAYMENTS_REPORTED_EVENT,
  generatedStateOversightBody,
  pressRecordsOfKind,
  publicAdverseFindingsAgainst,
  spendCampaignFundsPersonally,
  UNRESEARCHED_FINDING_EFFECTS,
  UNRESEARCHED_REPEAT_OFFENSE,
  UNRESEARCHED_STATE_OVERSIGHT,
} from "../simulation/press";
import { canonicalSupportBasisPoints } from "../simulation/campaigns";
import { resourcePositionAt } from "../simulation/resource-queries";
import { supportAfterLoss } from "../simulation/campaign-support";
import { spendAnAfternoon } from "./campaign-projection";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";

function adultLifeIn(usps: string, seed: string) {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: `US-${usps}`,
    scope: "locality",
  })[0]!;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  return {
    world: openOrdinaryLife(game.world, game.playerPersonId),
    personId: game.playerPersonId,
  };
}

/**
 * The Nome case, in Washington: a governor's candidate with no staff pays
 * themselves from the committee twice, a week apart, and does nothing else.
 * Nobody keeps the books. The payments reach the committee's public reports;
 * from there a rival or the state's own review of reports opens the matter,
 * and Washington's generated oversight body (its researched ethics body
 * covers the legislature, not this office) runs it to a finding.
 */
function washingtonFinding() {
  const { world, personId } = adultLifeIn("WA", "ethics-consequences-wa");
  const identity = stateExecutiveIdentity("WA")!;
  const jurisdictionId = stateJurisdictionForKey("US-WA")!.id;
  const opponents = ensureCampaignOpponents(
    ensureStateJurisdiction(world, "WA"),
    {
      stableKey: "ethics-consequences",
      jurisdictionId,
      count: 1,
      excludePersonIds: [personId],
    },
  );
  const rivalId = opponents.personIds[0]!;
  const filed = fileCampaign(opponents.world, {
    stableKey: "ethics-consequences",
    candidatePersonId: personId,
    jurisdictionId,
    officeKey: identity.officeKey,
    districtBinding: null,
    electionDate: addDays(world.currentDate, 480),
    rivalPersonIds: opponents.personIds,
    existingContestId: null,
    committeeName: "Committee for the Washington fixture",
    donorPoolName: "Supporters, in aggregate",
    advertisingVendorName: "Advertising, in aggregate",
    staffPersonIds: [],
    treasuryCurrency: makeCurrencyCode("USD"),
  });
  const funded = spendAnAfternoon(filed.world, personId, "fundraising");
  const campaign = campaignForCandidate(funded, personId)!;
  const first = spendCampaignFundsPersonally(funded, {
    stableKey: "ethics-consequences:misuse:1",
    amountMinorUnits: 20_000,
    purpose: "a boat payment",
  });
  const second = spendCampaignFundsPersonally(
    passOrdinaryDays(first.world, 7),
    {
      stableKey: "ethics-consequences:misuse:2",
      amountMinorUnits: 20_000,
      purpose: "another boat payment",
    },
  );
  let after = second.world;
  const finding = (w: World) =>
    pressRecordsOfKind(w, "proceeding-step").find(
      (step) => step.outcome === "finding",
    );
  for (let chunk = 0; chunk < 14 && !finding(after); chunk += 1) {
    after = passOrdinaryDays(after, 30);
  }
  const step = finding(after)!;
  const proceeding = pressRecordsOfKind(after, "matter-proceeding").find(
    (row) => row.id === step.proceedingId,
  )!;
  const own = (w: World) =>
    resourcePositionAt(w, { kind: "person", personId }, makeCurrencyCode("USD"))
      ?.liquidBalance.minorUnits ?? null;
  return {
    after,
    personId,
    rivalId,
    campaign,
    ownBefore: own(funded),
    ownAfterFirst: own(first.world),
    step,
    proceeding,
    occurrences: [first.occurrence, second.occurrence],
  };
}

describe("a Washington candidate paying themselves is noticed and punished", () => {
  const run = washingtonFinding();

  it("puts the money taken in the candidate's own account", () => {
    // Before the Nome playtest fix, a life with no tracked personal account
    // lost the money: the committee paid it and nobody received it.
    expect(run.ownAfterFirst).toBe((run.ownBefore ?? 0) + 20_000);
  });

  it("puts the payments on a public report, without the private purpose", () => {
    const reports = run.after.history.events.filter(
      (event) => event.type === CANDIDATE_PAYMENTS_REPORTED_EVENT,
    );
    expect(reports.length).toBeGreaterThan(0);
    expect(reports.every((event) => event.visibility === "public")).toBe(true);
    expect(reports.some((event) => event.summary.includes("boat"))).toBe(false);
    const reportedFlows = new Set(
      reports.flatMap((event) => event.involvedEntityIds),
    );
    for (const occurrence of run.occurrences)
      for (const flowId of occurrence.resourceFlowIds)
        expect(reportedFlows.has(flowId)).toBe(true);
  });

  it("reaches a public finding by Washington's generated oversight body", () => {
    const body = generatedStateOversightBody(
      run.after,
      run.campaign.jurisdictionId,
    )!;
    expect(run.proceeding.procedureKey).toBe("generated-state-oversight");
    expect(run.proceeding.institutionLabel).toBe(body.name);
    expect(body.name.startsWith("Washington ")).toBe(true);
    expect(run.step.publicStep).toBe(true);
    // Whoever noticed first: the rival, or the body's own review of reports.
    expect([run.rivalId, null]).toContain(run.proceeding.complainantPersonId);
    expect(publicAdverseFindingsAgainst(run.after, run.personId)).toHaveLength(
      1,
    );
  });

  it("costs the candidate support in the open race, handed to the rival", () => {
    const lossStates = run.after.history.metricStates.filter((state) =>
      state.stableKey.startsWith(`${run.step.stableKey}:finding-support:`),
    );
    expect(lossStates).toHaveLength(2);
    const lossIndex = run.after.history.metricStates.indexOf(lossStates[0]!);
    const justBefore: World = {
      ...run.after,
      history: {
        ...run.after.history,
        metricStates: run.after.history.metricStates.slice(0, lossIndex),
      },
    };
    const expected = supportAfterLoss(
      justBefore,
      run.campaign,
      run.personId,
      UNRESEARCHED_FINDING_EFFECTS.supportLossBasisPoints.finding,
    );
    const [playerState, rivalState] = [run.personId, run.rivalId].map((id) =>
      lossStates.find((state) => state.stableKey.endsWith(`:support:${id}`))!,
    );
    const share = (state: typeof playerState) =>
      state!.value.kind === "quantity"
        ? (state!.value.quantity.numerator * 10_000) /
          state!.value.quantity.denominator
        : NaN;
    expect(share(playerState)).toBe(expected[run.personId]);
    expect(share(rivalState)).toBe(expected[run.rivalId]);
    expect(
      canonicalSupportBasisPoints(justBefore, run.campaign, run.personId) -
        share(playerState),
    ).toBe(UNRESEARCHED_FINDING_EFFECTS.supportLossBasisPoints.finding);
  });

  it("orders both payments repaid to the committee", () => {
    const order = run.after.history.events.find(
      (event) =>
        event.type === "matter.restitution-ordered" &&
        event.stableKey.startsWith(run.step.stableKey),
    )!;
    expect(order.visibility).toBe("public");
    const flow = run.after.history.resourceFlows.find(
      (row) => row.basisKind === "custom:ethics-restitution",
    )!;
    const repaid = run.after.history.resourceTransferOutcomes.find(
      (row) => row.resourceFlowId === flow.id,
    )!;
    expect(repaid.attemptedAmount.minorUnits).toBe(40_000);
    expect(flow.recipient).toEqual({
      kind: "organization",
      organizationId: run.campaign.organizationId,
    });
  });

  it("fines the candidate per payment, paid to the state", () => {
    const body = generatedStateOversightBody(
      run.after,
      run.campaign.jurisdictionId,
    )!;
    const fine = run.after.history.events.find(
      (event) => event.type === "matter.civil-penalty-imposed",
    )!;
    expect(fine.visibility).toBe("public");
    const flow = run.after.history.resourceFlows.find(
      (row) => row.basisKind === "custom:civil-penalty",
    )!;
    const outcome = run.after.history.resourceTransferOutcomes.find(
      (row) => row.resourceFlowId === flow.id,
    )!;
    expect(outcome.attemptedAmount.minorUnits).toBe(
      body.civilPenaltyPerPaymentMinorUnits * 2,
    );
    // Paid when they hold it; otherwise the fine stands unpaid, and says so.
    expect(["completed", "blocked"]).toContain(outcome.status);
    expect(fine.summary).toContain(
      outcome.status === "completed" ? "paid it" : "stands unpaid",
    );
  });

  it("lets the people around the candidate read it and decide for themselves", () => {
    const readers = run.after.history.knowledge.filter(
      (record) =>
        record.eventId === run.step.eventId &&
        record.stableKey.includes(":read-by:"),
    );
    expect(readers.length).toBeGreaterThan(0);
    expect(readers.map((r) => r.personId)).not.toContain(run.rivalId);
    const responses = pressRecordsOfKind(run.after, "matter-response").filter(
      (response) =>
        readers.some((reader) => response.knowledgeIds.includes(reader.id)),
    );
    expect(new Set(responses.map((r) => r.actorPersonId))).toEqual(
      new Set(readers.map((reader) => reader.personId)),
    );
    for (const response of responses) {
      const interaction = run.after.history.relationshipInteractions.find(
        (row) =>
          row.personIds.includes(response.actorPersonId) &&
          row.eventId === response.eventId,
      );
      if (response.response === "distance")
        expect(interaction?.change).toBe("strained");
    }
  });

  it("survives a save", () => {
    const reopened = deserializeWorld(serializeWorld(run.after));
    expect(publicAdverseFindingsAgainst(reopened, run.personId)).toEqual(
      publicAdverseFindingsAgainst(run.after, run.personId),
    );
  });
});

/**
 * The replay that found three holes: payments after a finding were never
 * charged, money taken late in a campaign was never reviewed once the
 * campaign ended, and the candidate's hometown paper never covered the case.
 * The same Washington candidate keeps paying themselves after the finding,
 * once more just before the election, and the world runs on past it.
 */
describe("a Washington candidate who keeps taking after a finding", () => {
  const run = washingtonFinding();
  const rent = (w: World, key: string) =>
    spendCampaignFundsPersonally(w, {
      stableKey: `ethics-consequences:after:${key}`,
      amountMinorUnits: 10_000,
      purpose: "rent",
    });
  let world = run.after;
  const later: string[] = [];
  for (let month = 0; month < 3; month += 1) {
    const paid = rent(world, `${month}`);
    later.push(...paid.occurrence.resourceFlowIds);
    world = passOrdinaryDays(paid.world, 30);
  }
  const second = () =>
    pressRecordsOfKind(world, "proceeding-step").filter(
      (step) => step.outcome === "finding",
    );
  for (let chunk = 0; chunk < 14 && second().length < 2; chunk += 1) {
    world = passOrdinaryDays(world, 30);
  }
  const findings = second();
  // One more payment in the campaign's last weeks, then past election day.
  const electionDate = addDays(run.campaign.filedAt, 480);
  while (addDays(world.currentDate, 21) < electionDate) {
    world = passOrdinaryDays(world, 7);
  }
  const lastWeeks = rent(world, "last-weeks");
  world = lastWeeks.world;
  const afterElection = addDays(electionDate, 60);
  while (world.currentDate < afterElection) {
    world = passOrdinaryDays(world, 30);
  }

  it("opens a new round for each batch taken after a finding", () => {
    const matters = pressRecordsOfKind(world, "matter").filter((matter) =>
      matter.stableKey.startsWith(
        `press46:candidate-payments:${run.campaign.id}`,
      ),
    );
    // The first case; the three rent payments after its finding; and the
    // last-weeks payment, taken after the second finding.
    expect(matters.map((matter) => matter.stableKey.split(":").at(-1))).toEqual(
      [run.campaign.id, "2", "3"],
    );
    expect(findings).toHaveLength(2);
  });

  it("orders the later payments repaid, and only those", () => {
    const repaid = world.history.resourceFlows
      .filter((row) => row.basisKind === "custom:ethics-restitution")
      .map(
        (flow) =>
          world.history.resourceTransferOutcomes.find(
            (row) => row.resourceFlowId === flow.id,
          )!.attemptedAmount.minorUnits,
      );
    expect(repaid).toEqual([40_000, 30_000]);
  });

  it("fines a repeat finding more heavily, and says why", () => {
    const body = generatedStateOversightBody(
      world,
      run.campaign.jurisdictionId,
    )!;
    const fines = world.history.resourceFlows
      .filter((row) => row.basisKind === "custom:civil-penalty")
      .map(
        (flow) =>
          world.history.resourceTransferOutcomes.find(
            (row) => row.resourceFlowId === flow.id,
          )!.attemptedAmount.minorUnits,
      );
    expect(fines).toEqual([
      body.civilPenaltyPerPaymentMinorUnits * 2,
      body.civilPenaltyPerPaymentMinorUnits *
        3 *
        (1 + UNRESEARCHED_REPEAT_OFFENSE.civilPenaltyStepPerPriorFinding),
    ]);
    const notices = world.history.events.filter(
      (event) => event.type === "matter.civil-penalty-imposed",
    );
    expect(notices[0]!.summary).not.toContain("found against before");
    expect(notices[1]!.summary).toContain("found against before");
  });

  it("still reports money taken in the campaign's last weeks after it ends", () => {
    expect(campaignState(world, run.campaign.id).status).not.toBe("active");
    const reported = new Set(
      world.history.events
        .filter((event) => event.type === CANDIDATE_PAYMENTS_REPORTED_EVENT)
        .flatMap((event) => event.involvedEntityIds),
    );
    for (const flowId of [...later, ...lastWeeks.occurrence.resourceFlowIds])
      expect(reported.has(flowId)).toBe(true);
  });

  it("is covered by the candidate's hometown paper", () => {
    const home = world.people[run.personId]!.homeJurisdictionId;
    const hometown = pressRecordsOfKind(world, "media-outlet").filter(
      (outlet) =>
        outlet.scope === "local" &&
        outlet.primaryJurisdictionIds.includes(home),
    );
    expect(hometown.length).toBeGreaterThan(0);
    const leads = pressRecordsOfKind(world, "story-lead").filter(
      (lead) =>
        hometown.some((outlet) => outlet.id === lead.outletId) &&
        lead.matterId !== null,
    );
    expect(leads.length).toBeGreaterThan(0);
  });
});

describe("a generated oversight body", () => {
  it("is the same body for a state every time and differs between states", () => {
    const { world } = adultLifeIn("OR", "generated-body-or");
    const withStates = ["NM", "GA", "ME"].reduce(
      (w, usps) => ensureStateJurisdiction(w, usps),
      world,
    );
    const bodies = ["US-NM", "US-GA", "US-ME"].map((key) =>
      generatedStateOversightBody(
        withStates,
        stateJurisdictionForKey(key)!.id,
      )!,
    );
    expect(bodies.map((body) => body.name.split(" ")[0])).toEqual([
      "New",
      "Georgia",
      "Maine",
    ]);
    const again = generatedStateOversightBody(
      deserializeWorld(serializeWorld(withStates)),
      stateJurisdictionForKey("US-GA")!.id,
    );
    expect(again).toEqual(bodies[1]);
    const rule = UNRESEARCHED_STATE_OVERSIGHT;
    for (const body of bodies) {
      expect(body.reportReviewDays).toBeGreaterThanOrEqual(
        rule.reportReviewDays[0],
      );
      expect(body.reportReviewDays).toBeLessThanOrEqual(
        rule.reportReviewDays[1],
      );
      expect(body.civilPenaltyPerPaymentMinorUnits).toBeGreaterThanOrEqual(
        rule.civilPenaltyPerPaymentMinorUnits[0],
      );
      expect(body.civilPenaltyPerPaymentMinorUnits).toBeLessThanOrEqual(
        rule.civilPenaltyPerPaymentMinorUnits[1],
      );
    }
    expect(
      new Set(bodies.map((body) => JSON.stringify(body.intervalDays))).size,
    ).toBeGreaterThan(1);
  });
});

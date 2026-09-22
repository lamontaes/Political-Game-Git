import { describe, expect, it } from "vitest";

import {
  addDays,
  ageOnDate,
  campaignForCandidate,
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
  fileComplaint,
  openMatter,
  pressRecordsOfKind,
  procedureForSubject,
  publicAdverseFindingsAgainst,
  spendCampaignFundsPersonally,
  UNRESEARCHED_FINDING_EFFECTS,
} from "../simulation/press";
import { canonicalSupportBasisPoints } from "../simulation/campaigns";
import { supportAfterLoss } from "../simulation/campaign-support";
import { recordEvidenceDiscovery } from "../simulation/evidence";
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
 * A Washington life running for governor misuses campaign money, the books
 * show it, a rival complains, and the review the game can honestly run for a
 * governor's race (a simulated inquiry: Washington's researched ethics body
 * covers its legislature, not this office) issues a public report.
 */
function washingtonReport() {
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
    electionDate: addDays(world.currentDate, 300),
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
  const misused = spendCampaignFundsPersonally(funded, {
    stableKey: "ethics-consequences:misuse",
    amountMinorUnits: 40_000,
    purpose: "a boat payment",
  });
  const bookkeeperId = misused.world.personOrder.find(
    (id) =>
      id !== personId &&
      id !== rivalId &&
      ageOnDate(
        misused.world.people[id]!.birthDate,
        misused.world.currentDate,
      ) >= 18,
  )!;
  const ledgerId = misused.occurrence.recordEvidenceArtifactIds[0]!;
  const discovered = recordEvidenceDiscovery(misused.world, {
    stableKey: "ethics-consequences:ledger-found",
    personId: bookkeeperId,
    evidenceArtifactId: ledgerId,
    discoveredAt: misused.world.currentDate,
    recordedAt: misused.world.currentDate,
    methodKey: "work:bookkeeping-review",
    provenance: {
      kind: "simulated",
      sourceEntityIds: [ledgerId, misused.occurrence.occurrenceEventId].sort(),
    },
  });
  const opened = openMatter(discovered, {
    stableKey: "ethics-consequences:matter",
    family: "M1",
    subjectPersonIds: [personId],
    occurrenceId: misused.occurrence.id,
    originEventId: discovered.history.events.at(-1)!.id,
    jurisdictionId,
  });
  const procedureKey = procedureForSubject(opened.world, personId, campaign);
  const complained = fileComplaint(opened.world, {
    stableKey: "ethics-consequences:complaint",
    matterId: opened.matter.id,
    complainantPersonId: rivalId,
    procedureKey,
  }).world;
  const beforeReport = canonicalSupportBasisPoints(
    complained,
    campaign,
    personId,
  );
  const after = passOrdinaryDays(complained, 40);
  return {
    after,
    personId,
    rivalId,
    campaign,
    procedureKey,
    beforeReport,
    matterId: opened.matter.id,
  };
}

describe("an ethics outcome against a Washington candidate has consequences", () => {
  const run = washingtonReport();
  const proceeding = pressRecordsOfKind(run.after, "matter-proceeding").find(
    (row) => row.matterId === run.matterId,
  )!;
  const report = pressRecordsOfKind(run.after, "proceeding-step").find(
    (step) => step.proceedingId === proceeding.id && step.outcome !== null,
  )!;

  it("routes a governor's race to the honest simulated review and reports", () => {
    expect(run.procedureKey).toBe("simulated-inquiry");
    expect(report.outcome).toBe("report-issued");
    expect(report.publicStep).toBe(true);
    expect(publicAdverseFindingsAgainst(run.after, run.personId)).toHaveLength(
      1,
    );
  });

  it("costs the candidate support in the open race, handed to the rival", () => {
    const lossStates = run.after.history.metricStates.filter((state) =>
      state.stableKey.startsWith(`${report.stableKey}:finding-support:`),
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
      UNRESEARCHED_FINDING_EFFECTS.supportLossBasisPoints["report-issued"],
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
    ).toBe(
      UNRESEARCHED_FINDING_EFFECTS.supportLossBasisPoints["report-issued"],
    );
  });

  it("orders no repayment, because a simulated review has no such power", () => {
    expect(
      run.after.history.events.some(
        (event) => event.type === "matter.restitution-ordered",
      ),
    ).toBe(false);
  });

  it("lets the people around the candidate read it and decide for themselves", () => {
    const readers = run.after.history.knowledge.filter(
      (record) =>
        record.eventId === report.eventId &&
        record.stableKey.includes(":read-by:"),
    );
    // Family and household here; the complainant was already told.
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

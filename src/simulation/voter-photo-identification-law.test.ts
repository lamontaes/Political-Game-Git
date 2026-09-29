import { describe, expect, it } from "vitest";
import { openWatchedWorld } from "../../scripts/dev-lab/world-aging";
import { prepareLawPair } from "../../scripts/laws-proof/enact";
import { advanceObservedWorld } from "../presentation/observer-world";
import { settleJobPay } from "./job-market";
import { activeWorkRelationshipsAt } from "./life-queries";
import { createWorkRelationship } from "./life";
import { createWorkCompensation, money } from "./resources";
import { addDays, ageOnDate } from "./dates";
import { stateJurisdictionForKey } from "./life-places";
import { legislatureForState } from "./legislature-game-profile";
import {
  scheduleElectionContest,
  resolveElectionContest,
  electionContestResult,
} from "./election-contests";
import {
  applyVoterIdentification,
  castIdentifiedBallot,
  cureIdentifiedBallot,
  ensureVoterIdentification,
  voterIdExpenseDollars,
  PHOTO_ID_QUESTION,
} from "./voter-photo-identification-law";
import { assertWorldIntegrity, recordWorldEvent } from "./world";
import { deserializeWorld, serializeWorld } from "./serialization";

describe("photo identification reaches state costs and actual ballot counting", () => {
  it("pays only for a resident's recorded intent and counts a provisional ballot only after an actual return", () => {
    const opened = openWatchedWorld("photo-id-cost-and-cure", "1700113");
    const question = Object.values(
      opened.world.policyCatalog.propositions,
    ).find((p) => p.stableKey === PHOTO_ID_QUESTION)!;
    let base = ensureVoterIdentification(opened.world);
    const resident = Object.values(base.voterIdentification!.people).find(
      (p) =>
        !p.estimatedCurrentId &&
        p.stateKey === "US-IL" &&
        p.personId !== opened.anchorPersonId &&
        ageOnDate(base.people[p.personId]!.birthDate, base.currentDate) >= 25 &&
        ageOnDate(base.people[p.personId]!.birthDate, base.currentDate) <= 65 &&
        activeWorkRelationshipsAt(base, p.personId).length === 0,
    )!;
    expect(resident).toBeDefined();
    const employer = base.history.organizations.find((o) =>
      base.history.organizationProfiles.some(
        (p) =>
          p.organizationId === o.id &&
          p.locationJurisdictionId ===
            base.people[resident.personId]!.homeJurisdictionId,
      ),
    )!;
    expect(employer).toBeDefined();
    base = createWorkRelationship(base, {
      stableKey: "photo-id-fixture:hourly-work",
      personId: resident.personId,
      organizationId: employer.id,
      startedAt: base.currentDate,
      kind: "employment:local-business",
      compensation: "paid",
      authority: "directed",
      dependency: "partly-dependent",
      economicRisk: "organization-borne",
      provenance: {
        kind: "authored",
        note: "Matched fictional hourly work to measure an actual ID visit against weekly payroll.",
      },
      initialRole: {
        title: "Hourly fixture worker",
        occupationClassification: "occupation:cashier",
        locationJurisdictionId:
          base.people[resident.personId]!.homeJurisdictionId,
        timeDemand: {
          expectedWeekly: { minimumHours: 40, maximumHours: 40 },
          attention: "moderate",
          concurrency: "mostly-exclusive",
          scheduleRigidity: "rigid",
          interruptibility: "limited",
          locationJurisdictionId:
            base.people[resident.personId]!.homeJurisdictionId,
        },
      },
    });
    const work = base.history.workRelationships.at(-1)!;
    base = createWorkCompensation(base, {
      stableKey: `job-pay:${work.id}`,
      workRelationshipId: work.id,
      startsAt: base.currentDate,
      amount: money(80000, "USD"),
      cadenceKind: "schedule:weekly",
      restrictionKind: null,
      jurisdictionId: base.people[resident.personId]!.homeJurisdictionId,
      provenance: {
        kind: "authored",
        note: "Controlled hourly fixture: 20 dollars an hour, 40 hours a week.",
      },
    });
    base = recordWorldEvent(base, {
      stableKey: "photo-id-fixture:prior-civic-engagement",
      type: "life.attended-public-meeting",
      occurredAt: base.currentDate,
      recordedAt: base.currentDate,
      jurisdictionId: base.people[resident.personId]!.homeJurisdictionId,
      involvedEntityIds: [resident.personId],
      participants: [
        {
          personId: resident.personId,
          role: "presence:participant",
          detail: "Controlled fictional prior civic engagement",
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: [],
      summary: "The resident attended a public meeting.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: "Attend the meeting.",
        motivation: "Recorded civic interest in this controlled fixture.",
        immediateReaction: null,
      },
    });
    const pair = prepareLawPair(base, {
      jurisdictionId: stateJurisdictionForKey("US-IL")!.id,
      rulePackId: legislatureForState("US-IL")!.packId,
      propositionId: question.id,
      sponsorPersonId: opened.anchorPersonId,
      advance: advanceObservedWorld,
      policyTerms: [
        {
          questionKey: PHOTO_ID_QUESTION,
          values: {
            idProductionCostCents: 263,
            annualOutreachPerAdultCents: 5,
            cureDays: 7,
            requiresReturnOnly: 1,
          },
          reason:
            "Explicit fictional photo identification bill for the matched test.",
          principleRecordIds: [],
        },
      ],
    });
    let treated = ensureVoterIdentification(pair.treated);
    const payControl = pair.control;
    treated = applyVoterIdentification(treated);
    expect(
      treated.voterIdentification!.people[resident.personId]!.acquiredOn,
    ).toBeNull();
    treated = advanceObservedWorld(treated, 2);
    expect(
      treated.voterIdentification!.people[resident.personId]!.acquiredOn,
    ).not.toBeNull();
    expect(
      treated.voterIdentification!.trips.find(
        (t) => t.personId === resident.personId,
      )!.costCents,
    ).toBeGreaterThan(0);
    expect(
      voterIdExpenseDollars(treated, "US-IL", treated.currentDate, 10000),
    ).toBeGreaterThan(
      voterIdExpenseDollars(
        pair.control,
        "US-IL",
        pair.control.currentDate,
        10000,
      ),
    );
    expect(
      applyVoterIdentification(treated).voterIdentification!.trips,
    ).toEqual(treated.voterIdentification!.trips);
    const trip = treated.voterIdentification!.trips.find(
      (t) => t.personId === resident.personId,
    )!;
    expect(
      trip.missedWork.find((m) => m.workRelationshipId === work.id)?.minutes,
    ).toBeGreaterThan(0);
    const payday = addDays(payControl.currentDate, 7);
    const controlPay = settleJobPay(
      advanceObservedWorld(payControl, 7),
      resident.personId,
    );
    const actualPay = settleJobPay(
      advanceObservedWorld(treated, 5),
      resident.personId,
    );
    expect(actualPay.currentDate).toBe(payday);
    const paid = (w: typeof treated) =>
      w.history.resourceTransferOutcomes
        .filter(
          (o) =>
            o.resourceFlowId ===
            w.history.resourceFlows.find(
              (f) => f.stableKey === `job-pay:${work.id}`,
            )!.id,
        )
        .reduce((sum, o) => sum + o.transferredAmount.minorUnits, 0);
    expect(paid(actualPay)).toBeLessThan(paid(controlPay));
    console.log(
      JSON.stringify({
        law: PHOTO_ID_QUESTION,
        tripMinutes: trip.missedWork.find(
          (m) => m.workRelationshipId === work.id,
        )!.minutes,
        hourlyPayLossDollars: (paid(controlPay) - paid(actualPay)) / 100,
      }),
    );
    const candidates = treated.personOrder
      .filter(
        (id) =>
          treated.people[id]!.homeJurisdictionId ===
            treated.people[resident.personId]!.homeJurisdictionId &&
          ageOnDate(treated.people[id]!.birthDate, treated.currentDate) >= 18,
      )
      .slice(0, 2);
    treated = scheduleElectionContest(treated, {
      stableKey: "photo-id-fixture:actual-election",
      jurisdictionId: treated.people[resident.personId]!.homeJurisdictionId,
      office: {
        officeKey: "mayor",
        title: "Mayor",
        seatKey: null,
        occupationClassification: "occupation:elected-official",
      },
      electionDate: addDays(treated.currentDate, 2),
      candidatePersonIds: candidates,
      provenance: {
        method: "authored",
        sourceEntityIds: [],
        note: "Explicit fictional contest for the ballot-cure regression.",
      },
    });
    const contest = treated.history.electionContests!.at(-1)!;
    treated = advanceObservedWorld(treated, 2);
    treated = castIdentifiedBallot(treated, {
      contestId: contest.id,
      personId: resident.personId,
      candidatePersonId: candidates[0]!,
      presentedPhotoId: false,
      eligibilityReason:
        "Eligibility explicitly verified for the controlled resident fixture; citizenship is not inferred from identity ownership.",
      choiceReason:
        "The resident explicitly chose the first candidate in this controlled ballot.",
    });
    const ballot = treated.voterIdentification!.ballots!.at(-1)!;
    expect(ballot.kind).toBe("provisional");
    const tally = candidates.map((candidatePersonId) => ({
      candidatePersonId,
      votes: 1,
      voteShare: 0.5,
    }));
    expect(() =>
      resolveElectionContest(treated, {
        contestId: contest.id,
        winnerPersonId: candidates[1]!,
        tallies: tally,
      }),
    ).toThrow("return window");
    treated = advanceObservedWorld(treated, 1);
    treated = cureIdentifiedBallot(treated, ballot.key, {
      presentedPhotoId: true,
      reason:
        "The resident returned with the acquired identification to have the stated vote counted.",
    });
    const result = resolveElectionContest(treated, {
      contestId: contest.id,
      winnerPersonId: candidates[1]!,
      tallies: tally,
    });
    expect(electionContestResult(result, contest.id)!.winnerPersonId).toBe(
      candidates[0],
    );
    expect(
      electionContestResult(result, contest.id)!.tallies.find(
        (t) => t.candidatePersonId === candidates[0],
      )!.votes,
    ).toBe(2);
    const countedAfterScheduledCanvass = advanceObservedWorld(result, 8);
    expect(
      electionContestResult(countedAfterScheduledCanvass, contest.id)!.tallies,
    ).toEqual(electionContestResult(result, contest.id)!.tallies);
    assertWorldIntegrity(
      deserializeWorld(serializeWorld(countedAfterScheduledCanvass)),
    );
  }, 180000);
});

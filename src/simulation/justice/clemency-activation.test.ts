import { advanceWorld } from "../world";
import {
  recordedVandalismClemencyCase,
  recordedCourtFixtureClock,
} from "../../../tests/fixtures/clemency-court-case";
import { createProsecutionTransitionRegistry } from "./prosecution-transitions";
import { REFERRAL_TAG } from "./jail-terms";
import {
  cancelFutureDueItem,
  resolveFutureDueItemsThrough,
  setFutureDueItemTerminalState,
  futureDueItemStateAt,
} from "../future-transitions";
import { currentLifeCutoff } from "../life-queries";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { personName } from "../people";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { addDays, daysBetween, simulationMomentOnLocalDate } from "../dates";
import { candidacyEligibility } from "../candidacy";
import {
  scheduleElectionContest,
  resolveElectionContest,
} from "../election-contests";
import {
  EXECUTIVE_ELECTED_TERM_ENTRY,
  electedExecutiveTermForRelationship,
} from "../executive-work-context";
import {
  executiveTermHandlers,
  planElectedExecutiveOfficeTerm,
  recordElectedExecutiveQualification,
  electedExecutiveTermTransitionHandler,
} from "../executive-work-entry";
import {
  currentGoverningOffices,
  governingMatters,
  GOVERNING_TRANSITION,
} from "../governing/state-governing";
import { recordWorkStatus } from "../life";
import { workStatusAt } from "../life-queries";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../life-places";
import { settleStateExecutiveQualification } from "../nationwide-world/state-executive-terms";
import { pickDistinct, SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import { assertWorldIntegrity } from "../world";
import { composeWorldTimeHandlers } from "../campaigns";
import { CLEMENCY_PETITION_EVENT } from "./clemency-records";
import { CLEMENCY_SENTENCE_TAG } from "./jail-terms";
import type { EntityId, World } from "../types";
import {
  advanceClemencyAfterExecutiveEntry,
  considerClemencyAfterExecutiveDesk,
  clemencyPetitionStatus,
  fileClemencyPetition,
} from "./clemency";
import {
  clemencyAuthorityFor,
  clemencyBody,
  EXECUTIVE_BODY,
} from "./clemency-rules";
import { sentencesOf } from "./jail-terms";
import {
  PROSECUTION_CHARGED_EVENT,
  PROSECUTION_SENTENCED_EVENT,
  enterPlea,
  referForProsecution,
} from "./prosecution";

// Five actual places sampled from all 56; supported executive authority is a
// fixture prerequisite, never a production place branch.
const states = pickDistinct(
  new SeededRng("team9-g10-floor-five-20260930"),
  lifePlaceStateIdentities(),
  56,
)
  .filter((state) => {
    const authority = clemencyAuthorityFor(state.jurisdictionKey);
    return authority?.gates.some((gate) =>
      gate.mustAgree.some(
        (key) =>
          key === EXECUTIVE_BODY ||
          clemencyBody(authority, key)?.includesExecutive,
      ),
    );
  })
  .slice(0, 1);
const receipts: unknown[] = [];
afterAll(() => {
  if (process.env.G12_ACTIVATION_PROOF_PATH)
    writeFileSync(
      process.env.G12_ACTIVATION_PROOF_PATH,
      JSON.stringify(receipts, null, 2),
    );
});

for (const state of states)
  describe(`saved governor entry reviews old requests in ${state.jurisdictionKey}`, () => {
    let ready: World,
      petitionId: EntityId,
      petitionerId: EntityId,
      oldHolder: EntityId,
      oldTermId: EntityId,
      successor: EntityId,
      officeKey: string,
      jurisdictionId: EntityId;
    beforeAll(() => {
      // A small world (tests/fixtures/small-world.ts) with its governor seated.
      const small = smallWorld({
        place: state.jurisdictionKey,
        seed: `team9-g12-activation:${state.jurisdictionKey}`,
        offices: ["governor"],
      });
      const game = { world: small.world };
      petitionerId = small.personId;
      const facts = recordedVandalismClemencyCase(
        game.world,
        petitionerId,
        state.jurisdictionKey,
      );
      const referred = referForProsecution(facts.world, {
        stableKey: "fixture:g12-executive-case",
        subjectPersonId: petitionerId,
        jurisdictionId: game.world.people[petitionerId]!.homeJurisdictionId,
        offenseKey: "crime:vandalism",
        referredBy: {
          kind: "police",
          label: "police (authored vandalism fixture)",
          personId: null,
        },
        basisEventIds: facts.basisEventIds,
        sentencingAllegations: facts.sentencingAllegations,
        evidence: "documentary",
        standingFindings: 6,
      });
      const referral = referred.world.history.events.find(
        (event) => event.id === referred.referralId,
      )!;

      const chargeDue = referred.world.history.futureDueItems.find(
        (item) => item.stableKey === `justice:prosecution-stage:${referral.id}`,
      );
      expect(chargeDue).toBeDefined();
      expect(chargeDue!.entityIds).toContain(petitionerId);
      expect(chargeDue!.jurisdictionId).toBe(referral.jurisdictionId);
      let caseWorld = referred.world;
      for (const item of caseWorld.history.futureDueItems) {
        if (
          item.id === chargeDue!.id ||
          futureDueItemStateAt(caseWorld, item.id, currentLifeCutoff(caseWorld))
            ?.status !== "scheduled"
        )
          continue;
        caseWorld = cancelFutureDueItem(caseWorld, {
          stableKey: `fixture:clemency-isolate:${item.id}`,
          dueItemId: item.id,
          effectiveAt: caseWorld.currentDate,
          reasonKey: "fixture:isolated-court",
          context:
            "Retain unrelated commitments while isolating this saved court case.",
        });
      }
      const charged = resolveFutureDueItemsThrough(
        caseWorld,
        chargeDue!.dueAt,
        createProsecutionTransitionRegistry(),
      );
      const plea = enterPlea(charged, {
        personId: petitionerId,
        referralId: referred.referralId,
        plea: "guilty",
      });
      expect(plea.ok).toBe(true);
      const chargedEvent = charged.history.events.find(
        (event) =>
          event.type === PROSECUTION_CHARGED_EVENT &&
          event.tags.includes(`${REFERRAL_TAG}${referral.id}`),
      )!;
      expect(chargedEvent).toBeDefined();
      expect(
        chargedEvent.participants.some(
          (participant) =>
            participant.role === "focus:defendant" &&
            participant.personId === petitionerId,
        ),
      ).toBe(true);
      const trialDue = plea.world.history.futureDueItems.find(
        (item) =>
          item.stableKey === `justice:prosecution-stage:${chargedEvent.id}`,
      );
      expect(trialDue).toBeDefined();
      expect(trialDue!.entityIds).toContain(petitionerId);
      expect(trialDue!.jurisdictionId).toBe(chargedEvent.jurisdictionId);
      const sentenced = resolveFutureDueItemsThrough(
        plea.world,
        trialDue!.dueAt,
        createProsecutionTransitionRegistry(),
      );
      const actualSentence = sentenced.history.events.find(
        (event) =>
          event.type === PROSECUTION_SENTENCED_EVENT &&
          event.involvedEntityIds.includes(petitionerId),
      );
      expect(actualSentence).toBeDefined();
      const sentenceId = actualSentence!.id;
      const term = sentencesOf(sentenced, petitionerId).find(
        (sentence) => sentence.sentencedEventId === sentenceId,
      )!;
      expect(term.until).not.toBeNull();
      if (term.until === null)
        throw new Error("The fixture's recorded sentence has no end date.");
      // Reach the existing service gate through the real clock; never backdate saved events.
      const served = advanceWorld(
        sentenced,
        daysBetween(
          sentenced.currentDate,
          addDays(
            term.from,
            Math.ceil(daysBetween(term.from, term.until) / 2) + 1,
          ),
        ),
        recordedCourtFixtureClock(),
      );
      const filed = fileClemencyPetition(served, {
        personId: petitionerId,
        sentencedEventId: sentenceId,
      });
      expect(filed.ok, filed.ok ? undefined : filed.reason).toBe(true);
      if (!filed.ok) throw new Error(filed.reason);
      petitionId = filed.petitionId;
      ready = filed.world;

      const office = currentGoverningOffices(ready).find(
        (office) => `US-${office.stateUsps}` === state.jurisdictionKey,
      )!;
      oldHolder = office.holderPersonId;
      oldTermId = office.termId;
      officeKey = office.officeKey;
      jurisdictionId = stateJurisdictionForKey(state.jurisdictionKey)!.id;
      successor = ready.personOrder.find((personId) => {
        if (personId === oldHolder || personId === petitionerId) return false;
        const blocks = candidacyEligibility(ready, {
          personId,
          jurisdictionId,
          officeKey,
          alreadyACandidate: false,
        }).blocks;
        return (
          blocks.filter(
            (block) =>
              block.kind !== "unproved-sourced-qualification" &&
              block.kind !== "unproved-district-residence" &&
              !(
                block.kind === "lives-elsewhere" &&
                ready.people[personId]?.homeJurisdictionId === jurisdictionId
              ),
          ).length === 0
        );
      })!;
      expect(successor).toBeDefined();
      expect(clemencyPetitionStatus(ready, petitionId)).toBe("open");
    });

    function planned() {
      let next = scheduleElectionContest(ready, {
        stableKey: "fixture:g12-activation-contest",
        jurisdictionId,
        office: {
          officeKey,
          title: "Governor",
          seatKey: null,
          occupationClassification: `service:${officeKey}`,
        },
        electionDate: addDays(ready.currentDate, 1),
        candidatePersonIds: [successor, oldHolder],
        provenance: {
          method: "authored",
          sourceEntityIds: [],
          note: "Recorded successor contest fixture; no campaign or sourced term boundary is claimed.",
        },
      });
      const contest = next.history.electionContests!.at(-1)!;
      next = {
        ...next,
        currentDate: contest.electionDate,
        currentMoment: simulationMomentOnLocalDate(
          next.currentMoment,
          contest.electionDate,
        ),
      };
      next = resolveElectionContest(next, {
        contestId: contest.id,
        resolvedAt: next.currentDate,
        winnerPersonId: successor,
        tallies: [
          { candidatePersonId: successor, votes: 8, voteShare: 0.8 },
          { candidatePersonId: oldHolder, votes: 2, voteShare: 0.2 },
        ],
      });
      const electionDue = next.history.futureDueItems.find(
        (item) =>
          item.entityIds.includes(contest.id) &&
          item.dueAt === contest.electionDate,
      )!;
      next = setFutureDueItemTerminalState(next, {
        stableKey: `fixture:election-resolved:${contest.id}`,
        dueItemId: electionDue.id,
        effectiveAt: contest.electionDate,
        status: "resolved",
        reasonKey: null,
        context: "Actual recorded fixture election result.",
        outcomeEventId:
          next.history.electionContestResults!.at(-1)!.outcomeEventId,
      });
      const startsAt = addDays(next.currentDate, 1);
      next = planElectedExecutiveOfficeTerm(next, {
        contestId: contest.id,
        startsAt,
        endsAt: addDays(startsAt, 100),
        termNote:
          "Authored dated-term fixture, not sourced constitutional timing.",
      });
      const relationship = next.history.workRelationships.find(
        (record) =>
          record.personId === successor &&
          electedExecutiveTermForRelationship(next, record.id),
      );
      expect(relationship).toBeDefined();
      return {
        world: next,
        contestId: contest.id,
        term: electedExecutiveTermForRelationship(next, relationship!.id)!,
      };
    }
    function afterOldTerm(world: World, at: World["currentDate"]) {
      let isolated = world;
      for (const item of world.history.futureDueItems) {
        if (
          item.dueAt > at ||
          (item.transitionKey === EXECUTIVE_ELECTED_TERM_ENTRY &&
            item.dueAt === at) ||
          futureDueItemStateAt(isolated, item.id, currentLifeCutoff(isolated))
            ?.status !== "scheduled"
        )
          continue;
        isolated = cancelFutureDueItem(isolated, {
          stableKey: `fixture:activation-isolate:${item.id}`,
          dueItemId: item.id,
          effectiveAt: isolated.currentDate,
          reasonKey: "fixture:isolated-governor-entry",
          context:
            "Isolate the saved governor entry and old petition; no unrelated clock proof is claimed.",
        });
      }
      let next = {
        ...isolated,
        currentDate: at,
        currentMoment: simulationMomentOnLocalDate(world.currentMoment, at),
      };
      for (const relationship of next.history.workRelationships) {
        if (
          relationship.personId !== oldHolder ||
          relationship.kind !== "employment:executive-office" ||
          workStatusAt(next, relationship.id)?.status !== "active"
        )
          continue;
        next = recordWorkStatus(next, {
          stableKey: `fixture:old-governor-ended:${relationship.id}`,
          workRelationshipId: relationship.id,
          effectiveAt: at,
          status: "ended",
          reason: "Recorded outgoing term boundary in this activation fixture.",
          provenance: {
            kind: "authored",
            note: "Fixture outgoing term boundary.",
          },
          supersedesStatusId: workStatusAt(next, relationship.id)!.id,
        });
      }
      return next;
    }
    function assertLapsed(world: World) {
      expect(clemencyPetitionStatus(world, petitionId)).toBe("denied");
      const original = ready.history.events.find(
        (event) => event.id === petitionId,
      )!;
      expect(
        world.history.events.find((event) => event.id === petitionId),
      ).toEqual(original);
      expect(original.stableKey.endsWith(`executive:${oldHolder}`)).toBe(true);
      expect(
        governingMatters(world).filter(
          (matter) =>
            matter.holderPersonId === successor &&
            matter.openedEvent.tags.includes(`source-event:${petitionId}`),
        ),
      ).toHaveLength(0);
      const closed = world.history.events.find(
        (event) =>
          event.tags.includes(`justice.clemency-petition:${petitionId}`) &&
          event.summary.includes("left office"),
      );
      expect(closed).toBeDefined();
      receipts.push({
        place: state.jurisdictionKey,
        seed: world.seed,
        petitioner: {
          id: petitionerId,
          name: personName(world.people[petitionerId]!),
        },
        oldHolder: {
          id: oldHolder,
          name: personName(world.people[oldHolder]!),
        },
        successor: {
          id: successor,
          name: personName(world.people[successor]!),
        },
        petitionId,
        lapseEventId: closed!.id,
        sourcePetitionUnchanged: true,
        successorMatterCount: 0,
      });
      const loaded = deserializeWorld(serializeWorld(world));
      assertWorldIntegrity(loaded);
      expect(clemencyPetitionStatus(loaded, petitionId)).toBe("denied");
      return loaded;
    }
    it("actual saved desk opening records the NPC request once across reload", () => {
      const setup = planned();
      const qualified = recordElectedExecutiveQualification(setup.world, {
        contestId: setup.contestId,
        personId: successor,
        qualificationNote: "Recorded fixture qualification.",
      });
      const entered = resolveFutureDueItemsThrough(
        afterOldTerm(qualified, setup.term.startsAt),
        setup.term.startsAt,
        executiveTermHandlers(),
      );
      expect(clemencyPetitionStatus(entered, petitionId)).toBe("denied");
      const opening = entered.history.futureDueItems.find(
        (item) =>
          item.transitionKey === GOVERNING_TRANSITION &&
          item.entityIds.includes(setup.term.relationship.id),
      );
      expect(opening).toBeDefined();
      // The fixture controls the actual successor now. The former controlled
      // defendant remains the same saved person serving the same sentence.
      let isolated: World = {
        ...entered,
        control: { kind: "person", personId: successor },
      };
      for (const item of entered.history.futureDueItems) {
        if (
          item.id === opening!.id ||
          item.dueAt > opening!.dueAt ||
          futureDueItemStateAt(isolated, item.id, currentLifeCutoff(isolated))
            ?.status !== "scheduled"
        )
          continue;
        isolated = cancelFutureDueItem(isolated, {
          stableKey: `fixture:desk-isolate:${item.id}`,
          dueItemId: item.id,
          effectiveAt: isolated.currentDate,
          reasonKey: "fixture:isolated-governor-opening",
          context:
            "Isolate the actual saved desk opening; retain unrelated due records.",
        });
      }
      const priorDecisions = isolated.history.decisionTraces.filter(
        (trace) =>
          trace.context.decisionType === "justice.clemency-petition" &&
          trace.context.actorPersonId === petitionerId,
      );
      expect(priorDecisions).toHaveLength(0);
      const loaded = deserializeWorld(serializeWorld(isolated));
      const opened = resolveFutureDueItemsThrough(
        loaded,
        opening!.dueAt,
        composeWorldTimeHandlers(),
      );
      const actualOffice = currentGoverningOffices(opened).find(
        (office) => office.officeKey === officeKey,
      )!;
      expect(actualOffice.holderPersonId).toBe(successor);
      const traces = opened.history.decisionTraces.filter(
        (trace) =>
          trace.context.decisionType === "justice.clemency-petition" &&
          trace.context.actorPersonId === petitionerId,
      );
      expect(traces).toHaveLength(1);
      const oldPetition = ready.history.events.find(
        (event) => event.id === petitionId,
      )!;
      expect(
        opened.history.events.find((event) => event.id === petitionId),
      ).toEqual(oldPetition);
      expect(clemencyPetitionStatus(opened, petitionId)).toBe("denied");
      const sentenceTag = oldPetition.tags.find((tag) =>
        tag.startsWith(CLEMENCY_SENTENCE_TAG),
      )!;
      const newPetitions = opened.history.events.filter(
        (event) =>
          event.type === CLEMENCY_PETITION_EVENT &&
          event.id !== petitionId &&
          event.tags.includes(sentenceTag),
      );
      expect(newPetitions).toHaveLength(
        traces[0]!.selectedOptionKey === "petition" ? 1 : 0,
      );
      if (newPetitions[0])
        expect(
          newPetitions[0].stableKey.endsWith(`executive:${successor}`),
        ).toBe(true);
      const continued = deserializeWorld(serializeWorld(opened));
      assertWorldIntegrity(continued);
      const replayed = resolveFutureDueItemsThrough(
        continued,
        opening!.dueAt,
        composeWorldTimeHandlers(),
      );
      expect(serializeWorld(replayed)).toBe(serializeWorld(continued));
      expect(
        considerClemencyAfterExecutiveDesk(continued, actualOffice.termId),
      ).toBe(continued);
      expect(considerClemencyAfterExecutiveDesk(continued, oldTermId)).toBe(
        continued,
      );
      receipts.push({
        source: "actual saved office opening",
        place: state.jurisdictionKey,
        seed: opened.seed,
        petitioner: {
          id: petitionerId,
          name: personName(opened.people[petitionerId]!),
        },
        successor: {
          id: successor,
          name: personName(opened.people[successor]!),
        },
        officeTermId: actualOffice.termId,
        openingDueId: opening!.id,
        decisionId: traces[0]!.id,
        selectedOptionKey: traces[0]!.selectedOptionKey,
        newPetitionIds: newPetitions.map((event) => event.id),
        oldPetitionId: petitionId,
        oldPetitionUnchanged: true,
        repeatedConsumer: "unchanged",
        staleSavedTerm: "unchanged",
        replay: "unchanged",
      });
    });

    it("actual dated entry lapses the old holder's request once across reload", () => {
      const setup = planned();
      const qualified = recordElectedExecutiveQualification(setup.world, {
        contestId: setup.contestId,
        personId: successor,
        qualificationNote: "Recorded fixture qualification.",
      });
      const entered = resolveFutureDueItemsThrough(
        afterOldTerm(qualified, setup.term.startsAt),
        setup.term.startsAt,
        executiveTermHandlers(),
      );
      expect(workStatusAt(entered, setup.term.relationship.id)?.status).toBe(
        "active",
      );
      const loaded = assertLapsed(entered);
      expect(
        serializeWorld(
          advanceClemencyAfterExecutiveEntry(
            loaded,
            setup.term.relationship.id,
          ),
        ),
      ).toBe(serializeWorld(loaded));
      expect(
        serializeWorld(
          electedExecutiveTermTransitionHandler(loaded, setup.term.entry).world,
        ),
      ).toBe(serializeWorld(loaded));
    });
    it("actual late qualification lapses the old request and retains its late-entry event", () => {
      const setup = planned();
      const due = afterOldTerm(setup.world, addDays(setup.term.startsAt, 1));
      const entered = settleStateExecutiveQualification(due, successor);
      expect(workStatusAt(entered, setup.term.relationship.id)?.status).toBe(
        "active",
      );
      expect(
        entered.history.events.some(
          (event) => event.type === "election.term-entered-late",
        ),
      ).toBe(true);
      const loaded = assertLapsed(entered);
      expect(
        serializeWorld(settleStateExecutiveQualification(loaded, successor)),
      ).toBe(serializeWorld(loaded));
      expect(
        serializeWorld(
          advanceClemencyAfterExecutiveEntry(
            loaded,
            setup.term.relationship.id,
          ),
        ),
      ).toBe(serializeWorld(loaded));
    });
    it("an expected relationship cannot review a saved request", () => {
      const setup = planned();
      expect(
        advanceClemencyAfterExecutiveEntry(
          setup.world,
          setup.term.relationship.id,
        ),
      ).toBe(setup.world);
      expect(clemencyPetitionStatus(setup.world, petitionId)).toBe("open");
    });
  });

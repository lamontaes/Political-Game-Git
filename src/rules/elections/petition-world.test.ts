import { afterAll, describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import {
  makeIsoDate,
  simulationMomentAtLocalTime,
  ageOnDate,
} from "../../simulation/dates";
import { stateJurisdictionForKey } from "../../simulation/life-places";
import { ensureStateJurisdiction } from "../../simulation/nationwide-world/state-executives";
import { scheduleFutureDueItem } from "../../simulation/future-transitions";
import * as legacy from "../../simulation/recall";
import { petitionSignerEligibility } from "../../simulation/petition-signers";
import { isEligibleVoterIn } from "../../simulation/issue-record";
import { nextGeneralElection } from "./intake-and-calendars";
import { recordedPetitionSignatures } from "./petition-signatures";
import {
  recallPetitionCloses,
  pendingPlayerSignatureRequests,
  distributionReview,
} from "./recall-close";
let circulating = 0;
afterAll(() => expect(circulating).toBeGreaterThan(0));
describe("elections: native petition closure and signer calendar callers", () => {
  it.each(Object.keys(STATES))(
    "matches real petition records and lawful refusal in %s",
    (place) => {
      const base = smallWorld({
        place: `US-${place}`,
        seed: `rules2-sendback-petition:${place}`,
      });
      let world = ensureStateJurisdiction(base.world, place);
      const jurisdiction = stateJurisdictionForKey(`US-${place}`)!.id;
      for (const personId of world.personOrder) {
        const person = world.people[personId]!;
        for (const on of [
          world.currentDate,
          makeIsoDate(`${Number(person.birthDate.slice(0, 4)) + 17}-09-01`),
          makeIsoDate(`${Number(person.birthDate.slice(0, 4)) + 17}-12-01`),
        ]) {
          const old = petitionSignerEligibility(world, {
            stateUsps: place,
            jurisdictionId: jurisdiction,
            signerPersonId: personId,
            on,
          });
          const age = ageOnDate(person.birthDate, on);
          const young =
            old.terms.mustTurnEighteenBy === "next-general-election" &&
            age >= old.terms.minimumAge &&
            ageOnDate(person.birthDate, makeIsoDate(nextGeneralElection(on))) >=
              18;
          expect(old.reasons.some((row) => row.key === "too-young")).toBe(
            age < 18 && !young,
          );
        }
      }
      const propositionId = Object.values(world.policyCatalog.propositions)[0]!
        .id;
      for (const kind of [
        "state-initiative",
        "state-referendum",
        "constitutional-initiative",
      ] as const) {
        const rule = legacy.petitionRule(kind, place, { world });
        if (!legacy.petitionFilingCheck(rule).allowed) continue;
        world = legacy.startCitizenPetition(world, {
          kind,
          petitionerPersonId: base.personId,
          jurisdictionId: jurisdiction,
          stateUsps: place,
          propositionId,
          electionDate: makeIsoDate("2032-11-02"),
          anchorDate: world.currentDate,
        });
      }
      for (const petition of legacy.citizenPetitions(world)) {
        world = legacy.circulatePetition(world, {
          petitionKey: petition.stableKey,
          circulatorPersonId: world.personOrder[1]!,
          minutes: 60,
        });
      }
      const petitions = legacy.citizenPetitions(world);
      circulating += petitions.length;
      for (const petition of petitions) {
        const date = petition.closesAt;
        const clocked = {
          ...world,
          currentDate: date,
          currentMoment: simulationMomentAtLocalTime({
            date,
            minuteOfDay: 0,
            timeZone: world.currentMoment.timeZone,
          }),
        };
        const counted = legacy.recordedPetitionSignatures(clocked, petition);
        const actual = recordedPetitionSignatures({
          petition,
          events: clocked.history.events,
          decisionTraces: clocked.history.decisionTraces,
          currentDate: date,
          nextSequence: clocked.history.nextSequence,
          eligibility: (id, on) =>
            petitionSignerEligibility(clocked, {
              stateUsps: place,
              jurisdictionId: petition.jurisdictionId,
              signerPersonId: clocked.personOrder.find(
                (personId) => personId === id,
              )!,
              on: makeIsoDate(on),
            }),
          registeredVoters: (on) =>
            clocked.personOrder.filter((id) =>
              isEligibleVoterIn(
                clocked,
                id,
                petition.jurisdictionId,
                makeIsoDate(on),
              ),
            ).length,
        });
        expect(actual).toEqual(counted);
        const pending = pendingPlayerSignatureRequests(
          clocked.history.events,
          petition,
          date,
        );
        for (const request of pending) {
          expect(request.signerPersonId).toBe(base.personId);
          expect(
            clocked.history.events.find(
              (event) => event.id === request.askEventId,
            )?.tags,
          ).toContain("answer-mode:player");
        }
        const review = distributionReview(
          clocked.history.events,
          petition.stableKey,
          date,
        );
        const plan = recallPetitionCloses({
          petition,
          validSignatures: counted.yes,
          registeredVoters: counted.registeredVoters,
          distributionReviewId: review?.id ?? null,
          targetHoldsSeat: false,
          startingThreshold: null,
          electionDate: null,
        });
        const due = clocked.history.futureDueItems.find(
          (item) => item.stableKey === `${petition.stableKey}:closes`,
        )!;
        expect(due).toBeDefined();
        const closed = legacy.recallPetitionClosesHandler(clocked, due);
        if (plan.kind === "blocked")
          expect(closed.reasonKey).toBe(plan.reasonKey);
        else
          expect(
            closed.world.history.events.find(
              (event) => event.stableKey === `${petition.stableKey}:closed`,
            )?.tags,
          ).toContain(`outcome:${plan.kind}`);
      }
      if (!petitions.length) {
        const scheduled = scheduleFutureDueItem(world, {
          stableKey: `rules2-empty-petition:${place}:closes`,
          dueAt: world.currentDate,
          transitionKey: legacy.RECALL_PETITION_CLOSES,
          entityIds: [jurisdiction],
          jurisdictionId: jurisdiction,
          provenance: {
            kind: "initialization",
            reference: "rules2-generated-empty-petition",
          },
        });
        expect(
          recallPetitionCloses({
            petition: null,
            validSignatures: 0,
            registeredVoters: 0,
            distributionReviewId: null,
            targetHoldsSeat: false,
            startingThreshold: null,
            electionDate: null,
          }).kind,
        ).toBe("no-petition");
        expect(
          legacy.recallPetitionClosesHandler(
            scheduled,
            scheduled.history.futureDueItems.at(-1)!,
          ).world,
        ).toBe(scheduled);
      }
    },
  );
});

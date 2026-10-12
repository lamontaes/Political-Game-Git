import { chiefExecutiveJurisdiction } from "../../simulation/nationwide-world/government-jurisdiction";
import { ensureJurisdiction } from "../../simulation/national-election-geography";
import { createCharacterHistoryContextPerson } from "../../simulation/character-history";
import {
  recordPrivateBelief,
  createFormationContext,
} from "../../simulation/politics";
import { daysBetween } from "../../simulation/dates";
import { expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { addDays, makeIsoDate } from "../../simulation/dates";
import {
  ensureStateExecutiveIncumbent,
  stateExecutiveOffice,
  stateExecutiveTermWindow,
} from "../../simulation/nationwide-world/state-executives";
import {
  stateExecutiveTermRule,
  nextRegularElection,
} from "../../simulation/nationwide-world/state-executive-term-rules";
import {
  stateExecutiveCandidacyPacks,
  stateExecutiveIdentity,
} from "../../simulation/nationwide-world/state-executive-candidacy-packs";
import {
  planOrdinaryStateExecutiveTerm as legacyPlan,
  ordinaryStateExecutiveTermDates,
  isRegularStateExecutiveElection,
} from "../../simulation/nationwide-world/state-executive-terms";
import {
  scheduleElectionContest,
  resolveElectionContest,
  electionContestResult,
} from "../../simulation/election-contests";
import { advanceWorld } from "../../simulation/world";
import { candidacyEligibility } from "../../simulation/candidacy";
import {
  planOrdinaryStateExecutiveTerm,
  seatOpeningGovernorElect,
} from "./office-plans";

it.each(Object.keys(STATES))(
  "executive opening and ordinary term decisions through writers in %s",
  (place) => {
    const rule = stateExecutiveTermRule(place);
    const office = stateExecutiveOffice(place);
    const identity = stateExecutiveIdentity(place);
    const election = rule
      ? nextRegularElection(rule, makeIsoDate("2026-01-01"))
      : makeIsoDate("2026-11-03");
    const opening = {
      ...smallWorld({
        place,
        seed: "rules2-sendback-governor-elect:" + place,
      }),
    };
    if (!office || !identity)
      throw new Error("Missing chief executive identity");
    opening.world = advanceWorld(
      opening.world,
      daysBetween(opening.world.currentDate, addDays(election, 1)),
    );
    const currentWindow = stateExecutiveTermWindow(
      office,
      opening.world.currentDate,
    );
    const window = currentWindow.endExclusive
      ? stateExecutiveTermWindow(office, currentWindow.endExclusive)
      : currentWindow;
    const anticipated = seatOpeningGovernorElect({
      termEnds: currentWindow.endExclusive,
      rule,
      currentDate: opening.world.currentDate,
      window,
      alreadyRecorded: false,
    });
    const seated = ensureStateExecutiveIncumbent(
      opening.world,
      opening.personId,
      place,
    );
    const event = seated.history.events.find(
      (row) =>
        row.tags.includes("governor-elect") &&
        row.tags.includes(`office:${office.officeKey}`),
    );
    expect(!!event).toBe(anticipated !== null);
    if (event && anticipated) {
      expect(event.occurredAt).toBe(anticipated.electionDay);
      expect(event.tags).toContain(`term-begins:${anticipated.startsAt}`);
      if (anticipated.endExclusive)
        expect(event.tags).toContain(`term-end:${anticipated.endExclusive}`);
    }
    const base = {
      ...smallWorld({
        place,
        seed: "rules2-sendback-ordinary-term:" + place,
      }),
    };
    base.world = advanceWorld(
      base.world,
      daysBetween(base.world.currentDate, addDays(election, -1)),
    );
    const governed = chiefExecutiveJurisdiction(place)!;
    base.world = ensureJurisdiction(base.world, governed);
    const option = stateExecutiveCandidacyPacks().find(
      (pack) => pack.jurisdictionKey === identity.jurisdictionKey,
    )!.offices[0]!;
    let voting = createCharacterHistoryContextPerson(base.world, {
      stableKey: "rules2:state-voter",
      givenName: base.world.people[base.personId]!.givenName,
      familyName: base.world.people[base.personId]!.familyName,
      birthDate: base.world.people[base.personId]!.birthDate,
      homeJurisdictionId: governed.id,
    });
    const voterId = voting.personOrder.at(-1)!;
    voting = recordPrivateBelief(voting, {
      stableKey: "rules2:state-voter-support",
      personId: voterId,
      propositionId: null,
      subject: { kind: "official", personId: base.personId },
      formedAt: voting.currentDate,
      position: "support",
      conviction: "settled",
      salience: "central",
      flexibility: "firm",
      rationale: null,
      formation: createFormationContext("reflection:initial"),
      supersedesBeliefId: null,
    });
    let world = scheduleElectionContest(voting, {
      stableKey: "rules2:governor-contest",
      jurisdictionId: governed.id,
      office: option.office,
      electionDate: election,
      candidatePersonIds: [base.personId],
      provenance: {
        method: "simulated",
        sourceEntityIds: [base.personId],
        note: "Public contest producer control.",
      },
    });
    const contest = world.history.electionContests!.at(-1)!;
    world = advanceWorld(world, 1);
    if (!electionContestResult(world, contest.id))
      world = resolveElectionContest(world, { contestId: contest.id });
    const result = electionContestResult(world, contest.id)!;
    const dates = ordinaryStateExecutiveTermDates(world, identity, election);
    const eligibility = candidacyEligibility(world, {
      personId: result.winnerPersonId,
      jurisdictionId: governed.id,
      officeKey: identity.officeKey,
      alreadyACandidate: false,
    });
    const blocks = eligibility.blocks.filter(
      (block) =>
        block.kind !== "unproved-sourced-qualification" &&
        block.kind !== "unproved-district-residence" &&
        !(
          block.kind === "lives-elsewhere" &&
          world.people[result.winnerPersonId]?.homeJurisdictionId ===
            governed.id
        ),
    );
    const actual = planOrdinaryStateExecutiveTerm({
      contestExists: true,
      resultExists: true,
      identityExists: true,
      regularElection: isRegularStateExecutiveElection(
        world,
        identity,
        election,
      ),
      dates,
      winnerPersonId: result.winnerPersonId,
      qualificationBlocks: blocks.length,
    });
    const legacy = legacyPlan(world, contest.id);
    const work = legacy.history.workRelationships.find(
      (row) => row.stableKey === `${contest.stableKey}:executive-seat`,
    );
    expect(!!work).toBe(actual !== null);
    if (work && actual) {
      expect(work.startedAt).toBe(actual.startsAt);
      const qualification = legacy.history.events.find(
        (row) =>
          row.stableKey ===
          `executive-qualification:${contest.id}:${result.winnerPersonId}`,
      );
      expect(!!qualification).toBe(actual.qualify);
    }
  },
);

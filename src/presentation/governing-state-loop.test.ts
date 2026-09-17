import { describe, expect, it } from "vitest";

import {
  ELECTION_CONTEST_TRANSITION_KEY,
  addDays,
  campaignElectionTransitionHandler,
  campaignForCandidate,
  createFutureTransitionHandlerRegistry,
  currentGoverningOffices,
  deserializeWorld,
  electionContestById,
  electionContestResult,
  ensureCampaignOpponents,
  ensureStateJurisdiction,
  fileCampaign,
  governingMatters,
  governingOfficeForPerson,
  makeCurrencyCode,
  resolveCampaignElectionFromRecordedInput,
  searchLifePlaces,
  serializeWorld,
  stateExecutiveIdentity,
  stateJurisdictionForKey,
} from "../simulation";
import type {
  EntityId,
  FutureTransitionHandlerRegistry,
  World,
} from "../simulation";
import { projectCampaign } from "./campaign-projection";
import { projectGoverningBriefing } from "./governing-briefing";
import {
  fileForStateExecutiveOffice,
  recoverOffCycleStateExecutiveTerm,
  stateExecutiveEntryStatus,
} from "./nationwide-candidacy";
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

function passMonths(
  world: World,
  until: string,
  handlers?: FutureTransitionHandlerRegistry,
): World {
  let next = world;
  for (let step = 0; step < 80 && next.currentDate < until; step += 1)
    next = passOrdinaryDays(next, 30, handlers ? { handlers } : {});
  return next;
}

/** Test fixture only: a supplied result, not a forecast. */
function suppliedWin(personId: EntityId): FutureTransitionHandlerRegistry {
  return createFutureTransitionHandlerRegistry([
    [
      ELECTION_CONTEST_TRANSITION_KEY,
      (atDate, due) => {
        const contest = (atDate.history.electionContests ?? []).find((c) =>
          due.entityIds.includes(c.id),
        );
        if (!contest || !contest.candidatePersonIds.includes(personId))
          return campaignElectionTransitionHandler(atDate, due);
        const resolved = resolveCampaignElectionFromRecordedInput(atDate, {
          contestId: contest.id,
          winnerPersonId: personId,
          tallies: contest.candidatePersonIds.map((candidatePersonId) => ({
            candidatePersonId,
            votes: candidatePersonId === personId ? 2 : 1,
            voteShare: candidatePersonId === personId ? 2 / 3 : 1 / 3,
          })),
          provenance: {
            method: "authored",
            sourceEntityIds: [],
            note: "Supplied fictional test result; not a forecast.",
          },
        });
        return {
          world: resolved,
          status: "resolved",
          reasonKey: null,
          context: "Supplied recorded-result fixture.",
          outcomeEventId: electionContestResult(resolved, contest.id)!
            .outcomeEventId,
        };
      },
    ],
  ]);
}

describe("GOVERNING: the same office runs for a non-player winner", () => {
  it("a lost race seats the winner, whose office decides on canonical time; the player sees only public records", () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const { world, personId } = adultLifeIn("CO", `governing-npc-${attempt}`);
      const filed = fileForStateExecutiveOffice(world, personId);
      const contest = filed.history.electionContests!.at(-1)!;
      const decided = passMonths(filed, addDays(contest.electionDate, 1));
      if (projectCampaign(decided, personId).phase !== "lost") continue;
      const winner = electionContestResult(decided, contest.id)!.winnerPersonId;
      expect(stateExecutiveEntryStatus(decided, personId).kind).toBe("lost");

      const entered = passMonths(decided, "2027-03-01");
      const office = governingOfficeForPerson(entered, winner);
      expect(office?.officeKey).toBe(stateExecutiveIdentity("CO")!.officeKey);
      expect(office?.controlledByPlayer).toBe(false);
      expect(governingOfficeForPerson(entered, personId)).toBeNull();
      expect(projectGoverningBriefing(entered, personId)).toBeNull();

      const matters = governingMatters(entered, office!.officeKey);
      expect(matters.map((m) => m.family)).toEqual(
        expect.arrayContaining(["chief-of-staff", "agenda"]),
      );
      // The non-player office decided without being asked, and made no work
      // items for anyone.
      expect(matters.every((m) => m.workItemId === null)).toBe(true);
      const decisions = entered.history.events.filter(
        (event) =>
          event.type === "governing.matter-decided" &&
          event.tags.includes(`office:${office!.officeKey}`),
      );
      expect(decisions.length).toBeGreaterThanOrEqual(2);
      // What a civilian can read: the public decisions.
      expect(
        decisions.filter((event) => event.visibility === "public").length,
      ).toBeGreaterThanOrEqual(1);
      expect(
        currentGoverningOffices(entered).find(
          (o) => o.officeKey === office!.officeKey,
        )?.holderPersonId,
      ).toBe(winner);

      const reopened = deserializeWorld(serializeWorld(entered));
      expect(governingOfficeForPerson(reopened, winner)?.officeKey).toBe(
        office!.officeKey,
      );
      return;
    }
    throw new Error("No tried seed produced a simulated Colorado loss.");
  }, 900_000);
});

describe("GOVERNING: a victory recorded before the office had a calendar", () => {
  it("keeps the result and offers an explicit, versioned full-term recovery", () => {
    const { world, personId } = adultLifeIn("WA", "governing-off-cycle");
    const identity = stateExecutiveIdentity("WA")!;
    const jurisdictionId = stateJurisdictionForKey("US-WA")!.id;
    // The pre-repair filing route: an election 28 days after filing.
    const stableKey = `candidacy:${personId}:${world.currentDate}`;
    const registered = ensureStateJurisdiction(world, "WA");
    const opponents = ensureCampaignOpponents(registered, {
      stableKey,
      jurisdictionId,
      count: 1,
      excludePersonIds: [personId],
    });
    const oldElection = addDays(world.currentDate, 28);
    const filed = fileCampaign(opponents.world, {
      stableKey,
      candidatePersonId: personId,
      jurisdictionId,
      officeKey: identity.officeKey,
      districtBinding: null,
      electionDate: oldElection,
      rivalPersonIds: opponents.personIds,
      existingContestId: null,
      committeeName: "Fixture committee",
      donorPoolName: "Fixture donors",
      advertisingVendorName: "Fixture vendor",
      staffPersonIds: [],
      treasuryCurrency: makeCurrencyCode("USD"),
    }).world;
    const won = passMonths(
      filed,
      addDays(oldElection, 1),
      suppliedWin(personId),
    );
    const status = stateExecutiveEntryStatus(won, personId);
    expect(status.kind).toBe("won-off-cycle");
    if (status.kind !== "won-off-cycle") return;
    // The Wednesday after the second Monday of January 2027 and 2031.
    expect(status.recovery.startsAt).toBe("2027-01-13");
    expect(status.recovery.endsAt).toBe("2031-01-15");
    expect(status.recovery.basis).toBe("verified");

    // Doing nothing changes nothing: no term is invented on read or reopen.
    const reopened = deserializeWorld(serializeWorld(won));
    expect(stateExecutiveEntryStatus(reopened, personId)).toEqual(status);

    const recovered = recoverOffCycleStateExecutiveTerm(won, personId);
    expect(stateExecutiveEntryStatus(recovered, personId).kind).toBe(
      "awaiting-qualification",
    );
    const campaign = campaignForCandidate(won, personId)!;
    const contest = electionContestById(recovered, campaign.contestId)!;
    expect(contest.electionDate).toBe(oldElection);
    expect(electionContestResult(recovered, contest.id)).toEqual(
      electionContestResult(won, contest.id),
    );
    const record = recovered.history.events.find(
      (event) => event.type === "governing.term-recovery",
    );
    expect(record?.visibility).toBe("public");
    expect(record?.tags).toContain("state-executive-off-cycle-recovery/v1");
    expect(() =>
      recoverOffCycleStateExecutiveTerm(recovered, personId),
    ).toThrow();
  }, 300_000);
});

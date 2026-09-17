import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../src/presentation/new-game";
import { fileForOffice } from "./campaign-fixture";
import {
  addDays,
  advanceWorld,
  campaignForCandidate,
  candidacyEligibility,
  createFutureTransitionHandlerRegistry,
  electionContestById,
  electionContestResult,
  createCampaignElectionTransitionRegistry,
  resolveCampaignElectionFromRecordedInput,
  fileCampaign,
  makeCurrencyCode,
  legislativeTermForRelationship,
  type EntityId,
  type World,
} from "../../src/simulation";
import { composeFutureTransitionHandlerRegistries } from "../../src/simulation/future-transitions";

/** Unranked fictional supplied-result fixture; never an outcome prediction. */
export function recordedTermFixture(
  winner: "player" | "rival" | "qualified-rival" = "player",
) {
  const built = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed: "rest37-n-recorded-term",
    startAge: 40,
    placeKey: "lexington-fayette",
    gender: "male",
    pronouns: "he-him",
    questionnaire: "skipped",
    startingLife: "ordinary-life",
    depth: "summarize-earlier-life",
  });
  const qualifiedRivalId = built.world.personOrder.find(
    (id) =>
      id !== built.playerPersonId &&
      candidacyEligibility(built.world, {
        personId: id,
        jurisdictionId:
          built.world.people[built.playerPersonId]!.homeJurisdictionId,
        officeKey: "us-ky-general-assembly-v1:house",
        alreadyACandidate: false,
      }).eligible,
  );
  if (winner === "qualified-rival" && !qualifiedRivalId)
    throw new Error("Fixture has no independently qualified persistent rival.");
  const filed =
    winner === "qualified-rival"
      ? fileCampaign(built.world, {
          stableKey: "rest37:supplied-qualified-rival",
          candidatePersonId: built.playerPersonId,
          jurisdictionId:
            built.world.people[built.playerPersonId]!.homeJurisdictionId,
          officeKey: "us-ky-general-assembly-v1:house",
          electionDate: addDays(built.world.currentDate, 28),
          rivalPersonIds: [qualifiedRivalId!],
          existingContestId: null,
          committeeName: "Fictional fixture committee",
          donorPoolName: "Fictional fixture contributors",
          advertisingVendorName: "Fictional fixture supplier",
          staffPersonIds: [],
          treasuryCurrency: makeCurrencyCode("USD"),
        }).world
      : fileForOffice(built.world, built.playerPersonId);
  const campaign = campaignForCandidate(filed, built.playerPersonId)!;
  const contest = electionContestById(filed, campaign.contestId)!;
  const winnerPersonId =
    winner === "player"
      ? built.playerPersonId
      : contest.candidatePersonIds.find((id) => id !== built.playerPersonId)!;
  // The supplied result layers over the full campaign registry: a filed
  // campaign also schedules weekly rival evaluation, which must still run.
  const world = advanceWorld(
    filed,
    28,
    composeFutureTransitionHandlerRegistries(
      createFutureTransitionHandlerRegistry([
        [
          "election:contest-resolution",
          (atDate) => {
            const resolved = resolveCampaignElectionFromRecordedInput(atDate, {
              contestId: contest.id,
              winnerPersonId,
              tallies: contest.candidatePersonIds.map((candidatePersonId) => ({
                candidatePersonId,
                votes: 1,
                voteShare: 1 / contest.candidatePersonIds.length,
              })),
              provenance: {
                method: "authored",
                sourceEntityIds: [],
                note: "Supplied fictional result, including its disposition of equal raw ballot counts. No tie-resolution law or outcome evaluation is modeled by this fixture.",
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
      ]),
      createCampaignElectionTransitionRegistry(),
    ),
  );
  return {
    world,
    personId: built.playerPersonId,
    winnerPersonId,
    campaign,
    contest,
  };
}

export function moveToTermDate(world: World, date: string): World {
  let days = 0;
  for (
    let cursor = world.currentDate;
    cursor < date;
    cursor = addDays(cursor, 1)
  )
    days += 1;
  return days
    ? advanceWorld(world, days, createCampaignElectionTransitionRegistry())
    : world;
}

export function winnerQualification(
  world: World,
  winnerPersonId: EntityId,
  contestId: EntityId,
) {
  const contest = electionContestById(world, contestId)!;
  return candidacyEligibility(world, {
    personId: winnerPersonId,
    jurisdictionId: contest.jurisdictionId,
    officeKey: contest.office.officeKey,
    districtBinding: contest.office.districtBinding,
    alreadyACandidate: false,
  });
}

/** Headless fixture clock only; browser controls supply the ordinary-route proof. */
export function enterSupportedTerm(world: World, personId: EntityId): World {
  const work = [...world.history.workRelationships]
    .reverse()
    .find(
      (r) =>
        r.personId === personId && legislativeTermForRelationship(world, r.id),
    );
  const term = work && legislativeTermForRelationship(world, work.id);
  return term ? moveToTermDate(world, term.startsAt) : world;
}

/** A supplied result for an already-filed fixture campaign; never searches for a winning seed. */
export function completeRecordedCampaignFixture(
  world: World,
  personId: EntityId,
): World {
  const campaign = campaignForCandidate(world, personId)!;
  const contest = electionContestById(world, campaign.contestId)!;
  const base = createCampaignElectionTransitionRegistry();
  const supplied = createFutureTransitionHandlerRegistry([
    [
      "election:contest-resolution",
      (atDate, due) => {
        if (!due.entityIds.includes(contest.id))
          return base.get(due.transitionKey)!(atDate, due);
        const resolved = resolveCampaignElectionFromRecordedInput(atDate, {
          contestId: contest.id,
          winnerPersonId: personId,
          tallies: contest.candidatePersonIds.map((candidatePersonId) => ({
            candidatePersonId,
            votes: 1,
            voteShare: 1 / contest.candidatePersonIds.length,
          })),
          provenance: {
            method: "authored",
            sourceEntityIds: [],
            note: "Explicit supplied fictional result with equal raw counts; no candidate rating, outcome evaluation or tie-resolution law inferred.",
          },
        });
        return {
          world: resolved,
          status: "resolved",
          reasonKey: null,
          context: "Supplied fixture result.",
          outcomeEventId: electionContestResult(resolved, contest.id)!
            .outcomeEventId,
        };
      },
    ],
  ]);
  let days = 0;
  for (
    let date = world.currentDate;
    date < contest.electionDate;
    date = addDays(date, 1)
  )
    days += 1;
  return advanceWorld(world, days, {
    ...base,
    get: (key) => supplied.get(key) ?? base.get(key),
  });
}

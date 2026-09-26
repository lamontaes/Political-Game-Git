import { describe, expect, it } from "vitest";

import {
  addDays,
  advanceWorld,
  assertWorldIntegrity,
  campaignForCandidate,
  deserializeWorld,
  measurePosition,
  requireElectionContest,
  requireLifePlace,
  serializeWorld,
} from "../simulation";
import {
  createCampaignElectionTransitionRegistry,
  resolveCampaignElectionFromRecordedInput,
} from "../simulation/campaigns";
import { ELECTION_CONTEST_TRANSITION_KEY } from "../simulation/election-contests";
import { createFutureTransitionHandlerRegistry } from "../simulation/future-transitions";
import { memberBallotOn } from "../simulation/governing/member-ballots";
import { municipalGovernmentForLifePlace } from "../simulation/municipal-government";
import {
  municipalOrganizationFor,
  municipalSeats,
} from "../simulation/municipal-public-work";
import {
  COUNCIL_READING_DUE,
  municipalReadingQuestion,
} from "../simulation/municipal-ordinance-procedure";
import { fileForOffice, projectCampaign } from "./campaign-projection";
import { projectCampaignOffices } from "./campaign-office-discovery";
import {
  introduceProjectedOrdinance,
  placeProjectedOrdinanceOnAgenda,
  projectMunicipalGoverning,
  saveProjectedOrdinanceBallot,
} from "./municipal-governing";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife } from "./ordinary-life";

describe("elected city councilor's saved reading ballot", () => {
  it("carries a recorded election win into the right council seat and its scheduled ordinance vote", () => {
    const place = requireLifePlace("5114968");
    const government = municipalGovernmentForLifePlace(place);
    if (!government) throw new Error("No Charlottesville council profile.");
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "elected-city-member-vote-route",
        placeKey: place.key,
        startAge: 34,
        questionnaire: "skipped",
      }),
    ).game!;
    const personId = game.playerPersonId;
    const opening = openOrdinaryLife(game.world, personId);
    const office = projectCampaignOffices(opening, personId).find(
      (entry) => entry.officeKey.endsWith("-governing-body") && entry.eligible,
    );
    if (!office) throw new Error("No eligible city council office.");
    const beforeSeats = municipalSeats(opening, government.key).filter(
      (seat) => seat.role === "member" || seat.role === "presiding-member",
    );
    const electionDate = addDays(opening.currentDate, 1);
    const filed = fileForOffice(
      opening,
      personId,
      null,
      office.officeKey,
      electionDate,
    );
    const campaign = campaignForCandidate(filed, personId)!;
    const contest = requireElectionContest(filed, campaign.contestId);
    expect(contest.candidatePersonIds).toContain(personId);
    expect(contest.office.seatKey).toBeNull();
    const electionDay = advanceWorld(
      filed,
      1,
      createFutureTransitionHandlerRegistry([
        [
          ELECTION_CONTEST_TRANSITION_KEY,
          (world) => ({
            world,
            status: "resolved" as const,
            reasonKey: null,
            context: "Awaiting the supplied recorded test result.",
            outcomeEventId: null,
          }),
        ],
      ]),
    );
    const elected = resolveCampaignElectionFromRecordedInput(electionDay, {
      contestId: contest.id,
      resolvedAt: electionDate,
      winnerPersonId: personId,
      tallies: contest.candidatePersonIds.map((candidatePersonId) => ({
        candidatePersonId,
        votes: candidatePersonId === personId ? 700 : 300,
        voteShare: candidatePersonId === personId ? 0.7 : 0.3,
      })),
    });
    expect(projectCampaign(elected, personId).phase).toBe("won");
    const seated = deserializeWorld(serializeWorld(elected));
    const seats = municipalSeats(seated, government.key).filter(
      (seat) => seat.role === "member" || seat.role === "presiding-member",
    );
    const mine = seats.filter((seat) => seat.personId === personId);
    expect(mine).toHaveLength(1);
    expect(mine[0]?.seatLabel).toBeTruthy();
    expect(seats).toHaveLength(beforeSeats.length);
    expect(
      seated.history.organizationParticipations.find(
        (entry) => entry.id === mine[0]?.participationId,
      )?.organizationId,
    ).toBe(municipalOrganizationFor(seated, government.key)?.id);
    expect(
      projectMunicipalGoverning(seated, government.key)?.ordinanceVote.ok,
    ).toBe(true);

    const introduced = introduceProjectedOrdinance(
      seated,
      government.key,
      "Ord. 26-1",
      "Public sidewalk access",
    );
    if (!introduced.ok) throw new Error(introduced.reason);
    const measureId = introduced.world.history.legislativeMeasures!.at(-1)!.id;
    const placed = placeProjectedOrdinanceOnAgenda(
      introduced.world,
      government.key,
      measureId,
    );
    if (!placed.ok) throw new Error(placed.reason);
    const due = placed.world.history.futureDueItems.find(
      (item) =>
        item.transitionKey === COUNCIL_READING_DUE &&
        item.entityIds.includes(measureId),
    );
    if (!due) throw new Error("No scheduled council reading.");
    const chosen = saveProjectedOrdinanceBallot(
      placed.world,
      government.key,
      measureId,
      "nay",
    );
    if (!chosen.ok) throw new Error(chosen.reason);
    const saved = deserializeWorld(serializeWorld(chosen.world));
    const question = municipalReadingQuestion(saved, government.key, measureId);
    if (!question)
      throw new Error("The scheduled question was lost on reload.");
    expect(memberBallotOn(saved, personId, question)).toBe("nay");
    expect(
      projectMunicipalGoverning(saved, government.key)?.ordinances.find(
        (entry) => entry.measureId === measureId,
      )?.savedBallot,
    ).toBe("nay");

    const daysToReading = Math.round(
      (Date.parse(due.dueAt) - Date.parse(saved.currentDate)) / 86_400_000,
    );
    const decided = advanceWorld(
      saved,
      daysToReading,
      createCampaignElectionTransitionRegistry(),
    );
    const vote = decided.history.legislativeVotes?.find(
      (entry) => entry.measureId === measureId,
    );
    expect(vote?.provenance.method).toBe("member-decisions");
    expect(
      vote?.dispositions.find((entry) => entry.personId === personId),
    ).toMatchObject({ disposition: "nay", reason: "member:own-ballot" });
    expect(measurePosition(decided, measureId).terminal).toBe(true);
    const reopened = deserializeWorld(serializeWorld(decided));
    expect(
      reopened.history.legislativeVotes?.find(
        (entry) => entry.measureId === measureId,
      )?.id,
    ).toBe(vote?.id);
    expect(
      municipalSeats(reopened, government.key).some(
        (seat) => seat.personId === personId,
      ),
    ).toBe(true);
    assertWorldIntegrity(reopened);
  }, 240_000);
});

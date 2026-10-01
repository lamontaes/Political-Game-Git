import { describe, expect, it } from "vitest";
import { namedSeatForFixture } from "../../tests/fixtures/campaign-fixture";

import {
  addDays,
  campaignForCandidate,
  electionContestById,
  workRoleAt,
  type EntityId,
  type World,
} from "../simulation";
import { stateChamberName } from "../simulation/candidacy-packs";
import {
  completeRecordedCampaignFixture,
  enterSupportedTerm,
} from "../../tests/fixtures/recorded-legislative-term";
import {
  fileForOffice,
  giveElectionSpeech,
  projectCampaign,
} from "./campaign-projection";
import { projectWorkRole } from "./day-overview";
import { projectLegislativeOfficeContext } from "./legislative-office-context";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { requireLocalityInState } from "./new-game-geography";
import { projectOfficeTransition } from "./office-transition";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { passOrdinaryDays } from "./ordinary-life";

/**
 * James in San Antonio won a Texas House seat, 64.9% to 35.1%, and his term
 * began (owner's playtest, 2026-09-23). The campaign page still said the
 * office was "not theirs", a victory speech was still offered three months
 * after the vote, and his role and both campaign committees read "the House
 * of Representatives" with no state.
 */
function texasHouseWin(): {
  readonly decided: World;
  readonly personId: EntityId;
} {
  const home = requireLocalityInState("US-TX", "San Antonio");
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "san-antonio-texas-house",
      startAge: 40,
      placeKey: home.key,
      household: "lives-alone",
      gender: "male",
    }),
  ).game!;
  const personId = game.playerPersonId;
  const filed = fileForOffice(
    game.world,
    personId,
    namedSeatForFixture(
      game.world,
      personId,
      "us-tx-legislature-profile-v1:house",
    ),
    "us-tx-legislature-profile-v1:house",
    addDays(game.world.currentDate, 21),
  );
  return {
    decided: completeRecordedCampaignFixture(filed, personId),
    personId,
  };
}

describe("a Texas House seat won from San Antonio", () => {
  it("names the Texas chamber, closes the speech after election night, and says the term began", () => {
    const { decided, personId } = texasHouseWin();
    const before = projectCampaign(decided, personId);
    expect(before.phase).toBe("won");
    expect(before.afterword).toMatch(
      /won, \d+\.\d% to \d+\.\d%\. The term begins January 1, 2027; until then the office is not his\.$/,
    );

    // Election night: the speech is offered, and can be given.
    expect(before.speech).toMatchObject({ kind: "victory", given: null });
    const spoke = giveElectionSpeech(decided, personId);
    expect(projectCampaign(spoke, personId).speech?.given).toMatch(
      /gave a victory speech after winning the race for Seat in the Texas House of Representatives\./,
    );

    // Four days on, it is no longer offered, and the writer refuses it.
    const later = passOrdinaryDays(decided, 4);
    expect(projectCampaign(later, personId).speech).toBeNull();
    expect(() => giveElectionSpeech(later, personId)).toThrow(
      /Election night is over/,
    );
    // A speech given on the night stays on the record afterwards.
    expect(
      projectCampaign(passOrdinaryDays(spoke, 4), personId).speech?.given,
    ).toBeTruthy();

    // The chamber is the state's own, wherever the office is named.
    const campaign = campaignForCandidate(decided, personId)!;
    const contest = electionContestById(decided, campaign.contestId)!;
    expect(contest.office.title).toBe(
      "Seat in the Texas House of Representatives",
    );
    expect(before.committeeName).toMatch(
      / for the Texas House of Representatives$/,
    );
    const rivalCommittees = decided.history.organizationProfiles
      .map((profile) => profile.name)
      .filter(
        (name) =>
          / for .*House of Representatives$/.test(name) &&
          name !== before.committeeName,
      );
    expect(rivalCommittees.length).toBeGreaterThan(0);
    for (const name of rivalCommittees)
      expect(name).toMatch(/ for the Texas House of Representatives$/);
    expect(projectOfficeTransition(decided, personId)?.electTitle).toBe(
      "Member-elect of the Texas House of Representatives",
    );

    // The term begins: the afterword says it has, and the role names Texas.
    const seated = enterSupportedTerm(decided, personId);
    expect(seated.currentDate).toBe("2027-01-01");
    const after = projectCampaign(seated, personId);
    expect(after.afterword).toMatch(
      /won, \d+\.\d% to \d+\.\d%\. The term began January 1, 2027\.$/,
    );
    expect(after.afterword).not.toMatch(/until then|\btheirs?\b/);
    expect(after.speech).toBeNull();
    const seat = seated.history.workRelationships.find(
      (relationship) =>
        relationship.personId === personId &&
        relationship.kind === "employment:legislative-member",
    )!;
    expect(workRoleAt(seated, seat.id)?.title).toBe(
      "Seat in the Texas House of Representatives",
    );
    expect(projectWorkRole(seated, personId).sentence).toContain(
      "Texas House of Representatives",
    );
    const office = projectLegislativeOfficeContext(seated, personId);
    expect(office.member).toMatchObject({
      kind: "member",
      chamberLabel: "Texas House of Representatives",
    });
  }, 900_000);

  it("names a chamber for its state only from the canonical state name", () => {
    expect(stateChamberName("US-TX", "Senate")).toBe("Texas Senate");
    expect(stateChamberName("US-NE", "Legislature")).toBe(
      "Nebraska Legislature",
    );
    expect(stateChamberName("US-MD", "House of Delegates")).toBe(
      "Maryland House of Delegates",
    );
    // Already carrying it, or not a state the game can name: left as recorded.
    expect(stateChamberName("US-TX", "Texas Senate")).toBe("Texas Senate");
    expect(stateChamberName("US-PR", "Senate")).toBe("Senate");
  });
});

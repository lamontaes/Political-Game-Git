import { describe, expect, it } from "vitest";

import { campaignUntilDecided } from "../../tests/fixtures/campaign-fixture";
import {
  addDays,
  advanceWorld,
  campaignForCandidate,
  deserializeWorld,
  requireElectionContest,
  requireLifePlace,
  serializeWorld,
} from "../simulation";
import { municipalGovernmentForLifePlace } from "../simulation/municipal-government";
import { MUNICIPAL_COUNCIL_OPENING_VERSION } from "../simulation/municipal-council-opening";
import { resolveCampaignElectionFromRecordedInput } from "../simulation/campaigns";
import { ELECTION_CONTEST_TRANSITION_KEY } from "../simulation/election-contests";
import { createFutureTransitionHandlerRegistry } from "../simulation/future-transitions";
import {
  municipalOrganizationFor,
  municipalOrganizationKey,
  municipalSeats,
} from "../simulation/municipal-public-work";
import { governmentUnitsForPlace } from "../simulation/government-units";
import { localGovernmentOrganizationKey } from "../simulation/nationwide-world/local-governments";
import { municipalSeatChoices } from "../simulation/municipal-seat-identity";
import { fileForOffice, projectCampaign } from "./campaign-projection";
import { projectCampaignOffices } from "./campaign-office-discovery";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife } from "./ordinary-life";

describe("an elected municipal council member", () => {
  it.each([
    { placeKey: "5114968", seed: "ordinary-cville-council-route" },
    { placeKey: "1150000", seed: "ordinary-dc-council-route" },
  ])(
    "takes a saved council seat in $placeKey",
    ({ placeKey, seed }) => {
      const place = requireLifePlace(placeKey);
      const government = municipalGovernmentForLifePlace(place);
      if (!government) throw new Error("No compiled municipal government.");
      const game = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          seed,
          placeKey: place.key,
          startAge: 34,
          questionnaire: "skipped",
        }),
      ).game!;
      const personId = game.playerPersonId;
      const opening = openOrdinaryLife(game.world, personId);
      const office = projectCampaignOffices(opening, personId).find(
        (entry) =>
          entry.officeKey.endsWith("-governing-body") && entry.eligible,
      );
      if (!office) throw new Error("No eligible council office.");
      const seatChoices = municipalSeatChoices(
        opening,
        personId,
        office.officeKey,
      );
      const target = seatChoices.find((choice) => choice.eligible) ?? null;
      if (placeKey === "1150000") {
        expect(target?.label).toBe("At-large member, seat 1");
        expect(seatChoices.filter((choice) => !choice.eligible)).toHaveLength(
          8,
        );
        expect(() =>
          fileForOffice(
            opening,
            personId,
            null,
            office.officeKey,
            addDays(opening.currentDate, 28),
          ),
        ).toThrow("Choose a recorded at-large or ward seat");
        expect(() =>
          fileForOffice(
            opening,
            personId,
            null,
            office.officeKey,
            addDays(opening.currentDate, 28),
            seatChoices.find((choice) => !choice.eligible)!.key,
          ),
        ).toThrow("ward eligibility is unproved");
      } else {
        expect(seatChoices).toEqual([]);
      }
      const beforeTarget = target
        ? municipalSeats(opening, government.key).find(
            (seat) => seat.seatLabel === target.label,
          )
        : null;
      const openingSeatCount = municipalSeats(opening, government.key).filter(
        (seat) => seat.role === "member" || seat.role === "presiding-member",
      ).length;
      const openingEvent = opening.history.events.find(
        (event) =>
          event.stableKey ===
          `${MUNICIPAL_COUNCIL_OPENING_VERSION}:${government.key}`,
      );
      const openingMemberIds = new Set(
        municipalSeats(opening, government.key)
          .filter(
            (seat) =>
              (seat.role === "member" || seat.role === "presiding-member") &&
              openingEvent?.involvedEntityIds.includes(seat.personId),
          )
          .map((seat) => seat.personId),
      );
      const filed = fileForOffice(
        opening,
        personId,
        null,
        office.officeKey,
        addDays(opening.currentDate, 28),
        target?.key ?? null,
      );
      const campaign = campaignForCandidate(filed, personId)!;
      expect(
        requireElectionContest(filed, campaign.contestId).office.seatKey,
      ).toBe(target?.key ?? null);
      expect(projectCampaign(filed, personId).seatTarget).toBe(
        target?.label ?? null,
      );
      const decided = campaignUntilDecided(filed, personId);
      expect(projectCampaign(decided, personId).phase).toBe("won");
      const reopened = deserializeWorld(serializeWorld(decided));
      const mine = municipalSeats(reopened, government.key).filter(
        (seat) => seat.personId === personId,
      );
      expect(mine).toHaveLength(1);
      const currentMembers = municipalSeats(reopened, government.key).filter(
        (seat) => seat.role === "member" || seat.role === "presiding-member",
      );
      expect(currentMembers).toHaveLength(openingSeatCount);
      if (target) {
        expect(mine[0]?.seatLabel).toBe(target.label);
        expect(
          municipalSeats(reopened, government.key).some(
            (seat) => seat.personId === beforeTarget?.personId,
          ),
        ).toBe(false);
      } else {
        // At-large victory replaces an actual opening member. Capacity stays
        // full, and no unrecorded vacancy is created to make room.
        const remainingOpeningMembers = currentMembers.filter((seat) =>
          openingMemberIds.has(seat.personId),
        );
        expect([...openingMemberIds]).toHaveLength(openingSeatCount);
        expect(remainingOpeningMembers).toHaveLength(openingSeatCount - 1);
      }
    },
    900_000,
  );

  it("seats a catalog municipality winner on the existing council organization", () => {
    const place = requireLifePlace("0162328");
    const unit = governmentUnitsForPlace(place.sourceGeoid!).find(
      (entry) => entry.unitType === "municipality" && entry.functionalActive,
    )!;
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "local-city-AL",
        placeKey: place.key,
        startAge: 34,
        questionnaire: "skipped",
      }),
    ).game!;
    const personId = game.playerPersonId;
    const opening = openOrdinaryLife(game.world, personId);
    const office = projectCampaignOffices(opening, personId).find(
      (entry) => entry.officeKey.endsWith("-governing-body") && entry.eligible,
    )!;
    expect(office).toBeDefined();
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
    const atElection = advanceWorld(
      filed,
      1,
      createFutureTransitionHandlerRegistry([
        [
          ELECTION_CONTEST_TRANSITION_KEY,
          (world) => ({
            world,
            status: "resolved" as const,
            reasonKey: null,
            context: "Awaiting the supplied test result",
            outcomeEventId: null,
          }),
        ],
      ]),
    );
    expect(contest.candidatePersonIds).toHaveLength(2);
    const decided = resolveCampaignElectionFromRecordedInput(atElection, {
      contestId: contest.id,
      resolvedAt: electionDate,
      winnerPersonId: personId,
      tallies: contest.candidatePersonIds.map((candidatePersonId) => ({
        candidatePersonId,
        votes: candidatePersonId === personId ? 700 : 300,
        voteShare: candidatePersonId === personId ? 0.7 : 0.3,
      })),
    });
    const reopened = deserializeWorld(serializeWorld(decided));
    expect(
      municipalSeats(reopened, unit.id).some(
        (seat) => seat.personId === personId,
      ),
    ).toBe(true);
    expect(
      reopened.history.organizations.filter(
        (entry) => entry.stableKey === municipalOrganizationKey(unit.id),
      ),
    ).toHaveLength(1);
    expect(
      reopened.history.organizations.some(
        (entry) => entry.stableKey === localGovernmentOrganizationKey(unit),
      ),
    ).toBe(false);
    expect(municipalOrganizationFor(reopened, unit.id)).not.toBeNull();
  });
});

import { describe, expect, it } from "vitest";

import { campaignUntilDecided } from "../../tests/fixtures/campaign-fixture";
import {
  addDays,
  campaignForCandidate,
  deserializeWorld,
  requireElectionContest,
  requireLifePlace,
  serializeWorld,
} from "../simulation";
import { municipalGovernmentForLifePlace } from "../simulation/municipal-government";
import { municipalSeats } from "../simulation/municipal-public-work";
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
      expect(
        municipalSeats(reopened, government.key).filter(
          (seat) => seat.role === "member" || seat.role === "presiding-member",
        ),
      ).toHaveLength(openingSeatCount);
      if (target) {
        expect(mine[0]?.seatLabel).toBe(target.label);
        expect(
          municipalSeats(reopened, government.key).some(
            (seat) => seat.personId === beforeTarget?.personId,
          ),
        ).toBe(false);
      }
    },
    900_000,
  );
});

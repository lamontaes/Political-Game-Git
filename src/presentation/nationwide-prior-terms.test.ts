import { describe, expect, it } from "vitest";
import {
  deserializeWorld,
  recordedTermsInOffice,
  searchLifePlaces,
  serializeWorld,
  stateExecutiveOffice,
} from "../simulation";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { currentPublicOfficeholders } from "./opening-officeholders";

describe("NATIONWIDE recorded terms in an exact office", () => {
  it("counts the opening governor's tenure once, and nobody else's", () => {
    const place = searchLifePlaces("", 1, {
      stateJurisdictionKey: "US-OH",
      scope: "locality",
    })[0]!;
    const { world, playerPersonId } = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "prior-terms-ohio",
        placeKey: place.key,
        startAge: 40,
        questionnaire: "skipped",
      }),
    ).game!;
    const ohio = stateExecutiveOffice("OH")!;
    const kentucky = stateExecutiveOffice("KY")!;
    const holder = currentPublicOfficeholders(world).find(
      (record) => record.officeKey === ohio.officeKey,
    )!;

    expect(recordedTermsInOffice(world, playerPersonId, ohio.officeKey)).toBe(
      0,
    );
    expect(recordedTermsInOffice(world, holder.personId, ohio.officeKey)).toBe(
      1,
    );
    expect(
      recordedTermsInOffice(world, holder.personId, kentucky.officeKey),
    ).toBe(0);

    const reopened = deserializeWorld(serializeWorld(world));
    expect(
      recordedTermsInOffice(reopened, holder.personId, ohio.officeKey),
    ).toBe(1);
  });
});

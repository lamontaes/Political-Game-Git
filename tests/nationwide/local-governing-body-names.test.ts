import { describe, expect, it } from "vitest";

import { governmentUnit } from "../../src/simulation/government-units";
import { localGoverningBodyName } from "../../src/simulation/nationwide-world/local-governing-body-names";
import {
  localGoverningBodyCandidacyPack,
  localGoverningBodyIdentity,
  localGoverningBodyIdentityForOfficeKey,
} from "../../src/simulation/nationwide-world/local-governing-body-candidacy-packs";

function unit(id: string) {
  const found = governmentUnit(`gus2025:${id}`);
  if (!found) throw new Error(`No government unit ${id}`);
  return found;
}

const SEATTLE = "184255";
const ANCHORAGE_AK = "194463";
const ANCHORAGE_KY = "105399";
const OAK_PARK_IL = "124892";
const BLACKSBURG_VA = "209701";
const STATE_COLLEGE_PA = "133519";

describe("a town's governing body by its own name", () => {
  it("Seattle, WA: the Seattle City Council", () => {
    const identity = localGoverningBodyIdentity(unit(SEATTLE))!;
    expect(identity.bodyName).toBe("Seattle City Council");
    expect(identity.officeTitle).toBe("Council member");
    // Seattle's compiled reading says "City Council", but that record carries
    // no identity link or Census place, and names are never matched, so the
    // city reaches it only through the placeholder for a city, which agrees.
    expect(localGoverningBodyName(unit(SEATTLE)).basis).toBe("game-profile");
    // What the ballot shows.
    const [office] = localGoverningBodyCandidacyPack(identity).offices;
    expect(office!.chamberName).toBe("Seattle City Council");
    expect(office!.office.title).toBe("Council member");
    // The office key is the one old saves hold.
    expect(identity.officeKey).toBe("local-government-184255-governing-body");
    expect(
      localGoverningBodyIdentityForOfficeKey(identity.officeKey)?.bodyName,
    ).toBe("Seattle City Council");
  });

  it("Anchorage, AK: the Assembly its read government names; Anchorage, KY is not matched by name", () => {
    const alaska = localGoverningBodyName(unit(ANCHORAGE_AK));
    expect(alaska).toEqual({
      bodyName: "Anchorage Assembly",
      shortBodyName: "Anchorage Assembly",
      memberTitle: "Member of the Anchorage Assembly",
      basis: "read",
    });
    const kentucky = localGoverningBodyName(unit(ANCHORAGE_KY));
    expect(kentucky.bodyName).toBe("Anchorage City Council");
    expect(kentucky.basis).toBe("game-profile");
  });

  it.each([
    [OAK_PARK_IL, "Oak Park Village Board", "Village Board", "Trustee"],
    [
      BLACKSBURG_VA,
      "Blacksburg Town Council",
      "Town Council",
      "Council member",
    ],
    [
      STATE_COLLEGE_PA,
      "State College Borough Council",
      "Borough Council",
      "Council member",
    ],
  ])(
    "unread %s: the game's placeholder for its form of government",
    (id, bodyName, shortBodyName, memberTitle) => {
      expect(localGoverningBodyName(unit(id))).toEqual({
        bodyName,
        shortBodyName,
        memberTitle,
        basis: "game-profile",
      });
      const identity = localGoverningBodyIdentity(unit(id))!;
      expect(identity.bodyName).toBe(bodyName);
      expect(identity.officeTitle).toBe(memberTitle);
      expect(identity.officeKey).toBe(`local-government-${id}-governing-body`);
    },
  );
});

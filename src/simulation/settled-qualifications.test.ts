import { describe, expect, it } from "vitest";

import { stateCandidacyPack } from "./candidacy-packs";

describe("a qualification a state's constitution states plainly", () => {
  it("gives the Maine House its constitutional minimum age of 21, not a drawn one", () => {
    const maine = stateCandidacyPack("US-ME")!;
    const house = maine.offices.find((office) =>
      /house/i.test(office.chamberName),
    )!;
    expect(house).toBeDefined();
    const age = house.qualification.minimumAge;
    expect(age.kind).toBe("known");
    if (age.kind !== "known") return;
    expect(age.value).toBe(21);
    expect(age.source.authority).toBe("constitution");
    expect(age.source.citation).toBe("Me. Const. art. IV, pt. 1, § 4");
    // Cited, not yet retrieved into the repository.
    expect(age.source.verification).toBe("partial");
  });

  it("leaves the Maine Senate, which the table does not name, on the drawn stand-in", () => {
    const senate = stateCandidacyPack("US-ME")!.offices.find((office) =>
      /senate/i.test(office.chamberName),
    )!;
    const age = senate.qualification.minimumAge;
    if (age.kind === "known")
      expect(age.source.verification).toBe("game-profile");
  });
});

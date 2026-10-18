import { describe, expect, it } from "vitest";
import {
  boardBodyName,
  governmentTitleName,
  localOfficesForPlace,
} from "./offices-local";
import { drawPlace } from "../../tests/golden-path/place";

const seed =
  process.env.GOLDEN_PATH_SEED ??
  `names:${Date.now()}:${Math.random().toString(16).slice(2)}`;

describe("a local body is named the way people write it", () => {
  it("writes a listed government in capitals as a name", () => {
    expect(governmentTitleName("VILLAGE OF EXAMPLE")).toBe(
      "Village of Example",
    );
    expect(governmentTitleName("TOWN OF NEW-PORT AND SONS")).toBe(
      "Town of New-Port and Sons",
    );
  });

  it("does not say the kind of government twice", () => {
    expect(boardBodyName("COUNTY OF EXAMPLE", "County Commission")).toBe(
      "Example County Commission",
    );
    expect(boardBodyName("PARISH OF ST EXAMPLE", "Parish Council")).toBe(
      "St Example Parish Council",
    );
    expect(boardBodyName("PARISH OF EXAMPLE", "Police Jury")).toBe(
      "Example Parish Police Jury",
    );
    expect(boardBodyName("COUNTY OF EXAMPLE", "Board of Supervisors")).toBe(
      "Example County Board of Supervisors",
    );
    expect(
      boardBodyName("COUNTY OF EXAMPLE", "Board of County Commissioners"),
    ).toBe("Board of County Commissioners of Example County");
  });

  it(`names every body of places drawn from all 56 from its own record (seed ${seed})`, () => {
    let checked = 0;
    for (let i = 0; i < 24; i += 1) {
      const place = drawPlace(`${seed}:${i}`, "body-names");
      for (const office of localOfficesForPlace(place.key)) {
        if (!office.bodyName) continue;
        checked += 1;
        const where = `${place.name}: ${office.bodyName}`;
        // No listing in capitals, no kind of government said twice.
        expect(office.bodyName, where).not.toMatch(/[A-Z]{3,}/);
        expect(office.bodyName, where).not.toMatch(/\b(\w+) \1\b/i);
      }
    }
    expect(checked).toBeGreaterThan(0);
  }, 300_000);
});

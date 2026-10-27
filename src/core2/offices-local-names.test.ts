import { municipalGovernments } from "./gov-rules/municipal-government";
import { localGoverningBodyName } from "./gov-rules/local-governing-body-rules";
import {
  governmentUnitStates,
  governmentUnitsForState,
} from "./reference/government-units";
import { searchCorePlaces } from "./place-lookup";
import bodyNames from "./data/offices/body-names.json" with { type: "json" };
import townships from "../../data/research/local-government/township-governing-bodies.json" with { type: "json" };
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

  it("names a council as its charter names it where the town's government is compiled", () => {
    const named = municipalGovernments().filter(
      (government) => government.reading.bodyName && government.placeGeoid,
    );
    expect(named.length).toBeGreaterThan(0);
    let checked = 0;
    for (const government of named) {
      let council;
      try {
        council = localOfficesForPlace(government.placeGeoid!).find(
          (office) => office.kind === "council",
        );
      } catch {
        // A compiled government whose place the game's place list lacks.
        continue;
      }
      if (!council) continue;
      expect(council.bodyName, government.key).toBe(
        government.reading.bodyName,
      );
      checked += 1;
    }
    expect(checked, "compiled councils checked").toBeGreaterThan(20);
  }, 300_000);
  it("names a council with no compiled charter by the usual body of its kind of town in its state", () => {
    const byKind = bodyNames.municipalByKind as Record<
      string,
      { value: string }
    >;
    const byState = bodyNames.municipalByState as Record<
      string,
      Record<string, { value: string }>
    >;
    const seen = new Set<string>();
    let checked = 0;
    for (const state of governmentUnitStates())
      for (const unit of governmentUnitsForState(state)) {
        const words = unit.name.trim().split(" ");
        const kind = words[1] === "OF" ? words[0]!.toLowerCase() : "";
        const key = `${state}:${kind}`;
        if (
          unit.unitType !== "municipality" ||
          !byKind[kind] ||
          seen.has(key) ||
          !unit.placeGeoid ||
          localGoverningBodyName(unit)
        )
          continue;
        let council;
        try {
          council = localOfficesForPlace(unit.placeGeoid).find(
            (office) =>
              office.kind === "council" && office.jurisdiction === unit.id,
          );
        } catch {
          continue;
        }
        if (!council) continue;
        seen.add(key);
        const usual = byState[state]?.[kind] ?? byKind[kind]!;
        expect(council.bodyName, `${unit.name} (${state})`).toBe(
          `${governmentTitleName(words.slice(2).join(" "))} ${usual.value}`,
        );
        checked += 1;
      }
    // One town of each kind in each state the listing has it in.
    expect(checked, [...seen].join(", ")).toBeGreaterThan(80);
  }, 300_000);

  it("names a New England town's board a select board where its state's reading says so", () => {
    const readings = townships.states as Record<string, { bodyName: string }>;
    const select = Object.entries(readings).filter(([, r]) =>
      /^select ?board$/i.test(r.bodyName),
    );
    expect(select.length).toBeGreaterThan(0);
    for (const [state, reading] of select) {
      let board;
      for (const place of searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: `US-${state}`,
        scope: "locality",
      })) {
        try {
          board = localOfficesForPlace(place.key).find(
            (office) => office.kind === "township-board",
          );
        } catch {
          continue;
        }
        if (board) break;
      }
      expect(board, `a town board in ${state}`).toBeDefined();
      expect(board!.bodyName, state).toMatch(
        new RegExp(` ${reading.bodyName}$`),
      );
    }
  }, 300_000);
});

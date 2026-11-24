/**
 * A county's ballot carries the row offices its state's law has the voters
 * elect, and no others (playtest sitting C12: a New Jersey county listed a
 * County assessor and County treasurer, which New Jersey does not elect). For
 * every state whose row in the research file is read, one county is drawn by
 * the seed it prints (GOLDEN_PATH_SEED) among those with a place, and its
 * offices are checked against each read row (in a state with no county
 * government, the first drawn place): an office the law has the voters
 * elect is on the ballot with the row's own term where it gives one, and an
 * office it fills by appointment is not.
 */
import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import table from "../../data/research/government/county-row-offices-by-state.json" with { type: "json" };
import {
  COUNTY_ROW_OFFICE_KEYS,
  countyElectedRowOffices,
} from "./gov-rules/county-row-offices";
import { localOfficesForPlace } from "./offices-local";
import {
  governmentUnitsForState,
  type GovernmentUnitIdentity,
} from "./reference/government-units";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

interface Row {
  readonly elected?: boolean;
  readonly basis?: string;
  readonly termYears?: number;
}
const STATES = table.states as unknown as Record<
  string,
  Record<string, Row | undefined>
>;

const rank = (key: string) =>
  createHash("sha256").update(`${seed}:${key}`).digest("hex");

/** Places a government in the state governs, in the seed's order. */
function placesOf(usps: string): string[] {
  return [
    ...new Set(
      governmentUnitsForState(usps).flatMap((unit) =>
        unit.functionalActive && unit.placeGeoid ? [unit.placeGeoid] : [],
      ),
    ),
  ].sort((a, b) => rank(a).localeCompare(rank(b)));
}

const counties = (usps: string) =>
  new Set(
    governmentUnitsForState(usps)
      .filter((unit) => unit.unitType === "county")
      .map((unit: GovernmentUnitIdentity) => unit.id),
  );

describe(`a county's ballot carries the row offices its state's law elects (seed ${seed})`, () => {
  for (const [usps, rows] of Object.entries(STATES)) {
    const read = COUNTY_ROW_OFFICE_KEYS.filter(
      (office) => rows[office]?.basis === "read",
    );
    if (read.length === 0) continue;
    it(usps, () => {
      const countyIds = counties(usps);
      const passed: string[] = [];
      let found: { place: string; county: string } | undefined;
      for (const place of placesOf(usps)) {
        let offices: ReturnType<typeof localOfficesForPlace> = [];
        try {
          offices = localOfficesForPlace(place);
        } catch {
          offices = [];
        }
        const board = offices.find(
          (office) =>
            office.kind === "county-board" &&
            countyIds.has(office.jurisdiction),
        );
        if (board) {
          found = { place, county: board.jurisdiction };
          break;
        }
        passed.push(place);
        if (passed.length > 40) break;
      }
      process.stdout.write(
        `county-row: ${usps}: ${found?.place} (${found?.county}); passed over: ${passed.length}\n`,
      );
      // Every county government of the state, drawn: the rule itself.
      const unit = governmentUnitsForState(usps)
        .filter((u) => u.unitType === "county" && u.functionalActive)
        .sort((a, b) => rank(a.id).localeCompare(rank(b.id)))[0];
      const ruled = unit ? countyElectedRowOffices(unit) : [];
      for (const office of read)
        expect(
          ruled.some((rule) => rule.office === office),
          `${usps} ${office} on ${unit?.name ?? "no county government"}`,
        ).toBe(Boolean(rows[office]!.elected));
      // A state with no county government (its counties are areas only)
      // elects none of these: the drawn place's ballot carries no row office.
      const place = found?.place ?? placesOf(usps)[0];
      if (!place) return;
      const offices = localOfficesForPlace(place).filter(
        (office) => !found || office.jurisdiction === found.county,
      );
      for (const office of read) {
        const row = rows[office]!;
        const held = offices.find((o) => o.kind === `county-${office}`);
        const where = `${usps} ${office} at ${place}`;
        if (row.elected) {
          expect(found, `no ${usps} place with a county board`).toBeDefined();
          expect(held, where).toBeDefined();
          expect(held!.estimate, where).toBe(false);
          if (row.termYears !== undefined)
            expect(held!.termYears, where).toBe(row.termYears);
        } else expect(held, where).toBeUndefined();
      }
    });
  }
});

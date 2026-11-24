/**
 * A town whose own charter is not read has the council its class has in its
 * state's law (playtest sitting C9, N8-P17: Bloomsbury, New Jersey showed a
 * five-seat nonpartisan council where a borough has a Mayor and six members).
 * For every state and class the research file reads, one government of that
 * class is drawn by the seed it prints (GOLDEN_PATH_SEED), among those with a
 * place and no reading of their own, and its offices are checked against the
 * statute's row. A class the file does not read keeps the national typical
 * council, so the three tiers stay in order.
 */
import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import forms from "../../data/research/local-government/municipal-class-forms.json" with { type: "json" };
import { municipalGovernmentForUnit } from "./gov-rules/municipal-government";
import { municipalClassOf } from "./gov-rules/municipal-class-form";
import { localOfficesForPlace } from "./offices-local";
import { resolveMunicipalElectionTiming } from "./gov-rules/municipal-ballot-rules";
import {
  governmentUnitStates,
  governmentUnitsForState,
  type GovernmentUnitIdentity,
} from "./reference/government-units";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

interface Row {
  readonly seats: number;
  readonly termYears?: number;
  readonly staggered?: boolean;
  readonly atLarge?: boolean;
  readonly timing?: string;
  readonly byParty?: boolean;
  readonly chief?: {
    readonly title: string;
    readonly directlyElected: boolean;
    readonly termYears?: number;
  };
  readonly url: string;
}
const STATES = forms.states as unknown as Record<string, Record<string, Row>>;

const rank = (unit: GovernmentUnitIdentity) =>
  createHash("sha256").update(`${seed}:${unit.id}`).digest("hex");

/** Units of one state and class with a place and no reading of their own, in the seed's order. */
function unread(
  usps: string,
  municipalClass: string | null,
): GovernmentUnitIdentity[] {
  return governmentUnitsForState(usps)
    .filter(
      (unit) =>
        unit.unitType === "municipality" &&
        unit.functionalActive &&
        unit.placeGeoid !== null &&
        (municipalClass === null
          ? !STATES[usps]?.[municipalClassOf(unit) ?? ""]
          : municipalClassOf(unit) === municipalClass) &&
        !municipalGovernmentForUnit(unit),
    )
    .sort((a, b) => rank(a).localeCompare(rank(b)));
}

function officesOf(unit: GovernmentUnitIdentity) {
  const offices = localOfficesForPlace(unit.placeGeoid!).filter(
    (office) => office.jurisdiction === unit.id,
  );
  return {
    council: offices.find((office) => office.kind === "council"),
    chief: offices.find((office) => office.kind === "mayor"),
  };
}

describe(`a town has the council its class has in its state's law (seed ${seed})`, () => {
  for (const [usps, classes] of Object.entries(STATES))
    for (const [municipalClass, row] of Object.entries(classes))
      it(`${usps} ${municipalClass}`, () => {
        const passed: string[] = [];
        let unit: GovernmentUnitIdentity | undefined;
        for (const candidate of unread(usps, municipalClass)) {
          try {
            if (officesOf(candidate).council) {
              unit = candidate;
              break;
            }
            passed.push(`${candidate.name}: no council office`);
          } catch (error) {
            passed.push(`${candidate.name}: ${(error as Error).message}`);
          }
        }
        process.stdout.write(
          `class-form: ${usps} ${municipalClass}: ${unit?.name} (${unit?.placeGeoid}); passed over: ${passed.join("; ") || "none"}\n`,
        );
        expect(
          unit,
          `no unread ${usps} ${municipalClass} with a place`,
        ).toBeDefined();
        const { council, chief } = officesOf(unit!);
        const where = `${unit!.name} (${unit!.placeGeoid})`;
        expect(council!.seats, where).toBe(row.seats);
        // A term or staggering the statute does not give stays the typical
        // council's: the seats take turns.
        if (row.termYears !== undefined)
          expect(council!.termYears, where).toBe(row.termYears);
        expect(council!.staggered ?? true, where).toBe(row.staggered ?? true);
        expect(council!.estimate, where).toBe(row.termYears === undefined);
        expect(council!.source, where).toContain(row.url);
        expect(council!.byParty, where).toBe(row.byParty);
        if (row.atLarge) {
          expect(council!.districted, where).toBe(false);
          expect(council!.method?.basis, where).toBe("class-law");
        }
        if (row.chief) {
          expect(chief, where).toBeDefined();
          expect(chief!.title, where).toBe(row.chief.title);
          expect(chief!.elected, where).toBe(row.chief.directlyElected);
          if (row.chief.directlyElected)
            expect(chief!.byParty, where).toBe(row.byParty);
          if (row.chief.termYears !== undefined)
            expect(chief!.termYears, where).toBe(row.chief.termYears);
        }
        if (row.timing)
          expect(
            resolveMunicipalElectionTiming(usps, unit!.placeGeoid!),
            where,
          ).toEqual({ timing: row.timing, basis: "class-law" });
      });

  it("leaves a class its state's law is not read for on the national typical council", () => {
    const usps = Object.keys(STATES).sort((a, b) =>
      createHash("sha256")
        .update(`${seed}:${a}`)
        .digest("hex")
        .localeCompare(
          createHash("sha256").update(`${seed}:${b}`).digest("hex"),
        ),
    );
    let unit: GovernmentUnitIdentity | undefined;
    for (const state of [...usps, ...governmentUnitStates()]) {
      unit = unread(state, null).find((candidate) => {
        try {
          return Boolean(officesOf(candidate).council);
        } catch {
          return false;
        }
      });
      if (unit) break;
    }
    expect(unit).toBeDefined();
    const { council } = officesOf(unit!);
    process.stdout.write(
      `class-form: unread class: ${unit!.name} (${unit!.placeGeoid})\n`,
    );
    expect(council!.estimate, unit!.name).toBe(true);
    expect(council!.source, unit!.name).toContain("ICMA");
  });
});

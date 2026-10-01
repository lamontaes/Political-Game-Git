import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { makeIsoDate } from "./dates";
import { electionProspectInput } from "./election-candidate-prospect";
import { newMemberInput } from "./governing/office-continuity";
import { createCandidates } from "./governing/state-governing";
import { stableHash } from "./ids";
import {
  INVENTED_PERSON_AGE_WINDOWS,
  inventedPersonAge,
  inventedPersonAgeBounds,
  inventedPersonBirthDate,
  type InventedPersonRole,
} from "./invented-person-age";
import { congressSeats, MINIMUM_AGE } from "./living-world/congress-seats";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "./life-places";
import { drawNominee } from "./nationwide-world/presidential-turnover";
import { SeededRng } from "./rng";
import type { IsoDate, World } from "./types";
import { base, procedure } from "../../tests/fixtures/funded-service-fixture";

/**
 * A161: every invented person gets an age the same way. The table's window
 * holds for every role, and the converted producers' people fall inside it.
 * The age a window bounds is the one reached in the reference year: the
 * reference year less the birth year, less the role's offset.
 */
function ageInReferenceYear(
  role: InventedPersonRole,
  birthDate: IsoDate,
  referenceDate: IsoDate,
): number {
  return (
    Number(referenceDate.slice(0, 4)) -
    Number(birthDate.slice(0, 4)) -
    INVENTED_PERSON_AGE_WINDOWS[role].birthYearOffset
  );
}

function expectInside(
  role: InventedPersonRole,
  birthDate: IsoDate,
  referenceDate: IsoDate,
  legalMinimumAge?: number,
) {
  const bounds = inventedPersonAgeBounds(role, { legalMinimumAge });
  const age = ageInReferenceYear(role, birthDate, referenceDate);
  expect(age, `${role} ${birthDate}`).toBeGreaterThanOrEqual(bounds.minimum);
  expect(age, `${role} ${birthDate}`).toBeLessThan(bounds.maximumExclusive);
}

/** The first seed whose drawn place (of all 56) holds a congressional seat. */
function drawPlace(): { seed: string; usps: string } {
  const places = lifePlaceStateIdentities();
  expect(places).toHaveLength(56);
  for (let n = 1; n < 200; n++) {
    const seed = `a161-${n}`;
    const { usps } =
      places[parseInt(stableHash(seed).slice(0, 8), 16) % places.length]!;
    if (congressSeats().some((seat) => seat.stateUsps === usps))
      return { seed, usps };
  }
  throw new Error("No place with a seat was drawn.");
}

function inPlace(usps: string): World {
  const jurisdiction = stateJurisdictionForKey(`US-${usps}`)!;
  return {
    ...base,
    jurisdictions: { ...base.jurisdictions, [jurisdiction.id]: jurisdiction },
    jurisdictionOrder: [
      ...new Set([...base.jurisdictionOrder, jurisdiction.id]),
    ],
  };
}

describe("A161: one age-window table and one birth-date helper", () => {
  const { seed, usps } = drawPlace();

  it(`every role's draws stay inside its window (US-${usps}, seed ${seed})`, () => {
    const referenceDate = makeIsoDate("2026-10-01");
    for (const role of Object.keys(
      INVENTED_PERSON_AGE_WINDOWS,
    ) as InventedPersonRole[]) {
      const legalMinimumAge = MINIMUM_AGE["us-house"];
      for (let n = 0; n < 50; n++) {
        const rng = new SeededRng(`${seed}:${role}:${n}`);
        const drawn = inventedPersonBirthDate(rng, {
          role,
          referenceDate,
          legalMinimumAge,
        });
        expectInside(role, drawn, referenceDate, legalMinimumAge);
        const age = inventedPersonAge(new SeededRng(`${seed}:${n}`), role, {
          legalMinimumAge,
        });
        const sameDay = inventedPersonBirthDate(rng, {
          role,
          referenceDate,
          legalMinimumAge,
          age,
          placement: "reference-day",
        });
        expectInside(role, sameDay, referenceDate, legalMinimumAge);
        expect(sameDay.slice(5)).toBe("10-01");
      }
    }
    // An office's rule can only narrow the window, never widen it.
    expect(
      inventedPersonAgeBounds("judge-at-opening", { ceilingExclusive: 66 }),
    ).toEqual({ minimum: 45, maximumExclusive: 66 });
    expect(() =>
      inventedPersonBirthDate(new SeededRng(seed), {
        role: "presidential-nominee",
        referenceDate,
        age: 30,
      }),
    ).toThrow(/outside/);
  });

  it(`the converted producers' people are inside the window (US-${usps}, seed ${seed})`, () => {
    const world = inPlace(usps);
    const jurisdictionId = stateJurisdictionForKey(`US-${usps}`)!.id;

    // office-continuity: a member seated for a vacancy.
    for (const seat of congressSeats().filter((s) => s.stateUsps === usps)) {
      const input = newMemberInput(
        world,
        seat,
        `a161:${seat.seatKey}`,
        new SeededRng(seed).fork(seat.seatKey),
      );
      expectInside(
        "legislative-successor",
        input.birthDate,
        world.currentDate,
        MINIMUM_AGE[seat.chamberKey],
      );
    }

    // presidential-turnover: a party's nominee for the next cycle.
    const cycle = Number(world.currentDate.slice(0, 4)) + 2;
    for (const party of ["democratic", "republican"] as const) {
      const drawn = drawNominee(
        world,
        cycle,
        `a161:nominee:${party}`,
        null,
        party,
      );
      expectInside(
        "presidential-nominee",
        drawn.world.people[drawn.nominee.personId]!.birthDate,
        makeIsoDate(`${cycle}-01-01`),
      );
    }

    // election-candidate-prospect: a background seat's prospect.
    const prospect = electionProspectInput({
      world,
      stableKey: "a161:prospect",
      year: 2028,
      minimumAge: 21,
      homeJurisdictionId: jurisdictionId,
    });
    expectInside(
      "background-seat-prospect",
      prospect.birthDate,
      makeIsoDate("2028-01-01"),
      21,
    );

    // state-governing: people an office considers appointing.
    const candidates = createCandidates(
      world,
      { holderPersonId: procedure.playerPersonId, jurisdictionId },
      "a161:matter",
      3,
    );
    expect(candidates.personIds).toHaveLength(3);
    for (const id of candidates.personIds)
      expectInside(
        "appointment-candidate",
        candidates.world.people[id]!.birthDate,
        world.currentDate,
      );
  });

  it("no producer keeps its own age range: the old per-site computations are gone", () => {
    // A seeded age folded into a birth-date template, or a year less an age,
    // is the per-site pattern this change removed. The files still allowed
    // are not invented by role: the population generator and the town's
    // residents take ages from their own records (A151), and the agency
    // Custom Start authors each person's age.
    const pattern =
      /\$\{[^}]*-\s*(age\b|ageAt[A-Za-z]*|[A-Za-z]*[Rr]ng\.integer\()|(yearOf\([^)]*\)|\.slice\(0, 4\)\)|[Yy]ear) - age\b/;
    const allowed = new Set([
      "src/simulation/people.ts",
      "src/simulation/living-world/town-residents.ts",
      "src/simulation/civil-personnel-start.ts",
    ]);
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (
          path.endsWith(".ts") &&
          !path.endsWith(".test.ts") &&
          !allowed.has(path) &&
          pattern.test(readFileSync(path, "utf8"))
        )
          offenders.push(path);
      }
    };
    walk("src");
    expect(offenders).toEqual([]);
  });
});

/**
 * P15 opening temperament: the owner's five temperament dimensions, spread
 * across people to match real personality norms by age and sex, with a
 * heritable share passed from parents to children.
 *
 * Each dimension is a latent standard score: an inherited part (the parents'
 * mean plus segregation), a part of the person's own, a small upbringing
 * shift, and the sourced age and sex differences of its matching NEO facet.
 * The score is cut into the owner-accepted -2..2 levels at the 10/20/40/20/10
 * spread. This decides who a person is at the opening, never what they do.
 */
import { OPENING_KIN } from "./opening-kin";
import { ageOnDate, makeIsoDate } from "../simulation/dates";
import { PEOPLE_MIND_VERSION } from "../simulation/people-trait-definitions";
import { SeededRng } from "../simulation/rng";
import { parameter as p } from "./parameters";
import { stopgap } from "./stopgaps";
import type { IsoDate, PersonId } from "./types";

const SPEC = OPENING_KIN.personality;

export interface TemperamentSubject {
  id: PersonId;
  birthDate: IsoDate;
  gender?: string;
  /** Known biological parents; anyone missing is an unseen parent drawn fresh. */
  parents: readonly PersonId[];
  /** The canonical upbringing value on the same -2..2 scale, when one exists. */
  upbringing?: Readonly<Record<string, number>>;
}

function normal(rng: SeededRng): number {
  const u = p("one") - rng.next();
  return (
    Math.sqrt(-p("two") * Math.log(u)) *
    Math.cos(p("two") * Math.PI * rng.next())
  );
}

/** Independent standard normals per dimension, then the registered correlated pairs. */
function draws(rng: SeededRng): number[] {
  const values = SPEC.dimensions.map((row) => normal(rng.fork(row.trait)));
  for (const pair of SPEC.correlatedPairs) {
    const first = SPEC.dimensions.findIndex((row) => row.trait === pair.first);
    const second = SPEC.dimensions.findIndex(
      (row) => row.trait === pair.second,
    );
    const rho = p(pair.parameter);
    values[second] =
      rho * values[first]! + Math.sqrt(p("one") - rho * rho) * values[second]!;
  }
  return values;
}

function curve(row: (typeof SPEC.dimensions)[number], age: number): number {
  const x =
    (Math.max(age, SPEC.minimumCurveAge) - SPEC.ageCenter) / SPEC.ageUnitYears;
  return row.ageLinear * x + row.ageQuadratic * x * x;
}

function shiftFor(
  row: (typeof SPEC.dimensions)[number],
  age: number,
  gender: string | undefined,
): number {
  const ageShift =
    (curve(row, age) - curve(row, p("personalityReferenceAge"))) /
    SPEC.tScoreSd;
  const half = row.sexDMaleMinusFemale / p("two");
  const sexShift =
    gender === OPENING_KIN.genders.male
      ? half
      : gender === OPENING_KIN.genders.female
        ? -half
        : p("zero");
  return row.sign * (ageShift + sexShift);
}

function level(z: number): number {
  let index = p("zero");
  for (const cut of SPEC.levels.cutPoints) if (z >= cut) index += p("one");
  return SPEC.levels.values[index]!;
}

export function openingTemperaments(
  subjects: readonly TemperamentSubject[],
  options: { seed: string; startedAt: IsoDate },
): Map<PersonId, Record<string, number>> {
  stopgap("SG-P15-personality-mapping");
  const h2 = p("personalityHeritability");
  const inheritedSd = Math.sqrt(h2);
  const segregationSd = Math.sqrt(h2 / p("two"));
  const ownSd = Math.sqrt(p("one") - h2);
  const root = new SeededRng(options.seed).fork("p15-opening-temperament");
  const genetic = new Map<PersonId, number[]>();
  const result = new Map<PersonId, Record<string, number>>();
  // Elders first, so a parent's inherited part exists before any child's.
  const ordered = [...subjects].sort(
    (a, b) =>
      a.birthDate.localeCompare(b.birthDate) || a.id.localeCompare(b.id),
  );
  for (const subject of ordered) {
    const rng = root.fork(subject.id);
    const known = subject.parents
      .map((id) => genetic.get(id))
      .filter((row): row is number[] => row !== undefined);
    const unseen = rng.fork("unseen-parent");
    const parentGenes = [...known];
    while (parentGenes.length < p("two") && known.length > p("zero"))
      parentGenes.push(draws(unseen).map((value) => value * inheritedSd));
    const segregation = draws(rng.fork("segregation"));
    const genes = known.length
      ? segregation.map(
          (value, index) =>
            (parentGenes[p("zero")]![index]! + parentGenes[p("one")]![index]!) /
              p("two") +
            value * segregationSd,
        )
      : segregation.map((value) => value * inheritedSd);
    genetic.set(subject.id, genes);
    const own = draws(rng.fork("own"));
    const age = ageOnDate(
      makeIsoDate(subject.birthDate),
      makeIsoDate(options.startedAt),
    );
    const traits: Record<string, number> = {};
    SPEC.dimensions.forEach((row, index) => {
      const upbringing =
        (subject.upbringing?.[row.trait] ?? p("zero")) *
        p("personalityUpbringingShift");
      const z =
        genes[index]! +
        own[index]! * ownSd +
        upbringing +
        shiftFor(row, age, subject.gender);
      traits[`${PEOPLE_MIND_VERSION}:${row.trait}`] = level(z);
    });
    result.set(subject.id, traits);
  }
  return result;
}

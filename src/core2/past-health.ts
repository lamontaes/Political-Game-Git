/**
 * The life record, part 6 (owner, Nov 8, 2026: "a girlfriend or a car
 * accident"): a serious illness or injury before the start, told as a night
 * in hospital, written when a person is opened. Each year from the adult age
 * to the start, the share of adults their age with an overnight hospital stay
 * (NHIS 2018, Table P-10a, less childbirth stays) builds a pull against their
 * own seeded line; a pull that reaches it is a stay, and a new line begins.
 * The most recent stay is told, with how many there were. Seeded generation
 * of what happened to them before the world opened; no roll decides what
 * anyone does, and no pregnancy is told (owner, Oct 20).
 */
import pastRows from "./data/past/parameters.json" with { type: "json" };
import { addDays, ageOnDate, makeIsoDate } from "./kernel/dates";
import { SeededRng } from "./kernel/rng";
import { ownPastKind } from "./own-past-kinds";
import {
  grainDate,
  ownWindowOf,
  preStartWindowOf,
  recordPreStartLater,
  wholePastOnce,
} from "./pre-start";
import { coreAPI } from "./state";
import { stopgap } from "./stopgaps";
import type { HistoryRecord } from "./pre-start";
import type { CoreState, IsoDate, PersonState } from "./types";

/** A night or more in hospital before the start, for an illness or injury. */
export const PAST_HOSPITAL_STAY = ownPastKind("health.hospital-stay");

const PAST = pastRows as unknown as Readonly<Record<string, { value: number }>>;
const past = (key: string) => PAST[key]!.value;

/** The yearly share of adults of an age with a stay not for childbirth. */
export function hospitalStayShare(age: number): number {
  const share =
    age < 45
      ? past("pastHospitalStayShare18to44")
      : age < 65
        ? past("pastHospitalStayShare45to64")
        : past("pastHospitalStayShare65Plus");
  return share * past("pastHospitalStayNotBirthShare");
}

/** The stays a person's lines give them before `before`: each one's age. */
export function hospitalStayAges(
  core: CoreState,
  person: Readonly<PersonState>,
  before: string,
): number[] {
  const adult = coreAPI(core).parameter("votingAge");
  const last = ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(before));
  const rng = new SeededRng(core.seed).fork(`past-hospital:${person.id}`);
  // Each stay's seeded line: the pull that must build before it.
  const lineOf = (stay: number) =>
    -Math.log(1 - rng.fork(`stay:${stay}`).next());
  const ages: number[] = [];
  let line = lineOf(0);
  let pull = 0;
  for (let age = adult; age < last; age += 1) {
    pull += -Math.log(1 - hospitalStayShare(age));
    for (; pull >= line; line = lineOf(ages.length)) {
      ages.push(age);
      pull -= line;
    }
  }
  return ages;
}

/** A person's most recent stay before the start, written once into their own past. */
export function pastHealthFor(
  core: CoreState,
  people: readonly PersonState[],
  moduleId: string,
): void {
  const world = preStartWindowOf(core);
  if (!world) return;
  const daysPerYear = coreAPI(core).parameter("daysPerMeanYear");
  for (const person of people) {
    if (!person.alive || !ownWindowOf(core, person)) continue;
    if (!wholePastOnce(core, person.id, "health")) continue;
    // stopgapId: SG-HIST-past-hospital-age-only
    stopgap("SG-HIST-past-hospital-age-only", core);
    const ages = hospitalStayAges(core, person, core.startedAt);
    const age = ages.at(-1);
    if (age === undefined) continue;
    const day = addDays(
      makeIsoDate(person.birthDate),
      Math.round((age + 0.5) * daysPerYear),
    );
    const row: Omit<HistoryRecord, "moduleId"> = {
      id: `${PAST_HOSPITAL_STAY}:${person.id}`,
      // Before the world's window, the birthday in its year; inside it, its
      // own day; never on or after the start.
      date: (day >= core.startedAt
        ? addDays(makeIsoDate(core.startedAt), -1)
        : day < world.from
          ? grainDate(person, day, world.from)
          : day) as IsoDate,
      kind: PAST_HOSPITAL_STAY,
      placeId: person.placeId,
      personIds: [person.id],
      facts: {
        personId: person.id,
        age,
        stays: ages.length,
      },
      publicRecord: false,
      source: {
        tag: "ESTIMATED",
        asOf: core.date,
        citation:
          "NHIS 2018, Summary Health Statistics Table P-10a: the share of adults by age with an overnight hospital stay in a year, less childbirth stays (src/core2/data/past/parameters.json).",
        estimatedFrom:
          "The person's own seeded lines against that yearly share, from the adult age to the start; the most recent stay is told.",
      },
    };
    recordPreStartLater(core, moduleId, [row], { person: person.id });
  }
}

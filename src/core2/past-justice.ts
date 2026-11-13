/**
 * An arrest before the start (gap sheet, Nov 12, 2026, row 4: a past never
 * held an arrest or a charge), written when a person is opened. The share of
 * young people arrested by 18 and by 23 (Brame et al. 2012, NLSY97) is read
 * as a yearly pull from 13, against the person's own seeded line; a pull
 * that reaches it before 23 (and before the start) is an arrest. Of those
 * arrested, the share with a felony conviction (Shannon et al. 2017: 8% of
 * adults) is read against a second line, and of those convicted, the share
 * who went to prison (3% of adults) against a third. The work pass says
 * whether the term fits the person's working life (`prisonTermOf`, handed
 * in): it ends a job the day the term begins and looks for work again on
 * release. Seeded generation of what happened before the world
 * opened; no roll decides what anyone does in play.
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

/** An arrest before the start, told as being accused of a crime. */
export const PAST_ARRESTED = ownPastKind("justice.arrested-before");
/** A felony conviction before the start. */
export const PAST_CONVICTED = ownPastKind("justice.convicted-before");
/** A prison term begun before the start. */
export const PAST_IMPRISONED = ownPastKind("justice.imprisoned-before");
/** A release from prison before the start. */
export const PAST_RELEASED = ownPastKind("justice.released-before");

/** A prison term served before the start: the day it began and the day of release. */
export interface PrisonTerm {
  from: string;
  to: string;
}

const PAST = pastRows as unknown as Readonly<Record<string, { value: number }>>;
const past = (key: string) => PAST[key]!.value;

/** The age arrests are counted from (the study's sample starts at 8; few are arrested before 13). */
const FIRST_AGE = 13;
const BY_18 = 18;
const BY_23 = 23;

/** The share arrested by an age: from none at 13, through the study's shares at 18 and 23. */
function arrestedBy(age: number): number {
  if (age <= FIRST_AGE) return 0;
  if (age <= BY_18)
    return (
      (past("pastArrestShareBy18") * (age - FIRST_AGE)) / (BY_18 - FIRST_AGE)
    );
  const at23 = past("pastArrestShareBy23");
  if (age >= BY_23) return at23;
  const at18 = past("pastArrestShareBy18");
  return at18 + ((at23 - at18) * (age - BY_18)) / (BY_23 - BY_18);
}

/** A seeded line: the pull that must build before it happens. */
const lineOf = (rng: SeededRng) => -Math.log(1 - rng.next());

/**
 * A person's arrest, conviction and prison term before `before`, as the days
 * each happened; undefined for someone never arrested.
 */
export function pastArrestOf(
  core: Readonly<CoreState>,
  person: Readonly<PersonState>,
  before: string,
): { arrested: string; convicted?: string; term?: PrisonTerm } | undefined {
  const api = coreAPI(core as CoreState);
  const daysPerYear = api.parameter("daysPerMeanYear");
  const born = makeIsoDate(person.birthDate);
  const last = Math.min(BY_23, ageOnDate(born, makeIsoDate(before)));
  if (last <= FIRST_AGE) return undefined;
  const rng = new SeededRng(core.seed).fork(`past-arrest:${person.id}`);
  const line = lineOf(rng.fork("arrest"));
  const pullBy = (age: number) => -Math.log(1 - arrestedBy(age));
  if (pullBy(last) < line) return undefined;
  // The age the pull reaches the line, between the whole years around it.
  let age = FIRST_AGE;
  while (pullBy(age + 1) < line) age += 1;
  const share = (line - pullBy(age)) / (pullBy(age + 1) - pullBy(age));
  const day = (years: number) =>
    addDays(born, Math.round(years * daysPerYear)) as string;
  const arrested = day(age + share);
  if (arrested >= before) return undefined;
  const convictedShare =
    past("pastFelonyConvictionShare") / past("pastArrestShareBy23");
  if (-Math.log(1 - convictedShare) < lineOf(rng.fork("convicted")))
    return { arrested };
  const convicted = addDays(
    makeIsoDate(arrested),
    Math.round(past("pastConvictionLagYears") * daysPerYear),
  ) as string;
  if (convicted >= before) return { arrested };
  const prisonShare =
    past("pastPrisonShare") / past("pastFelonyConvictionShare");
  if (-Math.log(1 - prisonShare) < lineOf(rng.fork("prison")))
    return { arrested, convicted };
  const released = addDays(
    makeIsoDate(convicted),
    Math.round(past("pastPrisonTermYears") * daysPerYear),
  ) as string;
  // Living at home at the start: a term not served by then was not served.
  if (released >= before) return { arrested, convicted };
  return { arrested, convicted, term: { from: convicted, to: released } };
}

/** A person's arrest before the start, written once into their own past. */
export function pastJusticeFor(
  core: CoreState,
  people: readonly PersonState[],
  moduleId: string,
  /** The work pass's word on the person's prison term (`prisonTermOf`): only a term their working life leaves room for. */
  termOf: (person: PersonState) => PrisonTerm | undefined,
): void {
  const world = preStartWindowOf(core);
  if (!world) return;
  for (const person of people) {
    if (!person.alive || !ownWindowOf(core, person)) continue;
    if (!wholePastOnce(core, person.id, "justice")) continue;
    // The player is run by the same rule as everyone (owner, Nov 12, 2026,
    // 6:33 p.m.); choosing a past through scenes comes after early access.
    const found = pastArrestOf(core, person, core.startedAt);
    if (!found) continue;
    const term = termOf(person);
    // stopgapId: SG-HIST-past-arrest-age-only
    stopgap("SG-HIST-past-arrest-age-only", core);
    const source = {
      tag: "ESTIMATED" as const,
      asOf: core.date,
      citation:
        "Brame et al. (2012) cumulative arrest by 18 and 23; Shannon et al. (2017) felony conviction and prison shares of adults (src/core2/data/past/parameters.json).",
      estimatedFrom:
        "The person's own seeded lines against those shares, from age 13 to 23 and before the start.",
    };
    const rows: Omit<HistoryRecord, "moduleId">[] = (
      [
        [PAST_ARRESTED, found.arrested],
        [PAST_CONVICTED, found.convicted],
        [PAST_IMPRISONED, term?.from],
        [PAST_RELEASED, term?.to],
      ] as const
    ).flatMap(([kind, date]) =>
      date
        ? [
            {
              id: `${kind}:${person.id}`,
              date: (date < world.from
                ? grainDate(person, date, world.from)
                : date) as IsoDate,
              kind,
              placeId: person.placeId,
              personIds: [person.id],
              facts: { personId: person.id },
              publicRecord: false,
              source,
            },
          ]
        : [],
    );
    recordPreStartLater(core, moduleId, rows, { person: person.id });
  }
}

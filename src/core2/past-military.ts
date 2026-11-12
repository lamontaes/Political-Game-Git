/**
 * Military service before the start (gap sheet, Nov 12, 2026, row 4: no past
 * held service): when a person is opened, the work pass's `serviceOf` says
 * whether they served (the ACS 2024 veteran share for their sex, age and
 * state, against their own seeded line) and when, and this writes the day
 * they enlisted and the day they were discharged into their own past.
 */
import { ownPastKind } from "./own-past-kinds";
import { serviceOf } from "./past-work";
import {
  grainDate,
  ownWindowOf,
  preStartWindowOf,
  recordPreStartLater,
  wholePastOnce,
} from "./pre-start";
import { stopgap } from "./stopgaps";
import type { HistoryRecord } from "./pre-start";
import type { CoreState, IsoDate, PersonState } from "./types";

/** The day a person entered the armed forces, before the start. */
export const PAST_ENLISTED = ownPastKind("military.enlisted");
/** The day they were discharged, before the start. */
export const PAST_DISCHARGED = ownPastKind("military.discharged");

/** A person's service, written once into their own past. */
export function pastServiceFor(
  core: CoreState,
  people: readonly PersonState[],
  moduleId: string,
): void {
  const world = preStartWindowOf(core);
  if (!world) return;
  for (const person of people) {
    if (!person.alive || !ownWindowOf(core, person)) continue;
    if (!wholePastOnce(core, person.id, "service")) continue;
    // A relative elsewhere is read on the opening day, as the work pass reads them.
    const served = serviceOf(
      core,
      person,
      person.tier === "husk" ? core.startedAt : core.date,
    );
    if (!served) continue;
    // stopgapId: SG-HIST-past-service-one-term
    stopgap("SG-HIST-past-service-one-term", core);
    const source = {
      tag: "ESTIMATED" as const,
      asOf: core.date,
      citation:
        "ACS 2024 B21001, veterans among civilians by sex, age and state (src/core2/data/past/veterans-acs-2024.json), and one first term of pastServiceYears (10 U.S.C. 505(c)).",
      estimatedFrom:
        "The person's own seeded line against their veteran share; the term starts the day their schooling ended.",
    };
    const rows: Omit<HistoryRecord, "moduleId">[] = (
      [
        [PAST_ENLISTED, served.enlisted],
        [PAST_DISCHARGED, served.discharged],
      ] as const
    ).map(([kind, date]) => ({
      id: `${kind}:${person.id}`,
      date: (date < world.from
        ? grainDate(person, date, world.from)
        : date) as IsoDate,
      kind,
      placeId: person.placeId,
      personIds: [person.id],
      facts: { personId: person.id, years: served.years },
      publicRecord: false,
      source,
    }));
    recordPreStartLater(core, moduleId, rows, { person: person.id });
  }
}

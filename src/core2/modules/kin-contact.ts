/**
 * Word from relatives who live elsewhere (owner, Nov 8, 2026: "EVERY. LIFE.
 * IS. SIMULATED."): each month a town resident's pull to hear from a relative
 * living elsewhere builds with how close the two still are, at the pace one
 * whole contact a month at full closeness (`kinContactsPerYearAtFull`); a pull
 * that reaches one whole is a contact, written as `family.contact` (the
 * relative writes, the resident reads) and recorded as time together on the
 * tie (`relationship`), so the tie fades slower the more they write. Nothing
 * is rolled: closeness decides, and a tie that has faded to nothing writes
 * nothing. The director's `letter` scene reads the record.
 *
 * It runs inside the partnerships review (one monthly entry for the lives of
 * people outside the played town), so it installs nothing of its own.
 */
import { closenessBetween } from "../closeness";
import { ageOnDate, makeIsoDate } from "../kernel/dates";
import { livesElsewhere } from "./moves";
import type { CoreAPI, CoreState, PersonId, Source } from "../types";

export const FAMILY_CONTACT = "family.contact";
export const FAMILY_GATHERING_MISSED = "family.gathering-missed";
export const BIRTHDAY_KIND = "kin-birthday";
const KIN_TRAITS_STOPGAP = "SG-LIVES-kin-contact-traits";

/** One month of word from relatives elsewhere, for the town's adults. */
export function reviewKinContact(api: CoreAPI): void {
  const core = api.state as CoreState;
  const p = (key: string) => api.parameter(key);
  api.stopgap(KIN_TRAITS_STOPGAP);
  const today = makeIsoDate(core.date);
  const month = p("one") / p("monthsPerYear");
  const pulls = api.moduleState("partnerships").table("contacts");
  const perMonth = p("kinContactsPerYearAtFull") * month;
  const adultAge = p("votingAge");
  const readers = [...core.people.values()].filter(
    (row) =>
      row.alive &&
      row.tier !== "husk" &&
      ageOnDate(makeIsoDate(row.birthDate), today) >= adultAge,
  );
  readers.sort((a, b) => a.id.localeCompare(b.id));
  for (const reader of readers) {
    for (const id of [...reader.familyIds].sort()) {
      const writer = core.people.get(id);
      if (!writer || !livesElsewhere(core, writer)) continue;
      const level = closenessBetween(core, reader.id, id);
      if (!(level > p("zero"))) continue;
      const key = `${reader.id}:${id}`;
      const held = pulls.get(key) as unknown as
        { id: string; value: number } | undefined;
      let value = (held?.value ?? p("zero")) + perMonth * level;
      if (value >= p("one")) {
        value -= p("one");
        const source: Source = {
          tag: "ESTIMATED",
          asOf: core.date,
          citation: `${writer.givenName} ${writer.familyName} wrote to ${reader.givenName} ${reader.familyName}.`,
          estimatedFrom:
            "Closeness of the tie times one contact a month at full closeness (kinContactsPerYearAtFull), a tunable stand-in for the GSS visit frequencies behind the opening closeness.",
        };
        api.emit({
          id: `${FAMILY_CONTACT}:${reader.id}:${id}:${core.date}`,
          date: core.date,
          kind: FAMILY_CONTACT,
          personIds: [reader.id as PersonId, id as PersonId],
          placeId: reader.placeId,
          publicRecord: false,
          source,
          facts: { how: "letter", writerId: id, closeness: String(level) },
        });
        api.relationship(
          reader.id,
          id as PersonId,
          "contact",
          p("kinContactHours"),
          undefined,
          {
            cause: "kin-contact",
            sourceId: `${FAMILY_CONTACT}:${reader.id}:${id}:${core.date}`,
          },
        );
      }
      pulls.put({ id: key, value } as never);
    }
  }
}

/**
 * The next month's birthdays among the town's people, each put on the module
 * calendar for its own day (a leap-day birthday falls on the 28th in a common
 * year). Run from the monthly review on the 1st.
 */
export function scheduleBirthdays(api: CoreAPI): void {
  const core = api.state as CoreState;
  // The next month's birthdays: the calendar takes only a future day, and the
  // review that runs on the 1st reaches the 1st of the month after it.
  const [year, mon] = core.date.split("-").map(Number) as [number, number];
  const nextYear = mon === 12 ? year + 1 : year;
  const nextMon = mon === 12 ? 1 : mon + 1;
  const month = `${nextYear}-${String(nextMon).padStart(2, "0")}`;
  const calendar = api.moduleCalendar("partnerships");
  for (const person of core.people.values()) {
    if (!person.alive || person.tier === "husk") continue;
    const md = person.birthDate.slice(5);
    const day = md === "02-29" ? "02-28" : md;
    const date = `${nextYear}-${day}`;
    if (!date.startsWith(month)) continue;
    calendar.schedule({
      key: `${BIRTHDAY_KIND}:${person.id}:${date}`,
      date: date as never,
      kind: BIRTHDAY_KIND,
      source: {
        tag: "ESTIMATED",
        asOf: core.date,
        citation: `${person.givenName} ${person.familyName}'s birthday.`,
        estimatedFrom: "The person's recorded birth date.",
      },
      sourceRecordIds: [person.id],
    });
  }
}

/**
 * A birthday at home with the closest relative living elsewhere missing: the
 * relative the honoree was closest to (the tie's closeness today, the lowest
 * id breaking a tie) is the one the table misses, written as
 * `family.gathering-missed` with the household as witnesses. No relative
 * elsewhere with a tie, no record.
 */
export function birthdayGathering(api: CoreAPI, key: string): void {
  const core = api.state as CoreState;
  const id = key.split(":")[1] as PersonId;
  const honoree = core.people.get(id);
  if (!honoree?.alive || honoree.tier === "husk") return;
  let best: { id: PersonId; level: number } | undefined;
  for (const other of [...honoree.familyIds].sort()) {
    const kin = core.people.get(other);
    if (!kin || !livesElsewhere(core, kin)) continue;
    const level = closenessBetween(core, id, other);
    if (level > (best?.level ?? api.parameter("zero")))
      best = { id: other as PersonId, level };
  }
  if (!best) return;
  const home = (core.households.get(honoree.householdId)?.memberIds ?? [])
    .filter((m) => m !== id && core.people.get(m)?.alive)
    .sort();
  api.emit({
    id: `${FAMILY_GATHERING_MISSED}:${id}:${best.id}:${core.date}`,
    date: core.date,
    kind: FAMILY_GATHERING_MISSED,
    personIds: [id, best.id],
    placeId: honoree.placeId,
    publicRecord: false,
    source: {
      tag: "ESTIMATED",
      asOf: core.date,
      citation: `${honoree.givenName}'s birthday gathering missed ${core.people.get(best.id)!.givenName}.`,
      estimatedFrom:
        "The honoree's recorded birth date and the closeness of their ties to relatives living elsewhere.",
    },
    witnessIds: home,
    facts: {
      occasion: "birthday",
      absentId: best.id,
      closeness: String(best.level),
    },
  });
}

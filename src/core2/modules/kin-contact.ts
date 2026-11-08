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

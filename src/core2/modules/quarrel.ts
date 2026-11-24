/**
 * Money quarrels at home (Lives, Nov 8, 2026): when a borrower misses a
 * payment (the credit engine's `credit.payment-missed`) and a grown person
 * shares their home, the missed payment is the household's trouble too. The
 * housemate closest to the borrower (the tie's closeness today, the lowest id
 * breaking a tie) is wronged by it; `family.quarrel` names the two, says the
 * borrower owes the apology, and strains their tie (negative time together,
 * `quarrelStrainHours`). The director's `apology` scene reads it.
 *
 * Who is wronged is the closest housemate; the pair's traits do not decide
 * whether it becomes a quarrel (SG-LIVES-quarrel-model).
 */
import { closenessBetween } from "../closeness";
import { ageOnDate, makeIsoDate } from "../kernel/dates";
import type { CoreAPI, CoreEventInput, CoreState, PersonId } from "../types";

export const FAMILY_QUARREL = "family.quarrel";

export function quarrelOverMoney(api: CoreAPI, missed: CoreEventInput): void {
  const core = api.state as CoreState;
  const borrower = core.people.get(missed.personIds[0]!);
  if (!borrower?.alive || borrower.tier === "husk") return;
  api.stopgap("SG-LIVES-quarrel-model");
  const today = makeIsoDate(core.date);
  const adult = api.parameter("votingAge");
  let best: { id: PersonId; level: number } | undefined;
  for (const id of [
    ...(core.households.get(borrower.householdId)?.memberIds ?? []),
  ].sort()) {
    const other = core.people.get(id);
    if (
      !other?.alive ||
      other.id === borrower.id ||
      other.tier === "husk" ||
      ageOnDate(makeIsoDate(other.birthDate), today) < adult
    )
      continue;
    const level = closenessBetween(core, borrower.id, id);
    if (!best || level > best.level) best = { id: id as PersonId, level };
  }
  if (!best) return;
  const wronged = core.people.get(best.id)!;
  const id = `${FAMILY_QUARREL}:${borrower.id}:${best.id}:${core.date}`;
  api.emit({
    id,
    date: core.date,
    kind: FAMILY_QUARREL,
    personIds: [borrower.id, best.id],
    placeId: borrower.placeId,
    publicRecord: false,
    source: {
      tag: "ESTIMATED",
      asOf: core.date,
      citation: `${wronged.givenName} ${wronged.familyName} and ${borrower.givenName} ${borrower.familyName} quarreled over a missed payment.`,
      estimatedFrom: `The credit engine's missed-payment record ${missed.id} and the borrower's household.`,
    },
    facts: {
      about: "money",
      owes: borrower.id,
      missedId: missed.id,
      closeness: String(best.level),
    },
  });
  api.relationship(
    borrower.id,
    best.id,
    "contact",
    -api.parameter("quarrelStrainHours"),
    undefined,
    { cause: "quarrel", sourceId: id },
  );
}

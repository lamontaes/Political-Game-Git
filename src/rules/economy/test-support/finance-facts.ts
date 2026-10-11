/** Same-World raw records and separately owned life/source/legal-cost receipts. No finance math is preselected. */
import {
  organizationClosingAt,
  organizationProfileAt,
} from "../../../simulation/life-queries";
import { privacyInitialOccurrence } from "../../../simulation/federal-data-privacy-law";
import { localInstitutionsFor } from "../../../simulation/local-institutions";
import { IRS_TOWN_BUSINESS_BOOKS } from "../../../simulation/living-world/town-business-books.generated";
import { laborReadingFacts } from "./labor-facts";
import { privacyReceiptKey } from "../town-finance-books";
import type { FinanceFacts } from "../town-finance-books";
import type { World } from "../../../simulation/types";
const businessSource = { rows: IRS_TOWN_BUSINESS_BOOKS };
export function financeFacts(world: World): FinanceFacts {
  const privacy = new Map<
    string,
    ReturnType<typeof privacyInitialOccurrence>
  >();
  for (const row of world.history.organizations) {
    const saved =
      world.townFinances?.businesses[row.id]?.privacyComplianceOccurrences;
    for (const seen of [undefined, [], saved])
      privacy.set(
        privacyReceiptKey(row.id, world.currentDate, seen),
        privacyInitialOccurrence(world, row.id, world.currentDate, seen),
      );
  }
  return {
    id: world.id,
    currentDate: world.currentDate,
    macroEconomy: world.macroEconomy,
    people: world.people,
    personOrder: world.personOrder,
    jurisdictions: world.jurisdictions,
    townFinances: world.townFinances,
    records: world.history,
    lifeProfiles: new Map(
      world.history.organizations.map((row) => [
        row.id,
        organizationProfileAt(world, row.id),
      ]),
    ),
    lifeClosings: new Map(
      world.history.organizations.map((row) => [
        row.id,
        organizationClosingAt(world, row.id),
      ]),
    ),
    privacy,
    institutions: new Map(
      world.jurisdictionOrder.map((id) => [
        id,
        localInstitutionsFor(world, id),
      ]),
    ),
    labor: laborReadingFacts(world),
    businessSource,
  };
}

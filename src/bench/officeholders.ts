// Advanced start: every person who holds an office the world runs (the
// town's, its state's and the federal ones), read from the offices module's
// serving terms, for the "play as" picker.
import { coreAPI } from "../core2/state";
import {
  OFFICES_MODULE_ID,
  isOutsideOffice,
  type TermRow,
} from "../core2/modules/offices";
import type { CoreState } from "../core2/types";

/** The people holding an office now: who, their office and the body it sits in. */
export function officeholders(core: CoreState) {
  if (!core.modules.has(OFFICES_MODULE_ID)) return [];
  const api = coreAPI(core);
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const seen = new Set<string>();
  return (offices.table("terms").rows() as unknown as TermRow[])
    .filter((term) => term.status === "serving" && term.personId)
    .flatMap((term) => {
      const personId = term.personId!;
      // One row a person: the first office they hold.
      if (seen.has(personId)) return [];
      const office = offices.table("offices").get(term.officeId) as
        { title?: string; level?: string; governmentName?: string } | undefined;
      if (!office?.title) return [];
      // Another state's chambers and governor are held as results only: their
      // state's laws and budgets are not run in this world, so stepping in
      // gave an office with nothing in force and nothing to write a bill
      // about. Play as offers the town's, its state's and the federal offices.
      if (isOutsideOffice(api, office)) return [];
      seen.add(personId);
      return [
        {
          personId,
          termId: term.id,
          name: `${term.identity.givenName} ${term.identity.familyName}`,
          party: term.party,
          title: office.title,
          level: office.level ?? "local",
          government: office.governmentName ?? "",
        },
      ];
    })
    .sort(
      (a, b) =>
        a.level.localeCompare(b.level) ||
        a.government.localeCompare(b.government) ||
        a.title.localeCompare(b.title) ||
        a.name.localeCompare(b.name),
    );
}

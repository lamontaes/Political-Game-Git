/**
 * The positions a contest's candidates can take: the policy questions the
 * government the seat belongs to may decide in this place.
 *
 * A seat's positions are not every question the game asks. A borough council
 * cannot decide a state's abortion law, a state legislature cannot decide a
 * town's zoning, and a governor takes up what the state decides. The office
 * record says which government the seat belongs to (city, county, township,
 * state or federal); the question data says which levels decide each
 * question; and for a town, township or county the state's own law says
 * which questions its places may act on. The same check the bodies file by
 * when they sit (`levelMayDecide`), so a position offered here is a bill that
 * body can draft. A government that decides none of the questions offers none.
 */
import { PLATFORM_QUESTIONS } from "./campaign-views";
import { OFFICES_MODULE_ID } from "./modules/offices";
import { levelMayDecide } from "./modules/world-legislating";
import type { OfficeLevel } from "./offices-local";
import type { CoreAPI } from "./types";

/** The questions this contest's office belongs to a government that may decide, in the order the platform questions are kept. */
export function contestPositions(
  api: CoreAPI,
  contest: { readonly officeId: string },
): readonly string[] {
  const office = api
    .moduleState(OFFICES_MODULE_ID)
    .table("offices")
    .get(contest.officeId) as unknown as { level: OfficeLevel } | undefined;
  if (!office) throw new Error(`No office record ${contest.officeId}`);
  return PLATFORM_QUESTIONS.filter((question) =>
    levelMayDecide(api, office.level, question),
  );
}

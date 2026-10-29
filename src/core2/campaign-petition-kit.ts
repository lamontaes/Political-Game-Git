/**
 * For tests and checks whose candidates must stand on the ballot: filing is
 * a petition (owner, Oct 28), so each candidate campaigns for signatures as
 * a candidate would, a canvass each day through the campaign engine's own
 * day choice (the player's, or a world candidate's), until each petition
 * holds what the clerk will count or its deadline comes, and then the world
 * lives to the clerk's check the morning after the last deadline. Nothing is
 * signed by hand: every name comes from a person met at a door or asked in
 * the circle, answering for their own reasons.
 */
import { campaignDayChoices, takeCampaignDayChoice } from "./campaign-day";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  ELECTIONS_MODULE_ID,
  petitionCirculating,
  petitionOf,
  type FilingRow,
  type PetitionRow,
} from "./modules/elections";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

/** The petition campaign for each filing; returns the first filing's petition after the clerk's check (or as it stands where there is no clerk). */
export function gatherSignatures(
  core: CoreState,
  ...filingIds: readonly string[]
): PetitionRow | null {
  const api = coreAPI(core);
  const ids = filingIds.filter((id) => petitionOf(api, id));
  if (!ids.length) return null;
  const short = (id: string) => {
    const held = petitionOf(api, id)!;
    return petitionCirculating(api, id) && held.signers.length < held.needed;
  };
  while (ids.some(short)) {
    for (const id of ids.filter(short)) {
      const filing = api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("filings")
        .get(id) as unknown as FilingRow;
      const world = filing.personId !== core.playerId;
      const canvass = campaignDayChoices(api, id, world).find(
        (c) => c.kind === "canvass",
      );
      if (canvass?.available)
        takeCampaignDayChoice(api, id, "canvass", { world });
    }
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  }
  const last = ids
    .map((id) => petitionOf(api, id)!.due)
    .sort()
    .at(-1)!;
  const checked = addDays(makeIsoDate(last), 1);
  if (core.date < checked) advanceCore(core, checked);
  return petitionOf(api, ids[0]!);
}

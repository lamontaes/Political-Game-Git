/**
 * Why a resident who stands up at a town hall, or confronts an official at a
 * protest or strike, cares about the question: their own stake, read from the
 * records the arc-variant table already reads (`laid-off`, `rent-owed` in
 * data/arc-variants.json), never a second reader. In order: `work` (they lost
 * a job in the read's window, with the employer from the layoff's row), then
 * `money` (their household owes rent on an open case, with the amount owed at
 * the notice). Each fact cites the rows it came from; a resident with neither
 * on record gives no stake, so the lines that need one never play. The
 * resident's first name (`asker-first`) is said by the official replying.
 */
import { HOUSING_MODULE_ID } from "../core2/modules/housing";
import { JOBS_MODULE_ID } from "../core2/modules/jobs";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { moneySaid } from "../english/count-words";
import type { Fact } from "../english/scene-talk-words";
import { readFor } from "./arc-variant";
import { properName } from "./words";

/** The purpose whose lines read these facts. */
export const TOWN_HALL_PURPOSE = "town-hall-question";

/**
 * The stake facts for `askerId`, who asks `askedId` at the cause `cause`
 * records: `asker-first`, then `stake` with `stake-work` and `employer`, or
 * `stake` with `stake-money` and `owed`.
 */
export function townHallFacts(
  core: Readonly<CoreState>,
  askerId: PersonId,
  askedId: PersonId,
  cause: {
    readonly id: string;
    readonly date: string;
    readonly facts: Readonly<Record<string, string>>;
  },
): Record<string, Fact> {
  const facts: Record<string, Fact> = {};
  const asker = core.people.get(askerId);
  if (!asker) return facts;
  facts["asker-first"] = { text: asker.givenName, sourceRecordIds: [askerId] };
  const input = { family: TOWN_HALL_PURPOSE, askerId, askedId, cause };
  const laidOff = readFor(core, "laid-off", input);
  if (laidOff.value > P.zero && core.modules.has(JOBS_MODULE_ID)) {
    const changes = coreAPI(core as CoreState)
      .moduleState(JOBS_MODULE_ID)
      .table("changes");
    const rows = laidOff.recordIds
      .map(
        (id) =>
          changes.get(id) as unknown as
            { id: string; date: string; organizationId?: string } | undefined,
      )
      .filter((row) => row !== undefined)
      .sort((a, b) => b.date.localeCompare(a.date));
    const org = rows[P.zero]?.organizationId
      ? core.organizations.get(rows[P.zero]!.organizationId!)
      : undefined;
    if (org) {
      const cited = [rows[P.zero]!.id, org.id];
      facts.stake = { text: "work", sourceRecordIds: cited };
      facts["stake-work"] = { text: "work", sourceRecordIds: cited };
      facts.employer = { text: properName(org.name), sourceRecordIds: cited };
      return facts;
    }
  }
  const owes = readFor(core, "rent-owed", input);
  const caseId = owes.recordIds[P.zero];
  if (owes.value > P.zero && caseId && core.modules.has(HOUSING_MODULE_ID)) {
    const row = coreAPI(core as CoreState)
      .moduleState(HOUSING_MODULE_ID)
      .table("cases")
      .get(caseId) as unknown as { owedAtNoticeMinor?: number } | undefined;
    const owed = Number(row?.owedAtNoticeMinor);
    if (owed > P.zero) {
      facts.stake = { text: "money", sourceRecordIds: [caseId] };
      facts["stake-money"] = { text: "money", sourceRecordIds: [caseId] };
      facts.owed = { text: moneySaid(owed), sourceRecordIds: [caseId] };
    }
  }
  return facts;
}

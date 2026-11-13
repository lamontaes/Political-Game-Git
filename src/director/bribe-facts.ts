/**
 * What a bribe scene can say of the offer, from the records the corruption
 * and interest-group engines keep (words composer, unit 6: the `bribe` move
 * set, data/english/scene-move-sets.json). The offer and the pressing after
 * a refusal (corruption.ts, corruption.bribe-offered and
 * corruption.bribe-pressed) are said about these records instead of stock
 * sentences:
 *
 * - `amount`: the money offered, as people say it ("about $400"), from the
 *   crime record; `amount-exact` ("$400") only where the record's own figure
 *   is that sum, so a question never reads a rounded figure back as exact;
 * - `favor-vote` with the bill (`bill`, its first spoken form `bill-first`,
 *   `bill-later`, `about`), or `favor-contract` with `contract` ("the road
 *   contract"), from what the favor is;
 * - `group`, `vote-wanted` ("against") and `cost` ("about $40,000"), where the
 *   offerer is a lobbyist who met the member on the bill
 *   (interest-groups.ts LobbyMeeting: the group, its side, what the bill
 *   costs the employers it speaks for a year);
 * - `heard-of`: the offerer had learned of an earlier bribe the official
 *   took (the crime record's heardOf, the offerer's own knowledge).
 *
 * Each fact cites its records; a fact with no record is left out and the
 * pieces that need it are never said.
 */
import { CORRUPTION_MODULE_ID, crimeRecord } from "../core2/modules/justice";
import {
  INTEREST_GROUPS_MODULE_ID,
  type GroupRow,
  type LobbyMeeting,
} from "../core2/modules/elections";
import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";
import { P } from "../core2/parameters";
import { moneyExactSaid, moneySaid } from "../english/count-words";
import type { Fact } from "../english/scene-talk-words";
import { pressCommentFacts } from "./press-comment-facts";
import { properName } from "./words";
import rules from "./data/bribe-facts.json" with { type: "json" };

/** The bill's own facts a bribe for its vote names (its name, what it does, what comes next). */
const BILL_FACTS = /^(?:bill|bill-first|bill-later|story|about|next-.+)$/;

export function bribeFacts(
  core: Readonly<CoreState>,
  bribeId: string | undefined,
): Record<string, Fact> {
  const facts: Record<string, Fact> = {};
  if (!bribeId || !core.modules.has(CORRUPTION_MODULE_ID)) return facts;
  const api = coreAPI(core as CoreState);
  const crime = crimeRecord(api, bribeId);
  if (!crime) return facts;
  const cite = (text: string, ids: readonly string[] = [crime.id]): Fact => ({
    text,
    sourceRecordIds: [...ids],
  });
  if (crime.amountMinor > P.zero) {
    facts.amount = cite(moneySaid(crime.amountMinor));
    // Said back as a figure only where the record's own figure is that sum.
    const exact = moneyExactSaid(crime.amountMinor);
    if (exact) facts["amount-exact"] = cite(exact);
  }
  if ((crime.heardOf?.length ?? P.zero) > P.zero)
    facts["heard-of"] = cite("yes", [crime.id, ...crime.heardOf!]);
  if (crime.subjectId.startsWith("contract:")) {
    facts["favor-contract"] = cite("yes");
    // contract:<government>:<line>:<date>: the line is next to last.
    const line = crime.subjectId.split(":").at(-P.two);
    const said = line
      ? (rules.contractByLine.value as Record<string, string>)[line]
      : undefined;
    if (said) facts.contract = cite(said);
    return facts;
  }
  facts["favor-vote"] = cite("yes", [crime.id, crime.subjectId]);
  for (const [key, fact] of Object.entries(
    pressCommentFacts(core, crime.officialId, crime.subjectId),
  ))
    if (BILL_FACTS.test(key)) facts[key] = fact;
  if (!core.modules.has(INTEREST_GROUPS_MODULE_ID)) return facts;
  const groups = api.moduleState(INTEREST_GROUPS_MODULE_ID);
  const meeting = (
    groups
      .table("meetings")
      .query("byBillMember", [
        crime.subjectId,
        crime.officialId,
      ]) as unknown as LobbyMeeting[]
  ).find((row) => row.lobbyistId === crime.offererId);
  if (!meeting) return facts;
  const group = groups.table("groups").get(meeting.groupId) as unknown as
    GroupRow | undefined;
  const org = group ? core.organizations.get(group.organizationId) : undefined;
  // A group is said with its article, as people say an association's name.
  const name = org ? properName(org.name) : "";
  if (org)
    facts.group = cite(
      /^the\s/i.test(name) ? name : `${rules.groupArticle.value} ${name}`,
      [meeting.id, org.id],
    );
  const side = (meeting.side ?? -P.one) > P.zero ? "for" : "against";
  facts["vote-wanted"] = cite(
    (rules.voteWanted.value as Record<string, string>)[side]!,
    [meeting.id],
  );
  if (meeting.annualCostMinor > P.zero)
    facts.cost = cite(moneySaid(meeting.annualCostMinor), [meeting.id]);
  return facts;
}

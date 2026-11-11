/**
 * What a donor's ask may say about the donor, from the records the world
 * already keeps: where they work (their job and its organization), and, when
 * the gift's record names the bill they hold the strongest view on, what that
 * bill is about (the bill catalog's question, as `questionAbout` words it)
 * and which side of it they are on (the sign of their view on the question,
 * `viewOn`, against the bill's own position). Each fact is cited to the
 * records it came from; a fact with no record behind it is left out, so the
 * lines that need it never play, and a retiree with no job gives no reason
 * from work.
 */
import { townLean } from "../core2/modules/campaigns";
import { personLean } from "../core2/campaign-views";
import {
  LEGISLATURE_MODULE_ID,
  billOf,
  provisionStance,
} from "../core2/modules/legislature";
import { viewOn } from "../core2/modules/views";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import type { Fact } from "../english/scene-talk-words";
import { questionAbout } from "../english/question-names";
import { properName } from "./words";

/** The situation type that reads these facts. */
export const DONOR_ASK_TYPE = "donor-ask";

/**
 * The facts for `donorId`'s ask: `employer` (their job's organization),
 * `about` (the question of the bill `billId` names), and `side-for` or
 * `side-against` (where the donor stands on that bill), each with the
 * records behind it. `causeId` is the gift's record.
 */
export function donorAskFacts(
  core: Readonly<CoreState>,
  donorId: PersonId,
  causeId: string,
  billId: string | undefined,
): Record<string, Fact> {
  const facts: Record<string, Fact> = {};
  const donor = core.people.get(donorId);
  if (!donor) return facts;
  const job = donor.jobId ? core.jobs.get(donor.jobId) : undefined;
  const org = job ? core.organizations.get(job.organizationId) : undefined;
  if (job && org && !job.endsAt)
    facts.employer = {
      text: properName(org.name),
      sourceRecordIds: [job.id, org.id],
    };
  if (!billId || !core.modules.has(LEGISLATURE_MODULE_ID)) return facts;
  const api = coreAPI(core as CoreState);
  const bill = billOf(api, billId);
  const provision = bill?.provisions[P.zero];
  const stance = provision ? provisionStance(api, provision) : null;
  const about = stance ? questionAbout(stance.question) : null;
  if (!stance || !about) return facts;
  facts.about = { text: about, sourceRecordIds: [billId, causeId] };
  const view = viewOn(
    api,
    donorId,
    stance.question,
    personLean(core.people, donor, townLean(api)),
  );
  const leaning = view * stance.position;
  if (leaning !== P.zero)
    facts[leaning > P.zero ? "side-for" : "side-against"] = {
      text: leaning > P.zero ? "for" : "against",
      sourceRecordIds: [billId, donorId, causeId],
    };
  return facts;
}

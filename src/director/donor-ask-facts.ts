/**
 * What a donor's ask may say about the donor, from the records the world
 * already keeps: where they work (their job and its organization), the bill
 * the gift's record names, and what they care about most (their own strongest
 * view on record). Each fact is cited to the records it came from; a fact
 * with no record behind it is left out, so the lines that need it never play,
 * and a retiree with no job gives no reason from work.
 */
import { LEGISLATURE_MODULE_ID, billOf } from "../core2/modules/legislature";
import { VIEWS_MODULE_ID } from "../core2/modules/views";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import type { Fact } from "../english/scene-talk-words";
import { strongestQuestion } from "./view-learned";
import { billTitleOf, billTitleSaid } from "../english/bill-names";
import { employerSaid } from "../english/journal-words";
import { businessNameSaid } from "./words";

/** The situation type that reads these facts. */
export const DONOR_ASK_TYPE = "donor-ask";

/**
 * The facts for `donorId`'s ask: `donor-first` (their given name), `employer` (their job's organization, as `employerSaid` says it), `bill` and `donor-bill` (the bill by its title),
 * each with the records behind it. `causeId` is the gift's record.
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
  // The donor's first name, as the candidate says it to them.
  facts["donor-first"] = { text: donor.givenName, sourceRecordIds: [donorId] };
  const job = donor.jobId ? core.jobs.get(donor.jobId) : undefined;
  const org = job ? core.organizations.get(job.organizationId) : undefined;
  if (job && org && !job.endsAt)
    facts.employer = {
      // As people say it: "the government of Utah", never "Utah treasury".
      text: employerSaid(businessNameSaid(org), org),
      sourceRecordIds: [job.id, org.id],
    };
  if (!billId || !core.modules.has(LEGISLATURE_MODULE_ID)) return facts;
  const api = coreAPI(core as CoreState);
  const bill = billOf(api, billId);
  // The bill as people say it, by what it does, from the title the bill's
  // own page reads (billTitleOf): "the Civilian Oversight Ordinance", never
  // its number. A bill with no title authored keeps the number it was said by.
  const titled = bill ? billTitleOf(bill) : null;
  if (titled) {
    const said = {
      text: billTitleSaid(titled.title),
      sourceRecordIds: [billId, causeId],
    };
    facts.bill = said;
    facts["donor-bill"] = said;
  }
  return facts;
}

/**
 * What the donor cares about most, from their own strongest view on record
 * (the views engine's `strongestQuestion`, the same reader the door scene
 * uses): `about` (the question as `questionAbout` words it), `side-for` or
 * `side-against`, and `view-question` (the question's id, which the scene's
 * reply writes through `learnView` and `learnViewQuestion` when the player
 * hears it). A donor whose view is past zero on no question gives none, and
 * the ask is not staged.
 */
export function donorViewFacts(
  core: Readonly<CoreState>,
  donorId: PersonId,
  causeId: string,
): Record<string, Fact> {
  if (!core.modules.has(VIEWS_MODULE_ID)) return {};
  const top = strongestQuestion(coreAPI(core as CoreState), donorId);
  if (!top) return {};
  const ids = [top.recordId, causeId];
  return {
    about: { text: top.about, sourceRecordIds: ids },
    [`side-${top.side}`]: { text: top.side, sourceRecordIds: ids },
    "view-question": { text: top.question, sourceRecordIds: ids },
  };
}

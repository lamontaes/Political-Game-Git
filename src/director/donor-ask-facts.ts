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
import { giftsToCampaign, townLean } from "../core2/modules/campaigns";
import {
  LEGISLATURE_MODULE_ID,
  billOf,
  chambersOf,
  committeeRecords,
  memberKey,
  members,
  provisionStance,
  votesOn,
} from "../core2/modules/legislature";
import { VIEWS_MODULE_ID, viewOf, viewOn } from "../core2/modules/views";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId, PersonState } from "../core2/types";
import type { Fact } from "../english/scene-talk-words";
import { questionAbout } from "../english/question-names";
import { billTitleOf, billTitleSaid } from "../english/bill-names";
import { employerSaid } from "../english/journal-words";
import { businessNameSaid } from "./words";

/** The situation type that reads these facts. */
/** How far left or right a person leans (the campaign views' `personLean`). */
type LeanOf = (
  people: CoreState["people"],
  person: Readonly<PersonState>,
  townLean: number,
) => number;

export const DONOR_ASK_TYPE = "donor-ask";

/**
 * The facts for `donorId`'s ask: `donor-first` (their given name), `employer` (their job's organization, as `employerSaid` says it), `bill` and `donor-bill` (the bill by its title),
 * `about` (the question of the bill `billId` names), and `side-for` or
 * `side-against` (where the donor stands on that bill), each with the
 * records behind it. `causeId` is the gift's record.
 */
export function donorAskFacts(
  core: Readonly<CoreState>,
  donorId: PersonId,
  causeId: string,
  billId: string | undefined,
  /** How far left or right a person leans (the campaign views' `personLean`, handed in so this file reaches no other engine's insides). */
  leanOf: (
    people: CoreState["people"],
    person: Readonly<PersonState>,
    townLean: number,
  ) => number,
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
  const provision = bill?.provisions[P.zero];
  const stance = provision ? provisionStance(api, provision) : null;
  const about = stance ? questionAbout(stance.question) : null;
  if (!stance || !about) return facts;
  facts.about = { text: about, sourceRecordIds: [billId, causeId] };
  const view = viewOn(
    api,
    donorId,
    stance.question,
    leanOf(core.people, donor, townLean(api)),
  );
  const leaning = view * stance.position;
  if (leaning !== P.zero)
    facts[leaning > P.zero ? "side-for" : "side-against"] = {
      text: leaning > P.zero ? "for" : "against",
      sourceRecordIds: [billId, donorId, causeId],
    };
  return facts;
}

/** What a donor's ask is read against. */
export interface DonorReadsInput {
  /** The gift's record. */
  readonly causeId: string;
  readonly donorId: PersonId;
  /** The candidate the gift went to: the one the donor asks. */
  readonly playerId: PersonId;
  /** The campaign the gift went to (the gift record's `filingId`). */
  readonly filingId?: string;
  /** The bill the gift names, when the donor holds a strongest view on one. */
  readonly billId?: string;
  /** Said as the scene says a person, for a name the donor was told by. */
  readonly sayPerson: (person: { id: string }) => string;
  /** How far left or right a person leans (see `donorAskFacts`). */
  readonly leanOf: LeanOf;
}

/**
 * What a donor's words lean on beyond the gift (Story lead, Nov 17, the donor
 * rewrite). Each fact is read from the one record that holds it and set only
 * where that record holds it (an effect is a read, not a record):
 *
 * - `gift-first`, `gift-biggest`, `gift-smallest` and `gift-weight`: the
 *   donor's running total against every other named donor's to the same
 *   campaign (the gifts table), said as words ("the biggest check you've
 *   had"), never as a figure. The middle of the pile is not worth saying and
 *   sets nothing; ranks need three donors, so two never say "biggest".
 * - `stand-with` and `stand-apart`, with `your-side` ("for" or "against"):
 *   which side of the bill's question the player's own recorded view puts
 *   them on, against the donor's side, from the views engine; set only where
 *   the donor has a side and the player holds a view on the question.
 * - `bill-filed`, `bill-held`, `bill-heard`, `bill-one-house`, `bill-on-desk`,
 *   with `bill-stage` ("held up in committee"): where the bill is, from the
 *   committee's and the chambers' own records, the way the bill's own page
 *   reads it.
 * - `votes-on-it`: the player sits in a chamber the bill goes through.
 * - `knows-truth` with `source`: the bill has not moved (filed or held in
 *   committee) and someone who would know says so: its sponsor, else the
 *   committee's chair, never the player. A lie that it is moving can then be
 *   shown false; with nobody to ask, it stands (purpose-arcs.json, `lie`).
 */
export function donorReads(
  core: Readonly<CoreState>,
  input: DonorReadsInput,
): Record<string, Fact> {
  const facts: Record<string, Fact> = {};
  const api = coreAPI(core as CoreState);
  const { causeId, donorId, playerId } = input;
  const fact = (text: string, ids: readonly string[]): Fact => ({
    text,
    sourceRecordIds: ids,
  });
  if (input.filingId) {
    const rows = giftsToCampaign(api, input.filingId).filter(
      (row) => !row.donorId.startsWith("outside:") && row.donorId !== playerId,
    );
    const mine = rows.find((row) => row.donorId === donorId);
    if (mine) {
      const others = rows.filter((row) => row !== mine);
      const ids = [causeId, mine.id];
      const say = (key: string, text: string) => {
        facts[key] = fact("yes", ids);
        facts["gift-weight"] = fact(text, ids);
      };
      if (!others.length) say("gift-first", "the first check you've had");
      else if (others.some((_, at) => at > P.zero)) {
        if (others.every((row) => row.totalMinor < mine.totalMinor))
          say("gift-biggest", "the biggest check you've had");
        else if (others.every((row) => row.totalMinor > mine.totalMinor))
          say("gift-smallest", "one of the smallest checks you've had");
      }
    }
  }
  const bill =
    input.billId && core.modules.has(LEGISLATURE_MODULE_ID)
      ? billOf(api, input.billId)
      : undefined;
  if (!bill) return facts;
  const cited = [causeId, bill.id];
  // Where the bill is: the committee that sat on it, the chambers that voted.
  const sat = committeeRecords(api, bill.id);
  const floor = votesOn(api, bill.id) as unknown as {
    chamber?: string;
    override?: boolean;
  }[];
  const held = sat.find((row) => !row.heard);
  const stage =
    bill.status === "passed" || bill.status === "awaiting-signature"
      ? ({ key: "bill-on-desk", text: "waiting to be signed" } as const)
      : bill.status !== "drafted"
        ? null
        : floor.some((row) => row.chamber && !row.override)
          ? ({ key: "bill-one-house", text: "past one house" } as const)
          : held
            ? ({ key: "bill-held", text: "held up in committee" } as const)
            : sat.length
              ? ({
                  key: "bill-heard",
                  text: "through its committee hearing",
                } as const)
              : ({ key: "bill-filed", text: "filed and waiting" } as const);
  if (stage) {
    const ids = [...cited, ...sat.map((row) => row.id)];
    facts[stage.key] = fact("yes", ids);
    facts["bill-stage"] = fact(stage.text, ids);
  }
  if (
    chambersOf(api, bill).some((chamber) =>
      members(api, chamber).some((term) => memberKey(term) === playerId),
    )
  )
    facts["votes-on-it"] = fact("yes", [...cited, playerId]);
  // Someone who would know, when the bill has not moved: the lie that it has
  // can be shown false from their word.
  if (stage && (stage.key === "bill-filed" || stage.key === "bill-held")) {
    const knower = [bill.sponsorId, held?.chairId]
      .map((id) => (id ? core.people.get(id as PersonId) : undefined))
      .find(
        (person) => person && person.id !== playerId && person.id !== donorId,
      );
    if (knower) {
      const ids = [...cited, knower.id, ...(held ? [held.id] : [])];
      facts["knows-truth"] = fact("yes", ids);
      facts.source = fact(input.sayPerson(knower), ids);
    }
  }
  // The player's own side of the bill's question, against the donor's.
  const provision = bill.provisions[P.zero];
  const stance = provision ? provisionStance(api, provision) : null;
  if (!stance || !core.modules.has(VIEWS_MODULE_ID)) return facts;
  const donor = core.people.get(donorId);
  const yours = viewOf(api, playerId);
  if (!donor || !yours) return facts;
  const donors =
    viewOn(
      api,
      donorId,
      stance.question,
      input.leanOf(core.people, donor, townLean(api)),
    ) * stance.position;
  const own =
    viewOn(api, playerId, stance.question, yours.lean) * stance.position;
  if (donors === P.zero || own === P.zero) return facts;
  const ids = [...cited, playerId, stance.question];
  facts["your-side"] = fact(own > P.zero ? "for" : "against", ids);
  facts[donors > P.zero === own > P.zero ? "stand-with" : "stand-apart"] = fact(
    "yes",
    ids,
  );
  return facts;
}

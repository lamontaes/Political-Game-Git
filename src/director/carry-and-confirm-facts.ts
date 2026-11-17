/**
 * What an ask to carry a bill (`bill-carry`) and a sponsor's check on a promised
 * vote (`vote-confirmed`) may lean on beyond the bill (Story lead, Nov 17: the
 * carry-bill and confirm-vote rewrite), each read from the one record that
 * holds it and set only where it holds it, so a line that needs a fact the
 * records do not give never plays:
 *
 * Carry (the `carry-asked` record, or the bill a member of the player's body
 * just introduced, `office.introduced`):
 * - `about`, and `stand-for`, `stand-against` or `no-stand`: what the bill is
 *   about, and the player's own view on its question (the views engine, read
 *   through the bill's first section or, for an ask with no bill yet, the
 *   ask's own question and direction);
 * - `asker-same-party` or `asker-other-party`: the party the asker and the
 *   player are each filed under (the parties engine's tie, else the label
 *   their official record or latest term carries), where both have one;
 * - `carried-for-them-before` or `declined-them-before`, with `earlier-ask`:
 *   the asker's last closed ask of this member (the `carryAsks` table), by the
 *   bill it filed or by the policy it was for;
 * - `your-bill-waits`, with `your-bill` (its number): the player has a bill
 *   of their own still before a committee or on a calendar (the bills table,
 *   sponsor the player).
 *
 * Confirm (the `vote-promise` record of a committee trade come due, or the
 * `veto-override` record of a failed override the sponsor wants to try again):
 * - `about`, `stand-for`, `stand-against`, `no-stand`: as above, on the bill's
 *   first section;
 * - `traded`: the section the committee trade added for this member, as the
 *   bill catalog words its question, from the bill's deal row;
 * - `override` and `vetoed-by`: the failed override, and the executive who
 *   vetoed, from the override record;
 * - `margin-one`: the override fell exactly one vote short in the chamber that
 *   decided it (the record's tally of that chamber).
 *
 * Read when the scene is composed, from the records the cause names, never a
 * scan of the world.
 */
import { townLean } from "../core2/modules/campaigns";
import { partyOf } from "../core2/candidate-pool";
import {
  LEGISLATURE_MODULE_ID,
  billOf,
  closedCarryAsks,
  waitingBillsOf,
} from "../core2/modules/legislature";
import { viewOn } from "../core2/modules/views";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { billNameFor, spokenDesignation } from "../english/bill-names";
import { questionAbout } from "../english/question-names";
import type { Fact } from "../english/scene-talk-words";
import { billQuestionRead, type LeanOf } from "./bill-question-facts";

/** The cause record's own facts, as the record carries them. */
export type CarryConfirmSaid = Readonly<Record<string, string>>;

/** How the player is placed on the bill's question, where the views engine reads one. */
function standFacts(
  facts: Record<string, Fact>,
  about: string,
  leaning: number,
  cited: readonly string[],
): void {
  facts.about = { text: about, sourceRecordIds: cited };
  facts[
    leaning > P.zero
      ? "stand-for"
      : leaning < P.zero
        ? "stand-against"
        : "no-stand"
  ] = { text: "yes", sourceRecordIds: cited };
}

/** The player's own bill, still waiting before a committee or on a calendar: a bargain the other side can be offered. */
function waitingBillFacts(
  facts: Record<string, Fact>,
  api: ReturnType<typeof coreAPI>,
  causeId: string,
  playerId: PersonId,
  askerId: PersonId,
  askedBillId: string | undefined,
): void {
  // A bill the player carries for this very asker is the asker's, not a bargain.
  const [waiting] = waitingBillsOf(api, playerId).filter(
    (row) =>
      row.id !== askedBillId &&
      (row as { requestedBy?: string }).requestedBy !== askerId,
  );
  if (!waiting) return;
  facts["your-bill-waits"] = {
    text: "yes",
    sourceRecordIds: [causeId, waiting.id],
  };
  facts["your-bill"] = {
    text: spokenDesignation(waiting.number, waiting.form.kind),
    sourceRecordIds: [causeId, waiting.id],
  };
}

/**
 * The reads for the cause `causeId` of the record kind `kind`. `askedId` is
 * the player, `askerId` the one who comes to them; `sayPerson` says a person as
 * the scene's telling does.
 */
export function carryAndConfirmFacts(
  core: Readonly<CoreState>,
  causeId: string,
  kind: string,
  said: CarryConfirmSaid,
  askerId: PersonId,
  askedId: PersonId,
  leanOf: LeanOf,
  sayPerson: (personId: string) => string | null,
): Record<string, Fact> {
  const facts: Record<string, Fact> = {};
  if (!core.modules.has(LEGISLATURE_MODULE_ID)) return facts;
  const api = coreAPI(core as CoreState);
  const asker = core.people.get(askerId);
  const asked = core.people.get(askedId);
  if (!asker || !asked) return facts;

  if (kind === "carry-asked" || kind === "office.introduced") {
    // The bill's question, and where the player stands on it.
    const bill = said.billId ? billOf(api, said.billId) : undefined;
    if (bill) {
      const read = billQuestionRead(core, askedId, bill.id, leanOf);
      if (read)
        standFacts(facts, read.about, read.leaning, [
          causeId,
          bill.id,
          askedId,
        ]);
    } else if (said.question) {
      // An ask the player has not answered files no bill yet: the ask's own
      // question and direction are the bill's first section.
      const about = questionAbout(said.question);
      if (about) {
        const view = viewOn(
          api,
          askedId,
          said.question,
          leanOf(core.people, asked, townLean(api)),
        );
        standFacts(
          facts,
          about,
          view * (said.direction === "repeal" ? -P.one : P.one),
          [causeId, askedId],
        );
      }
    }
    // The asker's party and the player's.
    const mine = partyOf(api, askerId);
    const theirs = partyOf(api, askedId);
    if (mine && theirs)
      facts[mine === theirs ? "asker-same-party" : "asker-other-party"] = {
        text: "yes",
        sourceRecordIds: [causeId, mine, theirs],
      };
    // The last ask of this member by this asker that was closed, carried or
    // turned down (not this one, which waits on the player).
    const last = closedCarryAsks(api, askerId, askedId)
      .filter((row) => `carry-asked:${row.id}` !== causeId)
      .at(-P.one);
    if (last) {
      const filed = last.billId ? billOf(api, last.billId) : undefined;
      const section = last.provisions[P.zero];
      const name = section?.question
        ? billNameFor(
            section.question,
            filed?.form.kind ?? said.formKind ?? "",
            section.value < P.zero,
          )
        : null;
      const earlier = filed?.number
        ? spokenDesignation(filed.number, filed.form.kind)
        : name
          ? `the ${name.title}`
          : null;
      facts[last.carried ? "carried-for-them-before" : "declined-them-before"] =
        { text: "yes", sourceRecordIds: [causeId, last.id] };
      if (earlier)
        facts["earlier-ask"] = {
          text: earlier,
          sourceRecordIds: [causeId, last.id],
        };
    }
    waitingBillFacts(facts, api, causeId, askedId, askerId, said.billId);
    return facts;
  }

  if (kind === "vote-promise" || kind === "veto-override") {
    const bill = said.billId ? billOf(api, said.billId) : undefined;
    if (!bill) return facts;
    const read = billQuestionRead(core, askedId, bill.id, leanOf);
    if (read)
      standFacts(facts, read.about, read.leaning, [causeId, bill.id, askedId]);
    waitingBillFacts(facts, api, causeId, askedId, askerId, bill.id);
    if (kind === "vote-promise") {
      // The section the committee trade added for this member: the deal's own
      // terms name it, so the section is the one whose terms they are.
      const deal = bill.deals.find(
        (row) =>
          row.kind === "trade-amendment" &&
          row.status === "accepted" &&
          row.memberId === askedId &&
          row.date === said.traded,
      );
      const section = deal
        ? bill.provisions.find(
            (row) =>
              deal.terms ===
              `add ${row.question} ${row.value > P.zero ? "yes" : "no"}`,
          )
        : undefined;
      const traded = section?.question ? questionAbout(section.question) : null;
      if (traded)
        facts.traded = {
          text: traded,
          sourceRecordIds: [causeId, bill.id],
        };
      return facts;
    }
    // A failed override: the sponsor counts for the next try.
    facts.override = { text: "yes", sourceRecordIds: [causeId, bill.id] };
    const vetoer = said.executiveId ? sayPerson(said.executiveId) : null;
    if (vetoer)
      facts["vetoed-by"] = {
        text: vetoer,
        sourceRecordIds: [causeId, said.executiveId!],
      };
    // The chamber that decided it: its tally reads "chamber:yes/needed/members",
    // and a chamber's own id holds colons.
    const tally = (said.tallies ?? "")
      .split(",")
      .find((row) => row.startsWith(`${said.chamber}:`))
      ?.slice(`${said.chamber}:`.length);
    const [yes, needed] = (tally ?? "").split("/").map(Number);
    if (
      yes !== undefined &&
      needed !== undefined &&
      Number.isFinite(yes) &&
      Number.isFinite(needed) &&
      needed - yes === P.one
    )
      facts["margin-one"] = { text: "one", sourceRecordIds: [causeId] };
  }
  return facts;
}

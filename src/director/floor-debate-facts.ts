/**
 * What the floor's speaker may say beside the bill's number: what the bill is
 * about, whether the speaker wrote it, the reason the speaker can give in the
 * open, and how big the body is (owner, Nov 14: a three-seat board does not
 * talk like a legislature). Read from the legislature's own rows: the bill,
 * the speaker's position part by part, and the body's seats.
 *
 * The reason is the largest part of the speaker's position that leans their
 * way and is said aloud: their own view, the people they speak for, or that
 * the bill is their own. A deal or a lobby's pressing is never said on the
 * floor as the reason (Words lead, rule 103 and ruling Nov 14); that cause
 * stays on the record for the player to find another way.
 */
import lineNames from "../core2/data/budgets/line-names.json" with { type: "json" };
import {
  billOf,
  LEGISLATURE_MODULE_ID,
  memberPosition,
  bodyReach,
  members,
} from "../core2/modules/legislature";
import rules from "./data/scene-talk-rules.json" with { type: "json" };
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { questionAbout } from "../english/question-names";
import type { Fact } from "../english/scene-talk-words";

type Reason = "own-view" | "people" | "own-bill";

/**
 * The speaker's public reason: the largest of the parts said aloud that lean
 * the way they speak. A speaker whose lean comes from a deal, a lobby or
 * their traits, which are never said on the floor, gives their own view.
 */
export function publicReason(
  position: {
    readonly views: number;
    readonly constituents: number;
    readonly sponsor: number;
  },
  speaksFor: boolean,
  wroteIt: boolean,
): Reason {
  const sign = speaksFor ? 1 : -1;
  const parts: readonly (readonly [Reason, number])[] = [
    ["own-view", position.views * sign],
    ["people", position.constituents * sign],
    // Only the bill's own sponsor says it is theirs.
    ["own-bill", wroteIt ? position.sponsor * sign : 0],
  ];
  let best: Reason = "own-view";
  let most = 0;
  // Ties go to the member's own view, the first listed.
  for (const [reason, size] of parts)
    if (size > most) {
      best = reason;
      most = size;
    }
  return best;
}

export function floorDebateFacts(
  core: Readonly<CoreState>,
  facts: Record<string, Fact>,
  said: Readonly<Record<string, string>>,
  causeId: string,
  speakerId: PersonId,
): void {
  if (!said.billId || !core.modules.has(LEGISLATURE_MODULE_ID)) return;
  const api = coreAPI(core as CoreState);
  const bill = billOf(api, said.billId);
  if (!bill) return;
  const cited = [causeId, bill.id];
  const section = bill.provisions[0];
  const about =
    section?.kind === "policy-question" && section.question
      ? questionAbout(section.question)
      : section?.kind === "budget-line" && section.line
        ? (
            lineNames.lines as Record<
              string,
              { readonly name: string } | undefined
            >
          )[section.line]?.name.toLowerCase()
        : undefined;
  if (about) facts.issue = { text: about, sourceRecordIds: cited };
  if (bill.sponsorId === speakerId)
    facts["speaker-wrote-it"] = { text: "yes", sourceRecordIds: cited };
  const position = memberPosition(api, bill.id, speakerId);
  const reason = publicReason(
    position,
    said.forId === speakerId,
    bill.sponsorId === speakerId,
  );
  facts[`reason-${reason}`] = {
    text: "yes",
    sourceRecordIds: [...cited, speakerId],
  };
  facts[bodyRegister(api, said.chamber)] = {
    text: "yes",
    sourceRecordIds: cited,
  };
}

/**
 * How the body talks: a state or federal chamber is formal whatever its size;
 * a local body of at most the tuned seat count is a small board; any other
 * local body is a council.
 */
export function bodyRegister(
  api: ReturnType<typeof coreAPI>,
  chamber: string | undefined,
): "body-small" | "body-council" | "body-formal" {
  if (!chamber) return "body-council";
  const level = bodyReach(api, chamber);
  if (level === "state" || level === "federal") return "body-formal";
  return members(api, chamber).length <=
    rules.floorRegister.smallBoardSeats.value
    ? "body-small"
    : "body-council";
}

// The two campaign acts the player answers from the Campaign tab, built from the shared
// parts: a debate's invitation (accept or decline) and a speech (the parts said so far
// as talk lines, the four on offer as numbered replies). Screens call these and never draw
// their own selects, paragraphs or reply lists.
import { el } from "./dom.mjs";
import { buttonRow, makeButton } from "./button.mjs";
import { listRow } from "./list-row.mjs";
import { talkLine, talkReply, talkSheet } from "./talk-box.mjs";

/**
 * A debate the outlet invited the player to: Accept (the sitting comes on its day, where the
 * questions are answered) or Decline (the debate goes on without them). Once accepted, the
 * card says so and offers nothing more.
 */
export function debateCard({ words, debate, onAccept, onDecline }) {
  const button = (label, testid, onclick) => {
    const node = makeButton({ textContent: label, onclick });
    node.dataset.testid = testid;
    return node;
  };
  return listRow(
    "campaign",
    {},
    el("b", { textContent: `${words.title} · ${debate.date}` }),
    debate.accepted
      ? el("span", { textContent: words.accepted })
      : buttonRow(
          button(words.accept, "debate-accept", onAccept),
          button(words.decline, "debate-decline", onDecline),
        ),
  );
}

/**
 * The speech as it stands: nothing begun (one button), four parts on offer after what is
 * already said, or finished and ready to give at `venue` (a select the screen supplies).
 */
export function speechCard({ words, state, venue, onBegin, onPick, onGive }) {
  if (!state)
    return el(
      "div",
      {},
      makeButton({ textContent: words.begin, onclick: onBegin }),
    );
  const said = state.picked.map((part) =>
    talkLine({ kind: "speech", text: part.text }),
  );
  if (state.done)
    return el(
      "div",
      {},
      talkSheet({ lines: said, replies: [] }),
      el("label", { textContent: words.venue }, venue),
      makeButton({ textContent: words.give, onclick: onGive }),
    );
  return el(
    "div",
    {},
    talkSheet({
      lines: said,
      replies: state.choices.map((choice) =>
        talkReply(choice, choice.text, () => onPick(choice)),
      ),
    }),
  );
}

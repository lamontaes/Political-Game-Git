// The two campaign acts that take several choices from the player, built from the shared
// parts: a debate (a position on each question, as tabs) and a speech (the parts said so far
// as talk lines, the four on offer as numbered replies). Screens call these and never draw
// their own selects, paragraphs or reply lists.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { makeTab, chooseTab } from "./tab.mjs";
import { listRow } from "./list-row.mjs";
import { talkLine, talkReply, talkSheet } from "./talk-box.mjs";

/**
 * A debate the outlet invited the player to: one position (or a pass) on each question,
 * then Answer. `onAnswer` gets `[{ question, position }]` with position 1, -1 or null.
 */
export function debateCard({ words, debate, questionLabel, onAnswer }) {
  const options = [
    [null, words.pass],
    [1, words.for],
    [-1, words.against],
  ];
  const picks = debate.questions.map((question) => {
    let position = null;
    const bar = el("nav", { className: "tabs tab-rail" });
    const choose = (value) => {
      position = value;
      chooseTab(bar, "position", String(value));
    };
    bar.append(
      ...options.map(([value, label]) =>
        makeTab({
          key: String(value),
          label,
          attr: "position",
          active: value === null,
          onSelect: () => choose(value),
        }),
      ),
    );
    return {
      row: el(
        "div",
        {},
        el("span", { textContent: questionLabel(question) }),
        bar,
      ),
      answer: () => ({ question, position }),
    };
  });
  return listRow(
    "campaign",
    {},
    el("b", { textContent: `${words.title} · ${debate.date}` }),
    ...picks.map(({ row }) => row),
    makeButton({
      textContent: words.answer,
      onclick: () => onAnswer(picks.map(({ answer }) => answer())),
    }),
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

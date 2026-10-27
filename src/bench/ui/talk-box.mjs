/* global document */
// The one talk box part: the lower-third panel every conversation, filing counter and scene
// shows its lines and replies in. Screens build lines and replies here and fill the box
// here, never by writing to `#talk-lines` or `#talk-choices` themselves.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";

const $ = (id) => document.getElementById(id);

/**
 * One line of the box. `kind` is `history` (what was said before, quieter, apart, with
 * `who` named over it), `speech` (what is being said now), `narration` or `label` (a
 * record's status). A lying line is red; a held one is underlined in the grading view.
 */
export function talkLine({ kind = "speech", text, who, lying, held }) {
  const classes = [kind];
  if (lying) classes.push("lying");
  if (held) classes.push("held");
  return el(
    "li",
    { className: classes.join(" ") },
    ...(who
      ? [el("span", { className: "history-who", textContent: who })]
      : []),
    text,
  );
}

/** A numbered reply; `label` is the words it shows, `onPick` what it does. */
export function talkReply(choice, label, onPick) {
  const button = makeButton({
    className: `reply${choice.lie ? " lying" : ""}${choice.held ? " held" : ""}`,
    textContent: label,
  });
  button.addEventListener("click", () => onPick(choice));
  return button;
}

/** Fill the box: its lines, and (when given) its replies. */
export function fillTalk({ lines, replies }) {
  if (lines) $("talk-lines").replaceChildren(...lines);
  if (replies) $("talk-choices").replaceChildren(...replies);
}

/** A line added under the box's lines (a record's status label). */
export function addTalkLine(line) {
  $("talk-lines").append(line);
}

/** The number keys say the reply of that number while the box is showing and no screen is open. */
export function mountTalkKeys(blocked) {
  document.addEventListener("keydown", (event) => {
    const n = Number(event.key);
    if (!Number.isInteger(n) || n < 1 || blocked()) return;
    if (!$("talk-choices").offsetParent) return;
    $("talk-choices").children[n - 1]?.click();
  });
}

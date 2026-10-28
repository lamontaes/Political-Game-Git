/* global document */
// The one talk box part: the lower-third panel every conversation, filing counter and scene
// shows its lines and replies in. Screens build lines and replies here and fill the box
// here, never by writing to `#talk-lines` or `#talk-choices` themselves.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";

const $ = (id) => document.getElementById(id);

/**
 * One line of the box. `kind` is `history mine` or `history theirs` (what the player or
 * the other person said before, quieter, apart, with `who` named over it), `speech` (what
 * is being said now), `narration` or `label` (a record's status). A lying line is red; a held one is underlined in the grading view.
 */
export function talkLine({ kind = "speech", text, who, lying, held, grade }) {
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
    ...(grade ? [gradeControl(grade)] : []),
  );
}

/**
 * A talk's lines in the three kinds the box tells apart (owner, Oct 28 sitting, 39:
 * "not enough delineation between what the player said, what was said before, and what is
 * being said now"): the player's past lines (`history mine`, named), the other person's
 * past lines (`history theirs`, named), and what is said now (`speech`, everything after
 * the player's last line). `lines` are `{ text, mine, lying, held, grade }`, oldest first;
 * `keep` is how many past lines stay above the line said now.
 */
export function transcript(lines, { mineWho, theirWho, keep = 3 }) {
  const lastMine = lines.findLastIndex((line) => line.mine);
  const past = lastMine < 0 ? [] : lines.slice(0, lastMine + 1).slice(-keep);
  const now = lines.slice(lastMine + 1);
  return [
    ...past.map((line) =>
      talkLine({
        ...line,
        kind: `history ${line.mine ? "mine" : "theirs"}`,
        who: line.mine ? mineWho : theirWho,
      }),
    ),
    ...now.map((line) => talkLine({ ...line, kind: "speech" })),
  ];
}

/**
 * The owner's grade on a line, in dev mode only: Good or Bad and one word.
 * `grade` is `{ labels, send }`; `send(word, note)` writes the grade and the
 * control then says it was graded.
 */
function gradeControl({ labels, send }) {
  const note = el("input", {
    className: "grade-note",
    placeholder: labels.note,
    size: 10,
  });
  const box = el("span", { className: "grade-line dev-only" });
  const pick = (word) => async () => {
    await send(word, note.value);
    box.replaceChildren(
      el("span", { className: "grade-saved", textContent: labels.saved }),
    );
  };
  const good = makeButton({ textContent: labels.good });
  good.addEventListener("click", pick("good"));
  const bad = makeButton({ textContent: labels.bad });
  bad.addEventListener("click", pick("bad"));
  box.append(good, bad, note);
  return box;
}

/**
 * The head every speaking panel carries: a face, a name and what they are. The ids are
 * `<prefix>-who`, `-bust`, `-name` and `-role`, which the play screen fills.
 */
export function speakerHead(prefix, { role = true } = {}) {
  return el(
    "div",
    { id: `${prefix}-who`, className: "who" },
    el("div", { id: `${prefix}-bust`, className: "bust" }),
    el(
      "div",
      {},
      el("div", { id: `${prefix}-name`, className: "name" }),
      ...(role ? [el("div", { id: `${prefix}-role`, className: "role" })] : []),
    ),
  );
}

/**
 * Replace each `[data-speaker]` slot in the page with the speaker head of that prefix;
 * `data-role="none"` leaves out the line under the name.
 */
export function mountSpeakers(root = document) {
  for (const slot of root.querySelectorAll("[data-speaker]"))
    slot.replaceWith(
      speakerHead(slot.dataset.speaker, { role: slot.dataset.role !== "none" }),
    );
}

/** Say one line in the list of lines with id `listId` (the opening box says them one at a time). */
export function sayInBox(listId, text) {
  $(listId).replaceChildren(talkLine({ kind: "speech", text }));
}

/**
 * Lines and numbered replies set out in a panel of their own (the speech being built in
 * the Campaigns screen): the same lines and replies the talk box shows, from the same parts.
 */
export function talkSheet({ lines, replies }) {
  return el(
    "div",
    { className: "talk-sheet" },
    el("ol", { className: "talk-lines" }, ...lines),
    el("div", { className: "replies" }, ...replies),
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
  // With nothing to answer (the narrator alone, or an exchange at its end) the box
  // shows one Continue, bottom left, and nothing else (owner, Oct 27, 6:20 PM).
  $("talk").classList.toggle("narration", !$("talk-choices").children.length);
}

/**
 * Which of the smaller controls a conversation offers beside its replies: Say nothing
 * where silence is an answer, Leave only where leaving is a real choice.
 */
export function talkControls({ silent, leave }) {
  $("talk").classList.toggle("no-silent", !silent);
  $("talk").classList.toggle("no-leave", !leave);
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

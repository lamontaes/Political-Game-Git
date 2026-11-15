// The poll worker's scene at the polling place (poll-problem.ts): the lines said so far, the
// replies the voter may say, and Leave. The words come from the bank; nothing is typed here.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";

/**
 * `talk`: { lines: [{ speaker, text }], choices: [{ index, text }] }; `onSay(index)` for a reply;
 * `leave` is the control name and `onLeave()` leaves; either may be left out (a finished talk).
 */
export function pollTalk({ talk, onSay, leave, onLeave }) {
  const button = (text, onClick) => {
    const node = makeButton({ className: "action", textContent: text });
    node.addEventListener("click", onClick);
    return node;
  };
  return el(
    "div",
    { className: "ballot-paper" },
    el(
      "div",
      { className: "poll-talk" },
      ...talk.lines.map((line) =>
        el("p", {
          className: `poll-line poll-${line.speaker}`,
          textContent: line.text,
        }),
      ),
      ...(onSay
        ? talk.choices.map((choice) =>
            button(choice.text, () => onSay(choice.index)),
          )
        : []),
    ),
    ...(onLeave && leave ? [button(leave, onLeave)] : []),
  );
}

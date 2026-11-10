// The ballot at the polls (owner, Oct 26: "Why can't you click these people"; mock pl-ballot):
// each race as a block on a paper, its candidates with an oval to mark, Leave blank; at the
// right "What I know about them", the candidate under the pointer (or the first of the race)
// with face and what the player knows. The voting engine counts what is marked.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { face as drawFace } from "./face.mjs";
import { stripSection, introText } from "./strips.mjs";

/**
 * `contests`: [{ id, title, candidates: [{ personId, name, party }], marked }]; `labels`:
 * { forRace ("For {title}"), blank, leave, know, official }; `onMark(contestId, candidateId)`
 * (null for leave blank); `know(personId) -> { name, face, summary }`; `onLeave()`.
 */
export function ballotPaper({ contests, labels, onMark, know, onLeave }) {
  const side = el("div", { className: "ballot-know strip-screen strips" });
  const paper = el("div", { className: "ballot-sheet" });
  const showKnown = async (candidates) => {
    const rows = await Promise.all(candidates.map((c) => know(c.personId)));
    side.replaceChildren(
      stripSection(
        1,
        labels.know,
        ...rows
          .filter(Boolean)
          .map((k) =>
            el(
              "div",
              { className: "ballot-person" },
              ...(k.face ? [drawFace(k.face)] : []),
              el(
                "div",
                {},
                el("b", { textContent: k.name }),
                introText((k.summary ?? []).join(" ")),
              ),
            ),
          ),
      ),
    );
  };
  for (const contest of contests) {
    const choice = (text, candidateId, candidates) => {
      const node = makeButton({ className: "ballot-choice" });
      node.append(
        el("span", { className: "oval" }),
        el("span", { textContent: text }),
      );
      const picked = contest.marked?.candidateId === candidateId;
      node.setAttribute("aria-pressed", String(Boolean(picked)));
      if (contest.marked) node.disabled = true;
      else
        node.addEventListener("click", () => onMark(contest.id, candidateId));
      if (candidates) {
        node.addEventListener("mouseenter", () => showKnown(candidates));
        node.addEventListener("focus", () => showKnown(candidates));
      }
      return node;
    };
    paper.append(
      el("h3", {
        className: "ballot-race",
        textContent: labels.forRace.replace("{title}", contest.title),
      }),
      ...contest.candidates.map((c) =>
        choice(c.name, c.personId, contest.candidates),
      ),
      choice(labels.blank, null),
    );
  }
  const leave = makeButton({ className: "action", textContent: labels.leave });
  leave.id = "ballot-leave";
  leave.addEventListener("click", onLeave);
  paper.append(leave);
  if (contests[0]) showKnown(contests[0].candidates);
  return el("div", { className: "ballot-paper" }, paper, side);
}

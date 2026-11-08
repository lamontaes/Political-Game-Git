// Where a bill stands, as strip sections (docs/mocks/2026-11-08-legislation/): the
// committee's record, what members have told you, and the floor and override results,
// every member a name that opens their card. The bill stage view (bill-stage.ts) hands
// this the records and the screen's labels; nothing here counts or writes a sentence.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { stripSection, nameLink } from "./strips.mjs";

/** Names as one sentence, each a link that opens the member's card when there is one. */
function nameSentence(people, onOpen) {
  const line = el("span", { className: "hispeople" });
  people.forEach((person, at) => {
    if (at) line.append(", ");
    if (person.personId)
      line.append(nameLink(person.name, () => onOpen(person)));
    else line.append(person.name);
  });
  return line;
}

/** A labeled row: the label in bold, then the names (or `empty` when none). */
function labeledNames(label, people, onOpen, empty) {
  return el(
    "div",
    { className: "stage-row" },
    el("b", { textContent: `${label}: ` }),
    people.length
      ? nameSentence(people, onOpen)
      : el("span", { textContent: empty }),
  );
}

/** One chamber's result: the counts from the roll, then who voted each way. */
function resultBlock(entry, words, onOpen) {
  return el(
    "div",
    { className: "stage-chamber" },
    el("b", {
      textContent: `${entry.chamberTitle} · ${entry.result ?? `${words.yes} ${entry.yes.length}, ${words.no} ${entry.no.length}`}`,
    }),
    labeledNames(words.yes, entry.yes, onOpen, words.nobody),
    labeledNames(words.no, entry.no, onOpen, words.nobody),
  );
}

/**
 * The sections for a bill's stage, deepest first: committee (when it met), what members
 * told you (when any did), the floor and the override (when they voted). `stage` is
 * GET /api/bill/stage; `words` is controls.billStage; `onOpen(person)` shows a card.
 */
export function billStageSections(stage, words, onOpen, onVote) {
  const sections = [];
  if (stage.yours?.mayChoose && onVote)
    sections.push(
      stripSection(
        1,
        words.yourVote,
        el(
          "div",
          { className: "stage-vote" },
          ...["yes", "no", "abstain"].map((how) => {
            const button = makeButton({
              className: `action${stage.yours.chosen === how ? " chosen" : ""}`,
              textContent: words[how],
            });
            button.addEventListener("click", () => onVote(how));
            return button;
          }),
        ),
      ),
    );
  stage.committees.forEach((record) => {
    sections.push(
      stripSection(
        2,
        `${words.committee}: ${record.chamberTitle} · ${record.committee}`,
        el("p", { textContent: `${words.chair} ${record.chair}` }),
        record.heard
          ? labeledNames(
              words.heardFrom,
              record.witnesses,
              onOpen,
              words.nobody,
            )
          : el("p", { textContent: words.held }),
        labeledNames(
          words.votedFor,
          record.votes.filter((v) => v.vote === "yes"),
          onOpen,
          words.nobody,
        ),
        labeledNames(
          words.votedAgainst,
          record.votes.filter((v) => v.vote === "no"),
          onOpen,
          words.nobody,
        ),
      ),
    );
  });
  if (stage.told.length) {
    const side = (name) => stage.told.filter((t) => t.side === name);
    sections.push(
      stripSection(
        3,
        words.told,
        labeledNames(words.toldFor, side("for"), onOpen, words.nobody),
        labeledNames(words.toldAgainst, side("against"), onOpen, words.nobody),
        labeledNames(words.toldOpen, side("open"), onOpen, words.nobody),
      ),
    );
  }
  if (stage.floor.length)
    sections.push(
      stripSection(
        4,
        words.floor,
        ...stage.floor.map((entry) => resultBlock(entry, words, onOpen)),
      ),
    );
  if (stage.override.length)
    sections.push(
      stripSection(
        5,
        words.override,
        ...stage.override.map((entry) => resultBlock(entry, words, onOpen)),
      ),
    );
  return sections;
}

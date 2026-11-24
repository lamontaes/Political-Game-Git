// Where a bill stands, as strip sections (docs/mocks/2026-11-08-legislation/): the
// committee's record, what members have told you, and the floor and override results,
// every member a name that opens their card. The bill stage view (bill-stage.ts) hands
// this the records and the screen's labels; nothing here counts or writes a sentence.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { stripSection, nameLink } from "./strips.mjs";

/** How many names a roll shows before the control that opens the rest. */
const SHOWN_NAMES = 12;

/** Names as one sentence, each a link that opens the member's card when there is one. */
function nameSentence(people, onOpen, words = {}) {
  const line = el("span", { className: "hispeople" });
  const fill = (shown) => {
    line.replaceChildren();
    shown.forEach((person, at) => {
      if (at) line.append(", ");
      if (person.personId)
        line.append(nameLink(person.name, () => onOpen(person)));
      else line.append(person.name);
    });
  };
  // A long roll (a legislature's) shows its first names and a control for the rest, never one paragraph of hundreds.
  if (people.length <= SHOWN_NAMES) fill(people);
  else {
    fill(people.slice(0, SHOWN_NAMES));
    const more = el("button", {
      type: "button",
      className: "action small",
      textContent: `${words.showAll ?? ""} ${people.length}`,
    });
    more.addEventListener("click", () => {
      fill(people);
      more.remove();
    });
    line.append(" ", more);
  }
  return line;
}

/** A labeled row: the label in bold, then the names (or `empty` when none). */
function labeledNames(label, people, onOpen, empty, words) {
  return el(
    "div",
    { className: "stage-row" },
    el("b", { textContent: `${label}: ` }),
    people.length
      ? nameSentence(people, onOpen, words)
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
    labeledNames(words.yes, entry.yes, onOpen, words.nobody, words),
    labeledNames(words.no, entry.no, onOpen, words.nobody, words),
  );
}

/**
 * The sections for a bill's stage, deepest first: committee (when it met), what members
 * told you (when any did), the floor and the override (when they voted). `stage` is
 * GET /api/bill/stage; `words` is controls.billStage; `onOpen(person)` shows a card.
 */
export function billStageSections(
  stage,
  words,
  onOpen,
  onVote,
  amend = {},
  desk = {},
  staff = {},
  override = {},
) {
  const sections = [];
  // A veto message waiting on the player's vote: Yes, No or Abstain on overriding it, then the body takes it up.
  if (stage.yours?.overridePending && override.onVote)
    sections.push(
      stripSection(
        1,
        words.overrideTitle,
        el(
          "div",
          { className: "stage-vote" },
          ...["yes", "no", "abstain"].map((how) => {
            const button = makeButton({
              className: `action${stage.yours.overrideChosen === how ? " chosen" : ""}`,
              textContent: words[how],
            });
            button.addEventListener("click", () => override.onVote(how));
            return button;
          }),
          (() => {
            const call = makeButton({
              className: "action",
              textContent: words.callOverride,
            });
            call.addEventListener("click", () => override.onCall());
            return call;
          })(),
        ),
      ),
    );
  // Staff redraft: ask for a section, see it struck and inserted, keep theirs or your own.
  // Only where a section has a law in force to redraft against: a heading with
  // nothing under it is never shown.
  if (
    stage.yours?.mayRedraft &&
    staff.onAsk &&
    stage.sectionsAmendable.length
  ) {
    const shown = el("div", { className: "stage-redraft" });
    const ask = async (index) => {
      const redraft = await staff.onAsk(index);
      const keep = makeButton({
        className: "action",
        textContent: words.keepStaffs,
      });
      keep.addEventListener("click", () => staff.onKeep(index));
      const mine = makeButton({
        className: "action",
        textContent: words.keepMine,
      });
      mine.addEventListener("click", () => shown.replaceChildren());
      shown.replaceChildren(
        el(
          "p",
          { className: "stage-strike" },
          el("del", { textContent: redraft.struck ?? "" }),
        ),
        el(
          "p",
          { className: "stage-insert" },
          el("ins", { textContent: redraft.inserted ?? "" }),
        ),
        el("p", { textContent: staff.estimate?.(redraft) ?? "" }),
        el("div", { className: "stage-vote" }, keep, mine),
      );
    };
    sections.push(
      stripSection(
        2,
        words.staff,
        el(
          "div",
          { className: "stage-vote" },
          ...stage.sectionsAmendable.map((index) => {
            const button = makeButton({
              className: "action",
              textContent: `${words.askStaff} ${index + 1}`,
            });
            button.addEventListener("click", () => ask(index));
            return button;
          }),
        ),
        shown,
      ),
    );
  }
  // The executive's desk: sign or veto while it waits, then who decided it and why.
  if (stage.desk?.waiting && desk.onDecide)
    sections.push(
      stripSection(
        1,
        words.desk,
        ...(stage.desk.lean
          ? [
              el("p", {
                textContent: `${words.deskView}: ${words[stage.desk.lean.view]}`,
              }),
              el("p", {
                textContent: `${words.deskTemperament}: ${words[stage.desk.lean.temperament]}`,
              }),
            ]
          : []),
        el(
          "div",
          { className: "stage-vote" },
          ...["sign", "veto"].map((how) => {
            const button = makeButton({
              className: "action",
              textContent: words[how],
            });
            button.addEventListener("click", () => desk.onDecide(how));
            return button;
          }),
        ),
      ),
    );
  stage.desk?.decided?.forEach((row) =>
    sections.push(
      stripSection(
        5,
        `${words.desk} · ${words[row.vote === "sign" ? "signed" : "vetoed"]}`,
        labeledNames(words.by, [row], onOpen, words.nobody, words),
        ...row.reasons.map((r) =>
          el("p", {
            textContent: `${words.reasons[r.reason]}: ${words[r.side]}`,
          }),
        ),
      ),
    ),
  );
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
  stage.amendments?.forEach((item) => {
    const done = item.status !== "moved";
    sections.push(
      stripSection(
        2,
        `${words.amendment} · ${item.movedBy}`,
        el(
          "p",
          { className: "stage-strike" },
          el("del", { textContent: item.struck ?? "" }),
        ),
        el(
          "p",
          { className: "stage-insert" },
          el("ins", { textContent: item.inserted ?? "" }),
        ),
        ...(amend.estimate
          ? [el("p", { textContent: amend.estimate(item) })]
          : []),
        ...(done
          ? [
              el("b", { textContent: words[item.status] }),
              labeledNames(words.yes, item.yes, onOpen, words.nobody, words),
              labeledNames(words.no, item.no, onOpen, words.nobody, words),
            ]
          : amend.onCall
            ? [
                (() => {
                  const button = makeButton({
                    className: "action",
                    textContent: words.callVote,
                  });
                  button.addEventListener("click", () => amend.onCall(item));
                  return button;
                })(),
              ]
            : []),
      ),
    );
  });
  if (stage.yours?.mayChoose && amend.onMove)
    sections.push(
      stripSection(
        2,
        words.amendBill,
        el(
          "div",
          { className: "stage-vote" },
          ...[
            ...stage.sectionsAmendable.flatMap((index) =>
              ["lower", "raise"].map((direction) => [index, direction]),
            ),
            ...(stage.sectionsReversible ?? []).map((index) => [
              index,
              "reverse",
            ]),
          ].map(([index, direction]) => {
            const button = makeButton({
              className: "action",
              textContent: `${words[direction]} ${index + 1}`,
            });
            button.addEventListener("click", () =>
              amend.onMove(index, direction),
            );
            return button;
          }),
        ),
      ),
    );
  // The members who signed on beside the sponsor.
  if (stage.cosponsors?.length)
    sections.push(
      stripSection(
        2,
        words.cosponsors,
        el(
          "div",
          { className: "stage-row" },
          nameSentence(stage.cosponsors, onOpen, words),
        ),
      ),
    );
  stage.committees.forEach((record) => {
    sections.push(
      stripSection(
        2,
        `${words.committee}: ${record.chamberTitle} · ${record.committee}`,
        el("p", { textContent: `${words.referred} ${record.committee}` }),
        el("p", { textContent: `${words.chair} ${record.chair}` }),
        record.heard
          ? labeledNames(
              words.heardFrom,
              record.witnesses,
              onOpen,
              words.nobody,
              words,
            )
          : el("p", { textContent: words.held }),
        ...(record.markup?.length
          ? [
              el("b", { textContent: words.markup }),
              ...record.markup.map((item) =>
                el(
                  "p",
                  { className: "stage-insert" },
                  el("ins", {
                    textContent: `${item.name} · ${words[item.kind === "pill" ? "markupPill" : "markupTrade"]} · ${item.inserted ?? ""}`,
                  }),
                ),
              ),
            ]
          : []),
        labeledNames(
          words.votedFor,
          record.votes.filter((v) => v.vote === "yes"),
          onOpen,
          words.nobody,
          words,
        ),
        labeledNames(
          words.votedAgainst,
          record.votes.filter((v) => v.vote === "no"),
          onOpen,
          words.nobody,
          words,
        ),
      ),
    );
  });
  // The aide's estimate: marked as an estimate, in words, never a count.
  if (stage.aide && stage.aide.heard > 0)
    sections.push(
      stripSection(
        3,
        words.aide,
        el("p", { textContent: words[`aide-${stage.aide.outlook}`] }),
        el("p", { className: "stage-note", textContent: words.aideCaveat }),
      ),
    );
  if (stage.told.length) {
    const side = (name) => stage.told.filter((t) => t.side === name);
    sections.push(
      stripSection(
        3,
        words.told,
        labeledNames(words.toldFor, side("for"), onOpen, words.nobody, words),
        labeledNames(
          words.toldAgainst,
          side("against"),
          onOpen,
          words.nobody,
          words,
        ),
        labeledNames(words.toldOpen, side("open"), onOpen, words.nobody, words),
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

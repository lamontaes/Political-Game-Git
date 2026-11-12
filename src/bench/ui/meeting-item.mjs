// One agenda item at a meeting, or one bill on the desk: the bill's name, number and
// sponsor, the members as round faces ringed by how each voted, the tally and its result in words, who spoke, and the buttons under it in rows (the paper and the
// speeches, then the vote). The panel the meeting and the desk both draw (owner, Oct 29:
// "the UI is terrible"; the members, the tally and the result on the panel). Every word
// is a control name or a record's own: the status word, the counts, the member names.
import { el } from "./dom.mjs";
import { headshot } from "./headshot.mjs";

const KINDS = ["yes", "no", "abstain"];

/** Each kind of vote counted from the bill's recorded votes. */
export function tallyOf(votes) {
  const counts = Object.fromEntries(KINDS.map((kind) => [kind, 0]));
  for (const v of votes) if (v.vote in counts) counts[v.vote] += 1;
  return counts;
}

/** The members as faces: a ring by the vote they cast on this item, their name and vote on hover. */
function memberStrip(members, votes, words) {
  const cast = new Map(votes.map((v) => [v.memberKey, v.vote]));
  return el(
    "div",
    { className: "meeting-members" },
    ...members.map((member) => {
      const vote = cast.get(member.key);
      const face = member.face
        ? headshot(member.face)
        : el("span", { className: "headshot" });
      face.classList.add("meeting-face");
      const cell = el(
        "span",
        {
          className: `meeting-member${vote ? ` vote-${vote}` : ""}${member.you ? " you" : ""}`,
          title: [member.name, vote ? words[vote] : null]
            .filter(Boolean)
            .join(" · "),
        },
        face,
      );
      return cell;
    }),
  );
}

/**
 * Who spoke on the item, apart from the vote: one line for those who spoke for it and one
 * for those against, each under its own label, so nobody reads a speaker as a vote.
 */
function spokeLines(remarks, words) {
  return [
    [words.spokeFor, remarks.filter((r) => r.position > 0)],
    [words.spokeAgainst, remarks.filter((r) => r.position <= 0)],
  ]
    .filter(([, spoke]) => spoke.length)
    .map(([label, spoke]) =>
      el(
        "p",
        { className: "meeting-remarks" },
        el("small", {
          textContent: `${label ?? ""} · ${spoke.length.toLocaleString("en-US")}`,
        }),
        el("span", { textContent: spoke.map((r) => r.name).join(", ") }),
      ),
    );
}

/**
 * `item`: the bill as the office view gives it; `members`: the body's members with their
 * faces; `words`: the meeting's control names (yes, no, abstain); `floor`: the floor's
 * status words; `rows`: rows of buttons under the card.
 */
export function meetingItem({ item, members = [], words, floor, rows = [] }) {
  const counts = tallyOf(item.votes);
  const voted = item.votes.length > 0;
  return el(
    "article",
    { className: "meeting-item" },
    el("h3", { className: "meeting-title", textContent: item.title ?? "" }),
    el("p", {
      className: "meeting-sub",
      textContent: [item.number, item.sponsor].filter(Boolean).join(" · "),
    }),
    members.length ? memberStrip(members, item.votes, words) : "",
    voted
      ? el(
          "div",
          { className: "meeting-result" },
          el("strong", { textContent: floor.status?.[item.status] ?? "" }),
          el("span", {
            textContent: KINDS.filter((kind) => counts[kind])
              .map(
                (kind) =>
                  `${counts[kind]} ${(words[kind] ?? "").toLowerCase()}`,
              )
              .join(", "),
          }),
        )
      : "",
    ...spokeLines(item.remarks, words),
    ...rows
      .filter((row) => row.length)
      .map((row) => el("div", { className: "meeting-acts" }, ...row)),
  );
}

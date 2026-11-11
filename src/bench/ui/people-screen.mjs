// The People screen (owner, Nov 7: the person card, "perfect"; mock pl-people): everyone you
// know in a roster at the left, grouped by how they're tied to you, and the selected
// person's card beside it. The roster reads the records the screen hands it; the card is
// the one person card the game builds everywhere (the screen passes its builder in).
import { el } from "./dom.mjs";
import { pickGroup, pickHead, pickRow } from "./list-row.mjs";

const ORDER = ["household", "family", "friends", "work", "politics", "other"];

/** The group a person sits under: home first, then the first group their records name. */
function groupOf(person, household) {
  if (household.has(person.personId)) return "household";
  const named = person.groups?.find((g) => ORDER.includes(g));
  return named ?? "other";
}

/**
 * `people`: the person records ({ personId, name, relation, groups }); `household`: the
 * set of ids who live with you; `labels`: the bare control names; `card(person,
 * stillWanted, openOther)`: builds a person's card ({ node } or null).
 */
export function peopleScreen({ people, household, labels, card }) {
  const roster = el("nav", { className: "pick-list people-roster" });
  roster.setAttribute("aria-label", labels.title);
  const pane = el("div", { className: "people-pane" });
  let selected;
  let request = 0;
  const open = async (person) => {
    selected = person.personId;
    const mine = ++request;
    for (const b of roster.querySelectorAll(".person"))
      b.setAttribute("aria-pressed", String(b.dataset.id === selected));
    const built = await card(
      person,
      () => mine === request,
      (other) =>
        open(people.find((p) => p.personId === other.personId) ?? other),
    );
    if (built && mine === request) pane.replaceChildren(built.node);
  };
  roster.append(pickHead(labels.title));
  for (const key of ORDER) {
    const members = people.filter((p) => groupOf(p, household) === key);
    if (!members.length) continue;
    roster.append(pickGroup(labels[key], "group"));
    for (const person of members) {
      const row = pickRow({
        label: person.name,
        aside: person.relation ?? "",
        className: "person",
      });
      row.dataset.id = person.personId;
      row.addEventListener("click", () => open(person));
      roster.append(row);
    }
  }
  const first = people.find(
    (p) =>
      groupOf(p, household) ===
      ORDER.find((k) => people.some((q) => groupOf(q, household) === k)),
  );
  if (first) open(first);
  return [el("div", { className: "people-screen" }, roster, pane)];
}

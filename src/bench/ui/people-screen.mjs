// The People screen (owner, Nov 7: the person card, "perfect"; mock pl-people): everyone you
// know in a roster at the left, grouped by how they're tied to you, and the selected
// person's card beside it, on the one list-beside-detail part (`rosterScreen`). The roster
// reads the records the screen hands it; the card is the one person card the game builds
// everywhere (the screen passes its builder in).
import { rosterScreen } from "./roster-screen.mjs";

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
  let request = 0;
  return rosterScreen({
    title: labels.title,
    className: "people",
    groups: ORDER.flatMap((key) => {
      const members = people.filter((p) => groupOf(p, household) === key);
      return members.length
        ? [
            {
              title: labels[key],
              entries: members.map((person) => ({
                key: person.personId,
                label: person.name,
                aside: person.relation ?? "",
                person,
              })),
            },
          ]
        : [];
    }),
    // The chosen person's card; a name inside it opens that person's card here too.
    // The list follows: the row of the person now shown is the lit one, and
    // none is lit for someone who is not on the list.
    render: (entry, show, shows) => {
      const open = async (person, moved) => {
        const mine = ++request;
        const built = await card(
          person,
          () => mine === request,
          (other) =>
            open(
              people.find((p) => p.personId === other.personId) ?? other,
              true,
            ),
        );
        if (!built || mine !== request) return;
        show(built.node);
        if (moved)
          shows(
            people.some((p) => p.personId === person.personId)
              ? person.personId
              : null,
          );
      };
      open(entry.person);
    },
  });
}

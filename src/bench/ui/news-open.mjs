// Which tab News opens on (Fable A, Nov 13, the Red desk's Arial, South
// Carolina case: News opened on an empty home paper while another outlet the
// player follows had stories they had not read). The last tab the player chose
// if it has something new; otherwise the outlet they follow with the newest
// story they have not read; otherwise their home paper. A story is read once
// its outlet's page has been shown (`seen`, story ids). An outlet is one the
// player follows when the press record says so (`why`), or when it printed a
// story they heard: they hear what they follow (press.ts followersOf). The
// desk of stories no outlet printed counts like one when it has something the
// player has not read (Fable A, Nov 13: North Hyde Park, Vermont, where every
// story was on the desk and News opened on an empty paper); the Nation's page
// is not an outlet.

const NOT_OUTLETS = new Set(["nation"]);

/** The key of the tab News opens on, from the tabs in order (`outlets`). */
export function openingTab(outlets, lastChosen, seen) {
  const unread = (outlet) => outlet.stories.filter((s) => !seen.has(s.id));
  if (lastChosen && outlets.has(lastChosen))
    if (unread(outlets.get(lastChosen)).length) return lastChosen;
  const followed = (key, outlet) =>
    outlet.why === "follows" ||
    (!NOT_OUTLETS.has(key) && outlet.stories.length > 0);
  let best = null;
  let newest = "";
  for (const [key, outlet] of outlets) {
    if (!followed(key, outlet)) continue;
    for (const story of unread(outlet)) {
      const date = String(story.date ?? "");
      if (best === null || date > newest) {
        newest = date;
        best = key;
      }
    }
  }
  if (best) return best;
  const home = [...outlets].find(([, outlet]) => outlet.home);
  return home ? home[0] : outlets.keys().next().value;
}

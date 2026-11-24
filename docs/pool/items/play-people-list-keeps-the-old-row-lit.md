---
id: play-people-list-keeps-the-old-row-lit
title: "In People, a name clicked on a card shows that person but the list keeps the old row lit, and that row cannot be clicked back"
area: play
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by: claude/fable-b-people-list-follows-the-card
pr: #8835
after:
blocked-on:
lead: screens
model: fable
effort: low
root: rc10-screens-keep-own-facts
source: lead's play walk on Nov 11, 2026 (Jim Thorpe, Pennsylvania, seed 390bcb5a-59a1-4d8a-9c85-785b90538bd7), then the code
checked:
claimed-at: 2026-11-11
merged-at: 2026-11-11T16:34:08.395Z
---

**What.** People is where the player looks up who they know. A person's card there names other people ("His people"), and clicking a name shows that person's card beside the list. The list does not follow. In the walk above the player chose their father, Arthur Bolton, and clicked Corey Moody on his card: the card showed Corey Moody, Arthur Bolton's row stayed lit as if it were his card, and clicking Arthur Bolton's row did nothing. The player had to choose a third person and come back. Seen: the People screen at 1440x900, where the lit row is always the person shown, no row is lit for someone who is not on the list, and one click on any row shows its person.

**Cause.** Found in code: `peopleScreen` in src/bench/ui/people-screen.mjs (line 45) draws the other person's card into the page with `show`, and never tells the list. `rosterScreen` in src/bench/ui/roster-screen.mjs (line 36) marks the lit row only inside its own `open`, and refuses to open the entry it believes is already open (`if (entry.key === opened) return`), so the row left behind is dead until another is chosen.

**Fix.**

1. In src/bench/ui/roster-screen.mjs, `render` is handed a third argument, `shows(key)`: the page says whose page it now is. The list lights that row, or none when the key is `null`, and forgets which entry it had open, so the row left behind opens on a click. This is in the shared list part, so every screen built on it can use it.
2. In src/bench/ui/people-screen.mjs, opening a name from a card calls `shows` with that person's id when they are on the list and `null` when they are not.
3. src/bench/people.browser.mjs follows a name from a card and fails unless the lit row is the person shown (or none), and the first row shows its person again on one click.

**Time box.** 1 hour for the lead. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the list's own marking moves into one function and no second way to light a row is added. No hand-written player text in code: the change adds no words. One rule, all 56 places: the check draws its place and names it with its seed.

**Done when.** A second session, in the running game on main at 1440x900, starts a new life in a drawn place it writes down with its seed, opens People, chooses a person whose card names someone else and clicks that name. The card shows the person named; their row is lit if they are on the list and no row is lit if they are not; one click on the first person's row shows the first person again. The browser check src/bench/people.browser.mjs passes on a fresh bench.

**Waits on.** Nothing.

**Files.** src/bench/ui/roster-screen.mjs, src/bench/ui/people-screen.mjs, src/bench/people.browser.mjs

**Notes.** Written by the lead (Fable B), Nov 11, 2026. Found while checking Escape on a card over a menu: in People a name does not open a card over the menu, it changes the page beside the list. Before and after pictures at 1440x900 are under docs/seen/people-list-follows-the-card/ (the same life, replayed by its seed); the card opens in about 60 ms before and after.

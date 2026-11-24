---
id: gov-another-states-address-reaches-a-town-only-through-the-press
title: "What the paper or the wire carries of another state's governor's address to a town"
area: gov
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "the Account lead's ruling, Nov 15: another state's governor's address reaches a town only if a story carries it there through the press's own path, and never delivers a speech to that town's readers directly"
claimed-at:
after:
lead: gov
model: opus
effort: medium
root: design-country-tier
---

**What.** Another state's governor's yearly address now keeps only its result (the entry's result row and what was said); the speech that used to reach the town's outlet followers is gone. A town should still hear of a neighboring governor's address when it is news, through the paper or the wire, and nothing builds that. Seen: at Odessa, Washington (place 5350745, seed 6446dd140ffc5ca029e4fd4b314e0f424645865663f86366745f22f2746f441b), 48 governors gave the address outside the state and none reached a reader after the change.

**Cause.** Found in code: `stateOfTheState` in `src/core2/office-day-state.ts` took its audience from `outletsHere(api)` followers for every governor, so every state's address went to the played town's readers; that removed delivery leaves no path from the kept result to the press. `outletsHere` entered that audience in e1cdac4910 (Oct 15, "Unify state office acts, appointments and treasury per diem with the shared day").

**Fix.** The press engine's own path carries a result to its readers: a story about another state's address is written when the press covers that state (its outlet's beat), and readers hear it as news received, with the story as the stated source of any view that moves. No new carrier. The words for the story come from the English engine's banks.

**Time box.** 4 hours for one Opus session at medium effort. When it runs out, write what was read in this item and stop.

**Rules.** The press covers what its beat covers: one model, two tiers, read through the same rule for a counted reader as for a full person. Ask why: a reader's changed view names the story that carried the address, never the address itself. No dice: which stories run comes from the outlet's beat, money and the news of the day.

**Done when.** A second session, not the builder, plays a year at a drawn place and seed it names and finds a neighboring state's governor's address in the paper only where the outlet covers that state, with the readers' views citing the story, and no reader's view moved by an address no story carried.

**Waits on.** The Nov 15 change that removes the direct delivery (Skills thread's PR for `speed-outside-governor-address`).

**Files.** src/core2/modules/press.ts; src/core2/office-day-state.ts; data/english

---
id: gov-territory-local-governments-not-recorded
title: "Guam, the U.S. Virgin Islands, American Samoa and the Northern Marianas record no local government, so a player there has no town office to run for"
area: gov
kind: bug
priority: 2
size: L
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
model: opus
effort: medium
root: rc1-world-outside-town
source: S8 while building #9125, Nov 14, 2026 (the Account lead asked for it), Barrigada, Guam, seed s8fresh1
checked:
---

**What.** `localOfficesForPlace` (`src/core2/offices-local.ts`) returns no office at all for any of the 158 recorded villages of the four territories (Guam 19, U.S. Virgin Islands 10, American Samoa 63, Northern Marianas 66; the list is `src/core2/data/places/territory-places.json`). Puerto Rico is different: its 78 municipalities each have a municipal legislature and an executive. A player who starts in one of the four has a state-level (territory) government and no town government, so no town office to file for. Seen: a player's life in a drawn village of each of the four territories; day one shows the territory's offices and no local council, mayor or board.

**What was and was not checked.** Not played. I measured it from the records: the office rows for each of the four territories' 158 places are empty, and `composeLocalAddress(core, "town")` returns no address at Barrigada, Guam (seed s8fresh1) because `townHead` has no seat to speak. I did not start a life there and look at the Politics screens, so what a player sees on day one is inferred, not seen; the builder plays one place of each first.

**Cause.** Found in code: the offices engine (`src/core2/offices-local.ts`) builds local offices from the Census government-units listing (`boardOffices`, `cityOffices`, `localOfficesForPlace`), and that listing carries no unit for the four territories' villages. The structure also differs from the mainland: Guam's villages have an elected village mayor (commissioner) with no council, the Virgin Islands have no local governments below the territory, American Samoa has village councils of chiefs and county councils, and the Northern Marianas have municipal mayors and councils. These need sourced structures; none is recorded.

**Fix.** Research each territory's local structure (seats, terms, who files, filing age, title) into the same data tables the offices engine reads for the mainland, with a sourced or estimated row for each, and register a stopgap where a number is only estimated. One offices engine; no per-territory code path. A territory with no local government at all (the Virgin Islands) is recorded as having none, with its source, so "no town office" is a fact and not a gap.

**Time box.** 6 hours, Opus.

**Rules.** One rule, all 56 places: no territory is named in logic; the rows live in data. One engine per mechanic. Estimate, never unknown. Real data calibrates and never picks an outcome.

**Done when.** In a drawn village of each of Guam, American Samoa and the Northern Marianas, the offices engine lists the local offices the place really has, with the filing age and term from their source, and the town head gives a yearly address; the Virgin Islands record that they have none, with the source. A test is pinned to a named village and seed for each. A second session plays one such life on main.

**Waits on.** Nothing.

**Files.** src/core2/offices-local.ts, src/core2/gov-rules/, src/core2/data/places/territory-places.json, src/director/local-address.ts

**Notes.** The owner ruled Nov 14 (card "After early access") that this waits until after early access; the plain notice meanwhile is play-territory-pick-says-local-office-is-not-there-yet. Related, kept separate: words-territory-town-head-gives-no-address (the address half, which this item's fix clears); play-nothing-to-enter-at-eighteen (the golden path's first contest at 18 in Yona, Guam).

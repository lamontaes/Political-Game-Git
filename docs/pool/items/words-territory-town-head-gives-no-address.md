---
id: words-territory-town-head-gives-no-address
title: "A Guam, USVI, American Samoa or Northern Marianas town gives no yearly address because no local office is recorded"
area: director
kind: bug
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: rc1-world-outside-town
source: S8 while building #9125, Nov 14, 2026 (Words lead asked for it), Barrigada, Guam, seed s8fresh1
checked:
---

**What.** In Barrigada, Guam (seed s8fresh1), `composeLocalAddress(core, "town")` returns no address. Seen: a town head's yearly address in a Guam, USVI, American Samoa or Northern Marianas place, said at the place's own board or council.

**Cause.** Found in code: `localOfficesForPlace` (`src/core2/offices-local.ts`) returns no office for any place of US-GU, US-VI, US-AS and US-MP (checked with the 19, 10, 63 and 66 recorded localities), so `townHead` in `src/director/local-address.ts` has no seat to speak and `speakerOf` returns null. Puerto Rico gives its municipal legislature and executive, so it speaks.

**Fix.** Record each territory's local government (a village mayor and council in Guam, and so on) from its place record through the same offices engine, with a registered stopgap where the research is missing; do not add a second writer in the director.

**Time box.** 3 hours, Sonnet.

**Rules.** One rule, all 56 places: no territory is named in logic; the rows live in data. One engine per mechanic.

**Done when.** In a drawn place of each of the four territories, the town head gives an address, and a test pinned to named places says so. A second session plays one such address on main.

**Waits on.** gov-territory-local-governments-not-recorded.

**Files.** src/core2/offices-local.ts, src/director/local-address.ts, src/core2/gov-rules/.

**Notes.** Not a naming fault, so not fixed in #9125.

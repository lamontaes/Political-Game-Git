---
id: people-origin-island-area-villages-have-no-own-counts
title: "A village in Guam, the Virgin Islands, American Samoa or the Northern Marianas draws its people's origin from the nation, not from its own counts"
area: people
kind: wiring
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
lead: lives
source: stopgap SG-LIVES-origin-state-shares, rewritten Nov 14 in PR for people-protected-traits-on-record-part-1-race-on-record
standard: 2
model: sonnet
effort: medium
root: design-one-model-two-tiers
claimed-at:
branch:
---

**What.** The 50 states, DC and Puerto Rico draw each household's origin from the place's own 2020 Census counts. The island-area villages of Guam, the Virgin Islands, American Samoa and the Northern Marianas have no row, so a village there draws from the nation's adult mix, which does not describe an island where most residents are Chamorro, Samoan or Black. Seen: the faces and origin of the households a player meets in an island village.

**Cause.** Found in code: `originSharesWithBasis` in src/core2/opening-origin.ts reads `place-race-origin.generated.ts`, cut from the republished state files (data/source/place-race-origin/raw/places_2020_rc_eth.csv), which hold no island areas; a village's `sourceGeoid` (src/core2/data/places/territory-places.json) therefore finds no row and falls to the nation. The game's origin groups (white, Hispanic, Black, Asian, other) must also hold a Pacific Islander share: the island-area census tables name Native Hawaiian and Other Pacific Islander, which the exporter folds into "other".

**Fix.** Commit the island areas' 2020 Census counts of residents by Hispanic origin and race, one place file per area, to data/source/place-race-origin/raw/ in the same columns (the island-area 2020 Census release by village is the source; look for a republished copy the same way the state files were found, in a public GitHub repository), run `npm run export:place-race-origin`, and extend the lock file. No code change expected beyond the village's `sourceGeoid` matching the file's key; if the file keys differ, map them in the exporter, in data, never by place name.

**Time box.** 3 hours for one Sonnet session.

**Rules.** One rule, all 56 places: no territory named in logic. Estimate, never UNKNOWN; the basis stays recorded. Simulated residents; real counts only calibrate the draw.

**Done when.** A second session builds a village in each of the four island areas in drawn seeds and sees the basis read `place` and the households' origin mix within sampling of the village's own counts, listed by household record id; the existing opening-origin test gains one island village.

**Waits on.** Nothing.

**Files.** data/source/place-race-origin/, scripts/source/export-place-race-origin.ts, src/core2/opening-origin.test.ts, src/core2/data/stopgaps/lives.json

**Notes.** Filed Nov 14 by the thread that built the state rows (PR for people-protected-traits-on-record-part-1-race-on-record). The mixed-couple half of the stopgap is already owned by people-opening-household-cannot-be-a-mixed-couple.

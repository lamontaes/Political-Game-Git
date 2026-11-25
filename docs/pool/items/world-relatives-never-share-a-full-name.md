---
id: world-relatives-never-share-a-full-name
title: "Two people in one family never carry the same full name"
area: world
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by: claude-places-and-names
blocked-on:
after:
lead: world
model: sonnet
effort: medium
root: none
source: Owner, Nov 16, 2026 playtest (partner and sister both "Ashley Lucas", Grano, North Dakota), crew line #9995, stop "Partner and sister share a name"
---

**What.** In some families two people carried one full name: a partner and a sister, a mother and a sister, a father and a grown son. Seen: owner playing, Nov 16, on the player's card and in scenes with the family. A scan of 30 drawn places found a repeat in the player's own kin in 2, and a scan of whole towns found about one group in fifty. Seen: the player's card, its family list.

**Cause.** Found in code: given names were kept distinct only among brothers and sisters (`distinctSiblingGivenName`). `buildOpeningKin` in `src/core2/opening-kin.ts` named parents, siblings and others with no check against each other; `population.ts` drew a grown child at home with the parent's family name and no check; `chooseIdentityV1` in `src/core2/state.ts` renamed siblings around only the player's chosen name.

**Fix.** The same helper now guards every route: a repeat full name inside a household (`distinctHouseholdNames`), among a household's relatives (`nameKin`), and around the household's names when the player chooses a name. No new naming system.

**Time box.** 2 hours for one Sonnet session at medium effort.

**Rules.** No dice: names are drawn from the seeded corpus, and a repeat takes the next seeded draw. Seeded generation of who exists is allowed.

**Done when.** In drawn places and seeds the builder did not choose, no person, household and relatives group repeats a full name (`src/core2/relatives-distinct-names.test.ts`), and a chosen player name leaves every full name in the family distinct (`src/core2/sibling-names.test.ts`); a second session starts a new life and reads the family on the player's card.

**Waits on.** Nothing.

**Files.** src/core2/opening-kin.ts, src/core2/population.ts, src/core2/state.ts, src/core2/relatives-distinct-names.test.ts, src/core2/sibling-names.test.ts

**Notes.** A father and son who share a name ("Junior") are not built: the owner's ruling is that two relatives cannot share a full name.

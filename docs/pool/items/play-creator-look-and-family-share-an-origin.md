---
id: play-creator-look-and-family-share-an-origin
title: "The look chosen in the creator ignores the family's origin, so a parent and child look unrelated"
area: people
kind: bug
priority: 2
size: M
status: in-pr
standard: 2
claimed-by: claude/pool-play-creator-look-and-family-share-an-origin
pr: #8568
after:
blocked-on:
lead: people
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
source: added with npm run pool -- add
claimed-at: 2026-11-11T04:27:21.029Z
---

**What.** Owner, Nov 8, 2:10 p.m.: "I'm Mexican and my son is white. I don't know how that happened." Measured Nov 10 in Blodgett Landing, New Hampshire (seed e2bab652-129f-4bca-8f56-eb77054e7f87): the creator gave the player the tan woman-slim, while her father, drawn from the household origin, is the pale blond man-slim. Each household member's pack person is narrowed by the household origin, but the player's is whatever they chose, so the family does not follow the player's choice. Seen: the player's own family in the room and on their cards, where parents and children look like they share the look the player chose.

**Cause.** Found in code: the household's origin is drawn at the opening (src/core2/opening-origin.ts, originAt and the householdOrigin map, lines 92 to 130) before the creator's choice is applied. applyChosenPerson (src/bench/creator.ts, line 300) merges the chosen recipe into the player's looks through chooseIdentityV1 (src/core2/state.ts, line 1639), which leaves looks.origin and every other member alone. packPersonOf (src/bench/whole-figures.ts, line 82) uses who.look.person for the player and the origin's tones (data originTones) for the others.

**Fix.** In chooseIdentityV1, after the looks merge: when the chosen recipe's pack person is outside the household origin's tones, give the player's household (and the kin who share its origin) the origin whose tones include that person, taking the one with the largest share in the state (originShares). The tone of a pack person comes from the same luminance ranking packPersonOf uses, moved to one exported function so the two cannot differ. The bench passes nothing new; the core API does it.

**Time box.** 3 hours

**Rules.** One rule, all 56 places: shares come from originShares, never a named state. No dice: the origin follows from the chosen look and the state's shares. Stopgap SG-PEOPLE-origin-skin-tones stays registered (three tones per sex).

**Done when.** A test makes a creator life in two drawn places (place and seed named) with a chosen pack person whose tone is outside the drawn household origin, and shows the player and every household member then share one origin on their looks records and each member's pack person is in that origin's tones. A second session makes a creator life in a drawn place, opens People, and sees parents and siblings in the player's skin tone.

**Waits on.** Nothing.

**Files.** src/core2/state.ts, src/core2/opening-origin.ts, src/bench/whole-figures.ts, src/bench/creator.ts

**Notes.** Found while building play-one-person-shows-two-faces (PR 8330), which made every menu read one face per person but did not change the core identity call.

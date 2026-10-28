---
id: opening-governor-key-person
title: "The opening points out the player's governor"
area: core
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The owner's Oct 27 sitting, item 3, said the opening needs the national people and maybe the governor. The key-people list in src/core2/data/opening/key-people.json has no governor reason, so the state's stage of the opening points out nobody since the state legislators were removed. A governor reason would let the state's stage point out the player's governor.

**Rules.** One rule, all 56 places: the governor is read from the offices records of the player's state or territory, never named; wire to the world: the key-people list is read by both the opening and the Politics screen.

**Done when.** In a drawn place (name the place and seed), src/director/opening-story.test.ts asserts the state's stage points out the player's governor by record id, and a screenshot of the opening's state stage with the governor's tag is in the PR body.

**Files.** src/core2/data/opening/key-people.json, src/core2/opening-key-people.ts, src/director/data/opening-story.json

**Notes.** Filed by the screens designer from screens-opening-national-people. lead: core.

---
id: director-say-who-again-after-a-season-apart
title: "Someone the player met once long ago comes back as a bare first name"
area: words
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after: director-narrator-says-who-a-person-is
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Lead and Words lead, Nov 16, on #9581 (rule 136; the owner, Nov 15, a first name alone only "if you know her already")
---

**What.** Once the met record holds, the narrator names a person by first name alone forever. For someone met once months ago, that leaves the player guessing who it is.
Seen: Hardinsburg, Kentucky (2134552), seed 4276344481a2b078e70633cfee47d0caccb65f74:2. On 2025-07-15 Melissa Sharpe, a reporter, is named alone to Gail Simpson, and their tie's last day together was 2025-03-18 (/mnt/project-files/words-lead/who-they-are/who-kinds-a8be8346.md).

**Cause.** Found in code: src/director/who-they-are.ts `whatTheyAre` returns null whenever src/director/relation-facts.ts `relationFacts` gives `metBefore`, which holds for any tie with a day together before today however long ago (closeness.ts `lastTogether`). Nothing reads how long ago that was.

**Fix.** In `whatTheyAre`, for a person outside the player's circle (not family or household, no shared sittings, and a tie no closer than having met, below `tieSides.friendCloseness`), treat them as unmet again when their last day together is older than the director's season of whole memory (`directorMemoryRecentDays`, director.json). The director already forgets older moments after that, so no new number is picked. Read the last day together from the one "last in touch" read the conversation engine thread is building for People cards, not a second copy.

**Time box.** 2 hours, one Sonnet session at medium effort.

**Rules.** One rule, all 56 places: the same season applies to every person, place and level. No hand-written player text in code: the words come from said-as.json.

**Done when.** At Hardinsburg KY (seed above) and at a drawn place with a seed nobody chose, a scene the player reaches by their own presses names someone last seen more than a season ago with their full name and what they are again, and someone seen within the season by first name alone; a second session sees it in the running game.

**Waits on.** #9581, and the conversation engine thread's "last in touch" read.

**Files.** src/director/who-they-are.ts, src/director/relation-facts.ts

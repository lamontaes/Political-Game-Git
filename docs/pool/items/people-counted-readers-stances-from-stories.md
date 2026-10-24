---
id: people-counted-readers-stances-from-stories
title: "A counted follower reached by a story moves their group's view by the same rule as a full reader"
area: people
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** When a printed story reaches an outlet's followers, the views engine moves the stance of each full reader it reached (news.ts emits the read event with the readers as witnesses). The outlet's counted followers are reached only as a count (receivedCounted on the printed story) and their group's views never move, for a policy story, a law story or a story about the town's conditions. A counted group's view is read from its opening profile alone, so the wider population's opinion never responds to the news.

**Rules.** One model, two tiers: a counted group reached by a story moves by the full reader's rule (the speaker's standing, the heard-event amount, the repeat wear-out) times the count it stands for. Ask why: the group's moved view cites the story's news record. No dice: which groups the story reached follows the press's delivery shares, never a roll.

**Done when.** In a one-year buildBenchWorld run in a place drawn from all 56 (place and seed named), a printed story's counted followers have their group view on the story's question moved by the full reader's rule times their count, citing the story record id, and filling in a member of that group gives a person whose view matches it; src/core2/views-counted-readers.test.ts proves it and fails when the counted step is removed.

**Files.** src/core2/modules/views.ts, src/core2/modules/news.ts, src/core2/modules/press.ts

**Notes.** Found by the effects lead on Oct 24 while building web-views-hear-conditions-moves-stance; the full readers' step is on that item's PR.

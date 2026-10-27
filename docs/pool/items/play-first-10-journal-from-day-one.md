---
id: play-first-10-journal-from-day-one
title: "The Journal opens on day one with your roots, your family and where you came from"
area: words
kind: bug
priority: 1
size: M
status: done
claimed-by:
pr: #6345
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at:
---

**What.** On the v0.22.10 release the Journal was blank for the first three weeks. The owner ruled Oct 14 that the player's own context (parents, their relationship, siblings, where the family came from and a few remembered moments) is rendered from day one, and Oct 24 that people's histories are simulated and the journal runs from day one. This item writes the opening chapter of the memoir from the player's deep past.

**Rules.** Serves LAW.md §5, Journal and the past; LAW.md §10, The owner's read of the Oct 24 screenshots. Wire to the world: the chapter reads the player's own deep-past records (parents, siblings, moves, remembered moments). No hand-written player text: the lines come from the English engine as memoir, first person.

**Done when.** In a drawn place on the first evening, the Journal shows an opening chapter naming the player's parents, siblings and family origin from their records, each line citing its record id, shown by a screenshot.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** On the first evening the Journal opens with a few memoir lines about where your family came from, your parents and your siblings, and turning 18 is written into that story.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/director/journal.ts, src/core2/deep-past.ts, src/bench/story.ts

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Journal words are the Words lead's (`needs-from: words`); the lane builds the screen side. Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md). Playtest Oct 26 sitting 1 (installed v0.34.0): Journal opens "Our family came from Albion, Pennsylvania. I was raised by my parent Kendall. My father Brian lived somewhere else. My brother Leo was born after me." and the first toast is "My brother Leo was born after me." Owner: "What the hell kind of entry is that? Again, there's no history. I keep saying history should be simulated. It shouldn't be blank when it pops up." Playtest Oct 26 sitting 1 (installed v0.34.0): Journal opens "Our family came from Albion, Pennsylvania. I was raised by my parent Kendall. My father Brian lived somewhere else. My brother Leo was born after me." and the first toast is "My brother Leo was born after me." Owner: "What the hell kind of entry is that? Again, there's no history. I keep saying history should be simulated. It shouldn't be blank when it pops up." Reopened by the CTO, Oct 26: owner, "What the hell kind of entry is that? Again, there's no history. I keep saying history should be simulated. It shouldn't be blank when it pops up."

Sent back 2026-10-25 from PR #6093 (branch words/play-first-10-journal): 23 new journal bank pieces are origin authored with shippable true and no grading evidence for their keys; route through permitted admission before claiming shippable opening text; finish on that branch, merge main into it first.

2026-10-25 Merger 1 correction: the authored-only send-back is withdrawn after verifying the newer Oct 24 owner ruling releasing that hold. Bank shippable flags are checked against the grade ledger; authored origin alone is not a blocker. Current Words claim and in-pr status are preserved; local gate resumes after the fresh main-integration window. GitHub comment 6404004843 records the correction.

Sent back 2026-10-25 from PR #6093 (branch words/play-first-10-journal): own main-integrated static gates, opening-world proof, 113 bank checks and East Douglas first-evening screenshot pass; three journal failures reproduced identically on clean base and do not block; plain integration push rejected by automatic approval review, explicit user authorization needed, no author source fix requested and authored-origin objection remains withdrawn; finish on that branch, merge main into it first.
Sent back Oct 27 from PR #6230 (branch play-first/play-first-10-journal-from-day-one): journal.json has a duplicate part text (`i went on to {school}.` under two keys) failing english-parts-banks; finish on that branch, merge main into it first.
- Merged Oct 27 in PR #6345 (supersedes #6230); awaiting the owner's installed-build check.

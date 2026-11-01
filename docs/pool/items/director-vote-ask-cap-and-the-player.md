---
id: director-vote-ask-cap-and-the-player
title: "The player hears every sponsor's ask before a close vote, or learns why one went to the journal"
area: director
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The director caps one person's vote-ask scenes at six per 91 days (src/director/scheduling.ts:823-845, seasonCap in src/director/data/situation-types.json:83-89); past it the ask becomes a journal line with no stop and no reason recorded. A sitting legislator who is the player is asked about nearly every failing bill, about five evenings in nine in Springfield, Oregon (4169600, run seed chk2-b), so from the seventh ask in a quarter the player never hears a sponsor's request and the vote happens without them knowing it was close. The cap and how the player is told are the director's and Words' to rule on.

**Rules.** This is a game, not a spreadsheet: the player should hear a close vote's ask or see why not, worded through the English engine's banks, never raw. Ask why: when the cap sends an ask to the journal, the schedule records the reason (the season cap) so tests and the journal can say so.

**Done when.** In a played year in a drawn place where the player sits in a legislature, every vote-ahead ask to the player is either staged as a scene or recorded with the season-cap reason, and the journal line for a capped ask says the sponsor asked, through a bank line; the Words session's ruling on the cap for the player is cited in the PR body.

**Files.** src/director/scheduling.ts, src/director/data/situation-types.json, data/english

**Notes.** Found on legislature-ask-before-the-roll-test-red-by-seed (Nov 1). Lead: Words (director and data/english); governing writes the ask.

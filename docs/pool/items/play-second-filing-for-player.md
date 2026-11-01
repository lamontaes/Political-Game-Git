---
id: play-second-filing-for-player
title: "Something files for the player a second time when a later filing period opens, and election night shows both a win and a loss"
area: elections
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: play-first/play-second-filing-for-player
pr: #6967
blocked-on:
source: "found by the words-and-scenes lead, Oct 27, in the campaign-season test"
lead: play-first
milestone: play-first
claimed-at:
---

**What.** In Tutu, U.S. Virgin Islands (territory:VI:tutu), run seed `1d8f65cb19633445477d:0` of `src/director/campaign-season.test.ts`, the player files once on January 20, 2025 for the Board of Education race of November 3, 2026. On March 9, 2026, when that race's filing period opens, the player's ledger shows a second `cause:event:candidate-filed` that stages the filing and family-filing scenes again. On election night the ledger shows both `race-won` and `race-lost`. Something filed for the player without the player's choice, against the owner's rule that the player's choices are the player's (no auto-file, no auto-vote).

**Rules.** The player's choices are the player's (AGENTS.md; words-engine skill). Ask why: name the record and the engine that filed the second time.

**Done when.** A test files the player early for a later race in a drawn place and plays to election day. It asserts exactly one `candidate-filed` record for the player per contest and exactly one result scene for the player's race, and names the place and seed. The engine that filed the second time is fixed at the root.

**Time box.** 2 hours.

**You will see.** A player who files early for a later race files once: no second filing scene when that race's filing period opens, and one result on election night.

**Screenshot.** The Campaigns screen and the election-night result for the player's race, from a drawn place, in the PR body.

**Files.** src/core2/modules/candidacy.ts, src/core2/modules/elections.ts, src/bench/government.ts (fileForOffice)

**Notes.** Found while building the campaign-season scenes (words-campaign-season-scenes-fill-the-months-a). Not yet diagnosed. The early filing on January 20 may be stored as a pre-filing that the filing period re-files.

- 2026-11-01 (lane): Traced on main. The elections engine files the player once: in Tutu, U.S. Virgin Islands (seed 1d8f65cb19633445477d:0) the player's one filing row is for the 2026 governor race (the Board of Education is no longer a player office) and the log holds one `candidate-filed` and one `election-result` for it. The record that appears on March 9, 2026 when the filing period opens is a separate `rival-filed` (the incumbent's filing: `rival-filed:filing:contest:seat:US-VI:governor:2026-11-03:official:term:...`) whose facts name the player's filing id. If the director's filing and family-filing scenes fire again that day, they are reading that rival record as the player's own: a director matter (Words), sent to the Words session. `src/bench/early-filing-once.test.ts` asserts one filing row, one `candidate-filed` and at most one result for the race in three drawn places (New Munster, Wisconsin; Woodstock, Georgia; Tutu).

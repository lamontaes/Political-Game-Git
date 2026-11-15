---
id: campaigns-lean-toward-the-area-the-term-hurt
title: "A campaign leans its platform toward the area the incumbent's term hurt or helped"
area: core
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: account lead thread "Give rivals more than one issue"
pr: 9303
blocked-on:
after: director-term-read-areas-answered-by-one-map
source: account lead thread "Give rivals more than one issue", Nov 14 (coordinator, the town-level jobs, pay and prices question, PR 2)
lead: governing
standard: 2
model: opus
effort: medium
root: none
---

**What.** A campaign for a seat whose last term slid on pay, jobs or prices spends more of its acts on the questions that answer that area: a challenger leans toward what the term hurt, the incumbent toward what it helped. Before, a campaign's platform shares came from the filer's own stands and the audience alone, so a town whose pay fell had a race about everything else. Seen: a challenger's platform shares at Bee Cave TX, Kingsbury NV and Medford MA (seed a7c13e) move toward pay and prices after a term where those slid.

**Cause.** Found in code: `platformShares` in src/core2/modules/campaigns.ts scores the filer's stands and nothing of the place's own record, and `nextTopic` spends acts against those shares; the term read (src/core2/term-read.ts) kept the record per area, but only the speeches read it.

**Fix.** `recordTilted` leans each share by `1 + platformRecordTilt * need`, where need is the largest slide, in the direction the filer gains from, over the areas the question answers (`areasAnswered`, the one map), and renormalizes. It reads the same `jurisdictionTermRead` as the governor's and mayor's addresses (a replace: the address's own web reader is deleted). A slide, never a threshold; no roll. An open seat or an empty read leaves the shares as they were. `platformRecordTilt` is TUNABLE 1.0, checked 0.5 to 2.

**Time box.** 4 hours for an Opus session.

**Rules.** One engine per mechanic: the speeches and the campaigns read one map and one reader. No dice: the tilt is a weight on score shares and picks no actor's outcome.

**Done when.** A second session sees, in a race at a place drawn from all 56 (name the place and seed) after a term where pay or prices slid, a challenger's platform shares lean toward the questions that answer it, with a flat term leaving them as before.

**Waits on.** director-term-read-areas-answered-by-one-map (folded).

**Files.** src/core2/modules/campaigns.ts, src/core2/term-read.ts, src/director/local-address.ts, src/core2/data/campaigns/parameters.json, src/core2/campaign-record-tilt.test.ts (new).

**Notes.** Filed Nov 14 with the PR; years 1 and 2 are identical with and without because the term read is in its warmup (SG-WORDS-term-read-warmup) and a state race outside the played town has no web rows; by year 4 (seed t2, to 2029-01) the lean is non-zero in the campaign openings (largest 0.635) and 344 of 605 tables differ, 12 of them campaign tables, records 566,161 against 565,194, year 4 at 167.2 s without and 160.8 s with.

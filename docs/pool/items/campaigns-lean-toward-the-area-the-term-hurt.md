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

**What.** A campaign for a seat whose last term slid on pay, jobs or prices spends more of its acts on the questions that answer that area: a challenger leans toward what the term hurt, the incumbent toward what it helped. Before, a campaign's platform shares came from the filer's own stands and the audience alone, so a town whose pay fell had a race about everything else.

**Cause.** Found in code: `platformShares` in src/core2/modules/campaigns.ts scores the filer's stands and nothing of the place's own record, and `nextTopic` spends acts against those shares; the term read (src/core2/term-read.ts) kept the record per area, but only the speeches read it.

**Fix.** `recordTilted` leans each share by `1 + platformRecordTilt * need`, where need is the largest slide, in the direction the filer gains from, over the areas the question answers (`areasAnswered`, the one map), and renormalizes. It reads the same `jurisdictionTermRead` as the governor's and mayor's addresses (a replace: the address's own web reader is deleted). A slide, never a threshold; no roll. An open seat or an empty read leaves the shares as they were. `platformRecordTilt` is TUNABLE 1.0, checked 0.5 to 2.

**Time box.** 4 hours for an Opus session.

**Rules.** One engine per mechanic: the speeches and the campaigns read one map and one reader. No dice: the tilt is a weight on score shares and picks no actor's outcome.

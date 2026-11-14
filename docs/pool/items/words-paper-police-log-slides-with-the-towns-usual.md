---
id: words-paper-police-log-slides-with-the-towns-usual
title: "The paper's police log gets space by how far the month is from the town's usual"
area: words
kind: feature
priority: 1
size: S
status: in-pr
standard: 2
claimed-by:
pr: 9227
blocked-on:
after:
lead: words
model: sonnet
effort: medium
root: none
source: added on branch claude/project-thread-aqtryq (Words lead ruling, Nov 14)
checked: m3 2026-11-14
---

**What.** The police log printed one line in every town every month, however ordinary the month. The Words lead ruled (Nov 14): no switch on above a line; the log's space slides with how far the month is from the town's own usual, down to nothing. Seen: News, Briefs, in a town where a month ran over its usual: the log says by how many and what rose most; in an ordinary month it is one short line.

**Cause.** Found in code: src/core2/modules/press.ts `policeLog` put the month on the wire with no comparison, and src/core2/press-desk.ts ranked briefs without any weight for how unusual the item is.

**Fix.** The wire item carries `vsUsual` (the month's reports over the mean of the town's last twelve closed months, read from the crime engine's month rows), the usual and the kind that rose most. The briefs column multiplies a brief's score by a share of space that is none at 0.7 of usual and full at 1.5 (both TUNABLE parameters); a brief with no `vsUsual` keeps all its space. The log's body says how many more than usual and what rose most only when the month is over usual.

**Time box.** 3 hours.

**Rules.** No dice; no threshold; a small town shows its own count, never a rate.

**Done when.** In the running game, in three drawn places, a second session opens News and reads the Briefs column: a month over the town's usual prints the police log with a body that says how many more and what rose most, a month under it prints the short log, and a month under 0.7 of usual is not printed.

**Waits on.** Nothing.

**Files.** src/core2/modules/press.ts,src/core2/press-desk.ts,src/core2/data/press/parameters.json,src/bench/printed-words.ts,src/english/english-newscast.ts,data/english/parts/news.json

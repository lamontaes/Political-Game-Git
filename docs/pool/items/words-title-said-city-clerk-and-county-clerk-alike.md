---
id: words-title-said-city-clerk-and-county-clerk-alike
title: "An elected city clerk is said with capitals, a county clerk without"
area: director
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: design-words-machine
source: S4, Nov 14, from the second words reader's read of PR 9173's played lines
---

**What.** In running text the counter says the county clerk with lower case and the City Clerk with capitals, though both are common nouns. One rule should say both. Seen: in the counter narration the player reads at any filing counter.

**Cause.** Found in code: titleInSentence in src/director/filing-visit.ts:260 lowercases a title only when the record capitalizes just its first word ("County clerk"); a title with two capitalized words ("City Clerk") is left as written as if it had a proper name, so the same job reads two ways. The office said form in running text is officeInSentence in src/core2/person-work.ts; the two should be one reader.

**Fix.** Replace titleInSentence with the one office reader so both read alike; delete the second function.

**Time box.** 2 hours, Opus medium.

**Rules.** One rule for all 56 places; the person is said from the record, never from a typed list.

**Done when.** In three drawn places (named with seeds) a city clerk, a county clerk and a town clerk are said the same way in the counter's narration, and a second session sees it at the filing counter on main.

**Waits on.** Nothing.

**Files.** src/director/filing-visit.ts, src/core2/person-work.ts, src/english/said-as.ts

**Notes.** Filed by S4 after PR 9197.

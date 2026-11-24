---
id: news-headline-says-area-has-gone-for-a-plural-area
title: 'A rally''s headline reads "happy with how jobs has gone", the headline frame does not agree with a plural area'
area: words
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words-engine
model: sonnet
effort: medium
root: none
source: Account lead, #9418 reader's note, Nov 15
claimed-at:
---

**What.** The paper's rally headline "Neighbors in {place} turn out, happy with how {area} has gone" prints "happy with how jobs has gone" where the area is a plural noun. Found at Lincoln, Vermont (seed `pa-seed-9320`, label `pa-b`, a staged good term), the jobs rally. Seen: in the News list a resident of Lincoln reads after a rally there.

**Cause.** Found in code: the headline piece in `data/english/parts/headlines.json` ("news.public-action…turn-out-happy-with-how-area-has-gone") frames the area with a singular verb, and the area names (`areaName`, `src/english/…`) are phrases of either number, with nothing in the fact to tell the frame which.

**Fix.** Rewrite the frame so it holds for either number ("happy with {area}", "glad about {area}"), the way the other two rally headlines already do, and delete the old frame; do not add a number flag.

**Time box.** 1 hour for one Sonnet session at medium effort.

**Rules.** Words are graded by the Words lead; no hand-written text in code.

**Done when.** At the place and seed above the jobs rally headline plays without "has gone" after "jobs", shown in a played file headed with the sha; a second session replays it in a drawn place and seed nobody chose.

**Waits on.** Nothing.

**Files.** data/english/parts/headlines.json

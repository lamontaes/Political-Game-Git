---
id: news-protest-story-does-not-say-what-the-protesters-want
title: 'A protest story names the issue but not what the protesters want, so "protested limits on how much rents can rise" does not say which side they are on'
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
source: Account lead, #9418 coordinator note, Nov 15
claimed-at:
---

**What.** The paper prints "927 residents of Gainesville protested limits on how much rents can rise on February 5, 2025." Residents who protest rent want rents held down, but "limits on how much rents can rise" reads as if they protested the limits. The story names the policy question and not the side. Found at Gainesville, Georgia (seed `pa-seed-9320`, label `pa-l`, a staged bad term). Seen: in the News list a resident of Gainesville reads after the protest.

**Cause.** Found in code: `publicAction` in `src/bench/printed-words.ts` words a protest by `read.issue(f.question)`, the question's name, and the record's `side` and the demand are not read, so the news line has only the topic. The record keeps `question` and `side` in its facts (`src/core2/modules/public-action.ts`).

**Fix.** Read the area's demand from the action record (the side it presses for) and word the story as what the protesters want ("demanded limits on how much rents can rise"), through the existing issue-names path, in lines the Words lead places; add no number or flag.

**Time box.** 2 hours for one Sonnet session at medium effort.

**Rules.** Words are the Words lead's to grade; people say how it feels, never the figure; no hand-written text in code.

**Done when.** At the place and seed above the protest story says what the protesters want, shown in a played file headed with the sha; a second session replays it in a drawn place and seed nobody chose.

**Waits on.** #9418.

**Files.** src/bench/printed-words.ts, data/english/parts/news.json

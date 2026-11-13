---
id: words-meaning-tone-verdicts-2
title: "Meaning-and-tone verdicts for the 150 most-heard lines, three more rules"
area: words
kind: bug
priority: 2
size: M
status: in-pr
standard: 2
claimed-by: claude/words-meaning-tone-verdicts-2
pr: 8422
after: words-meaning-tone-verdicts-1
blocked-on:
lead: words
model: sonnet
effort: medium
root: design-words-machine
source: added with npm run pool -- add
---

**What.** The same 150 most-heard lines that words-meaning-tone-verdicts-1 judged are judged against three more of the owner's rules a program cannot check: names-something-specific, fits-speaker-and-tie and promise-only-what-the-speaker-can-do, by a judge that did not write them. Each line judged no is rewritten from its own scene's slots, and every rewrite is judged again on all eight rules done so far and on the reply pairs it joins.

**Cause.** Design: docs/design/words-machine.md (judged rules get their verdicts on the most-heard lines first; data/english/line-rules.json holds these three with none yet).

**Fix.** Judge the 150 on the three rules, rewrite each no from its scene's slots, re-judge each rewrite on all eight rules and its pairs until none fails, fold with npm run words:verdicts.

**Time box.** 3 hours for one session.

**Rules.** Only slots the scene already uses; no line the owner graded good is touched; American English; the judge never writes lines.

**Done when.** The store holds 150 good verdicts and 0 bad for each of the eight rules; npm run words:grade shows no new pull and no silent spot; and a second session playing a job offer it puts off, in a drawn place, hears the employer name the deadline or the pay instead of a generic goodbye.

**Waits on.** words-meaning-tone-verdicts-1 (#8271), whose rewrites these 150 are.

**Files.** data/english/parts/scene-talk.json,data/english/judged

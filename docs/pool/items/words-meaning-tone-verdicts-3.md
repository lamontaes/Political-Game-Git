---
id: words-meaning-tone-verdicts-3
title: "Meaning-and-tone verdicts for the next 150 most-heard lines, five rules"
area: words
kind: bug
priority: 2
size: M
status: in-pr
standard: 2
claimed-by: claude/words-meaning-tone-verdicts-3
pr: 8437
after: words-meaning-tone-verdicts-2
blocked-on:
lead: words
model: sonnet
effort: medium
root: design-words-machine
source: Fable B's job 4 (Nov 11), after Story's handoff on issue 7365
---

**What.** The next 150 most-heard lines, after the 150 that words-meaning-tone-verdicts-1 judged, are judged against the five rules that item judged: no-explaining, no-literary-phrasing, commitment-names-who-what-why, stake-is-named and reply-second-move-follows-the-first. The heard counts come from a year in three places drawn from fresh seeds. The judge did not write the lines. Each line judged no is rewritten from its own scene's slots and judged again on all eight rules done so far and on the reply pairs it joins.

**Cause.** Design: docs/design/words-machine.md (judged rules get their verdicts on the most-heard lines first).

**Fix.** Rank the lines heard in a year in three drawn places with scripts/words/one-line-spots.ts in worker mode, leave out the lines already judged, judge the next 150, rewrite each no, re-judge every rewrite on all eight rules and its pairs, and write a reply for any line the "no" pairs leave with nothing that follows.

**Time box.** 3 hours for one session.

**Rules.** Only slots the scene already uses; no line the owner graded good is touched; American English; the judge never writes lines.

**Done when.** The store holds 300 good verdicts and 0 bad for each of the five rules; npm run words:grade shows no new pull, no silent spot and no new line without a reply that follows; and a second session playing a no-diploma talk at home in a drawn place hears the parent name what the diploma means for work and, after a promise, ask which way or when.

**Waits on.** words-meaning-tone-verdicts-2 (pull request 8422), which this branch is stacked on.

**Files.** data/english/parts/scene-talk.json, data/english/judged

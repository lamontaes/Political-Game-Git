---
id: press-concession-test-names-the-paper-s-rule-not-one-wording
title: "The concession paper test checks the paper's naming rule, not one wording"
area: director
kind: bug
priority: 3
size: S
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: low
root: none
source: red on the Train, Nov 15 2026 (src/director/concession-reported.test.ts, both cases at North Westminster VT)
checked:
---

**What.** `src/director/concession-reported.test.ts` (removed) fails both cases on the Train: it looks for a sentence that starts with the runner-up's full name and says "called … to concede", and the paper now prints "Michael Wise defeated Betty Sheppard for selectboard member on Tuesday, 22 votes to 21. After the count, Sheppard called Wise to concede."
Seen: the race story printed in the town paper after the concession call.

**Cause.** Found in code: the wording lives in data/english/parts/news.json:13837; the old premise was that the concession sentence starts with the runner-up's full name. That stopped being true when the wording "After the count, {rival} called {last} to concede." came in (d9c85e4441), picked by outlet order (807f349de8); the paper's rule is the full name at the first mention and the family name after, so the story is right and the test is stale.

**Fix.** The test finds the sentence that reports the concession by "conce", asserts the paper's rule on the whole story (the runner-up and the winner are each named in full before their family names appear, and the call's sentence names the runner-up by family name and does not repeat the full name), and keeps the two meaning checks (called to concede; has not called or would not concede) with the name allowed before "to concede". Run at the same named place and seed. Guards the player's paper: the race's story after the concession call reads "Sheppard called Wise to concede" after both are named in full.

**Time box.** 1 hour.

**Rules.** Replace, never layer: the test checks the rule, not a second wording. Review: words.

**Done when.** A second session plays the runner-up's call in a drawn place with a fresh seed, once conceding and once refusing, reads the race's story in the paper, and sees the runner-up and the winner named in full at their first mention and by family name after, the call's sentence naming the runner-up, and `npx vitest run src/director/concession-reported.test.ts` passing both cases at North Westminster, Vermont (5052375), world seed 18d0fb93fe003b8a20a3e4ce1848cd57da4a5e825a8dd4eab5c799ee23806b39.

**Waits on.** Nothing.

**Files.** src/director/data/kept-scene-kinds.json

**Notes.** Old premise: the concession sentence starts with the runner-up's full name. New premise: the sentence names the runner-up by family name and the paper's naming rule holds across the story. Account lead said yes to this change (Nov 15).

- Nov 17, story-cut-deleted-scene-kinds: src/director/concession-reported.test.ts deleted with its scene kind (owner, Nov 17: "DELETE EVERYTHING THAT IT HASNT WRITTEN"). Dropped: the scene kind this item serves is deleted.

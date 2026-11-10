---
id: words-machine-part-2-tests-for-rules-that-judge-a-piece-in-its-spot
title: "The words machine, part 2: rules that depend on who is speaking, to whom and about what get their tests"
area: words
kind: feature
priority: 1
size: M
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
source: split from words-machine-rules-from-the-owners-notes by Fable, Nov 10, 2026 (owner, Nov 10: every assignment works without Fable)
---

**What.** Many of the owner's notes are about a line in its place: fine from a friend, wrong from a stranger; fine at a kitchen table, wrong at a podium. Twenty-eight such rules are written down with no test. This part hands a rule the line together with its spot, and writes those tests.

**Cause.** Found in code: `runRules` (src/english/line-rules.ts line 300) runs every rule in data/english/line-rules.json, which holds 25 rules with `status: awaiting-test` on main at 756370e86b, and 61 once pull request 8154 merges (17 judge one line, 28 a piece in its spot, 9 a set and 7 an exchange); a rule with that status pulls nothing. The run judges a piece by its text and its part's key; it does not yet hand a rule the spot's tags (speaker's tie, occasion, register).

**Fix.** Give a rule's detector the piece together with its spot: the bank, the spot's key and the tags the composer chooses by (data/english/scene-talk-tags.json and the parts' own tags). Then write each `piece-in-context` rule's detector as a condition on the text and those tags, with one example it must catch and one it must leave alone. Same steps as part 1: `sample`, run, read every flagged line, then `enforced`.

**Time box.** 10 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** No hand-written player text: the rules judge bank lines only, and this part writes none. A rule may not pull a line the owner graded good. A rule that needs a fact no tag holds is left awaiting, with the missing tag named in its row; do not guess the context from the words.

**Done when.** A second session, on main, runs `npm run words:rules` twice with the second run changing nothing, reads these rules in the report with their flagged lines and no conflicts, and for three of the rules opens one pulled line and one line left alone in the same bank and agrees the rule tells them apart by where each is said. It builds a drawn place's scenes for a year with the crew's scene tool, names the place and seed, and finds none of the lines these rules pulled.

**Waits on.** Pull request 8154 on main. words-machine-part-1-tests-for-rules-that-judge-one-line for the run's steps.

**Files.** data/english/line-rules.json, src/english/line-rules.ts, scripts/words/run-rules.ts, data/english/scene-talk-tags.json

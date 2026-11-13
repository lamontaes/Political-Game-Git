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
checked: fable 2026-11-10
claimed-at:
branch: claude/fable-b3-spot-rule-tests
---

**What.** Many of the owner's notes are about a line in its place: fine from a friend, wrong from a stranger; fine at a kitchen table, wrong at a podium. Twenty-eight such rules are written down with no test. This part hands a rule the line together with its spot, and writes those tests.

**Cause.** Found in code: `runRules` (src/english/line-rules.ts line 300) runs every rule in data/english/line-rules.json, which holds 25 rules with `status: awaiting-test` on main at 756370e86b, and 61 once pull request 8154 merges (17 judge one line, 28 a piece in its spot, 9 a set and 7 an exchange); a rule with that status pulls nothing. The run already hands a rule the piece's bank, kind, move and uses (`RulePiece`, src/english/line-rules.ts) and a rule can be limited to banks, kinds and moves (`ruleApplies`, same file). It is not handed who is speaking to whom or the occasion (the speaker's tie, the occasion, the register), which the composer's tags hold.

**Fix.** Extend `RulePiece` and the rule's `applies` condition, never a second way in: add to each of a piece's `uses` the tags the composer chooses by (data/english/scene-talk-tags.json and the parts' own tags). Then write each `piece-in-context` rule's detector as a condition on the text and those tags, with one example it must catch and one it must leave alone. Same steps as part 1: `sample`, run, read every flagged line, then `enforced`. Of these 28 rules, 24 carry the test `{ kind: "judged" }` on main. Where a condition on the text and the tags catches the clear cases with no false catch, give the rule that test; where none can, leave it `judged` and `awaiting-test` with one sentence of reason in its row, for words-machine-part-7-saved-verdicts-for-rules-a-program-cannot-judge.

**Time box.** 10 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** No hand-written player text: the rules judge bank lines only, and this part writes none. A rule may not pull a line the owner graded good. A rule that needs a fact no tag holds is left awaiting, with the missing tag named in its row; do not guess the context from the words.

**Done when.** A second session, on main, runs `npm run words:rules` twice with the second run changing nothing, reads these rules in the report with their flagged lines and no conflicts, and for three of the rules opens one line the rule flags (pulled, or waiting for Story's rewrite where pulling it would leave its spot silent) and one line left alone in the same bank and agrees the rule tells them apart by where each is said. It builds a drawn place's scenes for a year with the crew's scene tool, names the place and seed, and finds none of the lines these rules pulled.

**Waits on.** Pull request 8154 on main. words-machine-part-1-tests-for-rules-that-judge-one-line for the run's steps.

**Files.** data/english/line-rules.json, src/english/line-rules.ts, scripts/words/run-rules.ts, data/english/scene-talk-tags.json

**Notes.** Released by next (2026-11-13): no push to claude/fable-b3-spot-rule-tests since 2026-11-11 08:03 UTC, more than twice its 10-hour time box. Continue on branch claude/fable-b3-spot-rule-tests.

---
id: words-machine-part-1-tests-for-rules-that-judge-one-line
title: "The words machine, part 1: every rule that judges a single line gets its test and starts pulling lines"
area: words
kind: feature
priority: 1
size: M
status: done
standard: 2
claimed-by: claude/fable-b3-line-rule-tests
pr: #8204
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: design-words-machine
source: split from words-machine-rules-from-the-owners-notes by Fable, Nov 10, 2026 (owner, Nov 10: every assignment works without Fable)
checked: fable 2026-11-10
claimed-at: 2026-11-10T19:03:00.636Z
merged-at: 2026-11-10T22:54:21.024Z
seen-by: second-session-2
seen-at: 2026-11-11T03:29:23.719Z
---

**What.** The owner's notes are rules now, and most of the newer ones are written down without a test, so they pull nothing. This part writes the test for each rule that can be judged from one line alone. A rule with a test pulls the lines that break it and refuses new ones by name.

**Cause.** Found in code: `runRules` (src/english/line-rules.ts line 300) runs every rule in data/english/line-rules.json, which holds 25 rules with `status: awaiting-test` on main at 756370e86b, and 61 once pull request 8154 merges (17 judge one line, 28 a piece in its spot, 9 a set and 7 an exchange); a rule with that status pulls nothing.

**Fix.** For each awaiting rule whose `judges` is `line`: write its detector in the form the enforced rules in the same file use (a pattern, a word list or a count), with one line it must catch and one it must leave alone as the rule's examples. Set the rule to `sample`, run `npm run words:rules`, and read every line it flags. When none is a false catch, set it to `enforced`. A rule that cannot be judged from one line is given the right `judges` value and left for part 2 or 3. All 17 of these rules carry the test `{ kind: "judged" }` on main, meaning a program was not expected to judge them. Where a pattern, a word list or a count catches the clear cases with no false catch, give the rule that test. Where no program can judge it, leave the test `judged` and the status `awaiting-test`, and write one sentence in the rule's row saying why: words-machine-part-7-saved-verdicts-for-rules-a-program-cannot-judge gives those rules their saved verdicts. Change no bank line: pulled lines go to Story through data/english/pulled.json.

**Time box.** 8 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** No hand-written player text: the rules judge bank lines only, and this part writes none. A rule may not pull a line the owner graded good: the run's Conflicts section must stay at none. Story writes every line (CTO, Nov 10). Rules, checks and skills merge before the work they judge (owner, Nov 10). American English.

**Done when.** A second session, on main, runs `npm run words:rules` twice and the second run changes no file. The report shows each of these rules with its notes and the lines it flags and no conflicts. It adds a line that breaks one of the rules to a bank and the English guards fail by that rule's name. It builds a drawn place's scenes for a year with the crew's scene tool, names the place and seed, and finds none of the lines these rules pulled.

**Waits on.** Pull request 8154 on main.

**Files.** data/english/line-rules.json, src/english/line-rules.ts, src/english/line-rules.test.ts, data/english/pulled.json

**Notes.** Seen in the game (2026-11-11, second-session-2): Whiting, Indiana (scene-year draw), seed sy-0428053f, main 170bd92c: words:rules ran twice with no file change and Conflicts reads None; adding 'Talk to you soon' to a bank line failed the English guards by rule no-talk-to-you-soon; a year of 55 scenes ran with nothing pulled playing

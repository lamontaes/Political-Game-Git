---
id: words-machine-part-5-one-command-after-a-grading
title: "The words machine, part 5: one command after the owner grades, and everything that follows from his grades is rebuilt"
area: words
kind: feature
priority: 1
size: S
status: merged
standard: 2
claimed-by:
pr: #8168
after:
blocked-on:
lead: words
model: sonnet
effort: low
root: design-words-machine
source: split from words-machine-rules-from-the-owners-notes by Fable, Nov 10, 2026 (owner, Nov 10: every assignment works without Fable)
checked: fable 2026-11-10
merged-at: 2026-11-10T18:37:26.000Z
---

**What.** The owner, Oct 23: "every time I update a batch or something, it should update through the entire game." Today that takes several commands in the right order, listed in a skill. This part makes it one command that anyone, or a scheduled job, can run after a grading. Running it twice changes nothing.

**Cause.** Found in code: package.json has `words:pairs`, `words:rules` and `words:verdicts` as separate scripts (lines 14 to 16), and the grades are folded by scripts/dialogue-batch/apply-grades.ts, run by hand before them.

**Fix.** Add one script, `words:grade`, that runs the grade fold and then the rules run in order, stops at the first failure, and prints where the report is and the totals line. Add a test that running it twice in a row changes no file. Replace the hand-listed order in the words-engine skill with the command's name, in both copies of the skill.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Replace, never layer: the hand-listed order in the skill is replaced by the one command, not kept beside it. Skills are mirrored byte for byte; run `npm run test:skill-ops`. A process is a skill, not a message.

**Done when.** A second session, on main, runs `npm run words:grade` twice: the second run changes no file and prints the same totals. It then marks one line bad in a grade file by hand, runs the command, sees that line in data/english/pulled.json or held in data/english/part-grades.json, and restores the file. It then builds a drawn place's scenes with the crew's scene tool, names the place and seed, and does not find that line.

**Waits on.** Nothing.

**Files.** package.json, scripts/dialogue-batch/apply-grades.ts, scripts/words/run-rules.ts

**Notes (Fable B, Nov 10, marked merged by hand).** Pull request 8168 merged at 2026-11-10 18:37 UTC and built this item, but the item stayed in review: its `pr:` field held the number with no `#`, which the merge's flip does not match, and the pull request's first line named no item (pool item pool-merge-does-not-flip-an-item-whose-pr-field-has-no-hash). A second session's check in the game is still owed.

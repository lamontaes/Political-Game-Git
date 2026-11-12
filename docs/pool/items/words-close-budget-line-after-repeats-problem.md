---
id: words-close-budget-line-after-repeats-problem
title: "A close that asks for a budget line says the problem again as if it were what follows"
area: words
kind: defect
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: "filed by the words builder (hurt terms) on the words lead's direction, Nov 12, from Berwick, Maine, seed c4d7e1ad70c7853f"
lead: words
after:
standard: 2
model: sonnet
effort: low
root: none
---

**What.** A town head's address that asks for more spending on a budget line closes on the ask, then says the line's problem as though it were the result: "So let's give the police department more to work with, and then our officers are covering more calls than there are officers to answer them." The close reads as if the ask makes things worse. Seen: the last paragraph of a governor's or town head's address at home, when its first ask is a budget line.

**Cause.** Found in code: `closeFacts` in src/director/speech-outline.ts words "what follows from the ask" (`first-after`) as `questionToday(first.question, !first.law.inForce, side)`, the question's wording with the law changed. A budget line's row in data/english/question-names.json gives the same sentence for `today.with` and `today.without` (budget-line:police, "for": "Our officers are covering more calls than there are officers to answer them."), so the "after" clause is the problem statement. Measured: Berwick, Maine, seed c4d7e1ad70c7853f, the bad-term fixture of src/director/local-address-hurt.test.ts, town head (docs/seen/speech-hurt-terms/lines.md on claude/words-speech-hurt-terms).

**Fix.** In `closeFacts`, offer `first-after` only when the question's wording with the change differs from its wording without it (the same `questionToday` read both ways); otherwise the close falls back to `first-reason` or the theme's short form, as it already does. One rule for every question and level; no bank line changes.

**Time box.** 1 hour for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text in code. One rule for every level and body; no place or office named in logic.

**Done when.** A second session, not the builder, composes the town head's address in Berwick, Maine, seed c4d7e1ad70c7853f (bad term, as in local-address-hurt.test.ts) and in one fresh drawn place whose first ask is a budget line, and reads a close that does not restate the line's problem as its result; local-address-versions passes on 5c1e8a0b7d2f4e19.

**Waits on.** Nothing.

**Files.** src/director/speech-outline.ts, data/english/question-names.json

**Notes.** Found while proving the hurt-term answer, which puts a budget line first in Berwick's town address.

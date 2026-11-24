---
id: words-out-of-town-work-has-a-true-answer
title: "A person whose work is out of town can say so when asked where they work"
area: words
kind: bug
priority: 3
size: S
status: in-pr
standard: 2
claimed-by:
pr: 9826
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Words builder A, Nov 16 (the lead's review of the dead-end talks PR)
claimed-at:
checked:
---

**What.** Someone whose job is out of town for outside buyers has a job on record, so "Where do you work?" has a true answer, but the talk cannot say it: the employer has no name to say and the bank has no line that says the work is elsewhere. Seen: a person with such a job answers "Where do you work?" with a line that says where, from the job's place, instead of being skipped.

**Cause.** Found in code: `replyFacts` (src/director/conversation.ts, case "their-work") returns null when `employerWords(org)` is null (the organization has `outsideFlow`), though the job record has a title (`job.title`, read by `workDetail`) and a place (`org.placeId`, read by `workDetail` as the work-place slot); every reply piece for their-work (the `other-work` reply moves) needs the {employer} slot, so no existing line can say it without a new sentence.

**Fix.** The Words lead writes one reply piece for the other-work move that takes the work-place slot and no employer ("It's out in {work_place}."), then `replyFacts` returns the title and place facts for such a job (stage "working") instead of null, and the question is offered again for them.

**Time box.** 2 hours for one Sonnet session after the Words lead's line.

**Rules.** Wire to the world: the answer reads the job record's title and the employer's place, proven in a played town; the line is the Words lead's alone to write (owner, Nov 10).

**Done when.** A second session asks a person with an out-of-town job where they work, in a drawn place from all 56 (name the place and seed), and reads the line that says where, with the job record id cited.

**Waits on.** Nothing.

**Files.** src/director/conversation.ts, data/english/parts/conversation.json

**Notes.** Nov 16: until this lands the question is not offered to such a person (the dead-end talks PR), so nobody is left with nothing to press. Other kinds whose replyFacts has a null branch (their-position, their-tenure, their-family, their-school): the subject is built under the same condition as the null test (a sayable title, more than a year in the job, a living relative, a named school), so the null is a true nothing on record and unreachable except when the world changes inside one talk.

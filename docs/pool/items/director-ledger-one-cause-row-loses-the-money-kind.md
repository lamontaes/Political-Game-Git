---
id: director-ledger-one-cause-row-loses-the-money-kind
title: "A closure that also forms a drive is labeled for the drive, so the job's end is not found by its label"
area: director
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: rc2-done-from-records
source: Account lead thread S2 while merging the Train into PR 9122, Nov 14, 2026
checked: S2 2026-11-14
---

**What.** When an employer closes, the same cause id (`employer-closed:<date>:<organization>`) is the source of a drive the worker forms and the record that names their lost pay. The ledger keeps one row for one cause id, so the day's moment is labeled for the first kind written (`cause:drive:status-ambition`) and its money kind (`job-ended`) is dropped from the label. Seen: a staged closure at Charlotte Amalie West in the Virgin Islands left the relative with no `money:job-ended` moment, and the talk opened on the employer's closing in the news.

**Cause.** Found in code: `change()` in `src/director/ledger.ts` (near line 907) returns the existing row for a cause id and keeps its `causeKind`; the drive loop runs before the money loop, so the money kind never labels the row. PR 9122 reads the job's end from the person's own `job:<id>:status` record when the moment carries a money channel (`jobEndedWithMoment` in `src/director/conversation.ts`); every other reader of `money:job-ended` (the Journal at `journal.ts` near line 1827, the eviction telling's lost-job read) still misses it.

**Fix.** Keep the kinds a cause row was made of (a list beside `causeKind`), have the label name the strongest channel with its own kind, and have readers of `money:job-ended` read that list; then delete `jobEndedWithMoment`.

**Time box.** 2 hours, Sonnet.

**Rules.** Replace, never layer: the PR 9122 helper is deleted in the same change.

**Done when.** At three drawn places (the three pinned in `src/director/job-lost-talk-played.test.ts`) a staged closure leaves a moment whose money kind is `job-ended` and the helper is gone; the Journal's lost-job line is also seen at one of them. A second session, on main, plays a life to a closed employer and sees the lost-job telling and the Journal line.

**Waits on.** PR 9122 on the train.

**Files.** src/director/ledger.ts, src/director/conversation.ts, src/director/journal.ts

**Notes.** Found while merging PR 9122; not filed before because the drive on a closure is new on the Train.

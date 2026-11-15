---
id: words-pay-on-time-second-broken-talk
title: "Two wordings of a broken pay-on-time promise come back once a real borrower's talk says them"
area: words
lead: words
kind: feature
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: sonnet
effort: medium
root: none
source: "Account lead's ruling on #9517, Nov 15 17:33Z (composed is not played)"
checked:
---

**What.** The Words lead wrote three wordings for a housemate holding the player to a broken promise to pay on time. Only one was ever said in a real borrower's talk, so the other two were deleted from the bank: "We're behind on {payment} again. You promised me." and "You gave your word on {payment}. You missed it." Their text is kept in /mnt/project-files/words-lead/promises/pay-on-time-raises.md. Seen: when a housemate brings up a broken promise to pay on time, they always say the same line, that the player said they would pay on time and it is late again.

**Cause.** Measured: at Cherry Hill, Virginia, seed promises-real-loan-1 draw loan:2 (players born 1985-03-01 and 1970-03-01), by `npx vitest run src/director/promises.test.ts -t "pay on time"` at 3a9b8aed, each real broken talk said the one wording, and the other two were only composed on other days. The test plays each answer to the talk in its own branch and puts the world back (`talkOf`), so a renewed promise ("I'll make it right") is never kept going to a second missed payment and a second talk on another day.

**Fix.** In the pay test, after the broken talk, answer "I'll make it right" for real (the promise-talk answer, not a branch), play the borrower on to the next missed payment, and read the second talk. When a played talk says either wording, the Words lead puts it back in data/english/parts/conversation.json with its `payment` requirement, and the played file shows it said. The player hears a second, different line when they break their word twice.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: the wordings come back through the bank, worded by the Words lead, and a line ships only once a played talk says it.

**Done when.** A second session runs the pay test at its pinned drawn place and seed (Cherry Hill, Virginia, promises-real-loan-1) and reads a second broken talk, after a renewed promise, that says one of the two wordings with a payment named.

**Waits on.** Nothing.

**Files.** src/director/promises.test.ts, data/english/parts/conversation.json, tests/support/real-borrower.ts

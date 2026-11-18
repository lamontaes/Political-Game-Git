---
id: words-bill-paper-repeal-heading-and-enacting-join
title: "A bill's heading words a repeal as a repeal, and every body's enacting words join their section as one sentence"
area: words
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/project-thread-q8djlu
pr: #9212
after:
blocked-on:
lead: words
model: sonnet
effort: low
root: design-words-machine
source: Words lead replay of #9184, Nov 14 2026
claimed-at: 2026-11-14T12:20:00.000Z
checked: words-lead 2026-11-14
branch: claude/project-thread-q8djlu
---

**What.** On a bill's paper (the bill screen and the Journal read it), a bill with a repeal and another purpose had a heading that said the opposite of its section: a New York bill headed "to put a refundable deposit on drink bottles and cans" whose Section 1 repealed the deposit law. And a body's enacting words joined its section badly: Ohio read "...of the State of Ohio. That the law", the federal form "...in Congress assembled That", New York "do enact as follows That". Seen: the paper of any bill with a repeal and of any state act.

**Cause.** Found in code: src/english/bill-sections.ts `composeBill` worded a heading from each section's purpose (the purpose of the law, even when the section repeals it), and only an all-repeal bill used the repeal title; the act form's first-section line was "{enacting} That {text}." for every body, whatever punctuation the body's prescribed words (src/core2/data/legislature/enacting-clauses.json) end with.

**Fix.** A repeal section's heading phrase is the form's `repealPurpose` ("repeal the law on {subject}"), the repealed laws joined once, in place of the old `repealTitle`. A section joins its enacting words one of two ways: a lead-in ("Be it enacted by X, That the law ...") or, when the words are a whole sentence ("... do enact as follows"), a colon and the text's own capital. A test composes a bill for every body's prescribed words.

**Time box.** 2 hours, done.

**Rules.** Wire to the world: every heading and section is worded from the bill's own records, and the sourced words in enacting-clauses.json stay unchanged. One rule, all 56 places: no state is named in logic, and the test walks every body's words.

**Done when.** Seen: a second session composes bills at three drawn places and reads that a repeal's heading says repeal and every section's first line is one sentence; src/english/bill-sections.test.ts walks all 56 bodies' enacting words, the federal form and the local form.

**Waits on.** laws-bill-short-and-long-title-forms (#9184) folding into the train.

**Files.** src/english/bill-sections.ts, data/english/bill-sections.json, src/english/bill-sections.test.ts

**Notes.** Filed Nov 14 by the Account lead from the Words lead's two findings. #9178 (stages of a bill) does not touch these files.

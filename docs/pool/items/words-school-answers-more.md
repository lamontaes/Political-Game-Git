---
id: words-school-answers-more
title: "Where did you go to school has only three distinct replies in a stage"
area: words
kind: feature
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: "found by words-replies-continue (owner, Oct 15 evening, batch 11 grading)"
---

**What.** "Where did you go to school?" has only three distinct replies in a stage ("I went to X", "I graduated from X", "I graduated."). The four-replies rule gives way to three, because acknowledgments are no longer offered after a question. Add authored replies so the stage has four.

**Rules.** No hand-written player text (pieces are authored to the calibrated patterns); a reply moves the talk somewhere; no dice.

**Done when.** In a drawn place, the school question offers four different replies in each stage (graduated, enrolled).

**Files.** data/english/parts/conversation.json

**Notes.** See src/director/conversation.test.ts: the check accepts fewer than four only for a question.

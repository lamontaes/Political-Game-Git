---
id: words-closing-reason-lines-retiring-and-no-successor-unreached
title: "Two closing reason lines have no played closing to print them: retiring and no successor"
area: words
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: Nov 16 desk-size PR (play-local-layoffs-on-screen), Words lead's lines
lead: words
milestone:
after:
model: sonnet
effort: medium
root: words-bank-no-unplayed-lines
checked: sonnet 2026-11-16
---

**What.** The Words lead wrote four reason lines for a business closing: "Its owner, {owner}, is retiring.", "{owner} found nobody to take the business over.", "The business had been losing money." and "The business ran out of money." Two printed in played papers (losing money at Thief River Falls MN and Center ND; ran out of money at Danville PA, seed ilt-danville). The other two (retiring and no successor) never printed in any place the builder played, so they were left out of the banks rather than ship unplayed.

**Cause.** Cause: no closing in the pinned places played (Thief River Falls MN seed ind-2764570, Center ND seed ind-3813180, Danville PA seed ilt-danville) had the recorded reason `owner-retiring` or `no-successor` (`closingWhy` in src/bench/printed-words.ts reads the books' `closingReasonKey`); the existing closing-account lines for those reasons cover the story where an owner and years are on the record.

**Fix.** Find a played closing whose books record `owner-retiring` or `no-successor` (a script outside the test, capped at one hour), add the two lines back from `/mnt/project-files/words-lead/one-paper/closing-layoff-size-lines.md`, and show each printed in a played file at the final sha. If the hour finds no such closing in a played year, report that the reasons never occur and leave the lines out.

**Time box.** 1 hour for one Sonnet session.

**Rules.** No new line ships unplayed (words-engine); a line shown printed in a paper the player opened, or it stays out.

**Done when.** A played file at the final head shows both lines printed, each at a named place and seed; or a note names the hour's hunt and that no played closing recorded either reason.

**Files.** data/english/parts/news.json, src/bench/printed-words.ts

**You will see.** A closing that was a retirement or had no one to take it over says so in the paper.

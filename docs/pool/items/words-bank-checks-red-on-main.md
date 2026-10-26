---
id: words-bank-checks-red-on-main
title: "Six English bank checks fail on main: journal duplicate line, notices and newspaper-ledes data shape and era"
area: words
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/words-bank-checks-red-on-main
pr: #4472
blocked-on:
source: found by a Claude session while changing the bank gates (words-authored-pieces-gate)
claimed-at: 2026-10-15T22:03:23.508Z
---

**What.** `tests/english-parts-banks.test.ts` and `tests/english-era-register.test.ts` fail six checks on main, all in the bank data: `journal.json` carries the line "I ran for {office}." twice; `notices.json` names its register "notice" (the check wants the file name's register) and `notice.election.notice-of-election` has no source date; `newspaper-ledes.json` keys do not follow the `register.move.` shape and its six pieces come from 1902 to 1947 records, which the era check (2015 on) refuses. Under the text rule (Oct 15) such pieces are rewritten as authored parts (`origin: authored`, author, date) or re-mined, a Words decision.

**Rules.** The text rule: pieces are authored to the calibrated patterns, copying no one's copyrighted text; no gate is weakened to pass.

**Done when.** Both test files pass with the data fixed.

**Files.** data/english/parts/journal.json, notices.json, newspaper-ledes.json.

**Notes.** Same six failures on clean main (checked Oct 15). The gate change in words-authored-pieces-gate does not touch them.

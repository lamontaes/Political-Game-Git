---
id: director-two-bills-share-one-short-name-in-a-session
title: "Two bills in one session are both called the Budget Ordinance in talk"
area: director
kind: bug
priority: 3
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
root: none
source: filed by hand by the meetings and floor builder from the second words reader's read, Nov 14 2026
checked: meetings and floor builder 2026-11-14
---

**What.** At Klamath Falls, Oregon (seed meet-a1:2) two different bills, Ordinance 2025-1 (welfare and Medicaid) and 2025-5 (housing and community development), are both called "the Budget Ordinance" when a speaker says the bill's name, so a player cannot tell which one is meant. Seen: the floor debate scenes at that place name two different bills the same way.

**Cause.** Found in code: `billNameOf` in src/english/bill-names.ts returns `${book.budget.name} ${form}` for any bill whose sections are all spending lines, with no mention of which lines; two budget bills in one body get the same name.

**Fix.** Where two open bills in the same body would share a short name, say the second by what it spends on (its largest line's name from src/core2/data/budgets/line-names.json), in the same function, so every reader of billNameOf gets it.

**Time box.** 4 hours.

**Rules.** One name function; no new stopgaps; no figures or counts in any line; plain American English.

**Done when.** A second session seats a member at Klamath Falls, Oregon (meet-a1:2), plays both budget bills' floor debates, and each speaker names a different bill. Names place and seed.

**Waits on.** Nothing.

**Files.** src/english/bill-names.ts, src/english/bill-names.test.ts

**Notes.** Seen: second words reader's read of #9194, Nov 14.

---
id: words-paper-two-town-halls-same-day-same-turnout
title: "Two town halls on the same day both print '40 turn out'"
area: words
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: words
model: sonnet
effort: low
root: none
source: second words reader, read of PR #9139 screens (Nov 14)
checked: m3 2026-11-14
---

**What.** The second words reader saw two town-hall stories dated the same day, both saying 40 people turned out (Providence, bench seed p2, March 1, 2025). Either the turnout is one figure shared by two meetings or the story reads the wrong record. Seen: News, the town-hall stories.

**Cause.** Needs cause. Looked at: the town-hall builder in src/bench/printed-words.ts and the press town-hall kind in src/core2/modules/press.ts; not yet reproduced beyond the one screen.

**Fix.** None until the cause is found.

**Time box.** 2 hours.

**Rules.** No dice. Lines are the Words lead's; American English.

**Done when.** In a drawn place with two town halls on one day, a second session reads two different turnouts that match the meetings' own records.

**Waits on.** Nothing.

**Files.** src/bench/printed-words.ts,src/core2/modules/press.ts

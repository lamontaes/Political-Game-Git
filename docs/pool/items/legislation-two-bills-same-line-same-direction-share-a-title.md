---
id: legislation-two-bills-same-line-same-direction-share-a-title
title: "Two one-line spending bills in one body for the same line and direction print the same title"
area: words
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after: legislation-budget-line-bills-all-titled-budget-ordinance
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: "The second words reader's note on #9333, Nov 14, 2026 (Klamath Falls OR, 2025-5 and 2025-6)"
checked:
claimed-at:
---

**What.** At Klamath Falls OR (draw meet-a1:2) two bills, 2025-5 and 2025-6, both raise the police line and both print "Police Funding Increase Ordinance". The numbers differ, but a floor agenda, a news story or a debate scene naming "the Police Funding Increase Ordinance" cannot say which. Whether they sit in one body or two was not read for each row (the numbers that repeat across the list are the two bodies' own numbering). Seen: the meeting agenda, the news and a floor-debate scene naming the bill.

**Cause.** Needs cause. The title comes from the line and direction alone (`billNameFor("budget:<line>")`); whether two bills that read alike should be told apart by the sponsor, by the amount or by a later one reading as an amendment is a wording call for the Words lead, and the same question applies to every authored policy name.

**Fix.** None until the cause is found.

**Time box.** Cause found in 1 hour, then the item is rewritten.

**Rules.** No hand-written player text in code. One rule, all 56 places.

**Done when.** A second session plays a drawn place (named in the PR body) to a floor with two bills on one line and direction and sees each named so it can be told from the other on the agenda and in the news, with no number or id shown to the player.

**Waits on.** Nothing.

**Files.** src/english/bill-names.ts

**Notes.** Found while checking #9333.

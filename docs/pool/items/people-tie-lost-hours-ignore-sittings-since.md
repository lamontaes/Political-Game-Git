---
id: people-tie-lost-hours-ignore-sittings-since
title: "Colleagues who sat together yesterday miss each other as if they had not met since their last talk"
area: people
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by: claude/project-thread-csmftn-lost
pr: #9547
after:
blocked-on:
lead: people
model: opus
effort: medium
root: none
source: Found by the lying thread, Nov 15 2026, building legislature-colleague-ties-stay-slight (the Account lead split it into its own pull request)
merged-at: 2026-11-16T20:02:17.996Z
---

**What.** A person's free company goes to the ties that have lost the most hours since the two were last together (`tiePull` in src/core2/modules/people.ts). For two colleagues with a tie row, the row's lost hours run from the row's last contact, even when the two sat in the same chamber or committee the day before. So a colleague whose row is a month old pulls as if unseen for a month, and a colleague known only through the sittings pulls as if seen at the last sitting. Whoever has a row (the player, in practice) draws the company. Seen: in a played Texas senate, once committees and caucuses are read for every member, all three pieces of company senators kept with each other in two weeks went to the player.

**Cause.** Found in code: `tieHoursLost` in src/core2/closeness.ts takes the row's `hoursLost` from its `lastContactDate`, and each reader's lost hours from that reader's own last day together, so the two parts measure "since" from different days.

**Fix.** One "last together" for the tie: the latest of the row's last contact and every reader's last day together. The row's hours and each reader's hours are both counted as lost from that day. No new number.

**Time box.** 2 hours, one Opus session at medium effort.

**Rules.** Wire to the world: the pull feeds the free-time chooser every person uses. One rule, all places.

**Done when.** At the named place 4846968 seed 8647-mason (Texas senate, player at seat 016), a colleague with a tie row who sat with the player at the last sitting reads lost hours from that sitting, not from the row's last contact (pinned test, seen red on the parent); a played year at three places runs within the speed bar; a second session sees it in dev mode on main.

**Waits on.** Nothing.

**Files.** src/core2/closeness.ts

---
id: legislature-members-have-no-tie-to-each-other
title: "Members of a council, board, state chamber or Congress know each other from the sittings they share"
area: people
kind: bug
priority: 2
size: M
status: merged
standard: 2
claimed-by: claude/project-thread-csmftn-ties
pr: #9484
after:
blocked-on:
lead: people
model: opus
effort: medium
root: none
source: Account lead, Nov 15, from the lying PR's counts (people can lie to the player)
merged-at: 2026-11-15T21:59:45.290Z
---

**What.** People who sit on one body for years do not know each other. At 4846968 seed 8647-mason, five council members who have sat together since 2011 to 2025 had a tie in only 2 of their 10 pairs; across 6 drawn state chambers, 329 of 336 member pairs had closeness 0. So anything that reads closeness between colleagues (a vote ask, a favor, a refusal's strain, a broken word) reads zero. Seen: in dev mode, two members of the player's council who have served together for years show a tie, and it grows with each meeting.

**Cause.** Found in code: nothing credits a sitting as time together. `colleagues()` in src/core2/modules/officials.ts tied a chamber's members only to their party's leader, at a flat 6 hours per shared year written once, and only for state and federal officials whose both ends were full people; town bodies got nothing; the legislature writes 0.05 hours only on a sign-on or an ask.

**Fix.** A reader of the shared-time mechanism for sittings (src/core2/sitting-closeness.ts), read when someone asks how close two people are, never written: `closenessBetween` adds the hours two members of a body have shared, summed over the body's own calendar (each town meeting, each legislature's floor days) since both sat, each sitting's hours times `sittingContactShare` (TUNABLE) split over `knownAmong` the body's size, faded as closeness fades. In a body of hundreds each member knows the colleagues whose service began nearest their own. Day one and a member filled in later read the same as any later day. The flat leader tie in `colleagues()` is deleted.

**Time box.** 4 hours, one Opus session at medium effort.

**Rules.** No dice; no flat number; one mechanism (shared-time); day one in motion.

**Done when.** On day one, members of a town council and of a state chamber at a named place and seed have ties from their shared sittings, the ties grow over a played year, and a year's time stays within the same-side spread at three places; a second session sees it in dev mode on main.

**Waits on.** Nothing.

**Files.** src/core2/sitting-closeness.ts, src/core2/modules/world-legislating.ts, src/core2/modules/officials.ts, src/core2/data/parameters.json

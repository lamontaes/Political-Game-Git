---
id: office-meetings-switch-has-no-short-word-for-two-committee-bodies
title: "The meetings switch reads plain Meetings for two bodies named by initials (FGO, LUPZ)"
area: play
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after: office-stops-control-the-player-cannot-switch-a-stop-off
blocked-on:
lead: play-first
model: sonnet
effort: medium
root: none
source: "Account lead T56, Nov 14, 2026, from the Words lead's rule to file a missing short word (#9126)"
checked:
claimed-at:
---

**What.** Your office's meetings switch names the body's short word ("Council meetings", "Board meetings"). Two bodies in the data have names with no word in the rules and read plain "Meetings": "Finance and Government Operations (FGO)" and "Land Use, Planning & Zoning (LUPZ)", committees of an assembly. Seen: Politics, then Your office, for a member of either body.

**Cause.** Found in code: `bodyWord` in src/bench/office.ts reads the rules under `officeStops.bodySwitches` in src/bench/data/controls.json; neither name contains a word a rule matches.

**Fix.** Design: a rule for each, worded by the Words lead ("Committee meetings" needs the name to carry the word "committee", which these do not), or the committee's kind read instead of its name.

**Time box.** 1 hour for one Sonnet session at medium effort.

**Rules.** No hand-written player text in code; labels in controls.json with the Words lead's read.

**Done when.** A second session plays a member of one of these bodies in a drawn place, on main, opens Your office, and the meetings switch reads the body's short word, not plain "Meetings".

**Waits on.** office-stops-control-the-player-cannot-switch-a-stop-off reaching the train.

**Files.** src/bench/data/controls.json, src/bench/office.ts

**Notes.**

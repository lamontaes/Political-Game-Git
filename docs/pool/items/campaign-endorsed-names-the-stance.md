---
id: campaign-endorsed-names-the-stance
title: "A group's endorsement says what the group stands for, from the stance it endorsed on"
area: elections
kind: wiring
priority: 2
size: S
status: claimed
claimed-by: governing/endorsed-names-stance
pr:
blocked-on:
source: Words session, Oct 30 (after #6938)
lead: governing
claimed-at: 2026-10-30T08:55:25.641Z
---

**What.** A cause group or a group formed over one policy keeps no name, so the paper can only say that a local group endorsed a candidate, never what it stands for. A cause group's direction lives on its founder's drive, which changes, so after the fact the paper cannot tell whether the group was for or against. The campaign-endorsed event should carry the stance the group endorsed on, the question and position from organizedGroupsIn's stance at the moment it weighed the race, so the Words session can word it.

**Rules.** An effect is a read: the stance is written on the endorsement record and its event, and the paper (the Words session's) reads it. One engine: groupsWeighRace's own weighing picks the stance, no second reader of the group. No hand-written player text: the engine keeps the question and position, the English engine words them.

**Done when.** src/core2/campaign-group-endorsements.test.ts, in its drawn place with the seed printed, finds every group endorsement's campaign-endorsed event carrying stanceQuestion and stancePosition equal to the group's stance on the platform question it agrees with the candidate on most, by endorsement id, and a person's own endorsement carries none.

**Files.** src/core2/modules/campaigns.ts, src/core2/campaign-group-endorsements.test.ts

**Notes.** TODO

---
id: standin-group-backing-follows-member-vote
title: "An interest group's endorsement and gifts follow how a member voted against it"
area: gov
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
source: stand-in triage Nov 10
lead: laws
standard: 2
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** A group's lobbyist who remembers how the player voted against the group's meeting says so in a scene, and the player's answer is kept as a promise or a strained tie. But the group's endorsement, gifts and any primary challenge do not move from it: nothing reads the member's vote against the group's side, or the kept tie, when the group decides whom to back. Stand-in SG-WORDS-lobby-remembers-writeback. Seen: in the group's endorsement and gifts a member sees after a vote.

**Cause.** Found in code: src/director/circumstance.ts line 525 (marker, source `lobbied-against`) finds the lobbyists whose meeting side the member's vote went against, using meetingsOn (src/core2/modules/interest-groups.ts line 1001). The group's own decision, weighEndorsement in src/core2/modules/campaigns.ts (line 4838), weighs a candidate's platform stance and does not read the member's votes against the group's meetings.

**Fix.** In weighEndorsement, add one read: for each meeting of the group (meetingsOn for the bills it lobbied) where the candidate was the member, a vote on the side the group opposed lowers the group's weighing and a vote on its side raises it, scaled by a parameter in the campaigns parameter table tagged TUNABLE with a spread, and the decision's recorded reasons cite the meeting and vote record ids. The scene's lobbyist then cites that decision. Clear the stopgap.

**Time box.** 6 hours for one Opus session. It stays cheap because the read happens when an endorsement is weighed (campaign season), over the group's meetings on file, not daily.

**Rules.** An effect is a read, not a record: the endorsement must change because of the vote, shown in the decision's reasons. No dice: the votes and the group's stance decide. Sliding scale: no flip at a vote count. One rule, all 56 places.

**Done when.** A second session plays buildBenchWorld in a drawn place (place and seed named) where a member voted against a group's meeting side and sees the same group's endorsement decision for that member list the vote and meeting by record id, and compares it with the same world where the vote went the group's way.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts, src/core2/modules/interest-groups.ts, src/director/circumstance.ts, src/director/data/stopgaps.json

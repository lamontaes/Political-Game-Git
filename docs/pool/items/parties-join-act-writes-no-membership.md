---
id: parties-join-act-writes-no-membership
title: "Joining a party as an act writes the party tie but not the party's membership, so officials who file under a label are not its members"
area: gov
lead: laws-effects
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/party-join-membership
pr: #6272
blocked-on:
source: laws-and-effects lead, Oct 27 (CI on #5657)
claimed-at: 2026-10-27T09:03:30.408Z
---

**What.** joinParty in src/core2/modules/parties.ts (about line 425) writes a tie row whose reason starts 'joined', but it never adds the person to the party's organization, as the parties.join weighing does through api.join. An official or candidate who files under a label goes through it, so the party's records disagree: the tie says joined and the membership table does not. In Ambrose, North Dakota (seed 49dd8d7d2a283af3d5a18e0906dd54d5f3f4289f:parties:1, played February 4 to June 4, 2026) five Democratic officials and a candidate were tied this way on April 6, 2026 with no membership. Anything that reads membership, such as party meetings or a party's member count, misses them.

**Rules.** One record, one truth: membership is read from one place. Replace, never layer: if the tie becomes the membership, the second record goes. Wire to the world: show a reader (party meetings or the party's members) seeing the joined official.

**Done when.** In a played world (buildBenchWorld, a place drawn from all 56 with a seed the builder did not choose, named in the PR body), a person who joins a party through joinParty, and an official who files under its label, appears in that party's membership, a party meeting or another reader of membership counts them by record id, and the parties tests pass.

**Time box.** 2 hours, one Sonnet builder; waits on nothing.

**Files.** src/core2/modules/parties.ts, src/core2/modules/elections.ts, src/core2/modules/parties.test.ts

**Notes.** Filed by the laws-and-effects lead, Oct 27, from CI's red parties trait test on PR #5657 (job 121939108576); the test now counts only ties the engine weighed.

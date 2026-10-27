---
id: traits-civic-shared-rule
title: "Believing a story, party meetings, joining a group and passing on news weigh personality at researched sizes; every other civic decision names why not"
area: people
kind: wiring
priority: 1
size: M
status: done
claimed-by: claude/traits-civic
pr: #5657
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T04:06:55.828Z
---

**What.** The bounded part of traits-wire-civic that its open PR delivers. Believing a story (conversation.believe-claim), going to party meetings (parties.attend), joining an interest group (interest-groups.member-join) and passing on news (news.pass-on) read their case through the shared two-way rule and weigh temperament at the size their studies give: a hearer weighs the teller's closeness and the claim's fit, a member weighs work hours and distance, a resident weighs a friend already in the group. Every other decision in the civic family runs in a played election-window year, and where its rate is not yet at its study's size its gap row names the cause and the numbers.

**Rules.** No dice: a trait weighs one reason among the person's recorded reasons and never rolls an outcome. One model, two tiers: counted people decide through the same shared formula. Wire to the world: shown in played years by record id. src/director is not edited; the player's own claims stay with the Words line.

**Done when.** scripts/traits/trait-wiring-audit.ts (played, flat and mirror twins) and scripts/traits/trait-wiring-matrix.ts on one election-window year of buildBenchWorld (TRAIT_AUDIT_ELECTION=1) in each of two places drawn from all 56, seeds named, show conversation.believe-claim, parties.attend, interest-groups.member-join and news.pass-on with calls above zero in both years and top-third against bottom-third net odds within a factor of 1.5 of their cited research targets in both; every other civic decision runs in at least one of the two years and has a gap row in data/content/trait-decision-gaps.json naming the cause, the numbers and the open pool item that fixes it (traits-wire-civic where no other item does); src/director is unchanged from main; and the family test names the decision record ids of two people who chose differently for their traits.

**Files.** src/core2/heard-claims.ts, src/core2/modules/news.ts, src/core2/modules/parties.ts, src/core2/modules/interest-groups.ts, data/content/trait-decision-gaps.json

**Notes.** Split Oct 25 by the traits lead from traits-wire-civic after Merger 1's second send-back of PR 5657 (branch claude/traits-civic), which allows routing a completed bounded slice while the family stays open. Left on traits-wire-civic: the ballot-measure vote in both years, and backing the incumbent, telling an exit pollster, holding a town hall, joining a party, a lobbyist speaking up, accepting an interview and taking part at a meeting at their research rates. The director's reader of the player's claims moves through words-director-claims-shared-rule.

Sent back 2026-10-25 from PR #5657 (branch claude/traits-civic): prior bounded-acceptance/director fixes acknowledged; current main integration conflicts in production src/core2/modules/voting.ts; preserve both voting/traits readers and rerun bounded gate; finish on that branch, merge main into it first.

Sent back 2026-10-25 ~22:25 UTC from PR #5657 (branch claude/traits-civic, head e7ce5944ef with main merged in clean): eslint fails on src/core2/modules/voting.ts:63, unused `parameter` import left by the PR's own edit; remove that line and it goes back in the queue; finish on that branch, merge main into it first.

Sent back 2026-10-26 from PR #5657 (branch claude/traits-civic): final Done-when row requires both actual decision record IDs, but civic-traits-played.traits.test.ts:62-81 only prints probe actor/date/lean data and optional yes membership, without asserting or naming retained yes/no decision records; add generated-world durable-record lookups and matching evidence; finish on that branch, merge main into it first.

Sent back 2026-10-26 from PR #5657 (branch claude/traits-civic): prior retained yes/no decision-record proof is fixed and current integration clean, but voting.traits.test.ts:166-173 skips all answer assertions for near-zero leans with only polled.length>0, so an all-neutral sample can pass untested; use tolerant per-voter assertions or a positive nonneutral witness with explicit neutral handling, then finish on that branch and merge main first; no new completed gate claimed.

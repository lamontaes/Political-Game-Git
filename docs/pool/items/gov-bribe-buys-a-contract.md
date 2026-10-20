---
id: gov-bribe-buys-a-contract
title: "A bribe can buy a public contract award, not only a vote"
area: gov
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr: #5337
after: gov-public-contract-awards
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Let a bribe (src/core2/modules/corruption.ts) buy a public contract award as well as a vote. The game has no public contract-award decision today: core2 has public customers in finance (finance-plan.ts, opening-customers.ts) but no body or official that awards a contract between bidders, so there is nothing for a bribe to change. The award decision must exist before corruption can change its outcome.

**Rules.** This is a game, not a spreadsheet: a mechanic exists only when the golden path needs it, The Political Process has it, or the owner asked for it by name; an effect is a read, not a record; no dice.

**Done when.** The owner ruled on Oct 19 that public contract awards exist, so gov-public-contract-awards comes first. Then: in a drawn place's played year, an official awards a contract to a bidder partly because of a taken bribe, by record id, and the contract payment moves from the treasury to the bidder's business account; the test is a played-world run in a random place.

**Files.** src/core2/modules/corruption.ts, the finance engine's public-customer path, and the engine that would hold the award decision.

**Notes.** Owner ruling, Oct 19, 2026: yes, the game awards public contracts; unblocked. Looked at 2026-10-16: not built, because building it means adding a procurement mechanic nobody has asked for. OWNER DECISION NEEDED: should public contract awards exist (a council or executive choosing between bidders), or is a bribe for a vote the only corruption the game needs for early access? Checked DECISION-REGISTER.md and OWNER-DECISIONS.md: no ruling on contract awards.

Sent back 2026-10-20 from PR #5337 (branch claude/political-game-pool-yucp92-k): see the Cloud merger comment on that PR for the exact reason; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5337 (branch claude/political-game-pool-yucp92-k): src/core2/contracts-bribe.test.ts succeeds as soon as any bribe is taken, even if every boughtVotes check is false and no award is affected; withoutBribes is only checked inside if (award.withoutBribes). It never asserts the required treasury-to-winning-bidder contract payment. The pool Done when needs an awarded contract partly due to a taken bribe and that payment by record id. Require a positive witnessed award/bribe/vote chain and its actual journal payment, and name the drawn place and full seed in the body.; finish on that branch, merge main into it first.

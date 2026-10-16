---
id: laws-party-loyalty
title: "Party loyalty in state chambers"
area: elections
kind: owner-decision
priority: 2
status: in-pr
claimed-by: claude/laws-party-loyalty
pr: #4542
blocked-on:
milestone:
source: "overnight pool item 12; reissue closed note"
claimed-at: 2026-10-16T11:06:23.878Z
---

**What.** Party loyalty in state chambers. This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: npm run typecheck fails on this branch: src/core2/modules/officials.ts(1088,50) error TS2345: Argument of type '"statePartyLoyalty"' is not assignable to parameter of type '"press" | "ambition" | "party" | "district" | "caucus" | "views" | "stateStake" | "wing" | "independentReason" | "executiveParty"'. Add statePartyLoyalty to the weight key type next to the others, rerun typecheck and the party-loyalty test, and correct the 'typecheck-free change set' line in the PR body. Finish it on the existing branch claude/laws-party-loyalty, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/laws-party-loyalty.md and the files that pull request #4542 changes on claude/laws-party-loyalty

**Notes.** Owner ruling (Oct 15): Shor-McCarty may calibrate the state-chamber party-loyalty parameter; nothing ships, no citation; one calibration input weighted against roll calls.

Sent back 2026-10-16 from PR #4542 (branch claude/laws-party-loyalty): npm run typecheck fails on this branch: src/core2/modules/officials.ts(1088,50) error TS2345: Argument of type '"statePartyLoyalty"' is not assignable to parameter of type '"press" | "ambition" | "party" | "district" | "caucus" | "views" | "stateStake" | "wing" | "independentReason" | "executiveParty"'. Add statePartyLoyalty to the weight key type next to the others, rerun typecheck and the party-loyalty test, and correct the 'typecheck-free change set' line in the PR body; finish on that branch, merge main into it first.

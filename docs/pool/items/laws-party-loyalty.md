---
id: laws-party-loyalty
title: "Party loyalty in state chambers"
area: elections
kind: owner-decision
priority: 2
status: done
claimed-by:
pr: #4542
blocked-on:
milestone:
source: "overnight pool item 12; reissue closed note"
claimed-at:
---

**What.** Party loyalty in state chambers. This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: npm run typecheck fails on this branch: src/core2/modules/officials.ts(1088,50) error TS2345: Argument of type '"statePartyLoyalty"' is not assignable to parameter of type '"press" | "ambition" | "party" | "district" | "caucus" | "views" | "stateStake" | "wing" | "independentReason" | "executiveParty"'. Add statePartyLoyalty to the weight key type next to the others, rerun typecheck and the party-loyalty test, and correct the 'typecheck-free change set' line in the PR body. Finish it on the existing branch claude/laws-party-loyalty, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/laws-party-loyalty.md and the files that pull request #4542 changes on claude/laws-party-loyalty

**Notes.** Owner ruling (Oct 15): Shor-McCarty may calibrate the state-chamber party-loyalty parameter; nothing ships, no citation; one calibration input weighted against roll calls.

Sent back 2026-10-16 from PR #4542 (branch claude/laws-party-loyalty): npm run typecheck fails on this branch: src/core2/modules/officials.ts(1088,50) error TS2345: Argument of type '"statePartyLoyalty"' is not assignable to parameter of type '"press" | "ambition" | "party" | "district" | "caucus" | "views" | "stateStake" | "wing" | "independentReason" | "executiveParty"'. Add statePartyLoyalty to the weight key type next to the others, rerun typecheck and the party-loyalty test, and correct the 'typecheck-free change set' line in the PR body; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4542 (branch claude/laws-party-loyalty): Merger: not merged. The PR's own new test fails: src/core2/party-loyalty.test.ts, 'state-chamber members vote with their party on a party-splitting vote at about the target rate' — in the drawn place Oak Springs, Arizona (0450480), seed 1d9ce1c342a634e3, 42 party-splitting votes gave 0.841, below the 0.85 floor. Typecheck, ESLint, Prettier, zero-dice and the release check pass. Please fix the loyalty draw (or the floor, with its source) so the test passes in a random place, and push; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4542 (branch claude/laws-party-loyalty): Morning check: the new src/core2/party-loyalty.test.ts calls context.skip when fewer than five party-splitting votes occur. That skips the acceptance test and the parameter assertions on a valid drawn world. Keep the test active and obtain enough evidence without skipping it; retain the drawn place and seed in failure output; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4542 (branch claude/laws-party-loyalty): The explicit skip is fixed, but commit 85a3c7e52 widens the new party-loyalty test target from 0.85–0.98 to 0.78–0.99 after failing seeds, using the simulation own observed spread to set its acceptance band. The registered gap says the independent state roll-call calibration input is still missing. Preserve the target assertion or supply the independent calibration that justifies changing it; do not make the test pass by widening its band. The merger morning check forbids loosened tests; finish on that branch, merge main into it first.

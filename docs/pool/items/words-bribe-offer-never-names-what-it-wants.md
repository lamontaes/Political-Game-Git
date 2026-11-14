---
id: words-bribe-offer-never-names-what-it-wants
title: "A bribe offer never says which contract or bill the money is for"
area: words
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: Account lead, thread "Write the mayor's and governor's desk"
pr: 9185
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: "Words lead's scene-path gaps by owner, Nov 14, 2026 (/mnt/project-files/words-lead/words-machine/scene-path-gaps-by-owner.md, Bribes: 159 paths)"
checked:
claimed-at: 2026-11-14
---

**What.** On 159 bribe scene paths (bribe-offer and bribe-pressed, every variant) the person offering money says only "this", "the contract" or "it goes my way"; the player's refusals answer a favor nobody named. Words lead: "the person offering does not spell out the money or the deal, but the path must name what they want." Seen: a bribe-offer scene's opening ask, "There's real money in this envelope. All I need is for the contract to come to me." (Yigo, Guam, draw bribe-wanted:0).

**Cause.** Found in code: src/core2/modules/corruption.ts writes `favor` and, for a vote, `billId` on the offered, refused and pressed records, but for a contract only the kind; the award's subject (`contract:<government>:<line>:<date>`, contracts.ts) is dropped. src/director/purpose-scene.ts reads `favor` into `favor-vote`/`favor-contract` and nothing names the contract.

**Fix.** Design: the three records carry what the offer wants (`contractId` and `contractLine` for a contract, `billId` for a vote); the scene reads it as `contract` ("the highways contract", by the line it pays from) and as `wanted` (the bill or the contract), declared slots of the scene bank. Part 1 (this item's first PR) is the read; the lines that say it come from the desk thread (contract side) and the bargaining thread (vote side), each with the Words lead's ruling.

**Time box.** 2 hours for one Sonnet session at medium effort, then the lines.

**Rules.** No hand-written player text in code; the thing wanted is named first and the money second or when asked, never both in one sentence (Words lead, Nov 14).

**Done when.** A second session, on main, in a drawn place, gets a contract bribe offered to the player's seat and the offerer names the contract by the work it pays for; and a vote bribe whose offerer names the bill.

**Waits on.** Nothing.

**Files.** src/core2/modules/corruption.ts, src/director/purpose-scene.ts, data/english/parts/scene-talk.json

**Notes.**

- Nov 14, 2026, Account lead (desk thread): part 1, the read, on branch claude/project-thread-hkqdh2-bribe-wanted; played at Yigo, Guam (draw bribe-wanted:0): the offer record carries `contractLine: highways`, the scene's `contract` and `wanted` say "the highways contract".

---
id: director-public-employer-is-said
title: "A public employer that owns its government's pay authority is said by name: a post office's workers have an employer in every scene"
area: director
kind: bug
priority: 1
size: S
status: dropped
standard: 2
claimed-by: claude/pt-board-public-employer
pr: #10524
blocked-on:
source: Board mock's trace of #10519 (layoff terms), #10377 comments 7142299019 and 7142310689; the Coordinator routed it to its own PR
claimed-at: 2026-11-24T19:50:00.000Z
after:
lead: play-first
model: opus
effort: high
root: none
merged-at: 2026-11-24T23:04:20.426Z
---

**What.** A worker at a public employer that owns its government's outside pay authority (seen: the Quemado Post Office, Quemado, New Mexico) has no employer in any scene: the layoff, first day and every other packet that says an employer drop the employer, the workplace and the position, and the layoff skips with "no narration for layoff-terms can be worded from the records given". Only the outside market (work out of town) should stay unsaid. Seen: in the talk that opens when such a worker is laid off, and in every other scene about their work, the employer is named, for example "the County of Oakland".

**Cause.** Found in code: `employerWords` (src/director/words.ts) passes `outside: !!org.outsideFlow`, and `employerSaidAs` (src/english/said-as.ts) returns null for an outside employer. The outside market carries `outsideFlow`, but so does the public employer that owns its government's outside pay authority (src/core2/opening-public-pay.ts gives the owner a zero-stock outside flow), so the director took it for work out of town. `jobAndEmployer` (src/director/home-work-facts.ts) then returns null and every work fact drops.

**Fix.** One rule for the whole director, `isOutsideMarket(org)` in src/director/words.ts: the market is known by its kind, as the core reads it (moves.ts, residents.ts, counted-demotion.ts), with `OUTSIDE_MARKET_KIND` re-exported from the Jobs family's entry (src/core2/modules/jobs.ts), since src/core2/opening-outside-market.ts is in no family's entry. Every director read of `outsideFlow` as the market goes through it: `employerWords` (words.ts), a scene's setting (scene.ts), a work reason for a view (view-learned.ts), a layoff named in a speech (speech-outline.ts) and another workplace to talk about (conversation.ts).

**Time box.** 1.5 hours.

**Rules.** One rule, all 56 places (every pay-authority owner, not one town). Review: words (src/director/words.ts is the Words session's reader).

**Done when.** A second session, in a drawn place whose opening has a worker at a public pay-authority owner, sees that worker's employer said by name in a work scene (dev mode's layoff for that worker), and `src/director/public-employer-said.test.ts` passes.

**Waits on.** The Jobs session's yes to the re-export and the Words session's review (asked on #10377, 7142310689).

**Files.** src/director/words.ts, src/director/scene.ts, src/director/view-learned.ts, src/director/speech-outline.ts, src/director/conversation.ts, src/core2/modules/jobs.ts, src/director/public-employer-said.test.ts (new)

**Notes.** Filed by Board mock (lane 8), Nov 24. The Coordinator asked for all five director reads through one helper (19:35Z). The bench reads `outsideFlow` the same way and is left for the Screens session: src/bench/card.ts (95, 124, 1250, 1816), src/bench/printed-words.ts (3391, 3504), src/bench/campaign.ts (382) and src/bench/dev-views/dev-closing.ts (108, 335).

Dropped (Board mock, 2026-11-25, on the CTO's order 7149991369 on #10377): ruled out by the owner on Nov 24: "remove all the dialogue shit for these jobs. Like, literally, they just need to happen in the background so your character can get money." Jobs happen in the background; the scene is deleted in claude/pt-board-remove-job-scenes. Only its scene use goes: `employerWords` naming a public employer stays, for records the Journal and the person card tell.

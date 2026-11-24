---
id: director-public-employer-is-said
title: "A public employer that owns its government's pay authority is said by name: a post office's workers have an employer in every scene"
area: director
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/pt-board-public-employer
pr:
blocked-on:
source: Board mock's trace of #10519 (layoff terms), #10377 comments 7142299019 and 7142310689; the Coordinator routed it to its own PR
claimed-at: 2026-11-24T19:50:00.000Z
after:
lead: play-first
model: opus
effort: high
root: none
---

**What.** A worker at a public employer that owns its government's outside pay authority (seen: the Quemado Post Office, Quemado, New Mexico) has no employer in any scene: the layoff, first day and every other packet that says an employer drop the employer, the workplace and the position, and the layoff skips with "no narration for layoff-terms can be worded from the records given". Seen after: that employer is said by its name; only the outside market (work out of town) stays unsaid.

**Cause.** Found in code: `employerWords` (src/director/words.ts) passes `outside: !!org.outsideFlow`, and `employerSaidAs` (src/english/said-as.ts) returns null for an outside employer. The outside market carries `outsideFlow`, but so does the public employer that owns its government's outside pay authority (src/core2/opening-public-pay.ts gives the owner a zero-stock outside flow), so the director took it for work out of town. `jobAndEmployer` (src/director/home-work-facts.ts) then returns null and every work fact drops.

**Fix.** The director knows the market by its kind, as the core does (moves.ts, residents.ts, counted-demotion.ts): `outside: org.kind === OUTSIDE_MARKET_KIND`, with the constant re-exported from the Jobs family's entry (src/core2/modules/jobs.ts), since src/core2/opening-outside-market.ts is in no family's entry.

**Time box.** 1.5 hours.

**Rules.** One rule, all 56 places (every pay-authority owner, not one town). Review: words (src/director/words.ts is the Words session's reader).

**Done when.** A second session, in a drawn place whose opening has a worker at a public pay-authority owner, sees that worker's employer said by name in a work scene (dev mode's layoff for that worker), and `src/director/public-employer-said.test.ts` passes.

**Waits on.** The Jobs session's yes to the re-export and the Words session's review (asked on #10377, 7142310689).

**Files.** src/director/words.ts, src/core2/modules/jobs.ts, src/director/public-employer-said.test.ts (new)

**Notes.** Filed by Board mock (lane 8), Nov 24. The same `outsideFlow`-as-the-market read is also at src/director/scene.ts (a scene's setting), view-learned.ts (a work reason for a view), speech-outline.ts (a layoff named in a speech) and conversation.ts (another workplace to talk about); each hides a pay-authority owner the same way and is left for Words to rule on.

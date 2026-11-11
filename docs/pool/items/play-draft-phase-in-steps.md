---
id: play-draft-phase-in-steps
title: "The draft card lets you phase in a raise: an amount and a date for each step"
area: play
kind: feature
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-play-draft-phase-in-steps
pr: #8457
blocked-on: gov-m3-01-phase-in-by-dated-steps
source: "governing lead and the lane, Oct 30 (the screen half of gov-m3-01-phase-in-by-dated-steps)"
lead: play-first
milestone: play-first
after:
model: sonnet
effort: medium
root: rc7-player-cannot-drive
checked: fable 2026-11-10
claimed-at: 2026-11-11T01:54:05.682Z
branch: claude/pool-play-draft-phase-in-steps
---

**What.** A seated member can draft a raise in dated steps: the engine's `seatAct` takes steps of a value and an effective date for a law amount, and each step is a dated section of the one bill, whose law in force follows each date. The play screen cannot reach it yet, because the server route and the draft card pass a single amount. The route needs a steps parameter, `onDraft` in src/bench/play.mjs builds the act's parameters, and the draft card needs an amount and a date for each step.

**Cause.** Found in code: `seatAct` in src/bench/legislature.ts (line 270) accepts `steps?: {value, effectiveDate}[]` and turns them into dated sections (line 300), but the route in src/bench/handler.ts has no steps parameter, `onDraft` in src/bench/play.mjs (line 3003) builds a single amount, and src/bench/ui/draft-card.mjs has one amount and one date (its `draft-amounts` row, line 54).

**Fix.** Add steps to the route, build them in `onDraft`, and add an 'add a step' row on the draft card with its own amount and date; the engine refuses bad dates (not after today, or not after the step before) and the card shows the reason in words.

**Time box.** 3 hours for one Sonnet session.

**Rules.** Screens follow the mocks and the shared controls (`screen-to-mock`): the step rows use the card's existing controls and keep its `.draft-*` selectors, which src/bench/bill-screens.browser.mjs reads. No hand-written player text: the labels come from the English engine's banks. One engine: the screen passes the steps to `seatAct`, which refuses what the engine refuses (a budget line or a policy question, a date not after today or after the step before), and the card shows that reason worded.

**Done when.** A second session, in a drawn place (name and seed printed), opens the draft card for a minimum-wage bill and finds a second step with its own amount and date; drafting two steps files one bill whose paper shows both sections with their dates, by bill id, and src/bench/bill-screens.browser.mjs still passes. A step with a date not after the one before is refused with a worded reason.

**Waits on.** Nothing (gov-m3-01-phase-in-by-dated-steps, the engine half, is done).

**Files.** src/bench/handler.ts, src/bench/play.mjs, src/bench/ui/draft-card.mjs, src/bench/bill-screens.browser.mjs, src/bench/legislature.ts

**You will see.** On a bill's draft card, an "add a step" row: raise the wage to one amount on one date and to another later.

**Screenshot.** The draft card with two steps filled in, and the bill paper with both dated sections.

**Notes.** Filed by the governing lead at the lane's request (Oct 30). The engine half is branch governing/phase-in-dated-steps.

Claimed by next for sonnet-8597 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 01:54 UTC) on branch claude/pool-play-draft-phase-in-steps.

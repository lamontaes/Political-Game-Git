---
id: play-draft-card-executive-phase-in-asked-as-zero
title: "An executive's draft card offers a phase-in, and the member is asked to carry an amount of zero"
area: gov
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by:
pr: #9612
after: play-draft-card-dark-for-blocked-subjects-and-past-days
blocked-on:
lead: laws
source: Laws thread, reading every refusal a press can reach on the draft card for #9599, Nov 16, 2026
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** A mayor or governor whose bills go through a member opens the same draft card a member does. It shows Add a step and Raise it by a percent a year for a law amount. If the player adds steps or a percent a year and picks a member, the bill sent carries no amount: the member is asked to carry the law amount set to zero, and the player's steps are dropped without a word. Seen: the draft card under Write a bill in Politics, Your office, for an executive, and the bill the member is asked to carry.

**Cause.** Found in code: `onDraft` in src/bench/play.mjs sends an executive's `steps` or `riseFirstDate` in place of `value`, but the `/api/seat/ask-options` and `/api/seat/act` routes in src/bench/handler.ts called `seatAskOptions` and `seatAsk` in src/bench/legislature.ts with `value` only, and `askProvision` read `input.value ?? 0`. `seatAct`'s refusal "An executive's bill is sent as one amount, not a phase-in." came in with a9f2201a (Nov 14, carrying #8341) with no ruling behind it, and the executive's route never reached it. The engine's `askToCarry` and `proposeAsExecutive` (src/core2/modules/legislature.ts) already take dated sections. Measured: Ridgeville, Alabama (0164656), world seed 3ce25319db8dc798de341066399b70e7baea6bfc0a3ff07fb957f8d73f740178, as its mayor: two steps of the local sales tax filed as one section lowering it from 5.43 percent to 0 percent.

**Fix.** The owner's ruling of Sept 30, 2026 has every sponsor write "a start date and a phase-in" (prior-rulings/laws-and-money.md, item 10), so the ask carries the steps. `phaseInSteps` in src/bench/legislature.ts is the one step maker for a member's draft (`seatAct`) and an executive's ask (`seatAsk`, `seatAskOptions`, through `askProvisions`), `phaseInQuery` in src/bench/handler.ts reads the steps or percent for all three routes, and the one-amount refusal is deleted. The draft card is unchanged. The player sees the bill the member files under Bills with one section per step and its date.

**Time box.** 1 hour for one Sonnet session at medium effort.

**Rules.** One engine per mechanic: the screen offers an executive only the one amount the legislature engine takes from them. No hand-written player text in code: the card hides its controls and adds no words.

**Done when.** A second session plays a drawn place as a mayor or governor whose bills go through a member, writes a law amount in two dated steps, asks a member who agrees, and reads that bill under Bills: one section per step with the amounts typed and their dates, never zero.

**Waits on.** Nothing.

**Files.** src/bench/legislature.ts, src/bench/handler.ts, src/bench/executive-phase-in.test.ts (new), src/bench/executive-phase-in.browser.mjs (new)

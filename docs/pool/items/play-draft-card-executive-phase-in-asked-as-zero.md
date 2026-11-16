---
id: play-draft-card-executive-phase-in-asked-as-zero
title: "An executive's draft card offers a phase-in, and the member is asked to carry an amount of zero"
area: gov
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after: play-draft-card-dark-for-blocked-subjects-and-past-days
blocked-on:
lead: laws
source: Laws thread, reading every refusal a press can reach on the draft card for #9599, Nov 16, 2026
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** A mayor or governor whose bills go through a member opens the same draft card a member does. It shows Add a step and Raise it by a percent a year for a law amount. If the player adds steps or a percent a year and picks a member, the bill sent carries no amount: the member is asked to carry the law amount set to zero, and the player's steps are dropped without a word. Seen: the draft card under Write a bill in Politics, Your office, for an executive, and the bill the member is asked to carry.

**Cause.** Found in code: `onDraft` in src/bench/play.mjs (the draft card's call near `chooseMember`) sends `steps` or `riseFirstDate` in place of `value`. The `/api/seat/ask-options` and `/api/seat/act` routes in src/bench/handler.ts call `seatCarriers` and `seatAsk` in src/bench/legislature.ts with `value` only. `askProvision` there reads `input.value ?? 0`. `seatAct` refuses a phase-in from an executive ("An executive's bill is sent as one amount, not a phase-in."), but the executive's route never reaches it.

**Fix.** `draftCard` in src/bench/ui/draft-card.mjs takes a flag from `seatRows` in play.mjs for a body whose bills go by request. With it, the card offers no Add a step and no percent a year, so an executive sends one amount, as the engine's rule says. The player sees the executive's draft card with one amount only.

**Time box.** 1 hour for one Sonnet session at medium effort.

**Rules.** One engine per mechanic: the screen offers an executive only the one amount the legislature engine takes from them. No hand-written player text in code: the card hides its controls and adds no words.

**Done when.** A second session plays a drawn place as a mayor or governor whose bills go through a member, opens Write a bill, and sees no Add a step or percent a year. The bill the member is asked to carry has the amount typed, not zero.

**Waits on.** Nothing.

**Files.** src/bench/ui/draft-card.mjs, src/bench/play.mjs

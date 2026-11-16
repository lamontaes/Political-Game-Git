---
id: play-draft-card-dark-for-blocked-subjects-and-past-days
title: "The draft card lights Draft for a subject the body may not write on, and a past day does nothing"
area: gov
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: laws thread
pr: #9599
after: play-draft-phase-in-percent-a-year
blocked-on:
lead: laws
source: Acting CTO's read of the frozen Train 892427ec (fault 1, /mnt/project-files/account-lead/train/other-account-comments-9052.md); ruled by the account lead Nov 15, 2026
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** On the draft card a member of a body picks a subject, types the new amount and presses Draft. Two faults: after the "Raise it by a percent a year" panel opens and closes, Draft lights up even for a subject the body may not write on, which was dark before. And a percent a year or a dated step whose day is today or already past makes Draft do nothing at all: the engine refuses the bill and the screen shows no change. Seen: the draft card under Write a bill in Politics, Your office.

**Cause.** Found in code: `checkRise` in src/bench/ui/draft-card.mjs set `draft.disabled = false` when the panel closed, dropping the subject's `blocked`; the card let any day be picked, and `act` in src/bench/play.mjs had no catch, so the refusal from `seatAct` in src/bench/legislature.ts ("Each step of a phase-in takes effect after today and after the step before it.") became a page error. Measured at Bear, Delaware, seed ddf37910-a72f-415e-8c0d-abbf8d0ad0c7, on the Train at 29ef4685.

**Fix.** `checkRise` keeps Draft as the subject allows when the panel closes, and keeps it dark until the first increase, or every dated step, falls after the game's today and after the step before it, with the controls words saying which is missing. The date fields start at the game's tomorrow. A refusal the card did not prevent shows "Nothing was drafted." from the controls, never the engine's text. The player sees it on the draft card in Your office.

**Time box.** 2 hours for one Sonnet session at medium effort.

**Rules.** No hand-written player text in code: every word comes from src/bench/data/controls.json. Screens show record data only through worded labels.

**Done when.** A second session plays a drawn place as a member of a body, opens Write a bill, and sees Draft stay dark for a subject the body may not write on after the percent panel opens and closes, stay dark with the controls line for a past first increase or step, and draft the bill once the days are after today.

**Waits on.** Nothing.

**Files.** src/bench/ui/draft-card.mjs, src/bench/play.mjs, src/bench/data/controls.json

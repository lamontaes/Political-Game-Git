---
id: play-draft-list-yes-no-reads-0-or-1
title: 'Draft a bill lists a yes-or-no law as 0 or 1 ("Fare free transit 0") where the Issues tab says Yes or No (Hazen, Arkansas)'
area: play
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/p2-draft-yes-no
pr: #9017
after:
blocked-on:
lead: play-first
model: haiku
effort: low
root: none
source: Playtester P2, Nov 13 (Hazen, Arkansas, seed 5b5ef2fb-d923-42b4-a72c-f0abb12bb3e9)
---

**What.** On main 596d5127, an Advanced start in Hazen, Arkansas (seed 5b5ef2fb-d923-42b4-a72c-f0abb12bb3e9) as Council member Brenda Cabrera. Politics → Your office → Draft a bill lists "Fare free transit 0", "Shift highway funds to transit 0", "Allow multifamily in single family zones 0" and "Exempt groceries from sales tax · State law preempts this 1", and a subject's page says "In force today 0". The Issues tab says the same laws are Yes or No. Seen: the draft list and the subject's page say Yes or No for a yes-or-no law.

**Cause.** Found in code: `seatRows` in `src/bench/play.mjs` (line 3223) writes each subject's `today` with `amount(item.today.value, item.today.unit)`, and a policy question carries no unit, so its 0 or 1 is printed as it is. The Issues tab (`lawText`, line 5510) says a yes-or-no law with `controls.politics.yes` and `no`.

**Fix.** For a subject of kind `policy-question`, `today` is `controls.politics.yes` or `no` by its value, as the Issues tab says it. Amounts and budget lines are unchanged.

**Time box.** 0.5 hours

**Rules.** No hand-written player text: the words are the Issues tab's own control names. One rule, all 56 places: every policy question in every body's list reads the same way.

**Done when.** A second session sees, on the bench on main, a drawn Advanced start as a council member whose Draft a bill list shows Yes or No beside every yes-or-no law (screenshot with the place and seed).

**Waits on.** Nothing.

**Files.** src/bench/play.mjs

**Notes.** Left as it is: the new-amount box for a yes-or-no law still takes a number (0 or 1). Turning it into a Yes or No choice is a design for its own item (see play-repeal-action-on-every-law-page).

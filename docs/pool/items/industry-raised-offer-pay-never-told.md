---
id: industry-raised-offer-pay-never-told
title: "An owner raising pay to fill an opening is kept on the opening and told to no one"
area: words
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: none
lead: words
model: sonnet
effort: medium
source: "Industries thread, Nov 16 (trace /mnt/project-files/account-lead/reports/industry-events-read-by-story.md), at the Account lead's direction, for the owner's Nov 16 01:58Z ask"
---

**What.** When an opening stays unfilled, its owner may raise its pay (the jobs engine's `raiseUnfilledPay`, decision `jobs.raise-for-opening`), kept on the position as `raisedOn`, `raises` and `raisedBy`. No seeker, talk or paper reads that, so a town short of workers never hears that a business is paying more to hire. Seen: in the code's readers on Train head a62a2fda.

**Cause.** Found in code: src/core2/modules/jobs.ts `raiseUnfilledPay` (around line 1452) writes the raise on the position and emits nothing; no file under src/director, src/english or src/bench reads `raisedOn` or `raises`.

**Fix.** Let the job board the player reads and the seeker's talk read the position's raise (said as how it feels, never the figure, unless the owner says their own), and give the paper's help-wanted brief a row when a raise follows a long-unfilled opening. The player sees it on the jobs screen and in talk with a seeker or the owner.

**Time box.** 4 hours; if not done, push what exists, open the draft PR and write the handoff in Notes.

**Rules.** People say how it feels, never the figure. An effect is a read, not a record: the raise matters only where a seeker or a line reads it.

**Done when.** In a drawn place where an opening's pay is raised, a seeker or the owner raises it in talk by the position's id, and a second session sees it in the running game.

**Waits on.** Nothing.

**Files.** src/core2/modules/jobs.ts, src/director/conversation.ts

**Notes.** Nov 16 04:40Z, Words lead: take the six in this order: G1 closing reason, G5 official, G4 owner, G3 raised pay, G2 missed payment (private: only the owner, lender and household speak of it), G6 last; this is number 4. The builder sends a scene-first report (record, packet facts, write-back) before any line; a line names a law only when the closing's record does.

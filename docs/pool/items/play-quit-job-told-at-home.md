---
id: play-quit-job-told-at-home
title: "When the player leaves a job, the people at home hear of it"
area: play
kind: feature
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after: play-quit-job
blocked-on:
lead: story
model: opus
effort: medium
root: none
source: Account lead review of PR 9222, Nov 14
---

**What.** After the player presses Leave this job, only the people at the workplace react, in the one farewell scene. The family at home says nothing, though the household's pay has just changed. A partner, parent or child who lives with the player should bring it up in their own words, and a coworker the player meets later should know the player left. Seen: in a talk at home on the day after the player leaves, and in a talk with a former coworker met later.

**Cause.** Found in code: the `left-work` change the player's press writes reaches the director only as the `money:job-left` moment (src/director/ledger.ts line 1084), and that label has one cause row, the workplace `last-day` scene (src/director/data/situation-types.json, `last-day`, label `money:job-left`). The household "tell" scenes match only `money:job-ended` (same file, the `tell` rows with `counterpart` none and some), which a chosen leaving is kept out of on purpose (`chosenJobEnds` in src/director/data/director.json) so nobody says "I lost my job".

**Fix.** Add a `money:job-left` cause row to the household "tell" situation with its own worded move (not the lost-job lines), and let the coworker thread read the `left-work` change when a former coworker is met. The lines go to the Words lead first. Reuse the situation rows; add no new scene engine.

**Time box.** 6 hours, one Opus session. When it runs out, push what passes and set the state honestly.

**Rules.** Nothing cast for the player without their press. People say how it feels, never the figure. A question offered in a scene must be answered from a record. No new stopgaps.

**Done when.** A second session, on main in a drawn place from all 56 (named with its seed), has the player take a job, press Leave this job, and finds a household member's talk about it the next day, worded for a job left and not lost, naming the change record id. Never in the same talk as the workplace farewell.

**Waits on.** play-quit-job merged.

**Files.** src/director/data/situation-types.json, src/director/ledger.ts, data/english/parts/scene-talk.json

**Notes.** Found while checking the owner's "the people at work react to it" for PR 9222: the farewell is the only reaction built.

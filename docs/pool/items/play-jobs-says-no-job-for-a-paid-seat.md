---
id: play-jobs-says-no-job-for-a-paid-seat
title: 'Jobs and study says "No current job" for a supervisor whose seat pays $61,086 a year, while Your office shows the pay (Joseph City, Arizona)'
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
after:
blocked-on:
lead: play-first
model: sonnet
effort: low
root: none
checked: fable
source: Playtester P2, Nov 13 (Joseph City, Arizona, seed 3bb11757-b22e-4a8d-b6c4-7259e5c84834)
---

**What.** On main 596d5127, an Advanced start in Joseph City, Arizona (seed 3bb11757-b22e-4a8d-b6c4-7259e5c84834) as Supervisor Anna Williams of the Navajo County Board of Supervisors, a year in. Politics → Your office says "Office Supervisor · Pay $61,086.00 a year". You → Jobs and study says "Work · No current job · You have no job of your own; your household lives on what John Williams earns at COUNTY OF NAVAJO treasury", then lists openings in town for her to take. The two screens disagree about the player's own work. Seen: Jobs and study shows the player's seat as their work, with its pay, wherever Your office does.

**Cause.** Found in code: Jobs and study's Work plate (`src/bench/play.mjs`, around line 3690) shows `job`, the person's job record, and otherwise `labels.noJob`. A part-time seat is not a job record: `reviewOfficeJobs` (`src/core2/modules/office-day.ts`, line 1060) gives it `jobId: null` ("a part-time holder keeps their own job") and pays a stipend through the office-job row. Your office reads that row (`officeView`, `src/bench/office.ts`); Jobs and study never does.

**Fix.** The Work plate reads the player's office-job rows too (the `/api/office` view's `jobs`, already fetched for Your office) and shows each seat with its title, its government and its yearly pay, above the person's own job or in place of "No current job". The no-job line and the openings show only when there is neither a job nor a seat.

**Time box.** 1 hour

**Rules.** One rule, all 56 places: every seat with an office-job row shows, whatever its kind or place. An effect is a read, not a record: the office-job row the stipend is paid from is the one the screen reads.

**Done when.** A second session sees, on the bench on main, a drawn Advanced start as a county supervisor or council member whose Jobs and study shows the seat and its pay, matching Your office (screenshot with the place and seed).

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/office.ts (read only)

**Notes.** The capitals in "COUNTY OF NAVAJO treasury" are the name-reader miss Fable A gave W2 (rule 20 follow-up).

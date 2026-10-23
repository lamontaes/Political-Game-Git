# PW-6: the player turns 18 in play and an idle young adult has a life

Both players were already 18 at the opening and turned 19 within three days, because the bench picks the oldest person at 18. Turning 18, the golden path's first step, never happens in play. For three years the player only rested (1,096 times) and contacted people they already knew (627 times, 598 of them a brother). Neither met anyone new, looked for work, filed for anything or applied for credit. Only 22 people per world ever chose anything. This package makes the opening the start of a life and gives an idle young adult the choices a real one has.

## Who builds it, where

- **Read first:** `docs/packages/PW-common.md`, then PW-1.
- **Builder:** one Opus session at **high**: the opening is the first thing the owner plays, and the idle character's choices are the "no dice" chooser at its most visible.
- **Branch:** `pw/player-start`, from `main` after PW-1 lands.
- **Owned paths:** `src/bench/world.ts` (only `entrantOf` and the player pick, lines 70 to 90), `src/bench/player.ts`, `src/core2/modules/drives.ts` and `src/core2/data/drives.json` (with OPUS-PEOPLE's review), `src/core2/modules/work.ts` (the job-seeking offers only; OPUS-WORLD reviews), `src/director/` (the idle character's offers; OPUS-PEOPLE reviews), their tests, `docs/archive/2026-10-23/roadmap/PROGRESS.md`, a release note. Changes to the chooser itself (`src/core2/life.ts`, `availableActs`) are a request to OPUS-CORE in the PR body.
- **Where:** the player pick is `entrantOf` in `src/bench/world.ts`, lines 70 to 90.

## Build

1. **Pick the resident about to turn 18.** `entrantOf` picks the resident closest to their 18th birthday after the opening, within the entry window. The window is a TUNABLE in the bench's own table, say 60 days, with the reason: the owner should reach step 1 in the first skip. If no resident in the town is 17 and that close, pick the closest 17-year-old and say so in the opening record. Never a resident already 18.
2. **Why only 22 people choose.** In a played-world run, count who was offered a choice in the year and who was not. Find the gate: the two-level collapse keeps full people only in the player's circle, the director watches only the player and the chosen people, or `availableActs` offers nothing to a person without a drive above its floor. Write the finding in the PR body with numbers before changing anything. The fix for "full people who are not the player never choose" belongs to OPUS-CORE if it is in the chooser and to you if it is in the offers; say which.
3. **An idle young adult's offers.** A full person with no job, no school and time has these on offer, each with a reason from their drives, money, traits and circle, and the chooser weighs them like anything else. Look for work, from the jobs module's openings in the town's records. Apply for a job. Enroll, in community college or a trade program from the place's schools data. Meet someone new, through a known person, a workplace, a civic meeting or a place they go. Go to a public meeting (installed by PW-2). File for office when eligible and a seat is up (PW-3's candidacy offer). Apply for credit when short. And the rest the drives module already names. Rest and contacting family stay; they stop being the only things on the list. The offer's reasons are recorded so "why did I do that" works in the bench.
4. **Meeting people.** A meeting creates the relationship record and, for a counted person, fills them in from the seed so they match the records (the two-level rule). The player's circle grows in the year.
5. **No hand-written text.** The offers show control names and record data; the English engine words them.

## Acceptance checks (PW-1 letters J, K)

1. **J:** On two fresh seeds, the player's 18th birthday is after the opening and within the entry window; the opening record names the player, the birth date and the window.
2. **K:** Uncontrolled for a year, the player made at least one choice that was not rest or contacting a known person, and the decision record says why. In the PR body, the player's year as a count of choices by kind, for both seeds.
3. The count of full people who were offered at least one choice in the year, before and after, for both seeds, in the PR body. If the number is still small and the cause is in the chooser, the request to OPUS-CORE is in the PR body with the numbers.
4. In the bench, controlled, the first week's offers for the player include at least three kinds besides rest and contact, each with reasons shown. Control names in the PR body.
5. Remove the `fails` markers for J and K and show the suite green.
6. Year time before and after, same seed, within 20%.

## How the owner checks it

Open `/play` on a fresh seed: the character is 17, and the first skip stops on their 18th birthday. The day's choices include looking for work, going somewhere new and talking to someone they don't know, each with a reason he can click. After a skipped month the circle has a new name in it and the journal has a line that is not from childhood.

## Out of scope

The journal's wording (OPUS-PEOPLE audit item 5). Schools for kids and teens (break 5 in the handoff; OPUS-PEOPLE). The filing visit itself (OPUS-PLAY audit item 1).

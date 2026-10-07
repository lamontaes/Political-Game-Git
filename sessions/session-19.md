# Session 19

Read RULES.md (same branch) first. Items in order; the CTO marks DONE here and may add items — re-read after every PR.

SPEED (owner, Oct 7 9:40 a.m.: "It shouldn't take 10 minutes to sim a goddamn year… it should only do stuff in their vicinity… simulate stuff when you click it").
Measured on main 1d41f90f8: a watched world was still running a single game year after 20 minutes, using 4.5 GB of memory. H3's profile: 1.74 s per game day;
the 50 state legislatures' daily step alone is 39% of a day; a people-table copy per state step is another ~20%; tests also re-check the whole world after every write.

1. SPEED GATE FIRST: add `npm run speed:year` — opens a watched world in a seeded random place, runs 365 days, prints seconds per day and the top 10 costs.
   Budget: one game year in under 2 minutes on this Mac. It fails (exit 1) over budget. Post today's number on #2424 before changing anything.
2. FOCUS TIERS (approved design): every day, simulate in full only the FOCUS circle — the player (or the watched person), their household, family, coworkers,
   contacts, and their own town and county governments. Everything else advances on its calendar, not daily: other places weekly in one batch; other state
   legislatures, Congress and courts only on their recorded session/hearing/election dates; national figures monthly. Same rules, same records — only when they run changes.
3. CATCH UP ON LOOK: when the player opens a person, place or body outside the circle, bring just that entity up to today from its last simulated date
   (same rules, run for the skipped dates in one pass) before the screen shows it. Nothing outside the circle is computed while nobody looks.
4. Whole-world integrity checks run only in tests that ask for them (changed-records mode everywhere else); never in play or watch mode.
Each step is its own PR with the speed:year number before and after in the PR body, plus a same-records check on 3 seeds for the focus circle. Merge each when it passes.

When everything here is DONE: POOL.md rows, oldest unclaimed first (post CLAIM on #2424).

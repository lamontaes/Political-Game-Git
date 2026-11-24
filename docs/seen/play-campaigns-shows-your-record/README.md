# Campaigns shows your record in office: before and after

Pool item `play-campaigns-shows-your-record`, PR #8471. Each picture is Politics, Elections, the race the player holds (the one whose last winner is the player), at 1440x900 on the bench, with the same seed before (`origin/main`) and after (this branch). Replay: `BENCH_SEED=<seed> node src/bench/campaigns-record.browser.mjs` against a bench on the branch.

| Place                    | Seed                                   | Before                      | After                      |
| ------------------------ | -------------------------------------- | --------------------------- | -------------------------- |
| Killeen, Texas           | `22e32112-2187-4fbc-abc6-dd5da64ef457` | before-killeen-tx.png       | after-killeen-tx.png       |
| Andersonville, Tennessee | `22442b9c-8f8b-4587-b168-09793719c854` | before-andersonville-tn.png | after-andersonville-tn.png |
| Manele, Hawaii           | `3ac6762e-d610-453c-9e13-dec96b6f83ff` | before-manele-hi.png        | after-manele-hi.png        |

The before pictures end after "Dates"; the after pictures add "Your record in office". The record shows only under the player's own race (1 of 14 races in Killeen, 1 of 13 in Andersonville, 1 of 11 in Manele), not under every race (Fable A's read, Nov 12: it showed under races the player is not in). Each vote reads "You voted for it" or "You voted against it", then "it passed" or "it failed", so a vote against a bill that passed no longer reads as "Against · passed".

A vote with no outcome on record is left out of the section (Fable A's read, fault 3); main now records the roll's outcome with a member's vote (#8921), so the votes shown all carry "it passed" or "it failed". Not changed here: a council member's "Promises you made" list (fault 2) is traced by Fable A's tracer as a gap in how opening promises are seeded.

## Lines as played (the section's start in each place)

- Killeen, Texas: Your record in office Votes you cast Graduated income tax · January 21, 2023 You voted for it · it failed Admit more immigrants · May 14, 2023 You voted for it · it failed Fund pensions to schedule · July 31, 2023 You voted against it · it passed Minimum reserve balance · December 30, 2023 You voted for it · it passed Civilian oversight ...
- Andersonville, Tennessee: Your record in office Votes you cast Inclusionary requirement · June 5, 2021 You voted against it · it passed Shift highway funds to transit · June 17, 2021 You voted against it · it passed Minimum reserve balance · January 6, 2022 You voted for it · it passed Limit power plant carbon · February 12, 2022 You voted against it · it passed Right to counsel in eviction · April 3, ...
- Manele, Hawaii: Your record in office Votes you cast Ban the box public hiring · January 25, 2023 You voted for it · it passed Admit more immigrants · February 12, 2023 You voted for it · it passed Allow multifamily in single family zones · March 24, 2023 You voted for it · it failed Exempt groceries from sales tax · September 12, 2023 You voted for it · it passed Inclusionary requirement · November 21, 2023 You voted for ...

No vote row prints a record id: a vote on a bill the legislature still holds shows its bill number, an older measure shows its title and the date. The browser check asserts no row matches `/past-bill:|us-policy-positions|\w+:\w+:\w+/`, and that the record shows under some but not every race.

## The statements this answers

No owner complaint about this screen alone is on record in the files searched (OWNER-DECISIONS.md, prior-rulings, docs/play-first). The dated statements it answers are:

- Owner, Oct 10, 2026 (AGENTS.md, "Where the game is going"): "the next election uses the record". The screen the player plans a re-run from showed none of it.
- Owner, Oct 24, 2026 (AGENTS.md, "Play first"): "I still can't play the game."

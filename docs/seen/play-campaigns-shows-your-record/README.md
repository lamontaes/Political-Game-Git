# Campaigns shows your record in office: before and after

Pool item `play-campaigns-shows-your-record`, PR #8471. Each picture is the Campaigns screen (Politics, Elections, first race) at 1440x900 on the bench, with the same seed before (main `origin/main` at the time) and after (this branch). Replay: `BENCH_SEED=<seed> node src/bench/campaigns-record.browser.mjs` against a bench on the branch.

| Place                       | Seed                                   | Before                            | After                            |
| --------------------------- | -------------------------------------- | --------------------------------- | -------------------------------- |
| Killeen, Texas              | `22e32112-2187-4fbc-abc6-dd5da64ef457` | before-killeen-tx.png             | after-killeen-tx.png             |
| Andersonville, Tennessee    | `22442b9c-8f8b-4587-b168-09793719c854` | before-andersonville-tn.png       | after-andersonville-tn.png       |
| Pope-Vannoy Landing, Alaska | `28f4094c-bb58-4345-a00b-335d6b643cac` | before-pope-vannoy-landing-ak.png | after-pope-vannoy-landing-ak.png |

The before pictures end after "Dates"; the after pictures add the section "Your record in office".

## Lines as played (the section's start in each place)

- Killeen, Texas, seed 22e32112-2187-4fbc-abc6-dd5da64ef457: Your record in office Votes you cast Graduated income tax · January 21, 2023 For · failed Admit more immigrants · May 14, 2023 For · failed Fund pensions to schedule · July 31, 2023 Against · passed Minimum reserve balance · December 30, 2023 For · passed Civilian oversight of police · November 28, 2024 For · passed Welfare and Medicaid · January 21, 2025...
- Andersonville, Tennessee, seed 22442b9c-8f8b-4587-b168-09793719c854: Your record in office Votes you cast Inclusionary requirement · June 5, 2021 Against · passed Shift highway funds to transit · June 17, 2021 Against · passed Minimum reserve balance · January 6, 2022 For · passed Limit power plant carbon · February 12, 2022 Against · passed Right to counsel in eviction · April 3, 2022 Against · passed Balanced operating budget · June 22, 2022 For · pass...
- Pope-Vannoy Landing, Alaska, seed 28f4094c-bb58-4345-a00b-335d6b643cac: Your record in office Votes you cast Rent stabilization · March 2, 2022 Against · passed Limit power plant carbon · June 25, 2022 Against · passed Ban the box public hiring · June 26, 2022 For · passed Admit more immigrants · August 21, 2022 Against · passed Medicare drug price negotiation · September 3, 2022 Against · passed Inclusionary requirement · January 18, 2023 Against · passed Civilian oversight of police · December 14, 2023 Against · passed Balanced operating budget · March 24, 2024 For · ...

No vote row prints a record id: a vote on a bill the legislature still holds shows its bill number, an older measure shows its title and the date. The browser check asserts no row matches `/past-bill:|us-policy-positions|\w+:\w+:\w+/`.

## The statements this answers

No owner complaint about this screen alone is on record in the files searched (OWNER-DECISIONS.md, prior-rulings, docs/play-first). The dated statements it answers are:

- Owner, Oct 10, 2026 (AGENTS.md, "Where the game is going"): "the next election uses the record". The screen the player plans a re-run from showed none of it.
- Owner, Oct 24, 2026 (AGENTS.md, "Play first"): "I still can't play the game."

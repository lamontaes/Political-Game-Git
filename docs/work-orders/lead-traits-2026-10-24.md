# Lead order: traits (weekend of Oct 24, 2026)

Current as of 2026-10-24 (written by the acting CTO from main and the open PRs on the night of Oct 23)

The owner, Oct 16: "as long as it's calibrated correctly and not everybody's the same zombies." Personality must make two people in the same spot live different years for reasons the game can show.

## Who

- **Lead:** one Opus session, high effort. It owns the trait matrix (`docs/reports/trait-wiring-2026-10-20.md` and `.json`, `data/content/trait-decisions.json`, `data/content/trait-decision-gaps.json`) and every `traits-*` item.
- **Helpers:** Sonnet, at most two at once (3-2-1 rule), one family each, in that family's files.
- **Skill:** `.agents/skills/lead-session/SKILL.md`, with `wiring-audit` and `pr-fixer`.
- **Channel:** your section of `docs/coordination/LEADS-2026-10-24.md`, every two hours.

## Where it stands (checked Oct 23, night)

- **Matrix (Oct 20):** 84 decisions; 61 run in a played year (66 where the year holds an election); 36 have weights from research; 23 outcomes, 16 read by their owning engine. Opposite neighbors' days sat only about a tenth further apart with personality than with traits wiped flat.
- **`traits-wiring-audit` was wrongly done.** It flipped when the audit PR merged; then family PRs opened with its id as their first word, which the done-on-merge workflow reads as the item to close (`release-pool-done-bare-id`). It is reopened as blocked on the items below.
- **Three family PRs have conflicted with main since Oct 21:** #5587 `claude/traits-money` (jobs, money and housing), #5657 `claude/traits-civic` (civic life and news), #5715 `claude/traits-integrity` (corruption, recalls, cases, staff). #5597 (campaigns) and #5745 (each trait's own standard deviation) merged.

| Item                         | What                                                                   | Starts from                     |
| ---------------------------- | ---------------------------------------------------------------------- | ------------------------------- |
| `traits-wire-money`          | Borrowing, quitting, accepting, founding, moving, applying, buying     | #5587                           |
| `traits-wire-civic`          | Turnout, news, meetings, parties, groups, press, claims, persuasion    | #5657                           |
| `traits-wire-integrity`      | Justice, tips, recalls, cases, staff, bribes                           | #5715, plus the honest-pull fix |
| `traits-decisions-never-run` | The 23 decisions that never run in a played year                       | new                             |
| `traits-outcomes-unread`     | The 7 outcomes no engine reads in full                                 | new                             |
| `traits-end-to-end-proof`    | Opposite traits, same situation, different reasons and different years | new: your acceptance            |

## What to do, in order

1. **Start.** Read `AGENTS.md`, `lead-session`, this order, your channel section and the top of `OWNER-DECISIONS.md`. Run the golden-path suite once. Write your first status.
2. **Land the three conflicting PRs,** oldest first: #5587, #5657, #5715. Claim each family item with the PR's branch, merge main in, resolve the conflicts yourself, and finish what the family's done-when needs on that branch. Rewrite the body: line 1 exactly `Pool item: traits-wire-<family>`, line 2 the gate, `Lead: traits`, then the Done-when table. Set `in-pr` and ask the CTO in the channel to put it on `MERGE-FIRST.md`.
3. **Recalibrate after #5745.** Weights calibrated against Mondak rows (campaigns, meetings, voting, parties) are rescaled by each trait's own standard deviation, or recalibrated with `scripts/traits/trait-calibrate.ts`; rerun the one-town trait tests on fresh draws.
4. **After every merge,** rerun `scripts/traits/trait-wiring-audit.ts` (played, flat, mirror) and `trait-wiring-matrix.ts` on main in two drawn towns, update the report through its own PR (line 1 `Pool item: none (traits lead report)`), and post the counts in your channel status.
5. **Then the two new families,** one helper each: `traits-decisions-never-run` (make each run where its cause happens: an election inside the year, a world candidate's own asks, a bribe chain once `people-corruption-honest-pull-calibrated` lands) and `traits-outcomes-unread`.
6. **Finish with `traits-end-to-end-proof`:** two people with opposite traits in the same situation, in a played year, with different recorded reasons and different outcomes, by record id, and the opposite-neighbors gap at least twice its Oct 20 size. If it cannot grow because days are set by needs and schedules, show the numbers and file the cause; never loosen the check.
7. **File what you find.** Never ask in chat.

## Rules that bind this

No dice: traits weigh reasons; a trait never rolls an outcome, and real rates only check totals. One model, two tiers: counted people decide through the same shared formula. Sliding scales: nothing flips at a threshold. Research before building: every weight cites its study or carries a gap row. Speed: measure each family's year before and after on the same base; no more than 20 percent slower.

## Done for this lead

The six items done, `traits-wiring-audit` closed by the CTO, and the report's top showing in two drawn places how many of 84 decisions run, how many weights come from research, how many of 23 outcomes are read, and the opposite-neighbors gap.

**How the owner will play it:** in the bench he opens two neighbors the report names, one bold and one cautious, and reads why each took or turned down the same loan, job or cause, with different results by December.

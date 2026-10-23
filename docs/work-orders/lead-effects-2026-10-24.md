# Lead order: the effects map (the outcome web), weekend of Oct 24, 2026

Current as of 2026-10-24 (written by the acting CTO from main and the open PRs on the night of Oct 23)

A cause in town (a law, a layoff, dirtier air) must land on people by who they are, and they must feel it. On Oct 20, 5 of 221 researched links reached a record a person lives with. This lead takes the rest to people, or names why not, link by link.

## Who

- **Lead:** one Opus session, high effort. It owns the effect matrix (`docs/reports/effect-web-wiring-2026-10-20.md`, `effect-web-matrix-2026-10-20.json`, `src/core2/data/outcome-web/unwired.json`) and every `web-reach-*` item, `web-coverage-reads`, `web-calibrate-*` and `effects-end-to-end-proof`.
- **Helpers:** Sonnet, at most two at once (3-2-1 rule), one family each, in that family's engine files. Families sharing `src/core2/outcome-web-reach.ts` or `outcome-web-model.ts` land one at a time.
- **Skill:** `.agents/skills/lead-session/SKILL.md`, with `wiring-audit` and `pr-fixer`.
- **Channel:** your section of `docs/coordination/LEADS-2026-10-24.md`, every two hours.

## Where it stands (checked Oct 23, night)

- **Merged engine families:** births, voting, moves, housing, labor, prices, poverty, crime (victimization records), health and causes of death, knowing (the month's conditions become news), sizes and moderators. `effect-web-reach` is done. The owner ruled on Oct 22 that hearing a condition change moves a stance for the people the news reached (`web-views-from-conditions`, done).
- **Open PRs:** capstone #5639 `effect-web-integration` (merge last; conflicting; fixed the school income basis at its newest head and asked for a recheck): with the families, 109 of 221 links reach an engine's records, 15 land differently by person, and 112 are listed with a reason and stopgap in `unwired.json`; schools #5609 `effect-web-schools` (mergeable, item `world-school-income-same-tiers`); coverage #5661 `claude/web-coverage-reads` (draft, conflicting); births calibration #5654 `claude/web-calibrate` (draft).
- **The 112 unwired links, by family** (56 where the engine does not read the factor, 56 where nothing keeps the outcome):

| Item                        | Links | Engine not reading | No measure |
| --------------------------- | ----- | ------------------ | ---------- |
| `web-reach-health`          | 20    | 9                  | 11         |
| `web-reach-public-finance`  | 20    | 13                 | 7          |
| `web-reach-crime-justice`   | 17    | 7                  | 10         |
| `web-reach-schools`         | 15    | 2                  | 13         |
| `web-reach-environment`     | 13    | 11                 | 2          |
| `web-reach-labor`           | 12    | 3                  | 9          |
| `web-reach-civic`           | 8     | 5                  | 3          |
| `web-reach-places-services` | 7     | 6                  | 1          |
| `effects-end-to-end-proof`  | 1     | your acceptance    |            |

## What to do, in order

1. **Start.** Read `AGENTS.md`, `lead-session`, this order, your channel section and the top of `OWNER-DECISIONS.md` (Oct 22 and Oct 24). Run the golden-path suite once. Write your first status.
2. **Land the open PRs:** #5609 schools first, then #5661 coverage and #5654 births calibration, then the capstone #5639 last. Claim each item with the PR's branch, merge main in, fix send-backs yourself, and give each body line 1 `Pool item: <id>` (the capstone: `Pool item: none (effects lead report)`), the gate line and `Lead: effects`. Ask the CTO in the channel to put them on `MERGE-FIRST.md`.
3. **After every merge,** rerun `scripts/outcome-web/effect-matrix.ts`, `scripts/outcome-web/write-unwired.ts` and the twin check (`src/core2/outcome-web-twins.test.ts`, Paris, Arkansas, seed `ew20oct26`, plus one drawn place) on main, push the report through the capstone or its successor, and post the counts.
4. **Then the families,** largest first, one helper each: make the engine that owns each outcome multiply its own rates by the link's factor per person, with the researched moderators; a link with no measure gets the measure its engine keeps or one specific reason in `unwired.json`. Never a second engine (no parallel crime or school engine); never move money a second time (poverty is counted from paychecks).
5. **Knowing:** a link is felt through a person's own experience, the news or a conversation. Where a family's outcome is news, the month's outcome news carries it and the stance moves only for those it reached (owner, Oct 22).
6. **Finish with `effects-end-to-end-proof`:** one researched link from its cause record to the owning engine's record for a named person, to their view or choice citing the news or lived event, to a scene or journal line, in a played year in a drawn place, by record id.
7. **File what you find.** Never ask in chat.

## Rules that bind this

An effect is a read, not a record. One model, two tiers. Research before building: sizes, lags and spreads come from the link's citation. No dice: a factor changes rates people's reasons weigh. Sliding scales: effects build and fade on the researched schedule. Speed: measure each family's year before and after on the same base.

## Done for this lead

Every `web-reach-*` item done, the capstone report on main with before and after played years in two drawn places, the matrix showing every link reaching an engine's records or carrying one specific reason, and `effects-end-to-end-proof` done.

**How the owner will play it:** after a plant closes in a drawn town, he watches the rent arrears, the moves and the news land on named neighbors, and one of them brings it up in a scene with the reason on their record.

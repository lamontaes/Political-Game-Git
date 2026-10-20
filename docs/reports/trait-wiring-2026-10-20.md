# Opposite neighbors still live almost the same year, and 25 personality decisions never ran

At the owner's weight of 1.0, personality now turns about 1 daily choice in 7. Two neighbors with the most opposite personalities still lived nearly the same year: their mix of daily choices differed only about a tenth more than it does when everyone's personality is wiped flat. Of 82 personality decisions, 25 never ran in the year, mostly because the town held no election and the corruption, recall and campaign chains never start. Of 23 outcomes personality should shape, 6 read it, 7 read it in part and 10 do not. No decision's weight has yet been set from research. Nothing here needs the owner.

## What the player sees

- A town's daily life bends a little to personality. Personality turned 4,369 of 29,520 daily-activity choices (14.8%) and 2,003 of 50,086 decisions to go to a work shift (4.0%). (Measured.)
- Opposite neighbors live alike. In 290 pairs of adults matched to the neighbor least like them, the mixes of what they did each day differed by 0.48 on a 0 to 1 scale. With personality wiped flat, the same pairs differed by 0.43. The same person with every trait turned to its opposite differed from themselves by 0.28. (Measured.)
- Personality changes what the town's government does, but some of that is a defect. Wiping personality flat cut the year's bills from 2,375 to 911 and laws from 30 to 12. Turning every trait to its opposite gave 987 bills and 12 laws. Remarks fell from 192 to none in both twins. Party meetings fell from 298 to 30 with traits flat, and rose to 341 with traits mirrored. (Measured.) The flat and mirrored worlds moving together for bills and remarks means a few people at the extreme drive them, not a sliding scale. (Inferred; the cause is not yet found.)
- Some choices ignore personality entirely. Founding a business (36,326 weighings), going to school (15,874), buying a home (638), applying for a job (545), accepting a job (1,598) and how a strong drive is answered (1,471) were never turned by personality. (Measured.)
- One choice is all personality. Whether a legislator attends a sitting was turned by personality in 830 of 864 sittings (96%), because attending and missing score almost the same without it. (Measured.)
- Running for office turned on personality in only 10 of 10,394 weighings. That count undersells it: almost no one runs, and among the few close calls the boldest third ran at about 4 times the odds of the most cautious third. (Measured.)

## The map

The machine-readable matrix is `docs/reports/trait-wiring-2026-10-20.json`, with one row per decision and per trait-shaped outcome. Each row gives the calls in the year and the share of picks personality turned. It also gives the pick rate in the third of calls leaning most toward an option against the third leaning least, the researched target, the evidence and why each missing point is missing.

**Decisions that never ran (25), and why** (each cause is in `data/content/trait-decision-gaps.json` with its file and line):

| Why                                                   | Decisions                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No election in the played year (12)                   | voting turnout, backing the incumbent, the exit poll, standing again, a ballot measure, opening the door to a canvasser, donating, a rival's campaign hours, answering a poll, retelling a campaign message, a press interview and the press digging into it. The year runs January 20, 2025 to January 20, 2026; Ely held no election. |
| Only the player or the bench can start it (7)         | a candidate asking someone to volunteer or endorse (`src/bench/campaign.ts:168`, `:182`), believing a claim, how long a reply runs, blaming an official, a legislator asking the leader for a hearing (`src/bench/path-check.ts:236`), and a governor's clemency, which is in review on another branch.                                 |
| A bribe is never taken, so its chain never starts (2) | telling on a bribe and the reporter's tip. Every bribe offer was declined: the yes case never beats the honest pull of 3 (`src/core2/modules/corruption.ts:158`).                                                                                                                                                                       |
| Rare by nature (3)                                    | accepting an appointment to a vacant seat, making a will, and the recall vote.                                                                                                                                                                                                                                                          |
| A staffer takes the case first (1)                    | an official handling a constituent case personally (`src/core2/modules/constituent-cases.ts:451`).                                                                                                                                                                                                                                      |

Recalls rarely start anywhere: only an ordinance taking effect starts one, and only where the state allows a recall without grounds (`src/core2/modules/recalls.ts:159`, `:190`). Three places checked by the same script had no recall.

**Outcomes personality should shape** (`data/content/trait-outcomes.json`):

| Grade             | Outcomes                                                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Works (6)         | traits drawn to real norms by age and sex, traits correlated with each other, resting stress, how strongly an event is felt, an aide's work quality, a resident's fitness for an appointed post   |
| Works in part (7) | children resembling parents (parents are redrawn, not read; counted newborns inherit nothing), making friends, quarrels, reacting to news, coping with hardship, how others learn a trait, speech |
| Doesn't (10)      | change with age, change after life events, an ordinary worker's performance, pay and promotion, health habits, illness and death, partnering, divorce, trust in others, being persuaded           |

No engine writes a trait after a person is built, so nobody matures or is changed by a job loss or a marriage (`src/core2/choice.ts`, the trait-lean cache relies on it).

## Why the trait term is small where it is small

- **The pick is settled before personality counts.** The chooser adds personality as one reason among need, goal, drive and the module's own reasons, each weighted 1 (`src/core2/choice.ts:244`). For business founding the market-room reason is weighted 6 against a lean held within -1 to 1, so personality never moves it (measured: 0 of 36,326). (Measured.)
- **Rare choices look untouched when they are not.** A decision that almost nobody takes (running for office, founding, planning a child) is turned in few calls even when personality multiplies the odds. The matrix therefore reports, beside the turned share, the pick rate of the third leaning most toward an option and the third leaning least. (Measured.)
- **Formula decisions do not report whether personality turned them.** Thirty-five decisions add the lean to their own sums (`src/core2/trait-decisions.ts`). Their calls and average lean are counted; whether personality turned the outcome is counted only once the site uses the new shared two-way helper, `leanedYes` in `src/core2/trait-decisions.ts`. (Measured counts; turning not yet measured.)
- **Weights are not yet calibrated.** Every decision now has its own weight row, `traitWeight` plus the decision's name in `src/core2/data/parameters.json`, starting at 1. `scripts/traits/trait-calibrate.ts` sets each from its study in `data/research/trait-effect-sizes.json`. Of the 35 decisions with a study row, 16 report a number; the rest give a direction only or no source was found. (Measured.)

## What happens next

Fixes go out by family, one pull request each, from this branch's checker:

1. Everyday life and work: daily choices, shifts, school, drives; worker performance and pay.
2. Jobs, money and housing: job search, quitting, borrowing, buying a home, founding a business, moving; the borrower-to-foreclosure chain.
3. Family: partnering, divorce, children resembling their real parents, counted newborns.
4. Health and stress: health habits, illness, coping; slow trait change with age and after life events.
5. Civic life and news: voting, measures, news, persuasion and trust, believing a claim between people.
6. Campaigns and candidacy: volunteering and endorsements asked by every candidate; an election inside the first year where the place holds one.
7. Officials: attendance with duty reasons; votes, hearings, vetoes and appointments calibrated.
8. Corruption, recalls, appointments and cases: bribes weighed against the official's own money need; recalls for cause; officials' own case decisions.

Personality moderators on outcome-web links go to the outcome web's pool, not into these changes.

## Method

Place: Ely, Nevada (locality key 3223500), drawn by `drawPlace` from seed `7ae8589566f5`, built by `buildBenchWorld(seed, start, { twoLevel: true })` on main at the commit before this branch, run January 20, 2025 to January 20, 2026. Three twins of the same world ran the same year: as drawn, with every full and counted person's traits set to the middle, and with every trait turned to its opposite. A fourth twin rewrote the traits with the same values and matched the drawn world exactly, so the rewrite itself changes nothing. The year took 209 seconds with the probe on and the build 19 seconds. Commands:

```
node --import tsx scripts/traits/trait-wiring-audit.ts <seed> played|flat|mirror|copy <out.json>
node --import tsx scripts/traits/trait-wiring-matrix.ts played.json flat.json mirror.json docs/reports/trait-wiring-2026-10-20.json
node --import tsx scripts/traits/trait-calibrate.ts played.json
```

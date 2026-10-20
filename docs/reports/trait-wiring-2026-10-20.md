# Personality now reaches money, health, friendships, campaigns and officials, but opposite neighbors still live much the same year

Eight families of personality fixes are in review. Two towns drawn at random were played for a year before and after the first five families. In them, 6 and 7 more of the 84 personality decisions ran. Each decision now weighs personality at a size taken from a study, so some choices moved less, not more: missed work shifts went from mostly temperament to mostly illness. Two neighbors with opposite personalities still lived about the same year, because the choices that fill a day (work, school, the daily routine) are driven by needs and schedules. Nothing here needs the owner.

## Before and after

Places: Cedar Creek, Nebraska (locality key 3108185, seed cf03f753829c) and Bantam, Connecticut (0902690, seed c42beba65b5b), drawn by `drawPlace`, built by `buildBenchWorld(seed, start, { twoLevel: true })`, played January 20, 2025 to January 20, 2026. "Before" is main after the audit merged; "after" is main with the family, money, campaigns, health and life-and-work branches merged. The officials, civic and integrity branches were reviewed afterward and are measured in their own pull requests.

| Measure                                                                   | Cedar Creek before | Cedar Creek after | Bantam before   | Bantam after    |
| ------------------------------------------------------------------------- | ------------------ | ----------------- | --------------- | --------------- |
| Personality decisions that ran (of 84)                                    | 55                 | 61                | 53              | 60              |
| Daily activities personality turned                                       | 13.5% of 11,659    | 16.5% of 11,273   | 15.6% of 10,784 | 13.7% of 10,101 |
| Work shifts personality turned                                            | 3.3% of 18,923     | 0.1% of 18,664    | 5.5% of 15,318  | 0.2% of 15,111  |
| Borrowing decisions the probe could see, and the share personality turned | 2                  | 5,493, 10.1%      | 1               | 7,431, 6.9%     |
| Campaign volunteering asks                                                | 0                  | 197               | 0               | 628             |
| Opposite neighbors' daily mix apart (0 to 1), personality on / wiped flat | 0.49 / 0.40        | 0.50 / 0.39       | 0.75 / 0.69     | 0.74 / 0.70     |
| A year of play, probe off, one process                                    | 80 s               | 75 s              | 84 s            | 71 s            |

All measured. Work shifts moved the other way on purpose: at the general weight, temperament decided who missed work (the most and least shift-averse thirds missed at odds of 61 to 1), while the absence research finds personality barely matters (Salgado 2002). Illness now carries most missed shifts (`src/core2/modules/work.ts`, 1.7% of shifts, the national lost-worktime rate). Borrowing jumped in the count because counted borrowers now decide through the shared two-way formula the probe sees; they borrowed before too, unseen.

**Opposite neighbors.** Matching each adult to the neighbor least like them, their mixes of daily choices sit 0.50 apart with personality and 0.39 apart with every trait wiped flat in Cedar Creek: personality accounts for about a fifth of the difference between two neighbors' days. In Bantam it is about a tenth. The rest is age, work, children and money. (Measured; `scripts/traits/trait-wiring-matrix.ts`.)

**Chains seen in played years.**

- A borrower leaning toward risk (`person_ae14409830f22835`, lean 0.56) took `loan:household_35ef9f39d480f66a:2025-01-21`, missed `payment:loan:household_35ef9f39d480f66a:2025-01-21:2025-09-01` and the October payment, and the loan was charged off for lost income. The chain stops there: counted households' rent has no arrears of its own (`src/core2/modules/housing.ts:499`).
- A layoff, `event:work.job-lost:2025-10-01:work-relationship_ba3c2f7a499cfbf7`, gave `person_b475385a185c266a` a stress impulse of 0.47 scaled by their temperament and moved their brooding from 1 to 2 (`trait-change:person_b475385a185c266a:2025-10-01:...`).
- In Newfane, Vermont, `person_0f09e8ca5c3313de` endorsed treasurer candidate `person_0f09e6ca5c331078` when asked, and the endorsement's cause moved a listener's warmth toward the candidate.

## Matrix now

84 decisions (82 plus two closeness reads) and 23 outcomes. Across the eight family branches:

- Running in a played year: 61 of 84 in the measured town, plus 5 more where the town holds a 2025 election (voting, campaigns).
- Weight set from research: 36 decisions, each citing its study or the stated proxy and how the weight was found. The rest keep the owner's general weight of 1 with a gap row naming why (`data/content/trait-decision-gaps.json`): no study gives a number, or circumstances saturate the choice (applying for a job, buying a home, an owner's draw, school, answering a drive).
- Outcomes read by their owning engine: 16 of 23. Added to the six that read before: illness and death, health habits, stress after a layoff or eviction, maturing with age, change after life events, making friends, quarrels, persuasion, trust and news reaction.
- In part: 5 (job performance, earnings, coping, how others learn a trait, speech). Stopgapped: 2, partnering and divorce, which have no engine in play (`SG-TRAITS-partnerships-no-engine`).
- Never running, with the cause: a taken bribe and everything after it (every offer is declined in most towns), the player-only conversation reads, ballot measures (earliest in 2026), accepting an appointment, a will, and the clemency petition in review elsewhere.

## The fixes, by family

- **Everyday life and work:** illness now decides most missed shifts and the trait term is held to the absence research's size. School, daily routine and drives keep the general weight with their causes recorded.
- **Jobs, money and housing:** borrowing, quitting, accepting, founding and moving weigh personality at studied sizes, and counted people use the same arithmetic as named people. Applying, buying a home and an owner's draw are saturated by their circumstances and wait at the general weight.
- **Family and relationships:** time together builds closeness faster between warm people, and a quarrel costs more between grudge-holders. Partnering and divorce wait on a partnership engine.
- **Health and stress:** conscientiousness shifts who falls ill and who holds drug-use and lung conditions, with totals still the life tables'. Layoffs and evictions carry stress scaled by temperament. Personality matures with age and shifts after hardship.
- **Civic life and news:** turnout, news telling, meetings, parties, interest groups and claims are each one calibrated term. A story heard is believed or doubted by the hearer's temperament. Persuasion and trust read the hearer.
- **Campaigns and candidacy:** world candidates ask neighbors to volunteer and endorse. Every campaign decision weighs personality at Mondak's sizes instead of overwhelming odds.
- **Officials:** attendance carries duty reasons. Votes, hearings, vetoes, the rate vote and leader requests read one calibrated term.
- **Corruption, recalls and cases:** justice, tips, recalls, constituent cases and staff read their decision weights, and an official's own lean sets what their staffer is told. Bribes are still never taken in most towns: the corruption sums need the honest pull calibrated against the honesty-humility study, which is open in the pool.

## What happens next

1. Calibrate the corruption sums so low-integrity officials sometimes take a bribe (pool).
2. Give school attendance the child's illness and household circumstances, then calibrate (pool).
3. Fix the apply-for-a-job and buy-a-home reasons so circumstances vary between people, then calibrate (pool).
4. Replace the parties engine's hard split between "no party" and "independent" (`src/core2/modules/parties.ts:293`) with a sliding scale (pool).
5. Move campaign endorsements and rival hours onto their calibrated weights once the open press-endorsement and rival-campaign changes land.
6. Personality moderators on outcome-web links go to the outcome web's own pool items.

## The morning audit: opposite neighbors still live almost the same year, and 25 personality decisions never ran

At the owner's weight of 1.0, personality now turns about 1 daily choice in 7. Two neighbors with the most opposite personalities still lived nearly the same year: their mix of daily choices differed only about a tenth more than it does when everyone's personality is wiped flat. Of 82 personality decisions, 25 never ran in the year, mostly because the town held no election and the corruption, recall and campaign chains never start. Of 23 outcomes personality should shape, 6 read it, 7 read it in part and 10 do not. No decision's weight has yet been set from research. Nothing here needs the owner.

### What the player sees

- A town's daily life bends a little to personality. Personality turned 4,369 of 29,520 daily-activity choices (14.8%) and 2,003 of 50,086 decisions to go to a work shift (4.0%). (Measured.)
- Opposite neighbors live alike. In 290 pairs of adults matched to the neighbor least like them, the mixes of what they did each day differed by 0.48 on a 0 to 1 scale. With personality wiped flat, the same pairs differed by 0.43. The same person with every trait turned to its opposite differed from themselves by 0.28. (Measured.)
- Personality changes what the town's government does, but some of that is a defect. Wiping personality flat cut the year's bills from 2,375 to 911 and laws from 30 to 12. Turning every trait to its opposite gave 987 bills and 12 laws. Remarks fell from 192 to none in both twins. Party meetings fell from 298 to 30 with traits flat, and rose to 341 with traits mirrored. (Measured.) The flat and mirrored worlds moving together for bills and remarks means a few people at the extreme drive them, not a sliding scale. (Inferred; the cause is not yet found.)
- Some choices ignore personality entirely. Founding a business (36,326 weighings), going to school (15,874), buying a home (638), applying for a job (545), accepting a job (1,598) and how a strong drive is answered (1,471) were never turned by personality. (Measured.)
- One choice is all personality. Whether a legislator attends a sitting was turned by personality in 830 of 864 sittings (96%), because attending and missing score almost the same without it. (Measured.)
- Running for office turned on personality in only 10 of 10,394 weighings. That count undersells it: almost no one runs, and among the few close calls the boldest third ran at about 4 times the odds of the most cautious third. (Measured.)

### The map

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

### Why the trait term is small where it is small

- **The pick is settled before personality counts.** The chooser adds personality as one reason among need, goal, drive and the module's own reasons, each weighted 1 (`src/core2/choice.ts:244`). For business founding the market-room reason is weighted 6 against a lean held within -1 to 1, so personality never moves it (measured: 0 of 36,326). (Measured.)
- **Rare choices look untouched when they are not.** A decision that almost nobody takes (running for office, founding, planning a child) is turned in few calls even when personality multiplies the odds. The matrix therefore reports, beside the turned share, the pick rate of the third leaning most toward an option and the third leaning least. (Measured.)
- **Formula decisions do not report whether personality turned them.** Thirty-five decisions add the lean to their own sums (`src/core2/trait-decisions.ts`). Their calls and average lean are counted; whether personality turned the outcome is counted only once the site uses the new shared two-way helper, `leanedYes` in `src/core2/trait-decisions.ts`. (Measured counts; turning not yet measured.)
- **Weights are not yet calibrated.** Every decision now has its own weight row, `traitWeight` plus the decision's name in `src/core2/data/parameters.json`, starting at 1. `scripts/traits/trait-calibrate.ts` sets each from its study in `data/research/trait-effect-sizes.json`. Of the 35 decisions with a study row, 16 report a number; the rest give a direction only or no source was found. (Measured.)

### What happens next

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

### Method

Place: Ely, Nevada (locality key 3223500), drawn by `drawPlace` from seed `7ae8589566f5`, built by `buildBenchWorld(seed, start, { twoLevel: true })` on main at the commit before this branch, run January 20, 2025 to January 20, 2026. Three twins of the same world ran the same year: as drawn, with every full and counted person's traits set to the middle, and with every trait turned to its opposite. A fourth twin rewrote the traits with the same values and matched the drawn world exactly, so the rewrite itself changes nothing. The year took 209 seconds with the probe on and the build 19 seconds. Commands:

```
node --import tsx scripts/traits/trait-wiring-audit.ts <seed> played|flat|mirror|copy <out.json>
node --import tsx scripts/traits/trait-wiring-matrix.ts played.json flat.json mirror.json docs/reports/trait-wiring-2026-10-20.json
node --import tsx scripts/traits/trait-calibrate.ts played.json
```

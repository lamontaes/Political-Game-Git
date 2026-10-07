# Session 18 — Everyday life: jobs, relationships, moves, memories

Read RULES.md (same branch) first. The CTO updates this file during the day — re-read every 10 minutes and after every PR.

## Goal
People near the focus change jobs, start and end relationships, move, and form memories and beliefs, each decided by the person (traits weigh in).

## Milestones
1. M1 (45 min): root cause posted for each: jobs, partnerships, moves/housing, friendships, memories/private beliefs.
2. M2: job starts/ends near the town.
3. M3: partnerships and moves.
4. M4: memories and private beliefs written from things that happened.

## Endpoint
30-day watch near the town (2 seeds): ≥3 job changes, ≥1 partnership event, ≥1 move, memories written for people in the focus circle; counts posted.

## CTO instructions and findings (do these)
- The CTO adds root causes here.
- CTO FINDING: job listings open only for the player and only from screen code (job-market.ts ~865); residents looking for work always find no opening (people-goal-review.ts ~576). Open listings for everyone from employers' recorded needs.
- CTO FINDING: readers of yearly pay disagree (town-labor-market.ts ~266, job-market.ts ~250 vs household-pay.ts ~104), so layoffs never pick a town-paid worker; use one reader.
- CTO FINDING: background developments (campaigns.ts ~2423) are registered but never scheduled.
- CTO FINDING (verified): jobs, couples, homes, moves and civic acts all run inside ONE quarterly handler, migrationReviewHandler (migration/review.ts ~233–283), first due at opening + MIGRATION_REVIEW_INTERVAL_DAYS = 91 (review.ts ~211, ~222). Nothing happens for 90 days, then everything lands on day 91 (15 of 16 couples split that day). Fix: first review at opening, and stagger people within the quarter so changes don't land on one day; find and damp the day-91 breakup burst (≤2 separations per 100 couples per quarter).
- CTO FINDING: the review covers only the anchor's town; the other ~14,900 people never get jobs, couples or births. Run it for every place (focus circle often, the rest on the weekly batch from Session 19).
- CTO FINDING: every generated resident gets the same goal ('learning') — goal = byLean(sociability…) (life-personality.ts ~78) reads sociability from childhood school tags (people-upbringing.ts ~1414–1421) that generated residents don't have. Derive it from the seeded personality; give unemployed working-age adults a find-work goal at opening.
- CTO FINDING: watched mode returns early in passOrdinaryDaysUnchecked when nobody is played (ordinary-life ~424), skipping job applications, offers, household pay and reaching-out scenes — the only trigger of contact.answer. Route NPC goal calls through proposeContact so the other person answers via contact.answer (with traits). Done when ≥10 contact.answer traces citing personality in 30 days.
- CTO FINDING: memories, perceptions and beliefs are only written from player conversation/speech paths. Write a memory for everyone involved when something happens to them (job lost, breakup, bereavement, a law that touched them).

When the endpoint is reached: POOL.md rows, oldest unclaimed first (post CLAIM on #2424).

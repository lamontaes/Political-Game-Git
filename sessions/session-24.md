# Session 24 — Hardcoded text removal, part 1

Read RULES.md (same branch) first. The CTO updates this file during the day — re-read every 10 minutes and after every PR.

## Goal
Screens show only record data, approved control names and English-engine text; every listed PR lands.

## Milestones
1. Each item: merge origin/main, gate, full-screen screenshot of the screen from a NEW game in a random place on main and on the branch, both in the PR body, then READY (SCREEN).
2. Pace: at least 2 SCREEN PRs ready per hour.
3. Removal only — never reword or add a sentence.

## Endpoint
Every item below is READY with before/after shots (or merged), and a final #2424 list of PRs with their shot links.

## CTO instructions and findings (do these)
- Journal filler years: delete the `for (let year = 18; year < age…)` loop in character-history.ts and the three no-gap assertions in pre-start-adult-history.test.ts (owner: 'Delete both')
- Legacy feature flags and the paths only they reach
- OWNER 10:55 a.m.: remove the dating/romance conversation intent entirely ('Ask if they would like this to be a date', life-conversation.ts:104) and toy intents like 'Suggest playing a game together' from the player's conversation options — removal only.
- NOTE: the Contact dialog / ask-to-meet / ask-out controls were removed yesterday (OW-20 #2923). What remains is the conversation-intent option 'Ask if they would like this to be a date' (life-conversation.ts:104) and toy intents — remove those. Also take over the two sent-back PRs: #2997 News 'Around you' still renders sentences, #2999 Places shows 2,075 minutes for a 20-minute trip.

When the endpoint is reached: POOL.md rows, oldest unclaimed first (post CLAIM on #2424).

# Session 20 — Speed: catch up on look, instant days

Read RULES.md (same branch) first. The CTO updates this file during the day — re-read every 10 minutes and after every PR.

## Goal
Pressing the day button feels instant; anything outside the focus circle is computed only when the player opens it.

## Milestones
1. M1: catch-up on look: opening a person/place/body outside the circle brings just that entity to today before the screen shows it.
2. M2: no main-thread task over 100 ms when pressing Day (heavy work in a worker or split).
3. M3: per-click timing shown in the dev overlay and posted.

## Endpoint
Day button under 100 ms per press in the browser in 3 random places, and opening an outside person under 300 ms; numbers posted on #2424.

When the endpoint is reached: POOL.md rows, oldest unclaimed first (post CLAIM on #2424).

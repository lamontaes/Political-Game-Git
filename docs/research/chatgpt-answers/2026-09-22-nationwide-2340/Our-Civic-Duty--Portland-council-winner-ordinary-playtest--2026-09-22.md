# Portland City Council winner route

An isolated ordinary-player run reached Portland candidacy and a council win: Sasha Rush won 64.7% to 35.3% on February 2, 2026. The rendered office view identified the City Council seat and directed the player to Government → Local meetings and records. The runner then stopped on its own 30-second locator timeout before opening that route. Records, meeting, vote, consequences, and return flow are **NOT RUN**. No gameplay defect was demonstrated; this was a harness locator mismatch. Native/human acceptance is **NOT RUN**.

## Frozen source and isolation

- Workspace: `/Users/lamontae/Documents/PG-LAND`; branch `codex/art-director-sep22`.
- Local HEAD and `refs/remotes/origin/main`: `2ed3a0fe778d7f6e3e4780daa9054e1537f87ec5` (checked before and after the run).
- Used the existing `gameMounted` fixture pattern in an isolated headless browser context and a dev server on port 4172, launched through `npm run storage -- run e2e-capture -- …`. The port was selected after checking it was free. The script's `finally` closed its browser and terminated its own server. No screenshot or trace was written; the runner's terminal output was the retained runtime evidence. The task workspace had pre-existing unrelated dirty art and harness files; none were changed by this audit.
- Place identity was Portland, Oregon, Census place GEOID 4159000, compiled government key us-or-portland, local office key local-government-211254-governing-body. See the Portland identity test in `src/simulation/municipal-place-identity.test.ts`.

## Player journey actually reached

1. The app mounted through `gameMounted`; created an unsaved ordinary life as Sasha Rush, age 34, in Portland, Oregon, starting January 5, 2026.
2. Filed for the City of Portland governing body. The campaign displayed 28 days remaining.
3. Committed each visible weekly campaign plan, handled offered scheduled campaign actions through their visible “Do it now” controls, and used the visible “Run the rest of the week” controls. The clock advanced through the scheduled weeks to the election decision; no repeated day advance was used as a substitute for an offered action.
4. On February 2, 2026, the visible election result read: “Sasha Rush won. The seat is theirs, and so is everything that came before it.” Result: Sasha Rush 64.7%; Olivia Campos 35.3%.
5. Opened the Work/office view. The rendered page said: “You sit on the City Council of Portland, since 2026-02-02. Its meetings and business are under Government, in Local meetings and records.” This is direct player-visible evidence of the won seat and the stated next route.

## Stop boundary and assessment

The runner next queried test ID office-section and timed out after 30 seconds with “waiting for getByTestId('office-section')”. The rendered office state exposes this seat as town-seat in `src/player/PlayerGame.tsx`; office-section is used by a different branch. The timeout output already contained the office seat text above. This is a test-harness mismatch, not evidence that the game failed to show the seat. The server/browser were cleaned up by the runner; no second launch was made.

The established neighboring E2E journey checks candidacy and campaign result, then the `town-seat` office view and (for a compiled-city fixture) municipal standing. See `tests/e2e/town-governing-body.spec.ts`; it was not executed for Portland. Portland-specific source inspection records that the municipal rule pack is incomplete because the passage threshold is missing (`src/simulation/municipal-place-identity.test.ts`). This does not establish what the player sees or can do in Portland's municipal screen.

**NOT RUN:** campaign return after the result; navigation to Government → Local meetings and records; Portland municipal standing; reading/scheduling/attending a meeting; any office action, ordinance vote, recorded consequence, save/reload continuity, and return to the player loop. No vote or meeting behavior is inferred from the source test. No defect with a severity or code owner is filed because none was demonstrated.

## Evidence classification

- **Executed:** isolated browser play from ordinary life creation through filed candidacy, weekly campaign handling, election resolution, and rendered office-seat state.
- **Source inspected:** Portland identity/rule-pack assertions, `PlayerGame.tsx` seat rendering, and neighboring E2E route.
- **Human/native acceptance:** NOT RUN.
- **Runtime evidence path:** transient runner terminal output; no persistent screenshot, video, or trace. No test suite was executed as part of this playtest.

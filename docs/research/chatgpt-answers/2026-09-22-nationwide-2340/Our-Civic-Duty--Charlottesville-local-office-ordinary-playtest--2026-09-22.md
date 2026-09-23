# Charlottesville reaches local candidacy, then pauses for a campaign commitment

The corrected Charlottesville browser route entered an ordinary life, filed for the City of Charlottesville governing body, and ran the first committed campaign week. The first Week press advanced January 5 to January 6, then stopped at a fundraising session waiting on the player. The next press was left unresolved for 60 seconds and the date stayed January 6. The Week control says it stops for anything needing the player, and the campaign offered “Do it now” and “Let it go.” This does not demonstrate a clock defect. Election result and all council play remain NOT RUN.

## What the player saw

The ordinary creator began a 34-year-old life in Charlottesville, Virginia. Campaigns offered “Member of the governing body — City of Charlottesville” alongside Virginia’s House and Senate seats. Filing displayed “Ware for the City of Charlottesville governing body · 28 days to go.”

The player committed the proposed field week and selected “Run the rest of the week.” The three field shifts showed “Done.” The remaining fundraising call session was scheduled for January 6 at 10:00 AM and offered “Do it now” and “Let it go.” A Week press moved the visible date from January 5, 2026 to January 6, 2026. The next Week press was not followed by a date change during a 60-second wait; the visible page still showed January 6 and the unresolved session.

The Week control’s source title says it lets the week run through the routine and “Stops for anything that needs you” ([ShellNav.tsx:537](/Users/lamontae/Documents/PG-LAND/src/player/ShellNav.tsx:537)). The campaign panel likewise says “Run the rest of the week” stops at anything already on the calendar ([CampaignWeekPanel.tsx:275](/Users/lamontae/Documents/PG-LAND/src/player/CampaignWeekPanel.tsx:275)). The one-day move stopped at an explicitly visible player choice, as those disclosures describe. The follow-up date wait did not resolve that choice, so its timeout is unknown behavior beyond the documented stop.

## Source findings

**Measured by source query:** Charlottesville resolves to local office key `local-government-194177-governing-body` and municipal government key `us-va-charlottesville`. The ordinary candidacy projection adds locality government bodies beside state offices through `electiveOfficesForJurisdiction` ([candidacy.ts:92](/Users/lamontae/Documents/PG-LAND/src/simulation/candidacy.ts:92)). The campaign page rendered that local choice during the run.

**Measured by source inspection:** the player-office projection reads a held municipal-office participation and labels whether a compiled city surface is available ([local-governing-seat.ts:37](/Users/lamontae/Documents/PG-LAND/src/presentation/local-governing-seat.ts:37)). Municipal ordinance authority checks for an actual member seat before granting introduction or voting ([municipal-public-work.ts:470](/Users/lamontae/Documents/PG-LAND/src/simulation/municipal-public-work.ts:470)). These source paths do not prove that this election winner reaches the municipal records surface.

## Findings and harness observations

No player-facing gameplay defect was demonstrated. Severity and owner: none assigned.

**Discarded Kentucky harness observation:** an earlier Paducah test stopped before election resolution because its helper waited for a day control absent from the Campaigns hub. The shell had separate Day and Week controls. The owner redirected this audit away from Kentucky, so this remains only a test-helper observation with no product conclusion.

The helper lives in [campaign.ts:61](/Users/lamontae/Documents/PG-LAND/tests/e2e/support/campaign.ts:61). Harness severity: P2 acceptance-coverage issue. Owner: E2E campaign support maintainers. Its local error context and screenshot/trace are under `test-results/runs/e7e32da3-0e65-46c5-a894-b636792ba8c8/results/town-governing-body-Paduca-81f30-race-a-life-can-run-and-win-chromium/`.

**Corrected Charlottesville harness observation:** the first standalone browser attempt omitted the repository's `gameMounted` wait and timed out before New Game, while the page still showed “Loading your game…”. It was not application evidence. The final attempt used `gameMounted` from `tests/e2e/fixtures.ts`, mounted the title, and proceeded through the campaign steps above. No source edits were made.

## What remains open

The second Week advance was observed for 60 seconds without resolving the scheduled fundraising choice. Treat this as a timeout at a pending player decision, not as a confirmed permanent freeze. The result, winning office transition, municipal records, first public council meeting, ordinance agenda, vote, consequence, save/reload, and return flow are NOT RUN. Human/native acceptance is NOT RUN. No screenshot or trace was written for the Charlottesville attempt; its output was returned in the runner session only.

## Source identity and execution

- Local `HEAD`: `2ed3a0fe778d7f6e3e4780daa9054e1537f87ec5` on `codex/art-director-sep22`.
- Upstream tracking ref `origin/main`: `2ed3a0fe778d7f6e3e4780daa9054e1537f87ec5`.
- The exact frozen source and unrelated working-tree art changes were preserved.
- Executed one guarded final Charlottesville browser session on port 4169 with a fresh in-memory browser context and fixed seed `charlottesville-council-winner-audit-20260922`. It used the existing `gameMounted` wait and ordinary pointer controls. It reached campaign filing and the first weekly plan; it stopped with a pending player choice.
- The owned browser and identified Vite server exited through the runner cleanup path. A follow-up listener/process check found no process on port 4169.

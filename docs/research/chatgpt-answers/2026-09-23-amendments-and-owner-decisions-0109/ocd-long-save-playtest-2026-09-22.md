# Santa Fe long-save playtest is not run

An adult ordinary-life save in Santa Fe could not be played on the assigned main revision today. The only active browser runner on this physical host is using the dirty art checkout, and both storage gates refused another run. The source supports the requested route, but the ordinary-player journey, save continuity, return flow, responsiveness, and elapsed time remain unaccepted.

## Source inspection

At origin/main SHA `47b0e304e87fa75d1d146d9ac681b4c46c9dbb50`, the player surface provides new-life setup, save, continue, and open flows (`src/player/PlayerGame.tsx:408`). It accepts a birthday, state, and hometown through the creator. Source inspection found Santa Fe, New Mexico in the generated national places (`src/simulation/national-places.generated.ts:1`). These are source findings, not observations from a player session.

Ordinary time progression passes through `passOrdinaryDays` (`src/presentation/ordinary-life.ts:330`).

Browser save writes go through `BrowserWorldRepository.save` (`src/presentation/browser-world-repository.ts:484`). Reopening a saved life goes through its load method (`src/presentation/browser-world-repository.ts:611`).

## Planned reproduction and result

1. In a disposable browser profile on the exact main head, start a new life, set an adult age, choose New Mexico and Santa Fe, and use Everyday life.
2. Enter play and advance time through ordinary player controls for several weeks, noting responsiveness and only information visible to the player.
3. Keep the life, return to title, reopen it from Saved games, verify the world continues from the stored state, then return to title again.

**Expected:** the selected adult Santa Fe life is playable; the requested time advances through the normal UI; saving and reopening preserves its world state; and the player can return to the title screen.

**Actual:** **NOT RUN.** No UI state, elapsed time, save, reopen, or return flow was observed. No performance timing was measured. No defect was demonstrated, so there is no severity or implementation owner to assign.

## What happens next

The storage gate refused both browser capture and new-workspace requests because PG-LAND's existing run-output folder is at or above its 6 GiB limit. Storage status showed 9 active registered workspaces against an 8-workspace limit. A Playwright run was already active against the art checkout, with a development server on port 4173. Its browser profile and server do not identify the assigned main head. I left that runner, its files, owner saves, and workspace registry untouched. No playtest defect has been routed. After a registered disposable-output cleanup restores headroom and a workspace slot, and the art runner releases the browser, rerun the listed journey against the then-current exact main head. Record observed time, save/reopen continuity and return flow in a disposable profile.

## Method

Source inspection read files directly from the fetched main ref. The working checkout was the art branch at `867e8df14a3cae04404bb2ee9c890ae40ebae7d2`, with untracked art, output, and E2E files. No product files were changed. No unit tests, E2E tests, or human/native acceptance checks were run. The speedup reported in the merge note was not measured in this audit.

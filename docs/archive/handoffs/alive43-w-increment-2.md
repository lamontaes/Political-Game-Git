# ALIVE43 ROLE W → LAND and L — increment 2 (W2)

READY FOR RECEIVING REVIEW — VALIDATION PENDING (full `npm run validate`, e2e
and browser not run for W2).

|                  |                                                    |
| ---------------- | -------------------------------------------------- |
| Branch           | `claude/alive43-w-world-parties`                   |
| Base             | main `003b45ff365a51665139203a1d4b663ba441c093`    |
| W2 source commit | `e2b74455` (parent W1 handoff `0fcd4688`)          |
| Contract         | `alive43-world/v1` plus the W2 encounter API below |

## What W2 does

Each new life's home area has a chapter of each national party
(`<County> Democrats`, `<County> Republicans`), each with one persistent local
organizer who is publicly affiliated with that party. Chapters meet in the
shared community room (`ordinary-life:meeting-room`); no party building is
implied. While ordinary days pass, an organizer's registered outreach
transition asks the decision engine whether to invite the player to the next
open meeting; "not now" is always available and only the organizer's recent
experience weighs. An invitation is a private ask event, a told-by knowledge
record for the player and a tentative hold with the authored 20-minute journey.

- Accept: `acceptChapterInvitation` turns the hold into a commitment the day
  skip stops at.
- Attend: `attendChapterMeeting` (presentation) runs the existing
  `performVenueActivity`, then records the meeting and a relationship
  interaction with the same organizer.
- Decline: the existing `declineVenueActivity`. Lapse: the existing
  `passOrdinaryDays` decline when time passes the hold. No penalty either way.
- Join/leave: `joinPartyChapter` / `leavePartyChapter`, explicit and
  time-neutral. Membership is `membership:party-chapter`, never a registration
  or public affiliation; one active chapter at a time; records are kept.
- Read: `projectPartyEncounters(world, personId)` (pure), states
  `offered | accepted | declined | expired | attended`.

Older saves get no chapters and advance unchanged.

## Files

- New: `src/simulation/living-world/party-chapters.ts`,
  `src/presentation/party-chapter-actions.ts`,
  `src/presentation/party-chapter-encounter.test.ts`.
- Shared adapters: `src/presentation/opening-life.ts` (calls
  `ensureHomePartyChapters` after the W1 opening),
  `src/simulation/campaigns.ts` (one handler entry in
  `createCampaignElectionTransitionRegistry`),
  `src/simulation/living-world/index.ts` (export).

## Checks actually run

- `tsc --noEmit -p .`: exit 0.
- W2 proof `party-chapter-encounter.test.ts`: 8 passed, exit 0.
- Negative control: with invitations disabled, the 4 encounter tests failed on
  a missing offer; the file was restored byte-identical.
- Full `vitest run` on the W2 source (before this commit, content identical):
  5394 passed, 6 failed, 29 skipped, exit 1. Classified against a clean
  `003b45ff` worktree:
  - `people-visual4-review` wardrobe plan timeout: fails on main too.
  - `nationwide-local-governments` full catalog coverage timeout: load only;
    passes in isolation on W2 (with `dehardwire-census`, 62/62).
  - `scripts/prose-corpus/corpus.test.ts` and `anchor-cli` ×3 /
    `anchor-crossbranch`: pass on main, fail on W because new source files
    change the committed coverage artifacts. Pending LAND union regeneration
    (`npm run corpus:prose`). `corpus:prose -- diff` on W2 reports no added,
    removed, reworded or regrounded sites and zero warning deltas.
- `dehardwire-census.test.ts` rewrites `docs/dehardwire/census.json`
  (`runtimeReachableModules` 465 → 471 with W's modules). Not committed here;
  regenerate on the union.

## Remaining limitations

- Only the home area's chapters exist; other places' chapters are not made.
- Chapter meetings have no agenda, speakers or decisions yet.
- W3 background developments are not in this increment.

## Receiver action

LAND: receive `claude/alive43-w-world-parties` with L's mount, then regenerate
`corpus:prose` and the dehardwire census on the union before full validate.

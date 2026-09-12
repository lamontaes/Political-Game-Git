# RECOVERY25 NEWS

Status: completed

## Contract

Extend the existing canonical News reader without adding a publisher, outlet
registry, external feed, or hidden-information path. Preserve search,
corrections, person links, chronology, and publication identity.

## Delivered

- The reader derives For You, All, and outlet views from the existing canonical
  publication projection and represented outlet keys.
- For You uses only direct canonical person references and explicit outlet
  follows, with a visible reason; All retains every publication.
- The outlet view has a compact masthead, shared search, published-story count,
  and Follow/Unfollow control.
- Followed outlet keys persist in the existing per-life interface-state record
  at version 3. Version 1 and 2 records remain readable with no follows, and
  pins, journal, wardrobe, and other preferences remain intact.
- The ordinary `PlayerGame` News route supplies the controlled person and shell
  preference action. Publication writers, press producers, World, time,
  knowledge, reputation, and external services are unchanged.
- The compact workspace now uses the full phone viewport and keeps the News
  controls above the persistent rail instead of squeezing the reader beside it.

## Verification receipt

- Focused unit/integration: 46 tests passed.
- Existing News Playwright file: three relevant journeys passed at the default
  budget; its longer pre-existing save/reload journey passed alone with a
  60-second budget.
- Full Vitest attempt: 4,481 passed, 6 skipped, 16 initially failed from stale
  generated prose/shard bookkeeping, sandbox port denial, and concurrent time
  budgets. The generated inventory was refreshed, the new browser coverage was
  folded into the existing News shard, and every reported failure passed on a
  scoped rerun (141 tests plus 4 visual tests plus 6 localhost lifecycle tests).
- Formatting, ESLint, app TypeScript, node TypeScript, production build, prose
  inventory freshness, and browser shard inventory passed.
- Desktop 1440×900 and compact 390×844 screenshots were inspected manually.

## LEARN

Two recurring checks now live at the narrowest durable point: the compact
browser test catches the shell rail squeezing a feature workspace, and the
existing two-story search test uses the complete visible headline instead of
assuming a generated token is unique.

## Handoff boundary

The leaf owns the public-information projection, reader component and its
feature-local styles, plus the minimal typed shell preference needed to save
follows. `PlayerGame` receives only the current props/actions required to mount
that leaf. No press producer or publication writer changed.

# Shared ordinary-routine time hook

WEEKEND19 E owns this contract. Education (WEEKEND19 F) consumes it; it is not
a second clock or a parallel scheduler.

## What it is

`FutureTransitionHandlerRegistry.routine` is an optional `RoutineTimeHook` on
the existing future-transition registry. `advanceWorldMinutes` remains the only
sub-day advancement path. When the composed registry carries a routine hook,
requested time may materialize and complete **auto-resolvable personal work
windows** as it crosses their authored ends. Pay still uses the existing
`life-paths2:pay` due item the day after a completed shift.

Campaigning, political work, and any scheduled activity that is not marked
auto-resolvable still block generic skips. The controlled person remains
excluded from automatic staff-work progress.

## Window terms

Hours come from accepted job catalog terms (`sessionStartMinute`,
`sessionMinutes`, `minimumGapDays`). The shop-assistant path is 09:00–13:00,
not a universal 09:00–17:00. Employment records without those terms do not
invent a schedule. Legacy saves do not receive backdated attendance or wages.

## Education

Study sessions are projected only when F registers auto-resolution. Until then,
scheduled classes keep blocking skips. F should reuse this hook rather than
advance a separate attendance loop.

## UI

Menus and read-only projections do not perform work. `CareerPathsPanel` and
`LifePathsPanel` expose **Perform work** for an explicit shift. Ordinary-day
fast-forward composes `LIFE_PATHS2_HANDLERS` through
`createCampaignElectionTransitionRegistry`.

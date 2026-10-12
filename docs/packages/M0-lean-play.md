# M0-lean-play: fast days

**Who:** the Claude engineering account, Sonnet at high. A separate Claude session checks it.
**Branch:** stacked on SOL-1258's latest `pool/P8-part-1`, in commits for SOL-1258's review.

## Build

1. Read tracing, validation, copying and freezing become a debug switch: on in tests and the bench, off in play.
2. Stop copying a worker's whole memory on every work shift (`src/core2/work-attendance.ts`); record only what changed.
3. Cut the throwaway objects behind the garbage collection time the speed map found (#3975).
4. Save "why" reasons only for the player and the people they deal with.

## Done when

A town's game year runs in under two minutes in a random place, measured once, with the guard's 31-day paired run showing no change in what happens.

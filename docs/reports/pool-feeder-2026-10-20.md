# Pool feeder, October 20, 2026

The pool was close to running dry overnight, with 15 items a builder could take. The pool feeder wrote specs, research and rulings so that blocked work became buildable, and the status below is updated every hour.

## Status at 08:10 UTC

Main has no open items left: builders took all of them while this work waited to merge. PR #5541 holds everything below and, once merged, gives builders 78 items with nothing in front of them. It is ready and conflict-free, and the pool check passes on its head. Since 05:45, other sessions claimed or opened five of its items, and those carry main's status. Two new thin items from main were filled in.

## Status at 05:45 UTC

Builders can now pick up 96 open items with nothing in front of them, up from 15, once the two pool-feeder PRs merge. The pool check passes.

- **Items unblocked:** 94 blocked items are now open. Some open with an `after:` gate and come up in Next up by themselves when the items they wait on are done.
- **Specs written:** 102 existing items were rewritten (the 94 above and the 8 that failed the pool check). 55 new items were added: 20 from open stopgap rows that had no live item, and 35 parts split out of large items.
- **Research rows:** 78 stopgap rows across 12 research items are written up in `docs/research/pool-feeder-oct20/`. About 17 are sourced from pages fetched this session or on Oct 19. About 42 are estimates with a spread, and about 21 are mechanics for a builder. 61 of the rows reuse the Oct 19 pass. The 12 research items now read as build work and are open.
- **CTO calls:** 22, recorded in `docs/coordination/OWNER-DECISIONS.md` under "Oct 20, night: acting CTO rulings from the pool". There are no new owner questions.

### Still blocked, by reason

- **Duplicates, for the CTO to drop (9):**
  - people-partnerships-counted-and-rates
  - people-partnerships-full-people-form
  - people-partnerships-full-people-end
  - people-stopgap-residents-missing-jobs
  - office-stopgap-office-day-federal-president-missing-mechanic
  - core-stopgap-rows-never-hit-in-play
  - laws-reach-b-medicaid-coverage
  - director-speech-builder-occasion, which other items have overtaken
  - release-stale-claims-two-days, which is obsolete
- **Deferred to 1.0 by the owner (1):** core-stopgap-membership-dues-assumed-data, because of unions.
- **Waiting on art (1):** director-stopgap-scene-placeholder-art.
- **Not scheduled (6):** the M6 and M7 roadmap items, which are left for the weekly reschedule.
- **Skipped (about 19):** an open PR changes these items' text, so the pool feeder did not edit them. They include core-speed-cash-journal-posting, world-customers-move-between-sellers, the jobs-entry items and world-water-violations-producer.

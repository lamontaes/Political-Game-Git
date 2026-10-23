# Lead order: speed (weekend of Oct 24, 2026)

Current as of 2026-10-24 (written by the acting CTO from main and the open PRs on the night of Oct 23)

The rule (AGENTS.md, "Speed"): a town's game year runs in under two minutes; no change makes a year more than 20 percent slower than its base, measured on the same base and machine, one process at a time; never scan the whole world or its history every day. Today a dense town's year takes about three minutes, and later years run slower than the first.

## Who

- **Lead:** one Opus session, high effort. It owns the speed measurements and every `core-speed-*` item plus `speed-year-three-within-band`.
- **Helpers:** Sonnet, at most two at once (3-2-1 rule), **one module each**; two helpers never touch the same module.
- **Skill:** `.agents/skills/lead-session/SKILL.md`.
- **Channel:** your section of `docs/coordination/LEADS-2026-10-24.md`, every two hours.

## Where it stands (checked Oct 23, night)

- **Dense town, year one:** Long Hill, Connecticut (place key 0943580, seed `m7b`) ran 186.7 s on main on Oct 22 (`npm run speed:year -- --seed m7b --exclusive`, 4-core cloud container). With the 64 MiB young generation the policy and the play server already use, 180 s (#5820, draft; the 128 MiB question is in that PR). The limit is 120 s.
- **Merged since:** #5834 (the Oct 20 rise does not reproduce; one growth filed) and #5835 (a staff review reads candidates from the town's index, not every person once per official).
- **Profile:** flat. Garbage collection about 21 s at 64 MiB; nothing named above 3 percent: `postCashJournal` 6.6 s, `makeIsoDate` 5.2, `projectCashJournal` 4.1, `parameter` 3.6, `recordWorkAttendance` 2.8, the counted births passes 4.1, `activate` 2.2. The live heap is about 900 MB of opening data that every major collection walks.
- **Later years:** Bedford, Wyoming (seed `9a4dd331ace7`) ran 49, 88 to 96 and 125 to 134 s for years one to three. The growth is people with causes weighing contact with everyone they know: offers per activation 11, 41 and 83.
- **Open items:** `core-speed-year-over-limit-dense-town` (p1, the umbrella), `speed-year-three-within-band` (p1, new), `core-later-years-slower-drive-holders-offers` (unblocked Oct 24: build the recommended version behind an `owner-decision` stopgap), `core-speed-gc-churn`, `core-speed-allocation-volume-flat` (L), `core-speed-opening-heap-pooled` (L), `core-speed-cash-journal-posting` (blocked on a journal design), `core-speed-journal-bigint`, `core-speed-date-parse-callers`, `core-speed-pair-key`, `core-speed-school-day-memo`, `core-speed-staff-candidates-scan` (check against #5835), `core-speed-director-watch-all-slow`, `core-speed-opelika-year-memory-growth`. Four items read `in-pr` against bundle PRs (#5076, #5180, #5196); check whether those PRs still hold the work and reopen the items if not.

## What to do, in order

1. **Start.** Read `AGENTS.md`, `lead-session`, this order and your channel section. Write your first status.
2. **Fix the base.** Pick one machine and keep it all weekend; record its cores and memory. Land #5820 (speed:year at the policy's young generation) first so every number is measured the way the game runs. Base runs: Long Hill `m7b` year one, three runs; Bedford three years; one place drawn from all 56, named. Post them in the channel.
3. **Profile and list.** A CPU profile and an allocation-site profile (the inspector's sampling heap profiler with collected objects included; method in the umbrella's Notes) of Long Hill's year and of Bedford's years two and three. Group the top allocations and the top scans **by module** and write the table into the umbrella's Notes. Any loop over every person, household or record each day is a scan: replace it with an index or act on the day something changed.
4. **Assign.** Each fix is one bounded item (split the L items before building), one module, one helper. Order by seconds saved per hour of work. The two structural ones come first: fewer, larger long-lived opening objects (`core-speed-opening-heap-pooled`) and allocation volume across the small allocators (`core-speed-allocation-volume-flat`).
5. **Prove each fix on the same base:** before and after on the same machine, same seed, one process, in the PR body with the profile lines it moved. A fix that saves less than run-to-run noise is not shipped; say so in its item.
6. **Later years:** `speed-year-three-within-band` with `core-later-years-slower-drive-holders-offers`. The owner is asked whether people with causes contact only people they know (OWNER-DECISIONS.md, Open); build that, ranked weekly, behind the stopgap, and show the activism acts per cause by drive record id before and after.
7. **File what you find.** Never ask in chat.

## Rules that bind this

Speed, as above. No dice: a speed fix never changes who does what unless the owner ruled it; an exact change shows identical world fingerprints. One model, two tiers. Bookkeeping is a debug switch: measure with it off. Replace, never layer: a faster path deletes the slow one.

## Done for this lead

Long Hill's year (`m7b`) under 120 s in three runs on the fixed machine, year three within 20 percent of year one in Bedford and in a drawn place, the umbrella and `speed-year-three-within-band` done, and a before-and-after table by module in the channel.

**How the owner will play it:** he starts a new game in a large town, skips a year, and it finishes in under two minutes; the third year takes about as long as the first.

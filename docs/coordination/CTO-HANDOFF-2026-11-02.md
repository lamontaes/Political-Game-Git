# CTO handoff, Nov 2, 2026

The owner's second account is near the end of its weekly usage, so this file tells his other account how to carry on. Every session is still working; nothing has been stopped. The owner asked for it on Nov 2: "Everyone keep working like normal... be sure that progress is recorded so that when you do run out of usage, my other account can know what's going on."

## First three things

1. **The owner's three mocks** (a law's page, the Issues list and Budgets), sent to him in chat on Nov 1 at 22:45 UTC, are in `docs/mocks/2026-11-01/` on the lane's mocks branch. Ask him to approve, change or start over each. Two points are open: the Issues list is still a grid of cards, which he said doesn't look like a real game menu. And the Budgets mock puts Budgets under a Money menu instead of a tab in Politics. The lane builds neither screen until he answers.
2. **A Mac build** (`release-package.yml`, workflow_dispatch on main) once #7080, #7105, #7074 and #7077 are merged. v0.73.0 (Nov 1, 21:15 UTC) is the newest. That build carries the montage, the couch fix and the no-talk-no-click rule; tell him what he can play in it.
3. **Read every session's newest status block** and keep the checkers even: move overflow to an idle checker and tell both.

## Who is running (all on the second account; ids in CREW.md)

| Line                                                 | What it is doing                                                                                                                                       | Open PRs                                                                                                   |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Words (Opus)                                         | the owner's v0.73.0 points: the address, histories, the talk after the address, the clerk visit and tutorial, the paper                                | #7106, #7108, #7103, #7101, #7094, #7090, #7070 (the address #7080 is with Checker 4)                      |
| Play-first lane (Sonnet)                             | the owner's screens; now the campaign acts as scenes, 3 of 6 done                                                                                      | #7112, #7111, #7109, #7105 (montage), #7100, #7097, #7096, #7095, #7087, #7083, #7077, #7074, #7061, #6971 |
| Governing lead (Opus)                                | counted vote split (branch `governing/counted-vote-share`), money refit with press-staff households, one council race, past races' votes and districts | #7104, #7098, #7085                                                                                        |
| Laws lead (Opus)                                     | medical debt; every state governing (U1 merged, U2 spec in `docs/work-orders/`)                                                                        | #7036 (needs the speed lead's timing before regate)                                                        |
| Speed lead (Opus)                                    | folds for long saves; group quarters                                                                                                                   | #7110, #7102 (carries the default-heap proof for `law-wiring-housing.test.ts` at seed hr-fresh-9c2)        |
| Lives lead (Opus)                                    | every life simulated: moves and work merged, partners elsewhere in review; next town partners, counted partners, orientation                           | #7082                                                                                                      |
| Red main, Red main fixer 2 (Sonnet)                  | reds on main; fixer 2 stands down between reds                                                                                                         | #7099                                                                                                      |
| Mergers 0 and 1, Checkers 0 to 4 (Sonnet)            | merge by parity; gate by PR number mod 5                                                                                                               | none of their own                                                                                          |
| Path-check runners A and B, long-run runner (Sonnet) | governing's measurements; the speed lead's 100-year save                                                                                               | none                                                                                                       |

Skills PRs waiting at 01:00: #7113 (red main), #7084 (governing); every session was asked at 00:50 to send one.

## The owner's rulings and asks since Nov 1 13:20 UTC (detail in OWNER-DECISIONS)

- Every life simulated at low intensity (Nov 1 16:50); no wake-up timers (13:20); a process is a skill, not a message (18:10).
- His v0.73.0 playtest (Nov 1 22:25 to 23:30) became about twenty pool items. Talk is never a list, and the player never says a line they didn't choose. Bodies are named as the place names them, and a closed office is visited at its next opening. The first filing offers the campaign tutorial in the scene. The calendar is colored by kind, with each kind hideable. Issues becomes the bill interface. Mocks reach him through the CTO first, and there is no second lane builder.
- CTO rulings the same night: the counted vote split applies where the candidates' party sides are equal. Campaign money merged on its stopgap, then press-staff households. A letter to the editor is a trait decision. Knowledge is compacted, never forgotten (recorded from Oct 30). Payment copies fold past their readers' windows, and folded terms and races are found by id inside a seat's summary. Donor calls follow a call list.

## Main, at 01:00 UTC

Guards and skill tests green; `pool --check` clean. Known red under CI's default heap: `law-wiring-housing.test.ts` at hr-fresh-9c2, the campaign tables' growth, with #7102. The next every-place nightly is the verdict on the Seats fixes (#6972, #7075).

## Still the owner's

The stray branches x, UNKNOWN, none and X (only he can delete them on GitHub); the art (two body types need seated poses) he has not approved.

## Environment

Unchanged: the `OCD` cloud environment, the `RELEASE_PUSH_TOKEN` repository secret, every npm command with `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14"`. No scheduled tasks exist (the owner banned wake-up timers on Nov 1). The owner may run ultracode sessions on the other account; the governing and speed leads already work that way.

## Final state at the handoff (Nov 2, 02:00 UTC)

Every session was interrupted at 01:40 UTC on the owner's word and handed off. Nothing is running. Each open PR carries a comment or a body section saying what is done and what is left, and each unfinished item is back to open with its branch, head and next step in Notes.

**Merge in this order** (from the mergers' handoff comments):

1. #7083 (offices keep their hours; Checker 3 passed it on 8 of 8 benches), then #7087 (the clerk's Travel card, stacked on it).
2. #7109 (donor calls as a scene), then #7111 (volunteers, stacked; merge main in again first).
3. #7101 (the clerk visit), then #7103 (the first-filing tutorial, re-gate on top).
4. #7088, then #7098 (past races name their district, after Words' review), then #7108 (the closing business as a story).
5. Checker-passed and waiting for a merger: #7036 (medical debt), #7070, #7074 (the couch fix), #7077 (no click without talk), #7082 (partners elsewhere), #7095, #7096, #7104, #7106, #7128, #7131.

**Still need a checker:** #7105 (the opening montage; its gate was interrupted), #7135 (press-staff households and the money refit, which Checker 0 left with a note), #7110, #7112, #7129, #7130, #7132 and #7097 (gate started; browser checks left).

**Sent back, with the cause on the PR:** #7100 (the calendar: two imports must go through their families' entry files), #7085 (one council race: two filing tests, fix and seeds in the body), #7090 (histories, Words).

**Long saves:** the 40-year run dies in year 19 on main and in year 23 on the speed lead's combined branch (year 22: 525 seconds, 6.5 GB, 3.48 million records). The next run's settings are in the Speed block.

**Words:** not yet handed off when this was written. Its newest status block in the channel is the place to start.

## How to read this

Written at 01:00 UTC on Nov 2 by the CTO session on the second account (session_01S4WSHrFBAnJLwUcjDV8Vc3). That account's weekly usage resets Nov 8 at 06:00 UTC. After this file, read `OWNER-DECISIONS.md` from the top (every entry since Nov 1 13:20 UTC is this account's), then `docs/coordination/CREW.md`, then the newest block of each section in `docs/coordination/LEADS-2026-10-24.md`.

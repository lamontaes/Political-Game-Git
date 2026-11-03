0 of 14 paths confirmed. Oldest open PR 2 days.

# Lane 2 state — November 3, 2026

## Plan and ownership

Follow units 1–15 in `docs/lanes/lane-2.md` on `docs/lanes-nov3` (read at bb51218415475d6aa1b031caf8ce264d66dd9236). No change to its order. The November 3 owner rulings override older process rules. Only a session that did not build a path may mark it Verified, after replay on main. Built does not increase the first-line count.

Lane 1 owns legislature.ts and voting.ts; Lane 5 owns the core state files. Write the agreement under `docs/lanes/agreements/` before shared edits. No shared files edited. No implementation items claimed yet. No PR opened by this session. Inherited Lane 2 PRs include #7036 (medical bills) and #7082 (relatives' partnerships), both opened November 1; their checks are not confirmations of a whole path. Merge desk merges; this session never merges its PRs.

## Machine trial

- Existing full checkout: `/workspace/Political-Game-Git`, 8.3 GB; about 30 GB available, 17 GiB RAM, Node v24.19.0.
- Download/update: `git fetch origin main docs/lanes-nov3` passed after network permission. Main at trial: e341dd83a5ff21b4fd0736b71b75f09ecc3cc474. Saved the documentation ref with `git fetch origin docs/lanes-nov3:refs/remotes/origin/docs/lanes-nov3`.
- Install passed on current main: `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" NODE_OPTIONS=--max-old-space-size=8192 npm install --offline --no-audit --no-fund` (up to date in 297ms).
- New Game through Chromium: Hazardville, Connecticut; replay e5325098874284d4; River Brown, person_90eee6012356f631. New Game returned HTTP 200, the opening rendered, zero page errors. The day request returned HTTP 200 with packet at 2025-01-21 07:00 (simulatedDays=0); this is an opening smoke check, not a played-year or finish-line proof. Local proof: `test-results/lane-2-machine/new-game.png` and `result.json`; runner: `/tmp/lane-2-machine-smoke.mjs`.
- Push passed: empty test commit 5882a1a7742993d4528b03bdaf5de9e4316e19b0 on `trial/lane-2`.
- Initial sandbox failures reported immediately: fetch could not connect to proxy:8080; bench listen EPERM at 0.0.0.0:3000. Both succeeded with permission. Golden-path baseline initially failed `spawnSync git EPERM`; retry with process permission is running. Use the approved execution permissions for network, server, browser and child-process commands.

## Current card: First minutes

- Finish line: in every new life, no player shares a first name with a living sibling, no parent was under 15 at birth, and every household has a home record that determines the room.
- Pool items, in order: people-player-shares-sibling-name; people-m0-06-parent-fourteen-at-birth; housing-dwelling-records-cover-few-households.
- Proof: 20 drawn lives with town and replay; pinned regressions Mazomanie b37762f4-7895-40f5-8d83-0634db5b60cb; Hebron 5533675 / ed0fcb9d5fe8c4fc405921ee692d31ba212d34a236b449fb2c63040a79e143bb; Norcross GOLDEN_PATH_SEED=b2. Existing checks: src/core2/m0-life-at-18.test.ts and src/bench/room-condition.test.ts. Browser replay of all eight fixed towns for the path.
- Hands off: the 15-year test and opening screens; other lanes' owned files without agreement.
- Known cheats: renaming only on screen, skipping a place, a default home for households without a record.
- Size: three small PRs; split any unit growing beyond about 400 changed lines.
- Checked by: a fresh session opening all eight fixed towns on main; none assigned or recorded yet.
- Current action: baseline, then reproduce before claiming and building the first item. The referenced past-family.ts no longer exists on current main; find its current producer rather than restoring it.

## Played paths

| Path | Status | Town / replay and proof |
| --- | --- | --- |
| 1. First minutes | Not built by this session; unverified | Eight fixed towns; pending |
| 2. A vote reaches a person | Unverified | Meadow Lakes / f835dd278d7312a1; pending |
| 3. Congress passes a law | Unverified | Drawn town and replay pending |
| 4. Other states and towns govern | Unverified | Haleyville / ab5f58e9be125c95; pending |
| 5. A sane session | Unverified | Charlotte Amalie / 8d768ae66bd2d090; pending |
| 6. A medical bill | Unverified | Storrs / storrs-1; pending |
| 7. Money makes sense | Unverified | Cabo Rojo / f857db7436bf7449; Santa Rita / 6f539fcfdf6d96f9-5; pending |
| 8. A layoff | Unverified | Storrs / storrs-1; pending |
| 9. Couples | Unverified | Murray / 1d3f0e18ca4ba7e5; pending |
| 10. Neighbors differ | Unverified | Haleyville / ab5f58e9be125c95; pending |
| 11. The crowd moves | Unverified | Brookside / 4d50e1f88df997f9; pending |
| 12. Towns keep their people | Unverified | Murray and Haleyville, replays above; pending |
| 13. Town life | Unverified | Meadow Lakes / f835dd278d7312a1; pending |
| 14. A bribe | Unverified | Washington, D.C. / dc-closures-a; pending |

Print and check each replay's actual place on first use; use the New Game Advanced picker if it moved. No law-chain or performance claims yet. No design questions. No repeated three-attempt failure yet.

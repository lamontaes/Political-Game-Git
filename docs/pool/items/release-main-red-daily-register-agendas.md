---
id: release-main-red-daily-register-agendas
title: "The daily-register guard is red on main: core2-world-legislating-v1.agendas (from #8482) has no kept-table line"
area: release
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/red-main-daily-register-agendas
pr: 8917
after:
blocked-on:
lead: cto
model: opus
effort: low
root: none
source: Red desk, Nov 12 (CTO's 19:31Z line on #7365; codex-4629 at King Cove, Alaska)
---

**What.** tests/guards/daily-register.test.ts line 107 asks for two kept-table lines on clean main: `outside-budgets.shares` (#8329, added by #8906) and `core2-world-legislating-v1.agendas`. #8906 adds only the first, so the guard stays red after it merges. Seen at King Cove, Alaska (DAILY_REGISTER_SEED=38e46a94-f6ac-4606-a881-7fedfe0ddc38), Ozark, Alabama and Wilton, Maine. Guards: every pull request's guard suite runs green again once #8906 and this merge.

**Cause.** Found in code: #8482 (f25aca9574) added the `agendas` table to `WORLD_LEGISLATING_MODULE` in src/core2/modules/world-legislating.ts, written by `sessionAgenda` (one row `agenda:<jurisdiction>` per other state, rewritten at each of its sessions), with no line in docs/design/daily-register.md.

**Fix.** Add the line under Kept tables: flat, a row per other state, rewritten; measured 55 / 55 / 55 / 55 at the end of each of four years with `npm run speed:year -- --seed fad06764c6040dbf --years 4 --out` (Buena Vista, Puerto Rico, place 7209087): the row count holds while each year's digest changes, so rows are rewritten, not added.

**Time box.** 0.5 hours

**Rules.** Speed: the register states the table as the code keeps it, one row per state, so nothing grows with the years and no fold is filed. No approval is asked for, and the guard's baseline is not raised.

**Done when.** A second session runs `npx vitest run --dir . tests/guards/daily-register.test.ts` on main, with the outside-budgets line also merged, in the drawn place it names at DAILY_REGISTER_SEED=38e46a94-f6ac-4606-a881-7fedfe0ddc38 and at a fresh seed, and it passes.

**Waits on.** Nothing.

**Files.** docs/design/daily-register.md

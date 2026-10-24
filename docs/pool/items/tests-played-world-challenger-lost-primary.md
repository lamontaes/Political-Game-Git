---
id: tests-played-world-challenger-lost-primary
title: "M0-13's named-challenger check reads a challenger who lost the primary as nobody running (Crosspointe, Virginia)"
area: core
kind: bug
priority: 1
size: S
status: claimed
claimed-by: claude/challenger-lost-primary
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T14:36:32.004Z
---

**What.** The played-world check 'a named challenger runs' (tests/golden-path/played-world.node-test.ts, around line 611) counts challengers only on the general-election ballot. In Crosspointe, Virginia (place 5120436, seed e37bf6299be310129ce0ff34416ed9b450c187e34e150bb5f5959618d1b1d3cf, the M0-13 draw on PR 5939) person_356fe8471f3757d2 decided to run for attorney general, filed on 2025-02-07 (filing:contest:seat:US-VA:attorney-general:2025-11-04:person_356fe8471f3757d2) and lost the Democratic primary to the incumbent, which marks the filing withdrawn (src/core2/modules/voting.ts:1521). The check then fails with '1 adults other than the incumbent chose to run ... none was on the ballot', though the decision reached a filing and a primary. It turns golden-path-year red on PRs that do not touch elections.

**Rules.** Never weaken a test: the check still fails when a decision to run never reaches a filing. Ask why: a primary loss is read from the filing record, not assumed.

**Done when.** The check counts a challenger who filed and lost a primary as a named challenger who ran, naming the filing; it still fails when a run decision has no filing; M0-13 passes on the Crosspointe seed and on two fresh drawn places named in the PR.

**Files.** tests/golden-path/played-world.node-test.ts

**Notes.** TODO

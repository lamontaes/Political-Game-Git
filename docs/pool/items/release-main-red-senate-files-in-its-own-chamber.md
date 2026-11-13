---
id: release-main-red-senate-files-in-its-own-chamber
title: "Congress's opening crashes a played world when the President asks a House member to carry a bill for the Senate's filers"
area: gov
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/red-main-m0-13-filer-member
pr: #9047
after:
blocked-on:
lead: gov
model: opus
effort: low
root: none
source: Red desk, Nov 13 (Account lead T5 on #8928, comment 6848663002)
---

**What.** The golden-path-year check M0-13 crashes on clean main 99540b89 in Booth, West Virginia (5409148), GOLDEN_PATH_SEED=4c34cc968c8412093378375288816b724fa98501f454e802c3eb42a3dceb801f, on January 3, 2026 when Congress opens: `TypeError: Cannot read properties of undefined (reading 'personId')` at `memberKey` from `filerOf`. In the Senate's filing group (`session-open:US:2026-01-03:1`, 100 senators) a question no senator carries is proposed by the President, who asks a member of the House (NY-04) to carry it, and that member is looked up among the senators. Seen: a new life in that place stops before its first day.

**Cause.** Found in code: `openSession` in src/core2/modules/world-legislating.ts files Congress's questions once per chamber (`filerGroups`, House then Senate) but passes `body: lower`, the House, to both groups; `fileChanges` hands that body to `proposeAsExecutive` in src/core2/modules/legislature.ts, which picks the carrier among the body's members, and then finds the carrier with `input.filers.find(...)!`, which is undefined for the Senate group.

**Fix.** The Senate's group files in the Senate (`FEDERAL_SENATE` with that group's members), so the executive's request goes to a senator; the House's group and every state's single group keep their body.

**Time box.** 1 hour

**Rules.** Ask why: the crash is traced to the request's carrier by record id and chamber, and the fix makes each chamber's group read its own chamber, with no try/catch or skipped filing.

**Done when.** A second session runs `GOLDEN_PATH_PLACE_KEY=5409148 GOLDEN_PATH_SEED=4c34cc968c8412093378375288816b724fa98501f454e802c3eb42a3dceb801f GOLDEN_PATH_SPEC_ID=M0-13 node --expose-gc --import tsx --test-reporter=spec tests/golden-path/played-world.node-test.ts` on main and a fresh drawn place, each naming its place, and both play their year with no failure; and a new life in Booth, West Virginia reaches its first day on the bench.

**Waits on.** Nothing.

**Files.** src/core2/modules/world-legislating.ts

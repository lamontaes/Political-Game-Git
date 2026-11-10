---
id: release-audit-12-vacuous-loop-tests
title: "Assert rows exist before looping in the flow and row tests (#5016, #5033, #5008, #5020)"
area: release
kind: bug
priority: 3
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
standard: 2
lead: cto
model: haiku
effort: low
root: none
source: added with npm run pool -- add
claimed-at:
---

**What.** The merge audit of Oct 20 (docs/reports/merge-audit-2026-10-20.md, item 12) found tests that loop over a found set of flows or rows and pass when the set is empty, in pull requests 5016, 5033, 5008 and 5020. The item names those four pull requests and no test file, so it cannot be built from the item alone. The fix it asks for is an assertion that the rows exist before each such loop. A cheaper route is one guard that fails any test which loops over a found set without asserting it is non-empty.

**Cause.** Needs cause. Looked at the item and docs/reports/merge-audit-2026-10-20.md item 12; no file or test is named, only the four pull requests.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Haiku session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the fix replaces the faulty test in the same change, and a test asserts the feature and fails when nothing is found. One rule, all 56 places: any test that draws a place names the place and seed.

**Done when.** A second session (not the builder) (or the finder) lists the test files changed by pull requests 5016, 5033, 5008 and 5020 that loop over a found set with no non-empty assertion, by file and line, and rewrites this item with those files as its Cause and a Fix; the changed tests then fail when their subject is absent, shown by a test run in a drawn place (place and seed named).

**Waits on.** Nothing.

**Files.** docs/reports/merge-audit-2026-10-20.md

**Notes.** Item 12 of docs/reports/merge-audit-2026-10-20.md, split from release-merge-audit-oct20-fixes. Released from idle draft #5180 by the CTO, Oct 26.

Lane 5 (pool truth, Nov 3): the item was open but still named an old claim, `claude/political-game-pool-76ksvw` (2026-10-20). Cleared from the front matter and kept here.

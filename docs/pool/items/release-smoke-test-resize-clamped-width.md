---
id: release-smoke-test-resize-clamped-width
title: "The packaged-build smoke test's window resize check fails when the runner's display clamps the width"
area: release
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: account
model: sonnet
effort: medium
root: none
source: found on #9364's windows package check (Nov 15)
claimed-at:
checked:
---

**What.** On the windows package check for #9364 the smoke test failed on "shell: resize applies 1040,736 -> 1040,736", a line the change does not touch. A resize the runner's display clamps gives the same size before and after, so the check fails on the runner and not on the product. Seen: the failed package run of #9364 on the windows runner, same line before and after a plain re-run.

**Cause.** Found in code: `desktop/scripts/smoke-test.mjs`, the "shell: resize applies" check (lines 335 to 352). It asks for a window 1024 wide, then passes only if the width is exactly 1024 and the height is at least 640, and the window changed or was already between 640 and 700 high. When the runner clamps the window to 1040 by 736, the width is not 1024, the check fails, and nothing about the build is wrong.

**Fix.** In `desktop/scripts/smoke-test.mjs`, make the check ask what the product promises: the window ends at or above the minimum size and the game is still drawn after the resize (the check beside it already reads that). Accept a clamped size when it is at least the window's minimum width and height; keep failing when the size is below the minimum or the game is not drawn. The player sees nothing change; the package check stops failing on a runner display.

**Time box.** 1 hour for one Sonnet session at medium effort.

**Rules.** Test tooling only. Never loosen the check to pass without stating the old premise: the old premise was a fixed width of 1024.

**Done when.** A second session, on main, runs the smoke test on the windows runner with the window clamped to 1040 by 736 and sees it pass, then with the window below the minimum size and sees it fail, and plays one new life at a drawn place from all 56, named in the PR, to see the game still drawn after the resize. Seen: the package check on a pull request that touches no desktop file is green on the windows runner.

**Waits on.** Nothing.

**Files.** desktop/scripts/smoke-test.mjs

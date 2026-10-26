---
id: tests-vitest-import-baseline-heap
title: "A vitest worker holds 1.28 GB live before any test runs, so a world test can exhaust a small default heap"
area: release
kind: bug
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In this cloud container node's default heap limit is 2,198 MB. src/core2/recalls.test.ts, measured with --expose-gc and a forced collection, holds 1,280 MB live at the top of the file before any test runs, against 293 MB when plain node imports the same bench modules. A bench world adds 100 to 300 MB live after that, and its build peaks higher. So a plain npx vitest run of any file that builds a bench world can run the worker out of memory on a machine whose default heap is small. Where the extra gigabyte goes (transformed JSON research tables, source maps, the module graph) is not traced.

**Rules.** Speed and memory: a test builds the smallest world that proves its claim, and the runner's own overhead should not decide whether a test can run. Never weaken a test to fit.

**Done when.** The live heap at the top of a vitest file that imports src/bench/world.ts is measured with its largest holders named (by module), and either brought within 500 MB of plain node's or the repository's test command sets a heap that fits, with npx vitest run src/core2/recalls.test.ts passing at this container's default heap.

**Files.** vite.config.ts,src/core2/recalls.test.ts

**Notes.** Found Oct 26 while working tests-recalls-counted-signers-worker-oom (seed recoom1).

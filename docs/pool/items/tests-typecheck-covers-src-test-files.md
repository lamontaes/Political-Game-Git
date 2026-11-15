---
id: tests-typecheck-covers-src-test-files
title: "Typecheck skips 1,506 of the 1,511 test files under src, so a test calling a changed function wrongly goes red only when it runs"
area: gov
kind: bug
priority: 2
size: L
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: design-guards
lead: governing
model: sonnet
effort: medium
source: Views thread, Nov 14 (the pledge test's speechAct call)
---

**What.** On the train at 8b6c8903, `src/core2/speech-afterward-pledge.test.ts` failed at every seed with "TypeError: Cannot read properties of undefined (reading 'get')" at `speechAct` (src/director/scheduling.ts). Commit a5c9b5af had changed `speechAct` to take `(core, causeId)`, and the test still called `speechAct(moment.causeId)`. Typecheck was green. Seen: a test that is red on the train, at a seed, on a line typecheck would have named.

**Cause.** Found in code: `tsconfig.app.json` includes `src` but excludes `src/**/*.test.ts` and `src/**/*.test.tsx`. `tsconfig.node.json` includes only named folders: `src/core2/kernel`, `reference` and `gov-rules`, a few others, and four folders under tests/. `scripts/dev-lab/typecheck.ts` builds just those two projects.

- Measured with `npx tsc -p tsconfig.node.json --listFilesOnly`: 5 of the 1,511 test files under src are read (1,506 are not), and 14 of the 57 test files under tests/ (43 are not).
- Measured on the train at 8b6c8903 with a scratch config that extends tsconfig.app.json and includes `src/**/*.test.ts(x)`, with the pledge test's line already fixed: 420 errors in 225 test files. By folder: src/core2 258 errors, src/bench 86, src/director 63, src/english 8. By kind: TS2345 104 (wrong argument), TS2339 85 (no such property), TS18048 60 (possibly undefined), TS2352 36, TS2322 25, TS7006 23.

**Fix.** Add a third project, `tsconfig.tests.json`: it extends tsconfig.app.json, includes `src/**/*.test.ts`, `src/**/*.test.tsx` and the test files under tests/ that no other project reads, and has `types` with `vite/client` and `node`. Add it to the list `scripts/dev-lab/typecheck.ts` builds. Fix the 420 errors in the tests themselves, never by loosening a type or adding an `any`. A test whose call no longer matches its function is fixed to the function as it now is; if it then fails, that is a finding for the function's owner. Land it folder by folder (director, english, bench, core2), each in its own PR with its folder added to the include, so no PR waits on all 420.

**Time box.** 6 hours for one Sonnet session at medium effort, across the four PRs. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Ask why: each error is fixed by reading what the function now takes and why it changed, not by an any or a skipped file. Never loosen a test (pinned-tests). No new stopgaps.

**Done when.** A second session, on main, runs `node --import tsx scripts/dev-lab/typecheck.ts` and sees it read the test files under src (the count named from `--listFilesOnly`), with no errors. It then changes one argument in a test call, sees typecheck name that file and line, and reverts the change. In a drawn place the changed tests still pass when run (place and seed named).

**Waits on.** Nothing.

**Files.** tsconfig.tests.json (new), scripts/dev-lab/typecheck.ts, tsconfig.app.json

**Notes.**

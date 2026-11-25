# Merger: running the checks in a fresh cloud container

Part of the `merger` skill. Setting up a cloud container so the checks run.

## Running the checks in a fresh cloud container (merger 1, Oct 29)

- `npm install` once; a fresh clone is shallow, so run `git fetch --unshallow origin` before `release:check`, or it cannot find its declaration range.
- `npm run typecheck` dies out of memory at the default heap: set `NODE_OPTIONS=--max-old-space-size=8192` for typecheck, vitest and guards.
- A new test that draws a place can pass once and fail on the next draw. For a PR that adds or changes a drawn-place test, run the file at least three times and read the failure's seed before merging; a precondition the draw can break ("expected a local race to exist") is a send-back.
- Browser checks (`src/bench/*.browser.mjs`): start `node --import tsx src/bench/server.ts` in the background, wait for port 3000, and set `BENCH_BROWSER=/opt/pw-browsers/chromium` (the stable path; the versioned folder under it changes by container).
- A `modify/delete` conflict on a `docs/release/changes/*.md` file means that declaration was already released: drop it in the merge. A conflict in any code or data file goes back to the author.
- **Run `npx vitest run --dir . tests/guards/english` on any PR that adds or changes a file under `src/bench`, `src/director` or `src/english`, not only the families guard (Nov 1: #6963 added `jump-end.ts` in `src/bench` (since renamed `src/bench/jump-end-check.ts`) with log lines that interpolate `${end.kind}`, `${end.pollingRecordId}` and `${end.date}`; the player-text guard read them as player text and turned main red). A developer-only helper belongs in a file the guard knows as one (`*-check.ts`, `dev-*.ts`); the fix is a rename, never a bigger allowlist.

# M0-bench: play a life on the new core (the test bench)

**Contract:** M0-01 to M0-05 in `docs/roadmap/features.json`.

**Builder:** a new Codex session, CODEX-BENCH (GPT-6.1 Sol), at **medium**: it's a developer tool over the core's existing API, with no core changes.
**Finisher:** OPUS-DIRECTOR, continuing, switched to **Sonnet at high**: it knows the director and the core, and the check is playing the bench against written criteria. Escalate to Opus only for a disputed result.

## What it is

A throwaway developer test bench, not a game screen; the real screens get redesigned with the owner one at a time (M6). It shows records, control names and "why" traces. There's no hand-written player text, no art, and no styling beyond readability.

## Build

1. **Branch:** `pool/M0-bench`, a local integration of SOL-1258's latest `pool/P8-part-1` with drives (`pool/P10-part-1`), the story director (`pool/P13-5`) and the people work (`pool/P15-people-*` when ready). Keep it current as they move. Never push to anyone else's branch. The bench lives in its own folder (`src/bench/`) as a client of the core's public API and the director; it owns no game state.
2. **Codespace (M0-01):** add `.devcontainer/devcontainer.json` asking for a machine with 16 GB of memory (the town's opening data is about 730 MB), plus one script, `npm run bench`, that builds a town from a seed and serves the page on a forwarded port. The town is drawn at random from all 56 places, and a picker accepts any seed. There's no default town. Put plain instructions for the owner at the top of the PR body: open the Codespace, run one command, open the port.
3. **Play anyone (M0-02):** list residents (name, age, household, job) from records. The chosen person's choices come from the screen through the core's existing choice hook (`Controller` in `src/core2/life.ts`), from the same offers anyone gets. Everyone else keeps choosing for themselves.
4. **Time (M0-03):** Day and Week move time; Calendar jumps to a date. Skip ahead stops at the first thing that needs the player: a director moment at or over the 0.50 interrupt line, a fixed commitment (a work shift), or an offer with a deadline. Show which one stopped it. Actions take their real time; there's no energy meter.
5. **Why (M0-04):** clicking a choice, a moment, a change in closeness or a payment shows its reasons, scores and source record ids, read from what the core saved. Nothing is made up for display.
6. **Golden path and world panel (M0-05):** the 11 steps (step 3 is "file for office where that place files: clerk, registrar or board of elections") plus the world pieces (national economy, state government, federal government, other places). Each is marked reachable now, reached, or not in the new core yet, with the missing piece named. A step counts as reached only with the world running.
7. **Missing API:** if the bench needs something the core's API doesn't offer, write it up in the PR body as a request for SOL-1258 and the CTO; don't patch the core.

## Out of scope

Core files (`src/core2`), the director's logic, the people work, and any real game screen.

## Hand-off

Short PR body: what the owner can do now, the furthest golden-path step a life reaches, and what blocks the next one. The finisher plays each spec's test in a randomly drawn place before anything is marked passing.

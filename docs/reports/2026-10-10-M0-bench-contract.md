# M0 bench build contract

Contract-only draft, pending CTO approval before implementation. Release impact: none.

Owner launch after implementation: open a 16 GB Codespace, run `npm run bench`, and open the forwarded port. This contract-only draft does not provide that command yet.

CODEX-BENCH claims M0-bench (M0-01–M0-05). **CTO: approve this build/check contract here before implementation.** OPUS-DIRECTOR finishes on Sonnet at high; the builder will not mark specs passing.

Build a plain developer page in `src/bench/` over the new core's public API and director. It displays records and control names, owns no simulation state, and routes offered choices through the existing `Controller` hook. Add the 16 GB devcontainer and one bench command. No core or director edits, real game screens, invented reasons, or named/default towns.

| Spec | Build | Check |
| --- | --- | --- |
| M0-01 | Seed input; draw a place from all 56 jurisdictions; list resident name, age, household and job from core records. | Generate three different seeds with three distinct places in distinct jurisdictions; each opens without error; resolve every listed resident against core records. Record heads, seeds and selected place IDs. |
| M0-02 | Choose any resident; display the same offers residents receive; submit only offered options through Controller; everyone else keeps autonomous choices. | Play seven days; trace every controlled resident act to its on-screen choice and source record; show other residents continuing; reject an unoffered option without mutation. |
| M0-03 | Day, Week, Calendar and skip-until-needed; preserve action duration. | From a randomly drawn date, compare all candidate stops against saved records: director moment strictly above 0.50, fixed commitment or deadline offer. Assert the earliest stop, the displayed cause and no advancement past it; cover ties and the exact interrupt boundary. No fabricated commitments or offers. |
| M0-04 | Click choices, moments, closeness changes and payments to inspect saved reasons, scores and source IDs. | Randomly sample 20 displayed items in a generated world; each opens a trace whose scores and IDs resolve to core records. No display-only reasons. Missing traces become named API requests, not filled evidence. |
| M0-05 | Show all 11 golden-path steps and national economy, state government, federal government and other places, with record-backed reachability and missing modules. | In a fresh life, steps 1–2 are reachable; steps 3–11 name their missing modules; world pieces say “not in the new core yet” until M1. Reached status requires records and the world running; reachability alone does not count as reached. |

Branch starts from main `f20299099de47568c7f3a162dada09ec438418e6` for this contract. After approval, locally integrate SOL-1258's latest `pool/P8-part-1`, drives `pool/P10-part-1`, director `pool/P13-5` and ready `pool/P15-people-*` work, recording exact source heads and resolving integration with their owners. Never push to their branches. Integration does not authorize authored core changes.

Planned owned paths: `src/bench/**` (including scoped tests), `.devcontainer/devcontainer.json`, and the `bench` script entry in `package.json`; any additional shared configuration requires a named ownership agreement. This draft changes only `docs/reports/2026-10-10-M0-bench-contract.md`. GitHub Project claim is requested here: the available connector has no Project mutation tool.

Before code changes, run the integrated baseline bench if one exists and record any unavailable entry point. Inspect public APIs first; missing choice, stop or why capabilities are requests for SOL-1258 and CTO in this PR, never core patches. Keep tests scoped to the bench; run changed-file types/lint/format, PR release check, zero-dice and changed tests. The finisher then plays all five tests in a randomly drawn place. Leave feature tests unchanged and passes false until independent acceptance.

Current result: no playable bench delivered; no golden-path step demonstrated. Checks: repository/package/spec/progress/git-log reads executed; runtime, types, lint, format, release, zero-dice and acceptance NOT RUN (contract only). Next: CTO contract approval, integration/API inspection, then the first bounded M0-01 implementation.

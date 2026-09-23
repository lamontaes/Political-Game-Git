# The client asks to install an update that is already installed

Owner: Fix game client updates, task 01a0cbfd-d35f-7da1-9844-116331985a5b.
LAND acknowledged sole updater ownership on September 22, 2026. Native installation
and merge remain with LAND. CTO check-in was sent to Become My CTO before work.

Workspace: /Users/lamontae/Documents/PG-LAND, registered LAND.
Base: codex/person-a-v9-creator-proof at 03ad45cb2d66fec2009f596f2b60f0589e3b5217.
No upstream on this branch; fetched origin/main was 6fb4e1b5b716e4a387fb924c9265381fb8c1ba7b.
At entry tracked files were clean with 32 untracked paths. Before first write,
art direction had modified ModularCharacter.tsx, player.css, character-components.ts,
character-render-plan.ts and complete-outfit.ts. All were preserved.

Write scope: desktop/private-controller/hub-model.mjs, main.mjs, chrome.mjs,
private-update-worker.mjs; desktop/tests/hub-selection.test.mjs and directly focused
updater tests; this plan and the matching release declaration. No art, creator,
owner app, save, branch switch or merge.

Measured: installed hub 6ce27cdf0061; current main aa3c38dab467, pending null;
update-checks.json retains waiting for that same revision. Native accessibility
inspection confirms the install instruction with no install button at the title.

Measured September 23 UTC log intervals: fetch start 01:26:02.434, worktree
preparation 01:26:35.510, dependency install 01:27:29.441–01:27:56.980,
typecheck marker 01:28:00.410–01:35:50.218, Vite reported 19.88 seconds,
Vite completion 01:36:15.830, provenance stamp 01:37:34.194, ready 01:37:49.313.
Total is approximately 706.9 seconds; typecheck interval is 469.8 seconds.
These intervals include process overhead and are not isolated CPU benchmarks.

Phase 1: derive install availability from pending state; reconcile consumed
waiting checks; persist activation; report install progress/failure; serialize
installation attempts; retain validation and log operation durations.

Phase 2 needs a precise additional-file proposal before edits. Existing main
updates create a clean checkout, install dependencies and run the full build on
the owner's Mac. Current desktop packaging uploads whole app archives on PRs
and manual runs, not an established runtime-content update feed for main.

Phase 1 validation: 37/37 focused selection, payload-presence, private-update
and UI-ID tests passed. Syntax, scoped Prettier and ESLint passed.
Browser admission was BLOCKED with exit 3: registered test-results/runs exceeded
its 6 GiB budget. No browser bypass, output deletion or native install occurred.

Owner then explicitly requested reusing the same workspace to stop accumulating
Mac copies. LAND acknowledged phase 2: update-workspace.mjs, worker integration,
packaging helper inclusion and focused workspace tests. Reuse an existing marked
checkout with an exclusive lease, successful dependency receipt and stable
incremental compiler state. Dirty/foreign/unsafe workspaces refuse safely.
No old-folder deletion or native installation is authorized in this increment.

Phase 1 commit: 247b5b92e7b0bb43ebd03e5e6179e6846a4c9093. The exact
03ad45cb..247b5b92 push declaration range passes. The inherited default
origin/main comparison reports the earlier undeclared art-desk notification
change; it is separate from this repair.

CTO created CLIENT-UPDATE-REPAIR in CLIENT65. Its initial separate-worktree
direction was explicitly superseded by the owner's later reuse instruction
and O's direct disjoint write lease. Correction sent to the existing CTO task.
The current packet is https://docs.google.com/document/d/1Ctmm1JKjc7fQzg9fAIrHdJU5qMji3vp0ZvOOPtRSiwg/edit.

Phase 2 uses one persisted controller-owned checkout for the runtime-content
successor route. It requires the exact realpath, marker, known common Git
directory, detached clean source and an exclusive lease. No forced checkout
or ignored-file overwrite is allowed. Dependency reuse requires a successful
matching package, lockfile, npm configuration and Node/npm toolchain receipt.
TypeScript still runs its validation, using a stable incremental-output path.
The installed payload, artwork and rollback build are independent of staging.
Cancellation signals only the owned child process group; stale leases cannot
be recovered while an owned child survives. Older pack-based preview preparation
retains its existing route; this increment targets the installed runtime-content lane.

Read-only directory accounting: staging 66,210,372 KiB; versions 23,508,396 KiB;
test-results/runs 6,303,948 KiB. Do not add these as reclaimable space: shared
Git objects, filesystem sharing, unique inputs and active references need
disposition. Reports and exact directory table are under
output/client-update-repair/. O coordinates retention separately.

The compatible current staging checkout was read-only inspected as clean.
No adoption, source checkout, dependency installation, cleanup or owner-app
replacement was executed against it during these fixture tests.
Actual before/after update timings, native install, viewport/pointer/keyboard
acceptance and warm-update verification remain outstanding at receipt.

Final composed focused check: 49/49 desktop Node tests passed, including 11
workspace/lease/dependency tests. Scoped ESLint, Prettier, Node syntax and
whitespace checks pass. Output: output/client-update-repair/focused-tests.txt.
Synthetic repeated updates kept one staging directory; adoption created zero
additional checkouts. No installed update speedup has been measured.
Read-only inventory lists 29 existing staging directories and 25 installed-version
directories. Their count and contents were not changed by this task.

---
id: release-main-requires-only-new-game-check
title: "Main's branch protection requires the new game check alone, as ruling 2 says"
area: release
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Confirmer replay of Lane 5 path 12 on Nov 4, 2026: GET repos/lamontaes/Political-Game-Git/branches/main/protection returns required_status_checks contexts validate and golden-path, and every push to main prints '2 of 2 required status checks are expected'. The owner's Nov 3 ruling 2 (OWNER-DECISIONS.md) makes the new game job (.github/workflows/new-game.yml, #7141) the one check before a merge, and path 12 asks to see it as the only required one. The merge desk lists the setting under 'Owner, one click' in docs/lanes/state/merge-desk.md. Changing branch settings needs the owner or a session he authorizes for it.

**Rules.** Branch settings change only with the owner's word or a session he authorizes for it. Ruling 2: one check holds a merge, a new game opens and runs briefly without crashing. Never loosen the new game job itself to make it pass. docs/release/README.md's Required checks section changes in the same pass (release-guards-required-checks wrote it for validate and golden-path).

**Done when.** GET repos/lamontaes/Political-Game-Git/branches/main/protection lists exactly one required context, the new game job as GitHub names it; a push to main prints one required check; docs/release/README.md's Required checks section says the same; a fresh session replays Lane 5 path 12 and records it.

**Files.** .github/workflows/new-game.yml, docs/release/README.md, docs/lanes/state/merge-desk.md

**Notes.** TODO

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
standard: 2
model: sonnet
effort: low
root: none
lead: cto
after:
checked: fable 2026-11-10
---

**What.** Confirmer replay of Lane 5 path 12 on Nov 4, 2026: GET repos/lamontaes/Political-Game-Git/branches/main/protection returns required_status_checks contexts validate and golden-path, and every push to main prints '2 of 2 required status checks are expected'. The owner's Nov 3 ruling 2 (OWNER-DECISIONS.md) makes the new game job (.github/workflows/new-game.yml, #7141) the one check before a merge, and path 12 asks to see it as the only required one. The merge desk lists the setting under 'Owner, one click' in docs/lanes/state/merge-desk.md. Changing branch settings needs the owner or a session he authorizes for it. Guards: a change merges when a new game still opens, which is what the owner plays (owner, Nov 3 ruling 2).

**Cause.** Design: the owner ruled on Nov 3 (docs/coordination/OWNER-DECISIONS.md ruling 2) that the new game job in .github/workflows/new-game.yml is the one check before a merge. The Nov 4 replay of Lane 5 path 12 measured GET repos/lamontaes/Political-Game-Git/branches/main/protection returning required contexts validate and golden-path.

**Fix.** With the owner authorizing the settings change, make the protection list exactly the new game job, and edit the Required checks section of docs/release/README.md to say the same.

**Time box.** 1 hour for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Branch settings change only with the owner's word or a session he authorizes for it. Ruling 2: one check holds a merge, a new game opens and runs briefly without crashing. Never loosen the new game job itself to make it pass. The chain is the acceptance: the setting, the workflow and the README's Required checks section are followed together to the one check a merge waits on.

**Done when.** A second session replays Lane 5 path 12 on main in a drawn place and records it: GET repos/lamontaes/Political-Game-Git/branches/main/protection lists exactly one required context, the new game job as GitHub names it; a push to main prints one required check; and docs/release/README.md's Required checks section says the same. The evidence is the protection response and the new game run, each named by record id.

**Waits on.** The owner, or a session he authorizes, to change the branch settings.

**Files.** .github/workflows/new-game.yml, docs/release/README.md, docs/lanes/state/merge-desk.md

**Notes.** TODO

---
name: slim-down
description: How the Slim down session removes duplicate and dead code in Our Civic Duty with no behavior change - what to check before deleting a file or merging copies, the traps already hit (import cycles when a hand-typed module name is replaced by its constant, validated versus plain helpers), and what each PR must prove. Use for any consolidation, dead-file, one-lookup or one-kit PR; not for changes that alter what the game does, which belong to the owning session.
---

# Slim down

Structure only, no behavior change, small PRs. A change that alters behavior is a seam for the Coordinator, not yours.

- **Dead file**: grep the whole repo (`src`, `scripts`, `tests`, CSS class names) for the file name and its exports before deleting. Docs that only mention it are fine to leave. Delete the CSS that styled it in the same PR.
- **Copies of a helper**: diff the bodies first. Copies that look the same can differ on an edge (`ageOnDate` validates dates and moves a Feb 29 birthday to Feb 28; the hand-written copies compare text). Point copies at a shared function with the exact same formula, never at a "nearby" one. A validated helper in a hot loop also makes the year slower.
- **Hand-typed module id -> the module's constant**: only safe in leaf code (`src/bench`, tools). In `src/core2` files that sit inside the module import cycle (candidate-pool, shared-history, heard-claims, jobs-elsewhere) the import is `undefined` or in its temporal dead zone when the call runs, and tests die with "Cannot access ... before initialization" or "Module keys must be nonempty". The typed name is deliberate there; leave it, or move the constant to a leaf file such as `business-module-id.ts`.
- **A deleted fix is a fix**: if swapping a name reveals a real bug (dev-why read "budgets", the module is "core2-budgets-v1"), say so in the PR body.
- **Proof**: run the repo's real typecheck, `node --import tsx scripts/dev-lab/typecheck.ts` (`tsc -p tsconfig.node.json` does not cover `src/bench`, so it passes when bench code is broken), eslint and prettier on changed files, and the tests that import the changed files. Never commit before the tests ran.
- **Moving code between files**: keep the import order. TypeScript's `organizeImports` sorts imports and changes module load order, which woke a latent cycle ("Cannot access 'OPTIONS' before initialization"); use its `RemoveUnused` mode only, and rename shared variables with the language service's rename, not a text search. A main-red prettier file is not yours.
- **PR body**: line 1 `Pool item: none`, line 2 `Session: Slim down`, then lines removed, and a release declaration `impact: none`.

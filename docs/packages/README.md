# Work packages

A package is what a session is given to build or finish one piece of the roadmap (`docs/ROADMAP.md`). The owner approves each package before it's sent. Every session also follows `AGENTS.md`.

## What every package says

1. **Contract:** the spec IDs from `docs/roadmap/features.json` it delivers, and the exact test that flips each one to passing. The test runs in a place drawn at random from all 56; no package names a specific town.
2. **Who and at what effort:** the builder and finisher, each with a model, an effort level and a one-line reason (see "Models, effort and helpers" in `AGENTS.md`).
3. **What to build, step by step,** naming the files and interfaces involved.
4. **Out of scope:** what not to touch, and which session owns it.
5. **Sources:** the real data and research it must use.
6. **Hand-off:** where to log progress (`docs/roadmap/PROGRESS.md` and the PR body), and what the finisher checks.

## Rules that apply to every package

- Before building, write the contract back (what you'll build, how it's checked), and wait for the finisher to agree.
- Register every shortcut as a stopgap; never edit a spec's test, only its passing status.
- One package per session. When it's done, the next package gets a fresh session.
- Never push to another session's branch. Never merge your own PR.
